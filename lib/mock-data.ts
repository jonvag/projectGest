export type Cliente = {
  id: string;
  nombre: string;
  empresa: string;
  contactId: string;
  email: string;
  usuarioId?: string;
  userId?: string | null;
};

export type Suscripcion = {
  id: string;
  clienteId: string;
  servicio: string;
  monto: number;
  ciclo: "mensual" | "trimestral" | "anual";
  proximoCobro: string; // ISO date (YYYY-MM-DD)
};

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function getIngresosEsperadosDelMes(
  suscripcionesList: Suscripcion[],
  hoy: Date = new Date(),
): number {
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();
  return suscripcionesList
    .filter((s) => {
      const { year, month } = parseISODate(s.proximoCobro);
      return year === anioActual && month === mesActual;
    })
    .reduce((total, s) => total + s.monto, 0);
}

export function getCobrosVencidos(
  suscripcionesList: Suscripcion[],
  hoy: Date = new Date(),
): Suscripcion[] {
  const hoyISO = toISODate(hoy);
  return suscripcionesList.filter((s) => s.proximoCobro < hoyISO);
}

export function getProximosCobrosDeLaSemana(
  suscripcionesList: Suscripcion[],
  hoy: Date = new Date(),
): Suscripcion[] {
  const hoyISO = toISODate(hoy);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 7);
  const limiteISO = toISODate(limite);
  return suscripcionesList.filter((s) => s.proximoCobro >= hoyISO && s.proximoCobro <= limiteISO);
}
