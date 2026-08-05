import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const role = request.cookies.get("durian-role")?.value;
  const accountStatus = request.cookies.get("dc_account_status")?.value;
  const session = request.cookies.get("dc_session")?.value;
  const refreshToken = request.cookies.get("dc_refresh_token")?.value;
  const { pathname } = request.nextUrl;
  const authenticated = Boolean(role && session && refreshToken);
  const awaitingApproval =
    accountStatus === "PENDING_VERIFICATION" ||
    accountStatus === "PENDING_APPROVAL" ||
    accountStatus === "REJECTED";

  const dashboardTarget =
    role === "OWNER"
      ? "/dashboard/client"
      : role === "ENGINEER" || role === "EXPERT"
        ? "/dashboard/engineer"
        : "/dashboard/admin";

  if (["/login", "/register"].includes(pathname)) {
    if (!authenticated) return NextResponse.next();
    if (awaitingApproval) {
      return NextResponse.redirect(new URL("/approval", request.url));
    }
    return NextResponse.redirect(new URL(dashboardTarget, request.url));
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/approval")) {
    if (!awaitingApproval) {
      return NextResponse.redirect(new URL(dashboardTarget, request.url));
    }
    return NextResponse.next();
  }

  if (awaitingApproval) {
    return NextResponse.redirect(new URL("/approval", request.url));
  }

  if (pathname.startsWith("/dashboard/client") && role !== "OWNER") {
    return NextResponse.redirect(new URL(dashboardTarget, request.url));
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(dashboardTarget, request.url));
  }

  if (
    pathname.startsWith("/dashboard/engineer") &&
    !["ENGINEER", "EXPERT"].includes(role ?? "")
  ) {
    return NextResponse.redirect(new URL(dashboardTarget, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/client/:path*",
    "/dashboard/admin/:path*",
    "/dashboard/engineer/:path*",
    "/dashboard/community/:path*",
    "/approval",
    "/profile/:path*",
  ],
};

