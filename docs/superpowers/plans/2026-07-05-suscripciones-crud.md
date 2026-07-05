# Suscripciones CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/dashboard/suscripciones` placeholder with a real subscription CRUD (create, edit, delete, search) backed by `localStorage`, linked to existing clients, per `docs/superpowers/specs/2026-07-05-suscripciones-crud-design.md`.

**Architecture:** A `useSuscripciones` hook, structurally identical to `useClientes`, owns the `localStorage`-backed subscription list. Three existing consumers of the old static `suscripciones` array — `useClientes.deleteCliente` (blocked-delete check), `/dashboard` (metrics + lists), and `/dashboard/clientes` (table counts + delete check) — all switch to reading the live hook output instead, so edits made in the new Suscripciones UI are immediately visible everywhere else.

**Tech Stack:** Next.js App Router (client components), TypeScript, Tailwind CSS, `@radix-ui/react-icons` (already installed) — no new dependencies.

## Global Constraints

- No database — `localStorage` is the persistence layer, same as Clientes.
- No automated tests — verification is `npm run build`, `npm run lint`, and manual/browser QA.
- **No git commits.** Leave the working tree as-is — the user commits themselves.
- **Anti-hydration pattern (mandatory, same as `useClientes`):** initialize state to the static mock array, sync from `localStorage` only inside a `useEffect`. Never read `localStorage` during render or in a lazy `useState` initializer.
- **Form reset pattern (mandatory, same as `ClienteFormModal`):** the modal is remounted via a `key` prop from its parent when it opens for a different target — do not reintroduce a `useEffect` that calls `setState` to reset form fields (this triggers the `react-hooks/set-state-in-effect` lint error, and the `key`-based remount is strictly better here since there's no external/browser state involved).
- A subscription's `clienteId` must reference a client selected from the live `useClientes()` list — the dropdown has no "create client" shortcut in this spec.
- Copy is in Spanish. Visual style follows `.agents/skills/minimalist-ui/SKILL.md`, reusing existing CSS variables including `--color-danger-bg`/`--color-danger-border`/`--color-danger-text`.
- Icons for row actions: `Pencil2Icon` / `TrashIcon` from `@radix-ui/react-icons`, same as the Clientes table.

---

### Task 1: `useSuscripciones` hook (localStorage-backed store)

**Files:**
- Create: `lib/suscripciones-store.ts`

**Interfaces:**
- Produces: `type NuevaSuscripcion = Omit<Suscripcion, "id">`, `useSuscripciones(): { suscripciones: Suscripcion[]; addSuscripcion(datos: NuevaSuscripcion): Suscripcion; updateSuscripcion(id: string, datos: NuevaSuscripcion): void; deleteSuscripcion(id: string): void }`. Consumed by Tasks 5, 6, 7.
- Consumes: `suscripciones` (as `suscripcionesIniciales`) and `Suscripcion` type from `lib/mock-data.ts`.

- [ ] **Step 1: Create the file**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { suscripciones as suscripcionesIniciales, type Suscripcion } from "@/lib/mock-data";

const STORAGE_KEY = "projectgest:suscripciones";

function leerDeLocalStorage(): Suscripcion[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Suscripcion[];
  } catch {
    return null;
  }
}

function guardarEnLocalStorage(suscripciones: Suscripcion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suscripciones));
  } catch {
    // localStorage no disponible (ej. modo privado); los cambios quedan solo en memoria.
  }
}

export type NuevaSuscripcion = Omit<Suscripcion, "id">;

export function useSuscripciones() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>(suscripcionesIniciales);

  useEffect(() => {
    // Mismo patrón anti-hidratación que useClientes: el mock es el estado
    // inicial (igual en servidor y primer render de cliente); recién acá,
    // post-hidratación, se sincroniza con localStorage.
    const guardadas = leerDeLocalStorage();
    if (guardadas) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuscripciones(guardadas);
    } else {
      guardarEnLocalStorage(suscripcionesIniciales);
    }
  }, []);

  const addSuscripcion = useCallback((nueva: NuevaSuscripcion): Suscripcion => {
    const suscripcion: Suscripcion = { ...nueva, id: crypto.randomUUID() };
    setSuscripciones((prev) => {
      const actualizadas = [...prev, suscripcion];
      guardarEnLocalStorage(actualizadas);
      return actualizadas;
    });
    return suscripcion;
  }, []);

  const updateSuscripcion = useCallback((id: string, cambios: NuevaSuscripcion): void => {
    setSuscripciones((prev) => {
      const actualizadas = prev.map((s) => (s.id === id ? { ...s, ...cambios } : s));
      guardarEnLocalStorage(actualizadas);
      return actualizadas;
    });
  }, []);

  const deleteSuscripcion = useCallback((id: string): void => {
    setSuscripciones((prev) => {
      const actualizadas = prev.filter((s) => s.id !== id);
      guardarEnLocalStorage(actualizadas);
      return actualizadas;
    });
  }, []);

  return { suscripciones, addSuscripcion, updateSuscripcion, deleteSuscripcion };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: build succeeds — this file isn't imported anywhere yet.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 2: Make `useClientes.deleteCliente` take the live subscriptions list

