"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  CheckCheck,
  ClipboardList,
  ImagePlus,
  MessageCircleMore,
  Phone,
  Plus,
  RotateCw,
  Search,
  Send,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { chatClient } from "@/lib/chat/client";
import { connectionClient } from "@/lib/connections/client";
import type {
  ChatConversation,
  ChatMessage,
  TreatmentRegimen,
} from "@/lib/chat/types";
import type { UserConnection } from "@/lib/connections/types";

type WorkspaceRole = "FARMER" | "ENGINEER";

interface AttachmentDraft {
  name: string;
  preview: string;
}

type PendingConversationTarget = {
  kind: "connection";
  connection: UserConnection;
};

const emptyTreatmentPlan: TreatmentRegimen = {
  diagnosis: "",
  expectedOutcome: "",
  followUpDate: "",
  steps: [
    { completed: false, day: 1, task: "" },
    { completed: false, day: 2, task: "" },
    { completed: false, day: 3, task: "" },
  ],
  title: "",
};

const chatSocketUrl =
  process.env.NEXT_PUBLIC_CHAT_SOCKET_URL?.replace(/\/$/, "") ||
  "http://localhost:3002";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function peerName(conversation: ChatConversation, role: WorkspaceRole) {
  return role === "FARMER"
    ? conversation.engineer.name
    : conversation.farmer.name;
}

function peerPhone(conversation: ChatConversation, role: WorkspaceRole) {
  return role === "FARMER"
    ? conversation.engineer.phoneNumber
    : conversation.farmer.phoneNumber;
}

