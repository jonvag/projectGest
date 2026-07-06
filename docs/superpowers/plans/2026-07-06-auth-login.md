# Login + Sesión + Protección de Rutas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real email/password authentication with DB-backed sessions, protect `/dashboard/**` and every existing API route, per `docs/superpowers/specs/2026-07-06-auth-login-design.md`.

**Architecture:** Two new Prisma models (`User`, `Session`) alongside the existing `Cliente`/`Suscripcion`/`Pago`. A `lib/auth-constants.ts` file holds just the cookie name (zero dependencies, safe to import from Edge middleware); `lib/auth.ts` holds the actual password-hashing and DB-backed session logic (Node-only, imports Prisma) and is only ever imported from Server Components and Route Handlers, never from `middleware.ts` or client components. The middleware does a cheap cookie-presence check for fast redirects; the dashboard layout (now a Server Component) does the authoritative DB-backed check.

**Tech Stack:** `bcryptjs` (password hashing, pure JS), Prisma (already set up), Next.js middleware + Server Components.

## Global Constraints

- No automated tests — verification is `npm run build`, `npm run lint`, manual/browser QA, and direct `curl`/`psql` checks.
- **No git commits.** Leave the working tree as-is.
- **Never touch the `public` schema** — same rule as every previous DB task in this project.
- **Task 1's migration step requires an explicit go-ahead from the user before executing**, same as the previous DB migration — it writes to the real, shared Postgres instance (still isolated to `projectgest`, but still real infrastructure).
- **`middleware.ts` must never import `@/lib/auth.ts` or anything that pulls in `@prisma/client`.** Next.js middleware runs on the Edge runtime by default, which cannot bundle Prisma's Node-only client. The cookie name lives in `lib/auth-constants.ts`, a zero-dependency file, specifically so middleware can import just that.
- Never log or return the plaintext password anywhere (not in responses, not in console output) — only `passwordHash` is ever persisted or handled after the initial hash.
- Login failures return a single generic message ("Email o contraseña incorrectos.") regardless of whether the email exists or the password is wrong — never reveal which one failed.
- Every existing API route handler (in `app/api/clientes*`, `app/api/suscripciones*`, `app/api/pagos`) must call `requireSesion()` and return `401` if it's `null`, as the very first thing the handler does, before any other logic.
- Copy is in Spanish. Visual style follows `.agents/skills/minimalist-ui/SKILL.md`, reusing existing CSS variables.

---

