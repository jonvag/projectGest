# projectGest

Gestor de clientes, servicios contratados y cobros recurrentes para un desarrollador freelance: seguimiento de suscripciones, historial de pagos y visibilidad de los recordatorios de cobro enviados por WhatsApp vía n8n.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, animaciones con `motion`
- **Prisma 6** + **PostgreSQL** (esquema propio `projectgest`, aislado de otras apps que compartan la misma base)
- Autenticación propia: sesiones en base de datos (no JWT), `bcryptjs` para hashing
- Sin test runner: verificación manual con `tsc`/`eslint`/`curl`/Playwright (ver `CLAUDE.md`)

## Usuarios de prueba

Mismas credenciales en local (`prisma/seed.ts`) y en producción (`scripts/seed-prod-minimal.ts`):

| Rol | Email | Password |
|---|---|---|
| SUPERUSER | `jon.apiscope.empresa@gmail.com` | `wqrxOCAco1pP` |
| EMPRESA | `empresa@demo.com` | `DemoEmpresa123!` |
| CLIENTE | `ana@torresdiseno.com` | `ZQWANFNiewM4` |

## Requisitos

- Node **20.20.2** (la versión con la que se desarrolla localmente)
- PostgreSQL accesible (local o remoto)
- npm

## Correr en local

1. Clonar e instalar dependencias:

   ```bash
   npm install
   ```

2. Crear `.env` en la raíz con:

   ```bash
   DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?schema=projectgest"
   N8N_WEBHOOK_SECRET="un-string-aleatorio-largo"
   ```

   `N8N_WEBHOOK_SECRET` protege el endpoint `POST /api/notificaciones/webhook` que usa n8n para reportar envíos de WhatsApp — generalo con `openssl rand -hex 32`.

3. Aplicar migraciones y sembrar datos de ejemplo:

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

   Esto crea una empresa demo, 6 clientes y 8 suscripciones de ejemplo, más el usuario `SUPERUSER` (credenciales en la sección "Usuarios de prueba" más abajo).

4. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La app queda en `http://localhost:3000`. `/login` es el punto de entrada; sin sesión, `/dashboard/*` redirige ahí.

5. Antes de dar algo por terminado, correr:

   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

## Correr en producción

Se despliega en **Dokploy** a partir de este mismo repo (`Dockerfile` + `docker-compose.yml`, `next.config.ts` tiene `output: "standalone"`). El `.env` **no se commitea ni se sube a mano al servidor** — se carga en la sección de Environment del servicio en Dokploy, que genera el `.env` que `docker-compose.yml` lee vía `env_file: .env` en el momento del build/deploy.

1. Variables de entorno: cargar en Dokploy las mismas claves de la sección de abajo (`DATABASE_URL` apuntando a la base de producción, `N8N_WEBHOOK_SECRET`).

2. Aplicar migraciones contra la base de producción **antes** de que Dokploy levante el contenedor nuevo (el contenedor no las corre solo):

   ```bash
   DATABASE_URL="<url de producción>" npx prisma migrate deploy
   ```

3. Deploy: lo dispara Dokploy (build + levantamiento del compose). Para probar el mismo flujo en un servidor propio sin Dokploy, el equivalente manual es:

   ```bash
   docker compose up --build -d
   ```

   Expone el puerto `4008` (`PORT`/`EXPOSE` en `Dockerfile` y `docker-compose.yml`).

### Migrar cuando la base de datos no es alcanzable directamente

Si `DATABASE_URL` de producción no es alcanzable desde tu máquina (firewall, red interna, etc.) pero sí tenés acceso SSH al servidor donde vive, el paso 2 de arriba (`prisma migrate deploy`) se hace así:

