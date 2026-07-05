"use client";

import { useState } from "react";
import type { Cliente } from "@/lib/mock-data";
import type { NuevoCliente } from "@/lib/clientes-store";

type ClienteFormModalProps = {
  open: boolean;
  clienteAEditar: Cliente | null;
  onClose: () => void;
  onSave: (datos: NuevoCliente) => string | null;
};

const FORM_VACIO: NuevoCliente = { nombre: "", empresa: "", contactId: "", email: "" };

function datosIniciales(clienteAEditar: Cliente | null): NuevoCliente {
  return clienteAEditar
    ? {
        nombre: clienteAEditar.nombre,
        empresa: clienteAEditar.empresa,
        contactId: clienteAEditar.contactId,
        email: clienteAEditar.email,
      }
    : FORM_VACIO;
}

// El padre le pasa una `key` que cambia cada vez que el modal se abre
// (ver app/dashboard/clientes/page.tsx), así React remonta el componente
// en vez de tener que sincronizar el formulario con un efecto.
export function ClienteFormModal({ open, clienteAEditar, onClose, onSave }: ClienteFormModalProps) {
  const [form, setForm] = useState<NuevoCliente>(() => datosIniciales(clienteAEditar));
  const [errores, setErrores] = useState<Partial<Record<keyof NuevoCliente, string>>>({});

  if (!open) return null;

  function validar(): Partial<Record<keyof NuevoCliente, string>> {
    const nuevosErrores: Partial<Record<keyof NuevoCliente, string>> = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = "El nombre es obligatorio.";
    if (!form.empresa.trim()) nuevosErrores.empresa = "La empresa es obligatoria.";
    if (!form.contactId.trim()) nuevosErrores.contactId = "El teléfono de contacto es obligatorio.";
    if (!form.email.trim()) {
      nuevosErrores.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nuevosErrores.email = "El email no tiene un formato válido.";
    }
    return nuevosErrores;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    const errorDeGuardado = onSave(form);
    if (errorDeGuardado) {
      setErrores({ email: errorDeGuardado });
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text)]">
          {clienteAEditar ? "Editar cliente" : "Nuevo cliente"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.nombre && <p className="text-sm text-[var(--color-danger-text)]">{errores.nombre}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa">
              Empresa
            </label>
            <input
              id="empresa"
              type="text"
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.empresa && <p className="text-sm text-[var(--color-danger-text)]">{errores.empresa}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="contactId">
              Teléfono de contacto (notificaciones)
            </label>
            <input
              id="contactId"
              type="text"
              value={form.contactId}
              onChange={(e) => setForm({ ...form, contactId: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.contactId && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.contactId}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.email && <p className="text-sm text-[var(--color-danger-text)]">{errores.email}</p>}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
