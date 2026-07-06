"use client";

type ConfirmModalProps = {
  open: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  confirmando?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export function ConfirmModal({
  open,
  titulo,
  mensaje,
  textoConfirmar = "Borrar",
  confirmando = false,
  onCancelar,
  onConfirmar,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-medium text-[var(--color-text)]">{titulo}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{mensaje}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={confirmando}
            className="rounded-md px-4 py-1.5 text-sm text-[var(--color-bg)] disabled:opacity-50"
            style={{ backgroundColor: "var(--color-danger-text)" }}
          >
            {confirmando ? "Borrando..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
