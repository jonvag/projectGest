"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PagosTimeline } from "@/components/dashboard/pagos-timeline";
import { useClientes } from "@/lib/clientes-store";
import type { Suscripcion } from "@/lib/mock-data";
import { usePagos } from "@/lib/pagos-store";
import { useSuscripciones } from "@/lib/suscripciones-store";

const ETIQUETA_CICLO: Record<Suscripcion["ciclo"], string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const { clientes, cargando: cargandoClientes } = useClientes();
  const { suscripciones, cargando: cargandoSuscripciones } = useSuscripciones();
  const { pagos, cargando: cargandoPagos } = usePagos();

  if (cargandoClientes || cargandoSuscripciones || cargandoPagos) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  const cliente = clientes.find((c) => c.id === params.id);

  if (!cliente) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8 sm:px-10">
        <p className="text-[var(--color-text)]">Cliente no encontrado.</p>
        <Link href="/dashboard/clientes" className="text-sm text-[var(--color-text)] underline">
          Volver a Clientes
        </Link>
      </div>
    );
  }

  const suscripcionesDelCliente = suscripciones.filter((s) => s.clienteId === cliente.id);
  const pagosDelCliente = pagos.filter((p) => p.clienteId === cliente.id);

  return (
    <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <div>
        <Link href="/dashboard/clientes" className="text-sm text-[var(--color-text-muted)] underline">
          ← Volver a Clientes
        </Link>
        <h1 className="mt-2 text-xl font-medium text-[var(--color-text)]">{cliente.nombre}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{cliente.empresa}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Datos de contacto</h2>
        <p className="text-sm text-[var(--color-text-muted)]">ContactId: {cliente.contactId}</p>
        <p className="text-sm text-[var(--color-text-muted)]">Email: {cliente.email}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Suscripciones</h2>
        {suscripcionesDelCliente.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin suscripciones.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {suscripcionesDelCliente.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <span className="text-[var(--color-text)]">{s.servicio}</span>
                <span className="text-[var(--color-text-muted)]">{ETIQUETA_CICLO[s.ciclo]}</span>
                <span className="text-[var(--color-text-muted)]">{formatFecha(s.proximoCobro)}</span>
                <span className="text-[var(--color-text)]">{formatMonto(s.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">Historial de pagos</h2>
        <PagosTimeline pagos={pagosDelCliente} />
      </section>
    </div>
  );
}
