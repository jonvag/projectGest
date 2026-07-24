"use client";

import { useCallback, useEffect, useState } from "react";
import type { Suscripcion } from "@/lib/mock-data";

export type NuevaSuscripcion = Omit<Suscripcion, "id">;

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function calcularProximaFecha(fechaActual: string, ciclo: Suscripcion["ciclo"]): string {
  const [year, month, day] = fechaActual.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  if (ciclo === "mensual") {
    fecha.setMonth(fecha.getMonth() + 1);
  } else if (ciclo === "trimestral") {
    fecha.setMonth(fecha.getMonth() + 3);
  } else {
    fecha.setFullYear(fecha.getFullYear() + 1);
  }
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useSuscripciones() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/suscripciones")
      .then((res) => res.json())
      .then((datos: Suscripcion[]) => setSuscripciones(datos))
      .finally(() => setCargando(false));
  }, []);

  const addSuscripcion = useCallback(async (nueva: NuevaSuscripcion): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/suscripciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo guardar la suscripción.") };
    }
    const suscripcion: Suscripcion = await response.json();
    setSuscripciones((prev) => [...prev, suscripcion]);
    return { ok: true };
  }, []);

  const updateSuscripcion = useCallback(
    async (id: string, cambios: NuevaSuscripcion): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/suscripciones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo guardar la suscripción.") };
      }
      const suscripcion: Suscripcion = await response.json();
      setSuscripciones((prev) => prev.map((s) => (s.id === id ? suscripcion : s)));
      return { ok: true };
    },
    [],
  );

  const deleteSuscripcion = useCallback(async (id: string): Promise<void> => {
    await fetch(`/api/suscripciones/${id}`, { method: "DELETE" });
    setSuscripciones((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const generarLink = useCallback(async (id: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> => {
    const response = await fetch(`/api/suscripciones/${id}/link`);
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo generar el link.") };
    }
    const { token }: { token: string } = await response.json();
    return { ok: true, url: `${window.location.origin}/reportar/${token}` };
  }, []);

  return { suscripciones, cargando, addSuscripcion, updateSuscripcion, deleteSuscripcion, generarLink };
}
