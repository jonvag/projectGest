import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { parseFechaDb, serializePago } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const where: Prisma.PagoWhereInput = {};
  if (sesion.rol !== "SUPERUSER") {
    const clientesPermitidos = await prisma.cliente.findMany({
      where: filtroClientePorSesion(sesion),
      select: { id: true },
    });
    where.clienteId = { in: clientesPermitidos.map((c) => c.id) };
  }

  const pagos = await prisma.pago.findMany({ where, orderBy: { creadoEn: "asc" } });
  return NextResponse.json(pagos.map(serializePago));
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
    !datos.suscripcionId ||
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    !datos.fechaPago ||
    !datos.fechaCobroAnterior ||
    !datos.fechaProximoCobroNueva
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const clientePermitido = await prisma.cliente.findFirst({
    where: { id: datos.clienteId, ...filtroClientePorSesion(sesion) },
  });
  if (!clientePermitido) {
    return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
  }

  const suscripcionValida = await prisma.suscripcion.findFirst({
    where: { id: datos.suscripcionId, clienteId: datos.clienteId },
  });
  if (!suscripcionValida) {
    return NextResponse.json(
      { error: "La suscripción indicada no corresponde a ese cliente." },
      { status: 400 },
    );
  }

  const pago = await prisma.pago.create({
    data: {
      suscripcionId: datos.suscripcionId,
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      fechaPago: parseFechaDb(datos.fechaPago),
      fechaCobroAnterior: parseFechaDb(datos.fechaCobroAnterior),
      fechaProximoCobroNueva: parseFechaDb(datos.fechaProximoCobroNueva),
      descripcion: datos.descripcion?.trim() || null,
      referencia: datos.referencia?.trim() || null,
    },
  });
  return NextResponse.json(serializePago(pago), { status: 201 });
}
