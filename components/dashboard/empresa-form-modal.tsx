"use client";

import { useState } from "react";
import type { NuevaEmpresa } from "@/lib/empresas-store";

type EmpresaFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (datos: NuevaEmpresa) => Promise<string | null>;
};

const FORM_VACIO: NuevaEmpresa = { nombre: "", email: "", password: "" };

export function EmpresaFormModal({ open, onClose, onSave }: EmpresaFormModalProps) {
  const [form, setForm] = useState<NuevaEmpresa>(FORM_VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof NuevaEmpresa, string>>>({});
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  function validar(): Partial<Record<keyof NuevaEmpresa, string>> {
    const nuevosErrores: Partial<Record<keyof NuevaEmpresa, string>> = {};
    if (!form.email.trim()) {
      nuevosErrores.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nuevosErrores.email = "El email no tiene un formato válido.";
    }
    if (!form.password.trim()) nuevosErrores.password = "La contraseña es obligatoria.";
    return nuevosErrores;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    setGuardando(true);
    const errorDeGuardado = await onSave(form);
    setGuardando(false);
    if (errorDeGuardado) {
      setErrores({ email: errorDeGuardado });
      return;
    }
    setForm(FORM_VACIO);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text)]">Nueva empresa</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa-nombre">
              Nombre
            </label>
            <input
              id="empresa-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa-email">
              Email
            </label>
            <input
              id="empresa-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.email && <p className="text-sm text-[var(--color-danger-text)]">{errores.email}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="empresa-password">
              Contraseña inicial
            </label>
            <input
              id="empresa-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            {errores.password && (
              <p className="text-sm text-[var(--color-danger-text)]">{errores.password}</p>
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
              disabled={guardando}
              className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)] disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
