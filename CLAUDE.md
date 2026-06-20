# CLAUDE.md

Guía operativa para asistentes IA (Claude Code y similares) que trabajen en este repo.

## Resumen del proyecto

MailerUp es una plataforma autoalojada de newsletter (estilo MailerLite) escrita en **Django 6 + DRF** (backend) y **React 19 + Vite + Tailwind + Tiptap** (frontend). Usa un scheduler in-process (sin Redis ni Celery worker). Pensada para una VPS modesta con SMTP del hosting (Raiola, Gmail, IONOS…) o Postfix local.

> **Despliegue NATIVO (sin Docker) desde 2026-06-15.** El proyecto se ejecutaba antes con Docker Compose; se migró a un despliegue nativo sobre la VPS. Los ficheros `docker-compose.yml`, `DOCKER.md`, `backend/Dockerfile` y `nginx/Dockerfile` quedan como **legado/referencia** y **no** describen el despliegue actual.

## Arquitectura de despliegue actual (producción: `newsletter.example.com`)

VPS Ubuntu 24.04, **1 GB RAM / 1 CPU** (con swapfile de 2 GB). Código en `/opt/mailerup`.

- **PostgreSQL 16 nativo** en `127.0.0.1:5432` (BD `mailerup`, rol `mailerup`). La app conecta por `DATABASE_URL` (en `backend/.env`).
- **App Django** como servicio **systemd `mailerup.service`**:
  `/opt/mailerup/backend/.venv/bin/uvicorn mailerup.asgi:application --host 127.0.0.1 --port 8100 --workers 1`
  (**1 worker** a propósito: el scheduler in-process debe correr en una única instancia). venv en `/opt/mailerup/backend/.venv`, `DJANGO_SETTINGS_MODULE=mailerup.settings.production`.
- **nginx del HOST** (no contenedor) sirve el SPA y hace de proxy. Vhost `/etc/nginx/sites-available/newsletter.example.com`:
  `root /opt/mailerup/frontend/dist`, `client_max_body_size 25M`,
  `location ~ ^/(api|admin|static|u|o|c|oa|ca|subscribe|verify-subscription|recurso)(/|$)` → `proxy_pass http://127.0.0.1:8100` (con `X-Forwarded-Proto https`),
  resto → `try_files $uri $uri/ /index.html`. TLS por **Cloudflare Origin cert**. (El mismo nginx sirve otros vhosts del correo — no tocarlos.)
- **Static**: whitenoise (servido por uvicorn vía `/static/`). **Media** (adjuntos de campañas): `/opt/mailerup/backend/media/resources/`.
- **`backend/.env`** (gitignored): secretos Django + `DATABASE_URL=postgres://…@127.0.0.1:5432/mailerup` + `SMTP_HOST=127.0.0.1` (Postfix del host) + `ALLOWED_HOSTS`, `PUBLIC_BASE_URL`, `CSRF_TRUSTED_ORIGINS`, etc. Hay `backend/.env.example`. Cualquier variable nueva debe tener default en `settings/base.py`.

## Despliegue y actualización (LO MÁS IMPORTANTE)

El repo **no tiene CI ni push automático** a la VPS. Para desplegar un cambio:

### Backend (código Python / migraciones)
```bash
# en la VPS, /opt/mailerup (tras sincronizar el código: git pull o rsync)
cd /opt/mailerup/backend
.venv/bin/pip install -r requirements.txt            # solo si cambió requirements.txt
DJANGO_SETTINGS_MODULE=mailerup.settings.production .venv/bin/python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=mailerup.settings.production .venv/bin/python manage.py collectstatic --noinput
sudo systemctl restart mailerup
```
O usa el script `bash /opt/mailerup/update.sh` (versión nativa: sincroniza git, pip, migrate, collectstatic, reinicia el servicio — **NO** toca el frontend).

### Frontend (React/Vite)
**Compila SIEMPRE en local / fuera de la VPS** y sube el `dist/`:
```bash
# en tu máquina
cd frontend && npm ci && npm run build
rsync -az --delete frontend/dist/  usuario@vps:/opt/mailerup/frontend/dist/
```
> ⚠️ **NUNCA compiles el frontend (Vite/npm) en la VPS.** Con 1 GB de RAM el build agota la memoria y cuelga la máquina (OOM). Por eso el build es local y solo se sube el `dist`.

