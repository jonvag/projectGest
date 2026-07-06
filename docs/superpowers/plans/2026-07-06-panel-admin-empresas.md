# Panel de administración: empresas y accesos de cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `SUPERUSER` puede crear usuarios `EMPRESA` desde la UI, ver los clientes de cada empresa, crear clientes nuevos para ellas, y dar de alta el acceso de login de un `CLIENTE` a un `Cliente` ya existente.

**Architecture:** Un campo nuevo `User.nombre` (opcional). Tres endpoints nuevos (`GET/POST /api/empresas`, `GET /api/empresas/[id]`, `POST /api/clientes/[id]/acceso`), todos exigiendo `sesion.rol === "SUPERUSER"`. Dos páginas nuevas (`/dashboard/empresas`, `/dashboard/empresas/[id]`) con sus propios componentes de tabla/modal, reutilizando `ClienteFormModal` y `ConfirmModal` ya existentes sin modificarlos — el `usuarioId` de la empresa se inyecta en el hook de datos (`lib/empresas-store.ts`), no en el componente de formulario.

**Tech Stack:** Next.js 16 (App Router, API routes, client components), Prisma 6 + PostgreSQL, bcryptjs. Sin test runner: verificación manual con `curl` (API) y Playwright headless (UI).

## Global Constraints

- Todas las rutas nuevas bajo `/api/empresas*` y `/api/clientes/[id]/acceso` exigen `requireSesion()` (401 si no hay sesión) y `sesion.rol === "SUPERUSER"` (403 en caso contrario) — es superficie exclusiva de administración.
- Nunca devolver `passwordHash` en una respuesta JSON — usar `select` de Prisma para excluirlo explícitamente en toda query de `User`.
- No modificar `components/dashboard/cliente-form-modal.tsx` ni `components/dashboard/confirm-modal.tsx` — se reutilizan tal cual; el `usuarioId` de la empresa se inyecta en `lib/empresas-store.ts`, no en el formulario.
- Trabajamos directo sobre `main` (confirmado con el usuario), sin branch/worktree separado.
- Seguir el patrón ya establecido en el resto del código: hooks `use*` en `lib/*-store.ts` devuelven `{ok:true}|{ok:false,error}`, las páginas adaptan eso a `string|null` para los modales (ver `app/dashboard/clientes/page.tsx`).

---

### Task 1: `User.nombre` — schema y seed

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces: campo `User.nombre: string | null` en el `PrismaClient` generado — usado por Tasks 2-4.

- [ ] **Step 1: Agregar el campo al schema**

En `prisma/schema.prisma`, en el modelo `User`, agregar `nombre` justo después de `email`:

```prisma
model User {
  id               String    @id @default(uuid())
  email            String    @unique
  nombre           String?
  passwordHash     String
  rol              Rol
  creadoEn         DateTime  @default(now())
  sessions         Session[]
  clientes         Cliente[] @relation("EmpresaClientes")
  clienteVinculado Cliente?  @relation("ClienteLogin")
}
```

- [ ] **Step 2: Poblar el nombre de la empresa demo en el seed**

En `prisma/seed.ts`, en la creación de `empresaDemo`, agregar `nombre`:

```ts
  const passwordHashEmpresaDemo = await bcrypt.hash("DemoEmpresa123!", 10);
  const empresaDemo = await prisma.user.create({
    data: {
      email: "empresa@demo.com",
      nombre: "Empresa Demo",
      passwordHash: passwordHashEmpresaDemo,
      rol: "EMPRESA",
    },
  });
```

(el resto del archivo no cambia — el `User` `SUPERUSER` sigue sin `nombre`, queda `null`).

- [ ] **Step 3: Migrar**

Run:
```bash
npx prisma migrate dev --name user_nombre
```
Expected: como `nombre` es opcional (`String?`), Prisma agrega la columna sin pedir un valor por default ni advertir pérdida de datos — no hace falta resetear la base esta vez. Al final, como hay un seed configurado, puede preguntar si querés re-ejecutarlo; si pregunta, confirmá que sí. Verificar que el output no tenga errores y que mencione la nueva migración aplicada.

- [ ] **Step 4: Verificar con Prisma Studio o una consulta**

