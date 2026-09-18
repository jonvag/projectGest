import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { hashPassword, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const datos = await request.json();
  if (!datos.email || !datos.password) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }
  if (cliente.userId) {
    return NextResponse.json({ error: "Este cliente ya tiene acceso." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(datos.password);
    const clienteActualizado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email: datos.email,
          nombre: cliente.nombre,
          passwordHash,
          rol: "CLIENTE",
        },
      });
      return tx.cliente.update({
        where: { id },
        data: { userId: user.id },
      });
    });
    return NextResponse.json(clienteActualizado, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const datos = await request.json();
  if (!datos.password) {
    return NextResponse.json({ error: "Falta la contraseña nueva." }, { status: 400 });
  }
  if (datos.password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }
  if (!cliente.userId) {
    return NextResponse.json({ error: "Este cliente todavía no tiene acceso creado." }, { status: 400 });
  }

  const passwordHash = await hashPassword(datos.password);
  await prisma.user.update({ where: { id: cliente.userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
