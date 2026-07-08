import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  authErrorResponse,
  clearAuthenticationCookies,
  readSession,
  rotateRefreshToken,
  setRefreshedTokenCookies,
  tokenNeedsRefresh,
} from "@/lib/auth/server";

export async function GET() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  const accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;

  if (!session || !refreshToken) {
    const response = NextResponse.json(
      {
        status: 401,
        error: "Unauthorized",
        message: "Chưa có phiên đăng nhập hợp lệ.",
      },
      { status: 401 },
    );
    clearAuthenticationCookies(response);
    return response;
  }

  if (!tokenNeedsRefresh(accessToken)) return NextResponse.json(session);

  try {
    const tokens = await rotateRefreshToken(refreshToken);
    const response = NextResponse.json(session);
    setRefreshedTokenCookies(response, tokens);
    return response;
  } catch (error) {
    const response = authErrorResponse(error);
    clearAuthenticationCookies(response);
    return response;
  }
}
