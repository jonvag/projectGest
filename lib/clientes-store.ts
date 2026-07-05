"use client";

import { useCallback, useEffect, useState } from "react";
import { clientes as clientesIniciales, type Cliente, type Suscripcion } from "@/lib/mock-data";

const STORAGE_KEY = "projectgest:clientes";

function leerDeLocalStorage(): Cliente[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Cliente[];
  } catch {
    return null;
  }
}

function guardarEnLocalStorage(clientes: Cliente[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  } catch {
    // localStorage no disponible (ej. modo privado); los cambios quedan solo en memoria.
  }
}

export type NuevoCliente = Omit<Cliente, "id">;

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);

  useEffect(() => {
    // Igual que en ThemeToggle: no se puede leer localStorage durante el
    // render (mismatch de hidratación), así que el estado inicial es el
    // mock y recién acá, post-hidratación, se sincroniza con lo guardado.
    const guardados = leerDeLocalStorage();
    if (guardados) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientes(guardados);
    } else {
      guardarEnLocalStorage(clientesIniciales);
    }
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

  const addCliente = useCallback((nuevo: NuevoCliente): Cliente => {
    const cliente: Cliente = { ...nuevo, id: crypto.randomUUID() };
    setClientes((prev) => {
      const actualizados = [...prev, cliente];
      guardarEnLocalStorage(actualizados);
      return actualizados;
    });
    return cliente;
  }, []);

  const updateCliente = useCallback((id: string, cambios: NuevoCliente): void => {
    setClientes((prev) => {
      const actualizados = prev.map((c) => (c.id === id ? { ...c, ...cambios } : c));
      guardarEnLocalStorage(actualizados);
      return actualizados;
    });
  }, []);

  const deleteCliente = useCallback(
    (
      id: string,
      suscripcionesActuales: Suscripcion[],
    ): { ok: true } | { ok: false; suscripcionesAsociadas: number } => {
      const asociadas = suscripcionesActuales.filter((s) => s.clienteId === id).length;
      if (asociadas > 0) {
        return { ok: false, suscripcionesAsociadas: asociadas };
      }
      setClientes((prev) => {
        const actualizados = prev.filter((c) => c.id !== id);
        guardarEnLocalStorage(actualizados);
        return actualizados;
      });
      return { ok: true };
    },
    [],
  );

  return { clientes, addCliente, updateCliente, deleteCliente, isEmailTaken };
}
