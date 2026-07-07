"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Rol } from "@prisma/client";

const NAV_ITEMS_BASE = [
  { href: "/dashboard", label: "Dashboard", available: true },
  { href: "/dashboard/clientes", label: "Clientes", available: true },
  { href: "/dashboard/suscripciones", label: "Suscripciones", available: true },
  { href: "/dashboard/notificaciones", label: "Notificaciones", available: true },
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
