import logging
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Automation, AutomationStep
from .serializers import AutomationSerializer, AutomationStepSerializer

logger = logging.getLogger(__name__)


class AutomationViewSet(viewsets.ModelViewSet):
    serializer_class = AutomationSerializer

    def get_queryset(self):
        from apps.accounts.serializers import get_admin_user
        shared = get_admin_user() or self.request.user
        return Automation.objects.filter(user=shared).prefetch_related(
            "steps", "steps__automationsend_set"
        )

    def perform_create(self, serializer):
        from apps.accounts.serializers import get_admin_user
        serializer.save(user=get_admin_user() or self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="steps")
    def steps(self, request, pk=None):
        """GET: lista pasos. POST: crea paso."""
        automation = self.get_object()

        if request.method == "GET":
            s = AutomationStepSerializer(automation.steps.all(), many=True)
            return Response(s.data)

        # POST: asignar order automáticamente si no viene
        data = request.data.copy()
        if "order" not in data:
            last = automation.steps.order_by("-order").first()
            data["order"] = (last.order + 1) if last else 0
        s = AutomationStepSerializer(data=data)
        s.is_valid(raise_exception=True)
        s.save(automation=automation)
        return Response(s.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"steps/(?P<step_id>[^/.]+)",
    )
    def step_detail(self, request, pk=None, step_id=None):
        """PATCH: edita paso. DELETE: elimina paso."""
        automation = self.get_object()
        step = get_object_or_404(AutomationStep, pk=step_id, automation=automation)

        if request.method == "DELETE":
            step.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        s = AutomationStepSerializer(step, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)
