# Migración a PostgreSQL (Prisma) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `localStorage` persistence for Clientes/Suscripciones/Pagos with PostgreSQL via Prisma, isolated in its own `projectgest` schema inside the shared `talento_activo` database, per `docs/superpowers/specs/2026-07-05-migracion-db-design.md`.

**Architecture:** Prisma models mirror the existing TypeScript types. Next.js Route Handlers (`app/api/.../route.ts`) wrap Prisma calls, translating between DB `DateTime` columns and the app's `"YYYY-MM-DD"` string convention at the boundary. The three `use*` hooks (`useClientes`, `useSuscripciones`, `usePagos`) keep their field/function names but switch from synchronous `localStorage` reads/writes to `fetch` calls against those routes, becoming `async`. Every caller of a mutation function picks up `await`.

**Tech Stack:** Prisma 6.19.3 (pinned — Prisma 7 requires Node ≥22; this project runs Node 20.20.2), `@prisma/client` 6.19.3, `tsx` (for running the TS seed script), PostgreSQL (existing Docker container `talento_activo_db`).

## Global Constraints

- No automated tests — verification is `npm run build`, `npm run lint`, manual/browser QA, and direct `psql` inspection of the database.
- **No git commits.** Leave the working tree as-is.
- **Never touch the `public` schema or any table in it** — that belongs to another project sharing this database. Every Prisma operation in this plan is scoped to the `projectgest` schema via `?schema=projectgest` in `DATABASE_URL`.
- **Task 2 (running `prisma migrate dev` against the real database) requires an explicit go-ahead from the user before executing**, even though the overall plan is approved — it's the one step that writes to shared, real infrastructure. Every other task only touches files or runs `npm run build`/`lint`.
- Dates cross the API boundary as `"YYYY-MM-DD"` strings, both directions: routes serialize `Date` → string on responses, and parse `"YYYY-MM-DD"` → local-time `Date` (`new Date(`${iso}T00:00:00`)`, never bare `new Date(iso)`) on requests — consistent with how the rest of this codebase avoids UTC-shift bugs.
- Prisma error codes are handled explicitly and turned into clean 4xx JSON responses, never left to surface as raw 500s: `P2002` (unique constraint — email) and `P2003` (foreign key constraint — deleting a client with subscriptions).
- Hook mutation functions become `async` / return `Promise`s. Every caller (page components, modals) must add `await` — this is a mechanical consequence of real network I/O, not a redesign; no visual or UX change beyond showing a loading state while fetching.
- No commits to the codebase, but `prisma/schema.prisma`, `prisma/seed.ts`, `.env`, and every other created/modified file must be left as normal working-tree changes.

---

### Task 1: Install Prisma, configure `.env`, write the schema

**Files:**
- Create: `.env`
- Create: `prisma/schema.prisma`
- Modify: `package.json` (dependencies + seed config)

**Interfaces:**
- Produces: the `Cliente`, `Suscripcion`, `Pago` Prisma models and `CicloCobro` enum, generated into `@prisma/client`. Consumed by every later task.

- [ ] **Step 1: Install dependencies**

```bash
npm install @prisma/client@6.19.3
npm install -D prisma@6.19.3 tsx@4.23.0
```
Expected: both commands exit 0; `package.json` lists `@prisma/client` under `dependencies` and `prisma`/`tsx` under `devDependencies`.

- [ ] **Step 2: Create `.env`**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/talento_activo?schema=projectgest"
```

- [ ] **Step 3: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum CicloCobro {
  mensual
  trimestral
  anual
}

model Cliente {
  id            String        @id @default(uuid())
  nombre        String
  empresa       String
  contactId     String
  email         String        @unique
  creadoEn      DateTime      @default(now())
  suscripciones Suscripcion[]
}

model Suscripcion {
  id           String     @id @default(uuid())
  clienteId    String
  cliente      Cliente    @relation(fields: [clienteId], references: [id], onDelete: Restrict)
  servicio     String
  monto        Float
  ciclo        CicloCobro
  proximoCobro DateTime   @db.Date
  creadoEn     DateTime   @default(now())
}

model Pago {
  id                     String   @id @default(uuid())
  suscripcionId          String
  clienteId              String
  servicio               String
  monto                  Float
  fechaPago              DateTime @db.Date
  fechaCobroAnterior     DateTime @db.Date
  fechaProximoCobroNueva DateTime @db.Date
  creadoEn               DateTime @default(now())
}
```

- [ ] **Step 4: Add the seed command config to `package.json`**

Add this top-level key to `package.json` (sibling to `"scripts"`, `"dependencies"`, etc.):
```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
```

- [ ] **Step 5: Verify the client generates**

Run: `npx prisma generate`
Expected: exits 0, prints that the Prisma Client was generated into `node_modules/@prisma/client`.

- [ ] **Step 6: Verify the project still builds**

Run: `npm run build`
Expected: succeeds (nothing imports `@prisma/client` yet, so this just confirms nothing broke).

- [ ] **Step 7: Leave the change as-is (no commit)**

---

### Task 2: Run the migration against the real database — REQUIRES USER GO-AHEAD

**Files:**
- Creates (via the Prisma CLI, not hand-written): `prisma/migrations/<timestamp>_init/migration.sql`, and inside the database, the `projectgest` schema with its tables.

**Interfaces:**
- Produces: the actual `projectgest.Cliente`, `projectgest.Suscripcion`, `projectgest.Pago` tables in the running Postgres instance. Required before any API route (Tasks 6-8) can be tested against a real database.

**STOP: before running Step 1, confirm with the user that it's OK to proceed** — this writes to the same live Postgres instance another project uses (isolated to a brand-new `projectgest` schema, but it's still the one irreversible-ish, real-infrastructure step in this plan.

- [ ] **Step 1: Run the migration**

```bash
npx prisma migrate dev --name init
```
Expected: Prisma reports it created the `projectgest` schema and the three tables, migration applied successfully, and regenerates the client.

- [ ] **Step 2: Verify isolation — `projectgest` has the new tables**

