import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const role = request.cookies.get("durian-role")?.value;
  const session = request.cookies.get("dc_session")?.value;
  const refreshToken = request.cookies.get("dc_refresh_token")?.value;
  const { pathname } = request.nextUrl;
  const authenticated = Boolean(role && session && refreshToken);

  if (["/login", "/register"].includes(pathname)) {
    if (!authenticated) return NextResponse.next();
    return NextResponse.redirect(
      new URL(role === "OWNER" ? "/dashboard/client" : "/dashboard/admin", request.url),
    );
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/dashboard/client") && role !== "OWNER") {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  if (
    pathname.startsWith("/dashboard/admin") &&
    !["ADMIN", "ENGINEER"].includes(role ?? "")
  ) {
    return NextResponse.redirect(new URL("/dashboard/client", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/client/:path*",
    "/dashboard/admin/:path*",
    "/profile/:path*",
  ],
};

