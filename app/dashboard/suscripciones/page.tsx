"use client";

import { useState } from "react";
import { ConfirmarPagoModal } from "@/components/dashboard/confirmar-pago-modal";
import { SuscripcionFormModal } from "@/components/dashboard/suscripcion-form-modal";
import { SuscripcionesTable } from "@/components/dashboard/suscripciones-table";
import { useClientes } from "@/lib/clientes-store";
import { toISODate, type Suscripcion } from "@/lib/mock-data";
import { usePagos } from "@/lib/pagos-store";
import { useSuscripciones, type NuevaSuscripcion } from "@/lib/suscripciones-store";

export default function SuscripcionesPage() {
  const { clientes } = useClientes();
  const { suscripciones, addSuscripcion, updateSuscripcion, deleteSuscripcion } = useSuscripciones();
  const { addPago } = usePagos();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [suscripcionAEditar, setSuscripcionAEditar] = useState<Suscripcion | null>(null);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [suscripcionAPagar, setSuscripcionAPagar] = useState<Suscripcion | null>(null);

  function abrirNueva() {
    setSuscripcionAEditar(null);
    setModalAbierto(true);
  }

  function abrirEditar(suscripcion: Suscripcion) {
    setSuscripcionAEditar(suscripcion);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setSuscripcionAEditar(null);
  }

  function abrirConfirmarPago(suscripcion: Suscripcion) {
    setSuscripcionAPagar(suscripcion);
    setModalPagoAbierto(true);
  }

  function cerrarConfirmarPago() {
    setModalPagoAbierto(false);
    setSuscripcionAPagar(null);
  }

  function confirmarPago(fechaProximoCobro: string) {
    if (!suscripcionAPagar) return;
    addPago({
      suscripcionId: suscripcionAPagar.id,
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      fechaPago: toISODate(new Date()),
      fechaCobroAnterior: suscripcionAPagar.proximoCobro,
      fechaProximoCobroNueva: fechaProximoCobro,
    });
    updateSuscripcion(suscripcionAPagar.id, {
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      ciclo: suscripcionAPagar.ciclo,
      proximoCobro: fechaProximoCobro,
    });
    cerrarConfirmarPago();
  }

  function guardar(datos: NuevaSuscripcion) {
    if (suscripcionAEditar) {
      updateSuscripcion(suscripcionAEditar.id, datos);
    } else {
      addSuscripcion(datos);
    }
  }

  function borrar(suscripcion: Suscripcion) {
    const nombreCliente =
      clientes.find((c) => c.id === suscripcion.clienteId)?.nombre ?? "este cliente";
    if (
      !window.confirm(
        `¿Borrar la suscripción "${suscripcion.servicio}" de ${nombreCliente}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    deleteSuscripcion(suscripcion.id);
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-[var(--color-text)]">Suscripciones</h1>
        <button
          type="button"
          onClick={abrirNueva}
          className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
        >
          Nueva suscripción
        </button>
      </div>

      <SuscripcionesTable
        suscripciones={suscripciones}
        clientes={clientes}
        onEditar={abrirEditar}
        onBorrar={borrar}
        onMarcarPagado={abrirConfirmarPago}
      />

      <SuscripcionFormModal
        key={`${modalAbierto}-${suscripcionAEditar?.id ?? "nueva"}`}
        open={modalAbierto}
        suscripcionAEditar={suscripcionAEditar}
        clientes={clientes}
        onClose={cerrarModal}
        onSave={guardar}
      />

      <ConfirmarPagoModal
        key={`${modalPagoAbierto}-${suscripcionAPagar?.id ?? "ninguna"}`}
        open={modalPagoAbierto}
        suscripcion={suscripcionAPagar}
        cliente={clientes.find((c) => c.id === suscripcionAPagar?.clienteId) ?? null}
        onClose={cerrarConfirmarPago}
        onConfirmar={confirmarPago}
      />
    </div>
  );
}
