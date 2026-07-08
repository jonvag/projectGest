# projectGest

Gestor de clientes, servicios contratados y cobros recurrentes para un desarrollador freelance: seguimiento de suscripciones, historial de pagos y visibilidad de los recordatorios de cobro enviados por WhatsApp vía n8n.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, animaciones con `motion`
- **Prisma 6** + **PostgreSQL** (esquema propio `projectgest`, aislado de otras apps que compartan la misma base)
- Autenticación propia: sesiones en base de datos (no JWT), `bcryptjs` para hashing
- Sin test runner: verificación manual con `tsc`/`eslint`/`curl`/Playwright (ver `CLAUDE.md`)

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

   Esto crea una empresa demo (`empresa@demo.com` / `DemoEmpresa123!`), 6 clientes y 8 suscripciones de ejemplo, más el usuario `SUPERUSER` (la contraseña está definida en `prisma/seed.ts`, no se repite acá).

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

   Expone el puerto `4006` (`PORT`/`EXPOSE` en `Dockerfile` y `docker-compose.yml`).

**Notas sobre el estado actual de estos archivos** (heredadas del scaffold inicial, revisar antes del primer deploy real):
- El `Dockerfile` usa `node:22-alpine`, mientras que el desarrollo local es con Node 20.20.2 — no rompe nada (cada stage instala su propio Node), pero vale la pena alinear versiones en algún momento.
- El servicio en `docker-compose.yml` se llama `torre302` (nombre de otro proyecto/plantilla) — funciona igual, pero si se le va a dar mantenimiento en serio conviene renombrarlo a algo relacionado con `projectGest`.
- Si Postgres no corre como servicio administrado por Dokploy en la misma red, revisar que `DATABASE_URL` use el host correcto desde adentro del contenedor (no `localhost`, salvo que Postgres esté en el mismo contenedor/red).

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. Incluye `?schema=projectgest` para no pisar otras apps que compartan la misma base. |
| `N8N_WEBHOOK_SECRET` | Secreto compartido que valida `POST /api/notificaciones/webhook` (header `x-n8n-secret`). Configurar el mismo valor del lado del workflow de n8n. |

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