**Files:**
- Modify: `lib/clientes-store.ts`

**Interfaces:**
- Changes: `deleteCliente(id: string): {...}` → `deleteCliente(id: string, suscripcionesActuales: Suscripcion[]): {...}` (same return type). This is a breaking change to an existing exported function — Task 7 updates its one call site.
- Removes the `suscripciones` static import from this file (no longer reads the mock array directly — the live list is now always passed in by the caller, which is what keeps the block-delete check accurate once subscriptions become editable in Task 5).

**Why now:** once Task 5 makes subscriptions editable, this file's existing internal check against the static mock array would silently go stale (e.g. a client with a newly-added subscription could still be deleted, because this hook never sees the addition).

- [ ] **Step 1: Update the import and `deleteCliente`**

Change:
```ts
import { clientes as clientesIniciales, suscripciones, type Cliente } from "@/lib/mock-data";
```
to:
```ts
import { clientes as clientesIniciales, type Cliente, type Suscripcion } from "@/lib/mock-data";
```

Change:
```ts
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
```
to:
```ts
  const deleteCliente = useCallback(
    (
      id: string,
      suscripcionesActuales: Suscripcion[],
    ): { ok: true } | { ok: false; suscripcionesAsociadas: number } => {
      const asociadas = suscripcionesActuales.filter((s) => s.clienteId === id).length;
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: this will currently FAIL, because `app/dashboard/clientes/page.tsx` still calls `deleteCliente(cliente.id)` with one argument. That's expected here — Task 7 fixes the call site. Confirm the only error is in `app/dashboard/clientes/page.tsx`.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 3: `SuscripcionFormModal` component

**Files:**
- Create: `components/dashboard/suscripcion-form-modal.tsx`

**Interfaces:**
- Produces: `export function SuscripcionFormModal({ open, suscripcionAEditar, clientes, onClose, onSave }: { open: boolean; suscripcionAEditar: Suscripcion | null; clientes: Cliente[]; onClose: () => void; onSave: (datos: NuevaSuscripcion) => void }): JSX.Element`. Consumed by Task 5.
- Consumes: `Cliente`, `Suscripcion` (`lib/mock-data.ts`), `NuevaSuscripcion` (`lib/suscripciones-store.ts`, Task 1).

- [ ] **Step 1: Create the component**

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
  onSave: (datos: NuevaSuscripcion) => void;
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

  if (!open) return null;

  function validar(): Partial<Record<keyof NuevaSuscripcion, string>> {
    const nuevosErrores: Partial<Record<keyof NuevaSuscripcion, string>> = {};
    if (!form.clienteId) nuevosErrores.clienteId = "Seleccioná un cliente.";
    if (!form.servicio.trim()) nuevosErrores.servicio = "El servicio es obligatorio.";
    if (!form.monto || form.monto <= 0) nuevosErrores.monto = "El monto debe ser mayor a 0.";
    if (!form.proximoCobro) nuevosErrores.proximoCobro = "La fecha de próximo cobro es obligatoria.";
    return nuevosErrores;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    onSave(form);
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
Expected: same pre-existing failure from Task 2 (`app/dashboard/clientes/page.tsx`), no new errors elsewhere.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 4: `SuscripcionesTable` component

**Files:**
- Create: `components/dashboard/suscripciones-table.tsx`

**Interfaces:**
- Produces: `export function SuscripcionesTable({ suscripciones, clientes, onEditar, onBorrar }: { suscripciones: Suscripcion[]; clientes: Cliente[]; onEditar: (s: Suscripcion) => void; onBorrar: (s: Suscripcion) => void }): JSX.Element`. Consumed by Task 5.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";

type SuscripcionesTableProps = {
  suscripciones: Suscripcion[];
  clientes: Cliente[];
  onEditar: (suscripcion: Suscripcion) => void;
  onBorrar: (suscripcion: Suscripcion) => void;
};

function toISODateHoy(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

const ETIQUETA_CICLO: Record<Suscripcion["ciclo"], string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

export function SuscripcionesTable({
  suscripciones,
  clientes,
  onEditar,
  onBorrar,
}: SuscripcionesTableProps) {
  const [busqueda, setBusqueda] = useState("");
  const hoyISO = toISODateHoy();

  function nombreClienteDe(clienteId: string): string {
    return clientes.find((c) => c.id === clienteId)?.nombre ?? "Cliente desconocido";
  }

  const filtradas = suscripciones.filter((s) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return (
      nombreClienteDe(s.clienteId).toLowerCase().includes(termino) ||
      s.servicio.toLowerCase().includes(termino)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por cliente o servicio..."
        className="w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="py-2 pr-4 font-medium">Servicio</th>
              <th className="py-2 pr-4 font-medium">Monto</th>
              <th className="py-2 pr-4 font-medium">Ciclo</th>
              <th className="py-2 pr-4 font-medium">Próximo cobro</th>
              <th className="py-2 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtradas.map((s) => {
              const vencida = s.proximoCobro < hoyISO;
              return (
                <tr
                  key={s.id}
                  style={vencida ? { backgroundColor: "var(--color-danger-bg)" } : undefined}
                >
                  <td className="py-3 pr-4 text-[var(--color-text)]">{nombreClienteDe(s.clienteId)}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]">{s.servicio}</td>
                  <td className="py-3 pr-4 text-[var(--color-text)]">{formatMonto(s.monto)}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]">{ETIQUETA_CICLO[s.ciclo]}</td>
                  <td
                    className="py-3 pr-4"
                    style={{ color: vencida ? "var(--color-danger-text)" : "var(--color-text-muted)" }}
                  >
                    {formatFecha(s.proximoCobro)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditar(s)}
                        aria-label={`Editar suscripción de ${nombreClienteDe(s.clienteId)}`}
                        title="Editar"
                        className="rounded-md p-1.5 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
                      >
                        <Pencil2Icon />
                      </button>
                      <button
                        type="button"
                        onClick={() => onBorrar(s)}
                        aria-label={`Borrar suscripción de ${nombreClienteDe(s.clienteId)}`}
                        title="Borrar"
                        className="rounded-md p-1.5 text-[var(--color-danger-text)] transition-colors hover:bg-[var(--color-danger-bg)]"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--color-text-muted)]">
                  No se encontraron suscripciones.
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
Expected: same pre-existing failure from Task 2, no new errors elsewhere.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 5: `/dashboard/suscripciones` page (replaces the placeholder)

**Files:**
- Modify: `app/dashboard/suscripciones/page.tsx` (currently renders `<ComingSoon title="Suscripciones" />` — replace entirely)

**Interfaces:**
- Consumes: `useClientes` (`lib/clientes-store.ts`), `useSuscripciones`/`NuevaSuscripcion` (`lib/suscripciones-store.ts`, Task 1), `SuscripcionFormModal` (Task 3), `SuscripcionesTable` (Task 4).

- [ ] **Step 1: Replace the file entirely**

```tsx
"use client";

