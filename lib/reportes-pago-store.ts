"use client";

import { useCallback, useEffect, useState } from "react";

export type ReportePago = {
  id: string;
  suscripcionId: string;
  clienteId: string;
  referencia: string | null;
  comprobanteTipo: string;
  estado: "pendiente" | "verificado" | "rechazado";
  creadoEn: string;
  revisadoEn: string | null;
  clienteNombre: string;
  servicio: string;
  ciclo: "mensual" | "trimestral" | "anual";
  proximoCobro: string;
};

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function useReportesPago() {
  const [reportes, setReportes] = useState<ReportePago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/reportes-pago")
      .then((res) => (res.ok ? res.json() : []))
      .then((datos: ReportePago[]) => setReportes(datos))
      .finally(() => setCargando(false));
  }, []);

  const revisarReporte = useCallback(
    async (
      id: string,
      estado: "verificado" | "rechazado",
      fechaProximoCobro?: string,
    ): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/reportes-pago/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, fechaProximoCobro }),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo actualizar el reporte.") };
      }
      const reporte: ReportePago = await response.json();
      setReportes((prev) => prev.map((r) => (r.id === id ? reporte : r)));
      return { ok: true };
    },
    [],
  );

  return { reportes, cargando, revisarReporte };
}
