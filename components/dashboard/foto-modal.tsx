"use client";

import { Cross2Icon } from "@radix-ui/react-icons";

type FotoModalProps = {
  src: string | null;
  onClose: () => void;
};

export function FotoModal({ src, onClose }: FotoModalProps) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-[92vw] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-modal-surface)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute -right-3 -top-3 rounded-full bg-[var(--color-text)] p-1.5 text-[var(--color-bg)]"
        >
          <Cross2Icon />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Comprobante ampliado"
          className="max-h-full max-w-full rounded-md object-contain"
        />
      </div>
    </div>
  );
}