### Task 1: Prisma schema (User, Session) + migration — REQUIRES USER GO-AHEAD ON STEP 2

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json` (add `bcryptjs`)

**Interfaces:**
- Produces: `User` and `Session` Prisma models, `Rol` enum (`SUPERUSER`, `EMPRESA`, `CLIENTE`), generated into `@prisma/client`. Consumed by every later task.

- [ ] **Step 1: Install `bcryptjs` and add the schema models**

```bash
npm install bcryptjs
```

Add to `prisma/schema.prisma` (after the existing `Pago` model):
```prisma
enum Rol {
  SUPERUSER
  EMPRESA
  CLIENTE
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  rol          Rol
  creadoEn     DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id       String   @id @default(uuid())
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiraEn DateTime
  creadoEn DateTime @default(now())
}
```

**STOP: before running Step 2, confirm with the user that it's OK to proceed** — this writes to the same live Postgres instance another project uses (isolated to `projectgest`, but still real infrastructure).

- [ ] **Step 2: Run the migration**

```bash
npx prisma migrate dev --name auth
```
Expected: Prisma reports the new `User` and `Session` tables created in the `projectgest` schema, migration applied, client regenerated.

- [ ] **Step 3: Verify isolation**

```bash
docker exec talento_activo_db psql -U postgres -d talento_activo -c "\dt projectgest.*"
docker exec talento_activo_db psql -U postgres -d talento_activo -c "\dt public.*"
```
Expected: `projectgest` now has 6 tables (`Cliente`, `Suscripcion`, `Pago`, `User`, `Session`, `_prisma_migrations`); `public` still has exactly its original 9 tables, untouched.

- [ ] **Step 4: Verify the project still builds**

Run: `npm run build`
Expected: succeeds (nothing imports the new models yet).

- [ ] **Step 5: Leave the change as-is (no commit)**

---

### Task 2: `lib/auth-constants.ts` + `lib/auth.ts`

**Files:**
- Create: `lib/auth-constants.ts`
- Create: `lib/auth.ts`

**Interfaces:**
- Produces: `NOMBRE_COOKIE` (from `auth-constants.ts`, edge-safe). From `auth.ts`: `hashPassword`, `verifyPassword`, `crearSesion`, `cerrarSesion`, `requireSesion`, `type SesionActual`. Consumed by Tasks 3 (seed), 4 (login/logout routes), 7 (dashboard layout), 9 (existing API routes). `middleware.ts` (Task 6) imports only from `auth-constants.ts`.

- [ ] **Step 1: Create `lib/auth-constants.ts`**

```ts
export const NOMBRE_COOKIE = "projectgest_session";
```

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Rol } from "@prisma/client";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function crearSesion(userId: string): Promise<{ token: string; expiraEn: Date }> {
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS);
  const session = await prisma.session.create({
    data: { userId, expiraEn },
  });
  return { token: session.id, expiraEn };
}

export async function cerrarSesion(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: token } });
}

export type SesionActual = { id: string; email: string; rol: Rol };

export async function requireSesion(): Promise<SesionActual | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session || session.expiraEn < new Date()) return null;

  return { id: session.user.id, email: session.user.email, rol: session.user.rol };
}
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: succeeds (not imported anywhere yet).

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 3: Seed the initial superuser

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- No exports — extends the existing standalone seed script.

- [ ] **Step 1: Add the import**

Add to the top of `prisma/seed.ts`, alongside the existing `import { PrismaClient } from "@prisma/client";`:
```ts
import bcrypt from "bcryptjs";
```

- [ ] **Step 2: Add the superuser seed inside `main()`**

Add this at the end of the `main()` function, right before its closing `console.log("Seed completo: 6 clientes, 8 suscripciones.");` line (i.e., just before that log statement):
```ts
  const passwordHashSuperuser = await bcrypt.hash("wqrxOCAco1pP", 10);
  await prisma.user.upsert({
    where: { email: "jon.apiscope.empresa@gmail.com" },
    update: {},
    create: {
      email: "jon.apiscope.empresa@gmail.com",
      passwordHash: passwordHashSuperuser,
      rol: "SUPERUSER",
    },
  });
  console.log("Superuser sembrado: jon.apiscope.empresa@gmail.com");
```

(Using `upsert` here specifically — unlike the clientes/suscripciones seed data — so re-running the seed script doesn't crash trying to recreate the same superuser email.)

- [ ] **Step 3: Run the seed**

```bash
npx prisma db seed
```
Expected: prints "Superuser sembrado: jon.apiscope.empresa@gmail.com" in addition to the existing seed output.

- [ ] **Step 4: Verify in the database**

```bash
docker exec talento_activo_db psql -U postgres -d talento_activo -c 'SELECT email, rol FROM projectgest."User";'
```
Expected: one row, `jon.apiscope.empresa@gmail.com | SUPERUSER`.

- [ ] **Step 5: Leave the change as-is (no commit)**

---

### Task 4: Login and logout API routes

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`

**Interfaces:**
- Produces: `POST /api/auth/login` (body `{ email, password }`) → `{ ok: true, rol }` (200, sets cookie) or `{ error }` (400/401). `POST /api/auth/logout` → `{ ok: true }` (200, clears cookie).
- Consumes: `crearSesion`, `verifyPassword`, `cerrarSesion` (`lib/auth.ts`, Task 2), `NOMBRE_COOKIE` (`lib/auth-constants.ts`, Task 2), `prisma` (`lib/prisma.ts`).

