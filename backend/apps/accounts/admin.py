from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("MailerUp", {"fields": ("company", "timezone", "email_provider", "from_email", "from_name")}),
    )
