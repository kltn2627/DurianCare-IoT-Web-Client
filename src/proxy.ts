import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const role = request.cookies.get("durian-role")?.value;
  const { pathname } = request.nextUrl;

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/dashboard/client") && role !== "OWNER") {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  if (pathname.startsWith("/dashboard/admin") && !["ADMIN", "ENGINEER"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard/client", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/client/:path*", "/dashboard/admin/:path*", "/profile/:path*"],
};

