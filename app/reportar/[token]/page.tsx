"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type InfoSuscripcion = {
  servicio: string;
  monto: number;
  ciclo: "mensual" | "trimestral" | "anual";
  proximoCobro: string;
  clienteNombre: string;
  empresaNombre: string | null;
  empresaBanco: string | null;
  empresaNumeroCuenta: string | null;
  empresaRif: string | null;
};

const ETIQUETA_CICLO: Record<InfoSuscripcion["ciclo"], string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function ReportarPagoPage() {
  const params = useParams<{ token: string }>();
  const [info, setInfo] = useState<InfoSuscripcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [linkInvalido, setLinkInvalido] = useState(false);

  const [referencia, setReferencia] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    fetch(`/api/reportar/${params.token}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((datos: InfoSuscripcion | null) => {
        if (!datos) {
          setLinkInvalido(true);
          return;
        }
        setInfo(datos);
      })
      .finally(() => setCargando(false));
  }, [params.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) {
      setError("Subí una foto o captura del comprobante.");
      return;
    }
    setError(null);
    setEnviando(true);

    const formData = new FormData();
    formData.append("comprobante", archivo);
    if (referencia.trim()) {
      formData.append("referencia", referencia.trim());
    }

    const response = await fetch(`/api/reportar/${params.token}`, {
      method: "POST",
      body: formData,
    });
    setEnviando(false);

    if (!response.ok) {
      const cuerpo = await response.json().catch(() => ({ error: "No se pudo enviar el reporte." }));
      setError(cuerpo.error ?? "No se pudo enviar el reporte.");
      return;
    }
    setEnviado(true);
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  if (linkInvalido || !info) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-[var(--color-text)]">Este link no es válido.</p>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-6 text-center">
          <p className="text-[var(--color-success-text)]">
            Reporte enviado. La empresa va a verificarlo y confirmar tu pago.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <div>
          <h1 className="text-lg font-medium text-[var(--color-text)]">
            {info.empresaNombre ?? "Reportar pago"}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">{info.clienteNombre}</p>
        </div>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm">
          <p className="text-[var(--color-text)]">{info.servicio}</p>
          <p className="text-[var(--color-text-muted)]">
            {formatMonto(info.monto)} · {ETIQUETA_CICLO[info.ciclo]} · vence {formatFecha(info.proximoCobro)}
          </p>
        </div>

        {(info.empresaBanco || info.empresaNumeroCuenta || info.empresaRif) && (
          <div className="rounded-md border border-[var(--color-accent-border)] bg-[var(--color-accent-bg)] p-3 text-sm">
            <p className="mb-1 font-medium text-[var(--color-accent-text)]">Datos para el pago</p>
            {info.empresaBanco && (
              <p className="text-[var(--color-accent-text)]">Banco: {info.empresaBanco}</p>
            )}
            {info.empresaNumeroCuenta && (
              <p className="text-[var(--color-accent-text)]">Cuenta: {info.empresaNumeroCuenta}</p>
            )}
            {info.empresaRif && <p className="text-[var(--color-accent-text)]">RIF: {info.empresaRif}</p>}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="referencia">
            Referencia (opcional)
          </label>
          <input
            id="referencia"
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Nro. de operación, últimos dígitos, etc."
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--color-text-muted)]" htmlFor="comprobante">
            Foto del comprobante
          </label>
          <input
            id="comprobante"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-[var(--color-text)] px-4 py-2 text-sm text-[var(--color-bg)] disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar reporte"}
        </button>
      </form>
    </div>
  );
}
