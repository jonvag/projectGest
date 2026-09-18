"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClienteFormModal } from "@/components/dashboard/cliente-form-modal";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { CrearAccesoModal } from "@/components/dashboard/crear-acceso-modal";
import { EmpresaClientesTable } from "@/components/dashboard/empresa-clientes-table";
import { ResetearPasswordModal } from "@/components/dashboard/resetear-password-modal";
import type { NuevoCliente } from "@/lib/clientes-store";
import { useEmpresaDetalle } from "@/lib/empresas-store";
import type { Cliente } from "@/lib/mock-data";

export default function EmpresaDetallePage() {
  const params = useParams<{ id: string }>();
  const {
    empresa,
    cargando,
    crearCliente,
    actualizarCliente,
    borrarCliente,
    crearAcceso,
    resetearPassword,
  } = useEmpresaDetalle(params.id);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<string | null>(null);
  const [clienteABorrar, setClienteABorrar] = useState<Cliente | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [clienteAcceso, setClienteAcceso] = useState<Cliente | null>(null);
  const [clienteReset, setClienteReset] = useState<Cliente | null>(null);

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
    const resultado = clienteAEditar
      ? await actualizarCliente(clienteAEditar.id, datos)
      : await crearCliente(datos);
    return resultado.ok ? null : resultado.error;
  }

  function pedirBorrar(cliente: Cliente) {
    setAvisoBorrado(null);
    setClienteABorrar(cliente);
  }

  function cancelarBorrar() {
    setClienteABorrar(null);
  }

  async function confirmarBorrar() {
    if (!clienteABorrar) return;
    setBorrando(true);
    const resultado = await borrarCliente(clienteABorrar.id);
    setBorrando(false);
    setClienteABorrar(null);
    if (!resultado.ok) {
      setAvisoBorrado(
        `${clienteABorrar.nombre} tiene ${resultado.suscripcionesAsociadas} suscripción(es) asociada(s). No se puede borrar.`,
      );
    }
  }

  async function confirmarAcceso(datos: { email: string; password: string }): Promise<string | null> {
    if (!clienteAcceso) return null;
    const resultado = await crearAcceso(clienteAcceso.id, datos);
    if (resultado.ok) {
      setClienteAcceso(null);
      return null;
    }
    return resultado.error;
  }

  async function confirmarReset(password: string): Promise<string | null> {
    if (!clienteReset) return null;
    const resultado = await resetearPassword(clienteReset.id, password);
    if (resultado.ok) {
      setClienteReset(null);
      return null;
    }
    return resultado.error;
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8 sm:px-10">
        <p className="text-[var(--color-text)]">Empresa no encontrada.</p>
        <Link href="/dashboard/empresas" className="text-sm text-[var(--color-text-muted)] underline">
          ← Volver a Empresas
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-[var(--color-text)]">{empresa.nombre ?? empresa.email}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{empresa.email}</p>
        </div>
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

      <EmpresaClientesTable
        clientes={empresa.clientes}
        onEditar={abrirEditar}
        onBorrar={pedirBorrar}
        onCrearAcceso={setClienteAcceso}
        onResetearPassword={setClienteReset}
      />

      <ClienteFormModal
        key={`${modalAbierto}-${clienteAEditar?.id ?? "nuevo"}`}
        open={modalAbierto}
        clienteAEditar={clienteAEditar}
        onClose={cerrarModal}
        onSave={guardar}
      />

      <ConfirmModal
        open={clienteABorrar !== null}
        titulo="Borrar cliente"
        mensaje={`¿Borrar a ${clienteABorrar?.nombre ?? ""}? Esta acción no se puede deshacer.`}
        confirmando={borrando}
        onCancelar={cancelarBorrar}
        onConfirmar={confirmarBorrar}
      />

      <CrearAccesoModal
        key={clienteAcceso?.id ?? "ninguno"}
        open={clienteAcceso !== null}
        nombreCliente={clienteAcceso?.nombre ?? ""}
        onClose={() => setClienteAcceso(null)}
        onCrear={confirmarAcceso}
      />

      <ResetearPasswordModal
        key={`reset-${clienteReset?.id ?? "ninguno"}`}
        open={clienteReset !== null}
        nombreCliente={clienteReset?.nombre ?? ""}
        onClose={() => setClienteReset(null)}
        onResetear={confirmarReset}
      />
    </div>
  );
}
