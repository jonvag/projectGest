"use client";

import { useState } from "react";
import { ClienteFormModal } from "@/components/dashboard/cliente-form-modal";
import { ClientesTable } from "@/components/dashboard/clientes-table";
import { useClientes, type NuevoCliente } from "@/lib/clientes-store";
import type { Cliente } from "@/lib/mock-data";
import { useSuscripciones } from "@/lib/suscripciones-store";

export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente, isEmailTaken } = useClientes();
  const { suscripciones } = useSuscripciones();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<string | null>(null);

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

  function guardar(datos: NuevoCliente): string | null {
    if (isEmailTaken(datos.email, clienteAEditar?.id)) {
      return "Ya existe un cliente con ese email.";
    }
    if (clienteAEditar) {
      updateCliente(clienteAEditar.id, datos);
    } else {
      addCliente(datos);
    }
    return null;
  }

  function borrar(cliente: Cliente) {
    setAvisoBorrado(null);
    const asociadas = suscripciones.filter((s) => s.clienteId === cliente.id).length;
    if (asociadas > 0) {
      setAvisoBorrado(
        `${cliente.nombre} tiene ${asociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
      return;
    }
    if (!window.confirm(`¿Borrar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }
    const resultado = deleteCliente(cliente.id, suscripciones);
    if (!resultado.ok) {
      setAvisoBorrado(
        `${cliente.nombre} tiene ${resultado.suscripcionesAsociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
    }
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
        onEditar={abrirEditar}
        onBorrar={borrar}
      />

      <ClienteFormModal
        key={`${modalAbierto}-${clienteAEditar?.id ?? "nuevo"}`}
        open={modalAbierto}
        clienteAEditar={clienteAEditar}
        onClose={cerrarModal}
        onSave={guardar}
      />
    </div>
  );
}
