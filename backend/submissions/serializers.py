from rest_framework import serializers

from .models import ReviewComment, StatusEvent, Submission


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


class ReviewCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewComment
        fields = ["id", "author", "body", "created_at"]
        read_only_fields = fields


class SubmissionDetailSerializer(SubmissionSerializer):
    events = StatusEventSerializer(many=True, read_only=True)
    comments = ReviewCommentSerializer(many=True, read_only=True)

    class Meta(SubmissionSerializer.Meta):
        fields = SubmissionSerializer.Meta.fields + ["events", "comments"]
        read_only_fields = fields


class ReviewCommentCreateSerializer(serializers.ModelSerializer):
    author = serializers.CharField(
        max_length=80, trim_whitespace=True, required=False, allow_blank=True
    )
    body = serializers.CharField(trim_whitespace=True)

    class Meta:
        model = ReviewComment
        fields = ["author", "body"]

    def validate_author(self, value: str) -> str:
        return value or "Reviewer"


class SubmissionCreateSerializer(serializers.ModelSerializer):
    """Intake creation is intentionally narrow: staff can enter patient
    details, but every inbound starts as `new`. Status changes still go
    through the transition action."""

    patient_name = serializers.CharField(max_length=120, trim_whitespace=True)
    age = serializers.IntegerField(min_value=0, max_value=120)
    phone = serializers.CharField(max_length=20, trim_whitespace=True)
    primary_concern = serializers.CharField(trim_whitespace=True)

    class Meta:
        model = Submission
        fields = ["patient_name", "age", "phone", "primary_concern"]

    def validate(self, attrs):
        if "status" in getattr(self, "initial_data", {}):
            raise serializers.ValidationError(
                {"status": "New inbounds always start as new."}
            )
        return attrs


class TransitionRequestSerializer(serializers.Serializer):
    """Only guarantees the key is present and is a string; whether the
    value is a real, reachable status is the service's job."""

    to = serializers.CharField()