Run:
```bash
npx prisma studio
```
En el navegador: tabla `User`, columna `nombre` — `empresa@demo.com` tiene `"Empresa Demo"`, `jon.apiscope.empresa@gmail.com` tiene `null`. Cerrar Prisma Studio (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations
git commit -m "feat: agregar User.nombre para mostrar en listas de administración"
```

---

### Task 2: API — empresas y acceso de cliente

**Files:**
- Create: `app/api/empresas/route.ts`
- Create: `app/api/empresas/[id]/route.ts`
- Create: `app/api/clientes/[id]/acceso/route.ts`

**Interfaces:**
- Consumes: `requireSesion`, `hashPassword` (ya existentes en `lib/auth.ts`).
- Produces: `GET /api/empresas` → `{id, email, nombre, creadoEn, _count: {clientes}}[]`. `POST /api/empresas` → `{id, email, nombre, creadoEn}` (sin `_count`, sin `passwordHash`). `GET /api/empresas/[id]` → `{id, email, nombre, creadoEn, clientes: Cliente[]}`. `POST /api/clientes/[id]/acceso` → el `Cliente` actualizado (con `userId` seteado) — usados por Tasks 3-4.

- [ ] **Step 1: `GET`/`POST /api/empresas`**

Crear `app/api/empresas/route.ts`:

```ts
import { NextResponse } from "next/server";
import { hashPassword, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const empresas = await prisma.user.findMany({
    where: { rol: "EMPRESA" },
    select: {
      id: true,
      email: true,
      nombre: true,
      creadoEn: true,
      _count: { select: { clientes: true } },
    },
    orderBy: { creadoEn: "asc" },
  });
  return NextResponse.json(empresas);
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const datos = await request.json();
  if (!datos.email || !datos.password) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(datos.password);
    const empresa = await prisma.user.create({
      data: {
        email: datos.email,
        nombre: datos.nombre || null,
        passwordHash,
        rol: "EMPRESA",
      },
      select: { id: true, email: true, nombre: true, creadoEn: true },
    });
    return NextResponse.json(empresa, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }
    throw error;
  }
}
```

- [ ] **Step 2: `GET /api/empresas/[id]`**

Crear `app/api/empresas/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const empresa = await prisma.user.findFirst({
    where: { id, rol: "EMPRESA" },
    select: {
      id: true,
      email: true,
      nombre: true,
      creadoEn: true,
      clientes: { orderBy: { creadoEn: "asc" } },
    },
  });
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }
  return NextResponse.json(empresa);
}
```

- [ ] **Step 3: `POST /api/clientes/[id]/acceso`**

Crear `app/api/clientes/[id]/acceso/route.ts`:

```ts
import { NextResponse } from "next/server";
import { hashPassword, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const datos = await request.json();
  if (!datos.email || !datos.password) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }
  if (cliente.userId) {
    return NextResponse.json({ error: "Este cliente ya tiene acceso." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(datos.password);
    const clienteActualizado = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: datos.email,
          nombre: cliente.nombre,
          passwordHash,
          rol: "CLIENTE",
        },
      });
      return tx.cliente.update({
        where: { id },
        data: { userId: user.id },
      });
    });
    return NextResponse.json(clienteActualizado, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }
    throw error;
  }
}
```

- [ ] **Step 4: Verificación manual con `curl`**

Con `next dev` corriendo y la base migrada (Task 1):

```bash
curl -c /tmp/empresa.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"empresa@demo.com","password":"DemoEmpresa123!"}'