```bash
docker exec talento_activo_db psql -U postgres -d talento_activo -c "\dt projectgest.*"
```
Expected: lists `Cliente`, `Suscripcion`, `Pago`, `_prisma_migrations`, all in the `projectgest` schema.

- [ ] **Step 3: Verify isolation — `public` is untouched**

```bash
docker exec talento_activo_db psql -U postgres -d talento_activo -c "\dt public.*"
```
Expected: still exactly the original 9 tables (`Account`, `Session`, `User`, `Video`, `VideoAccess`, `VideoResource`, `VideoView`, `VerificationToken`, `_prisma_migrations`) — no new tables, no removed tables.

- [ ] **Step 4: Leave the change as-is (no commit — this step's effect lives in the database, not in a file to revert anyway; `prisma/migrations/` is a new tracked directory in the working tree)**

---

### Task 3: Prisma client singleton

**Files:**
- Create: `lib/prisma.ts`

**Interfaces:**
- Produces: `export const prisma: PrismaClient`. Consumed by every API route (Tasks 6-8).

- [ ] **Step 1: Create the file**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 4: Seed script

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- No exports consumed by app code — this is a standalone script run via `npx prisma db seed`.

- [ ] **Step 1: Create the file**

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isoDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const ana = await prisma.cliente.create({
    data: {
      nombre: "Ana Torres",
      empresa: "Torres Diseño",
      contactId: "+54 11 5555-0101",
      email: "ana@torresdiseno.com",
    },
  });
  const bruno = await prisma.cliente.create({
    data: {
      nombre: "Bruno Cabrera",
      empresa: "Cabrera Software",
      contactId: "+54 11 5555-0102",
      email: "bruno@cabrerasoftware.com",
    },
  });
  const carla = await prisma.cliente.create({
    data: {
      nombre: "Carla Núñez",
      empresa: "Núñez Studio",
      contactId: "+54 11 5555-0103",
      email: "carla@nunezstudio.com",
    },
  });
  const diego = await prisma.cliente.create({
    data: {
      nombre: "Diego Fernández",
      empresa: "Fernández Web",
      contactId: "+54 11 5555-0104",
      email: "diego@fernandezweb.com",
    },
  });
  const elena = await prisma.cliente.create({
    data: {
      nombre: "Elena Ríos",
      empresa: "Ríos Consulting",
      contactId: "+54 11 5555-0105",
      email: "elena@riosconsulting.com",
    },
  });
  const franco = await prisma.cliente.create({
    data: {
      nombre: "Franco Ibáñez",
      empresa: "Ibáñez Corp",
      contactId: "+54 11 5555-0106",
      email: "franco@ibanezcorp.com",
    },
  });

  await prisma.suscripcion.createMany({
    data: [
      {
        clienteId: ana.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(-10),
      },
      {
        clienteId: bruno.id,
        servicio: "Mantenimiento mensual",
        monto: 150,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(-3),
      },
      {
        clienteId: bruno.id,
        servicio: "Hosting",
        monto: 80,
        ciclo: "anual",
        proximoCobro: isoDateOffset(25),
      },
      {
        clienteId: carla.id,
        servicio: "App móvil",
        monto: 500,
        ciclo: "anual",
        proximoCobro: isoDateOffset(2),
      },
      {
        clienteId: diego.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(5),
      },
      {
        clienteId: diego.id,
        servicio: "SEO",
        monto: 20,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(5),
      },
      {
        clienteId: elena.id,
        servicio: "Mantenimiento mensual",
        monto: 90,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(20),
      },
      {
        clienteId: franco.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(40),
      },
    ],
  });

  console.log("Seed completo: 6 clientes, 8 suscripciones.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run the seed**

```bash
npx prisma db seed
```
Expected: prints "Seed completo: 6 clientes, 8 suscripciones." with exit code 0.

- [ ] **Step 3: Verify in the database**

```bash
docker exec talento_activo_db psql -U postgres -d talento_activo -c 'SELECT count(*) FROM projectgest."Cliente";'
docker exec talento_activo_db psql -U postgres -d talento_activo -c 'SELECT count(*) FROM projectgest."Suscripcion";'
```
Expected: 6 and 8 respectively.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 5: Clean up `lib/mock-data.ts`

**Files:**
- Modify: `lib/mock-data.ts`

**Interfaces:**
- Removes: the `clientes` and `suscripciones` mock seed array exports, and the now-unused private `isoDateOffset` helper (data moved into `prisma/seed.ts` in Task 4).
- Keeps unchanged: `Cliente`, `Suscripcion` types, `toISODate` (exported), `parseISODate` (private), `getIngresosEsperadosDelMes`, `getCobrosVencidos`, `getProximosCobrosDeLaSemana`.

**Why:** once the database is the source of truth, these arrays are dead code — nothing will import them after Tasks 9-11 rewrite the hooks.

- [ ] **Step 1: Replace the file entirely**

```ts
export type Cliente = {
  id: string;
  nombre: string;
  empresa: string;
  contactId: string;
  email: string;
};

export type Suscripcion = {
  id: string;
  clienteId: string;
  servicio: string;
  monto: number;
  ciclo: "mensual" | "trimestral" | "anual";
  proximoCobro: string; // ISO date (YYYY-MM-DD)
};

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function getIngresosEsperadosDelMes(
  suscripcionesList: Suscripcion[],
  hoy: Date = new Date(),
): number {
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();
  return suscripcionesList
    .filter((s) => {
      const { year, month } = parseISODate(s.proximoCobro);
      return year === anioActual && month === mesActual;
    })
    .reduce((total, s) => total + s.monto, 0);
}

export function getCobrosVencidos(
  suscripcionesList: Suscripcion[],
  hoy: Date = new Date(),
): Suscripcion[] {
  const hoyISO = toISODate(hoy);
  return suscripcionesList.filter((s) => s.proximoCobro < hoyISO);
}

export function getProximosCobrosDeLaSemana(
  suscripcionesList: Suscripcion[],
  hoy: Date = new Date(),
): Suscripcion[] {
  const hoyISO = toISODate(hoy);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 7);
  const limiteISO = toISODate(limite);
  return suscripcionesList.filter((s) => s.proximoCobro >= hoyISO && s.proximoCobro <= limiteISO);
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: FAILS at this point — every file still importing `clientes`/`suscripciones` from `lib/mock-data.ts` (the old hooks, not yet rewritten) will error. Confirm the errors are only in `lib/clientes-store.ts` and `lib/suscripciones-store.ts` (fixed in Tasks 9-10). If errors appear anywhere else, stop and report them.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 6: API routes for Clientes

**Files:**
- Create: `app/api/clientes/route.ts`
- Create: `app/api/clientes/[id]/route.ts`

**Interfaces:**
- Produces: `GET /api/clientes` → `Cliente[]`; `POST /api/clientes` (body: `NuevoCliente`) → `Cliente` (201) or `{ error }` (400/409); `PUT /api/clientes/:id` (body: `NuevoCliente`) → `Cliente` or `{ error }` (400/409); `DELETE /api/clientes/:id` → `{ ok: true }` or `{ error, suscripcionesAsociadas }` (409).
- Consumes: `prisma` (`lib/prisma.ts`, Task 3).

- [ ] **Step 1: Create `app/api/clientes/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clientes = await prisma.cliente.findMany({ orderBy: { creadoEn: "asc" } });
  return NextResponse.json(clientes);
}

export async function POST(request: Request) {
  const datos = await request.json();

  if (!datos.nombre || !datos.empresa || !datos.contactId || !datos.email) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        nombre: datos.nombre,
        empresa: datos.empresa,
        contactId: datos.contactId,
        email: datos.email,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese email." }, { status: 409 });
    }
    throw error;
  }
}
```

- [ ] **Step 2: Create `app/api/clientes/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await request.json();

  if (!datos.nombre || !datos.empresa || !datos.contactId || !datos.email) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        empresa: datos.empresa,
        contactId: datos.contactId,
        email: datos.email,
      },
    });
    return NextResponse.json(cliente);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese email." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.cliente.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      const suscripcionesAsociadas = await prisma.suscripcion.count({ where: { clienteId: id } });
      return NextResponse.json(
        { error: "No se puede borrar: tiene suscripciones asociadas.", suscripcionesAsociadas },
        { status: 409 },
      );
    }
    throw error;
  }
}
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: same pre-existing failures from Task 5 (only in `lib/clientes-store.ts`/`lib/suscripciones-store.ts`), no new errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 7: Shared serializers + API routes for Suscripciones

