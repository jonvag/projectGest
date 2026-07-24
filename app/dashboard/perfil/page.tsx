"use client";

import { useState } from "react";
import { usePerfil, type DatosPerfil, type Perfil } from "@/lib/perfil-store";

type PerfilFormProps = {
  perfil: Perfil;
  onGuardar: (datos: DatosPerfil) => Promise<{ ok: true } | { ok: false; error: string }>;
};

// Solo se monta una vez que `perfil` ya llegó del servidor (ver PerfilPage),
// así el estado local se inicializa perezosamente desde los datos reales,
// sin necesitar un efecto para sincronizarlo después.
function PerfilForm({ perfil, onGuardar }: PerfilFormProps) {
  const [banco, setBanco] = useState(perfil.banco ?? "");
  const [numeroCuenta, setNumeroCuenta] = useState(perfil.numeroCuenta ?? "");
  const [rif, setRif] = useState(perfil.rif ?? "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setError(null);
    setGuardando(true);
    const resultado = await onGuardar({ banco, numeroCuenta, rif });
    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setMensaje("Datos guardados.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]" htmlFor="banco">
          Banco
        </label>
        <input
          id="banco"
          type="text"
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]" htmlFor="numeroCuenta">
          Número de cuenta
        </label>
        <input
          id="numeroCuenta"
          type="text"
          value={numeroCuenta}
          onChange={(e) => setNumeroCuenta(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]" htmlFor="rif">
          RIF
        </label>
        <input
          id="rif"
          type="text"
          value={rif}
          onChange={(e) => setRif(e.target.value)}
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
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}

export default function PerfilPage() {
  const { perfil, cargando, actualizarPerfil } = usePerfil();

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div>
        <h1 className="text-xl font-medium text-[var(--color-text)]">Mi perfil</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Estos datos se muestran a tus clientes en la página donde reportan sus pagos.
        </p>
      </div>

      {cargando || !perfil ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : (
        <PerfilForm perfil={perfil} onGuardar={actualizarPerfil} />
      )}
    </div>
  );
}
