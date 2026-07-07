import { NextResponse } from "next/server";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const notificaciones = await prisma.notificacion.findMany({
    where: { cliente: filtroClientePorSesion(sesion) },
    include: {
      cliente: { select: { nombre: true } },
      suscripcion: { select: { servicio: true } },
    },
    orderBy: { enviadoEn: "desc" },
  });
  return NextResponse.json(notificaciones);
}
