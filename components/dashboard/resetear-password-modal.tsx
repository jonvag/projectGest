"use client";

import { useState } from "react";

type ResetearPasswordModalProps = {
  open: boolean;
  nombreCliente: string;
  onClose: () => void;
  onResetear: (password: string) => Promise<string | null>;
};

export function ResetearPasswordModal({
  open,
  nombreCliente,
  onClose,
  onResetear,
}: ResetearPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("La contraseña es obligatoria.");
      return;
    }
    setGuardando(true);
    const errorDeGuardado = await onResetear(password);
    setGuardando(false);
    if (errorDeGuardado) {
      setError(errorDeGuardado);
      return;
    }
    setPassword("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-modal-surface)] p-6">
        <h2 className="mb-2 text-lg font-medium text-[var(--color-text)]">Resetear contraseña</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">Para {nombreCliente}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="reset-password">
              Contraseña nueva
            </label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {guardando ? "Guardando..." : "Resetear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
