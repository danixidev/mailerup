from django.contrib import admin
from .models import EmailOpen, EmailClick, EmailBounce, EmailUnsubscribe

admin.site.register(EmailOpen)
admin.site.register(EmailClick)
admin.site.register(EmailBounce)
admin.site.register(EmailUnsubscribe)
