from rest_framework import serializers
from .models import Automation, AutomationStep, AutomationEnrollment


class AutomationStepSerializer(serializers.ModelSerializer):
    delay_hours_total = serializers.SerializerMethodField()
    sent_count = serializers.SerializerMethodField()

    class Meta:
        model = AutomationStep
        fields = (
            "id", "order", "subject", "html_content",
            "delay_amount", "delay_unit", "from_name", "from_email",
            "delay_hours_total", "sent_count",
        )
        read_only_fields = ("id",)

    def get_delay_hours_total(self, obj):
        return obj.delay_hours()

    def get_sent_count(self, obj):
        # Nº de personas a las que ya se les envió el correo de este paso.
        # len() sobre la relación aprovecha el prefetch del ViewSet (evita un
        # COUNT por paso —N+1— al listar automatizaciones).
        return len(obj.automationsend_set.all())


class AutomationSerializer(serializers.ModelSerializer):
    steps = AutomationStepSerializer(many=True, read_only=True)
    enrolled_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = Automation
        fields = (
            "id", "name", "form", "is_active", "created_at",
            "steps", "enrolled_count", "completed_count",
        )
        read_only_fields = ("id", "created_at")

    def get_enrolled_count(self, obj):
        return obj.enrollments.filter(status="active").count()

    def get_completed_count(self, obj):
        return obj.enrollments.filter(status="completed").count()
