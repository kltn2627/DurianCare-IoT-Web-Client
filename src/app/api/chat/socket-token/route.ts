import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  AuthApiError,
  clearAuthenticationCookies,
  readSession,
  rotateRefreshToken,
  setRefreshedTokenCookies,
  tokenNeedsRefresh,
} from "@/lib/auth/server";

function unauthorizedBody() {
  return {
    status: 401,
    error: "Unauthorized",
    message: "Phiên đăng nhập đã hết hạn.",
  };
}

function assertChatRole(role: string) {
  if (role === "FARMER" || role === "ENGINEER") return;
  throw new AuthApiError(403, {
    status: 403,
    error: "Forbidden",
    message: "Chat realtime chỉ dành cho nông hộ và kỹ sư.",
  });
}

export async function GET() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  let accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
  let rotatedTokens: Awaited<ReturnType<typeof rotateRefreshToken>> | null = null;

  try {
    if (!session?.userId || !refreshToken) throw new AuthApiError(401, unauthorizedBody());
    assertChatRole(session.role);
    if (tokenNeedsRefresh(accessToken)) {
      rotatedTokens = await rotateRefreshToken(refreshToken);
      accessToken = rotatedTokens.accessToken;
    }
    if (!accessToken) throw new AuthApiError(401, unauthorizedBody());

    const response = NextResponse.json({ accessToken });
    if (rotatedTokens) setRefreshedTokenCookies(response, rotatedTokens);
    return response;
  } catch (error) {
    const status = error instanceof AuthApiError ? error.status : 503;
    const body =
      error instanceof AuthApiError
        ? error.body
        : {
            status,
            error: "Service Unavailable",
            message: "Không thể chuẩn bị token realtime Chat.",
          };
    const response = NextResponse.json(body, { status });
    if (status === 401) clearAuthenticationCookies(response);
    return response;
  }
}