import { useState } from "react";
import { SuscripcionFormModal } from "@/components/dashboard/suscripcion-form-modal";
import { SuscripcionesTable } from "@/components/dashboard/suscripciones-table";
import { useClientes } from "@/lib/clientes-store";
import type { Suscripcion } from "@/lib/mock-data";
import { useSuscripciones, type NuevaSuscripcion } from "@/lib/suscripciones-store";

export default function SuscripcionesPage() {
  const { clientes } = useClientes();
  const { suscripciones, addSuscripcion, updateSuscripcion, deleteSuscripcion } = useSuscripciones();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [suscripcionAEditar, setSuscripcionAEditar] = useState<Suscripcion | null>(null);

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

  function guardar(datos: NuevaSuscripcion) {
    if (suscripcionAEditar) {
      updateSuscripcion(suscripcionAEditar.id, datos);
    } else {
      addSuscripcion(datos);
    }
  }

  function borrar(suscripcion: Suscripcion) {
    const nombreCliente =
      clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "este cliente";
    if (
      !window.confirm(
        `¿Borrar la suscripción "${suscripcion.servicio}" de ${nombreCliente}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    deleteSuscripcion(suscripcion.id);
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
      />

      <SuscripcionFormModal
        key={`${modalAbierto}-${suscripcionAEditar?.id ?? "nueva"}`}
        open={modalAbierto}
        suscripcionAEditar={suscripcionAEditar}
        clientes={clientes}
        onClose={cerrarModal}
        onSave={guardar}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: same pre-existing failure from Task 2, no new errors elsewhere.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 6: Sync `app/dashboard/page.tsx` with the live subscriptions store

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useSuscripciones` (`lib/suscripciones-store.ts`) instead of the static `suscripciones` import from `lib/mock-data.ts`.

- [ ] **Step 1: Update the imports**

Change:
```tsx
import { useClientes } from "@/lib/clientes-store";
import {
  getCobrosVencidos,
  getIngresosEsperadosDelMes,
  getProximosCobrosDeLaSemana,
  suscripciones,
  type Suscripcion,
} from "@/lib/mock-data";
```
to:
```tsx
import { useClientes } from "@/lib/clientes-store";
import {
  getCobrosVencidos,
  getIngresosEsperadosDelMes,
  getProximosCobrosDeLaSemana,
  type Suscripcion,
} from "@/lib/mock-data";
import { useSuscripciones } from "@/lib/suscripciones-store";
```

- [ ] **Step 2: Use the hook inside the component**

Change:
```tsx
export default function DashboardPage() {
  const { clientes } = useClientes();

  function nombreClienteDe(suscripcion: Suscripcion): string {
    return clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "Cliente desconocido";
  }

  const ingresosDelMes = getIngresosEsperadosDelMes(suscripciones);
  const vencidos = getCobrosVencidos(suscripciones);
  const proximos = getProximosCobrosDeLaSemana(suscripciones);
```
to:
```tsx
export default function DashboardPage() {
  const { clientes } = useClientes();
  const { suscripciones } = useSuscripciones();

  function nombreClienteDe(suscripcion: Suscripcion): string {
    return clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "Cliente desconocido";
  }

  const ingresosDelMes = getIngresosEsperadosDelMes(suscripciones);
  const vencidos = getCobrosVencidos(suscripciones);
  const proximos = getProximosCobrosDeLaSemana(suscripciones);
```

The rest of the file (JSX, `formatMonto`, `formatFecha`) is unchanged.

- [ ] **Step 3: Verify it type-checks**

Run: `npm run build`
Expected: same pre-existing failure from Task 2 (`app/dashboard/clientes/page.tsx` only), no new errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 7: Sync `app/dashboard/clientes/page.tsx` with the live subscriptions store

**Files:**
- Modify: `app/dashboard/clientes/page.tsx`

**Interfaces:**
- Consumes: `useSuscripciones` (`lib/suscripciones-store.ts`) instead of the static `suscripciones` import from `lib/mock-data.ts`.
- Calls the new two-argument `deleteCliente(id, suscripcionesActuales)` signature from Task 2.

- [ ] **Step 1: Update the imports**

Change:
```tsx
import { useClientes, type NuevoCliente } from "@/lib/clientes-store";
import { suscripciones, type Cliente } from "@/lib/mock-data";
```
to:
```tsx
import { useClientes, type NuevoCliente } from "@/lib/clientes-store";
import type { Cliente } from "@/lib/mock-data";
import { useSuscripciones } from "@/lib/suscripciones-store";
```

- [ ] **Step 2: Use the hook and pass the live list to `deleteCliente`**

Change:
```tsx
export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente, isEmailTaken } = useClientes();
  const [modalAbierto, setModalAbierto] = useState(false);
```
to:
```tsx
export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente, isEmailTaken } = useClientes();
  const { suscripciones } = useSuscripciones();
  const [modalAbierto, setModalAbierto] = useState(false);
```

Change the `borrar` function's `deleteCliente` call:
```tsx
    const resultado = deleteCliente(cliente.id);
```
to:
```tsx
    const resultado = deleteCliente(cliente.id, suscripciones);
```

The rest of `borrar` (the `asociadas` pre-check using `suscripciones.filter(...)`, the `window.confirm`, the `setAvisoBorrado` calls) is unchanged — it already reads from the `suscripciones` variable, which now comes from the hook instead of the static import.

- [ ] **Step 3: Verify it builds and lints clean**

Run: `npm run build`
Expected: build now succeeds with NO errors anywhere (this was the last file with the pre-existing one-argument `deleteCliente` call from Task 2).

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 8: Manual QA

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk through the spec's verification checklist in a real browser**

Open `http://localhost:3000/dashboard/suscripciones` and check:
- The table shows the 8 seed subscriptions with the correct client names (via the `clienteId` join), service, amount, cycle label, and date.
- Rows with a past `proximoCobro` are visually tinted with the danger accent; others aren't.
- Search by a client name and by a service name — table filters correctly.
- Click "Nueva suscripción", submit empty → inline errors for cliente/servicio/monto/próximo cobro, nothing saved.
- Create a valid subscription for an existing client → appears in the table immediately, and the client's subscription count on `/dashboard/clientes` increments.
- Reload → the new subscription persists.
- Edit a subscription's amount or cycle → table updates immediately; check `/dashboard` reflects the new amount in the metrics/lists if it falls in the relevant window.
- Delete a subscription that was the only one for some client → confirmation dialog, then it's gone; go to `/dashboard/clientes` and confirm that client can now be deleted (no longer blocked).
- Delete a subscription for a client that still has others left → that client still shows the remaining count and is still blocked from deletion.
- Resize to mobile width → table scrolls horizontally without breaking the page layout (same fix as Clientes' `min-w-0` on `<main>` already applies here, since it's the same layout).
- Toggle dark theme → table, modal, and danger accents adapt correctly.

- [ ] **Step 3: Stop the dev server**

```bash
pkill -f "next dev"
```

- [ ] **Step 4: Leave the change as-is (no commit)**
