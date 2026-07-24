import { NextResponse } from "next/server";
import { serializeReportePago } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const reportes = await prisma.reportePago.findMany({
    where: { cliente: filtroClientePorSesion(sesion) },
    include: {
      cliente: { select: { nombre: true } },
      suscripcion: { select: { servicio: true, ciclo: true, proximoCobro: true } },
    },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(reportes.map(serializeReportePago));
}
