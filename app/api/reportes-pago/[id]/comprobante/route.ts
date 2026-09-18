import { NextResponse } from "next/server";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const reporte = await prisma.reportePago.findFirst({
    where: { id, cliente: filtroClientePorSesion(sesion) },
  });
  if (!reporte || !reporte.comprobante || !reporte.comprobanteTipo) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(reporte.comprobante), {
    headers: { "Content-Type": reporte.comprobanteTipo },
  });
}
