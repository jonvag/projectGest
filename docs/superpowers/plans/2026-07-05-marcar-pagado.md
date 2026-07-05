# Marcar como Pagado + Detalle de Cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "mark as paid" action to Suscripciones that suggests and confirms the next billing date, logs a payment record, and surface that history as a per-client timeline on a new `/dashboard/clientes/[id]` detail page, per `docs/superpowers/specs/2026-07-05-marcar-pagado-design.md`.

**Architecture:** A new `usePagos` hook (same `localStorage` pattern as `useClientes`/`useSuscripciones`, but starting empty — no seed data) stores an append-only log of payment snapshots. A pure `calcularProximaFecha` helper computes the suggested next date from a subscription's current due date and cycle. The new client detail page is a client component that combines all three existing hooks (`useClientes`, `useSuscripciones`, `usePagos`) to render one client's data — no new persistence concept, just a new read view.

**Tech Stack:** Next.js App Router (client components, one dynamic route), TypeScript, Tailwind CSS, `@radix-ui/react-icons` (already installed) — no new dependencies.

## Global Constraints

- No database — `localStorage`, same as Clientes/Suscripciones. `usePagos` starts with an empty array (no mock seed).
- No automated tests — verification is `npm run build`, `npm run lint`, manual/browser QA.
- **No git commits.** Leave the working tree as-is.
- **Anti-hydration pattern (mandatory):** same as every other `use*` store hook in this project — initial state must be deterministic (static/empty), `localStorage` reads only inside `useEffect`.
- **Form/dialog reset pattern (mandatory):** the new `ConfirmarPagoModal` is remounted via a `key` prop from its parent when opened for a different subscription — no `useEffect` resetting its fields.
- A payment (`Pago`) snapshots `clienteId`, `servicio`, and `monto` at confirmation time — it must NOT be a live join, so the history survives later edits/deletes of the client or subscription.
- Date math for `calcularProximaFecha` must construct `Date` objects from parsed local year/month/day components — never `new Date(isoString)` directly on our own ISO date-only strings (this codebase already avoids that pitfall everywhere else; don't reintroduce it here).
- Visual style follows `.agents/skills/minimalist-ui/SKILL.md`; new green "success" accent tokens follow the same shape as the existing `--color-danger-*` tokens.
- Icon for the new action: `CheckCircledIcon` from `@radix-ui/react-icons`, matching the existing `Pencil2Icon`/`TrashIcon` usage.

---

### Task 1: Success (green) color tokens

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: CSS vars `--color-success-bg`, `--color-success-border`, `--color-success-text` (light on `:root`, dark on `.dark`). Consumed by Tasks 5 and 7.

- [ ] **Step 1: Add the tokens**

Add these three lines inside the existing `:root { ... }` block, alongside `--color-danger-*`:
```css
  --color-success-bg: #edf3ec;
  --color-success-border: #cfe0cc;
  --color-success-text: #346538;
```

Add these three lines inside the existing `.dark { ... }` block:
```css
  --color-success-bg: #1c2a1c;
  --color-success-border: #2f4a2f;
  --color-success-text: #8fc98f;
```

Leave every other line unchanged.

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds (pure CSS addition, nothing consumes it yet).

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 2: Export `toISODate`, remove the duplicate in `SuscripcionesTable`

**Files:**
- Modify: `lib/mock-data.ts`
- Modify: `components/dashboard/suscripciones-table.tsx`

**Interfaces:**
- Produces: `export function toISODate(date: Date): string` (was a private helper). Consumed by Task 5 (page.tsx) and this task's own change to `suscripciones-table.tsx`.

**Why:** this exact date-formatting function is currently duplicated three times (`lib/mock-data.ts` private, `components/dashboard/suscripciones-table.tsx`'s `toISODateHoy`, and would be a fourth time in Task 5 if left alone). One export, reused everywhere.

- [ ] **Step 1: Export it from `lib/mock-data.ts`**

Change:
```ts
function toISODate(date: Date): string {
```
to:
```ts
export function toISODate(date: Date): string {
```
(No other change to the function body.)

- [ ] **Step 2: Reuse it in `components/dashboard/suscripciones-table.tsx`**

Change:
```tsx
import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";
```
to:
```tsx
import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { toISODate, type Cliente, type Suscripcion } from "@/lib/mock-data";
```

Delete this now-redundant local function entirely:
```tsx
function toISODateHoy(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

Change the one call site:
```tsx
  const hoyISO = toISODateHoy();
```
to:
```tsx
  const hoyISO = toISODate(new Date());
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 3: `usePagos` hook (localStorage-backed, empty seed)

**Files:**
- Create: `lib/pagos-store.ts`

**Interfaces:**
- Produces: `type Pago = { id: string; suscripcionId: string; clienteId: string; servicio: string; monto: number; fechaPago: string; fechaCobroAnterior: string; fechaProximoCobroNueva: string }`, `type NuevoPago = Omit<Pago, "id">`, `usePagos(): { pagos: Pago[]; addPago(datos: NuevoPago): Pago }`. Consumed by Tasks 5, 7, 8.

- [ ] **Step 1: Create the file**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "projectgest:pagos";

export type Pago = {
  id: string;
  suscripcionId: string;
  clienteId: string;
  servicio: string;
  monto: number;
  fechaPago: string; // ISO date — hoy, al momento de confirmar
  fechaCobroAnterior: string; // ISO date — el proximoCobro que tenía antes
  fechaProximoCobroNueva: string; // ISO date — la fecha confirmada
};

export type NuevoPago = Omit<Pago, "id">;

function leerDeLocalStorage(): Pago[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pago[];
  } catch {
    return null;
  }
}

function guardarEnLocalStorage(pagos: Pago[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pagos));
  } catch {
    // localStorage no disponible (ej. modo privado); los cambios quedan solo en memoria.
  }
}

