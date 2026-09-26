import { NextResponse } from "next/server";
import { crearAccessToken, crearSesion, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Login para la app mobile: a diferencia de /api/auth/login (que setea una
// cookie httpOnly), acá no hay navegador ni cookie jar — se devuelven los
// tokens en el body para que la app los guarde ella misma (ver README de
// la app: EncryptedSharedPreferences/DataStore, nunca SharedPreferences
// plano).
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

  const { token: refreshToken, expiraEn } = await crearSesion(user.id);
  const sesion = { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol };
  const accessToken = crearAccessToken(sesion);

  return NextResponse.json({
    accessToken,
    accessTokenExpiraEnSegundos: 30 * 60,
    refreshToken,
    refreshTokenExpiraEn: expiraEn,
    usuario: sesion,
  });
}
