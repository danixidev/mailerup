import uuid
from django.db import models
from django.conf import settings


class Automation(models.Model):
    """Una secuencia de emails asociada a un formulario de suscripción."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="automations")
    name = models.CharField(max_length=200)
    # FK al formulario — nullable para permitir crearla antes que el formulario
    form = models.OneToOneField(
        "subscription_forms.SubscriptionForm",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="automation",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class AutomationStep(models.Model):
    """Un paso de la secuencia: un correo que se envía N horas/días después de la suscripción."""
    DELAY_UNITS = [
        ("minutes", "Minutos"),
        ("hours", "Horas"),
        ("days", "Días"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    automation = models.ForeignKey(Automation, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField(default=0)   # para ordenar los pasos
    subject = models.CharField(max_length=250)
    html_content = models.TextField()
    delay_amount = models.PositiveIntegerField(default=0)   # número de unidades
    delay_unit = models.CharField(max_length=10, choices=DELAY_UNITS, default="days")
    from_name = models.CharField(max_length=150, blank=True)
    from_email = models.EmailField(blank=True)

    class Meta:
        ordering = ["order", "delay_amount"]

    def delay_hours(self):
        """Retorna el delay total en horas (puede ser fraccionario para minutos)."""
        if self.delay_unit == "days":
            return self.delay_amount * 24
        if self.delay_unit == "minutes":
            return self.delay_amount / 60
        return self.delay_amount

    def __str__(self):
        return f"{self.automation.name} – paso {self.order}: {self.subject}"


class AutomationEnrollment(models.Model):
    """Registra que un suscriptor está en una automatización y lleva el progreso."""
    STATUS = [
        ("active", "Activa"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    automation = models.ForeignKey(Automation, on_delete=models.CASCADE, related_name="enrollments")
    subscriber = models.ForeignKey("subscribers.Subscriber", on_delete=models.CASCADE, related_name="automation_enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS, default="active")
    last_step_sent = models.IntegerField(default=-1)   # order del último paso enviado

    class Meta:
        unique_together = ("automation", "subscriber")

    def __str__(self):
        return f"{self.subscriber.email} → {self.automation.name}"


class AutomationSend(models.Model):
    """Registro de cada envío de automatización."""
    enrollment = models.ForeignKey(AutomationEnrollment, on_delete=models.CASCADE, related_name="sends")
    step = models.ForeignKey(AutomationStep, on_delete=models.CASCADE)
    sent_at = models.DateTimeField(auto_now_add=True)
    provider_message_id = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("enrollment", "step")