**Files:**
- Create: `lib/api-serializers.ts`
- Create: `app/api/suscripciones/route.ts`
- Create: `app/api/suscripciones/[id]/route.ts`

**Interfaces:**
- Produces: `serializeSuscripcion(s): Suscripcion`, `serializePago(p): Pago` (both convert Prisma `Date` fields to `"YYYY-MM-DD"` strings). Consumed here and by Task 8.
- Produces routes: `GET /api/suscripciones` → `Suscripcion[]`; `POST /api/suscripciones` (body: `NuevaSuscripcion`) → `Suscripcion` (201) or `{ error }` (400); `PUT /api/suscripciones/:id` → `Suscripcion` or `{ error }` (400); `DELETE /api/suscripciones/:id` → `{ ok: true }`.
- Consumes: `prisma` (Task 3), `toISODate` (`lib/mock-data.ts`, Task 5).

- [ ] **Step 1: Create `lib/api-serializers.ts`**

```ts
import { toISODate } from "@/lib/mock-data";

export function serializeSuscripcion(s: {
  id: string;
  clienteId: string;
  servicio: string;
  monto: number;
  ciclo: string;
  proximoCobro: Date;
}) {
  return {
    id: s.id,
    clienteId: s.clienteId,
    servicio: s.servicio,
    monto: s.monto,
    ciclo: s.ciclo,
    proximoCobro: toISODate(s.proximoCobro),
  };
}

export function serializePago(p: {
  id: string;
  suscripcionId: string;
  clienteId: string;
  servicio: string;
  monto: number;
  fechaPago: Date;
  fechaCobroAnterior: Date;
  fechaProximoCobroNueva: Date;
}) {
  return {
    id: p.id,
    suscripcionId: p.suscripcionId,
    clienteId: p.clienteId,
    servicio: p.servicio,
    monto: p.monto,
    fechaPago: toISODate(p.fechaPago),
    fechaCobroAnterior: toISODate(p.fechaCobroAnterior),
    fechaProximoCobroNueva: toISODate(p.fechaProximoCobroNueva),
  };
}
```

- [ ] **Step 2: Create `app/api/suscripciones/route.ts`**

```ts
import { NextResponse } from "next/server";
import { serializeSuscripcion } from "@/lib/api-serializers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const suscripciones = await prisma.suscripcion.findMany({ orderBy: { creadoEn: "asc" } });
  return NextResponse.json(suscripciones.map(serializeSuscripcion));
}

export async function POST(request: Request) {
  const datos = await request.json();

  if (
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    datos.monto <= 0 ||
    !datos.ciclo ||
    !datos.proximoCobro
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  try {
    const suscripcion = await prisma.suscripcion.create({
      data: {
        clienteId: datos.clienteId,
        servicio: datos.servicio,
        monto: datos.monto,
        ciclo: datos.ciclo,
        proximoCobro: new Date(`${datos.proximoCobro}T00:00:00`),
      },
    });
    return NextResponse.json(serializeSuscripcion(suscripcion), { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
    }
    throw error;
  }
}
```

