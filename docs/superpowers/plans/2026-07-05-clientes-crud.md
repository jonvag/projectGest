# Clientes CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/dashboard/clientes` placeholder with a real client CRUD (create, edit, delete, search) backed by `localStorage`, and keep the Dashboard's client-name lookups in sync with it, per `docs/superpowers/specs/2026-07-05-clientes-crud-design.md`.

**Architecture:** A single client-side hook (`useClientes`) owns the `localStorage`-backed client list; both `/dashboard/clientes` (full CRUD UI) and `/dashboard` (read-only name lookups) call it independently — each syncs from `localStorage` on its own mount, which is sufficient since navigation between the two unmounts/remounts the page. `Suscripcion` data stays a static import (no CRUD for it yet); it's only read to block client deletion and to count/display subscriptions per client.

**Tech Stack:** Next.js App Router (client components), TypeScript, Tailwind CSS, browser `localStorage` — no new dependencies.

## Global Constraints

- No database — `localStorage` is the persistence layer for clients; subscriptions remain a static mock array.
- No automated tests (explicit decision, consistent with the rest of the project so far) — verification is `npm run build`, `npm run lint`, and manual/browser QA.
- **No git commits.** Leave the working tree as-is when a task is done — the user commits themselves.
- **Anti-hydration pattern (mandatory):** any component reading `localStorage` must initialize its state to the static mock array from `lib/mock-data.ts` (identical on server and first client render), and only read/apply `localStorage` inside a `useEffect` (post-hydration). Never read `localStorage` during render or in a lazy `useState` initializer — this exact class of bug already broke the landing page once (hydration mismatch on `<html>` in an earlier task) and must not repeat here.
- Copy is in Spanish, matching the rest of the app.
- Visual style follows `.agents/skills/minimalist-ui/SKILL.md`, reusing the existing CSS variables (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-danger-bg`, `--color-danger-border`, `--color-danger-text`).
- Email uniqueness and "blocked delete if subscriptions exist" are hard requirements from the spec, not suggestions — every deletion and save path must go through them.

---

### Task 1: Rename `Cliente.numeroTlf` to `contactId`, drop `getClientePorId`

**Files:**
- Modify: `lib/mock-data.ts`

**Interfaces:**
- Produces: `Cliente.contactId: string` (was `numeroTlf`). Consumed by every later task in this plan.
- Removes: `getClientePorId` (no longer needed — Task 6 replaces its one call site with a lookup against the live `useClientes()` list instead of the static array).

- [ ] **Step 1: Update the `Cliente` type and seed data**

In `lib/mock-data.ts`, rename every `numeroTlf` to `contactId`:
- In the `Cliente` type definition: `numeroTlf: string;` → `contactId: string;`
- In each of the 6 seed objects in the `clientes` array: `numeroTlf: "+54 11 5555-01XX",` → `contactId: "+54 11 5555-01XX",` (keep the same phone values, only the key changes).

Delete the `getClientePorId` function entirely:
```ts
export function getClientePorId(clienteId: string): Cliente | undefined {
  return clientes.find((c) => c.id === clienteId);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: this will currently FAIL, because `app/dashboard/page.tsx` still imports `getClientePorId` and doesn't know about the rename yet. That's expected at this point in the plan — Task 6 fixes `app/dashboard/page.tsx`. Confirm the only errors are in `app/dashboard/page.tsx` (referencing `getClientePorId` and/or `numeroTlf`) and nowhere else. If there are errors anywhere else, stop and report them.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 2: `useClientes` hook (localStorage-backed store)

**Files:**
- Create: `lib/clientes-store.ts`

**Interfaces:**
- Produces: `type NuevoCliente = Omit<Cliente, "id">`, `useClientes(): { clientes: Cliente[]; addCliente(datos: NuevoCliente): Cliente; updateCliente(id: string, datos: NuevoCliente): void; deleteCliente(id: string): { ok: true } | { ok: false; suscripcionesAsociadas: number }; isEmailTaken(email: string, excludingId?: string): boolean }`. Consumed by Task 3 (`NuevoCliente` type), Task 5, and Task 6.
- Consumes: `clientes` (as `clientesIniciales`) and `suscripciones` from `lib/mock-data.ts` (Task 1's updated `Cliente` type).

- [ ] **Step 1: Create the file**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { clientes as clientesIniciales, suscripciones, type Cliente } from "@/lib/mock-data";

const STORAGE_KEY = "projectgest:clientes";

function leerDeLocalStorage(): Cliente[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Cliente[];
  } catch {
    return null;
  }
}

function guardarEnLocalStorage(clientes: Cliente[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  } catch {
    // localStorage no disponible (ej. modo privado); los cambios quedan solo en memoria.
  }
}

export type NuevoCliente = Omit<Cliente, "id">;

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);

  useEffect(() => {
    const guardados = leerDeLocalStorage();
    if (guardados) {
      setClientes(guardados);
    } else {
      guardarEnLocalStorage(clientesIniciales);
    }
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

  const addCliente = useCallback((nuevo: NuevoCliente): Cliente => {
    const cliente: Cliente = { ...nuevo, id: crypto.randomUUID() };
    setClientes((prev) => {
      const actualizados = [...prev, cliente];
      guardarEnLocalStorage(actualizados);
      return actualizados;
    });
    return cliente;
  }, []);

  const updateCliente = useCallback((id: string, cambios: NuevoCliente): void => {
    setClientes((prev) => {
      const actualizados = prev.map((c) => (c.id === id ? { ...c, ...cambios } : c));
      guardarEnLocalStorage(actualizados);
      return actualizados;
    });
  }, []);

  const deleteCliente = useCallback(
    (id: string): { ok: true } | { ok: false; suscripcionesAsociadas: number } => {
      const asociadas = suscripciones.filter((s) => s.clienteId === id).length;
      if (asociadas > 0) {
        return { ok: false, suscripcionesAsociadas: asociadas };
      }
      setClientes((prev) => {
        const actualizados = prev.filter((c) => c.id !== id);
        guardarEnLocalStorage(actualizados);
        return actualizados;
      });
      return { ok: true };
    },
    [],
  );

  return { clientes, addCliente, updateCliente, deleteCliente, isEmailTaken };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: same pre-existing failure from Task 1 (`app/dashboard/page.tsx`), and no NEW errors from this file. If `lib/clientes-store.ts` itself has an error, stop and fix it — don't proceed with a broken store.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 3: `ClienteFormModal` component

**Files:**
- Create: `components/dashboard/cliente-form-modal.tsx`

**Interfaces:**
- Produces: `export function ClienteFormModal({ open, clienteAEditar, onClose, onSave }: { open: boolean; clienteAEditar: Cliente | null; onClose: () => void; onSave: (datos: NuevoCliente) => string | null }): JSX.Element`. Consumed by Task 5.
- Consumes: `Cliente` (`lib/mock-data.ts`), `NuevoCliente` (`lib/clientes-store.ts`, Task 2).

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Cliente } from "@/lib/mock-data";
import type { NuevoCliente } from "@/lib/clientes-store";

type ClienteFormModalProps = {
  open: boolean;
  clienteAEditar: Cliente | null;
  onClose: () => void;
  onSave: (datos: NuevoCliente) => string | null;
};

const FORM_VACIO: NuevoCliente = { nombre: "", empresa: "", contactId: "", email: "" };

export function ClienteFormModal({ open, clienteAEditar, onClose, onSave }: ClienteFormModalProps) {
  const [form, setForm] = useState<NuevoCliente>(FORM_VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof NuevoCliente, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(
        clienteAEditar
          ? {
              nombre: clienteAEditar.nombre,
              empresa: clienteAEditar.empresa,
              contactId: clienteAEditar.contactId,
              email: clienteAEditar.email,
            }
          : FORM_VACIO,
      );
      setErrores({});
    }
  }, [open, clienteAEditar]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    const errorDeGuardado = onSave(form);
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
              className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: same pre-existing failure from Task 1 (`app/dashboard/page.tsx`), no new errors elsewhere.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 4: `ClientesTable` component

**Files:**
- Create: `components/dashboard/clientes-table.tsx`

**Interfaces:**
- Produces: `export function ClientesTable({ clientes, suscripciones, onEditar, onBorrar }: { clientes: Cliente[]; suscripciones: Suscripcion[]; onEditar: (cliente: Cliente) => void; onBorrar: (cliente: Cliente) => void }): JSX.Element`. Consumed by Task 5.
- Consumes: `Cliente`, `Suscripcion` types from `lib/mock-data.ts`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";

type ClientesTableProps = {
  clientes: Cliente[];
  suscripciones: Suscripcion[];
  onEditar: (cliente: Cliente) => void;
  onBorrar: (cliente: Cliente) => void;
};

export function ClientesTable({ clientes, suscripciones, onEditar, onBorrar }: ClientesTableProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = clientes.filter((c) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return c.nombre.toLowerCase().includes(termino) || c.empresa.toLowerCase().includes(termino);
  });

  function contarSuscripciones(clienteId: string): number {
    return suscripciones.filter((s) => s.clienteId === clienteId).length;
  }

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
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Nombre</th>
              <th className="py-2 pr-4 font-medium">Empresa</th>
              <th className="py-2 pr-4 font-medium">ContactId</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Suscripciones</th>
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
                <td className="py-3 pr-4 text-[var(--color-text)]">{contarSuscripciones(c.id)}</td>
                <td className="py-3 pr-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onEditar(c)}
                      className="text-sm text-[var(--color-text)] underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onBorrar(c)}
                      className="text-sm text-[var(--color-danger-text)] underline"
                    >
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--color-text-muted)]">
                  No se encontraron clientes.
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

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: same pre-existing failure from Task 1, no new errors elsewhere.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 5: `/dashboard/clientes` page (replaces the placeholder)

