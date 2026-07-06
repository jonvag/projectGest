"use client";

import { useCallback, useEffect, useState } from "react";

export type Pago = {
  id: string;
  suscripcionId: string;
  clienteId: string;
  servicio: string;
  monto: number;
  fechaPago: string;
  fechaCobroAnterior: string;
  fechaProximoCobroNueva: string;
};

export type NuevoPago = Omit<Pago, "id">;

export function usePagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/pagos")
      .then((res) => res.json())
      .then((datos: Pago[]) => setPagos(datos))
      .finally(() => setCargando(false));
  }, []);

  const addPago = useCallback(async (nuevo: NuevoPago): Promise<Pago> => {
    const response = await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    const pago: Pago = await response.json();
    setPagos((prev) => [...prev, pago]);
    return pago;
  }, []);

  return { pagos, cargando, addPago };
}
