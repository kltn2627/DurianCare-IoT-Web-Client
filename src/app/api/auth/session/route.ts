import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  AuthApiError,
  authErrorResponse,
  clearAuthenticationCookies,
  backendRequest,
  readSession,
  rotateRefreshToken,
  setRefreshedTokenCookies,
  tokenNeedsRefresh,
} from "@/lib/auth/server";
import type { ProfileRecord } from "@/lib/profile/types";

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

  let currentAccessToken = accessToken;
  let rotatedTokens: Awaited<ReturnType<typeof rotateRefreshToken>> | null = null;

  if (tokenNeedsRefresh(accessToken)) {
    try {
      rotatedTokens = await rotateRefreshToken(refreshToken);
      currentAccessToken = rotatedTokens.accessToken;
    } catch (error) {
      const response = authErrorResponse(error);
      clearAuthenticationCookies(response);
      return response;
    }
  }

  let nextSession = session;
  if (currentAccessToken) {
    try {
      const profile = await backendRequest<ProfileRecord>("/api/users/me", {
        headers: { authorization: `Bearer ${currentAccessToken}` },
      });
      nextSession = {
        ...session,
        accountStatus: profile.accountStatus ?? session.accountStatus,
        profile: {
          ...session.profile,
          accountStatus: profile.accountStatus ?? session.accountStatus,
        },
      };
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        const response = NextResponse.json(
          {
            status: 401,
            error: "Unauthorized",
            message: "Phiên đăng nhập đã hết hạn.",
          },
          { status: 401 },
        );
        clearAuthenticationCookies(response);
        return response;
      }
    }
  }

  const response = NextResponse.json(nextSession);
  response.cookies.set(AUTH_COOKIES.accountStatus, nextSession.accountStatus, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rotatedTokens
      ? Math.max(1, rotatedTokens.refreshTokenExpiresIn)
      : remainingSeconds(refreshToken),
  });
  if (rotatedTokens) {
    setRefreshedTokenCookies(response, rotatedTokens);
  }
  return response;
}

function remainingSeconds(token: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    return Math.max(1, (payload.exp ?? 0) - Math.floor(Date.now() / 1000));
  } catch {
    return 1;
  }
}
