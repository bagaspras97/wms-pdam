import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/" || pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();
  return NextResponse.rewrite(new URL("/", request.url));
}

export const config = { matcher: ["/((?!api).*)"] };
