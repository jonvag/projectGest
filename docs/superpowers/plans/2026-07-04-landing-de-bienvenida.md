# Landing de Bienvenida (projectGest) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js project and build the single-viewport welcome landing (nav + hero + theme toggle + login button stub) described in `docs/superpowers/specs/2026-07-04-landing-de-bienvenida-design.md`.

**Architecture:** A fresh Next.js (App Router, TypeScript, Tailwind CSS) project scaffolded at the repo root, styled via CSS custom properties (light/dark tokens) so the theme toggle only needs to add/remove a `.dark` class on `<html>`. Two small client components (`ThemeToggle`, `LoginButton`) hold the only interactive logic; `Nav`, `Hero` and `page.tsx` are composition only.

**Tech Stack:** Next.js (latest stable), React, TypeScript, Tailwind CSS, `motion` (v12+), npm, Node v20.20.2.

## Global Constraints

- Next.js project lives at the repo root (not a subfolder) — matches the existing `Dockerfile`'s `COPY . .` / `npm run build`.
- Node version: `v20.20.2` (the one installed locally).
- Package manager: npm.
- No routes/logic beyond the landing itself. The login button has no real navigation or auth — it only needs to not crash on click.
- No test runner exists or is being introduced in this plan (per the approved spec, this stage has no business logic to unit test). "Test" steps below are `npm run build` (type-check + compile) plus a manual QA checklist, matching the spec's own Testing section.
- Visual rules come from `.agents/skills/minimalist-ui/SKILL.md`: warm monochrome palette, `1px solid` borders, no gradients/heavy shadows, editorial serif for the hero headline vs. sans-serif for UI/body text.
- Copy is fixed by the spec: product name `projectGest`, tagline "Control de clientes, servicios y cobros en un solo lugar.", button label "Iniciar sesión".

---

### Task 1: Scaffold the Next.js project and install `motion`

**Files:**
- Create (via `create-next-app`, copied into repo root): `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.*`, `postcss.config.mjs`, `next-env.d.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/favicon.ico`, `public/*`, ESLint config file.
- Modify: none (repo currently has no `package.json`).

**Interfaces:**
- Produces: a runnable Next.js app (`npm run dev`, `npm run build`) at repo root, with `motion` in `dependencies`. Later tasks add `app/globals.css` content, `app/layout.tsx` content, and files under `components/`.

We scaffold into a sibling temp directory first (this repo already has `.git`, `.gitignore`, `docs/`, `Dockerfile`, etc. — scaffolding straight into a non-empty directory is unreliable across `create-next-app` versions), then copy the generated files in, excluding anything that would clobber our existing `.git`/`.gitignore`.

- [ ] **Step 1: Scaffold into a temp sibling directory**

Run (from the repo root):
```bash
cd ..
npx --yes create-next-app@latest projectgest-scaffold \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias "@/*" --use-npm --yes
```
Expected: command exits 0; `../projectgest-scaffold` now contains `app/`, `public/`, `package.json`, `tsconfig.json`, etc.

- [ ] **Step 2: Copy generated files into the repo root**

```bash
cd administradorProyectos
rsync -a --exclude='.git' --exclude='.gitignore' --exclude='node_modules' --exclude='README.md' ../projectgest-scaffold/ ./
rm -rf ../projectgest-scaffold
```
Expected: `ls` at repo root now shows `app/`, `public/`, `package.json`, `tsconfig.json`, `postcss.config.mjs` (or `tailwind.config.ts` if the scaffold used Tailwind v3), `next-env.d.ts`, alongside the pre-existing `docs/`, `Dockerfile`, `docker-compose.yml`, `.gitignore` (untouched).

- [ ] **Step 3: Install dependencies and add `motion`**

```bash
npm install
npm install motion@^12
```
Expected: both commands exit 0; `package.json` now lists `motion` under `dependencies`.

- [ ] **Step 4: Verify the scaffold builds**

```bash
npm run build
```
Expected: build completes with no errors and the route table lists `/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind and motion"
```

---

### Task 2: Global color tokens, theme init script, and fonts

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted` (light values on `:root`, dark values on `.dark`), and font CSS variables `--font-geist-sans`, `--font-geist-mono`, `--font-newsreader` available on `<body>`. Later tasks (3–6) consume these var names directly.

- [ ] **Step 1: Check the scaffolded Tailwind version**

```bash
npm ls tailwindcss
```
Note the major version — it determines the first line of `app/globals.css` below (v4 uses `@import "tailwindcss";`; v3 uses the three `@tailwind` directives).

- [ ] **Step 2: Replace `app/globals.css` entirely**

Tailwind v4 version:
```css
@import "tailwindcss";

:root {
  --color-bg: #fbfbfa;
  --color-surface: #ffffff;
  --color-border: #eaeaea;
  --color-text: #111111;
  --color-text-muted: #787774;
}

