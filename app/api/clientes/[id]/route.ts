import { NextResponse } from "next/server";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const cliente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientePorSesion(sesion) },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const clienteExistente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientePorSesion(sesion) },
  });
  if (!clienteExistente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const datos = await request.json();

  if (!datos.nombre || !datos.empresa || !datos.contactId || !datos.email) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  let usuarioId: string | undefined;
  if (sesion.rol === "SUPERUSER" && datos.usuarioId) {
    const empresa = await prisma.user.findUnique({ where: { id: datos.usuarioId } });
    if (!empresa || empresa.rol !== "EMPRESA") {
      return NextResponse.json(
        { error: "El usuarioId indicado no corresponde a una empresa válida." },
        { status: 400 },
      );
    }
    usuarioId = datos.usuarioId;
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        empresa: datos.empresa,
        contactId: datos.contactId,
        email: datos.email,
        ...(usuarioId ? { usuarioId } : {}),
      },
    });
    return NextResponse.json(cliente);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese email." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const clienteExistente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientePorSesion(sesion) },
  });
  if (!clienteExistente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  try {
    await prisma.cliente.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      const suscripcionesAsociadas = await prisma.suscripcion.count({ where: { clienteId: id } });
      return NextResponse.json(
        { error: "No se puede borrar: tiene suscripciones asociadas.", suscripcionesAsociadas },
        { status: 409 },
      );
    }
    throw error;
  }
}
