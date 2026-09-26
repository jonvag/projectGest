import { NextResponse } from "next/server";
import { crearAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// La app manda el refresh token (el id de su Session, de /mobile/login) para
// pedir un access token nuevo sin volver a mandar la contraseña. Si el
// refresh token también expiró (7 días sin abrir la app), 401 — ahí la app
// tiene que mostrar la pantalla de login de nuevo.
export async function POST(request: Request) {
  const datos = await request.json();
  const refreshToken = datos.refreshToken;

  if (typeof refreshToken !== "string" || !refreshToken) {
    return NextResponse.json({ error: "Falta el refreshToken." }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: refreshToken },
    include: { user: true },
  });
  if (!session || session.expiraEn < new Date()) {
    return NextResponse.json({ error: "Sesión vencida, iniciá sesión de nuevo." }, { status: 401 });
  }

  const sesion = {
    id: session.user.id,
    email: session.user.email,
    nombre: session.user.nombre,
    rol: session.user.rol,
  };
  const accessToken = crearAccessToken(sesion);

  return NextResponse.json({ accessToken, accessTokenExpiraEnSegundos: 30 * 60 });
}