export function usePagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);

  useEffect(() => {
    // No hay semilla mock acá (el historial empieza vacío) — solo se
    // sincroniza con localStorage si ya hay algo guardado.
    const guardados = leerDeLocalStorage();
    if (guardados) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPagos(guardados);
    }
  }, []);

  const addPago = useCallback((nuevo: NuevoPago): Pago => {
    const pago: Pago = { ...nuevo, id: crypto.randomUUID() };
    setPagos((prev) => {
      const actualizados = [...prev, pago];
      guardarEnLocalStorage(actualizados);
      return actualizados;
    });
    return pago;
  }, []);

  return { pagos, addPago };
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds (not imported anywhere yet).

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 4: `calcularProximaFecha` helper

**Files:**
- Modify: `lib/suscripciones-store.ts`

**Interfaces:**
- Produces: `export function calcularProximaFecha(fechaActual: string, ciclo: Suscripcion["ciclo"]): string`. Consumed by Task 5 (`ConfirmarPagoModal`).

- [ ] **Step 1: Add the import and function**

Add `Suscripcion` to the existing type-only import (it's already imported as a value via `suscripciones as suscripcionesIniciales`, but the bare type isn't imported yet):

Change:
```ts
import { suscripciones as suscripcionesIniciales, type Suscripcion } from "@/lib/mock-data";
```
(This import already exists with `type Suscripcion` — if it doesn't in your checkout, add it. Verify before editing.)

Add this function anywhere after the imports (e.g. right before `export function useSuscripciones()`):
```ts
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
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 5: `ConfirmarPagoModal` component

**Files:**
- Create: `components/dashboard/confirmar-pago-modal.tsx`

**Interfaces:**
- Produces: `export function ConfirmarPagoModal({ open, suscripcion, cliente, onClose, onConfirmar }: { open: boolean; suscripcion: Suscripcion | null; cliente: Cliente | null; onClose: () => void; onConfirmar: (fechaProximoCobro: string) => void }): JSX.Element`. Consumed by Task 6.
- Consumes: `calcularProximaFecha` (`lib/suscripciones-store.ts`, Task 4), `Cliente`/`Suscripcion` types (`lib/mock-data.ts`), `--color-success-*` tokens (Task 1).

- [ ] **Step 1: Create the component**

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
  onConfirmar: (fechaProximoCobro: string) => void;
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

  if (!open || !suscripcion) return null;

  function handleConfirmar() {
    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    onConfirmar(fecha);
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
            className="rounded-md px-4 py-1.5 text-sm"
            style={{ backgroundColor: "var(--color-success-text)", color: "var(--color-bg)" }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 6: Wire "Marcar como pagado" into Suscripciones

**Files:**
- Modify: `components/dashboard/suscripciones-table.tsx`
- Modify: `app/dashboard/suscripciones/page.tsx`

**Interfaces:**
- `SuscripcionesTableProps` gains `onMarcarPagado: (suscripcion: Suscripcion) => void`.
- Consumes: `usePagos` (Task 3), `ConfirmarPagoModal` (Task 5), `toISODate` (Task 2).

- [ ] **Step 1: Add the icon and prop to `SuscripcionesTable`**

Change the import line:
```tsx
import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
```
to:
```tsx
import { CheckCircledIcon, Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
```

Change the props type:
```tsx
type SuscripcionesTableProps = {
  suscripciones: Suscripcion[];
  clientes: Cliente[];
  onEditar: (suscripcion: Suscripcion) => void;
  onBorrar: (suscripcion: Suscripcion) => void;
};
```
to:
```tsx
type SuscripcionesTableProps = {
  suscripciones: Suscripcion[];
  clientes: Cliente[];
  onEditar: (suscripcion: Suscripcion) => void;
  onBorrar: (suscripcion: Suscripcion) => void;
  onMarcarPagado: (suscripcion: Suscripcion) => void;
};
```

Change the component signature:
```tsx
export function SuscripcionesTable({
  suscripciones,
  clientes,
  onEditar,
  onBorrar,
}: SuscripcionesTableProps) {
```
to:
```tsx
export function SuscripcionesTable({
  suscripciones,
  clientes,
  onEditar,
  onBorrar,
  onMarcarPagado,
}: SuscripcionesTableProps) {
```

Add a third button right before the "Editar" button inside the actions `<div className="flex gap-2">`:
```tsx
                      <button
                        type="button"
                        onClick={() => onMarcarPagado(s)}
                        aria-label={`Marcar como pagado: ${nombreClienteDe(s.clienteId)}`}
                        title="Marcar como pagado"
                        className="rounded-md p-1.5 text-[var(--color-success-text)] transition-colors hover:bg-[var(--color-success-bg)]"
                      >
                        <CheckCircledIcon />
                      </button>
```

- [ ] **Step 2: Wire it in `app/dashboard/suscripciones/page.tsx`**

Change the imports:
```tsx
import { useState } from "react";
import { SuscripcionFormModal } from "@/components/dashboard/suscripcion-form-modal";
import { SuscripcionesTable } from "@/components/dashboard/suscripciones-table";
import { useClientes } from "@/lib/clientes-store";
import type { Suscripcion } from "@/lib/mock-data";
import { useSuscripciones, type NuevaSuscripcion } from "@/lib/suscripciones-store";
```
to:
```tsx
import { useState } from "react";
import { ConfirmarPagoModal } from "@/components/dashboard/confirmar-pago-modal";
import { SuscripcionFormModal } from "@/components/dashboard/suscripcion-form-modal";
import { SuscripcionesTable } from "@/components/dashboard/suscripciones-table";
import { useClientes } from "@/lib/clientes-store";
import { toISODate, type Suscripcion } from "@/lib/mock-data";
import { usePagos } from "@/lib/pagos-store";
import { useSuscripciones, type NuevaSuscripcion } from "@/lib/suscripciones-store";
```

Add state and a handler, and render the modal. Change:
```tsx
export default function SuscripcionesPage() {
  const { clientes } = useClientes();
  const { suscripciones, addSuscripcion, updateSuscripcion, deleteSuscripcion } = useSuscripciones();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [suscripcionAEditar, setSuscripcionAEditar] = useState<Suscripcion | null>(null);
```
to:
```tsx
export default function SuscripcionesPage() {
  const { clientes } = useClientes();
  const { suscripciones, addSuscripcion, updateSuscripcion, deleteSuscripcion } = useSuscripciones();
  const { addPago } = usePagos();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [suscripcionAEditar, setSuscripcionAEditar] = useState<Suscripcion | null>(null);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [suscripcionAPagar, setSuscripcionAPagar] = useState<Suscripcion | null>(null);
```

Add these functions right after `cerrarModal`:
```tsx
  function abrirConfirmarPago(suscripcion: Suscripcion) {
    setSuscripcionAPagar(suscripcion);
    setModalPagoAbierto(true);
  }

  function cerrarConfirmarPago() {
    setModalPagoAbierto(false);
    setSuscripcionAPagar(null);
  }

  function confirmarPago(fechaProximoCobro: string) {
    if (!suscripcionAPagar) return;
    addPago({
      suscripcionId: suscripcionAPagar.id,
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      fechaPago: toISODate(new Date()),
      fechaCobroAnterior: suscripcionAPagar.proximoCobro,
      fechaProximoCobroNueva: fechaProximoCobro,
    });
    updateSuscripcion(suscripcionAPagar.id, {
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      ciclo: suscripcionAPagar.ciclo,
      proximoCobro: fechaProximoCobro,
    });
    cerrarConfirmarPago();
  }
```

Pass the new prop to `<SuscripcionesTable>`:
```tsx
      <SuscripcionesTable
        suscripciones={suscripciones}
        clientes={clientes}
        onEditar={abrirEditar}
        onBorrar={borrar}
      />
```
to:
```tsx
      <SuscripcionesTable
        suscripciones={suscripciones}
        clientes={clientes}
        onEditar={abrirEditar}
        onBorrar={borrar}
        onMarcarPagado={abrirConfirmarPago}
      />
```

Render the new modal right after the existing `<SuscripcionFormModal>` block (before the closing `</div>`):
```tsx
      <ConfirmarPagoModal
        key={`${modalPagoAbierto}-${suscripcionAPagar?.id ?? "ninguna"}`}
        open={modalPagoAbierto}
        suscripcion={suscripcionAPagar}
        cliente={clientes.find((c) => c.id === suscripcionAPagar?.clienteId) ?? null}
        onClose={cerrarConfirmarPago}
        onConfirmar={confirmarPago}
      />
```

- [ ] **Step 3: Verify it builds and lints**

Run: `npm run build`
Expected: build succeeds, no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 7: `PagosTimeline` component

**Files:**
- Create: `components/dashboard/pagos-timeline.tsx`

**Interfaces:**
- Produces: `export function PagosTimeline({ pagos }: { pagos: Pago[] }): JSX.Element`. Consumed by Task 8.
- Consumes: `Pago` type from `lib/pagos-store.ts` (Task 3).

- [ ] **Step 1: Create the component**

```tsx
import type { Pago } from "@/lib/pagos-store";

type PagosTimelineProps = {
  pagos: Pago[];
};

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function PagosTimeline({ pagos }: PagosTimelineProps) {
  if (pagos.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay pagos registrados.</p>
    );
  }

  const ordenados = [...pagos].sort((a, b) => (a.fechaPago < b.fechaPago ? 1 : -1));

  return (
    <ol className="flex flex-col gap-6 border-l border-[var(--color-border)] pl-6">
      {ordenados.map((pago) => (
        <li key={pago.id} className="relative">
          <span
            className="absolute -left-[29px] top-1 h-3 w-3 rounded-full"
            style={{ backgroundColor: "var(--color-success-text)" }}
          />
          <p className="text-sm text-[var(--color-text)]">
            {pago.servicio} — {formatMonto(pago.monto)}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">{formatFecha(pago.fechaPago)}</p>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 8: Client detail page (`/dashboard/clientes/[id]`)

**Files:**
- Create: `app/dashboard/clientes/[id]/page.tsx`

**Interfaces:**
- Consumes: `useClientes`, `useSuscripciones`, `usePagos`, `PagosTimeline` (Task 7).

- [ ] **Step 1: Create the file**

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
  const { clientes } = useClientes();
  const { suscripciones } = useSuscripciones();
  const { pagos } = usePagos();

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

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds, route table includes `/dashboard/clientes/[id]`.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 9: Link the client name to the detail page

**Files:**
- Modify: `components/dashboard/clientes-table.tsx`

**Interfaces:**
- No new exports; internal change only.

- [ ] **Step 1: Add the `Link` import**

Change:
```tsx
import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";
```
to:
```tsx
import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";
```

- [ ] **Step 2: Turn the name cell into a link**

Change:
```tsx
                <td className="py-3 pr-4 text-[var(--color-text)]">{c.nombre}</td>
```
to:
```tsx
                <td className="py-3 pr-4">
                  <Link href={`/dashboard/clientes/${c.id}`} className="text-[var(--color-text)] underline">
                    {c.nombre}
                  </Link>
                </td>
```

- [ ] **Step 3: Verify it builds and lints clean**

Run: `npm run build`
Expected: build succeeds with NO errors anywhere.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 10: Manual QA

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk through the spec's verification checklist in a real browser**

Open `http://localhost:3000/dashboard/suscripciones` and check:
- Each row now has 3 icons: check (green), pencil, trash.
- Click the check icon on a `mensual` subscription → dialog shows a suggested date exactly 1 month after its current `proximoCobro`. Do the same for a `trimestral` (3 months) and `anual` (1 year) subscription — verify each suggestion independently.
- Edit the suggested date before confirming → after confirming, the table shows the edited date, not the original suggestion.
- Confirm without editing → table shows the suggested date.
- Clear the date field and try to confirm → inline error, dialog stays open.

Open `http://localhost:3000/dashboard/clientes` and check:
- Client names are now underlined links.
- Click a client with at least one subscription and the payment you just confirmed → lands on `/dashboard/clientes/[id]`, shows contact info, their subscriptions, and the payment appears at the top of the timeline (most recent first) with the right service/amount/date.
- Click a client with zero payments → timeline shows "Todavía no hay pagos registrados."
- Navigate directly to `/dashboard/clientes/some-fake-id-that-does-not-exist` → shows "Cliente no encontrado" with a working link back to `/dashboard/clientes`.
- "← Volver a Clientes" link works from the detail page.
- Resize to mobile width → detail page and confirm-payment dialog remain usable, no overflow breakage (same `min-w-0` fix from the Clientes task already covers this layout).
- Toggle dark theme → the green success accent (icon, dialog confirm button, timeline dots) adapts correctly, same as the red danger accent already does.

- [ ] **Step 3: Stop the dev server**

```bash
pkill -f "next dev"
```

- [ ] **Step 4: Leave the change as-is (no commit)**