curl -c /tmp/superuser.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jon.apiscope.empresa@gmail.com","password":"wqrxOCAco1pP"}'
```
Expected: ambos `200` con `{"ok":true,"rol":"EMPRESA"}` / `{"ok":true,"rol":"SUPERUSER"}`.

```bash
curl -b /tmp/empresa.txt http://localhost:3000/api/empresas
```
Expected: `403` con `{"error":"No autorizado."}`.

```bash
curl -b /tmp/superuser.txt http://localhost:3000/api/empresas
```
Expected: `200`, array con al menos un objeto `{"id":"...","email":"empresa@demo.com","nombre":"Empresa Demo","creadoEn":"...","_count":{"clientes":6}}` — **sin** campo `passwordHash`.

```bash
curl -b /tmp/superuser.txt -X POST http://localhost:3000/api/empresas \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Otra Empresa","email":"otra-empresa-test@demo.com","password":"OtraEmpresa123!"}'
```
Expected: `201`, objeto sin `passwordHash`. Repetir el mismo comando → `409` con `{"error":"Ya existe un usuario con ese email."}`.

```bash
EMPRESA_ID=$(curl -b /tmp/superuser.txt http://localhost:3000/api/empresas | python3 -c "import json,sys; print([e for e in json.load(sys.stdin) if e['email']=='empresa@demo.com'][0]['id'])")
curl -b /tmp/superuser.txt http://localhost:3000/api/empresas/$EMPRESA_ID
```
Expected: `200`, incluye `"clientes"` con 6 elementos.

```bash
CLIENTE_ID=$(curl -b /tmp/superuser.txt http://localhost:3000/api/empresas/$EMPRESA_ID | python3 -c "import json,sys; print(json.load(sys.stdin)['clientes'][0]['id'])")
curl -b /tmp/superuser.txt -X POST http://localhost:3000/api/clientes/$CLIENTE_ID/acceso \
  -H "Content-Type: application/json" \
  -d '{"email":"acceso-test@demo.com","password":"AccesoTest123!"}'
```
Expected: `201`, el cliente devuelto tiene `"userId"` no nulo.

```bash
curl -b /tmp/superuser.txt -X POST http://localhost:3000/api/clientes/$CLIENTE_ID/acceso \
  -H "Content-Type: application/json" \
  -d '{"email":"otro-email@demo.com","password":"Otra123!"}'
```
Expected: `400` con `{"error":"Este cliente ya tiene acceso."}`.

```bash
curl -c /tmp/cliente.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"acceso-test@demo.com","password":"AccesoTest123!"}'
```
Expected: `200` con `{"ok":true,"rol":"CLIENTE"}`.

- [ ] **Step 5: Commit**

```bash
git add app/api/empresas app/api/clientes/\[id\]/acceso
git commit -m "feat: API para que SUPERUSER cree empresas y accesos de cliente"
```

---

### Task 3: UI — nav condicional, lista de empresas, alta de empresa

**Files:**
- Modify: `components/dashboard/sidebar.tsx`
- Modify: `app/dashboard/layout.tsx`
- Create: `lib/empresas-store.ts`
- Create: `components/dashboard/empresa-form-modal.tsx`
- Create: `app/dashboard/empresas/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/empresas` (Task 2).
- Produces: `useEmpresas()` hook — `{ empresas: Empresa[], cargando: boolean, addEmpresa: (datos: NuevaEmpresa) => Promise<{ok:true}|{ok:false,error:string}> }`, tipos `Empresa`/`NuevaEmpresa` — usados por Task 4 (el archivo se extiende, no se reemplaza).

- [ ] **Step 1: Sidebar recibe el rol y muestra "Empresas" condicionalmente**

Reemplazar el contenido de `components/dashboard/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Rol } from "@prisma/client";

const NAV_ITEMS_BASE = [
  { href: "/dashboard", label: "Dashboard", available: true },
  { href: "/dashboard/clientes", label: "Clientes", available: true },
  { href: "/dashboard/suscripciones", label: "Suscripciones", available: true },
  { href: "/dashboard/notificaciones", label: "Notificaciones", available: false },
];

