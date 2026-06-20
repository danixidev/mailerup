# AGENTS.md

Convención reciente (Cursor, OpenAI Codex, Cline, etc.): los agentes leen este archivo para entender el repo. Mantiene paridad con `CLAUDE.md` pero más compacto.

## ¿Qué es Mailerup?

App web autoalojada de newsletter: suscriptores, editor WYSIWYG, envío SMTP/API, tracking, programación, analíticas (campañas y automatizaciones), roles admin/usuario.

## Stack

- Backend: Django 6 + DRF + **PostgreSQL** + JWT, scheduler in-process (sin Redis).
- Frontend: React 19 + Vite + Tailwind + Tiptap.
- Envío: SMTP (preset por proveedor) o APIs Brevo/SendGrid.
- **Despliegue: Docker Compose** (`web` + `nginx` + `db`).

## Despliegue y actualización (clave)

```bash
cd /opt/mailerup
docker compose up -d --build        # levantar (migraciones automáticas en el entrypoint)
bash update.sh                      # actualizar: pull + rebuild + migrar + health check + backup
docker compose exec web python manage.py createsuperuser
```

- El código se despliega **desde GitHub**: `update.sh` hace `git reset --hard origin/<rama>`. **Todo cambio debe commitearse y pushearse a `origin/main`** o se revertirá.
- La BD vive en el volumen `pgdata` (persiste entre rebuilds). **No** `docker compose down -v`.
- Dos `.env` (gitignored, uno por VPS): `backend/.env` (Django) y `.env` raíz (Postgres + `NGINX_HOST_PORT`). Variables nuevas → con default en `settings/base.py`.
- Desarrollo local sin Docker: `cd backend && python manage.py runserver` (settings `development`, SQLite).

## Mapa de apps Django

| App            | Responsabilidad                                                              |
| -------------- | ---------------------------------------------------------------------------- |
| `accounts`     | Auth JWT, roles (`is_staff`), CRUD usuarios admin, presets proveedor + DNS   |
| `subscribers`  | Suscriptores (lista única por usuario), import/export CSV                    |
| `campaigns`    | CRUD campañas, send/schedule/duplicate, scheduler thread, personalización    |
| `analytics`    | Tracking open/click (campañas y automatizaciones) + unsubscribe firmado, KPIs|
| `automations`  | Secuencias por formulario: pasos, enrolamientos, envíos y métricas por paso  |
| `integrations` | `SMTPSender`, `BrevoSender`, `SendGridSender`, `NullSender`                  |
| `forms`        | Formularios de suscripción (label `subscription_forms`) + verificación       |

## Reglas que respetar

1. **Postgres en prod** (vía `DATABASE_URL`); SQLite solo en local. **Sin Redis** (EAGER + thread scheduler); uvicorn con **1 worker**.
2. **Tokens públicos firmados** con `django.core.signing`. Nunca exponer UUIDs en URLs de email (`make_*_token`).
3. **`from_email` alineado con `smtp_user`** (UI auto-sincroniza, `SMTPSender` lo fuerza a nivel envelope).
4. **Provider/footer compartidos**: los configura el primer admin; no-admins heredan vía `get_sender()`.
5. **Roles**: `is_staff` = admin (`RequireAdmin` front + `IsAdminUser` back).
6. **Datos sensibles fuera del repo**: `backend/.env`, `.env` raíz, `db.sqlite3` ignorados.

## Compatibilidad con `update.sh` (obligatorio)

- Migraciones **solo aditivas** por release (campos con `default=`/`blank=True`, tablas nuevas). Renombrar = dos releases. Nunca `squashmigrations` sin avisar.
- Dependencia Python nueva → `requirements.txt`. Paquete npm nuevo → `package.json` + `package-lock.json` sincronizado (si no, `npm ci` rompe el build).
- No romper endpoints/serializers existentes (campos nuevos `read_only`/`required=False`).
- Variables de entorno nuevas → default en `settings/base.py` + documentar en el `.env.example`.

## Antes de hacer commit

- `docker compose exec web python manage.py check` → 0 issues (o `python manage.py check` en local).
- Si tocas modelos: `python manage.py makemigrations` (verifica `default=`/`blank=True`).
- Verificar que no se cuela `.env`, `db.sqlite3` ni `node_modules` (`git status`).
- **Commit + push a `origin/main`** (fuente de verdad del despliegue).

## Documentación adicional

- `README.md` — público, despliegue/actualización con Docker.
- `CLAUDE.md` — contexto operativo extenso para asistentes IA.
- `DOCKER.md` — detalle de los servicios y operaciones Docker.
- `AGENTS.md` — este archivo, paridad compacta de `CLAUDE.md`.
