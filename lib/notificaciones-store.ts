"use client";

import { useEffect, useState } from "react";

export type Notificacion = {
  id: string;
  suscripcionId: string;
  clienteId: string;
  canal: string;
  estado: string;
  detalle: string | null;
  enviadoEn: string;
  cliente: { nombre: string };
  suscripcion: { servicio: string };
};

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/notificaciones")
      .then((res) => (res.ok ? res.json() : []))
      .then((datos: Notificacion[]) => setNotificaciones(datos))
      .finally(() => setCargando(false));
  }, []);

  return { notificaciones, cargando };
}
