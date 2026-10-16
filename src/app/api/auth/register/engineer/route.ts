import { NextResponse } from "next/server";
import type { MessageResponse } from "@/lib/auth/types";
import {
  authErrorResponse,
  backendFormRequest,
} from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const formData = normalizeFormData(await request.formData());
    const result = await backendFormRequest<MessageResponse>(
      "/api/auth/register/engineer",
      formData,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

function normalizeFormData(source: FormData) {
  const formData = new FormData();
  source.forEach((value, key) => {
    if (value instanceof File) {
      formData.append(key, value, value.name);
      return;
    }
    formData.append(key, value);
  });
  return formData;
}
