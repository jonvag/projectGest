"use client";

import { useState } from "react";
import { ClienteFormModal } from "@/components/dashboard/cliente-form-modal";
import { ClientesTable } from "@/components/dashboard/clientes-table";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { useClientes, type NuevoCliente } from "@/lib/clientes-store";
import { useEmpresas } from "@/lib/empresas-store";
import type { Cliente } from "@/lib/mock-data";
import { useSesion } from "@/lib/sesion-store";
import { useSuscripciones } from "@/lib/suscripciones-store";

export default function ClientesPage() {
  const { clientes, cargando: cargandoClientes, addCliente, updateCliente, deleteCliente, isEmailTaken } =
    useClientes();
  const { suscripciones, cargando: cargandoSuscripciones } = useSuscripciones();
  const { sesion } = useSesion();
  const esSuperuser = sesion?.rol === "SUPERUSER";
  const { empresas } = useEmpresas();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<string | null>(null);
  const [clienteABorrar, setClienteABorrar] = useState<Cliente | null>(null);
  const [borrando, setBorrando] = useState(false);

  function abrirNuevo() {
    setClienteAEditar(null);
    setModalAbierto(true);
  }

  function abrirEditar(cliente: Cliente) {
    setClienteAEditar(cliente);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setClienteAEditar(null);
  }

  async function guardar(datos: NuevoCliente): Promise<string | null> {
    if (isEmailTaken(datos.email, clienteAEditar?.id)) {
      return "Ya existe un cliente con ese email.";
    }
    const resultado = clienteAEditar
      ? await updateCliente(clienteAEditar.id, datos)
      : await addCliente(datos);
    return resultado.ok ? null : resultado.error;
  }

  function pedirBorrar(cliente: Cliente) {
    setAvisoBorrado(null);
    const asociadas = suscripciones.filter((s) => s.clienteId === cliente.id).length;
    if (asociadas > 0) {
      setAvisoBorrado(
        `${cliente.nombre} tiene ${asociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
      return;
    }
    setClienteABorrar(cliente);
  }

  function cancelarBorrar() {
    setClienteABorrar(null);
  }

  async function confirmarBorrar() {
    if (!clienteABorrar) return;
    setBorrando(true);
    const resultado = await deleteCliente(clienteABorrar.id);
    setBorrando(false);
    setClienteABorrar(null);
    if (!resultado.ok) {
      setAvisoBorrado(
        `${clienteABorrar.nombre} tiene ${resultado.suscripcionesAsociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
    }
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
        <h1 className="text-xl font-medium text-[var(--color-text)]">Clientes</h1>
        <button
          type="button"
          onClick={abrirNuevo}
          className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
        >
          Nuevo cliente
        </button>
      </div>

      {avisoBorrado && (
        <p className="rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-2 text-sm text-[var(--color-danger-text)]">
          {avisoBorrado}
        </p>
      )}

      <ClientesTable
        clientes={clientes}
        suscripciones={suscripciones}
        empresas={esSuperuser ? empresas : undefined}
        onEditar={abrirEditar}
        onBorrar={pedirBorrar}
      />

      <ClienteFormModal
        key={`${modalAbierto}-${clienteAEditar?.id ?? "nuevo"}`}
        open={modalAbierto}
        clienteAEditar={clienteAEditar}
        onClose={cerrarModal}
        onSave={guardar}
        empresas={esSuperuser ? empresas : undefined}
      />

      <ConfirmModal
        open={clienteABorrar !== null}
        titulo="Borrar cliente"
        mensaje={`¿Borrar a ${clienteABorrar?.nombre ?? ""}? Esta acción no se puede deshacer.`}
        confirmando={borrando}
        onCancelar={cancelarBorrar}
        onConfirmar={confirmarBorrar}
      />
    </div>
  );
}
