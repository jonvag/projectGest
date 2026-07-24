"use client";

import { PagosTimeline } from "@/components/dashboard/pagos-timeline";
import { useClientes } from "@/lib/clientes-store";
import { usePagos } from "@/lib/pagos-store";

export default function HistorialPagosPage() {
  const { clientes, cargando: cargandoClientes } = useClientes();
  const { pagos, cargando: cargandoPagos } = usePagos();

  if (cargandoClientes || cargandoPagos) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <h1 className="text-xl font-medium text-[var(--color-text)]">Historial de pagos</h1>
      <PagosTimeline pagos={pagos} clientes={clientes} />
    </div>
  );
}
