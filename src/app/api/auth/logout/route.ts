import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { MessageResponse } from "@/lib/auth/types";
import {
  AUTH_COOKIES,
  backendRequest,
  clearAuthenticationCookies,
  rotateRefreshToken,
  tokenNeedsRefresh,
} from "@/lib/auth/server";

export async function POST() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;

  try {
    if (tokenNeedsRefresh(accessToken) && refreshToken) {
      accessToken = (await rotateRefreshToken(refreshToken)).accessToken;
    }
    if (accessToken) {
      await backendRequest<MessageResponse>("/api/auth/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
      });
    }
  } catch {
    // Local session removal must still complete when a token is already invalid.
  }

  const response = NextResponse.json({ message: "Logout completed." });
  clearAuthenticationCookies(response);
  return response;
}
