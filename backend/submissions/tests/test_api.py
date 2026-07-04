"""API-level tests: these pin down the HTTP contract the frontend
relies on — envelope shapes, status codes, filtering, and the absence
of any write path other than /transition/."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from submissions.constants import Status
from submissions.models import ReviewComment, Submission


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
class TestCreateEndpoint:
    def test_create_inbound_starts_as_new(self, client):
        response = client.post(
            "/api/submissions/",
            {
                "patient_name": "Nisha Rao",
                "age": 33,
                "phone": "+91 99999 11111",
                "primary_concern": "Shoulder MRI referral after persistent pain.",
            },
            format="json",
        )

        assert response.status_code == 201
        body = response.json()
        assert body["patient_name"] == "Nisha Rao"
        assert body["status"] == "new"
        assert body["allowed_transitions"] == ["in_review"]
        assert body["events"] == []

    def test_create_rejects_status_backdoor(self, client):
        response = client.post(
            "/api/submissions/",
            {
                "patient_name": "Nisha Rao",
                "age": 33,
                "phone": "+91 99999 11111",
                "primary_concern": "Shoulder MRI referral after persistent pain.",
                "status": "approved",
            },
            format="json",
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"
        assert not Submission.objects.exists()


@pytest.mark.django_db
class TestReviewComments:
    def test_comment_can_be_added_to_submission_detail(self, client):
        submission = make_submission(Status.IN_REVIEW)
        response = client.post(
            f"/api/submissions/{submission.pk}/comments/",
            {"author": "Reviewer A", "body": "Check prior MRI before approval."},
            format="json",
        )

        assert response.status_code == 200
        body = response.json()
        assert body["comments"] == [
            {
                "id": ReviewComment.objects.get().pk,
                "author": "Reviewer A",
                "body": "Check prior MRI before approval.",
                "created_at": body["comments"][0]["created_at"],
            }
        ]

    def test_blank_comment_is_rejected(self, client):
        submission = make_submission(Status.IN_REVIEW)
        response = client.post(
            f"/api/submissions/{submission.pk}/comments/",
            {"author": "Reviewer A", "body": "   "},
            format="json",
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"
        assert not ReviewComment.objects.exists()

    def test_comment_action_ignores_list_filters(self, client):
        submission = make_submission(Status.NEW)
        response = client.post(
            f"/api/submissions/{submission.pk}/comments/?status=approved",
            {"body": "Detail actions should not inherit queue filters."},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["comments"][0]["body"] == (
            "Detail actions should not inherit queue filters."
        )


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

    def test_retrieve_ignores_list_filters(self, client):
        submission = make_submission(Status.NEW)
        response = client.get(f"/api/submissions/{submission.pk}/?status=approved")

        assert response.status_code == 200
        assert response.json()["id"] == submission.pk

    def test_search_by_name_case_insensitive(self, client):
        make_submission(name="Meera Krishnan")
        make_submission(name="Arjun Patel")
        body = client.get("/api/submissions/?search=meera").json()
        assert [s["patient_name"] for s in body["results"]] == ["Meera Krishnan"]

    def test_age_group_filter(self, client):
        Submission.objects.create(
            patient_name="Pediatric",
            age=12,
            phone="+91 90000 00000",
            primary_concern="Test concern",
            status=Status.NEW,
        )
        make_submission(name="Adult")
        Submission.objects.create(
            patient_name="Senior",
            age=72,
            phone="+91 90000 00000",
            primary_concern="Test concern",
            status=Status.NEW,
        )

        body = client.get("/api/submissions/?age_group=senior").json()
        assert [s["patient_name"] for s in body["results"]] == ["Senior"]

    def test_sort_by_patient_name(self, client):
        make_submission(name="Zara")
        make_submission(name="Amit")
        body = client.get("/api/submissions/?sort=patient").json()
        assert [s["patient_name"] for s in body["results"]] == ["Amit", "Zara"]

    def test_invalid_sort_is_400(self, client):
        response = client.get("/api/submissions/?sort=random")
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"

    def test_created_date_range_filter(self, client):
        old = make_submission(name="Old")
        recent = make_submission(name="Recent")
        now = timezone.now()
        Submission.objects.filter(pk=old.pk).update(
            created_at=now - timedelta(days=4)
        )
        Submission.objects.filter(pk=recent.pk).update(created_at=now)

        body = client.get(
            f"/api/submissions/?date_from={now.date().isoformat()}"
        ).json()

        assert [s["patient_name"] for s in body["results"]] == ["Recent"]

    def test_invalid_date_range_is_400(self, client):
        response = client.get("/api/submissions/?date_from=tomorrow")
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"

    def test_reversed_date_range_is_400(self, client):
        response = client.get(
            "/api/submissions/?date_from=2026-07-10&date_to=2026-07-01"
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"

    def test_out_of_range_page_is_404_envelope(self, client):
        make_submission()
        response = client.get("/api/submissions/?page=99")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"
