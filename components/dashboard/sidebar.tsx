"use client";

import { Cross1Icon, ExitIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Rol } from "@prisma/client";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS_BASE = [
  { href: "/dashboard", label: "Dashboard", available: true },
  { href: "/dashboard/clientes", label: "Clientes", available: true },
  { href: "/dashboard/suscripciones", label: "Suscripciones", available: true },
  { href: "/dashboard/notificaciones", label: "Notificaciones", available: true },
  { href: "/dashboard/reportes-pago", label: "Reportes de pago", available: true },
  { href: "/dashboard/pagos", label: "Historial de pagos", available: true },
  { href: "/dashboard/perfil", label: "Mi perfil", available: true },
];

const ETIQUETA_ROL: Record<Rol, string> = {
  SUPERUSER: "Superuser",
  EMPRESA: "Empresa",
  CLIENTE: "Cliente",
};

type SidebarProps = {
  rol: Rol;
  nombre: string | null;
  email: string;
};

export function Sidebar({ rol, nombre, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const nombreMostrado = nombre ?? email;
  const [abierto, setAbierto] = useState(false);

  const navItems =
    rol === "SUPERUSER"
      ? [...NAV_ITEMS_BASE, { href: "/dashboard/empresas", label: "Empresas", available: true }]
      : NAV_ITEMS_BASE;

  // Cerrar el drawer mobile cada vez que cambia de ruta (al tocar un link).
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 backdrop-blur-md sm:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-md p-2 text-[var(--color-text)]"
        >
          <HamburgerMenuIcon />
        </button>
        <span className="text-sm font-medium tracking-tight text-[var(--color-text)]">projectGest</span>
        <button
          type="button"
          onClick={cerrarSesion}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="rounded-md p-2 text-[var(--color-text-muted)]"
        >
          <ExitIcon />
        </button>
      </div>

      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col gap-1 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-6 backdrop-blur-md transition-transform duration-200 sm:sticky sm:top-0 sm:z-auto sm:h-screen sm:w-56 sm:translate-x-0 sm:px-4 sm:backdrop-blur-none sm:transition-none ${abierto ? "translate-x-0" : ""}`}
      >
        <div className="mb-6 flex items-start justify-between gap-2 px-2">
          <div className="min-w-0">
            <span className="block text-sm font-medium tracking-tight text-[var(--color-text)]">
              projectGest
            </span>
            <span
              className="block truncate text-xs text-[var(--color-text-muted)]"
              title={nombreMostrado}
            >
              {nombreMostrado}
            </span>
            <span className="block text-xs text-[var(--color-text-muted)]">{ETIQUETA_ROL[rol]}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="rounded-md p-1.5 text-[var(--color-text)] sm:hidden"
            >
              <Cross1Icon />
            </button>
          </div>
        </div>
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
    </>
  );
}
