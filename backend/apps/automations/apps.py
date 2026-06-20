from django.apps import AppConfig


class AutomationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.automations"

    def ready(self):
        # The campaigns scheduler thread handles automation processing.
        # Nothing to start here — process_automation_queue is called from
        # apps/campaigns/scheduler.py every 60 seconds.
        pass
