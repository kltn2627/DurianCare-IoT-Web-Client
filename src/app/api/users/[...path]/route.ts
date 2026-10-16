import { proxyAuthenticatedGatewayRequest } from "@/lib/auth/gatewayProxy";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyAuthenticatedGatewayRequest(
    request,
    `/api/users/${path.join("/")}`,
  );
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
