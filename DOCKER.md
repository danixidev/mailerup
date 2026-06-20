# Despliegue con Docker — ⚠️ LEGADO (ya no se usa)

> **Este documento describe el despliegue ANTIGUO con Docker, retirado el 2026-06-15.**
> La producción corre ahora de forma **nativa** (PostgreSQL + systemd/uvicorn + nginx del host).
> Consulta **[`deploy/README.md`](deploy/README.md)** y `CLAUDE.md` para el despliegue actual.
> Los ficheros `docker-compose.yml`, `backend/Dockerfile` y `nginx/Dockerfile` se conservan
> solo como referencia histórica.

Toda la aplicación (backend Django, frontend React y base de datos Postgres) corría
con Docker Compose. La base de datos vivía en un volumen (`pgdata`) y **persistía entre
actualizaciones**.

## Servicios

| Servicio | Imagen | Rol |
|----------|--------|-----|
| `db`    | postgres:16-alpine | Base de datos (volumen `pgdata`) |
| `web`   | build `backend/Dockerfile` | Django + uvicorn (ASGI). Migra y recolecta estáticos al arrancar |
| `nginx` | build `nginx/Dockerfile` | Compila el frontend (Vite) y lo sirve + proxy a `web`. Publica en `127.0.0.1:${NGINX_HOST_PORT}` |

Pon delante tu propio reverse proxy con TLS (nginx, Apache, Caddy, Traefik… o
Cloudflare) haciendo `proxy_pass` de **tu dominio** → `127.0.0.1:${NGINX_HOST_PORT}`
(este compose). Ver `nginx/default.conf` y la sección «Reverse proxy» más abajo.

## Configuración

- `backend/.env` — secretos de Django (SECRET_KEY, SMTP, ALLOWED_HOSTS, PUBLIC_BASE_URL…). **No** se versiona.
- `.env` (raíz) — credenciales de Postgres y `DATABASE_URL`, más `NGINX_HOST_PORT`. **No** se versiona.

Ejemplo de `.env` (raíz):

```
POSTGRES_DB=mailerup
POSTGRES_USER=mailerup
POSTGRES_PASSWORD=<contraseña-fuerte>
DATABASE_URL=postgres://mailerup:<contraseña-fuerte>@db:5432/mailerup
NGINX_HOST_PORT=8110
# Opcional: dirección de bind del puerto publicado (127.0.0.1 = solo accesible por
# el reverse proxy del host; 0.0.0.0 = accesible desde fuera, úsalo solo si NO pones
# un proxy delante y aceptas exponer la app sin TLS).
# BIND_ADDR=127.0.0.1
```

## Reverse proxy (nginx, Apache u otro)

El compose publica la app en `127.0.0.1:${NGINX_HOST_PORT}` (HTTP plano). **Pon delante
tu propio reverse proxy con TLS.** Sea cual sea (nginx, Apache, Caddy, Traefik…), solo
tiene que cumplir 3 cosas para que Django funcione bien tras él:

1. Reenviar **todo** el tráfico de tu dominio a `http://127.0.0.1:${NGINX_HOST_PORT}`.
2. Mandar la cabecera **`X-Forwarded-Proto: https`** (si no, Django entra en bucle de
   redirección por `SECURE_SSL_REDIRECT`).
3. Mandar la cabecera **`Host`** con tu dominio (debe estar en `ALLOWED_HOSTS` y
   `CSRF_TRUSTED_ORIGINS` de `backend/.env`).

### Ejemplo nginx

```nginx
server {
    listen 443 ssl;
    server_name tu-dominio.com;
    ssl_certificate     /ruta/fullchain.pem;
    ssl_certificate_key /ruta/privkey.pem;
    client_max_body_size 25M;

    location / {
        proxy_pass         http://127.0.0.1:8110;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### Ejemplo Apache

Activa los módulos: `a2enmod proxy proxy_http headers ssl`.

```apache
<VirtualHost *:443>
    ServerName tu-dominio.com
    SSLEngine on
    SSLCertificateFile      /ruta/fullchain.pem
    SSLCertificateKeyFile   /ruta/privkey.pem

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPass        / http://127.0.0.1:8110/
    ProxyPassReverse / http://127.0.0.1:8110/
</VirtualHost>
```

> `ProxyPreserveHost On` reenvía el `Host`; `RequestHeader set X-Forwarded-Proto "https"`
> es imprescindible. Con Caddy/Traefik, ambas cabeceras se mandan por defecto.

## Actualizar (flujo normal)

```bash
cd /opt/mailerup
git pull
docker compose up -d --build
```

Esto reconstruye backend y frontend, aplica migraciones automáticamente y deja la
base de datos intacta. Sin pasos manuales.

## Operaciones útiles

```bash
docker compose ps                 # estado
docker compose logs -f web        # logs del backend
docker compose exec web python manage.py createsuperuser
docker compose exec db pg_dump -U mailerup mailerup > backup.sql   # backup BD
docker compose down               # parar (los datos siguen en el volumen pgdata)
```
