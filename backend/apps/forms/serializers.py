from rest_framework import serializers
from apps.subscribers.models import SubscriberList
from .models import SubscriptionForm


class SubscriptionFormSerializer(serializers.ModelSerializer):
    target_list = serializers.PrimaryKeyRelatedField(
        required=False, allow_null=True, queryset=SubscriberList.objects.all(),
    )
    target_list_name = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionForm
        fields = (
            "id", "name", "title", "description", "button_text",
            "success_message", "redirect_url", "primary_color",
            "collect_first_name", "collect_last_name",
            "target_list", "target_list_name",
            "is_active", "created_at",
        )
        read_only_fields = ("id", "created_at")

    def get_target_list_name(self, obj):
        return obj.target_list.name if obj.target_list else None
