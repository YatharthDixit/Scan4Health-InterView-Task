"""All write logic for submissions. Views never touch `status` directly.

Concurrency: two staff members acting on the same submission at once must
not both "win". `select_for_update()` gives a real row lock on databases
that support it (e.g. Postgres) but is silently a no-op on SQLite, so the
status write is also a compare-and-swap — the UPDATE only matches if the
status is still the one we validated. If another request slipped in
between, zero rows match and we re-read and raise a 409 with the fresh
state instead of silently overwriting.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound

from core.exceptions import InvalidStatusValueError, InvalidTransitionError

from .constants import TRANSITIONS, Status
from .models import StatusEvent, Submission


@transaction.atomic
def transition_submission(*, submission_id: int, target: str) -> Submission:
    # Reject unknown status values before touching the database.
    if target not in Status.values:
        raise InvalidStatusValueError(target, Status.values)

    try:
        submission = Submission.objects.select_for_update().get(pk=submission_id)
    except Submission.DoesNotExist:
        raise NotFound()

    current = submission.status
    if target not in TRANSITIONS[current]:
        raise InvalidTransitionError(current, target, TRANSITIONS[current])

    now = timezone.now()
    updated = Submission.objects.filter(pk=submission_id, status=current).update(
        status=target, updated_at=now
    )
    if updated == 0:
        # A concurrent request changed the status after our read.
        fresh = Submission.objects.get(pk=submission_id)
        raise InvalidTransitionError(fresh.status, target, TRANSITIONS[fresh.status])

    StatusEvent.objects.create(
        submission=submission, from_status=current, to_status=target
    )

    submission.status = target
    submission.updated_at = now
    return submission
