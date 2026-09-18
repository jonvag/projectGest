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
    select: {
      id: true,
      suscripcionId: true,
      clienteId: true,
      referencia: true,
      comprobanteTipo: true,
      estado: true,
      creadoEn: true,
      revisadoEn: true,
      // Nunca seleccionar `comprobante` (Bytes) acá: la lista solo necesita
      // metadata, la imagen se pide aparte y lazy vía /comprobante cuando
      // el usuario la abre. Antes se traía el binario completo de cada
      // reporte en cada carga de la lista sin usarlo.
      cliente: { select: { nombre: true } },
      suscripcion: { select: { servicio: true, ciclo: true, proximoCobro: true } },
    },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(reportes.map(serializeReportePago));
}
