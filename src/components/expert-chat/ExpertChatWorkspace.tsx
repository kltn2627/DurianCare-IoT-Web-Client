"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  CircleDot,
  Clock3,
  Droplets,
  ImagePlus,
  MapPin,
  MessageCircleMore,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import { expertConversations } from "@/constants/durianMockData";
import type {
  ConversationStatus,
  ExpertChatAction,
  ExpertChatState,
  ExpertConversation,
  TreatmentRegimen,
} from "./types";

const conversations = expertConversations as ExpertConversation[];
const emptyRegimenDraft: TreatmentRegimen = {
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

const initialState: ExpertChatState = {
  conversations,
  activeId: conversations[0]?.id ?? "",
  query: "",
  filter: "ALL",
  draft: "",
  attachment: null,
  regimenDraft: emptyRegimenDraft,
  showRegimenPlanner: false,
};

function currentTime() {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function chatReducer(
  state: ExpertChatState,
  action: ExpertChatAction,
): ExpertChatState {
  switch (action.type) {
    case "SELECT_CONVERSATION":
      return {
        ...state,
        activeId: action.id,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.id
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
        draft: "",
        attachment: null,
      };
    case "SEARCH":
      return { ...state, query: action.value };
    case "FILTER":
      return { ...state, filter: action.value };
    case "UPDATE_DRAFT":
      return { ...state, draft: action.value };
    case "SET_ATTACHMENT":
      return { ...state, attachment: action.attachment };
    case "REMOVE_ATTACHMENT":
      return { ...state, attachment: null };
    case "TOGGLE_REGIMEN_PLANNER":
      return { ...state, showRegimenPlanner: !state.showRegimenPlanner };
    case "UPDATE_REGIMEN_FIELD":
      return {
        ...state,
        regimenDraft: {
          ...state.regimenDraft,
          [action.field]: action.value,
        },
      };
    case "UPDATE_REGIMEN_STEP":
      return {
        ...state,
        regimenDraft: {
          ...state.regimenDraft,
          steps: state.regimenDraft.steps.map((step, index) =>
            index === action.index ? { ...step, task: action.value } : step,
          ),
        },
      };
    case "ADD_REGIMEN_STEP":
      return {
        ...state,
        regimenDraft: {
          ...state.regimenDraft,
          steps: [
            ...state.regimenDraft.steps,
            {
              completed: false,
              day: state.regimenDraft.steps.length + 1,
              task: "",
            },
          ],
        },
      };
    case "REMOVE_REGIMEN_STEP": {
      const nextSteps = state.regimenDraft.steps
        .filter((_, index) => index !== action.index)
        .map((step, index) => ({ ...step, day: index + 1 }));
      return {
        ...state,
        regimenDraft: {
          ...state.regimenDraft,
          steps: nextSteps.length > 0 ? nextSteps : [{ completed: false, day: 1, task: "" }],
        },
      };
    }
    case "PUBLISH_REGIMEN": {
      const title = state.regimenDraft.title.trim();
      const validSteps = state.regimenDraft.steps.filter((step) => step.task.trim());
      if (!title || validSteps.length === 0) return state;
      const sentAt = currentTime();
      return {
        ...state,
        conversations: state.conversations.map((conversation) => {
          if (conversation.id !== state.activeId) return conversation;
          const nextMessage = {
            id: `REGIMEN-${Date.now()}`,
            sender: "EXPERT" as const,
            content: title,
            sentAt,
            type: "TREATMENT_REGIMEN" as const,
            image: null,
            regimen: {
              ...state.regimenDraft,
              diagnosis: state.regimenDraft.diagnosis.trim(),
              expectedOutcome: state.regimenDraft.expectedOutcome.trim(),
              followUpDate: state.regimenDraft.followUpDate.trim(),
              steps: validSteps.map((step, index) => ({
                completed: false,
                day: index + 1,
                task: step.task.trim(),
              })),
              title,
            },
          };
          return {
            ...conversation,
            status: "IN_PROGRESS" as const,
            activityLabel: "Theo doi phac do dieu tri",
            messages: [...conversation.messages, nextMessage],
            lastMessage: `Phac do: ${title}`,
            lastMessageAt: sentAt,
            unreadCount: 0,
          };
        }),
        regimenDraft: emptyRegimenDraft,
        showRegimenPlanner: false,
      };
    }
    case "TOGGLE_REGIMEN_PROGRESS":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === state.activeId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === action.messageId && message.regimen
                    ? {
                        ...message,
                        regimen: {
                          ...message.regimen,
                          steps: message.regimen.steps.map((step) =>
                            step.day === action.day
                              ? { ...step, completed: !step.completed }
                              : step,
                          ),
                        },
                      }
                    : message,
                ),
              }
            : conversation,
        ),
      };
    case "SET_STATUS":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === state.activeId
            ? {
                ...conversation,
                status: action.status,
                activityLabel:
                  action.status === "WAITING"
                    ? "Chờ phản hồi"
                    : action.status === "IN_PROGRESS"
                      ? "Đang tưới/bón phân"
                      : "Đã ổn định",
              }
            : conversation,
        ),
      };
    case "SEND_MESSAGE": {
      const content = state.draft.trim();
      if (!content && !state.attachment) return state;
      const sentAt = currentTime();
      return {
        ...state,
        conversations: state.conversations
          .map((conversation) => {
            if (conversation.id !== state.activeId) return conversation;
            const nextMessage = {
              id: `MSG-${Date.now()}`,
              sender: "EXPERT" as const,
              content:
                content ||
                (state.attachment
                  ? `Đã gửi ảnh ${state.attachment.name}`
                  : ""),
              sentAt,
              type: state.attachment ? ("IMAGE" as const) : ("TEXT" as const),
              image: state.attachment?.preview ?? null,
            };
            return {
              ...conversation,
              status:
                conversation.status === "WAITING"
                  ? ("IN_PROGRESS" as const)
                  : conversation.status,
              activityLabel:
                conversation.status === "WAITING"
                  ? "Đang tưới/bón phân"
                  : conversation.activityLabel,
              messages: [...conversation.messages, nextMessage],
              lastMessage: nextMessage.content,
              lastMessageAt: sentAt,
              unreadCount: 0,
            };
          })
          .sort((a, b) =>
            a.id === state.activeId ? -1 : b.id === state.activeId ? 1 : 0,
          ),
        draft: "",
        attachment: null,
      };
    }
    default:
      return state;
  }
}

