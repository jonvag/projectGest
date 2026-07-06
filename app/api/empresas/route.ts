import { NextResponse } from "next/server";
import { hashPassword, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const empresas = await prisma.user.findMany({
    where: { rol: "EMPRESA" },
    select: {
      id: true,
      email: true,
      nombre: true,
      creadoEn: true,
      _count: { select: { clientes: true } },
    },
    orderBy: { creadoEn: "asc" },
  });
  return NextResponse.json(empresas);
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const datos = await request.json();
  if (!datos.email || !datos.password) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(datos.password);
    const empresa = await prisma.user.create({
      data: {
        email: datos.email,
        nombre: datos.nombre || null,
        passwordHash,
        rol: "EMPRESA",
      },
      select: { id: true, email: true, nombre: true, creadoEn: true },
    });
    return NextResponse.json(empresa, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }
    throw error;
  }
}
