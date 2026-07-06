import { NextResponse } from "next/server";
import { parseFechaDb, serializeSuscripcion } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const suscripcionExistente = await prisma.suscripcion.findFirst({
    where: { id, cliente: filtroClientePorSesion(sesion) },
  });
  if (!suscripcionExistente) {
    return NextResponse.json({ error: "Suscripción no encontrada." }, { status: 404 });
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

  const suscripcion = await prisma.suscripcion.update({
    where: { id },
    data: {
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      ciclo: datos.ciclo,
      proximoCobro: parseFechaDb(datos.proximoCobro),
    },
  });
  return NextResponse.json(serializeSuscripcion(suscripcion));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const suscripcionExistente = await prisma.suscripcion.findFirst({
    where: { id, cliente: filtroClientePorSesion(sesion) },
  });
  if (!suscripcionExistente) {
    return NextResponse.json({ error: "Suscripción no encontrada." }, { status: 404 });
  }

  await prisma.suscripcion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