const STATUS_META: Record<
  ConversationStatus,
  { label: string; className: string; dotClass: string }
> = {
  WAITING: {
    label: "Chờ phản hồi",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
    dotClass: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "Đang tưới/bón phân",
    className: "bg-sky-50 text-sky-700 ring-sky-100",
    dotClass: "bg-sky-500",
  },
  RESOLVED: {
    label: "Đã ổn định",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dotClass: "bg-emerald-500",
  },
};

const filterOptions: Array<{
  value: ExpertChatState["filter"];
  label: string;
}> = [
  { value: "ALL", label: "Tất cả ca" },
  { value: "WAITING", label: "Chờ phản hồi" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã ổn định" },
];

function StatusPill({ status }: { status: ConversationStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ring-1 ${meta.className}`}
    >
      <i className={`size-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}

function ConversationRail({
  items,
  activeId,
  query,
  filter,
  onSearch,
  onFilter,
  onSelect,
}: {
  items: ExpertConversation[];
  activeId: string;
  query: string;
  filter: ExpertChatState["filter"];
  onSearch: (value: string) => void;
  onFilter: (value: ExpertChatState["filter"]) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-b border-neutral-100 bg-white lg:border-b-0 lg:border-r">
      <div className="space-y-3 border-b border-neutral-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <span>
            <small className="text-xs font-bold uppercase tracking-[0.16em] text-[#6a806f]">
              Rescue queue
            </small>
            <h2 className="mt-1 text-base font-bold tracking-tight text-neutral-900">
              Chủ vườn cần hỗ trợ
            </h2>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ee] px-2.5 py-1.5 text-xs font-bold text-[#2E5A44]">
            <Wifi size={11} />
            Trực tuyến
          </span>
        </div>
        <label className="relative block">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={query}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Tìm chủ vườn, phân khu..."
            className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs text-neutral-900 outline-none transition-all duration-200 ease-in-out placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1 scrollbar-thin">
          {filterOptions.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => onFilter(item.value)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] ${
                filter === item.value
                  ? "bg-white text-[#2E5A44] shadow-sm"
                  : "text-neutral-500 hover:bg-white/60 hover:text-neutral-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin lg:max-h-none lg:flex-1">
        {items.map((conversation) => {
          const selected = activeId === conversation.id;
          return (
            <button
              type="button"
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`group relative mb-1 grid w-full grid-cols-[42px_1fr_auto] gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] ${
                selected
                  ? "bg-[#edf3ee] shadow-sm"
                  : "hover:bg-neutral-50"
              }`}
            >
              {selected && (
                <i className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-[#2E5A44]" />
              )}
              <span className="relative grid size-10 place-items-center rounded-xl bg-[#EED56D] text-xs font-extrabold text-[#2E5A44]">
                {conversation.initials}
                <i
                  className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${
                    conversation.online ? "bg-emerald-500" : "bg-neutral-300"
                  }`}
                />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <b className="truncate text-xs text-neutral-900">
                    {conversation.ownerName}
                  </b>
                  {conversation.unreadCount > 0 && (
                    <span className="grid min-w-4 place-items-center rounded-full bg-[#b95639] px-1 py-0.5 text-xs font-bold text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </span>
                <small className="mt-1 block truncate text-xs font-medium text-neutral-400">
                  {conversation.zone} • {conversation.farm}
                </small>
                <p
                  className={`mt-1.5 truncate text-xs ${
                    conversation.unreadCount > 0
                      ? "font-semibold text-neutral-700"
                      : "text-neutral-500"
                  }`}
                >
                  {conversation.lastMessage}
                </p>
                <span className="mt-2 block">
                  <StatusPill status={conversation.status} />
                </span>
              </span>
              <small className="text-xs text-neutral-400">
                {conversation.lastMessageAt}
              </small>
            </button>
          );
        })}
        {items.length === 0 && (
          <div className="grid min-h-56 place-items-center text-center">
            <span>
              <Search className="mx-auto text-neutral-300" size={25} />
              <b className="mt-3 block text-xs text-neutral-700">
                Không có ca phù hợp
              </b>
              <p className="mt-1 text-xs text-neutral-400">
                Thử đổi bộ lọc hoặc từ khóa.
              </p>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function ImageMessage({
  image,
  content,
}: {
  image: string;
  content: string;
}) {
  return (
    <div className="max-w-[360px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div
        role="img"
        aria-label="Ảnh lá sầu riêng do chủ vườn gửi"
        className="aspect-[4/2.65] w-full bg-neutral-100 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      {content && (
        <p className="px-3 py-2.5 text-xs leading-relaxed text-neutral-600">
          {content}
        </p>
      )}
    </div>
  );
}

function MessageStream({
  conversation,
  onToggleRegimenProgress,
}: {
  conversation: ExpertConversation;
  onToggleRegimenProgress: (messageId: string, day: number) => void;
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7f8f5] px-4 py-5 scrollbar-thin sm:px-6">
      <div className="mx-auto flex max-w-xl items-center gap-3 py-2">
        <i className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
          Hôm nay • Ca tư vấn {conversation.id}
        </span>
        <i className="h-px flex-1 bg-neutral-200" />
      </div>
      {conversation.messages.map((message) => {
        const fromExpert = message.sender === "EXPERT";
        return (
          <div
            key={message.id}
            className={`flex ${fromExpert ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] ${fromExpert ? "items-end" : "items-start"}`}
            >
              {!fromExpert && (
                <small className="mb-1.5 block text-xs font-bold text-neutral-400">
                  {conversation.ownerName}
                </small>
              )}
              {message.type === "IMAGE" && message.image ? (
                <ImageMessage image={message.image} content={message.content} />
              ) : message.type === "TREATMENT_REGIMEN" && message.regimen ? (
                <RegimenMessage
                  messageId={message.id}
                  regimen={message.regimen}
                  onToggleProgress={onToggleRegimenProgress}
                />
              ) : (
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    fromExpert
                      ? "rounded-br-md bg-[#2E5A44] text-white"
                      : "rounded-bl-md border border-neutral-100 bg-white text-neutral-700"
                  }`}
                >
                  {message.content}
                </div>
              )}
              <span
                className={`mt-1 flex items-center gap-1 text-xs text-neutral-400 ${
                  fromExpert ? "justify-end" : "justify-start"
                }`}
              >
                {message.sentAt}
                {fromExpert && <CheckCheck size={10} />}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RegimenMessage({
  messageId,
  onToggleProgress,
  regimen,
}: {
  messageId: string;
  onToggleProgress: (messageId: string, day: number) => void;
  regimen: TreatmentRegimen;
}) {
  const completedCount = regimen.steps.filter((step) => step.completed).length;
  const progress = Math.round((completedCount / regimen.steps.length) * 100);

  return (
    <article className="min-w-[260px] max-w-[420px] rounded-2xl bg-[#203e30] p-4 text-white shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EED56D] text-[#203e30]">
          <CalendarDays size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <small className="block text-xs font-bold uppercase tracking-[0.14em] text-[#EED56D]">
            Phac do dieu tri
          </small>
          <b className="mt-1 block text-xs leading-snug">{regimen.title}</b>
          {regimen.diagnosis && (
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Chan doan: {regimen.diagnosis}
            </p>
          )}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
        <i
          className="block h-full rounded-full bg-[#EED56D]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-bold text-white/60">
        <span>{completedCount}/{regimen.steps.length} buoc hoan thanh</span>
        {regimen.followUpDate && <span>Tai kham: {regimen.followUpDate}</span>}
      </div>
      <div className="mt-3 space-y-2">
        {regimen.steps.map((step) => (
          <button
            key={step.day}
            type="button"
            onClick={() => onToggleProgress(messageId, step.day)}
            className={`flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EED56D] ${
              step.completed ? "bg-[#EED56D] text-[#203e30]" : "bg-white/10 text-white"
            }`}
          >
            {step.completed ? <Check size={14} /> : <Circle size={14} />}
            <b className="shrink-0 text-xs">Ngay {step.day}</b>
            <span className="min-w-0 flex-1 text-xs leading-relaxed">
              {step.task}
            </span>
          </button>
        ))}
      </div>
      {regimen.expectedOutcome && (
        <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs leading-relaxed text-white/72">
          Muc tieu: {regimen.expectedOutcome}
        </p>
      )}
    </article>
  );
}

function ConversationContext({
  conversation,
  onStatus,
}: {
  conversation: ExpertConversation;
  onStatus: (status: ConversationStatus) => void;
}) {
  return (
    <div className="grid gap-2 border-b border-neutral-100 bg-white px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:px-6">
      <div className="rounded-xl bg-[#f4f7f4] px-3 py-2">
        <small className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
          Ngữ cảnh vụ mùa
        </small>
        <b className="mt-1 block text-xs text-neutral-700">
          {conversation.cropContext}
        </b>
      </div>
      <div className="rounded-xl bg-[#f4f7f4] px-3 py-2">
        <small className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
          Sensor snapshot
        </small>
        <b className="mt-1 block text-xs text-neutral-700">
          {conversation.sensorContext}
        </b>
      </div>
      <label className="relative">
        <select
          value={conversation.status}
          onChange={(event) =>
            onStatus(event.target.value as ConversationStatus)
          }
          className="h-10 appearance-none rounded-xl border border-neutral-200 bg-white pl-3 pr-8 text-xs font-bold text-neutral-700 outline-none transition-all duration-200 ease-in-out hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
        >
          <option value="WAITING">Chờ phản hồi</option>
          <option value="IN_PROGRESS">Đang tưới/bón phân</option>
          <option value="RESOLVED">Đã ổn định</option>
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
      </label>
    </div>
  );
}

function MessageComposer({
  draft,
  attachment,
  onDraft,
  onAttachment,
  onRemoveAttachment,
  onSend,
}: {
  draft: string;
  attachment: ExpertChatState["attachment"];
  onDraft: (value: string) => void;
  onAttachment: (name: string, preview: string) => void;
  onRemoveAttachment: () => void;
  onSend: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onAttachment(file.name, reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend();
  };

  const canSend = draft.trim().length > 0 || attachment !== null;

  return (
    <div className="border-t border-neutral-100 bg-white p-3 sm:p-4">
      {attachment && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
          <div
            className="size-12 shrink-0 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${attachment.preview})` }}
          />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-xs text-neutral-700">
              {attachment.name}
            </b>
            <small className="mt-1 block text-xs text-neutral-400">
              Ảnh sẽ được gửi trong tin nhắn mock
            </small>
          </span>
          <button
            type="button"
            onClick={onRemoveAttachment}
            className="grid size-8 place-items-center rounded-lg text-neutral-400 transition-all duration-200 ease-in-out hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            aria-label="Xóa ảnh đính kèm"
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
      <form onSubmit={submit} className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition-all duration-200 ease-in-out hover:border-[#9bb0a0] hover:bg-[#edf3ee] hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          aria-label="Đính kèm ảnh"
        >
          <ImagePlus size={17} />
        </button>
        <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-neutral-200 bg-neutral-50 px-3 transition-all duration-200 ease-in-out focus-within:border-[#6f8d78] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2E5A4414]">
          <textarea
            rows={1}
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder="Nhập hướng dẫn xử lý cho chủ vườn..."
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-3 text-xs leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <button
            type="button"
            disabled
            className="mb-1.5 grid size-7 place-items-center rounded-lg text-neutral-300 disabled:cursor-not-allowed"
            aria-label="Đính kèm tài liệu"
          >
            <Paperclip size={14} />
          </button>
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2E5A44] text-white transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-neutral-200 disabled:text-neutral-400"
          aria-label="Gửi tin nhắn"
        >
          <Send size={16} />
        </button>
      </form>
      <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-neutral-400">
        <span>Enter để gửi • Shift + Enter để xuống dòng</span>
        <span className="inline-flex items-center gap-1 text-emerald-600">
          <CircleDot size={10} />
          Đồng bộ realtime mock
        </span>
      </div>
    </div>
  );
}

function RegimenPlanner({
  draft,
  onAddStep,
  onChangeField,
  onChangeStep,
  onPublish,
  onRemoveStep,
}: {
  draft: TreatmentRegimen;
  onAddStep: () => void;
  onChangeField: (
    field: keyof Omit<TreatmentRegimen, "steps">,
    value: string,
  ) => void;
  onChangeStep: (index: number, value: string) => void;
  onPublish: () => void;
  onRemoveStep: (index: number) => void;
}) {
  const canPublish =
    draft.title.trim().length > 0 &&
    draft.steps.some((step) => step.task.trim().length > 0);

  return (
    <section className="border-b border-neutral-100 bg-[#fbfcfa] px-4 py-4 sm:px-6">
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
            Ten phac do
          </span>
          <input
            value={draft.title}
            onChange={(event) => onChangeField("title", event.target.value)}
            placeholder="VD: Phuc hoi Phomopsis giai doan som"
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 outline-none focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
            Ngay tai kham
          </span>
          <input
            value={draft.followUpDate}
            onChange={(event) => onChangeField("followUpDate", event.target.value)}
            placeholder="VD: 18/06/2026"
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 outline-none focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
            Chan doan
          </span>
          <input
            value={draft.diagnosis}
            onChange={(event) => onChangeField("diagnosis", event.target.value)}
            placeholder="VD: Dom la Phomopsis"
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 outline-none focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
            Muc tieu theo doi
          </span>
          <input
            value={draft.expectedOutcome}
            onChange={(event) =>
              onChangeField("expectedOutcome", event.target.value)
            }
            placeholder="VD: Ngung lan vet trong 72 gio"
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 outline-none focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>
      </div>
      <div className="mt-3 space-y-2">
        {draft.steps.map((step, index) => (
          <div key={step.day} className="flex items-center gap-2">
            <span className="grid h-9 w-14 shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-xs font-bold text-[#2E5A44]">
              Ngay {index + 1}
            </span>
            <input
              value={step.task}
              onChange={(event) => onChangeStep(index, event.target.value)}
              placeholder="Nhap viec can lam, lieu luong, dieu kien an toan..."
              className="h-9 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 outline-none focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
            />
            <button
              type="button"
              onClick={() => onRemoveStep(index)}
              className="grid size-9 place-items-center rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              aria-label="Xoa buoc dieu tri"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onAddStep}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-600 hover:border-[#9bb0a0] hover:bg-[#edf3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
        >
          <Plus size={13} />
          Them ngay dieu tri
        </button>
        <button
          type="button"
          disabled={!canPublish}
          onClick={onPublish}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-3 py-2 text-xs font-bold text-white hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          <Stethoscope size={13} />
          Gui phac do vao chat
        </button>
      </div>
    </section>
  );
}

function ChatPanel({
  conversation,
  state,
  dispatch,
}: {
  conversation: ExpertConversation;
  state: ExpertChatState;
  dispatch: React.Dispatch<ExpertChatAction>;
}) {


  return (
    <section className="flex min-h-[680px] min-w-0 flex-col bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-[#EED56D] text-xs font-extrabold text-[#2E5A44]">
            {conversation.initials}
            <i
              className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${
                conversation.online ? "bg-emerald-500" : "bg-neutral-300"
              }`}
            />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <b className="truncate text-xs text-neutral-900">
                {conversation.ownerName}
              </b>
              <StatusPill status={conversation.status} />
            </span>
            <small className="mt-1 flex items-center gap-1 truncate text-xs text-neutral-400">
              <MapPin size={10} />
              {conversation.farm} • {conversation.location}
            </small>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_REGIMEN_PLANNER" })}
            className="hidden items-center gap-1.5 rounded-xl border border-[#d8c067] bg-[#fff9dc] px-3 py-2 text-xs font-bold text-[#594915] transition-all duration-200 ease-in-out hover:border-[#c7a72b] hover:bg-[#fff4bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8B43F] sm:inline-flex"
          >
            <Stethoscope size={13} />
            Lap phac do
          </button>
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600 transition-all duration-200 ease-in-out hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] sm:inline-flex"
          >
            <ArrowUpRight size={13} />
            Mở hồ sơ vườn
          </button>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
            aria-label="Thêm tùy chọn"
          >
            <MoreHorizontal size={17} />
          </button>
        </div>
      </header>

      <ConversationContext
        conversation={conversation}
        onStatus={(status) => dispatch({ type: "SET_STATUS", status })}
      />
      {state.showRegimenPlanner && (
        <RegimenPlanner
          draft={state.regimenDraft}
          onAddStep={() => dispatch({ type: "ADD_REGIMEN_STEP" })}
          onChangeField={(field, value) =>
            dispatch({ type: "UPDATE_REGIMEN_FIELD", field, value })
          }
          onChangeStep={(index, value) =>
            dispatch({ type: "UPDATE_REGIMEN_STEP", index, value })
          }
          onPublish={() => dispatch({ type: "PUBLISH_REGIMEN" })}
          onRemoveStep={(index) =>
            dispatch({ type: "REMOVE_REGIMEN_STEP", index })
          }
        />
      )}
      <MessageStream
        conversation={conversation}
        onToggleRegimenProgress={(messageId, day) =>
          dispatch({ type: "TOGGLE_REGIMEN_PROGRESS", messageId, day })
        }
      />
      <MessageComposer
        draft={state.draft}
        attachment={state.attachment}
        onDraft={(value) => dispatch({ type: "UPDATE_DRAFT", value })}
        onAttachment={(name, preview) =>
          dispatch({
            type: "SET_ATTACHMENT",
            attachment: { name, preview },
          })
        }
        onRemoveAttachment={() => dispatch({ type: "REMOVE_ATTACHMENT" })}
        onSend={() => dispatch({ type: "SEND_MESSAGE" })}
      />
    </section>
  );
}

export function ExpertChatWorkspace() {
  const [state, dispatch] = useReducer(chatReducer, initialState);



  const filteredConversations = useMemo(() => {
    const query = state.query.trim().toLocaleLowerCase("vi");
    return state.conversations.filter((conversation) => {
      const matchesFilter =
        state.filter === "ALL" || conversation.status === state.filter;
      const matchesQuery =
        !query ||
        conversation.ownerName.toLocaleLowerCase("vi").includes(query) ||
        conversation.zone.toLocaleLowerCase("vi").includes(query) ||
        conversation.farm.toLocaleLowerCase("vi").includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [state.conversations, state.filter, state.query]);

  const activeConversation =
    state.conversations.find(
      (conversation) => conversation.id === state.activeId,
    ) ?? state.conversations[0];

  const waitingCount = state.conversations.filter(
    (conversation) => conversation.status === "WAITING",
  ).length;
  const unreadCount = state.conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0,
  );

  if (!activeConversation) return null;

  return (
    <div className="space-y-4">
      <section className="grid-pattern overflow-hidden rounded-[24px] bg-[#294f3b] p-6 text-white sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              <MessageCircleMore size={13} />
              Expert response center
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Cổng chat tư vấn nhà vườn
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#d0ddd4] sm:text-xs">
              Tiếp nhận ca cứu trợ, xem ảnh triệu chứng và phản hồi kỹ thuật với
              ngữ cảnh cảm biến ngay trong một workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Đang chờ", waitingCount, Clock3],
              ["Tin chưa đọc", unreadCount, MessageCircleMore],
              ["Kỹ sư online", "08", Wifi],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof Clock3;
              return (
                <div
                  key={String(label)}
                  className="min-w-24 rounded-xl border border-white/10 bg-white/[.08] px-3 py-3"
                >
                  <MetricIcon size={14} className="text-[#EED56D]" />
                  <b className="mt-3 block text-xs tracking-tight">
                    {String(value)}
                  </b>
                  <small className="mt-1 block text-xs text-white/55">
                    {String(label)}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="panel grid min-h-[720px] overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
        <ConversationRail
          items={filteredConversations}
          activeId={state.activeId}
          query={state.query}
          filter={state.filter}
          onSearch={(value) => dispatch({ type: "SEARCH", value })}
          onFilter={(value) => dispatch({ type: "FILTER", value })}
          onSelect={(id) => dispatch({ type: "SELECT_CONVERSATION", id })}
        />
        <ChatPanel
          conversation={activeConversation}
          state={state}
          dispatch={dispatch}
        />
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          [
            ShieldCheck,
            "Phạm vi tư vấn",
            "Khuyến nghị dựa trên ảnh, lịch canh tác và sensor snapshot của đúng phân khu.",
          ],
          [
            Sparkles,
            "Optimistic state",
            "Tin nhắn được thêm ngay vào reducer; khi nối backend có thể thay bằng event WebSocket.",
          ],
          [
            Droplets,
            "Ngữ cảnh vận hành",
            "Nhãn “Đang tưới/bón phân” giúp kỹ sư tránh đưa chỉ dẫn xung đột với tác vụ đang chạy.",
          ],
        ].map(([Icon, title, description]) => {
          const CardIcon = Icon as typeof ShieldCheck;
          return (
            <article
              key={String(title)}
              className="panel flex items-start gap-3 p-4"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
                <CardIcon size={16} />
              </span>
              <span>
                <b className="block text-xs text-neutral-900">
                  {String(title)}
                </b>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  {String(description)}
                </p>
              </span>
            </article>
          );
        })}
      </section>
    </div>
  );
}
