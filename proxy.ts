import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";

export function proxy(request: NextRequest) {
  const tieneSesion = request.cookies.has(NOMBRE_COOKIE);
  if (!tieneSesion) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
