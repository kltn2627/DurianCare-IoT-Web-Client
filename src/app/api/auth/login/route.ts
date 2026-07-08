import { NextResponse } from "next/server";
import type { AuthenticationResponse, LoginRequest } from "@/lib/auth/types";
import {
  AuthApiError,
  authErrorResponse,
  backendRequest,
  sessionFromAuthentication,
  setAuthenticationCookies,
} from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequest;
    const authentication = await backendRequest<AuthenticationResponse>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(body) },
    );
    if (authentication.role === "GUEST") {
      await backendRequest("/api/auth/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${authentication.accessToken}` },
      });
      throw new AuthApiError(403, {
        status: 403,
        error: "Forbidden",
        message: "Web Client chưa cung cấp workspace cho vai trò GUEST.",
      });
    }
    const response = NextResponse.json(
      sessionFromAuthentication(authentication),
    );
    setAuthenticationCookies(response, authentication);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
