import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/form-order", "/settings"];

export function middleware(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  const response = isProtected
    ? NextResponse.next()
    : NextResponse.next();

  if (isProtected) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/form-order/:path*", "/settings/:path*"],
};
