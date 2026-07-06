import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/auth";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE)?.value;
  if (token) {
    await cerrarSesion(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(NOMBRE_COOKIE);
  return response;
}
