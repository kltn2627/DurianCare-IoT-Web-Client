import "server-only";

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { NextResponse } from "next/server";
import type {
  AccessTokenResponse,
  ApiErrorBody,
  AuthenticationResponse,
  AuthSession,
} from "./types";
import { toDashboardRole } from "./types";

export const AUTH_COOKIES = {
  accessToken: "dc_access_token",
  refreshToken: "dc_refresh_token",
  session: "dc_session",
  backendRole: "dc_role",
  dashboardRole: "durian-role",
} as const;

const API_BASE_URL = (
  process.env.DURIANCARE_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

const secureCookie = process.env.NODE_ENV === "production";

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "AuthApiError";
  }
}

export async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("accept", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new AuthApiError(503, {
      status: 503,
      error: "Service Unavailable",
      message: "Không thể kết nối đến DurianCare Gateway.",
    });
  }

  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const body = isApiError(payload)
      ? {
          ...payload,
          ...(Number.isFinite(retryAfter) && retryAfter > 0
            ? { retryAfterSeconds: retryAfter }
            : {}),
        }
      : {
          status: response.status,
          error: response.statusText || "Request Failed",
          message: "Yêu cầu xác thực không thành công.",
        };
    throw new AuthApiError(response.status, body);
  }
  return payload as T;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthApiError) {
    return NextResponse.json(error.body, { status: error.status });
  }
  return NextResponse.json(
    {
      status: 500,
      error: "Internal Server Error",
      message: "Đã xảy ra lỗi không mong muốn trong lớp xác thực Web.",
    } satisfies ApiErrorBody,
    { status: 500 },
  );
}

export function sessionFromAuthentication(
  authentication: AuthenticationResponse,
): AuthSession {
  return {
    userId: authentication.userId,
    email: authentication.email,
    role: authentication.role,
    profile: authentication.profile,
  };
}

export function readSession(cookies: ReadonlyRequestCookies) {
  const encoded = cookies.get(AUTH_COOKIES.session)?.value;
  if (!encoded) return null;
  try {
    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuthenticationCookies(
  response: NextResponse,
  authentication: AuthenticationResponse,
) {
  const session = sessionFromAuthentication(authentication);
  const refreshMaxAge = tokenRemainingSeconds(authentication.refreshToken);
  setTokenCookies(
    response,
    authentication.accessToken,
    authentication.refreshToken,
    authentication.accessTokenExpiresIn,
    refreshMaxAge,
  );
  const sessionValue = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  setCookie(response, AUTH_COOKIES.session, sessionValue, refreshMaxAge);
  setCookie(response, AUTH_COOKIES.backendRole, session.role, refreshMaxAge);
  const dashboardRole = toDashboardRole(session.role);
  if (dashboardRole) {
    setCookie(
      response,
      AUTH_COOKIES.dashboardRole,
      dashboardRole,
      refreshMaxAge,
    );
  }
}

export function setRefreshedTokenCookies(
  response: NextResponse,
  tokens: AccessTokenResponse,
) {
  setTokenCookies(
    response,
    tokens.accessToken,
    tokens.refreshToken,
    tokens.expiresIn,
    tokens.refreshTokenExpiresIn,
  );
}

function setTokenCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  accessMaxAge: number,
  refreshMaxAge: number,
) {
  setCookie(
    response,
    AUTH_COOKIES.accessToken,
    accessToken,
    Math.max(1, accessMaxAge),
  );
  setCookie(
    response,
    AUTH_COOKIES.refreshToken,
    refreshToken,
    Math.max(1, refreshMaxAge),
  );
}

function setCookie(
  response: NextResponse,
  name: string,
  value: string,
  maxAge: number,
) {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearAuthenticationCookies(response: NextResponse) {
  Object.values(AUTH_COOKIES).forEach((name) =>
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }),
  );
}

export function tokenNeedsRefresh(token?: string) {
  if (!token) return true;
  return tokenRemainingSeconds(token) <= 30;
}

function tokenRemainingSeconds(token: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    return Math.max(1, (payload.exp ?? 0) - Math.floor(Date.now() / 1000));
  } catch {
    return 1;
  }
}

const refreshRequests = new Map<string, Promise<AccessTokenResponse>>();

export function rotateRefreshToken(refreshToken: string) {
  const existing = refreshRequests.get(refreshToken);
  if (existing) return existing;
  const request = backendRequest<AccessTokenResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  }).finally(() => refreshRequests.delete(refreshToken));
  refreshRequests.set(refreshToken, request);
  return request;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isApiError(value: unknown): value is ApiErrorBody {
  return Boolean(
    value &&
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string",
  );
}
