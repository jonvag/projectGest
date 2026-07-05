"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "projectgest:pagos";

export type Pago = {
  id: string;
  suscripcionId: string;
  clienteId: string;
  servicio: string;
  monto: number;
  fechaPago: string; // ISO date — hoy, al momento de confirmar
  fechaCobroAnterior: string; // ISO date — el proximoCobro que tenía antes
  fechaProximoCobroNueva: string; // ISO date — la fecha confirmada
};

export type NuevoPago = Omit<Pago, "id">;

function leerDeLocalStorage(): Pago[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pago[];
  } catch {
    return null;
  }
}

function guardarEnLocalStorage(pagos: Pago[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pagos));
  } catch {
    // localStorage no disponible (ej. modo privado); los cambios quedan solo en memoria.
  }
}

export function usePagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);

  useEffect(() => {
    // No hay semilla mock acá (el historial empieza vacío) — solo se
    // sincroniza con localStorage si ya hay algo guardado.
    const guardados = leerDeLocalStorage();
    if (guardados) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPagos(guardados);
    }
  }, []);

  const addPago = useCallback((nuevo: NuevoPago): Pago => {
    const pago: Pago = { ...nuevo, id: crypto.randomUUID() };
    setPagos((prev) => {
      const actualizados = [...prev, pago];
      guardarEnLocalStorage(actualizados);
      return actualizados;
    });
    return pago;
  }, []);

  return { pagos, addPago };
}