- [ ] **Step 1: Create `app/api/auth/login/route.ts`**

```ts
import { NextResponse } from "next/server";
import { crearSesion, verifyPassword } from "@/lib/auth";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const datos = await request.json();

  if (!datos.email || !datos.password) {
    return NextResponse.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: datos.email } });
  if (!user) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const passwordValida = await verifyPassword(datos.password, user.passwordHash);
  if (!passwordValida) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const { token, expiraEn } = await crearSesion(user.id);

  const response = NextResponse.json({ ok: true, rol: user.rol });
  response.cookies.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiraEn,
    path: "/",
  });
  return response;
}
```

- [ ] **Step 2: Create `app/api/auth/logout/route.ts`**

```ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/auth";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  if (token) {
    await cerrarSesion(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(NOMBRE_COOKIE);
  return response;
}
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 5: Login page

**Files:**
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/login` (Task 4).

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setEnviando(false);
    if (!response.ok) {
      const cuerpo = await response.json().catch(() => ({ error: "No se pudo iniciar sesión." }));
      setError(cuerpo.error ?? "No se pudo iniciar sesión.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-xl font-medium text-[var(--color-text)]">projectGest</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Inicia sesión para continuar.</p>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-[var(--color-text)] px-4 py-2 text-sm text-[var(--color-bg)] disabled:opacity-50"
        >
          {enviando ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: succeeds, route table includes `/login`.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 6: Middleware (cheap cookie-presence check)

**Files:**
- Create: `middleware.ts` (project root, sibling to `app/`)

**Interfaces:**
- Consumes: `NOMBRE_COOKIE` from `lib/auth-constants.ts` (Task 2) — **not** from `lib/auth.ts`.

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";

export function middleware(request: NextRequest) {
  const tieneSesion = request.cookies.has(NOMBRE_COOKIE);
  if (!tieneSesion) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 7: Server-side session check on the dashboard layout + logout button

**Files:**
- Modify: `app/dashboard/layout.tsx` (replace entirely — becomes a Server Component)
- Modify: `components/dashboard/sidebar.tsx` (replace entirely — adds logout button, and fixes the `available` flags for Clientes/Suscripciones, which have been real pages for a while but were never flipped from the original placeholder state)

**Interfaces:**
- Consumes: `requireSesion` (`lib/auth.ts`, Task 2), `redirect` (`next/navigation`).

- [ ] **Step 1: Replace `app/dashboard/layout.tsx` entirely**

```tsx
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { requireSesion } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await requireSesion();
  if (!sesion) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Replace `components/dashboard/sidebar.tsx` entirely**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", available: true },
  { href: "/dashboard/clientes", label: "Clientes", available: true },
  { href: "/dashboard/suscripciones", label: "Suscripciones", available: true },
  { href: "/dashboard/notificaciones", label: "Notificaciones", available: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="flex h-full w-36 flex-shrink-0 flex-col gap-1 border-r border-[var(--color-border)] px-3 py-6 sm:w-56 sm:px-4">
      <span className="mb-6 px-2 text-sm font-medium tracking-tight text-[var(--color-text)]">
        projectGest
      </span>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const baseClasses = "rounded-md px-3 py-2 text-sm transition-colors";
        const activeClasses = "bg-[var(--color-text)] text-[var(--color-bg)]";
        const inactiveClasses = item.available
          ? "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={cerrarSesion}
        className="mt-auto rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)]"
      >
        Cerrar sesión
      </button>
    </nav>
  );
}
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 8: Wire the landing's login button to `/login`

**Files:**
- Modify: `components/login-button.tsx`

**Interfaces:**
- No signature change.

- [ ] **Step 1: Change the navigation target**

Change:
```tsx
      onClick={() => router.push("/dashboard")}
```
to:
```tsx
      onClick={() => router.push("/login")}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 9: Require a session on every existing API route

**Files:**
- Modify: `app/api/clientes/route.ts` (replace entirely)
- Modify: `app/api/clientes/[id]/route.ts` (replace entirely)
- Modify: `app/api/suscripciones/route.ts` (replace entirely)
- Modify: `app/api/suscripciones/[id]/route.ts` (replace entirely)
- Modify: `app/api/pagos/route.ts` (replace entirely)

**Interfaces:**
- Each handler gains a `requireSesion()` check as its first statement, returning `401` if `null`. No other behavior changes — every existing check (validation, Prisma error handling) stays exactly as it was.

- [ ] **Step 1: Replace `app/api/clientes/route.ts` entirely**

```ts
import { NextResponse } from "next/server";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const clientes = await prisma.cliente.findMany({ orderBy: { creadoEn: "asc" } });
  return NextResponse.json(clientes);
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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

- [ ] **Step 2: Replace `app/api/clientes/[id]/route.ts` entirely**

```ts
import { NextResponse } from "next/server";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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

- [ ] **Step 3: Replace `app/api/suscripciones/route.ts` entirely**

```ts
import { NextResponse } from "next/server";
import { parseFechaDb, serializeSuscripcion } from "@/lib/api-serializers";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const suscripciones = await prisma.suscripcion.findMany({ orderBy: { creadoEn: "asc" } });
  return NextResponse.json(suscripciones.map(serializeSuscripcion));
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
        proximoCobro: parseFechaDb(datos.proximoCobro),
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

- [ ] **Step 4: Replace `app/api/suscripciones/[id]/route.ts` entirely**

```ts
import { NextResponse } from "next/server";
import { parseFechaDb, serializeSuscripcion } from "@/lib/api-serializers";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
      proximoCobro: parseFechaDb(datos.proximoCobro),
    },
  });
  return NextResponse.json(serializeSuscripcion(suscripcion));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  await prisma.suscripcion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Replace `app/api/pagos/route.ts` entirely**

```ts
import { NextResponse } from "next/server";
import { parseFechaDb, serializePago } from "@/lib/api-serializers";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const pagos = await prisma.pago.findMany({ orderBy: { creadoEn: "asc" } });
  return NextResponse.json(pagos.map(serializePago));
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
      fechaPago: parseFechaDb(datos.fechaPago),
      fechaCobroAnterior: parseFechaDb(datos.fechaCobroAnterior),
      fechaProximoCobroNueva: parseFechaDb(datos.fechaProximoCobroNueva),
    },
  });
  return NextResponse.json(serializePago(pago), { status: 201 });
}
```

- [ ] **Step 6: Verify it builds and lints clean**

Run: `npm run build`
Expected: build succeeds with NO errors anywhere.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Leave the change as-is (no commit)**

---

### Task 10: Manual QA

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk through the spec's verification checklist in a real browser**

- Visit `/dashboard` directly (no session) → redirected to `/login`.
- Log in with a wrong password → generic error shown, stays on `/login`.
- Log in with the superuser credentials → redirected to `/dashboard`, everything (Dashboard, Clientes, Suscripciones, client detail, marcar-pagado) works exactly as before.
- Click "Cerrar sesión" in the sidebar → redirected to `/login`; visiting `/dashboard` again afterward redirects back to `/login` (session actually deleted, not just a client-side redirect).
- From the landing page (`/`), click "Iniciar sesión" → goes to `/login` (not straight to `/dashboard`).

- [ ] **Step 3: Verify API routes reject unauthenticated requests**

```bash
curl -i http://localhost:3000/api/clientes
```
Expected: `401` with `{"error":"No autenticado."}` — no session cookie sent.

- [ ] **Step 4: Verify a valid session cookie allows the same call**

Log in via the browser, open dev tools → Application → Cookies, copy the `projectgest_session` value, then:
```bash
curl -i http://localhost:3000/api/clientes -H "Cookie: projectgest_session=<paste-the-value>"
```
Expected: `200` with the client list.

- [ ] **Step 5: Stop the dev server**

```bash
pkill -f "next dev"
```

- [ ] **Step 6: Leave the change as-is (no commit)**