- [ ] **Step 3: Create `app/api/suscripciones/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { serializeSuscripcion } from "@/lib/api-serializers";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await request.json();

  if (
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    datos.monto <= 0 ||
    !datos.ciclo ||
    !datos.proximoCobro
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const suscripcion = await prisma.suscripcion.update({
    where: { id },
    data: {
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      ciclo: datos.ciclo,
      proximoCobro: new Date(`${datos.proximoCobro}T00:00:00`),
    },
  });
  return NextResponse.json(serializeSuscripcion(suscripcion));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.suscripcion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: same pre-existing failures from Task 5, no new errors.

- [ ] **Step 5: Leave the change as-is (no commit)**

---

### Task 8: API routes for Pagos

**Files:**
- Create: `app/api/pagos/route.ts`

**Interfaces:**
- Produces: `GET /api/pagos` → `Pago[]`; `POST /api/pagos` (body: `NuevoPago`) → `Pago` (201) or `{ error }` (400).
- Consumes: `serializePago` (`lib/api-serializers.ts`, Task 7), `prisma` (Task 3).

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from "next/server";
import { serializePago } from "@/lib/api-serializers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const pagos = await prisma.pago.findMany({ orderBy: { creadoEn: "asc" } });
  return NextResponse.json(pagos.map(serializePago));
}

export async function POST(request: Request) {
  const datos = await request.json();

  if (
    !datos.suscripcionId ||
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    !datos.fechaPago ||
    !datos.fechaCobroAnterior ||
    !datos.fechaProximoCobroNueva
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const pago = await prisma.pago.create({
    data: {
      suscripcionId: datos.suscripcionId,
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      fechaPago: new Date(`${datos.fechaPago}T00:00:00`),
      fechaCobroAnterior: new Date(`${datos.fechaCobroAnterior}T00:00:00`),
      fechaProximoCobroNueva: new Date(`${datos.fechaProximoCobroNueva}T00:00:00`),
    },
  });
  return NextResponse.json(serializePago(pago), { status: 201 });
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: same pre-existing failures from Task 5, no new errors.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 9: Rewrite `lib/clientes-store.ts` (fetch-based)

**Files:**
- Modify: `lib/clientes-store.ts` (replace entirely)

**Interfaces:**
- Changes: `useClientes()` now returns `{ clientes, cargando, addCliente, updateCliente, deleteCliente, isEmailTaken }` — adds `cargando: boolean`. `addCliente`/`updateCliente` now return `Promise<{ ok: true } | { ok: false; error: string }>` (previously synchronous `Cliente` / `void`). `deleteCliente` keeps its `{ ok: true } | { ok: false; suscripcionesAsociadas: number }` shape but is now `async`. Consumed by Task 12.

- [ ] **Step 1: Replace the file entirely**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cliente } from "@/lib/mock-data";

export type NuevoCliente = Omit<Cliente, "id">;

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((datos: Cliente[]) => setClientes(datos))
      .finally(() => setCargando(false));
  }, []);

  const isEmailTaken = useCallback(
    (email: string, excludingId?: string): boolean => {
      const normalizado = email.trim().toLowerCase();
      return clientes.some(
        (c) => c.id !== excludingId && c.email.trim().toLowerCase() === normalizado,
      );
    },
    [clientes],
  );

  const addCliente = useCallback(async (nuevo: NuevoCliente): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo guardar el cliente.") };
    }
    const cliente: Cliente = await response.json();
    setClientes((prev) => [...prev, cliente]);
    return { ok: true };
  }, []);

  const updateCliente = useCallback(
    async (id: string, cambios: NuevoCliente): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo guardar el cliente.") };
      }
      const cliente: Cliente = await response.json();
      setClientes((prev) => prev.map((c) => (c.id === id ? cliente : c)));
      return { ok: true };
    },
    [],
  );

  const deleteCliente = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; suscripcionesAsociadas: number }> => {
      const response = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const cuerpo = await response.json().catch(() => ({ suscripcionesAsociadas: 0 }));
        return { ok: false, suscripcionesAsociadas: cuerpo.suscripcionesAsociadas ?? 0 };
      }
      setClientes((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    },
    [],
  );

  return { clientes, cargando, addCliente, updateCliente, deleteCliente, isEmailTaken };
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: `lib/clientes-store.ts`'s own errors are gone; remaining errors (if any) are only in files not yet updated (`lib/suscripciones-store.ts`, and the page/modal files fixed in Tasks 10-14).

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 10: Rewrite `lib/suscripciones-store.ts` (fetch-based, keep `calcularProximaFecha`)

**Files:**
- Modify: `lib/suscripciones-store.ts` (replace entirely)

**Interfaces:**
- `calcularProximaFecha` unchanged (pure function, no persistence).
- `useSuscripciones()` now returns `{ suscripciones, cargando, addSuscripcion, updateSuscripcion, deleteSuscripcion }`. `addSuscripcion`/`updateSuscripcion` return `Promise<{ ok: true } | { ok: false; error: string }>`. `deleteSuscripcion` returns `Promise<void>`. Consumed by Task 13.

- [ ] **Step 1: Replace the file entirely**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Suscripcion } from "@/lib/mock-data";

export type NuevaSuscripcion = Omit<Suscripcion, "id">;

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function calcularProximaFecha(fechaActual: string, ciclo: Suscripcion["ciclo"]): string {
  const [year, month, day] = fechaActual.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  if (ciclo === "mensual") {
    fecha.setMonth(fecha.getMonth() + 1);
  } else if (ciclo === "trimestral") {
    fecha.setMonth(fecha.getMonth() + 3);
  } else {
    fecha.setFullYear(fecha.getFullYear() + 1);
  }
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useSuscripciones() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/suscripciones")
      .then((res) => res.json())
      .then((datos: Suscripcion[]) => setSuscripciones(datos))
      .finally(() => setCargando(false));
  }, []);

  const addSuscripcion = useCallback(async (nueva: NuevaSuscripcion): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/suscripciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo guardar la suscripción.") };
    }
    const suscripcion: Suscripcion = await response.json();
    setSuscripciones((prev) => [...prev, suscripcion]);
    return { ok: true };
  }, []);

  const updateSuscripcion = useCallback(
    async (id: string, cambios: NuevaSuscripcion): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/suscripciones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo guardar la suscripción.") };
      }
      const suscripcion: Suscripcion = await response.json();
      setSuscripciones((prev) => prev.map((s) => (s.id === id ? suscripcion : s)));
      return { ok: true };
    },
    [],
  );

  const deleteSuscripcion = useCallback(async (id: string): Promise<void> => {
    await fetch(`/api/suscripciones/${id}`, { method: "DELETE" });
    setSuscripciones((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { suscripciones, cargando, addSuscripcion, updateSuscripcion, deleteSuscripcion };
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: `lib/suscripciones-store.ts`'s own errors are gone; remaining errors only in page/modal files fixed in Tasks 11-14.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 11: Rewrite `lib/pagos-store.ts` (fetch-based)

**Files:**
- Modify: `lib/pagos-store.ts` (replace entirely)

**Interfaces:**
- `Pago`, `NuevoPago` types unchanged. `usePagos()` now returns `{ pagos, cargando, addPago }`. `addPago` is `async`, returns `Promise<Pago>`. Consumed by Task 13 (confirm-payment flow) and Task 14 (detail page).

- [ ] **Step 1: Replace the file entirely**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

export type Pago = {
  id: string;
  suscripcionId: string;
  clienteId: string;
  servicio: string;
  monto: number;
  fechaPago: string;
  fechaCobroAnterior: string;
  fechaProximoCobroNueva: string;
};

export type NuevoPago = Omit<Pago, "id">;

export function usePagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/pagos")
      .then((res) => res.json())
      .then((datos: Pago[]) => setPagos(datos))
      .finally(() => setCargando(false));
  }, []);

  const addPago = useCallback(async (nuevo: NuevoPago): Promise<Pago> => {
    const response = await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    const pago: Pago = await response.json();
    setPagos((prev) => [...prev, pago]);
    return pago;
  }, []);

  return { pagos, cargando, addPago };
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: same remaining pre-existing failures (page/modal files, fixed next).

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 12: Async wiring for Clientes (page + modal)

**Files:**
- Modify: `components/dashboard/cliente-form-modal.tsx` (replace entirely)
- Modify: `app/dashboard/clientes/page.tsx` (replace entirely)

**Interfaces:**
- `ClienteFormModal`'s `onSave` prop type changes from `(datos: NuevoCliente) => string | null` to `(datos: NuevoCliente) => Promise<string | null>`.
- Consumes: `useClientes` (Task 9), `useSuscripciones` (Task 10).

- [ ] **Step 1: Replace `components/dashboard/cliente-form-modal.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import type { Cliente } from "@/lib/mock-data";
import type { NuevoCliente } from "@/lib/clientes-store";

