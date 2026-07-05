"use client";

import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";
import type { NuevaSuscripcion } from "@/lib/suscripciones-store";

type SuscripcionFormModalProps = {
  open: boolean;
  suscripcionAEditar: Suscripcion | null;
  clientes: Cliente[];
  onClose: () => void;
  onSave: (datos: NuevaSuscripcion) => void;
};

const FORM_VACIO: NuevaSuscripcion = {
  clienteId: "",
  servicio: "",
  monto: 0,
  ciclo: "mensual",
  proximoCobro: "",
};

function datosIniciales(suscripcionAEditar: Suscripcion | null): NuevaSuscripcion {
  return suscripcionAEditar
    ? {
        clienteId: suscripcionAEditar.clienteId,
        servicio: suscripcionAEditar.servicio,
        monto: suscripcionAEditar.monto,
        ciclo: suscripcionAEditar.ciclo,
        proximoCobro: suscripcionAEditar.proximoCobro,
      }
    : FORM_VACIO;
}

// El padre le pasa una `key` que cambia cada vez que el modal se abre
// (ver app/dashboard/suscripciones/page.tsx), así React remonta el
// componente en vez de sincronizar el formulario con un efecto.
export function SuscripcionFormModal({
  open,
  suscripcionAEditar,
  clientes,
  onClose,
  onSave,
}: SuscripcionFormModalProps) {
  const [form, setForm] = useState<NuevaSuscripcion>(() => datosIniciales(suscripcionAEditar));
  const [errores, setErrores] = useState<Partial<Record<keyof NuevaSuscripcion, string>>>({});

  if (!open) return null;

  function validar(): Partial<Record<keyof NuevaSuscripcion, string>> {
    const nuevosErrores: Partial<Record<keyof NuevaSuscripcion, string>> = {};
    if (!form.clienteId) nuevosErrores.clienteId = "Seleccioná un cliente.";
    if (!form.servicio.trim()) nuevosErrores.servicio = "El servicio es obligatorio.";
    if (!form.monto || form.monto <= 0) nuevosErrores.monto = "El monto debe ser mayor a 0.";
    if (!form.proximoCobro) nuevosErrores.proximoCobro = "La fecha de próximo cobro es obligatoria.";
    return nuevosErrores;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text)]">
          {suscripcionAEditar ? "Editar suscripción" : "Nueva suscripción"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="clienteId">
              Cliente
            </label>
            <select
              id="clienteId"
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="">Seleccionar...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — {c.empresa}
                </option>
              ))}
            </select>
            {errores.clienteId && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.clienteId}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="servicio">
              Servicio
            </label>
            <input
              id="servicio"
              type="text"
              value={form.servicio}
              onChange={(e) => setForm({ ...form, servicio: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.servicio && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.servicio}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="monto">
              Monto
            </label>
            <input
              id="monto"
              type="number"
              min="0"
              step="0.01"
              value={form.monto === 0 ? "" : form.monto}
              onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.monto && <p className="text-sm text-[var(--color-danger-text)]">{errores.monto}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="ciclo">
              Ciclo
            </label>
            <select
              id="ciclo"
              value={form.ciclo}
              onChange={(e) =>
                setForm({ ...form, ciclo: e.target.value as NuevaSuscripcion["ciclo"] })
              }
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="proximoCobro">
              Próximo cobro
            </label>
            <input
              id="proximoCobro"
              type="date"
              value={form.proximoCobro}
              onChange={(e) => setForm({ ...form, proximoCobro: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.proximoCobro && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.proximoCobro}</p>
            )}
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
