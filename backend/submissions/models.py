from django.core.validators import MaxValueValidator
from django.db import models

from core.models import TimeStampedModel

from .constants import TRANSITIONS, Status


class Submission(TimeStampedModel):
    patient_name = models.CharField(max_length=120)
    age = models.PositiveSmallIntegerField(validators=[MaxValueValidator(120)])
    phone = models.CharField(max_length=20)
    primary_concern = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.patient_name} ({self.status})"

    def allowed_transitions(self) -> frozenset[str]:
        return TRANSITIONS[self.status]


class StatusEvent(models.Model):
    """Audit trail: one row per status change, written in the same
    transaction as the change itself."""

    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="events"
    )
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"#{self.submission_id}: {self.from_status} → {self.to_status}"
