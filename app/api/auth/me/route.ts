import { NextResponse } from "next/server";
import { requireSesion } from "@/lib/auth";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  return NextResponse.json({ email: sesion.email, rol: sesion.rol });
}
