"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cliente } from "@/lib/mock-data";

export type NuevoCliente = Omit<Cliente, "id">;

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((datos: Cliente[]) => setClientes(datos))
      .finally(() => setCargando(false));
  }, []);

  const isEmailTaken = useCallback(
    (email: string, excludingId?: string): boolean => {
      const normalizado = email.trim().toLowerCase();
      return clientes.some(
        (c) => c.id !== excludingId && c.email.trim().toLowerCase() === normalizado,
      );
    },
    [clientes],
  );

  const addCliente = useCallback(async (nuevo: NuevoCliente): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo guardar el cliente.") };
    }
    const cliente: Cliente = await response.json();
    setClientes((prev) => [...prev, cliente]);
    return { ok: true };
  }, []);

  const updateCliente = useCallback(
    async (id: string, cambios: NuevoCliente): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo guardar el cliente.") };
      }
      const cliente: Cliente = await response.json();
      setClientes((prev) => prev.map((c) => (c.id === id ? cliente : c)));
      return { ok: true };
    },
    [],
  );

  const deleteCliente = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; suscripcionesAsociadas: number }> => {
      const response = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const cuerpo = await response.json().catch(() => ({ suscripcionesAsociadas: 0 }));
        return { ok: false, suscripcionesAsociadas: cuerpo.suscripcionesAsociadas ?? 0 };
      }
      setClientes((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    },
    [],
  );

  return { clientes, cargando, addCliente, updateCliente, deleteCliente, isEmailTaken };
}
