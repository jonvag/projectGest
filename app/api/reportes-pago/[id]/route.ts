import { NextResponse } from "next/server";
import { hoyFechaDb, parseFechaDb, serializeReportePago } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol === "CLIENTE") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;

  const reporteExistente = await prisma.reportePago.findFirst({
    where: { id, cliente: filtroClientePorSesion(sesion) },
    include: { suscripcion: true },
  });
  if (!reporteExistente) {
    return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
  }

  const datos = await request.json();
  if (datos.estado !== "verificado" && datos.estado !== "rechazado") {
    return NextResponse.json({ error: "estado debe ser 'verificado' o 'rechazado'." }, { status: 400 });
  }

  if (datos.estado === "rechazado") {
    const reporte = await prisma.reportePago.update({
      where: { id },
      data: { estado: "rechazado", revisadoEn: new Date() },
      select: {
        id: true,
        suscripcionId: true,
        clienteId: true,
        referencia: true,
        comprobanteTipo: true,
        estado: true,
        creadoEn: true,
        revisadoEn: true,
        cliente: { select: { nombre: true } },
        suscripcion: { select: { servicio: true, ciclo: true, proximoCobro: true } },
      },
    });
    return NextResponse.json(serializeReportePago(reporte));
  }

  if (!datos.fechaProximoCobro) {
    return NextResponse.json(
      { error: "Falta confirmar la fecha del próximo cobro." },
      { status: 400 },
    );
  }

  const { suscripcion } = reporteExistente;
  const fechaCobroAnterior = suscripcion.proximoCobro;
  const fechaProximoCobroNueva = parseFechaDb(datos.fechaProximoCobro);

  const [, , reporte] = await prisma.$transaction([
    prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { proximoCobro: fechaProximoCobroNueva },
    }),
    prisma.pago.create({
      data: {
        suscripcionId: suscripcion.id,
        clienteId: reporteExistente.clienteId,
        servicio: suscripcion.servicio,
        monto: suscripcion.monto,
        fechaPago: hoyFechaDb(),
        fechaCobroAnterior,
        fechaProximoCobroNueva,
        referencia: reporteExistente.referencia,
      },
    }),
    prisma.reportePago.update({
      where: { id },
      data: { estado: "verificado", revisadoEn: new Date() },
      select: {
        id: true,
        suscripcionId: true,
        clienteId: true,
        referencia: true,
        comprobanteTipo: true,
        estado: true,
        creadoEn: true,
        revisadoEn: true,
        cliente: { select: { nombre: true } },
        suscripcion: { select: { servicio: true, ciclo: true, proximoCobro: true } },
      },
    }),
  ]);

  return NextResponse.json(serializeReportePago(reporte));
}
