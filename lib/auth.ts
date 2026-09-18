import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Prisma, Rol } from "@prisma/client";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

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

export async function requireSesion(): Promise<SesionActual | null> {
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
