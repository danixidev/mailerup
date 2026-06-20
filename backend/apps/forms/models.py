import uuid
from django.db import models
from django.conf import settings


class SubscriptionForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription_forms")
    name = models.CharField(max_length=200)          # nombre interno
    title = models.CharField(max_length=200, default="Suscríbete a nuestra newsletter")
    description = models.TextField(blank=True)
    button_text = models.CharField(max_length=100, default="Suscribirme")
    success_message = models.CharField(max_length=500, default="¡Gracias! Revisa tu correo para confirmar la suscripción.")
    redirect_url = models.URLField(blank=True)       # URL a redirigir tras confirmar (opcional)
    primary_color = models.CharField(max_length=7, default="#4f46e5")   # hex
    collect_first_name = models.BooleanField(default=True)
    collect_last_name = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    # Grupo (SubscriberList) al que se añaden los suscriptores que entran por este
    # formulario. Si es null, se usa el grupo por defecto (_get_or_create_default_list).
    target_list = models.ForeignKey(
        "subscribers.SubscriberList",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="forms",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
