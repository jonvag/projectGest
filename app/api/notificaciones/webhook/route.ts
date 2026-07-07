import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const secreto = request.headers.get("x-n8n-secret");
  if (!secreto || secreto !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const datos = await request.json();
  if (!datos.suscripcionId || !datos.estado) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (datos.estado !== "enviado" && datos.estado !== "fallido") {
    return NextResponse.json({ error: "estado debe ser 'enviado' o 'fallido'." }, { status: 400 });
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { id: datos.suscripcionId },
  });
  if (!suscripcion) {
    return NextResponse.json({ error: "La suscripción indicada no existe." }, { status: 404 });
  }

  const notificacion = await prisma.notificacion.create({
    data: {
      suscripcionId: suscripcion.id,
      clienteId: suscripcion.clienteId,
      canal: datos.canal || "whatsapp",
      estado: datos.estado,
      detalle: datos.detalle || null,
    },
  });
  return NextResponse.json(notificacion, { status: 201 });
}
