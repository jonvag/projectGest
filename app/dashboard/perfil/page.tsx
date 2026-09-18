"use client";

import { useState } from "react";
import type { Rol } from "@prisma/client";
import { CambiarPasswordForm } from "@/components/dashboard/cambiar-password-form";
import { usePerfil, type DatosPerfil, type Perfil } from "@/lib/perfil-store";

const ETIQUETA_ROL: Record<Rol, string> = {
  SUPERUSER: "Superuser",
  EMPRESA: "Empresa",
  CLIENTE: "Cliente",
};

function SeccionCuenta({ perfil }: { perfil: Perfil }) {
  return (
    <section className="flex max-w-sm flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="text-sm font-medium text-[var(--color-text)]">Cuenta</h2>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">Nombre</span>
        <span className="text-sm text-[var(--color-text)]">{perfil.nombre ?? "—"}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">Email</span>
        <span className="text-sm text-[var(--color-text)]">{perfil.email}</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          El email no se puede cambiar desde acá — solo el superuser puede modificarlo.
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">Rol</span>
        <span className="text-sm text-[var(--color-text)]">{ETIQUETA_ROL[perfil.rol]}</span>
      </div>
    </section>
  );
}

type DatosBancariosFormProps = {
  perfil: Perfil;
  onGuardar: (datos: DatosPerfil) => Promise<{ ok: true } | { ok: false; error: string }>;
};

// Solo se monta una vez que `perfil` ya llegó del servidor (ver PerfilPage),
// así el estado local se inicializa perezosamente desde los datos reales,
// sin necesitar un efecto para sincronizarlo después.
function DatosBancariosForm({ perfil, onGuardar }: DatosBancariosFormProps) {
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
    <section className="flex max-w-sm flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div>
        <h2 className="text-sm font-medium text-[var(--color-text)]">Datos de cobro</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Se muestran a tus clientes en la página donde reportan sus pagos.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
    </section>
  );
}

export default function PerfilPage() {
  const { perfil, cargando, actualizarPerfil, cambiarPassword } = usePerfil();

  return (
    <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <h1 className="text-xl font-medium text-[var(--color-text)]">Mi perfil</h1>

      {cargando || !perfil ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : (
        <>
          <SeccionCuenta perfil={perfil} />

          <section className="flex max-w-sm flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-sm font-medium text-[var(--color-text)]">Cambiar contraseña</h2>
            <CambiarPasswordForm onGuardar={cambiarPassword} />
          </section>

          {perfil.rol === "EMPRESA" && (
            <DatosBancariosForm perfil={perfil} onGuardar={actualizarPerfil} />
          )}
        </>
      )}
    </div>
  );
}