**Files:**
- Modify: `app/dashboard/clientes/page.tsx` (currently renders `<ComingSoon title="Clientes" />` — replace entirely)

**Interfaces:**
- Consumes: `useClientes` (`lib/clientes-store.ts`), `ClienteFormModal` (`components/dashboard/cliente-form-modal.tsx`), `ClientesTable` (`components/dashboard/clientes-table.tsx`), `suscripciones` (`lib/mock-data.ts`).

- [ ] **Step 1: Replace the file entirely**

```tsx
"use client";

import { useState } from "react";
import { ClienteFormModal } from "@/components/dashboard/cliente-form-modal";
import { ClientesTable } from "@/components/dashboard/clientes-table";
import { useClientes, type NuevoCliente } from "@/lib/clientes-store";
import { suscripciones, type Cliente } from "@/lib/mock-data";

export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente, isEmailTaken } = useClientes();
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

  function guardar(datos: NuevoCliente): string | null {
    if (isEmailTaken(datos.email, clienteAEditar?.id)) {
      return "Ya existe un cliente con ese email.";
    }
    if (clienteAEditar) {
      updateCliente(clienteAEditar.id, datos);
    } else {
      addCliente(datos);
    }
    return null;
  }

  function borrar(cliente: Cliente) {
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
    const resultado = deleteCliente(cliente.id);
    if (!resultado.ok) {
      setAvisoBorrado(
        `${cliente.nombre} tiene ${resultado.suscripcionesAsociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
    }
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
        open={modalAbierto}
        clienteAEditar={clienteAEditar}
        onClose={cerrarModal}
        onSave={guardar}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: same pre-existing failure from Task 1 (`app/dashboard/page.tsx` only), no new errors.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 6: Sync `app/dashboard/page.tsx` with the live client store

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useClientes` (`lib/clientes-store.ts`) instead of the removed `getClientePorId` (`lib/mock-data.ts`).

- [ ] **Step 1: Replace the file entirely**

```tsx
"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { useClientes } from "@/lib/clientes-store";
import {
  getCobrosVencidos,
  getIngresosEsperadosDelMes,
  getProximosCobrosDeLaSemana,
  suscripciones,
  type Suscripcion,
} from "@/lib/mock-data";

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
  const { clientes } = useClientes();

  function nombreClienteDe(suscripcion: Suscripcion): string {
    return clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "Cliente desconocido";
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

- [ ] **Step 2: Verify it builds clean**

Run: `npm run build`
Expected: build now succeeds with NO errors anywhere (this was the last file with the pre-existing `getClientePorId`/`numeroTlf` reference from Task 1).

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 7: Manual QA

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk through the spec's verification checklist in a real browser**

Open `http://localhost:3000/dashboard/clientes` and check:
- The table shows the 6 seed clients with their `contactId` (not `numeroTlf`) and correct subscription counts (Bruno Cabrera should show 2).
- Search by a name (e.g. "ana") and by a company (e.g. "cabrera") — table filters correctly, case-insensitively.
- Click "Nuevo cliente", leave fields empty, submit → inline errors appear for every required field, nothing is saved.
- Create a client with a valid, unique email → appears in the table immediately.
- Reload the page → the new client is still there (persisted via `localStorage`).
- Try creating another client reusing an existing email → error shown under the email field, not saved.
- Edit an existing client's name → table updates immediately; navigate to `/dashboard` → the new name appears in the vencidos/próximos lists (if that client has a matching subscription).
- Try deleting a client that has subscriptions (e.g. Ana Torres) → blocked, warning message shown, client remains.
- Delete the newly-created client (no subscriptions) → confirmation dialog appears; confirm → client disappears from the table and does not come back after reload.
- Resize to mobile width → table scrolls horizontally without breaking the page layout, modal remains usable.
- Toggle dark theme (via `localStorage.setItem('theme','dark')` + reload, same as before) → table, modal, and danger-styled warning all adapt correctly.

- [ ] **Step 3: Stop the dev server**

```bash
# Ctrl+C, or:
pkill -f "next dev"
```

- [ ] **Step 4: Leave the change as-is (no commit)**
