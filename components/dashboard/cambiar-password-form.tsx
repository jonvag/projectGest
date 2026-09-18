"use client";

import { useState } from "react";
import type { DatosPassword } from "@/lib/perfil-store";

type CambiarPasswordFormProps = {
  onGuardar: (datos: DatosPassword) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function CambiarPasswordForm({ onGuardar }: CambiarPasswordFormProps) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setError(null);

    if (passwordNueva !== passwordConfirmar) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setGuardando(true);
    const resultado = await onGuardar({ passwordActual, passwordNueva });
    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setMensaje("Contraseña actualizada.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]" htmlFor="passwordActual">
          Contraseña actual
        </label>
        <input
          id="passwordActual"
          type="password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]" htmlFor="passwordNueva">
          Contraseña nueva
        </label>
        <input
          id="passwordNueva"
          type="password"
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]" htmlFor="passwordConfirmar">
          Confirmar contraseña nueva
        </label>
        <input
          id="passwordConfirmar"
          type="password"
          value={passwordConfirmar}
          onChange={(e) => setPasswordConfirmar(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}
      {mensaje && <p className="text-sm text-[var(--color-success-text)]">{mensaje}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="self-start rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)] disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