### Comandos útiles
```bash
systemctl status mailerup                 # estado del servicio
journalctl -u mailerup -f                 # logs de la app
sudo systemctl restart mailerup           # reiniciar tras cambios de código
DJANGO_SETTINGS_MODULE=mailerup.settings.production .venv/bin/python manage.py shell
DJANGO_SETTINGS_MODULE=mailerup.settings.production .venv/bin/python manage.py createsuperuser
# Backup de BD:
pg_dump -Fc -h 127.0.0.1 -U mailerup mailerup > /opt/mailerup/backups/mailerup_$(date +%F).dump

# Desarrollo local (opcional): settings de development con SQLite
cd backend && python manage.py runserver  # DJANGO_SETTINGS_MODULE=mailerup.settings.development
```

## Arquitectura — lo que necesitas saber para no romper nada

### Backend

- **Apps activas**: `accounts`, `subscribers`, `campaigns`, `analytics`, `integrations`, `forms` (label `subscription_forms`), `automations`.
- **Settings**: `mailerup/settings/{base,development,production}.py`. `production` y `development` activan `CELERY_TASK_ALWAYS_EAGER=True` (las tareas Celery corren en el mismo hilo, sin Redis). `production` confía en `X-Forwarded-Proto` (TLS lo termina nginx/Cloudflare) y fuerza `SECURE_SSL_REDIRECT`.
- **Modelo `User`** (`apps/accounts/models.py`): extiende `AbstractUser`. SMTP (`email_provider`, `smtp_*`, `brevo_api_key`, `sendgrid_api_key`), pie de correo (`footer_*`), remitente (`from_name`, `from_email`). **Rol admin = `is_staff=True`** (el serializer lo expone como `is_admin`). Datos compartidos entre usuarios vía `get_admin_user()`.
- **Grupos de suscriptores**: `subscribers.SubscriberList` = "grupo". `Subscriber` pertenece a UNA lista (FK `list`, `unique_together(list,email)`). Cada `forms.SubscriptionForm` tiene `target_list` (a qué grupo entran los suscriptores; fallback a `_get_or_create_default_list`). CRUD de grupos en `/api/subscribers/groups/`; `all_subscribers`/`export`/`import`/`add` aceptan `?list=` (sin él = todos los grupos).
- **`Campaign`**: estados `draft|scheduled|sending|sent|paused`. Destinatarios: un grupo (`subscriber_list`) o `send_to_all=True` (todos los grupos, deduplicando por email con `DISTINCT ON` de Postgres en `_pending_subscribers`).
- **Automatizaciones** (`apps/automations/`): `Automation` → `AutomationStep` (PK UUID) → `AutomationEnrollment`/`AutomationSend`. El scheduler dispara `process_automation_queue` cada 30-60s. Cada paso inyecta pixel de apertura (`/oa/<token>/`) y reescribe enlaces (`/ca/<token>/`). Métricas en `analytics.AutomationEmailOpen/Click`.
- **Scheduler + envío progresivo**: `apps/campaigns/scheduler.py` arranca un hilo daemon en `apps.py.ready()` (solo en procesos servidor). Envía por lotes (`CAMPAIGN_SEND_BATCH_SIZE`, `CAMPAIGN_SEND_INTERVAL_SECONDS`), estado reanudable en `CampaignSend` con `get_or_create`. `MAILERUP_DISABLE_SCHEDULER=1` lo desactiva (útil si algún día hay >1 proceso).
- **Envío** (`apps/campaigns/tasks.py`): `_personalize()` sustituye placeholders, reescribe `href=` para click tracking y añade el pixel. **Tokens firmados con `signing.dumps`**; los URLs públicos (`/u/`, `/o/`, `/c/`, `/oa/`, `/ca/`) viven en `mailerup/urls.py`. `SMTPSender` (`apps/integrations/email_sender.py`) fuerza `from_addr`/`to_addrs` explícitos para que el envelope MAIL FROM coincida con `smtp_user` (clave para SPF). **No tocar sin saber lo que haces.**
- **Permisos**: `IsAdminUser` protege `/api/auth/users/*` y `/api/auth/db-export/`. `UserSerializer.update()` filtra campos sensibles para no-admins; estos heredan provider/footer del primer admin.

### Frontend

