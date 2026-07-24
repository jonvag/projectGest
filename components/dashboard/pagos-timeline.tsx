import type { Cliente } from "@/lib/mock-data";
import type { Pago } from "@/lib/pagos-store";

type PagosTimelineProps = {
  pagos: Pago[];
  /** Solo se pasa en vistas que mezclan pagos de varios clientes (ej. historial general). */
  clientes?: Cliente[];
};

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function PagosTimeline({ pagos, clientes }: PagosTimelineProps) {
  if (pagos.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay pagos registrados.</p>
    );
  }

  const ordenados = [...pagos].sort((a, b) => (a.fechaPago < b.fechaPago ? 1 : -1));

  function nombreClienteDe(clienteId: string): string {
    return clientes?.find((c) => c.id === clienteId)?.nombre ?? "Cliente desconocido";
  }

  return (
    <ol className="flex flex-col gap-6 border-l border-[var(--color-border)] pl-6">
      {ordenados.map((pago) => (
        <li key={pago.id} className="relative">
          <span
            className="absolute -left-[29px] top-1 h-3 w-3 rounded-full"
            style={{ backgroundColor: "var(--color-success-text)" }}
          />
          <p className="text-sm text-[var(--color-text)]">
            {clientes ? `${nombreClienteDe(pago.clienteId)} · ` : ""}
            {pago.servicio} — {formatMonto(pago.monto)}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {formatFecha(pago.fechaPago)}
            {pago.referencia ? ` · ref: ${pago.referencia}` : ""}
          </p>
          {pago.descripcion && (
            <p className="text-sm text-[var(--color-text-muted)]">{pago.descripcion}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
