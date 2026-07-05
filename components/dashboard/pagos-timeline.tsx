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