1. **Crear primero el directorio destino en el servidor** — `scp -r` no lo crea solo, y sin este paso falla con `stat remote: No such file or directory` / `Permission denied`:

   ```bash
   ssh usuario@servidor "mkdir -p ~/projectgest-migrate"
   ```

   Usá el **home del usuario** (`~/projectgest-migrate`), no `/tmp`. En servidores con el subsistema SFTP endurecido, `scp`/SFTP puede correr en un chroot distinto al de la sesión SSH normal — `mkdir -p /tmp/...` por `ssh` puede "funcionar" (crea el directorio en el filesystem real) pero `scp` seguir sin verlo porque su vista de `/tmp` es otra. El home del usuario evita ese problema.

2. Copiar al servidor solo lo necesario para migrar (no hace falta el repo entero: `prisma/`, `scripts/`, y los `package.json`/`package-lock.json` para poder instalar `prisma`/`tsx`):

   ```bash
   scp -r prisma scripts package.json package-lock.json usuario@servidor:~/projectgest-migrate/
   ```

3. Conectarse por SSH y, si el servidor no tiene Node instalado (o tiene una versión vieja vía `apt`), usar un contenedor Node efímero — la mayoría de estos servidores ya tienen Docker corriendo:

   ```bash
   ssh usuario@servidor
   cd ~/projectgest-migrate

   docker run --rm -v "$(pwd)":/app -w /app node:20-alpine sh -c "
     npm install &&
     DATABASE_URL='<url de producción, con ?schema=projectgest>' npx prisma migrate deploy &&
     DATABASE_URL='<url de producción, con ?schema=projectgest>' npx tsx scripts/seed-prod-minimal.ts
   "
   ```

   La `DATABASE_URL` necesita el `?schema=projectgest` al final — sin eso Prisma apunta al schema `public` en vez del que realmente usa la app, y `migrate deploy` aplicaría (o registraría como aplicado) el historial en el lugar equivocado.

   `scripts/seed-prod-minimal.ts` es un seed mínimo separado del `prisma/seed.ts` de desarrollo (que trae 6 clientes de ejemplo) — crea solo lo esencial para probar producción: el `SUPERUSER`, una empresa, un cliente asociado a esa empresa con su acceso de login, y una suscripción de prueba. Es idempotente (usa `upsert`), se puede volver a correr sin duplicar nada — salvo el paso de vincular el login del cliente demo, que puede fallar con `Unique constraint failed on the fields: (email)` si ya existe un `User` con ese email de un intento anterior sin que `Cliente.userId` quedara linkeado. Ese fallo está dentro de una transacción, así que no corrompe nada: se revierte solo y el resto del seed (superuser, empresa, cliente, suscripción) ya quedó aplicado.

4. Limpiar el temporal:

   ```bash
   rm -rf ~/projectgest-migrate
   ```

**Notas sobre el estado actual de estos archivos** (heredadas del scaffold inicial, revisar antes del primer deploy real):
- El `Dockerfile` usa `node:22-alpine`, mientras que el desarrollo local es con Node 20.20.2 — no rompe nada (cada stage instala su propio Node), pero vale la pena alinear versiones en algún momento.
- El servicio en `docker-compose.yml` se llama `torre302` (nombre de otro proyecto/plantilla) — funciona igual, pero si se le va a dar mantenimiento en serio conviene renombrarlo a algo relacionado con `projectGest`.
- Si Postgres no corre como servicio administrado por Dokploy en la misma red, revisar que `DATABASE_URL` use el host correcto desde adentro del contenedor (no `localhost`, salvo que Postgres esté en el mismo contenedor/red).
- El contenedor de la app (`Dockerfile`) tampoco corre `prisma migrate deploy` — el paso 2 de arriba siempre hay que hacerlo a mano antes de cada deploy que sume migraciones nuevas. Si en algún momento se agrega como paso automático del build, actualizar esta nota.

