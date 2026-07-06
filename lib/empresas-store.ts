"use client";

import { useCallback, useEffect, useState } from "react";

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
      .then((res) => res.json())
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
