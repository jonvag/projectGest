import { NextResponse } from "next/server";
import { hashPassword, requireSesion, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const datos = await request.json();
  if (!datos.passwordActual || !datos.passwordNueva) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (datos.passwordNueva.length < 8) {
    return NextResponse.json(
      { error: "La contraseña nueva debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: sesion.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const passwordValida = await verifyPassword(datos.passwordActual, user.passwordHash);
  if (!passwordValida) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta." }, { status: 400 });
  }

  const passwordHash = await hashPassword(datos.passwordNueva);
  await prisma.user.update({ where: { id: sesion.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