export function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    rol === "SUPERUSER"
      ? [...NAV_ITEMS_BASE, { href: "/dashboard/empresas", label: "Empresas", available: true }]
      : NAV_ITEMS_BASE;

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <nav className="flex h-full w-36 flex-shrink-0 flex-col gap-1 border-r border-[var(--color-border)] px-3 py-6 sm:w-56 sm:px-4">
      <span className="mb-6 px-2 text-sm font-medium tracking-tight text-[var(--color-text)]">
        projectGest
      </span>
      {navItems.map((item) => {
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

- [ ] **Step 2: El layout le pasa el rol al sidebar**

En `app/dashboard/layout.tsx`, cambiar `<Sidebar />` por `<Sidebar rol={sesion.rol} />` (el resto del archivo no cambia):

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
      <Sidebar rol={sesion.rol} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Hook de datos `lib/empresas-store.ts`**

Crear `lib/empresas-store.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

export type Empresa = {
  id: string;
  email: string;
  nombre: string | null;
  creadoEn: string;
  _count: { clientes: number };
};

export type NuevaEmpresa = { nombre: string; email: string; password: string };

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/empresas")
      .then((res) => res.json())
      .then((datos: Empresa[]) => setEmpresas(datos))
      .finally(() => setCargando(false));
  }, []);

  const addEmpresa = useCallback(async (nueva: NuevaEmpresa): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo crear la empresa.") };
    }
    const empresa: Empresa = await response.json();
    setEmpresas((prev) => [...prev, { ...empresa, _count: { clientes: 0 } }]);
    return { ok: true };
  }, []);

  return { empresas, cargando, addEmpresa };
}
```

- [ ] **Step 4: Modal de alta de empresa**

Crear `components/dashboard/empresa-form-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { NuevaEmpresa } from "@/lib/empresas-store";

type EmpresaFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (datos: NuevaEmpresa) => Promise<string | null>;
};

const FORM_VACIO: NuevaEmpresa = { nombre: "", email: "", password: "" };

export function EmpresaFormModal({ open, onClose, onSave }: EmpresaFormModalProps) {
  const [form, setForm] = useState<NuevaEmpresa>(FORM_VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof NuevaEmpresa, string>>>({});
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  function validar(): Partial<Record<keyof NuevaEmpresa, string>> {
    const nuevosErrores: Partial<Record<keyof NuevaEmpresa, string>> = {};
    if (!form.email.trim()) {
      nuevosErrores.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nuevosErrores.email = "El email no tiene un formato válido.";
    }
    if (!form.password.trim()) nuevosErrores.password = "La contraseña es obligatoria.";
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
    setForm(FORM_VACIO);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text)]">Nueva empresa</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa-nombre">
              Nombre
            </label>
            <input
              id="empresa-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa-email">
              Email
            </label>
            <input
              id="empresa-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.email && <p className="text-sm text-[var(--color-danger-text)]">{errores.email}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa-password">
              Contraseña inicial
            </label>
            <input
              id="empresa-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.password && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.password}</p>
            )}
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

- [ ] **Step 5: Página de lista de empresas**

Crear `app/dashboard/empresas/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { EmpresaFormModal } from "@/components/dashboard/empresa-form-modal";
import { useEmpresas, type NuevaEmpresa } from "@/lib/empresas-store";

export default function EmpresasPage() {
  const { empresas, cargando, addEmpresa } = useEmpresas();
  const [modalAbierto, setModalAbierto] = useState(false);

  async function guardar(datos: NuevaEmpresa): Promise<string | null> {
    const resultado = await addEmpresa(datos);
    return resultado.ok ? null : resultado.error;
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-[var(--color-text)]">Empresas</h1>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
        >
          Nueva empresa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Nombre</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Clientes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {empresas.map((e) => (
              <tr key={e.id}>
                <td className="py-3 pr-4">
                  <Link href={`/dashboard/empresas/${e.id}`} className="text-[var(--color-text)] underline">
                    {e.nombre ?? e.email}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{e.email}</td>
                <td className="py-3 pr-4 text-[var(--color-text)]">{e._count.clientes}</td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-[var(--color-text-muted)]">
                  No hay empresas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EmpresaFormModal
        key={String(modalAbierto)}
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={guardar}
      />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck y lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: sin errores.

- [ ] **Step 7: Verificación visual con Playwright**

Localizar una instalación de Playwright utilizable:
```bash
find ~/.npm/_npx -maxdepth 3 -iname playwright 2>/dev/null
```
Expected: imprime una ruta terminada en `node_modules/playwright`. Si no imprime nada, instalar una temporal: `cd /tmp && npm install --no-save playwright && npx playwright install chromium`.

Levantar el server:
```bash
cd /Users/jonvag/Documents/Claude/Projects/administradorProyectos
(nohup npm run dev > /tmp/dev-server.log 2>&1 &)
i=0; until curl -sf http://localhost:3000 >/dev/null 2>&1 || [ $i -ge 30 ]; do sleep 1; i=$((i+1)); done
curl -sf http://localhost:3000 >/dev/null 2>&1 && echo SERVER_UP || (echo SERVER_DOWN; cat /tmp/dev-server.log)
```

Crear `/tmp/verify-task3.mjs` (reemplazar `PLAYWRIGHT_PATH` por la ruta encontrada arriba):

```js
import { chromium } from "PLAYWRIGHT_PATH/index.mjs";

const browser = await chromium.launch();
const page = await browser.newPage();

// EMPRESA no debe ver "Empresas" en el sidebar
await page.goto("http://localhost:3000/login");
await page.fill("#email", "empresa@demo.com");
await page.fill("#password", "DemoEmpresa123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");
const empresasLinkParaEmpresa = await page.locator('nav a:has-text("Empresas")').count();
console.log("EMPRESA_VE_EMPRESAS (esperado 0):", empresasLinkParaEmpresa);
await page.click('button:has-text("Cerrar sesión")');
await page.waitForTimeout(300);

// SUPERUSER sí debe verlo, y la lista + alta deben funcionar
await page.goto("http://localhost:3000/login");
await page.fill("#email", "jon.apiscope.empresa@gmail.com");
await page.fill("#password", "wqrxOCAco1pP");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");
const empresasLinkParaSuperuser = await page.locator('nav a:has-text("Empresas")').count();
console.log("SUPERUSER_VE_EMPRESAS (esperado 1):", empresasLinkParaSuperuser);

await page.click('nav a:has-text("Empresas")');
await page.waitForURL("**/dashboard/empresas");
await page.waitForSelector("table");
const filaEmpresaDemo = await page.locator('td:has-text("Empresa Demo")').count();
console.log("FILA_EMPRESA_DEMO (esperado >=1):", filaEmpresaDemo);

await page.click('button:has-text("Nueva empresa")');
await page.fill("#empresa-nombre", "Empresa Playwright Test");
await page.fill("#empresa-email", `pw-test-${Date.now()}@demo.com`);
await page.fill("#empresa-password", "PwTest123!");
await page.click('button:has-text("Guardar")');
await page.waitForTimeout(500);
const filaNueva = await page.locator('td:has-text("Empresa Playwright Test")').count();
console.log("FILA_NUEVA_EMPRESA (esperado 1):", filaNueva);

await page.screenshot({ path: "/tmp/task3-empresas.png" });
await browser.close();
```

Run:
```bash
node /tmp/verify-task3.mjs
```
Expected: `EMPRESA_VE_EMPRESAS (esperado 0): 0`, `SUPERUSER_VE_EMPRESAS (esperado 1): 1`, `FILA_EMPRESA_DEMO (esperado >=1): 1` (o más), `FILA_NUEVA_EMPRESA (esperado 1): 1`.

Parar el server:
```bash
pkill -f "next dev"
```

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/sidebar.tsx app/dashboard/layout.tsx lib/empresas-store.ts components/dashboard/empresa-form-modal.tsx app/dashboard/empresas/page.tsx
git commit -m "feat: nav condicional y pantalla de lista/alta de empresas para SUPERUSER"
```

---

### Task 4: UI — detalle de empresa, clientes, acceso de cliente

**Files:**
- Modify: `lib/empresas-store.ts` (agrega `useEmpresaDetalle` — no reemplaza lo de Task 3)
- Modify: `lib/mock-data.ts` (agrega campos opcionales al tipo `Cliente`)
- Create: `components/dashboard/empresa-clientes-table.tsx`
- Create: `components/dashboard/crear-acceso-modal.tsx`
- Create: `app/dashboard/empresas/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/empresas/[id]`, `POST /api/clientes/[id]/acceso` (Task 2); `ClienteFormModal`, `ConfirmModal` (ya existentes, sin modificar); `NuevoCliente` (de `lib/clientes-store.ts`, ya existente).
- Produces: `useEmpresaDetalle(id: string)` — `{ empresa: EmpresaDetalle | null, cargando: boolean, crearCliente, actualizarCliente, borrarCliente, crearAcceso }`.

- [ ] **Step 1: Agregar campos opcionales al tipo `Cliente`**

En `lib/mock-data.ts`, en el tipo `Cliente`, agregar (sin quitar los campos existentes):

```ts
export type Cliente = {
  id: string;
  nombre: string;
  empresa: string;
  contactId: string;
  email: string;
  usuarioId?: string;
  userId?: string | null;
};
```

Son opcionales a propósito: el resto del código (formularios de alta, `NuevoCliente = Omit<Cliente, "id">`) no los provee y sigue compilando igual; solo esta entrega los necesita para mostrar el estado de acceso.

- [ ] **Step 2: Extender `lib/empresas-store.ts` con el hook de detalle**

Al final de `lib/empresas-store.ts` (después de lo que ya existe de Task 3), agregar el import de tipos y el nuevo hook:

En la parte superior del archivo, agregar:
```ts
import type { Cliente } from "@/lib/mock-data";
import type { NuevoCliente } from "@/lib/clientes-store";
```

Y al final del archivo:
```ts
export type EmpresaDetalle = {
  id: string;
  email: string;
  nombre: string | null;
  creadoEn: string;
  clientes: Cliente[];
};

export function useEmpresaDetalle(id: string) {
  const [empresa, setEmpresa] = useState<EmpresaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    const datos: EmpresaDetalle = await fetch(`/api/empresas/${id}`).then((res) => res.json());
    setEmpresa(datos);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const crearCliente = useCallback(
    async (datos: NuevoCliente): Promise<ResultadoGuardado> => {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, usuarioId: id }),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo crear el cliente.") };
      }
      await recargar();
      return { ok: true };
    },
    [id, recargar],
  );

  const actualizarCliente = useCallback(
    async (clienteId: string, datos: NuevoCliente): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo guardar el cliente.") };
      }
      await recargar();
      return { ok: true };
    },
    [recargar],
  );

  const borrarCliente = useCallback(
    async (clienteId: string): Promise<{ ok: true } | { ok: false; suscripcionesAsociadas: number }> => {
      const response = await fetch(`/api/clientes/${clienteId}`, { method: "DELETE" });
      if (!response.ok) {
        const cuerpo = await response.json().catch(() => ({ suscripcionesAsociadas: 0 }));
        return { ok: false, suscripcionesAsociadas: cuerpo.suscripcionesAsociadas ?? 0 };
      }
      await recargar();
      return { ok: true };
    },
    [recargar],
  );

  const crearAcceso = useCallback(
    async (clienteId: string, datos: { email: string; password: string }): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/clientes/${clienteId}/acceso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo crear el acceso.") };
      }
      await recargar();
      return { ok: true };
    },
    [recargar],
  );

  return { empresa, cargando, crearCliente, actualizarCliente, borrarCliente, crearAcceso };
}
```

(`ResultadoGuardado` y `leerError` ya están definidos en este archivo desde Task 3 — no se redefinen).

- [ ] **Step 3: Tabla de clientes de la empresa**

Crear `components/dashboard/empresa-clientes-table.tsx`:

```tsx
"use client";

import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import type { Cliente } from "@/lib/mock-data";

type EmpresaClientesTableProps = {
  clientes: Cliente[];
  onEditar: (cliente: Cliente) => void;
  onBorrar: (cliente: Cliente) => void;
  onCrearAcceso: (cliente: Cliente) => void;
};

export function EmpresaClientesTable({
  clientes,
  onEditar,
  onBorrar,
  onCrearAcceso,
}: EmpresaClientesTableProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = clientes.filter((c) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return c.nombre.toLowerCase().includes(termino) || c.empresa.toLowerCase().includes(termino);
  });

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre o empresa..."
        className="w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Nombre</th>
              <th className="py-2 pr-4 font-medium">Empresa</th>
              <th className="py-2 pr-4 font-medium">ContactId</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Acceso</th>
              <th className="py-2 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4 text-[var(--color-text)]">{c.nombre}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.empresa}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.contactId}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.email}</td>
                <td className="py-3 pr-4">
                  {c.userId ? (
                    <span className="text-[var(--color-success-text)]">Con acceso</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCrearAcceso(c)}
                      className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text)]"
                    >
                      Crear acceso
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEditar(c)}
                      aria-label={`Editar ${c.nombre}`}
                      title="Editar"
                      className="rounded-md p-1.5 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
                    >
                      <Pencil2Icon />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBorrar(c)}
                      aria-label={`Borrar ${c.nombre}`}
                      title="Borrar"
                      className="rounded-md p-1.5 text-[var(--color-danger-text)] transition-colors hover:bg-[var(--color-danger-bg)]"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--color-text-muted)]">
                  Esta empresa todavía no tiene clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Modal de alta de acceso**

