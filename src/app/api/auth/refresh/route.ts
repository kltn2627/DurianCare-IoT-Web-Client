import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  authErrorResponse,
  clearAuthenticationCookies,
  rotateRefreshToken,
  setRefreshedTokenCookies,
} from "@/lib/auth/server";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
  if (!refreshToken) {
    const response = NextResponse.json(
      {
        status: 401,
        error: "Unauthorized",
        message: "Phiên đăng nhập không còn refresh token.",
      },
      { status: 401 },
    );
    clearAuthenticationCookies(response);
    return response;
  }
  try {
    const tokens = await rotateRefreshToken(refreshToken);
    const response = NextResponse.json({ message: "Session refreshed." });
    setRefreshedTokenCookies(response, tokens);
    return response;
  } catch (error) {
    const response = authErrorResponse(error);
    clearAuthenticationCookies(response);
    return response;
  }
}
