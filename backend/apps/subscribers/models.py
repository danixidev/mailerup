import uuid
from django.conf import settings
from django.db import models


class SubscriberList(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lists")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def subscriber_count(self):
        return self.subscribers.filter(status="active").count()


class Subscriber(models.Model):
    STATUS = [
        ("active", "Activo"),
        ("unsubscribed", "Dado de baja"),
        ("bounced", "Rebotado"),
        ("complained", "Queja spam"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    list = models.ForeignKey(SubscriberList, on_delete=models.CASCADE, related_name="subscribers")
    email = models.EmailField()
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="active")
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("list", "email")
        ordering = ["-subscribed_at"]

    def __str__(self):
        return self.email