Crear `components/dashboard/crear-acceso-modal.tsx`:

```tsx
"use client";

import { useState } from "react";

type CrearAccesoModalProps = {
  open: boolean;
  nombreCliente: string;
  onClose: () => void;
  onCrear: (datos: { email: string; password: string }) => Promise<string | null>;
};

const FORM_VACIO = { email: "", password: "" };

export function CrearAccesoModal({ open, nombreCliente, onClose, onCrear }: CrearAccesoModalProps) {
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError("Email y contraseña son obligatorios.");
      return;
    }
    setGuardando(true);
    const errorDeGuardado = await onCrear(form);
    setGuardando(false);
    if (errorDeGuardado) {
      setError(errorDeGuardado);
      return;
    }
    setForm(FORM_VACIO);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-medium text-[var(--color-text)]">Crear acceso</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">Para {nombreCliente}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="acceso-email">
              Email
            </label>
            <input
              id="acceso-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="acceso-password">
              Contraseña inicial
            </label>
            <input
              id="acceso-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}
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
              {guardando ? "Creando..." : "Crear acceso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Página de detalle de empresa**

Crear `app/dashboard/empresas/[id]/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ClienteFormModal } from "@/components/dashboard/cliente-form-modal";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { CrearAccesoModal } from "@/components/dashboard/crear-acceso-modal";
import { EmpresaClientesTable } from "@/components/dashboard/empresa-clientes-table";
import type { NuevoCliente } from "@/lib/clientes-store";
import { useEmpresaDetalle } from "@/lib/empresas-store";
import type { Cliente } from "@/lib/mock-data";

