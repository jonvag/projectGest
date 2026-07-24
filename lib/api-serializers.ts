// Prisma devuelve los campos `@db.Date` como objetos `Date` anclados a
// medianoche UTC (ej. "2026-07-24T00:00:00.000Z"). Si este proceso corre en
// una zona horaria detrás de UTC (ej. America/Caracas, UTC-4), usar getters
// locales (como hace `toISODate` en lib/mock-data.ts, pensado para fechas
// "de hoy" en el navegador/servidor) resta un día por accidente. Estas
// funciones usan getters UTC específicamente para des-serializar columnas
// de la base — no reemplazan a `toISODate`, que sigue siendo correcto para
// el resto de la app.
export function serializeFechaDb(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Contraparte de serializeFechaDb para escribir: construye el Date en UTC
// directamente (no a partir de un string interpretado en hora local), así
// el día calendario que termina en la columna @db.Date es correcto sin
// importar en qué zona horaria corre este proceso.
export function parseFechaDb(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// "Hoy" como Date anclado a medianoche UTC, para usar en columnas @db.Date
// del lado del servidor (ej. Pago.fechaPago) sin la resta de un día que
// causarían getters locales — mismo cuidado que serializeFechaDb/parseFechaDb.
export function hoyFechaDb(): Date {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}

export function serializeSuscripcion(s: {
  id: string;
  clienteId: string;
  servicio: string;
  monto: number;
  ciclo: string;
  proximoCobro: Date;
}) {
  return {
    id: s.id,
    clienteId: s.clienteId,
    servicio: s.servicio,
    monto: s.monto,
    ciclo: s.ciclo,
    proximoCobro: serializeFechaDb(s.proximoCobro),
  };
}

export function serializePago(p: {
  id: string;
  suscripcionId: string;
  clienteId: string;
  servicio: string;
  monto: number;
  fechaPago: Date;
  fechaCobroAnterior: Date;
  fechaProximoCobroNueva: Date;
  descripcion: string | null;
  referencia: string | null;
}) {
  return {
    id: p.id,
    suscripcionId: p.suscripcionId,
    clienteId: p.clienteId,
    servicio: p.servicio,
    monto: p.monto,
    fechaPago: serializeFechaDb(p.fechaPago),
    fechaCobroAnterior: serializeFechaDb(p.fechaCobroAnterior),
    fechaProximoCobroNueva: serializeFechaDb(p.fechaProximoCobroNueva),
    descripcion: p.descripcion,
    referencia: p.referencia,
  };
}

export function serializeReportePago(r: {
  id: string;
  suscripcionId: string;
  clienteId: string;
  referencia: string | null;
  comprobanteTipo: string;
  estado: string;
  creadoEn: Date;
  revisadoEn: Date | null;
  cliente: { nombre: string };
  suscripcion: { servicio: string; ciclo: string; proximoCobro: Date };
}) {
  return {
    id: r.id,
    suscripcionId: r.suscripcionId,
    clienteId: r.clienteId,
    referencia: r.referencia,
    comprobanteTipo: r.comprobanteTipo,
    estado: r.estado,
    creadoEn: r.creadoEn,
    revisadoEn: r.revisadoEn,
    clienteNombre: r.cliente.nombre,
    servicio: r.suscripcion.servicio,
    ciclo: r.suscripcion.ciclo,
    proximoCobro: serializeFechaDb(r.suscripcion.proximoCobro),
  };
}