- **Router**: `src/App.jsx` (`RequireAuth` para `Layout`, `RequireAdmin` para `/users`).
- **Auth**: `src/auth.jsx` (user/login/logout). **API**: `src/api.js` (Axios + auto-refresh JWT, `baseURL: '/api'`).
- **Páginas**: `pages/{Login, Layout, Subscribers, Campaigns, CampaignEditor, Analytics, Settings, Users, Automations, AutomationStepEditor, Forms, Deliverability, Storage}.jsx`.
- **Editor**: `components/RichTextEditor.jsx` (Tiptap). **DNS guide**: `components/DnsSetupBlock.jsx`.
- **Tema oscuro**: clase `dark` (Tailwind `darkMode: 'class'`). La paleta `primary` en `tailwind.config.js` define los tonos 50–900; usa `dark:text-white` en estados activos.

## Decisiones a respetar

1. **Postgres en producción** (nativo, `127.0.0.1:5432`, vía `DATABASE_URL`). SQLite solo para desarrollo local.
2. **Sin Redis**. Celery en EAGER; el scheduler usa `threading.Thread`. **1 worker** de uvicorn.
3. **Tokens públicos firmados**. Nunca expongas UUIDs de Subscriber/Campaign/Step en URLs de emails — usa `make_unsubscribe_token` / `make_track_token` / `make_auto_track_token`.
4. **Settings de proveedor compartidos**: solo admins las editan; los usuarios normales heredan vía `get_sender()`.
5. **`from_email` alineado con `smtp_user`** (la UI lo auto-sincroniza y el sender lo fuerza). No revertir.
6. **Roles**: usar `is_staff`. No introducir un campo `role` separado.

## Cosas que NO hacer

- No compilar el frontend en la VPS (OOM con 1 GB). Build local + subir `dist`.
- No exponer `db.sqlite3` ni `backend/.env` en commits (comprobado en `.gitignore`).
- No reintroducir envío de campañas inline en el thread del request HTTP. El envío es **progresivo por lotes** vía el scheduler.
- Las **credenciales SMTP se guardan en `.env`** (no en la BD) vía `apps/accounts/env_file.py` (`smtp_config_from_env()`). No volver a persistir `smtp_password` en la BD.
- La app arranca por **ASGI** (`mailerup.asgi:application`). `wsgi.py` se mantiene por compatibilidad.

## Reglas de cambios — OBLIGATORIO

### Migraciones (no negociables)
1. **Solo cambios aditivos por release**: campos nuevos con `default=`/`blank=True`, tablas nuevas. Nunca eliminar/renombrar en el mismo commit que quita el código que los usa.
2. **Renombrar columna = dos releases** (deja de usarla en N, la borra en N+1).
3. **Ejecuta `makemigrations` antes de desplegar** si tocas modelos; verifica `default=`/`blank=True` en campos nuevos. El despliegue hace `migrate` explícito.
4. **Nunca `squashmigrations`** sin avisar.

### Dependencias
5. **Dependencia Python nueva** → `requirements.txt` (y `.venv/bin/pip install -r requirements.txt` al desplegar).
6. **Paquete npm nuevo** → `package.json` + `package-lock.json` (entra en el build local del frontend). Mantén el lockfile sincronizado.
7. **No eliminar paquetes** sin verificar que nada los importa.

### API y frontend
8. **No romper endpoints existentes**: mantén campos antiguos como alias o vacíos.
9. **Campos nuevos en serializers**: `read_only` o `required=False`.
10. **Variables de entorno nuevas**: default sensato en `settings/base.py` (`env("VAR", default=...)`) y documentadas en `backend/.env.example`.
11. **`tailwind.config.js`**: si añades clases con tonos de color, asegúrate de que el tono existe en la paleta.

### Checklist antes de desplegar cambios de modelo
```bash
cd backend && python manage.py makemigrations          # genera fichero nuevo
python manage.py migrate                               # aplica sin error (local con SQLite)
python manage.py check                                 # 0 issues
# Verifica default=/blank=True en los campos nuevos
```

## Test mínimo después de cambios grandes
```bash
cd /opt/mailerup/backend
DJANGO_SETTINGS_MODULE=mailerup.settings.production .venv/bin/python manage.py check   # 0 issues
sudo systemctl restart mailerup
curl -s -o /dev/null -w "home %{http_code}\n" -H 'X-Forwarded-Proto: https' http://127.0.0.1:8100/   # 404 = ok (la raíz la sirve nginx)
curl -s -o /dev/null -w "api  %{http_code}\n" -H 'X-Forwarded-Proto: https' http://127.0.0.1:8100/api/analytics/overview/   # 401 sin auth = OK
# End-to-end (a través de nginx/Cloudflare):
curl -s -o /dev/null -w "site %{http_code}\n" https://newsletter.example.com/   # 200
```
