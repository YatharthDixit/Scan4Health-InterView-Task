"""API-level tests: these pin down the HTTP contract the frontend
relies on — envelope shapes, status codes, filtering, and the absence
of any write path other than /transition/."""

import pytest
from rest_framework.test import APIClient

from submissions.constants import Status
from submissions.models import Submission


@pytest.fixture
def client():
    return APIClient()


def make_submission(status=Status.NEW, name="Test Patient") -> Submission:
    return Submission.objects.create(
        patient_name=name,
        age=40,
        phone="+91 90000 00000",
        primary_concern="Test concern",
        status=status,
    )


@pytest.mark.django_db
class TestTransitionEndpoint:
    def test_valid_transition_returns_updated_submission(self, client):
        submission = make_submission(Status.NEW)
        response = client.post(
            f"/api/submissions/{submission.pk}/transition/",
            {"to": "in_review"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["status"] == "in_review"
        assert sorted(response.data["allowed_transitions"]) == [
            "approved",
            "rejected",
        ]
        assert len(response.data["events"]) == 1

    def test_invalid_transition_409_envelope_contract(self, client):
        """This test *is* the documentation of the error contract."""
        submission = make_submission(Status.APPROVED)
        response = client.post(
            f"/api/submissions/{submission.pk}/transition/",
            {"to": "in_review"},
            format="json",
        )
        assert response.status_code == 409
        assert response.json() == {
            "error": {
                "code": "invalid_transition",
                "detail": "Cannot move submission from 'approved' to 'in_review'.",
                "extra": {
                    "current_status": "approved",
                    "allowed_transitions": [],
                },
            }
        }

    def test_unknown_status_value_is_400(self, client):
        submission = make_submission()
        response = client.post(
            f"/api/submissions/{submission.pk}/transition/",
            {"to": "aproved"},
            format="json",
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "invalid_status_value"

    def test_missing_to_key_is_400(self, client):
        submission = make_submission()
        response = client.post(
            f"/api/submissions/{submission.pk}/transition/", {}, format="json"
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"

    def test_nonexistent_id_is_404_envelope(self, client):
        response = client.post(
            "/api/submissions/99999/transition/",
            {"to": "in_review"},
            format="json",
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"


@pytest.mark.django_db
class TestNoStatusBackdoor:
    """The transition action must be the only write path. A generic
    PATCH/PUT quietly accepting `status` is the classic hole here."""

    def test_patch_is_rejected(self, client):
        submission = make_submission(Status.NEW)
        response = client.patch(
            f"/api/submissions/{submission.pk}/",
            {"status": "approved"},
            format="json",
        )
        assert response.status_code == 405
        submission.refresh_from_db()
        assert submission.status == Status.NEW

    def test_put_and_delete_are_rejected(self, client):
        submission = make_submission(Status.NEW)
        assert client.put(f"/api/submissions/{submission.pk}/").status_code == 405
        assert client.delete(f"/api/submissions/{submission.pk}/").status_code == 405


@pytest.mark.django_db
class TestListEndpoint:
    def test_newest_first_and_pagination_shape(self, client):
        for i in range(12):
            make_submission(name=f"Patient {i}")
        response = client.get("/api/submissions/")
        assert response.status_code == 200
        body = response.json()
        assert [s["patient_name"] for s in body["results"][:2]] == [
            "Patient 11",
            "Patient 10",
        ]
        assert body["pagination"] == {
            "count": 12,
            "page": 1,
            "page_size": 10,
            "total_pages": 2,
            "has_next": True,
            "has_previous": False,
        }

    def test_status_filter(self, client):
        make_submission(Status.NEW)
        make_submission(Status.APPROVED)
        body = client.get("/api/submissions/?status=approved").json()
        assert [s["status"] for s in body["results"]] == ["approved"]

    def test_invalid_status_filter_is_400_not_empty_list(self, client):
        response = client.get("/api/submissions/?status=banana")
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "invalid_status_value"

    def test_search_by_name_case_insensitive(self, client):
        make_submission(name="Meera Krishnan")
        make_submission(name="Arjun Patel")
        body = client.get("/api/submissions/?search=meera").json()
        assert [s["patient_name"] for s in body["results"]] == ["Meera Krishnan"]

    def test_out_of_range_page_is_404_envelope(self, client):
        make_submission()
        response = client.get("/api/submissions/?page=99")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"
