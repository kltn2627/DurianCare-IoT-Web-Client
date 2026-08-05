import type {
  ChatConversation,
  ChatConversationStatus,
  ChatMessageSender,
  CreateConversationRequest,
  PublishRegimenRequest,
  SendChatMessageRequest,
} from "./types";

interface ListConversationsResponse {
  conversations: ChatConversation[];
  engineers: Array<{
    name: string;
    phoneNumber: string;
    specialty: string;
    initials: string;
  }>;
}

async function chatRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("content-type", "application/json");
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || "Khong the thuc hien yeu cau chat.");
  }
  return payload as T;
}

function normalizeConversationResponse(
  payload: { conversation?: ChatConversation | null } | null,
): { conversation: ChatConversation } {
  if (!payload?.conversation?.id) {
    throw new Error(
      "Backend chưa trả về phòng chat. Hãy restart chat-service và thử lại.",
    );
  }
  return { conversation: payload.conversation };
}

function normalizeListConversationsResponse(payload: ListConversationsResponse | null): ListConversationsResponse {
  return {
    conversations: Array.isArray(payload?.conversations) ? payload.conversations : [],
    engineers: Array.isArray(payload?.engineers) ? payload.engineers : [],
  };
}

export const chatClient = {
  listConversations(params: {
    role?: "FARMER" | "ENGINEER";
    phone?: string | null;
    peerPhone?: string;
  }) {
    const search = new URLSearchParams();
    if (params.role) search.set("role", params.role);
    if (params.phone) search.set("phone", params.phone);
    if (params.peerPhone) search.set("peerPhone", params.peerPhone);
    return chatRequest<ListConversationsResponse | null>(`/api/chat/conversations?${search.toString()}`)
      .then(normalizeListConversationsResponse);
  },
  createConversation(body: CreateConversationRequest) {
    return chatRequest<{ conversation?: ChatConversation | null } | null>("/api/chat/conversations", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(normalizeConversationResponse);
  },
  sendMessage(conversationId: string, body: SendChatMessageRequest) {
    return chatRequest<{ conversation?: ChatConversation | null } | null>(
      `/api/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ).then(normalizeConversationResponse);
  },
  markRead(conversationId: string) {
    return chatRequest<{ conversation?: ChatConversation | null } | null>(
      `/api/chat/conversations/${conversationId}/read`,
      { method: "POST" },
    ).then(normalizeConversationResponse);
  },
  setStatus(conversationId: string, status: ChatConversationStatus) {
    return chatRequest<{ conversation?: ChatConversation | null } | null>(
      `/api/chat/conversations/${conversationId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ).then(normalizeConversationResponse);
  },
  publishRegimen(conversationId: string, body: PublishRegimenRequest) {
    return chatRequest<{ conversation?: ChatConversation | null } | null>(
      `/api/chat/conversations/${conversationId}/regimens`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ).then(normalizeConversationResponse);
  },
  deleteConversation(conversationId: string) {
    return chatRequest<{ ok?: boolean } | null>(
      `/api/chat/conversations/${conversationId}`,
      { method: "DELETE" },
    ).then(() => ({ ok: true }));
  },
};

export function senderForRole(role: "FARMER" | "ENGINEER"): ChatMessageSender {
  return role === "ENGINEER" ? "ENGINEER" : "FARMER";
}
