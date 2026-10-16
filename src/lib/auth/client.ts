import type {
  ApproveExpertResponse,
  ApiErrorBody,
  EngineerApplicationDetail,
  EngineerApplicationSummary,
  EngineerRegistrationRequest,
  AuthSession,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ReviewEngineerApplicationRequest,
  VerifyOtpRequest,
} from "./types";

export class ClientAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ClientAuthError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorBody
    | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Yêu cầu xác thực không thành công.";
    const retryAfterSeconds =
      payload &&
      typeof payload === "object" &&
      "retryAfterSeconds" in payload &&
      typeof payload.retryAfterSeconds === "number"
        ? payload.retryAfterSeconds
        : undefined;
    throw new ClientAuthError(message, response.status, retryAfterSeconds);
  }
  return payload as T;
}

async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const text = await response.text().catch(() => "");
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Yêu cầu quản trị không thành công.";
    throw new ClientAuthError(message, response.status);
  }

  return payload as T;
}

export const authClient = {
  login: (body: LoginRequest) =>
    request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  register: (body: RegisterRequest) =>
    request<MessageResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  registerEngineer: (body: EngineerRegistrationRequest, qualificationFiles: File[]) => {
    const formData = new FormData();
    formData.append("email", body.email);
    formData.append("password", body.password);
    formData.append("fullName", body.fullName);
    if (body.phoneNumber) formData.append("phoneNumber", body.phoneNumber);
    formData.append("workplace", body.workplace);
    formData.append("specialization", body.specialization);
    formData.append("yearsExperience", String(body.yearsExperience));
    formData.append("biography", body.biography);
    qualificationFiles.forEach((file) => formData.append("qualificationFiles", file));
    return request<MessageResponse>("/api/auth/register/engineer", {
      method: "POST",
      body: formData,
    });
  },
  approveExpert: (userId: string) =>
    request<ApproveExpertResponse>(
      `/api/auth/admin/users/${encodeURIComponent(userId)}/approve-expert`,
      { method: "POST" },
    ),
  verifyOtp: (body: VerifyOtpRequest) =>
    request<MessageResponse>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resendOtp: (email: string) =>
    request<MessageResponse>("/api/auth/otp/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  session: () => request<AuthSession>("/api/auth/session"),
  refresh: () =>
    request<{ message: string }>("/api/auth/refresh", { method: "POST" }),
  logout: () =>
    request<MessageResponse>("/api/auth/logout", { method: "POST" }),
  listEngineerApplications: (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const query = params.toString();
    return backendRequest<EngineerApplicationSummary[]>(
      `/api/auth/admin/engineer-applications${query ? `?${query}` : ""}`,
    );
  },
  getEngineerApplication: (applicationId: string) =>
    backendRequest<EngineerApplicationDetail>(
      `/api/auth/admin/engineer-applications/${encodeURIComponent(applicationId)}`,
    ),
  approveEngineerApplication: (applicationId: string) =>
    backendRequest<MessageResponse>(
      `/api/auth/admin/engineer-applications/${encodeURIComponent(applicationId)}/approve`,
      { method: "POST" },
    ),
  rejectEngineerApplication: (
    applicationId: string,
    body: ReviewEngineerApplicationRequest,
  ) =>
    backendRequest<MessageResponse>(
      `/api/auth/admin/engineer-applications/${encodeURIComponent(applicationId)}/reject`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),
};

export async function apiFetch(
  backendPath: string,
  init?: RequestInit,
) {
  const normalized = backendPath.replace(/^\/api\//, "").replace(/^\//, "");
  const response = await fetch(`/api/backend/${normalized}`, init);
  if (response.status !== 401) return response;
  if (typeof window !== "undefined") window.location.assign("/login");
  return response;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
