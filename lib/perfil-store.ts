"use client";

import { useCallback, useEffect, useState } from "react";
import type { Rol } from "@prisma/client";

export type Perfil = {
  nombre: string | null;
  email: string;
  rol: Rol;
  banco: string | null;
  numeroCuenta: string | null;
  rif: string | null;
};

export type DatosPerfil = { banco: string; numeroCuenta: string; rif: string };
export type DatosPassword = { passwordActual: string; passwordNueva: string };

type ResultadoGuardado = { ok: true } | { ok: false; error: string };

async function leerError(response: Response, fallback: string): Promise<string> {
  try {
    const cuerpo = await response.json();
    return typeof cuerpo.error === "string" ? cuerpo.error : fallback;
  } catch {
    return fallback;
  }
}

export function usePerfil() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/perfil")
      .then((res) => (res.ok ? res.json() : null))
      .then((datos: Perfil | null) => setPerfil(datos))
      .finally(() => setCargando(false));
  }, []);

  const actualizarPerfil = useCallback(async (datos: DatosPerfil): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo guardar el perfil.") };
    }
    const perfilActualizado: Perfil = await response.json();
    setPerfil(perfilActualizado);
    return { ok: true };
  }, []);

  const cambiarPassword = useCallback(async (datos: DatosPassword): Promise<ResultadoGuardado> => {
    const response = await fetch("/api/perfil/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (!response.ok) {
      return { ok: false, error: await leerError(response, "No se pudo cambiar la contraseña.") };
    }
    return { ok: true };
  }, []);

  return { perfil, cargando, actualizarPerfil, cambiarPassword };
}
