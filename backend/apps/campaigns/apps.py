import os
import sys
from django.apps import AppConfig

# Management commands that must NOT start the background scheduler.
_MGMT_COMMANDS = {
    "migrate", "makemigrations", "shell", "shell_plus", "test", "pytest",
    "collectstatic", "createsuperuser", "changepassword", "check",
    "showmigrations", "sqlmigrate", "dbshell", "loaddata", "dumpdata",
    "flush", "squashmigrations", "makemessages", "compilemessages",
    "startapp", "startproject", "spectacular", "diffsettings",
}


class CampaignsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.campaigns"

    def ready(self):
        from django.conf import settings

        # Opt-out for multi-worker deployments (run one dedicated scheduler).
        if getattr(settings, "DISABLE_SCHEDULER", False):
            return

        argv = sys.argv
        # Skip one-off management commands (migrate, shell, test, …) so the
        # scheduler only runs inside a real server process (runserver, gunicorn,
        # uvicorn/daphne via ASGI, etc.).
        if len(argv) > 1 and argv[1] in _MGMT_COMMANDS:
            return
        if any("pytest" in (a or "") for a in argv[:1]):
            return

        # Under runserver's autoreloader, only start in the reloaded child.
        if "runserver" in argv and "--noreload" not in argv and os.environ.get("RUN_MAIN") != "true":
            return

        # Guard against duplicate starts within the same process.
        if os.environ.get("MAILERUP_SCHEDULER_STARTED"):
            return
        os.environ["MAILERUP_SCHEDULER_STARTED"] = "1"

        from .scheduler import start
        start()
