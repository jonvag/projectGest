"use client";

import { motion } from "motion/react";
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
        <MetricCard
          label="Ingresos esperados este mes"
          value={ingresosDelMes}
          format={formatMonto}
          index={0}
        />
        <MetricCard
          label="Cobros vencidos"
          value={totalVencido}
          format={formatMonto}
          variant="danger"
          index={1}
        />
        <MetricCard label="Próximos cobros de la semana" value={proximos.length} index={2} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Cobros vencidos</h2>
        {vencidos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No hay cobros vencidos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {vencidos.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.04 }}
                className="group flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">
                  {nombreClienteDe(s)} · {s.servicio}
                </span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)] transition-transform duration-300 ease-out group-hover:-translate-x-2">
                  {formatMonto(s.monto)}
                </span>
              </motion.li>
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
            {proximos.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.04 }}
                className="group flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">
                  {nombreClienteDe(s)} · {s.servicio}
                </span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)] transition-transform duration-300 ease-out group-hover:-translate-x-2">
                  {formatMonto(s.monto)}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
