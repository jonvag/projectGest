import crypto from "crypto";
import { NextResponse } from "next/server";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.rol === "CLIENTE") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;

  const suscripcion = await prisma.suscripcion.findFirst({
    where: { id, cliente: filtroClientePorSesion(sesion) },
  });
  if (!suscripcion) {
    return NextResponse.json({ error: "Suscripción no encontrada." }, { status: 404 });
  }

  const token = suscripcion.linkToken ?? crypto.randomBytes(24).toString("hex");
  if (!suscripcion.linkToken) {
    await prisma.suscripcion.update({ where: { id }, data: { linkToken: token } });
  }

  return NextResponse.json({ token });
}
