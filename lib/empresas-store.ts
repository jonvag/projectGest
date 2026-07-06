"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cliente } from "@/lib/mock-data";
import type { NuevoCliente } from "@/lib/clientes-store";

export type Empresa = {
  id: string;
  email: string;
  nombre: string | null;
  creadoEn: string;
  _count: { clientes: number };
};

export type NuevaEmpresa = { nombre: string; email: string; password: string };

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/empresas")
      .then((res) => (res.ok ? res.json() : []))
      .then((datos: Empresa[]) => setEmpresas(datos))
      .finally(() => setCargando(false));
  }, []);

  const addEmpresa = useCallback(async (nueva: NuevaEmpresa): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo crear la empresa.") };
    }
    const empresa: Empresa = await response.json();
    setEmpresas((prev) => [...prev, { ...empresa, _count: { clientes: 0 } }]);
    return { ok: true };
  }, []);

  return { empresas, cargando, addEmpresa };
}

export type EmpresaDetalle = {
  id: string;
  email: string;
  nombre: string | null;
  creadoEn: string;
  clientes: Cliente[];
};

export function useEmpresaDetalle(id: string) {
  const [empresa, setEmpresa] = useState<EmpresaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const response = await fetch(`/api/empresas/${id}`);
    const datos: EmpresaDetalle | null = response.ok ? await response.json() : null;
    setEmpresa(datos);
  }, [id]);

  useEffect(() => {
    fetch(`/api/empresas/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((datos: EmpresaDetalle | null) => setEmpresa(datos))
      .finally(() => setCargando(false));
  }, [id]);

  const crearCliente = useCallback(
    async (datos: NuevoCliente): Promise<ResultadoGuardado> => {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, usuarioId: id }),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo crear el cliente.") };
      }
      await recargar();
      return { ok: true };
    },
    [id, recargar],
  );

  const actualizarCliente = useCallback(
    async (clienteId: string, datos: NuevoCliente): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo guardar el cliente.") };
      }
      await recargar();
      return { ok: true };
    },
    [recargar],
  );

  const borrarCliente = useCallback(
    async (clienteId: string): Promise<{ ok: true } | { ok: false; suscripcionesAsociadas: number }> => {
      const response = await fetch(`/api/clientes/${clienteId}`, { method: "DELETE" });
      if (!response.ok) {
        const cuerpo = await response.json().catch(() => ({ suscripcionesAsociadas: 0 }));
        return { ok: false, suscripcionesAsociadas: cuerpo.suscripcionesAsociadas ?? 0 };
      }
      await recargar();
      return { ok: true };
    },
    [recargar],
  );

  const crearAcceso = useCallback(
    async (clienteId: string, datos: { email: string; password: string }): Promise<ResultadoGuardado> => {
      const response = await fetch(`/api/clientes/${clienteId}/acceso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!response.ok) {
        return { ok: false, error: await leerError(response, "No se pudo crear el acceso.") };
      }
      await recargar();
      return { ok: true };
    },
    [recargar],
  );

  return { empresa, cargando, crearCliente, actualizarCliente, borrarCliente, crearAcceso };
}
