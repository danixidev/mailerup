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

    def get_fields(self):
        # Restringe target_list a las listas del propietario (admin compartido o
        # el propio usuario). Sin esto, cualquier ID de lista de otra cuenta sería
        # aceptado y un formulario público podría inyectar altas en listas ajenas
        # (CWE-639). Mismo blindaje que CampaignSerializer.subscriber_list.
        fields = super().get_fields()
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            from apps.accounts.serializers import get_admin_user
            owner = get_admin_user() or request.user
            fields["target_list"].queryset = SubscriberList.objects.filter(user=owner)
        return fields

    def get_target_list_name(self, obj):
        return obj.target_list.name if obj.target_list else None