type ClienteFormModalProps = {
  open: boolean;
  clienteAEditar: Cliente | null;
  onClose: () => void;
  onSave: (datos: NuevoCliente) => Promise<string | null>;
};

const FORM_VACIO: NuevoCliente = { nombre: "", empresa: "", contactId: "", email: "" };

function datosIniciales(clienteAEditar: Cliente | null): NuevoCliente {
  return clienteAEditar
    ? {
        nombre: clienteAEditar.nombre,
        empresa: clienteAEditar.empresa,
        contactId: clienteAEditar.contactId,
        email: clienteAEditar.email,
      }
    : FORM_VACIO;
}

// El padre le pasa una `key` que cambia cada vez que el modal se abre
// (ver app/dashboard/clientes/page.tsx), así React remonta el componente
// en vez de sincronizar el formulario con un efecto.
export function ClienteFormModal({ open, clienteAEditar, onClose, onSave }: ClienteFormModalProps) {
  const [form, setForm] = useState<NuevoCliente>(() => datosIniciales(clienteAEditar));
  const [errores, setErrores] = useState<Partial<Record<keyof NuevoCliente, string>>>({});
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  function validar(): Partial<Record<keyof NuevoCliente, string>> {
    const nuevosErrores: Partial<Record<keyof NuevoCliente, string>> = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = "El nombre es obligatorio.";
    if (!form.empresa.trim()) nuevosErrores.empresa = "La empresa es obligatoria.";
    if (!form.contactId.trim()) nuevosErrores.contactId = "El teléfono de contacto es obligatorio.";
    if (!form.email.trim()) {
      nuevosErrores.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nuevosErrores.email = "El email no tiene un formato válido.";
    }
    return nuevosErrores;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    setGuardando(true);
    const errorDeGuardado = await onSave(form);
    setGuardando(false);
    if (errorDeGuardado) {
      setErrores({ email: errorDeGuardado });
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text)]">
          {clienteAEditar ? "Editar cliente" : "Nuevo cliente"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.nombre && <p className="text-sm text-[var(--color-danger-text)]">{errores.nombre}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa">
              Empresa
            </label>
            <input
              id="empresa"
              type="text"
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.empresa && <p className="text-sm text-[var(--color-danger-text)]">{errores.empresa}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="contactId">
              Teléfono de contacto (notificaciones)
            </label>
            <input
              id="contactId"
              type="text"
              value={form.contactId}
              onChange={(e) => setForm({ ...form, contactId: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.contactId && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.contactId}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.email && <p className="text-sm text-[var(--color-danger-text)]">{errores.email}</p>}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)] disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/dashboard/clientes/page.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import { ClienteFormModal } from "@/components/dashboard/cliente-form-modal";
import { ClientesTable } from "@/components/dashboard/clientes-table";
import { useClientes, type NuevoCliente } from "@/lib/clientes-store";
import type { Cliente } from "@/lib/mock-data";
import { useSuscripciones } from "@/lib/suscripciones-store";

export default function ClientesPage() {
  const { clientes, cargando: cargandoClientes, addCliente, updateCliente, deleteCliente, isEmailTaken } =
    useClientes();
  const { suscripciones, cargando: cargandoSuscripciones } = useSuscripciones();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<string | null>(null);

  function abrirNuevo() {
    setClienteAEditar(null);
    setModalAbierto(true);
  }

  function abrirEditar(cliente: Cliente) {
    setClienteAEditar(cliente);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setClienteAEditar(null);
  }

  async function guardar(datos: NuevoCliente): Promise<string | null> {
    if (isEmailTaken(datos.email, clienteAEditar?.id)) {
      return "Ya existe un cliente con ese email.";
    }
    const resultado = clienteAEditar
      ? await updateCliente(clienteAEditar.id, datos)
      : await addCliente(datos);
    return resultado.ok ? null : resultado.error;
  }

  async function borrar(cliente: Cliente) {
    setAvisoBorrado(null);
    const asociadas = suscripciones.filter((s) => s.clienteId === cliente.id).length;
    if (asociadas > 0) {
      setAvisoBorrado(
        `${cliente.nombre} tiene ${asociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
      return;
    }
    if (!window.confirm(`¿Borrar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }
    const resultado = await deleteCliente(cliente.id);
    if (!resultado.ok) {
      setAvisoBorrado(
        `${cliente.nombre} tiene ${resultado.suscripcionesAsociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
    }
  }

  if (cargandoClientes || cargandoSuscripciones) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-[var(--color-text)]">Clientes</h1>
        <button
          type="button"
          onClick={abrirNuevo}
          className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
        >
          Nuevo cliente
        </button>
      </div>

      {avisoBorrado && (
        <p className="rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-2 text-sm text-[var(--color-danger-text)]">
          {avisoBorrado}
        </p>
      )}

      <ClientesTable
        clientes={clientes}
        suscripciones={suscripciones}
        onEditar={abrirEditar}
        onBorrar={borrar}
      />

      <ClienteFormModal
        key={`${modalAbierto}-${clienteAEditar?.id ?? "nuevo"}`}
        open={modalAbierto}
        clienteAEditar={clienteAEditar}
        onClose={cerrarModal}
        onSave={guardar}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: remaining pre-existing failures only in `app/dashboard/suscripciones/page.tsx` and its modals (Task 13), and `app/dashboard/page.tsx` / `app/dashboard/clientes/[id]/page.tsx` (Task 14).

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 13: Async wiring for Suscripciones (page + both modals)

**Files:**
- Modify: `components/dashboard/suscripcion-form-modal.tsx` (replace entirely)
- Modify: `components/dashboard/confirmar-pago-modal.tsx` (replace entirely)
- Modify: `app/dashboard/suscripciones/page.tsx` (replace entirely)

**Interfaces:**
- `SuscripcionFormModal`'s `onSave` prop type changes to `(datos: NuevaSuscripcion) => Promise<string | null>`.
- `ConfirmarPagoModal`'s `onConfirmar` prop type changes to `(fechaProximoCobro: string) => Promise<string | null>`.
- Consumes: `useClientes` (Task 9), `useSuscripciones` (Task 10), `usePagos` (Task 11).

- [ ] **Step 1: Replace `components/dashboard/suscripcion-form-modal.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";
import type { NuevaSuscripcion } from "@/lib/suscripciones-store";

type SuscripcionFormModalProps = {
  open: boolean;
  suscripcionAEditar: Suscripcion | null;
  clientes: Cliente[];
  onClose: () => void;
  onSave: (datos: NuevaSuscripcion) => Promise<string | null>;
};

const FORM_VACIO: NuevaSuscripcion = {
  clienteId: "",
  servicio: "",
  monto: 0,
  ciclo: "mensual",
  proximoCobro: "",
};

function datosIniciales(suscripcionAEditar: Suscripcion | null): NuevaSuscripcion {
  return suscripcionAEditar
    ? {
        clienteId: suscripcionAEditar.clienteId,
        servicio: suscripcionAEditar.servicio,
        monto: suscripcionAEditar.monto,
        ciclo: suscripcionAEditar.ciclo,
        proximoCobro: suscripcionAEditar.proximoCobro,
      }
    : FORM_VACIO;
}

// El padre le pasa una `key` que cambia cada vez que el modal se abre
// (ver app/dashboard/suscripciones/page.tsx), así React remonta el
// componente en vez de sincronizar el formulario con un efecto.
export function SuscripcionFormModal({
  open,
  suscripcionAEditar,
  clientes,
  onClose,
  onSave,
}: SuscripcionFormModalProps) {
  const [form, setForm] = useState<NuevaSuscripcion>(() => datosIniciales(suscripcionAEditar));
  const [errores, setErrores] = useState<Partial<Record<keyof NuevaSuscripcion, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  function validar(): Partial<Record<keyof NuevaSuscripcion, string>> {
    const nuevosErrores: Partial<Record<keyof NuevaSuscripcion, string>> = {};
    if (!form.clienteId) nuevosErrores.clienteId = "Seleccioná un cliente.";
    if (!form.servicio.trim()) nuevosErrores.servicio = "El servicio es obligatorio.";
    if (!form.monto || form.monto <= 0) nuevosErrores.monto = "El monto debe ser mayor a 0.";
    if (!form.proximoCobro) nuevosErrores.proximoCobro = "La fecha de próximo cobro es obligatoria.";
    return nuevosErrores;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    setGuardando(true);
    const error = await onSave(form);
    setGuardando(false);
    if (error) {
      setErrorGeneral(error);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text)]">
          {suscripcionAEditar ? "Editar suscripción" : "Nueva suscripción"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="clienteId">
              Cliente
            </label>
            <select
              id="clienteId"
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="">Seleccionar...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — {c.empresa}
                </option>
              ))}
            </select>
            {errores.clienteId && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.clienteId}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="servicio">
              Servicio
            </label>
            <input
              id="servicio"
              type="text"
              value={form.servicio}
              onChange={(e) => setForm({ ...form, servicio: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.servicio && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.servicio}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="monto">
              Monto
            </label>
            <input
              id="monto"
              type="number"
              min="0"
              step="0.01"
              value={form.monto === 0 ? "" : form.monto}
              onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.monto && <p className="text-sm text-[var(--color-danger-text)]">{errores.monto}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="ciclo">
              Ciclo
            </label>
            <select
              id="ciclo"
              value={form.ciclo}
              onChange={(e) =>
                setForm({ ...form, ciclo: e.target.value as NuevaSuscripcion["ciclo"] })
              }
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="proximoCobro">
              Próximo cobro
            </label>
            <input
              id="proximoCobro"
              type="date"
              value={form.proximoCobro}
              onChange={(e) => setForm({ ...form, proximoCobro: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.proximoCobro && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.proximoCobro}</p>
            )}
          </div>

          {errorGeneral && <p className="text-sm text-[var(--color-danger-text)]">{errorGeneral}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)] disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `components/dashboard/confirmar-pago-modal.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";
import { calcularProximaFecha } from "@/lib/suscripciones-store";

type ConfirmarPagoModalProps = {
  open: boolean;
  suscripcion: Suscripcion | null;
  cliente: Cliente | null;
  onClose: () => void;
  onConfirmar: (fechaProximoCobro: string) => Promise<string | null>;
};

// El padre le pasa una `key` que cambia cada vez que el modal se abre
// (ver app/dashboard/suscripciones/page.tsx), así React remonta el
// componente en vez de sincronizar la fecha sugerida con un efecto.
export function ConfirmarPagoModal({
  open,
  suscripcion,
  cliente,
  onClose,
  onConfirmar,
}: ConfirmarPagoModalProps) {
  const [fecha, setFecha] = useState<string>(() =>
    suscripcion ? calcularProximaFecha(suscripcion.proximoCobro, suscripcion.ciclo) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!open || !suscripcion) return null;

  async function handleConfirmar() {
    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    setGuardando(true);
    const errorDelServidor = await onConfirmar(fecha);
    setGuardando(false);
    if (errorDelServidor) {
      setError(errorDelServidor);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-medium text-[var(--color-text)]">
          Confirmar pago de {suscripcion.servicio}
        </h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          {cliente?.nombre ?? "Cliente desconocido"}
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="fechaProximoCobro">
            Próximo cobro sugerido
          </label>
          <input
            id="fechaProximoCobro"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
          {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={guardando}
            className="rounded-md px-4 py-1.5 text-sm disabled:opacity-50"
            style={{ backgroundColor: "var(--color-success-text)", color: "var(--color-bg)" }}
          >
            {guardando ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/dashboard/suscripciones/page.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import { ConfirmarPagoModal } from "@/components/dashboard/confirmar-pago-modal";
import { SuscripcionFormModal } from "@/components/dashboard/suscripcion-form-modal";
import { SuscripcionesTable } from "@/components/dashboard/suscripciones-table";
import { useClientes } from "@/lib/clientes-store";
import { toISODate, type Suscripcion } from "@/lib/mock-data";
import { usePagos } from "@/lib/pagos-store";
import { useSuscripciones, type NuevaSuscripcion } from "@/lib/suscripciones-store";

export default function SuscripcionesPage() {
  const { clientes, cargando: cargandoClientes } = useClientes();
  const {
    suscripciones,
    cargando: cargandoSuscripciones,
    addSuscripcion,
    updateSuscripcion,
    deleteSuscripcion,
  } = useSuscripciones();
  const { addPago } = usePagos();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [suscripcionAEditar, setSuscripcionAEditar] = useState<Suscripcion | null>(null);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [suscripcionAPagar, setSuscripcionAPagar] = useState<Suscripcion | null>(null);

  function abrirNueva() {
    setSuscripcionAEditar(null);
    setModalAbierto(true);
  }

  function abrirEditar(suscripcion: Suscripcion) {
    setSuscripcionAEditar(suscripcion);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setSuscripcionAEditar(null);
  }

  function abrirConfirmarPago(suscripcion: Suscripcion) {
    setSuscripcionAPagar(suscripcion);
    setModalPagoAbierto(true);
  }

  function cerrarConfirmarPago() {
    setModalPagoAbierto(false);
    setSuscripcionAPagar(null);
  }

  async function guardar(datos: NuevaSuscripcion): Promise<string | null> {
    const resultado = suscripcionAEditar
      ? await updateSuscripcion(suscripcionAEditar.id, datos)
      : await addSuscripcion(datos);
    return resultado.ok ? null : resultado.error;
  }

  async function borrar(suscripcion: Suscripcion) {
    const nombreCliente =
      clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "este cliente";
    if (
      !window.confirm(
        `¿Borrar la suscripción "${suscripcion.servicio}" de ${nombreCliente}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    await deleteSuscripcion(suscripcion.id);
  }

  async function confirmarPago(fechaProximoCobro: string): Promise<string | null> {
    if (!suscripcionAPagar) return null;
    const resultado = await updateSuscripcion(suscripcionAPagar.id, {
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      ciclo: suscripcionAPagar.ciclo,
      proximoCobro: fechaProximoCobro,
    });
    if (!resultado.ok) {
      return resultado.error;
    }
    await addPago({
      suscripcionId: suscripcionAPagar.id,
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      fechaPago: toISODate(new Date()),
      fechaCobroAnterior: suscripcionAPagar.proximoCobro,
      fechaProximoCobroNueva: fechaProximoCobro,
    });
    cerrarConfirmarPago();
    return null;
  }

  if (cargandoClientes || cargandoSuscripciones) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-[var(--color-text)]">Suscripciones</h1>
        <button
          type="button"
          onClick={abrirNueva}
          className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
        >
          Nueva suscripción
        </button>
      </div>

      <SuscripcionesTable
        suscripciones={suscripciones}
        clientes={clientes}
        onEditar={abrirEditar}
        onBorrar={borrar}
        onMarcarPagado={abrirConfirmarPago}
      />

      <SuscripcionFormModal
        key={`${modalAbierto}-${suscripcionAEditar?.id ?? "nueva"}`}
        open={modalAbierto}
        suscripcionAEditar={suscripcionAEditar}
        clientes={clientes}
        onClose={cerrarModal}
        onSave={guardar}
      />

      <ConfirmarPagoModal
        key={`${modalPagoAbierto}-${suscripcionAPagar?.id ?? "ninguna"}`}
        open={modalPagoAbierto}
        suscripcion={suscripcionAPagar}
        cliente={clientes.find((c) => c.id === suscripcionAPagar?.clienteId) ?? null}
        onClose={cerrarConfirmarPago}
        onConfirmar={confirmarPago}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: remaining pre-existing failures only in `app/dashboard/page.tsx` / `app/dashboard/clientes/[id]/page.tsx` (Task 14).

- [ ] **Step 5: Leave the change as-is (no commit)**

---

### Task 14: Loading states for Dashboard and client detail page

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/clientes/[id]/page.tsx`

**Interfaces:**
- Consumes: `cargando` from `useClientes` (Task 9) and `useSuscripciones` (Task 10), plus `usePagos` (Task 11) in the detail page.

**Important:** the detail page's existing "cliente no encontrado" check must wait for loading to finish first — otherwise it would flash "Cliente no encontrado" for every client while the fetch is still in flight (since `clientes` starts as `[]` before the fetch resolves).

- [ ] **Step 1: Replace `app/dashboard/page.tsx` entirely**

```tsx
"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { useClientes } from "@/lib/clientes-store";
import {
  getCobrosVencidos,
  getIngresosEsperadosDelMes,
  getProximosCobrosDeLaSemana,
  type Suscripcion,
} from "@/lib/mock-data";
import { useSuscripciones } from "@/lib/suscripciones-store";

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
  const { clientes, cargando: cargandoClientes } = useClientes();
  const { suscripciones, cargando: cargandoSuscripciones } = useSuscripciones();

  function nombreClienteDe(suscripcion: Suscripcion): string {
    return clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "Cliente desconocido";
  }

  if (cargandoClientes || cargandoSuscripciones) {
    return (
      <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  const ingresosDelMes = getIngresosEsperadosDelMes(suscripciones);
  const vencidos = getCobrosVencidos(suscripciones);
  const proximos = getProximosCobrosDeLaSemana(suscripciones);
  const totalVencido = vencidos.reduce((total, s) => total + s.monto, 0);

  return (
    <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Ingresos esperados este mes" value={formatMonto(ingresosDelMes)} />
        <MetricCard label="Cobros vencidos" value={formatMonto(totalVencido)} variant="danger" />
        <MetricCard label="Próximos cobros de la semana" value={String(proximos.length)} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Cobros vencidos</h2>
        {vencidos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No hay cobros vencidos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {vencidos.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">
                  {nombreClienteDe(s)} · {s.servicio}
                </span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(s.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Próximos cobros</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No hay cobros próximos esta semana.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {proximos.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">
                  {nombreClienteDe(s)} · {s.servicio}
                </span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(s.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/dashboard/clientes/[id]/page.tsx` entirely**

```tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PagosTimeline } from "@/components/dashboard/pagos-timeline";
import { useClientes } from "@/lib/clientes-store";
import type { Suscripcion } from "@/lib/mock-data";
import { usePagos } from "@/lib/pagos-store";
import { useSuscripciones } from "@/lib/suscripciones-store";

const ETIQUETA_CICLO: Record<Suscripcion["ciclo"], string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const { clientes, cargando: cargandoClientes } = useClientes();
  const { suscripciones, cargando: cargandoSuscripciones } = useSuscripciones();
  const { pagos, cargando: cargandoPagos } = usePagos();

  if (cargandoClientes || cargandoSuscripciones || cargandoPagos) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  const cliente = clientes.find((c) => c.id === params.id);

  if (!cliente) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8 sm:px-10">
        <p className="text-[var(--color-text)]">Cliente no encontrado.</p>
        <Link href="/dashboard/clientes" className="text-sm text-[var(--color-text)] underline">
          Volver a Clientes
        </Link>
      </div>
    );
  }

  const suscripcionesDelCliente = suscripciones.filter((s) => s.clienteId === cliente.id);
  const pagosDelCliente = pagos.filter((p) => p.clienteId === cliente.id);

  return (
    <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <div>
        <Link href="/dashboard/clientes" className="text-sm text-[var(--color-text-muted)] underline">
          ← Volver a Clientes
        </Link>
        <h1 className="mt-2 text-xl font-medium text-[var(--color-text)]">{cliente.nombre}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{cliente.empresa}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Datos de contacto</h2>
        <p className="text-sm text-[var(--color-text-muted)]">ContactId: {cliente.contactId}</p>
        <p className="text-sm text-[var(--color-text-muted)]">Email: {cliente.email}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Suscripciones</h2>
        {suscripcionesDelCliente.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin suscripciones.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {suscripcionesDelCliente.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">{s.servicio}</span>
                <span className="text-[var(--color-text-muted)]">{ETIQUETA_CICLO[s.ciclo]}</span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(s.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Historial de pagos</h2>
        <PagosTimeline pagos={pagosDelCliente} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify it builds and lints clean**

Run: `npm run build`
Expected: build now succeeds with NO errors anywhere.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 15: Manual QA

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk through the full app in a real browser**

- `/dashboard`: shows "Cargando..." briefly, then the same 3 metrics and lists as before, now sourced from Postgres (values should match the seed data exactly, same as the old mock).
- `/dashboard/clientes`: table loads the 6 seeded clients. Create, edit, delete all work exactly as before (email uniqueness, blocked delete with subscriptions).
- `/dashboard/suscripciones`: table loads the 8 seeded subscriptions. Create, edit, delete, and "marcar como pagado" (with the 3 cycle calculations) all work exactly as before.
- `/dashboard/clientes/[id]`: contact info, subscriptions, and payment timeline all load correctly after confirming a payment.
- **Restart the dev server** (`Ctrl+C`, `npm run dev` again) and reload `/dashboard/clientes` — the data you created/edited is still there (this is the actual proof the migration worked: it survives a server restart, unlike the old `localStorage`-only version).

- [ ] **Step 3: Verify database isolation one more time**

```bash
docker exec talento_activo_db psql -U postgres -d talento_activo -c "\dt public.*"
```
Expected: still exactly the original 9 tables — confirms nothing in this plan touched the other project's data.

- [ ] **Step 4: Stop the dev server**

```bash
pkill -f "next dev"
```

- [ ] **Step 5: Leave the change as-is (no commit)**
