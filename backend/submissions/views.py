from django.utils.dateparse import parse_date
from rest_framework import mixins, status as drf_status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.exceptions import InvalidStatusValueError

from .constants import Status
from .models import Submission
from .serializers import (
    ReviewCommentCreateSerializer,
    SubmissionCreateSerializer,
    SubmissionDetailSerializer,
    SubmissionSerializer,
    TransitionRequestSerializer,
)
from .services import transition_submission

AGE_GROUPS = {
    "pediatric": {"age__lte": 17},
    "adult": {"age__gte": 18, "age__lte": 64},
    "senior": {"age__gte": 65},
}

SORTS = {
    "newest": "-created_at",
    "oldest": "created_at",
    "patient": "patient_name",
    "age_desc": "-age",
    "age_asc": "age",
}


class SubmissionViewSet(mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    """List, retrieve, and create inbounds. There is deliberately no
    update endpoint: after creation, the only mutation staff perform is
    a status transition, which has its own action below."""

    # Non-integer ids (e.g. /submissions/abc/) 404 at routing instead of
    # reaching the ORM and blowing up with a ValueError.
    lookup_value_regex = r"\d+"

    def get_serializer_class(self):
        if self.action == "create":
            return SubmissionCreateSerializer
        if self.action == "retrieve":
            return SubmissionDetailSerializer
        return SubmissionSerializer

    def get_queryset(self):
        queryset = Submission.objects.all()
        action = getattr(self, "action", None)

        if action in {"retrieve", "comments"}:
            return queryset.prefetch_related("events", "comments")
        if action != "list":
            return queryset

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

        age_group = self.request.query_params.get("age_group")
        if age_group:
            if age_group not in AGE_GROUPS:
                raise ValidationError(
                    {"age_group": f"Use one of: {', '.join(sorted(AGE_GROUPS))}."}
                )
            queryset = queryset.filter(**AGE_GROUPS[age_group])

        date_from = self._parse_date_param("date_from")
        date_to = self._parse_date_param("date_to")
        if date_from and date_to and date_from > date_to:
            raise ValidationError(
                {"date_range": "date_from must be on or before date_to."}
            )
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        sort = self.request.query_params.get("sort", "newest")
        if sort not in SORTS:
            raise ValidationError({"sort": f"Use one of: {', '.join(SORTS)}."})

        return queryset.order_by(SORTS[sort])

    def _parse_date_param(self, name):
        value = self.request.query_params.get(name)
        if not value:
            return None
        parsed = parse_date(value)
        if parsed is None:
            raise ValidationError({name: "Use YYYY-MM-DD."})
        return parsed

    def create(self, request, *args, **kwargs):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission = serializer.save(status=Status.NEW)
        return Response(
            SubmissionDetailSerializer(submission).data,
            status=drf_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        params = TransitionRequestSerializer(data=request.data)
        params.is_valid(raise_exception=True)

        submission = transition_submission(
            submission_id=pk, target=params.validated_data["to"]
        )
        return Response(SubmissionDetailSerializer(submission).data)

    @action(detail=True, methods=["post"])
    def comments(self, request, pk=None):
        submission = self.get_object()
        serializer = ReviewCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(submission=submission)

        submission = (
            Submission.objects.prefetch_related("events", "comments")
            .get(pk=submission.pk)
        )
        return Response(SubmissionDetailSerializer(submission).data)
