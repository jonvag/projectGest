import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/auth";

export async function POST(request: Request) {
  const datos = await request.json().catch(() => ({}));
  if (typeof datos.refreshToken === "string" && datos.refreshToken) {
    await cerrarSesion(datos.refreshToken);
  }
  return NextResponse.json({ ok: true });
}
