"use client";

import { useNotificaciones } from "@/lib/notificaciones-store";

function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function NotificacionesPage() {
  const { notificaciones, cargando } = useNotificaciones();

  if (cargando) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <h1 className="text-xl font-medium text-[var(--color-text)]">Notificaciones</h1>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="py-2 pr-4 font-medium">Servicio</th>
              <th className="py-2 pr-4 font-medium">Canal</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {notificaciones.map((n) => (
              <tr key={n.id}>
                <td className="py-3 pr-4 text-[var(--color-text)]">{n.cliente.nombre}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{n.suscripcion.servicio}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{n.canal}</td>
                <td className="py-3 pr-4">
                  <span
                    className={
                      n.estado === "enviado"
                        ? "text-[var(--color-success-text)]"
                        : "text-[var(--color-danger-text)]"
                    }
                  >
                    {n.estado === "enviado" ? "Enviado" : "Falló"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{formatFecha(n.enviadoEn)}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{n.detalle ?? "—"}</td>
              </tr>
            ))}
            {notificaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--color-text-muted)]">
                  Todavía no hay notificaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
