from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


PROVIDER_CHOICES = [
    ("local", "Local (no envía)"),
    ("smtp_generic", "SMTP genérico"),
    ("raiola", "Raiola Networks"),
    ("gmail", "Gmail"),
    ("outlook", "Outlook / Office 365"),
    ("yahoo", "Yahoo Mail"),
    ("icloud", "iCloud Mail"),
    ("zoho", "Zoho Mail"),
    ("hostinger", "Hostinger"),
    ("ionos", "IONOS"),
    ("ovh", "OVH"),
    ("dondominio", "DonDominio"),
    ("ses", "Amazon SES (SMTP)"),
    ("mailgun", "Mailgun (SMTP)"),
    ("postmark", "Postmark (SMTP)"),
    ("mailjet", "Mailjet (SMTP)"),
    ("sparkpost", "SparkPost (SMTP)"),
    ("resend", "Resend (SMTP)"),
    ("brevo", "Brevo (API)"),
    ("sendgrid", "SendGrid (API)"),
]


class User(AbstractUser):
    objects = UserManager()

    email = models.EmailField(unique=True)
    company = models.CharField(max_length=150, blank=True)
    timezone = models.CharField(max_length=50, default="Europe/Madrid")
    brevo_api_key = models.CharField(max_length=255, blank=True)
    sendgrid_api_key = models.CharField(max_length=255, blank=True)
    email_provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        default="local",
    )
    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=255, blank=True)
    smtp_password = models.CharField(max_length=255, blank=True)
    smtp_use_tls = models.BooleanField(default=True)
    smtp_use_ssl = models.BooleanField(default=False)
    from_email = models.EmailField(blank=True)
    from_name = models.CharField(max_length=150, blank=True)

    footer_company = models.CharField(max_length=200, blank=True, default="")
    footer_address = models.CharField(max_length=300, blank=True, default="")
    footer_unsubscribe_text = models.CharField(
        max_length=300,
        blank=True,
        default="Si ya no quieres recibir nuestros correos, puedes darte de baja en cualquier momento.",
    )
    footer_button_label = models.CharField(max_length=80, blank=True, default="Darse de baja")
    # Líneas extra del pie (configurables; vacías = no se muestran). Default genérico
    # para "reenviar"; la de "suscribirse" queda vacía (la rellena cada instancia).
    footer_forward_text = models.CharField(
        max_length=300, blank=True,
        default="Si te ha gustado este email, reenvíaselo a un compañero.",
    )
    footer_subscribe_text = models.CharField(max_length=300, blank=True, default="")

    # Ritmo de envío de campañas (correos/hora), configurable desde Ajustes. El
    # scheduler in-process lo lee en caliente y reparte la tasa suavemente.
    send_rate_per_hour = models.PositiveIntegerField(default=300)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email
