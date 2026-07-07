"use client";

import { useEffect, useState } from "react";
import type { Rol } from "@prisma/client";

export type Sesion = { email: string; rol: Rol };

export function useSesion() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((datos: Sesion | null) => setSesion(datos))
      .finally(() => setCargando(false));
  }, []);

  return { sesion, cargando };
}
