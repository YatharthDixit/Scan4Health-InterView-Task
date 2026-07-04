from rest_framework import serializers

from .models import StatusEvent, Submission


class SubmissionSerializer(serializers.ModelSerializer):
    """Read-only representation. `status` is never writable through a
    serializer — the transition endpoint is the only way it changes."""

    allowed_transitions = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            "id",
            "patient_name",
            "age",
            "phone",
            "primary_concern",
            "status",
            "allowed_transitions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_allowed_transitions(self, obj: Submission) -> list[str]:
        return sorted(obj.allowed_transitions())


class StatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusEvent
        fields = ["id", "from_status", "to_status", "created_at"]


class SubmissionDetailSerializer(SubmissionSerializer):
    events = StatusEventSerializer(many=True, read_only=True)

    class Meta(SubmissionSerializer.Meta):
        fields = SubmissionSerializer.Meta.fields + ["events"]
        read_only_fields = fields


class TransitionRequestSerializer(serializers.Serializer):
    """Only guarantees the key is present and is a string; whether the
    value is a real, reachable status is the service's job."""

    to = serializers.CharField()
