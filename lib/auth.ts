import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Prisma, Rol } from "@prisma/client";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
// Duración del access token de la app mobile — corto a propósito: si se
// filtra, deja de servir rápido. El refresh token (la Session de siempre)
// es el que dura los 7 días de arriba.
const DURACION_ACCESS_TOKEN = "30m";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function crearSesion(userId: string): Promise<{ token: string; expiraEn: Date }> {
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS);
  const session = await prisma.session.create({
    data: { userId, expiraEn },
  });
  return { token: session.id, expiraEn };
}

export async function cerrarSesion(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: token } });
}

export type SesionActual = { id: string; email: string; nombre: string | null; rol: Rol };

// Access token firmado para la app mobile (Kotlin). Corta duración: la app
// lo vuelve a pedir con el refresh token (ver crearSesion/POST /api/auth/mobile/refresh)
// en vez de mandar la password de nuevo.
export function crearAccessToken(sesion: SesionActual): string {
  return jwt.sign(sesion, process.env.JWT_SECRET!, { expiresIn: DURACION_ACCESS_TOKEN });
}

function verificarAccessToken(token: string): SesionActual | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof payload !== "object" || !payload.id) return null;
    return { id: payload.id, email: payload.email, nombre: payload.nombre, rol: payload.rol };
  } catch {
    return null;
  }
}

export async function requireSesion(): Promise<SesionActual | null> {
  // App mobile: manda el access token en el header Authorization en vez de
  // cookie. Si vino un Bearer, se valida como tal — no cae al chequeo de
  // cookie aunque el token sea inválido, para no mezclar los dos caminos.
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verificarAccessToken(authHeader.slice(7));
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session || session.expiraEn < new Date()) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    nombre: session.user.nombre,
    rol: session.user.rol,
  };
}

export function filtroClientePorSesion(sesion: SesionActual): Prisma.ClienteWhereInput {
  if (sesion.rol === "SUPERUSER") return {};
  if (sesion.rol === "EMPRESA") return { usuarioId: sesion.id };
  return { userId: sesion.id };
}
