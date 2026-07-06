import { NextResponse } from "next/server";
import { requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol !== "SUPERUSER") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const empresa = await prisma.user.findFirst({
    where: { id, rol: "EMPRESA" },
    select: {
      id: true,
      email: true,
      nombre: true,
      creadoEn: true,
      clientes: { orderBy: { creadoEn: "asc" } },
    },
  });
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }
  return NextResponse.json(empresa);
}
