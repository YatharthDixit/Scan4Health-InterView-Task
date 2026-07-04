"""The single source of truth for the review state machine.

Everything — model choices, transition validation, API error payloads,
and the `allowed_transitions` field the frontend renders actions from —
derives from Status and TRANSITIONS. Adding a status means adding one
enum member and one dict entry here (plus a migration).
"""

from django.db import models


class Status(models.TextChoices):
    NEW = "new", "New"
    IN_REVIEW = "in_review", "In Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


TRANSITIONS: dict[str, frozenset[str]] = {
    Status.NEW: frozenset({Status.IN_REVIEW}),
    Status.IN_REVIEW: frozenset({Status.APPROVED, Status.REJECTED}),
    Status.APPROVED: frozenset(),
    Status.REJECTED: frozenset(),
}