.dark {
  --color-bg: #111110;
  --color-surface: #1a1a18;
  --color-border: rgba(255, 255, 255, 0.1);
  --color-text: #f7f6f3;
  --color-text-muted: #a8a29a;
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  transition: background-color 200ms ease, color 200ms ease;
}
```

Tailwind v3 version (only if Step 1 showed `tailwindcss@3.x`): replace the first line above with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Replace `app/layout.tsx` entirely**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  title: "projectGest",
  description: "Control de clientes, servicios y cobros en un solo lugar.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored ? stored : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify it builds**

```bash
npm run build
```
Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add light/dark color tokens, fonts, and no-flash theme script"
```

---

### Task 3: `ThemeToggle` component

**Files:**
- Create: `components/theme-toggle.tsx`

**Interfaces:**
- Produces: `export function ThemeToggle(): JSX.Element` — a client component, no props. Reads/writes `localStorage["theme"]` and toggles the `.dark` class on `document.documentElement`. Consumed by Task 5 (`Nav`).
- Consumes: CSS vars `--color-border`, `--color-text` from Task 2.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-transform active:scale-95"
    >
      {isDark ? "Oscuro" : "Claro"}
    </button>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run build
```
Expected: build completes with no errors (the component isn't rendered anywhere yet, but must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add components/theme-toggle.tsx
git commit -m "feat: add ThemeToggle component"
```

---

### Task 4: `LoginButton` component

**Files:**
- Create: `components/login-button.tsx`

**Interfaces:**
- Produces: `export function LoginButton(): JSX.Element` — a client component, no props, no real navigation (only `console.log` on click). Consumed by Task 5 (`Nav`).
- Consumes: `motion` from the `motion/react` package (installed in Task 1); CSS vars `--color-text`, `--color-bg` from Task 2.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { motion } from "motion/react";

export function LoginButton() {
  return (
    <motion.button
      type="button"
      onClick={() => console.log("login clicked")}
      whileTap={{ scale: 0.98 }}
      className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
    >
      Iniciar sesión
    </motion.button>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run build
```
Expected: build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/login-button.tsx
git commit -m "feat: add LoginButton stub component"
```

---

### Task 5: `Nav` component

**Files:**
- Create: `components/nav.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` (`components/theme-toggle.tsx`, no props) and `LoginButton` (`components/login-button.tsx`, no props).
- Produces: `export function Nav(): JSX.Element`. Consumed by Task 7 (`app/page.tsx`).

- [ ] **Step 1: Create the component**

```tsx
import { LoginButton } from "./login-button";
import { ThemeToggle } from "./theme-toggle";

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 sm:px-10">
      <span className="text-sm font-medium tracking-tight text-[var(--color-text)]">
        projectGest
      </span>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <LoginButton />
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run build
```
Expected: build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/nav.tsx
git commit -m "feat: add Nav component"
```

---

### Task 6: `Hero` component

**Files:**
- Create: `components/hero.tsx`

**Interfaces:**
- Consumes: `motion` from `motion/react`; CSS vars `--color-text`, `--color-text-muted`, `--font-newsreader` from Task 2.
- Produces: `export function Hero(): JSX.Element`. Consumed by Task 7 (`app/page.tsx`).

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { motion } from "motion/react";

export function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1
        className="text-5xl italic tracking-tight text-[var(--color-text)] sm:text-6xl"
        style={{ fontFamily: "var(--font-newsreader)" }}
      >
        projectGest
      </h1>
      <p className="max-w-md text-base text-[var(--color-text-muted)]">
        Control de clientes, servicios y cobros en un solo lugar.
      </p>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run build
```
Expected: build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/hero.tsx
git commit -m "feat: add Hero component"
```

---

### Task 7: Assemble the page and final QA

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Nav` (`components/nav.tsx`, no props), `Hero` (`components/hero.tsx`, no props).

- [ ] **Step 1: Replace `app/page.tsx` entirely**

```tsx
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <Hero />
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: build completes with no errors, route table lists `/`.

- [ ] **Step 3: Manual QA with the dev server**

```bash
npm run dev
```
Open `http://localhost:3000` and check:
- Landing shows "projectGest" nav on the left, theme toggle + "Iniciar sesión" button on the right, and the hero (name + tagline) centered in the remaining viewport.
- Clicking the theme toggle switches the whole page between light and dark colors instantly, with no flash on reload afterward.
- Reloading the page keeps the last chosen theme (check `localStorage.theme` in devtools).
- Resizing to a mobile width keeps the nav and hero readable and unbroken.
- Clicking "Iniciar sesión" logs `login clicked` to the browser console and does not throw or navigate anywhere.

Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: assemble landing page from Nav and Hero"
```