**Cambios de schema recientes (2026-09-18)** — aplicados a producción, cualquier otro entorno (local, staging) necesita correr `prisma migrate deploy`/`migrate dev` para tenerlos:
- `agregar_indices_fk`: índices en las foreign keys (`Cliente.usuarioId`, `Suscripcion.clienteId`, `ReportePago.clienteId/suscripcionId`, `Notificacion.clienteId/suscripcionId`, `Pago.clienteId`) — Postgres/Prisma no los crea solo, y sin ellos los filtros por cliente escanean la tabla entera a medida que crece.
- `comprobante_opcional`: `ReportePago.comprobante` y `comprobanteTipo` pasaron a nullable — el reporte de pago público (`/reportar/[token]`) ya no exige la foto, solo pide al menos uno entre foto y referencia.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. Incluye `?schema=projectgest` para no pisar otras apps que compartan la misma base. |
| `N8N_WEBHOOK_SECRET` | Secreto compartido que valida `POST /api/notificaciones/webhook` (header `x-n8n-secret`). Configurar el mismo valor del lado del workflow de n8n. |
| `JWT_SECRET` | Firma los access tokens de la app mobile (`POST /api/auth/mobile/login`). Generar con `openssl rand -hex 32`. **Necesaria en Dokploy antes de que la app mobile funcione en producción** — sin ella, el login mobile tira 500. |

## Autenticación para la app mobile

La web usa cookie de sesión (httpOnly), pero una app mobile no tiene cookie jar de navegador — usa tokens:

- `POST /api/auth/mobile/login` — `{ email, password }` → `{ accessToken, refreshToken, usuario }`. El `accessToken` es un JWT de 30 minutos; el `refreshToken` es el mismo id de `Session` que usa el login web (dura 7 días).
- `POST /api/auth/mobile/refresh` — `{ refreshToken }` → nuevo `accessToken`. 401 si el refresh token venció (ahí la app tiene que volver a mostrar el login).
- `POST /api/auth/mobile/logout` — `{ refreshToken }` → borra la `Session`.
- Todas las rutas ya existentes (`/api/clientes`, `/api/suscripciones`, `/api/reportes-pago`, etc.) aceptan el access token vía `Authorization: Bearer <token>` en vez de la cookie — no hubo que tocarlas, `requireSesion()` en `lib/auth.ts` revisa el header antes que la cookie.

## Diagrama de flujo

```mermaid
flowchart TD
    subgraph Browser["Navegador"]
        UI["Dashboard (App Router)\nclientes, suscripciones, pagos, notificaciones"]
        Login["/login"]
    end

    subgraph Server["Next.js (Node runtime)"]
        Proxy["proxy.ts\nchequeo rápido de cookie de sesión"]
        LayoutSrv["dashboard/layout.tsx\nrequireSesion() autoritativo"]
        API["API Routes\n/api/clientes, /api/suscripciones,\n/api/pagos, /api/empresas, /api/notificaciones"]
        Auth["lib/auth.ts\nrequireSesion / filtroClientePorSesion"]
    end

    DB[("PostgreSQL\nschema projectgest")]

    subgraph Externo["Externo"]
        N8N["n8n (cron diario)\nrevisa vencimientos y manda WhatsApp"]
    end

    Login -->|"POST /api/auth/login"| API
    API -->|"crea Session"| DB
    UI -->|"cookie de sesión"| Proxy
    Proxy -->|"sin cookie -> redirect /login"| Login
    Proxy -->|"con cookie"| LayoutSrv
    LayoutSrv -->|"sesión inválida -> redirect /login"| Login
    LayoutSrv --> UI
    UI -->|"fetch"| API
    API --> Auth
    Auth -->|"filtra por rol\n(SUPERUSER/EMPRESA/CLIENTE)"| DB
    API --> DB

    N8N -->|"POST /api/notificaciones/webhook\nheader x-n8n-secret"| API
    API -->|"resuelve clienteId desde\nsuscripcionId (nunca del body)"| DB
    UI -->|"GET /api/notificaciones"| API
```
