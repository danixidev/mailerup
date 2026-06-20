from django.contrib import admin
from .models import Campaign, CampaignSend

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "status", "scheduled_at", "sent_at", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "subject")

admin.site.register(CampaignSend)
