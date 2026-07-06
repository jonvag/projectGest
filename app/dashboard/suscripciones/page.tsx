"use client";

import { useState } from "react";
import { ConfirmarPagoModal } from "@/components/dashboard/confirmar-pago-modal";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { SuscripcionFormModal } from "@/components/dashboard/suscripcion-form-modal";
import { SuscripcionesTable } from "@/components/dashboard/suscripciones-table";
import { useClientes } from "@/lib/clientes-store";
import { toISODate, type Suscripcion } from "@/lib/mock-data";
import { usePagos } from "@/lib/pagos-store";
import { useSuscripciones, type NuevaSuscripcion } from "@/lib/suscripciones-store";

export default function SuscripcionesPage() {
  const { clientes, cargando: cargandoClientes } = useClientes();
  const {
    suscripciones,
    cargando: cargandoSuscripciones,
    addSuscripcion,
    updateSuscripcion,
    deleteSuscripcion,
  } = useSuscripciones();
  const { addPago } = usePagos();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [suscripcionAEditar, setSuscripcionAEditar] = useState<Suscripcion | null>(null);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [suscripcionAPagar, setSuscripcionAPagar] = useState<Suscripcion | null>(null);
  const [suscripcionABorrar, setSuscripcionABorrar] = useState<Suscripcion | null>(null);
  const [borrando, setBorrando] = useState(false);

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

  async function guardar(datos: NuevaSuscripcion): Promise<string | null> {
    const resultado = suscripcionAEditar
      ? await updateSuscripcion(suscripcionAEditar.id, datos)
      : await addSuscripcion(datos);
    return resultado.ok ? null : resultado.error;
  }

  function pedirBorrar(suscripcion: Suscripcion) {
    setSuscripcionABorrar(suscripcion);
  }

  function cancelarBorrar() {
    setSuscripcionABorrar(null);
  }

  async function confirmarBorrar() {
    if (!suscripcionABorrar) return;
    setBorrando(true);
    await deleteSuscripcion(suscripcionABorrar.id);
    setBorrando(false);
    setSuscripcionABorrar(null);
  }

  async function confirmarPago(fechaProximoCobro: string): Promise<string | null> {
    if (!suscripcionAPagar) return null;
    const resultado = await updateSuscripcion(suscripcionAPagar.id, {
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      ciclo: suscripcionAPagar.ciclo,
      proximoCobro: fechaProximoCobro,
    });
    if (!resultado.ok) {
      return resultado.error;
    }
    await addPago({
      suscripcionId: suscripcionAPagar.id,
      clienteId: suscripcionAPagar.clienteId,
      servicio: suscripcionAPagar.servicio,
      monto: suscripcionAPagar.monto,
      fechaPago: toISODate(new Date()),
      fechaCobroAnterior: suscripcionAPagar.proximoCobro,
      fechaProximoCobroNueva: fechaProximoCobro,
    });
    cerrarConfirmarPago();
    return null;
  }

  if (cargandoClientes || cargandoSuscripciones) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
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
        onBorrar={pedirBorrar}
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

      <ConfirmModal
        open={suscripcionABorrar !== null}
        titulo="Borrar suscripción"
        mensaje={`¿Borrar la suscripción "${suscripcionABorrar?.servicio ?? ""}" de ${
          clientes.find((c) => c.id === suscripcionABorrar?.clienteId)?.nombre ?? "este cliente"
        }? Esta acción no se puede deshacer.`}
        confirmando={borrando}
        onCancelar={cancelarBorrar}
        onConfirmar={confirmarBorrar}
      />
    </div>
  );
}
