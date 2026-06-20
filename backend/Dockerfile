# MailerUp backend — Django + uvicorn (ASGI)
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=mailerup.settings.production

WORKDIR /app

# Dependencias del sistema mínimas (psycopg[binary] y Pillow traen wheels;
# postgresql-client aporta pg_isready/psql para diagnóstico).
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8100
ENTRYPOINT ["/app/entrypoint.sh"]
