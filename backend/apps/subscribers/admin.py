from django.contrib import admin
from .models import SubscriberList, Subscriber


@admin.register(SubscriberList)
class SubscriberListAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "subscriber_count", "created_at")
    search_fields = ("name",)


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "first_name", "last_name", "status", "list", "subscribed_at")
    list_filter = ("status",)
    search_fields = ("email", "first_name", "last_name")
