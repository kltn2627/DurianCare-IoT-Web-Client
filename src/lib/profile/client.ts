import type {
  ProfileApiErrorBody,
  ProfileAvatarResponse,
  ProfileDeleteAvatarResponse,
  ProfileRecord,
  ProfileUpdateRequest,
} from "./types";

export class ProfileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ProfileApiErrorBody,
  ) {
    super(message);
    this.name = "ProfileApiError";
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const body = isProfileApiError(payload)
      ? payload
      : {
          status: response.status,
          error: response.statusText || "Request Failed",
          message: "Không thể tải dữ liệu hồ sơ.",
        };
    throw new ProfileApiError(body.message, response.status, body);
  }

  return payload as T;
}

function requestWithProgress<T>(
  path: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path);
    xhr.responseType = "json";
    xhr.withCredentials = true;
    xhr.setRequestHeader("accept", "application/json");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const payload = xhr.response as T | ProfileApiErrorBody | null;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
        return;
      }
      const body = isProfileApiError(payload)
        ? payload
        : {
            status: xhr.status,
            error: xhr.statusText || "Request Failed",
            message: "Không thể tải ảnh đại diện.",
          };
      reject(new ProfileApiError(body.message, xhr.status, body));
    };

    xhr.onerror = () => {
      reject(
        new ProfileApiError("Không thể tải ảnh đại diện.", 503, {
          status: 503,
          error: "Service Unavailable",
          message: "Không thể tải ảnh đại diện.",
        }),
      );
    };

    const formData = new FormData();
    formData.append("avatar", file);
    xhr.send(formData);
  });
}

export const profileClient = {
  me: () => requestJson<ProfileRecord>("/api/backend/users/me"),
  updateMe: (body: ProfileUpdateRequest) =>
    requestJson<ProfileRecord>("/api/backend/users/me", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  uploadAvatar: (
    file: File,
    onProgress?: (progress: number) => void,
  ) => requestWithProgress<ProfileAvatarResponse>("/api/backend/users/me/avatar", file, onProgress),
  deleteAvatar: () =>
    requestJson<ProfileDeleteAvatarResponse>("/api/backend/users/me/avatar", {
      method: "DELETE",
    }),
};

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isProfileApiError(value: unknown): value is ProfileApiErrorBody {
  return Boolean(
    value &&
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string",
  );
}
