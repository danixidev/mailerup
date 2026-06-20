#!/bin/sh
# Entrypoint del contenedor web: migra, recolecta estáticos y arranca uvicorn.
# El servicio db tiene healthcheck y web depende de él (service_healthy),
# así que aquí la base de datos ya está lista.
set -e

echo "[entrypoint] Aplicando migraciones…"
python manage.py migrate --noinput

echo "[entrypoint] Recolectando ficheros estáticos…"
python manage.py collectstatic --noinput

echo "[entrypoint] Arrancando uvicorn (ASGI, 1 worker)…"
# 1 solo worker a propósito: el scheduler in-process de campañas/automatizaciones
# debe ejecutarse en una única instancia.
exec uvicorn mailerup.asgi:application --host 0.0.0.0 --port 8100 --workers 1
