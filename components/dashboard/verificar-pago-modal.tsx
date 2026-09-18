"use client";

import { useState } from "react";
import type { ReportePago } from "@/lib/reportes-pago-store";
import { calcularProximaFecha } from "@/lib/suscripciones-store";

type VerificarPagoModalProps = {
  open: boolean;
  reporte: ReportePago | null;
  onClose: () => void;
  onConfirmar: (fechaProximoCobro: string) => Promise<string | null>;
};

// El padre le pasa una `key` que cambia cada vez que el modal se abre
// (ver app/dashboard/reportes-pago/page.tsx), así React remonta el
// componente en vez de sincronizar la fecha sugerida con un efecto.
export function VerificarPagoModal({ open, reporte, onClose, onConfirmar }: VerificarPagoModalProps) {
  const [fecha, setFecha] = useState<string>(() =>
    reporte ? calcularProximaFecha(reporte.proximoCobro, reporte.ciclo) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!open || !reporte) return null;

  async function handleConfirmar() {
    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    setGuardando(true);
    const errorDelServidor = await onConfirmar(fecha);
    setGuardando(false);
    if (errorDelServidor) {
      setError(errorDelServidor);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-modal-surface)] p-6">
        <h2 className="mb-2 text-lg font-medium text-[var(--color-text)]">
          Verificar pago de {reporte.servicio}
        </h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">{reporte.clienteNombre}</p>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="fechaProximoCobro">
            Próximo cobro sugerido
          </label>
          <input
            id="fechaProximoCobro"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
          {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={guardando}
            className="rounded-md px-4 py-1.5 text-sm disabled:opacity-50"
            style={{ backgroundColor: "var(--color-success-text)", color: "var(--color-bg)" }}
          >
            {guardando ? "Guardando..." : "Verificar"}
          </button>
        </div>
      </div>
    </div>
  );
}