export default function EmpresaDetallePage() {
  const params = useParams<{ id: string }>();
  const { empresa, cargando, crearCliente, actualizarCliente, borrarCliente, crearAcceso } =
    useEmpresaDetalle(params.id);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<string | null>(null);
  const [clienteABorrar, setClienteABorrar] = useState<Cliente | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [clienteAcceso, setClienteAcceso] = useState<Cliente | null>(null);

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
    const resultado = clienteAEditar
      ? await actualizarCliente(clienteAEditar.id, datos)
      : await crearCliente(datos);
    return resultado.ok ? null : resultado.error;
  }

  function pedirBorrar(cliente: Cliente) {
    setAvisoBorrado(null);
    setClienteABorrar(cliente);
  }

  function cancelarBorrar() {
    setClienteABorrar(null);
  }

  async function confirmarBorrar() {
    if (!clienteABorrar) return;
    setBorrando(true);
    const resultado = await borrarCliente(clienteABorrar.id);
    setBorrando(false);
    setClienteABorrar(null);
    if (!resultado.ok) {
      setAvisoBorrado(
        `${clienteABorrar.nombre} tiene ${resultado.suscripcionesAsociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
    }
  }

  async function confirmarAcceso(datos: { email: string; password: string }): Promise<string | null> {
    if (!clienteAcceso) return null;
    const resultado = await crearAcceso(clienteAcceso.id, datos);
    if (resultado.ok) {
      setClienteAcceso(null);
      return null;
    }
    return resultado.error;
  }

  if (cargando || !empresa) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-[var(--color-text)]">{empresa.nombre ?? empresa.email}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{empresa.email}</p>
        </div>
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

      <EmpresaClientesTable
        clientes={empresa.clientes}
        onEditar={abrirEditar}
        onBorrar={pedirBorrar}
        onCrearAcceso={setClienteAcceso}
      />

      <ClienteFormModal
        key={`${modalAbierto}-${clienteAEditar?.id ?? "nuevo"}`}
        open={modalAbierto}
        clienteAEditar={clienteAEditar}
        onClose={cerrarModal}
        onSave={guardar}
      />

      <ConfirmModal
        open={clienteABorrar !== null}
        titulo="Borrar cliente"
        mensaje={`¿Borrar a ${clienteABorrar?.nombre ?? ""}? Esta acción no se puede deshacer.`}
        confirmando={borrando}
        onCancelar={cancelarBorrar}
        onConfirmar={confirmarBorrar}
      />

      <CrearAccesoModal
        key={clienteAcceso?.id ?? "ninguno"}
        open={clienteAcceso !== null}
        nombreCliente={clienteAcceso?.nombre ?? ""}
        onClose={() => setClienteAcceso(null)}
        onCrear={confirmarAcceso}
      />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck y lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: sin errores.

- [ ] **Step 7: Verificación visual con Playwright**

Levantar el server igual que en Task 3 Step 7 (poll hasta `SERVER_UP`).

Crear `/tmp/verify-task4.mjs` (misma `PLAYWRIGHT_PATH` que en Task 3):

```js
import { chromium } from "PLAYWRIGHT_PATH/index.mjs";

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:3000/login");
await page.fill("#email", "jon.apiscope.empresa@gmail.com");
await page.fill("#password", "wqrxOCAco1pP");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

await page.goto("http://localhost:3000/dashboard/empresas");
await page.click('a:has-text("Empresa Demo")');
await page.waitForURL(/\/dashboard\/empresas\/.+/);
await page.waitForSelector("table");

const botonesCrearAcceso = await page.locator('button:has-text("Crear acceso")').count();
console.log("BOTONES_CREAR_ACCESO (esperado >=1):", botonesCrearAcceso);

await page.locator('button:has-text("Crear acceso")').first().click();
await page.waitForSelector("#acceso-email");
const emailAcceso = `pw-acceso-${Date.now()}@demo.com`;
await page.fill("#acceso-email", emailAcceso);
await page.fill("#acceso-password", "PwAcceso123!");
// Scoped al form del modal: el selector genérico matchea también el botón
// de la fila que sigue en el DOM (tapado, no invisible) detrás del modal.
await page.click('form:has(#acceso-email) button:has-text("Crear acceso")');
await page.waitForTimeout(500);
const conAcceso = await page.locator('text=Con acceso').count();
console.log("CON_ACCESO_DESPUES (esperado >=1):", conAcceso);

await page.click('button:has-text("Nuevo cliente")');
await page.waitForSelector("#nombre");
await page.fill("#nombre", "Cliente Playwright");
await page.fill("#empresa", "Playwright Test SA");
await page.fill("#contactId", "+54 11 0000-1111");
await page.fill("#email", `pw-cliente-${Date.now()}@demo.com`);
await page.click('button:has-text("Guardar")');
await page.waitForTimeout(500);
const filaClienteNuevo = await page.locator('td:has-text("Cliente Playwright")').count();
console.log("CLIENTE_NUEVO_EN_TABLA (esperado 1):", filaClienteNuevo);

await page.screenshot({ path: "/tmp/task4-empresa-detalle.png" });
await browser.close();
```

Run:
```bash
node /tmp/verify-task4.mjs
```
Expected: `BOTONES_CREAR_ACCESO (esperado >=1): 6` (o el número de clientes sin acceso en ese momento), `CON_ACCESO_DESPUES (esperado >=1): 1`, `CLIENTE_NUEVO_EN_TABLA (esperado 1): 1`. Revisar `console --errors` no aplica aquí (no se capturó consola en este script) — si algo falla, agregar `page.on("console", ...)` para diagnosticar antes de reportar BLOCKED.

Parar el server:
```bash
pkill -f "next dev"
```

- [ ] **Step 8: Commit**

```bash
git add lib/empresas-store.ts lib/mock-data.ts components/dashboard/empresa-clientes-table.tsx components/dashboard/crear-acceso-modal.tsx app/dashboard/empresas/\[id\]
git commit -m "feat: detalle de empresa — clientes, alta de cliente y de acceso de cliente"
```
