import { NextResponse } from "next/server";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const clientes = await prisma.cliente.findMany({
    where: filtroClientePorSesion(sesion),
    orderBy: { creadoEn: "asc" },
  });
  return NextResponse.json(clientes);
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

  if (!datos.nombre || !datos.empresa || !datos.contactId || !datos.email) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  let usuarioId: string;
  if (sesion.rol === "EMPRESA") {
    usuarioId = sesion.id;
  } else {
    if (!datos.usuarioId) {
      return NextResponse.json(
        { error: "Como superuser, tenés que indicar a qué empresa pertenece el cliente." },
        { status: 400 },
      );
    }
    usuarioId = datos.usuarioId;
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        usuarioId,
        nombre: datos.nombre,
        empresa: datos.empresa,
        contactId: datos.contactId,
        email: datos.email,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese email." }, { status: 409 });
    }
    throw error;
  }
}
