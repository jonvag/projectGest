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

function isoDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

export const clientes: Cliente[] = [
  {
    id: "1",
    nombre: "Ana Torres",
    empresa: "Torres Diseño",
    contactId: "+54 11 5555-0101",
    email: "ana@torresdiseno.com",
  },
  {
    id: "2",
    nombre: "Bruno Cabrera",
    empresa: "Cabrera Software",
    contactId: "+54 11 5555-0102",
    email: "bruno@cabrerasoftware.com",
  },
  {
    id: "3",
    nombre: "Carla Núñez",
    empresa: "Núñez Studio",
    contactId: "+54 11 5555-0103",
    email: "carla@nunezstudio.com",
  },
  {
    id: "4",
    nombre: "Diego Fernández",
    empresa: "Fernández Web",
    contactId: "+54 11 5555-0104",
    email: "diego@fernandezweb.com",
  },
  {
    id: "5",
    nombre: "Elena Ríos",
    empresa: "Ríos Consulting",
    contactId: "+54 11 5555-0105",
    email: "elena@riosconsulting.com",
  },
  {
    id: "6",
    nombre: "Franco Ibáñez",
    empresa: "Ibáñez Corp",
    contactId: "+54 11 5555-0106",
    email: "franco@ibanezcorp.com",
  },
];

export const suscripciones: Suscripcion[] = [
  {
    id: "1",
    clienteId: "1",
    servicio: "Página web",
    monto: 100,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(-10),
  },
  {
    id: "2",
    clienteId: "2",
    servicio: "Mantenimiento mensual",
    monto: 150,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(-3),
  },
  {
    id: "3",
    clienteId: "2",
    servicio: "Hosting",
    monto: 80,
    ciclo: "anual",
    proximoCobro: isoDateOffset(25),
  },
  {
    id: "4",
    clienteId: "3",
    servicio: "App móvil",
    monto: 500,
    ciclo: "anual",
    proximoCobro: isoDateOffset(2),
  },
  {
    id: "5",
    clienteId: "4",
    servicio: "Página web",
    monto: 100,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(5),
  },
  {
    id: "6",
    clienteId: "4",
    servicio: "SEO",
    monto: 20,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(5),
  },
  {
    id: "7",
    clienteId: "5",
    servicio: "Mantenimiento mensual",
    monto: 90,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(20),
  },
  {
    id: "8",
    clienteId: "6",
    servicio: "Página web",
    monto: 100,
    ciclo: "mensual",
    proximoCobro: isoDateOffset(40),
  },
];

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
