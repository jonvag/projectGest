"use client";

import { useCallback, useEffect, useState } from "react";
import { suscripciones as suscripcionesIniciales, type Suscripcion } from "@/lib/mock-data";

const STORAGE_KEY = "projectgest:suscripciones";

function leerDeLocalStorage(): Suscripcion[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Suscripcion[];
  } catch {
    return null;
  }
}

function guardarEnLocalStorage(suscripciones: Suscripcion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suscripciones));
  } catch {
    // localStorage no disponible (ej. modo privado); los cambios quedan solo en memoria.
  }
}

export type NuevaSuscripcion = Omit<Suscripcion, "id">;

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
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>(suscripcionesIniciales);

  useEffect(() => {
    // Mismo patrón anti-hidratación que useClientes: el mock es el estado
    // inicial (igual en servidor y primer render de cliente); recién acá,
    // post-hidratación, se sincroniza con localStorage.
    const guardadas = leerDeLocalStorage();
    if (guardadas) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuscripciones(guardadas);
    } else {
      guardarEnLocalStorage(suscripcionesIniciales);
    }
  }, []);

  const addSuscripcion = useCallback((nueva: NuevaSuscripcion): Suscripcion => {
    const suscripcion: Suscripcion = { ...nueva, id: crypto.randomUUID() };
    setSuscripciones((prev) => {
      const actualizadas = [...prev, suscripcion];
      guardarEnLocalStorage(actualizadas);
      return actualizadas;
    });
    return suscripcion;
  }, []);

  const updateSuscripcion = useCallback((id: string, cambios: NuevaSuscripcion): void => {
    setSuscripciones((prev) => {
      const actualizadas = prev.map((s) => (s.id === id ? { ...s, ...cambios } : s));
      guardarEnLocalStorage(actualizadas);
      return actualizadas;
    });
  }, []);

  const deleteSuscripcion = useCallback((id: string): void => {
    setSuscripciones((prev) => {
      const actualizadas = prev.filter((s) => s.id !== id);
      guardarEnLocalStorage(actualizadas);
      return actualizadas;
    });
  }, []);

  return { suscripciones, addSuscripcion, updateSuscripcion, deleteSuscripcion };
}
