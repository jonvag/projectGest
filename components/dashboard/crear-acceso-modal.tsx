"use client";

import { useState } from "react";

type CrearAccesoModalProps = {
  open: boolean;
  nombreCliente: string;
  onClose: () => void;
  onCrear: (datos: { email: string; password: string }) => Promise<string | null>;
};

const FORM_VACIO = { email: "", password: "" };

export function CrearAccesoModal({ open, nombreCliente, onClose, onCrear }: CrearAccesoModalProps) {
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError("Email y contraseña son obligatorios.");
      return;
    }
    setGuardando(true);
    const errorDeGuardado = await onCrear(form);
    setGuardando(false);
    if (errorDeGuardado) {
      setError(errorDeGuardado);
      return;
    }
    setForm(FORM_VACIO);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-medium text-[var(--color-text)]">Crear acceso</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">Para {nombreCliente}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="acceso-email">
              Email
            </label>
            <input
              id="acceso-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="acceso-password">
              Contraseña inicial
            </label>
            <input
              id="acceso-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}
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
              {guardando ? "Creando..." : "Crear acceso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
