"use client";

import { CheckIcon, Cross2Icon, ImageIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { FotoModal } from "@/components/dashboard/foto-modal";
import { VerificarPagoModal } from "@/components/dashboard/verificar-pago-modal";
import { useReportesPago, type ReportePago } from "@/lib/reportes-pago-store";
import { useSesion } from "@/lib/sesion-store";

function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

const ETIQUETA_ESTADO: Record<ReportePago["estado"], { texto: string; color: string }> = {
  pendiente: { texto: "Pendiente", color: "var(--color-text-muted)" },
  verificado: { texto: "Verificado", color: "var(--color-success-text)" },
  rechazado: { texto: "Rechazado", color: "var(--color-danger-text)" },
};

export default function ReportesPagoPage() {
  const { reportes, cargando, revisarReporte } = useReportesPago();
  const { sesion } = useSesion();
  const puedeRevisar = sesion?.rol === "SUPERUSER" || sesion?.rol === "EMPRESA";

  const [modalAbierto, setModalAbierto] = useState(false);
  const [reporteAVerificar, setReporteAVerificar] = useState<ReportePago | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  function abrirVerificar(reporte: ReportePago) {
    setReporteAVerificar(reporte);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setReporteAVerificar(null);
  }

  async function confirmarVerificacion(fechaProximoCobro: string): Promise<string | null> {
    if (!reporteAVerificar) return null;
    const resultado = await revisarReporte(reporteAVerificar.id, "verificado", fechaProximoCobro);
    if (!resultado.ok) {
      return resultado.error;
    }
    cerrarModal();
    return null;
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <h1 className="text-xl font-medium text-[var(--color-text)]">Reportes de pago</h1>

      <div className="flex flex-col gap-4">
        {reportes.map((r) => {
          const estado = ETIQUETA_ESTADO[r.estado];
          return (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {r.comprobanteTipo ? (
                  <button
                    type="button"
                    onClick={() => setFotoAmpliada(`/api/reportes-pago/${r.id}/comprobante`)}
                    aria-label="Ver comprobante ampliado"
                    title="Ver comprobante"
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)]"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-chip-bg)" }}
                  >
                    <ImageIcon className="h-6 w-6" />
                  </button>
                ) : (
                  <div
                    aria-label="Reporte sin comprobante"
                    title="Este reporte se envió sin foto de comprobante"
                    className="flex h-16 w-16 shrink-0 cursor-not-allowed items-center justify-center rounded-md border border-dashed text-[var(--color-text-muted)] opacity-50"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="text-[var(--color-text)]">
                    {r.clienteNombre} · {r.servicio}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {formatFecha(r.creadoEn)}
                    {r.referencia ? ` · ref: ${r.referencia}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: estado.color }}>
                  {estado.texto}
                </span>
                {puedeRevisar && r.estado === "pendiente" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirVerificar(r)}
                      aria-label="Verificar reporte"
                      title="Verificar (registra el pago y actualiza el próximo cobro)"
                      className="rounded-md p-1.5 text-[var(--color-success-text)] transition-colors hover:bg-[var(--color-success-bg)]"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => revisarReporte(r.id, "rechazado")}
                      aria-label="Rechazar reporte"
                      title="Rechazar"
                      className="rounded-md p-1.5 text-[var(--color-danger-text)] transition-colors hover:bg-[var(--color-danger-bg)]"
                    >
                      <Cross2Icon />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {reportes.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
            Todavía no hay reportes de pago.
          </p>
        )}
      </div>

      <VerificarPagoModal
        key={`${modalAbierto}-${reporteAVerificar?.id ?? "ninguno"}`}
        open={modalAbierto}
        reporte={reporteAVerificar}
        onClose={cerrarModal}
        onConfirmar={confirmarVerificacion}
      />

      <FotoModal src={fotoAmpliada} onClose={() => setFotoAmpliada(null)} />
    </div>
  );
}
