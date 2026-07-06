import { NextResponse } from "next/server";
import { crearSesion, verifyPassword } from "@/lib/auth";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const datos = await request.json();

  if (!datos.email || !datos.password) {
    return NextResponse.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: datos.email } });
  if (!user) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const passwordValida = await verifyPassword(datos.password, user.passwordHash);
  if (!passwordValida) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const { token, expiraEn } = await crearSesion(user.id);

  const response = NextResponse.json({ ok: true, rol: user.rol });
  response.cookies.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiraEn,
    path: "/",
  });
  return response;
}
