import { NextRequest, NextResponse } from "next/server";
import type { ApproveExpertResponse } from "@/lib/auth/types";
import { authErrorResponse, backendRequest } from "@/lib/auth/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const result = await backendRequest<ApproveExpertResponse>(
      `/api/auth/admin/users/${encodeURIComponent(userId)}/approve-expert`,
      { method: "POST" },
    );
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
