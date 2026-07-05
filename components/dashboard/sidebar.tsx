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
    </nav>
  );
}
