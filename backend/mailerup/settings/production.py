from .base import *

DEBUG = False

# Run Celery tasks synchronously in-process (no Redis broker, no worker).
# Campaign sending no longer uses Celery (it's done by the in-process scheduler
# in batches), but automations still dispatch via .delay()
# (process_automation_queue / trigger_automation_for_subscriber). Without EAGER,
# those .delay() calls would try to enqueue to the Redis broker
# (default redis://localhost:6379/0) — which does not exist in production —
# raising OperationalError and breaking automation emails.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Behind nginx/Cloudflare TLS termination: trust the forwarded proto so Django
# knows the request is HTTPS (otherwise SECURE_SSL_REDIRECT loops forever).
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
