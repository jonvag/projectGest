import { NextResponse } from "next/server";
import { parseFechaDb, serializeSuscripcion } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const suscripciones = await prisma.suscripcion.findMany({
    where: { cliente: filtroClientePorSesion(sesion) },
    orderBy: { creadoEn: "asc" },
  });
  return NextResponse.json(suscripciones.map(serializeSuscripcion));
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (sesion.rol === "CLIENTE") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const datos = await request.json();

  if (
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    datos.monto <= 0 ||
    !datos.ciclo ||
    !datos.proximoCobro
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const clientePermitido = await prisma.cliente.findFirst({
    where: { id: datos.clienteId, ...filtroClientePorSesion(sesion) },
  });
  if (!clientePermitido) {
    return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
  }

  const suscripcion = await prisma.suscripcion.create({
    data: {
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      ciclo: datos.ciclo,
      proximoCobro: parseFechaDb(datos.proximoCobro),
    },
  });
  return NextResponse.json(serializeSuscripcion(suscripcion), { status: 201 });
}
