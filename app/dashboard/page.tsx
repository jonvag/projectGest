"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { useClientes } from "@/lib/clientes-store";
import {
  getCobrosVencidos,
  getIngresosEsperadosDelMes,
  getProximosCobrosDeLaSemana,
  type Suscripcion,
} from "@/lib/mock-data";
import { useSuscripciones } from "@/lib/suscripciones-store";

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
  const { clientes, cargando: cargandoClientes } = useClientes();
  const { suscripciones, cargando: cargandoSuscripciones } = useSuscripciones();

  function nombreClienteDe(suscripcion: Suscripcion): string {
    return clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "Cliente desconocido";
  }

  if (cargandoClientes || cargandoSuscripciones) {
    return (
      <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  const ingresosDelMes = getIngresosEsperadosDelMes(suscripciones);
  const vencidos = getCobrosVencidos(suscripciones);
  const proximos = getProximosCobrosDeLaSemana(suscripciones);
  const totalVencido = vencidos.reduce((total, s) => total + s.monto, 0);

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
            {vencidos.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">
                  {nombreClienteDe(s)} · {s.servicio}
                </span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(s.monto)}</span>
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
            {proximos.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">
                  {nombreClienteDe(s)} · {s.servicio}
                </span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(s.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
