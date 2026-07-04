from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.exceptions import InvalidStatusValueError

from .constants import Status
from .models import Submission
from .serializers import (
    SubmissionDetailSerializer,
    SubmissionSerializer,
    TransitionRequestSerializer,
)
from .services import transition_submission


class SubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """List + retrieve only. There is deliberately no update endpoint:
    submissions are created upstream and the only mutation staff perform
    is a status transition, which has its own action below."""

    # Non-integer ids (e.g. /submissions/abc/) 404 at routing instead of
    # reaching the ORM and blowing up with a ValueError.
    lookup_value_regex = r"\d+"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SubmissionDetailSerializer
        return SubmissionSerializer

    def get_queryset(self):
        queryset = Submission.objects.all()
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("events")

        status_param = self.request.query_params.get("status")
        if status_param:
            # An invalid filter is an error, not an empty list — a silent
            # empty result would hide typos from API consumers.
            if status_param not in Status.values:
                raise InvalidStatusValueError(status_param, Status.values)
            queryset = queryset.filter(status=status_param)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(patient_name__icontains=search)

        return queryset

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        params = TransitionRequestSerializer(data=request.data)
        params.is_valid(raise_exception=True)

        submission = transition_submission(
            submission_id=pk, target=params.validated_data["to"]
        )
        return Response(SubmissionDetailSerializer(submission).data)
