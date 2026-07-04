"""The state machine, tested exhaustively at the service level.

One parametrized test covers the full 4x4 matrix: every (from, to) pair
is asserted to either succeed (the 3 legal ones) or raise and leave the
database untouched (the other 13).
"""

from itertools import product
from unittest import mock

import pytest
from rest_framework.exceptions import NotFound

from core.exceptions import InvalidStatusValueError, InvalidTransitionError
from submissions import services
from submissions.constants import TRANSITIONS, Status
from submissions.models import StatusEvent, Submission
from submissions.services import transition_submission


def make_submission(status: str) -> Submission:
    return Submission.objects.create(
        patient_name="Test Patient",
        age=40,
        phone="+91 90000 00000",
        primary_concern="Test concern",
        status=status,
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "from_status,to_status", list(product(Status.values, Status.values))
)
def test_transition_matrix(from_status, to_status):
    submission = make_submission(from_status)
    legal = to_status in TRANSITIONS[from_status]

    if legal:
        result = transition_submission(
            submission_id=submission.pk, target=to_status
        )
        assert result.status == to_status
        submission.refresh_from_db()
        assert submission.status == to_status
        event = StatusEvent.objects.get(submission=submission)
        assert (event.from_status, event.to_status) == (from_status, to_status)
    else:
        with pytest.raises(InvalidTransitionError) as exc_info:
            transition_submission(submission_id=submission.pk, target=to_status)
        assert exc_info.value.extra == {
            "current_status": from_status,
            "allowed_transitions": sorted(TRANSITIONS[from_status]),
        }
        submission.refresh_from_db()
        assert submission.status == from_status
        assert not StatusEvent.objects.exists()


@pytest.mark.django_db
def test_unknown_status_value_rejected_before_db_read():
    submission = make_submission(Status.NEW)
    with pytest.raises(InvalidStatusValueError):
        transition_submission(submission_id=submission.pk, target="banana")
    submission.refresh_from_db()
    assert submission.status == Status.NEW


@pytest.mark.django_db
def test_missing_submission_raises_not_found():
    with pytest.raises(NotFound):
        transition_submission(submission_id=99999, target=Status.IN_REVIEW)


@pytest.mark.django_db
def test_concurrent_transition_loses_cleanly(monkeypatch):
    """Simulates the race select_for_update cannot prevent on SQLite:
    another request commits a status change between our read and our
    write. The compare-and-swap must detect it and raise a conflict
    carrying the *fresh* status instead of silently overwriting."""
    submission = make_submission(Status.NEW)

    # Our request reads the row while it is still 'new'...
    stale = Submission.objects.get(pk=submission.pk)
    fake_locked_qs = mock.Mock()
    fake_locked_qs.get.return_value = stale
    monkeypatch.setattr(
        services.Submission.objects,
        "select_for_update",
        lambda: fake_locked_qs,
    )

    # ...but a concurrent request wins the race first.
    Submission.objects.filter(pk=submission.pk).update(status=Status.IN_REVIEW)

    with pytest.raises(InvalidTransitionError) as exc_info:
        transition_submission(submission_id=submission.pk, target=Status.IN_REVIEW)

    assert exc_info.value.extra["current_status"] == Status.IN_REVIEW
    # The loser wrote nothing: no duplicate audit event.
    assert not StatusEvent.objects.exists()
