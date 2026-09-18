import { NextResponse } from "next/server";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sesion.id },
    select: { nombre: true, email: true, rol: true, banco: true, numeroCuenta: true, rif: true },
  });
  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "EMPRESA") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const datos = await request.json();
  const user = await prisma.user.update({
    where: { id: sesion.id },
    data: {
      banco: datos.banco?.trim() || null,
      numeroCuenta: datos.numeroCuenta?.trim() || null,
      rif: datos.rif?.trim() || null,
    },
    select: { nombre: true, email: true, banco: true, numeroCuenta: true, rif: true },
  });
  return NextResponse.json(user);
}
