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

type RouteContext = { params: Promise<{ path?: string[] }> };

const CHAT_SERVICE_URL = (
  process.env.CHAT_SERVICE_URL ??
  process.env.DURIANCARE_CHAT_SERVICE_URL ??
  "http://localhost:3002"
).replace(/\/$/, "");

async function proxy(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  let accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
  let rotatedTokens: Awaited<ReturnType<typeof rotateRefreshToken>> | null = null;
  const method = request.method.toUpperCase();
  const requestBody = ["GET", "HEAD"].includes(method)
    ? undefined
    : await request.arrayBuffer();

  try {
    if (!session?.userId) throw new AuthApiError(401, unauthorizedBody());
    if (tokenNeedsRefresh(accessToken)) {
      if (!refreshToken) throw new AuthApiError(401, unauthorizedBody());
      rotatedTokens = await rotateRefreshToken(refreshToken);
      accessToken = rotatedTokens.accessToken;
    }

    let chatResponse = await forward(
      request,
      context,
      accessToken!,
      session.userId,
      chatRole(session.role),
      requestBody,
    );
    if (chatResponse.status === 401 && refreshToken && !rotatedTokens) {
      rotatedTokens = await rotateRefreshToken(refreshToken);
      chatResponse = await forward(
        request,
        context,
        rotatedTokens.accessToken,
        session.userId,
        chatRole(session.role),
        requestBody,
      );
    }

    const response = new NextResponse(await chatResponse.arrayBuffer(), {
      status: chatResponse.status,
      headers: responseHeaders(chatResponse.headers),
    });
    if (rotatedTokens) setRefreshedTokenCookies(response, rotatedTokens);
    if (chatResponse.status === 401) clearAuthenticationCookies(response);
    return response;
  } catch (error) {
    const status = error instanceof AuthApiError ? error.status : 503;
    const body =
      error instanceof AuthApiError
        ? error.body
        : {
            status,
            error: "Service Unavailable",
            message: "Không thể kết nối đến DurianCare Chat Service.",
          };
    const response = NextResponse.json(body, { status });
    if (status === 401) clearAuthenticationCookies(response);
    return response;
  }
}

async function forward(
  request: Request,
  context: RouteContext,
  accessToken: string,
  userId: string,
  role: "FARMER" | "ENGINEER",
  body: ArrayBuffer | undefined,
) {
  const { path = [] } = await context.params;
  const sourceUrl = new URL(request.url);
  const target = `${CHAT_SERVICE_URL}/api/chat/${path.join("/")}${sourceUrl.search}`;
  const headers = new Headers(request.headers);
  ["host", "cookie", "content-length", "connection"].forEach((name) =>
    headers.delete(name),
  );
  headers.set("authorization", `Bearer ${accessToken}`);
  headers.set("x-auth-user-id", userId);
  headers.set("x-auth-role", role);
  return fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });
}

function chatRole(role: string): "FARMER" | "ENGINEER" {
  if (role === "FARMER") return "FARMER";
  if (role === "ENGINEER" || role === "EXPERT") return "ENGINEER";
  throw new AuthApiError(403, {
    status: 403,
    error: "Forbidden",
    message: "Chat chỉ dành cho nông hộ và kỹ sư.",
  });
}

function responseHeaders(source: Headers) {
  const headers = new Headers();
  ["content-type", "location", "retry-after"].forEach((name) => {
    const value = source.get(name);
    if (value) headers.set(name, value);
  });
  return headers;
}

function unauthorizedBody() {
  return {
    status: 401,
    error: "Unauthorized",
    message: "Phiên đăng nhập đã hết hạn.",
  };
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