function isMine(message: ChatMessage, role: WorkspaceRole) {
  return (
    (role === "FARMER" && message.sender === "FARMER") ||
    (role === "ENGINEER" && message.sender === "ENGINEER")
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return new Intl.DateTimeFormat("vi-VN", {
    day: sameDay ? undefined : "2-digit",
    month: sameDay ? undefined : "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function MessageBubble({
  message,
  mine,
  onToggleRegimenStep,
  updatingStepKey,
}: {
  message: ChatMessage;
  mine: boolean;
  onToggleRegimenStep?: (message: ChatMessage, day: number, completed: boolean) => void;
  updatingStepKey?: string;
}) {
  if (message.type === "TREATMENT_REGIMEN" && message.regimen) {
    const completedCount = message.regimen.steps.filter((step) => step.completed).length;
    return (
      <article className="w-full max-w-[620px] rounded-2xl border border-[#dbe8df] bg-white p-4 text-sm text-neutral-800 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#2E5A44] text-white">
              <ClipboardList size={17} />
            </span>
            <span className="min-w-0">
              <small className="block text-xs font-extrabold uppercase tracking-wide text-[#B28B00]">
                Checklist điều trị
              </small>
              <b className="mt-0.5 block truncate text-base text-neutral-950">
                {message.regimen.title}
              </b>
            </span>
          </div>
          <span className="rounded-full bg-[#edf3ee] px-3 py-1 text-xs font-extrabold text-[#2E5A44]">
            {completedCount}/{message.regimen.steps.length}
          </span>
        </div>
        {message.regimen.diagnosis && (
          <p className="mt-3 rounded-xl border border-[#eef3ee] bg-[#f8faf7] px-3 py-2 text-sm font-semibold leading-relaxed text-neutral-600">
            Chẩn đoán: {message.regimen.diagnosis}
          </p>
        )}
        <div className="mt-3 space-y-2">
          {message.regimen.steps.map((step) => (
            <label
              key={step.day}
              className="flex cursor-pointer gap-3 rounded-xl border border-neutral-200 bg-white p-3 hover:bg-[#f8fbf7]"
            >
              <input
                type="checkbox"
                checked={step.completed}
                disabled={updatingStepKey === `${message.id}:${step.day}`}
                onChange={(event) =>
                  onToggleRegimenStep?.(message, step.day, event.target.checked)
                }
                className="mt-0.5 size-5 shrink-0 accent-[#2E5A44] disabled:cursor-wait"
              />
              <span>
                <b className="text-sm text-neutral-950">Bước {step.day}</b>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-neutral-600">
                  {step.task || "Chưa nhập nội dung bước điều trị."}
                </p>
              </span>
            </label>
          ))}
        </div>
        {message.regimen.followUpDate && (
          <small className="mt-3 block text-sm font-semibold text-neutral-500">
            Tái khám: {message.regimen.followUpDate}
          </small>
        )}
      </article>
    );
  }

  return (
    <div
      className={`max-w-[460px] overflow-hidden rounded-2xl text-sm shadow-sm ${
        mine
          ? "rounded-br-md bg-[#2E5A44] text-white"
          : "rounded-bl-md border border-neutral-100 bg-white text-neutral-700"
      }`}
    >
      {message.image && (
        <div
          className="aspect-[4/2.5] bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${message.image})` }}
        />
      )}
      <p className="whitespace-pre-line px-3.5 py-2.5 leading-relaxed">{message.content}</p>
    </div>
  );
}
export function PhoneConnectedChatWorkspace({ role }: { role: WorkspaceRole }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [treatmentPanelOpen, setTreatmentPanelOpen] = useState(false);
  const [regimenDraft, setRegimenDraft] = useState<TreatmentRegimen>(emptyTreatmentPlan);
  const [updatingStepKey, setUpdatingStepKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const loadConversations = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
        setError("");
      }
      try {
        const result = await chatClient.listConversations({
          role,
          peerPhone: query.trim() || undefined,
        });
        const accepted = await connectionClient.listConnections(0, 100);
        const nextConversations = result.conversations ?? [];
        setConversations(nextConversations);
        setConnections(accepted.items);
        setActiveId((current) => {
          if (current && nextConversations.some((item) => item.id === current)) {
            return current;
          }
          return nextConversations[0]?.id ?? "";
        });
      } catch (loadError) {
        if (!options?.silent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải danh sách hội thoại.",
          );
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [query, role],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadConversations({ silent: true });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  const activeConversation = conversations.find((item) => item.id === activeId);

  useEffect(() => {
    const socket = io(`${chatSocketUrl}/chat`, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("conversation.updated", (conversation: ChatConversation) => {
      if (!conversation?.id) return;
      setConversations((current) => {
        const exists = current.some((item) => item.id === conversation.id);
        const next = exists
          ? current.map((item) => (item.id === conversation.id ? conversation : item))
          : [conversation, ...current];
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
    });
    socket.on("conversation.deleted", (payload: { id?: string }) => {
      if (!payload?.id) return;
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== payload.id),
      );
      setActiveId((current) => (current === payload.id ? "" : current));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeId) return;
    socket.emit("room.join", activeId);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    void chatClient.markRead(activeId).then((result) => {
      setConversations((current) =>
        current.map((item) =>
          item.id === result.conversation.id ? result.conversation : item,
        ),
      );
    }).catch(() => undefined);
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeConversation?.id, activeConversation?.messages.length]);

  const applyConversationUpdate = (conversation: ChatConversation) => {
    setConversations((current) =>
      current
        .map((item) => (item.id === conversation.id ? conversation : item))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
    setActiveId(conversation.id);
  };

  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return conversations.filter((conversation) => {
      if (!normalized) return true;
      return (
        peerName(conversation, role).toLocaleLowerCase("vi").includes(normalized) ||
        peerPhone(conversation, role).includes(normalized) ||
        conversation.zone.toLocaleLowerCase("vi").includes(normalized) ||
        conversation.farm.toLocaleLowerCase("vi").includes(normalized)
      );
    });
  }, [conversations, query, role]);

  const pendingTargets = useMemo(() => {
    const conversationPeerIds = new Set(
      conversations
        .map((conversation) =>
          role === "FARMER"
            ? conversation.engineer.userId
            : conversation.farmer.userId,
        )
        .filter(Boolean),
    );
    const conversationPeerPhones = new Set(
      conversations
        .map((conversation) => peerPhone(conversation, role))
        .filter(Boolean),
    );
    const normalized = query.trim().toLocaleLowerCase("vi");
    return connections
      .filter((connection) => connection.status === "ACCEPTED")
      .filter((connection) => !conversationPeerIds.has(connection.user.id))
      .filter((connection) => {
        const phone = connection.user.phoneNumber ?? "";
        return !phone || !conversationPeerPhones.has(phone);
      })
      .filter((connection) => {
        if (!normalized) return true;
        return (
          connection.user.fullName.toLocaleLowerCase("vi").includes(normalized) ||
          (connection.user.phoneNumber ?? "").includes(normalized) ||
          (connection.user.region ?? "").toLocaleLowerCase("vi").includes(normalized)
        );
      })
      .map((connection): PendingConversationTarget => ({ kind: "connection", connection }));
  }, [connections, conversations, query, role]);

  const openConnectedConversation = async (connection: UserConnection) => {
    setBusy(true);
    setError("");
    try {
      const result = await chatClient.createConversation({
        peerUserId: connection.user.id,
      });
      if (!result.conversation?.id) {
        throw new Error("Không nhận được dữ liệu phòng chat từ backend.");
      }
      setConversations((current) => {
        const exists = current.some((item) => item.id === result.conversation.id);
        const next = exists
          ? current.map((item) =>
              item.id === result.conversation.id ? result.conversation : item,
            )
          : [result.conversation, ...current];
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setActiveId(result.conversation.id);
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Không thể tạo phòng chat cho kết nối này.",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteActiveConversation = async () => {
    if (!activeConversation) return;
    const confirmed = window.confirm(
      "Xoa cuoc tro chuyen nay cho ca nong ho va ky su? Tin nhan cu se bi xoa, nhung ket noi van duoc giu de tao phong moi.",
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    try {
      const deletedId = activeConversation.id;
      await chatClient.deleteConversation(deletedId);
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== deletedId),
      );
      setActiveId("");
      await loadConversations({ silent: true });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Khong the xoa cuoc tro chuyen.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!activeConversation) return;
    const content = draft.trim();
    if (!content && !attachment) return;
    setBusy(true);
    setError("");
    try {
      const result = await chatClient.sendMessage(activeConversation.id, {
        sender: role,
        content,
        image: attachment?.preview ?? null,
      });
      applyConversationUpdate(result.conversation);
      setDraft("");
      setAttachment(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Gui tin that bai.");
    } finally {
      setBusy(false);
    }
  };

  const publishTreatmentPlan = async () => {
    if (!activeConversation || role !== "ENGINEER") return;
    const steps = regimenDraft.steps
      .map((step, index) => ({
        ...step,
        completed: false,
        day: index + 1,
        task: step.task.trim(),
      }))
      .filter((step) => step.task.length > 0);
    const title = regimenDraft.title.trim();
    if (!title || steps.length === 0) {
      setError("Vui lòng nhập tên phác đồ và ít nhất một bước điều trị.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await chatClient.publishRegimen(activeConversation.id, {
        sender: "ENGINEER",
        regimen: {
          ...regimenDraft,
          title,
          diagnosis: regimenDraft.diagnosis.trim(),
          expectedOutcome: regimenDraft.expectedOutcome.trim(),
          followUpDate: regimenDraft.followUpDate.trim(),
          steps,
        },
      });
      applyConversationUpdate(result.conversation);
      setRegimenDraft(emptyTreatmentPlan);
      setTreatmentPanelOpen(false);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Không thể gửi phác đồ điều trị.",
      );
    } finally {
      setBusy(false);
    }
  };

  const updateRegimenStep = async (
    message: ChatMessage,
    day: number,
    completed: boolean,
  ) => {
    if (!activeConversation) return;
    const stepKey = `${message.id}:${day}`;
    setUpdatingStepKey(stepKey);
    setError("");
    try {
      const result = await chatClient.updateRegimenStep(
        activeConversation.id,
        message.id,
        day,
        { completed },
      );
      applyConversationUpdate(result.conversation);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Không thể cập nhật checklist điều trị.",
      );
    } finally {
      setUpdatingStepKey("");
    }
  };
  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachment({ name: file.name, preview: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="flex h-[calc(100vh-96px)] min-h-0 flex-col gap-4 overflow-hidden lg:h-[calc(100vh-116px)]">
      <section className="grid-pattern shrink-0 overflow-hidden rounded-[18px] bg-[#294f3b] px-5 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#EED56D]">
              <MessageCircleMore size={13} />
              {role === "FARMER" ? "Farmer chat" : "Engineer chat"}
            </div>
            <h1 className="mt-1 truncate text-xl font-bold tracking-tight">
              {role === "FARMER"
                ? "Trò chuyện với kỹ sư đã kết nối"
                : "Trò chuyện với nông hộ đã kết nối"}
            </h1>
          </div>
        </div>
      </section>

      {error && (
        <div className="shrink-0 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="panel grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-neutral-100 bg-white lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-neutral-100 p-4">
            <div className="flex gap-2">
              <label className="relative block min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Lọc theo tên, số điện thoại..."
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm font-semibold text-neutral-900 outline-none focus-visible:border-[#5d806b] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
              />
              </label>
              <button
                type="button"
                onClick={() => void loadConversations()}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500 hover:bg-[#edf3ee] hover:text-[#2E5A44]"
                aria-label="Tải lại danh sách hội thoại"
              >
                <RotateCw size={15} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
            {loading && (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[46px_1fr] gap-3 rounded-2xl px-3 py-3"
                  >
                    <span className="size-11 animate-pulse rounded-xl bg-neutral-100" />
                    <span className="space-y-2">
                      <span className="block h-3 w-3/4 animate-pulse rounded bg-neutral-100" />
                      <span className="block h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
                      <span className="block h-3 w-full animate-pulse rounded bg-neutral-100" />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!loading && visibleConversations.map((conversation) => {
              const selected = conversation.id === activeId;
              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setActiveId(conversation.id)}
                  className={`mb-1 grid w-full grid-cols-[46px_1fr] gap-3 rounded-2xl px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] ${
                    selected ? "bg-[#edf3ee]" : "hover:bg-neutral-50"
                  }`}
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-[#EED56D] text-sm font-extrabold text-[#2E5A44]">
                    {initials(peerName(conversation, role))}
                  </span>
                  <span className="min-w-0 self-center">
                    <span className="block min-w-0">
                      <b className="block truncate text-sm text-neutral-900">
                        {peerName(conversation, role)}
                      </b>
                    </span>
                    <p className="mt-1.5 truncate text-sm text-neutral-600">
                      {conversation.lastMessage}
                    </p>
                  </span>
                </button>
              );
            })}
            {!loading && pendingTargets.map(({ connection }) => (
              <button
                type="button"
                key={connection.id}
                onClick={() => void openConnectedConversation(connection)}
                disabled={busy}
                className="mb-1 grid w-full grid-cols-[46px_1fr] gap-3 rounded-2xl px-3 py-3 text-left transition-all hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:cursor-wait disabled:opacity-70"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[#edf3ee] text-sm font-extrabold text-[#2E5A44]">
                  {initials(connection.user.fullName)}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <b className="truncate text-sm text-neutral-900">
                      {connection.user.fullName}
                    </b>
                    <small className="rounded-full bg-amber-50 px-2 py-0.5 text-sm font-bold text-amber-700">
                      Tạo phòng
                    </small>
                  </span>
                  <small className="mt-1 block truncate text-sm text-neutral-500">
                    {connection.user.phoneNumber || "Chưa có số điện thoại"} - {connection.user.region || "Chưa cập nhật khu vực"}
                  </small>
                  <p className="mt-1.5 truncate text-sm text-neutral-600">
                    Đã kết nối, bấm để mở phòng chat.
                  </p>
                </span>
              </button>
            ))}
            {!loading && visibleConversations.length === 0 && pendingTargets.length === 0 && (
              <div className="grid min-h-52 place-items-center text-center">
                <span>
                  <Phone className="mx-auto text-neutral-300" size={24} />
                  <b className="mt-3 block text-sm text-neutral-700">
                    Chưa có hội thoại
                  </b>
                  <p className="mt-1 text-sm text-neutral-500">
                    {query
                      ? "Không tìm thấy người đã kết nối theo bộ lọc này."
                      : "Hãy tạo kết nối ở tab cộng đồng trước khi chat."}
                  </p>
                </span>
              </div>
            )}
          </div>
        </aside>

        {activeConversation ? (
          <section className="flex min-h-0 min-w-0 flex-col bg-white">
            <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#EED56D] text-sm font-extrabold text-[#2E5A44]">
                  {initials(peerName(activeConversation, role))}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="truncate text-base text-neutral-900">
                      {peerName(activeConversation, role)}
                    </b>
                  </span>
                  <small className="mt-1 flex items-center gap-1 truncate text-sm text-neutral-500">
                    <Phone size={10} />
                    {peerPhone(activeConversation, role)}
                  </small>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {role === "ENGINEER" && (
                  <button
                    type="button"
                    onClick={() => setTreatmentPanelOpen((current) => !current)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d8c067] bg-[#fff9dc] px-3 text-sm font-bold text-[#594915] hover:bg-[#fff4bf]"
                    aria-expanded={treatmentPanelOpen}
                  >
                    <ClipboardList size={15} />
                    Điều trị
                  </button>
                )}
                <Link
                  href="/dashboard/community?tab=connected"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 px-3 text-sm font-bold text-neutral-600 hover:bg-[#edf3ee] hover:text-[#2E5A44]"
                >
                  Ket noi
                </Link>
                <button
                  type="button"
                  onClick={deleteActiveConversation}
                  disabled={busy}
                  className="grid size-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                  aria-label="Xoa cuoc tro chuyen"
                  title="Xoa cuoc tro chuyen"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </header>

            {treatmentPanelOpen && role === "ENGINEER" && (
              <div className="shrink-0 border-b border-neutral-100 bg-[#fffdf5] px-4 py-3 sm:px-6">
                <div className="grid max-h-[42vh] min-h-0 max-w-3xl gap-3 overflow-y-auto pr-1 scrollbar-thin">
                  {role === "ENGINEER" && (
                    <section className="min-h-0 rounded-2xl border border-[#eadfa8] bg-white p-3">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-[#2E5A44]">
                        <Stethoscope size={16} />
                        Lập phác đồ điều trị
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          value={regimenDraft.title}
                          onChange={(event) =>
                            setRegimenDraft((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Tên phác đồ"
                          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-[#2E5A44]"
                        />
                        <input
                          value={regimenDraft.followUpDate}
                          onChange={(event) =>
                            setRegimenDraft((current) => ({
                              ...current,
                              followUpDate: event.target.value,
                            }))
                          }
                          placeholder="Ngày tái khám"
                          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-[#2E5A44]"
                        />
                        <input
                          value={regimenDraft.diagnosis}
                          onChange={(event) =>
                            setRegimenDraft((current) => ({
                              ...current,
                              diagnosis: event.target.value,
                            }))
                          }
                          placeholder="Chẩn đoán"
                          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-[#2E5A44]"
                        />
                        <input
                          value={regimenDraft.expectedOutcome}
                          onChange={(event) =>
                            setRegimenDraft((current) => ({
                              ...current,
                              expectedOutcome: event.target.value,
                            }))
                          }
                          placeholder="Mục tiêu mong đợi"
                          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-[#2E5A44]"
                        />
                      </div>
                      <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                        {regimenDraft.steps.map((step, index) => (
                          <div key={step.day} className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setRegimenDraft((current) => ({
                                  ...current,
                                  steps: current.steps.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, completed: !item.completed }
                                      : item,
                                  ),
                                }))
                              }
                              className={`grid size-10 shrink-0 place-items-center rounded-xl border text-sm font-extrabold ${
                                step.completed
                                  ? "border-[#2E5A44] bg-[#2E5A44] text-white"
                                  : "border-neutral-200 text-neutral-500"
                              }`}
                              aria-label={`Đánh dấu bước ${index + 1}`}
                            >
                              {index + 1}
                            </button>
                            <input
                              value={step.task}
                              onChange={(event) =>
                                setRegimenDraft((current) => ({
                                  ...current,
                                  steps: current.steps.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, task: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              placeholder={`Bước ${index + 1}: việc cần làm`}
                              className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-[#2E5A44]"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRegimenDraft((current) => ({
                              ...current,
                              steps: [
                                ...current.steps,
                                {
                                  completed: false,
                                  day: current.steps.length + 1,
                                  task: "",
                                },
                              ],
                            }))
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
                        >
                          <Plus size={14} />
                          Thêm bước
                        </button>
                        <button
                          type="button"
                          onClick={publishTreatmentPlan}
                          disabled={busy}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-sm font-bold text-white disabled:cursor-wait disabled:bg-neutral-200"
                        >
                          <Stethoscope size={14} />
                          Gửi phác đồ
                        </button>
                      </div>
                    </section>
                  )}


                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f7f8f5] px-4 py-5 scrollbar-thin sm:px-6">
              {activeConversation.messages.map((message) => {
                const mine = isMine(message, role);
                const isRegimenMessage = message.type === "TREATMENT_REGIMEN";
                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isRegimenMessage
                        ? "justify-center"
                        : mine
                          ? "justify-end"
                          : "justify-start"
                    }`}
                  >
                    <div
                      className={
                        isRegimenMessage
                          ? "w-full max-w-[680px]"
                          : mine
                            ? "items-end"
                            : "items-start"
                      }
                    >
                      {!mine && !isRegimenMessage && (
                        <small className="mb-1.5 block text-sm font-bold text-neutral-500">
                          {peerName(activeConversation, role)}
                        </small>
                      )}
                      <MessageBubble
                        message={message}
                        mine={mine}
                        onToggleRegimenStep={updateRegimenStep}
                        updatingStepKey={updatingStepKey}
                      />
                      <span
                        className={`mt-1 flex items-center gap-1 text-[13px] text-neutral-400 ${
                          isRegimenMessage ? "justify-center" : mine ? "justify-end" : "justify-start"
                        }`}
                      >
                        {formatMessageTime(message.sentAt)}
                        {mine && <CheckCheck size={10} />}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-neutral-100 bg-white p-3 sm:p-4">
              {attachment && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                  <div
                    className="size-12 shrink-0 rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url(${attachment.preview})` }}
                  />
                  <b className="min-w-0 flex-1 truncate text-sm text-neutral-700">
                    {attachment.name}
                  </b>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="grid size-8 place-items-center rounded-lg text-neutral-400 hover:bg-white hover:text-red-600"
                    aria-label="Xoa anh"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={selectImage}
              />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex items-end gap-2"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500 hover:bg-[#edf3ee] hover:text-[#2E5A44]"
                  aria-label="Dinh kem anh"
                >
                  <ImagePlus size={17} />
                </button>
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    role === "FARMER"
                      ? "Nhap cau hoi cho ky su..."
                      : "Nhap huong dan cho nong dan..."
                  }
                  className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-900 outline-none focus-visible:border-[#5d806b] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                />
                <button
                  type="submit"
                  disabled={busy || (!draft.trim() && !attachment)}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2E5A44] text-white disabled:bg-neutral-200 disabled:text-neutral-400"
                  aria-label="Gui tin nhan"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="grid min-h-0 place-items-center bg-[#f7f8f5] p-6 text-center">
            <span>
              <MessageCircleMore className="mx-auto text-neutral-300" size={32} />
              <b className="mt-4 block text-sm text-neutral-800">
                Chọn hội thoại đã kết nối
              </b>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
                Nếu chưa thấy người cần chat, hãy tạo hoặc chấp nhận kết nối ở
                trang Cộng đồng trước.
              </p>
              <Link
                href="/dashboard/community?tab=phone"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white"
              >
                Kết nối qua số điện thoại
              </Link>
            </span>
          </section>
        )}
      </div>
    </div>
  );
}
