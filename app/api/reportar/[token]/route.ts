import { NextResponse } from "next/server";
import { serializeFechaDb } from "@/lib/api-serializers";
import { prisma } from "@/lib/prisma";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { linkToken: token },
    include: {
      cliente: {
        select: {
          nombre: true,
          usuario: { select: { nombre: true, banco: true, numeroCuenta: true, rif: true } },
        },
      },
    },
  });
  if (!suscripcion) {
    return NextResponse.json({ error: "Este link no es válido." }, { status: 404 });
  }

  return NextResponse.json({
    servicio: suscripcion.servicio,
    monto: suscripcion.monto,
    ciclo: suscripcion.ciclo,
    proximoCobro: serializeFechaDb(suscripcion.proximoCobro),
    clienteNombre: suscripcion.cliente.nombre,
    empresaNombre: suscripcion.cliente.usuario.nombre,
    empresaBanco: suscripcion.cliente.usuario.banco,
    empresaNumeroCuenta: suscripcion.cliente.usuario.numeroCuenta,
    empresaRif: suscripcion.cliente.usuario.rif,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const suscripcion = await prisma.suscripcion.findUnique({ where: { linkToken: token } });
  if (!suscripcion) {
    return NextResponse.json({ error: "Este link no es válido." }, { status: 404 });
  }

  const formData = await request.formData();
  const referencia = formData.get("referencia");
  const archivo = formData.get("comprobante");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta subir el comprobante." }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json(
      { error: "El comprobante debe ser una imagen (JPEG, PNG o WebP)." },
      { status: 400 },
    );
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El comprobante no puede pesar más de 5MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await archivo.arrayBuffer());

  await prisma.reportePago.create({
    data: {
      suscripcionId: suscripcion.id,
      clienteId: suscripcion.clienteId,
      referencia: typeof referencia === "string" && referencia.trim() ? referencia.trim() : null,
      comprobante: bytes,
      comprobanteTipo: archivo.type,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
