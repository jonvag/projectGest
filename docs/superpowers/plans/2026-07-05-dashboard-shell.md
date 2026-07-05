# Shell + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the sidebar navigation shell and the Dashboard (3 payment metrics + 2 detail lists) described in `docs/superpowers/specs/2026-07-05-dashboard-shell-design.md`, backed by mock data, and wire the landing's login button to it.

**Architecture:** A new `/dashboard` route group with its own layout (sidebar + content area). Pure functions in `lib/mock-data.ts` derive the 3 metrics from a typed mock array, isolated from the UI so they can be swapped for real queries later without touching any component. Three sibling routes (`/dashboard/clientes`, `/dashboard/suscripciones`, `/dashboard/notificaciones`) render a shared "Próximamente" placeholder.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, existing CSS-variable theme system from the landing (no new dependencies).

## Global Constraints

- No database — all data comes from a hardcoded, typed mock array in `lib/mock-data.ts`.
- No automated tests for this sub-project (explicit decision in the spec) — verification is `npm run build` plus manual/browser QA.
- **No git commits.** The user commits changes themselves. Every task below ends with a verification step, not a commit — leave the working tree as-is when a task is done.
- Dates in mock data must be computed relative to the current date at runtime (via `new Date()`), never hardcoded literal dates, so the demo stays meaningful regardless of when it's viewed.
- Visual style follows `.agents/skills/minimalist-ui/SKILL.md` and reuses the existing CSS variables from `app/globals.css` (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`) plus new danger-accent variables added in Task 2.
- Copy is in Spanish, matching the rest of the app.

---

### Task 1: Mock data and metric calculations

**Files:**
- Create: `lib/mock-data.ts`

**Interfaces:**
- Produces: `type Cliente`, `clientes: Cliente[]`, `getIngresosEsperadosDelMes(clientes: Cliente[], hoy?: Date): number`, `getCobrosVencidos(clientes: Cliente[], hoy?: Date): Cliente[]`, `getProximosCobrosDeLaSemana(clientes: Cliente[], hoy?: Date): Cliente[]`. Consumed by Task 6 (`app/dashboard/page.tsx`).

- [ ] **Step 1: Create the file**

```ts
export type Cliente = {
  id: string;
  nombre: string;
  empresa: string;
  numeroTlf: string;
  email: string;
  servicios: string[];
  monto: number;
  ciclo: "mensual" | "anual";
  proximoCobro: string; // ISO date (YYYY-MM-DD)
};

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

export const clientes: Cliente[] = [
  {
    id: "1",
    nombre: "Ana Torres",
    empresa: "Torres Diseño",
    numeroTlf: "+54 11 5555-0101",
    email: "ana@torresdiseno.com",
    servicios: ["Página web"],
    monto: 100,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(-10),
  },
  {
    id: "2",
    nombre: "Bruno Cabrera",
    empresa: "Cabrera Software",
    numeroTlf: "+54 11 5555-0102",
    email: "bruno@cabrerasoftware.com",
    servicios: ["Mantenimiento mensual", "Hosting"],
    monto: 150,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(-3),
  },
  {
    id: "3",
    nombre: "Carla Núñez",
    empresa: "Núñez Studio",
    numeroTlf: "+54 11 5555-0103",
    email: "carla@nunezstudio.com",
    servicios: ["App móvil"],
    monto: 500,
    ciclo: "anual",
    proximoCobro: isoDateOffset(2),
  },
  {
    id: "4",
    nombre: "Diego Fernández",
    empresa: "Fernández Web",
    numeroTlf: "+54 11 5555-0104",
    email: "diego@fernandezweb.com",
    servicios: ["Página web", "SEO"],
    monto: 120,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(5),
  },
  {
    id: "5",
    nombre: "Elena Ríos",
    empresa: "Ríos Consulting",
    numeroTlf: "+54 11 5555-0105",
    email: "elena@riosconsulting.com",
    servicios: ["Mantenimiento mensual"],
    monto: 90,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(20),
  },
  {
    id: "6",
    nombre: "Franco Ibáñez",
    empresa: "Ibáñez Corp",
    numeroTlf: "+54 11 5555-0106",
    email: "franco@ibanezcorp.com",
    servicios: ["Página web"],
    monto: 100,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(40),
  },
];

export function getIngresosEsperadosDelMes(clientesList: Cliente[], hoy: Date = new Date()): number {
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();
  return clientesList
    .filter((c) => {
      const { year, month } = parseISODate(c.proximoCobro);
      return year === anioActual && month === mesActual;
    })
    .reduce((total, c) => total + c.monto, 0);
}

export function getCobrosVencidos(clientesList: Cliente[], hoy: Date = new Date()): Cliente[] {
  const hoyISO = toISODate(hoy);
  return clientesList.filter((c) => c.proximoCobro < hoyISO);
}

export function getProximosCobrosDeLaSemana(clientesList: Cliente[], hoy: Date = new Date()): Cliente[] {
  const hoyISO = toISODate(hoy);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 7);
  const limiteISO = toISODate(limite);
  return clientesList.filter((c) => c.proximoCobro >= hoyISO && c.proximoCobro <= limiteISO);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: build completes with no errors (this file isn't imported anywhere yet, but must compile standalone).

- [ ] **Step 3: Leave the change as-is**

Do not commit. The file stays in the working tree for the next task to consume.

---

### Task 2: Danger color tokens and `MetricCard` component

**Files:**
- Modify: `app/globals.css`
- Create: `components/dashboard/metric-card.tsx`

**Interfaces:**
- Produces: CSS vars `--color-danger-bg`, `--color-danger-border`, `--color-danger-text` (light on `:root`, dark on `.dark`), and `export function MetricCard({ label, value, variant }: { label: string; value: string; variant?: "default" | "danger" }): JSX.Element`. Consumed by Task 6.

- [ ] **Step 1: Add danger tokens to `app/globals.css`**

Add these three lines inside the existing `:root { ... }` block (alongside `--color-bg`, etc.):
```css
  --color-danger-bg: #fdebec;
  --color-danger-border: #f3c6c6;
  --color-danger-text: #9f2f2d;
```

Add these three lines inside the existing `.dark { ... }` block:
```css
  --color-danger-bg: #3a201f;
  --color-danger-border: #5a2e2c;
  --color-danger-text: #e08585;
```

Leave every other line in the file unchanged.

- [ ] **Step 2: Create `components/dashboard/metric-card.tsx`**

```tsx
type MetricCardProps = {
  label: string;
  value: string;
  variant?: "default" | "danger";
};

export function MetricCard({ label, value, variant = "default" }: MetricCardProps) {
  const isDanger = variant === "danger";

  return (
    <div
      className="rounded-lg border px-6 py-5"
      style={{
        backgroundColor: isDanger ? "var(--color-danger-bg)" : "var(--color-surface)",
        borderColor: isDanger ? "var(--color-danger-border)" : "var(--color-border)",
      }}
    >
      <p
        className="text-sm"
        style={{ color: isDanger ? "var(--color-danger-text)" : "var(--color-text-muted)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-2xl font-medium"
        style={{ color: isDanger ? "var(--color-danger-text)" : "var(--color-text)" }}
      >
        {value}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Leave the change as-is (no commit)**

---

### Task 3: `Sidebar` component

**Files:**
- Create: `components/dashboard/sidebar.tsx`

**Interfaces:**
- Produces: `export function Sidebar(): JSX.Element` — client component, no props. Consumed by Task 5 (`app/dashboard/layout.tsx`).
- Consumes: CSS vars `--color-border`, `--color-text`, `--color-bg`, `--color-surface`, `--color-text-muted` from `app/globals.css`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", available: true },
  { href: "/dashboard/clientes", label: "Clientes", available: false },
  { href: "/dashboard/suscripciones", label: "Suscripciones", available: false },
  { href: "/dashboard/notificaciones", label: "Notificaciones", available: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r border-[var(--color-border)] px-4 py-6">
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
    </nav>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 4: `ComingSoon` component and placeholder pages

**Files:**
- Create: `components/dashboard/coming-soon.tsx`
- Create: `app/dashboard/clientes/page.tsx`
- Create: `app/dashboard/suscripciones/page.tsx`
- Create: `app/dashboard/notificaciones/page.tsx`

**Interfaces:**
- Produces: `export function ComingSoon({ title }: { title: string }): JSX.Element`, consumed by the three page files in this same task.

- [ ] **Step 1: Create `components/dashboard/coming-soon.tsx`**

```tsx
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-medium text-[var(--color-text)]">{title}</h1>
      <p className="text-[var(--color-text-muted)]">Próximamente.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/clientes/page.tsx`**

```tsx
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function ClientesPage() {
  return <ComingSoon title="Clientes" />;
}
```

- [ ] **Step 3: Create `app/dashboard/suscripciones/page.tsx`**

```tsx
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function SuscripcionesPage() {
  return <ComingSoon title="Suscripciones" />;
}
```

- [ ] **Step 4: Create `app/dashboard/notificaciones/page.tsx`**

```tsx
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function NotificacionesPage() {
  return <ComingSoon title="Notificaciones" />;
}
```

- [ ] **Step 5: Verify it type-checks**

Run: `npm run build`
Expected: build completes with no errors. These three routes aren't reachable via the sidebar's active styling yet (that's already handled by Task 3), but they exist and render.

- [ ] **Step 6: Leave the change as-is (no commit)**

---

### Task 5: Dashboard layout

**Files:**
- Create: `app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `Sidebar` (`components/dashboard/sidebar.tsx`, no props).
- Produces: the layout wrapping every route under `/dashboard/*`, including the ones from Task 4 and Task 6.

- [ ] **Step 1: Create the file**

```tsx
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks and renders**

Run: `npm run build`
Expected: build completes with no errors, and the route table includes `/dashboard`, `/dashboard/clientes`, `/dashboard/suscripciones`, `/dashboard/notificaciones`.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 6: Dashboard page

**Files:**
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `MetricCard` (`components/dashboard/metric-card.tsx`), `clientes`, `getIngresosEsperadosDelMes`, `getCobrosVencidos`, `getProximosCobrosDeLaSemana` (all from `lib/mock-data.ts`, exact names as defined in Task 1).

- [ ] **Step 1: Create the file**

```tsx
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  clientes,
  getCobrosVencidos,
  getIngresosEsperadosDelMes,
  getProximosCobrosDeLaSemana,
} from "@/lib/mock-data";

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
  const ingresosDelMes = getIngresosEsperadosDelMes(clientes);
  const vencidos = getCobrosVencidos(clientes);
  const proximos = getProximosCobrosDeLaSemana(clientes);
  const totalVencido = vencidos.reduce((total, c) => total + c.monto, 0);

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
            {vencidos.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-[var(--color-text)]">{c.nombre}</span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(c.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(c.monto)}</span>
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
            {proximos.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-[var(--color-text)]">{c.nombre}</span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(c.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(c.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build completes with no errors, route table includes `/dashboard`.

- [ ] **Step 3: Leave the change as-is (no commit)**

---

### Task 7: Wire the login button and final QA

**Files:**
- Modify: `components/login-button.tsx`

**Interfaces:**
- No new exports; `LoginButton`'s signature (no props) is unchanged.

- [ ] **Step 1: Replace `components/login-button.tsx` entirely**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function LoginButton() {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      onClick={() => router.push("/dashboard")}
      whileTap={{ scale: 0.98 }}
      className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
    >
      Iniciar sesión
    </motion.button>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build completes with no errors, route table includes `/`, `/dashboard`, `/dashboard/clientes`, `/dashboard/suscripciones`, `/dashboard/notificaciones`.

- [ ] **Step 3: Manual QA with the dev server**

```bash
npm run dev
```
Open `http://localhost:3000` and check:
- Clicking "Iniciar sesión" on the landing navigates to `/dashboard`.
- The sidebar shows Dashboard (highlighted as active), Clientes, Suscripciones, Notificaciones.
- The Dashboard shows 3 metric cards with non-zero, plausible values; "Cobros vencidos" is visually red/danger-accented.
- Below the cards, two lists show the vencidos/próximos clients with name, date, and amount, matching the mock data.
- Clicking Clientes/Suscripciones/Notificaciones in the sidebar navigates to each route and shows "Próximamente".
- Resizing to mobile width keeps everything readable (cards stack vertically).
- Toggling light/dark theme (from the landing, since the dashboard doesn't have its own toggle yet) still applies correctly if you navigate to `/dashboard` afterward — the danger accent colors should also adapt.

Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 4: Leave the change as-is (no commit)**
