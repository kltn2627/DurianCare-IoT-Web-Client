"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Bot,
  BrainCircuit,
  CheckCheck,
  ChevronDown,
  CircleDot,
  Clock3,
  ImagePlus,
  Leaf,
  MapPin,
  MessageCircleMore,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  UserRoundCheck,
  Wifi,
  X,
} from "lucide-react";
import {
  expertConversations,
  farmerAiMessages,
  farmerZones,
} from "@/constants/durianMockData";
import type {
  FarmerAttachment,
  FarmerChatAction,
  FarmerChatMode,
  FarmerChatState,
  FarmerMessage,
  FarmerZone,
} from "./types";

const zones = farmerZones as FarmerZone[];
const existingOwnerConversation = expertConversations[0];

const initialState: FarmerChatState = {
  mode: "AI",
  aiMessages: farmerAiMessages as FarmerMessage[],
  expertMessages: existingOwnerConversation.messages as FarmerMessage[],
  aiDraft: "",
  expertDraft: "",
  aiAttachment: null,
  expertAttachment: null,
  selectedZoneId: "B1",
  requestStatus: "WAITING_ASSIGNMENT",
};

function currentTime() {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function reducer(
  state: FarmerChatState,
  action: FarmerChatAction,
): FarmerChatState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_DRAFT":
      return action.mode === "AI"
        ? { ...state, aiDraft: action.value }
        : { ...state, expertDraft: action.value };
    case "SET_ATTACHMENT":
      return action.mode === "AI"
        ? { ...state, aiAttachment: action.attachment }
        : { ...state, expertAttachment: action.attachment };
    case "REMOVE_ATTACHMENT":
      return action.mode === "AI"
        ? { ...state, aiAttachment: null }
        : { ...state, expertAttachment: null };
    case "SELECT_ZONE":
      return { ...state, selectedZoneId: action.zoneId };
    case "SEND_OWNER_MESSAGE": {
      const draft = action.mode === "AI" ? state.aiDraft : state.expertDraft;
      const attachment =
        action.mode === "AI" ? state.aiAttachment : state.expertAttachment;
      if (!draft.trim() && !attachment) return state;

      const message: FarmerMessage = {
        id: `FARMER-${Date.now()}`,
        sender: "OWNER",
        content:
          draft.trim() ||
          (attachment ? `Ảnh thực địa: ${attachment.name}` : ""),
        sentAt: currentTime(),
        type: attachment ? "IMAGE" : "TEXT",
        image: attachment?.preview ?? null,
      };

      if (action.mode === "AI") {
        return {
          ...state,
          aiMessages: [...state.aiMessages, message],
          aiDraft: "",
          aiAttachment: null,
        };
      }

      return {
        ...state,
        expertMessages: [...state.expertMessages, message],
        expertDraft: "",
        expertAttachment: null,
        requestStatus: "WAITING_ASSIGNMENT",
      };
    }
    case "ADD_AI_RESPONSE":
      return {
        ...state,
        aiMessages: [...state.aiMessages, action.message],
      };
    default:
      return state;
  }
}

function aiResponseFor(prompt: string, zone: FarmerZone) {
  const normalized = prompt.toLocaleLowerCase("vi");
  if (normalized.includes("đốm") || normalized.includes("lá")) {
    return `Từ mô tả tại ${zone.name}, anh nên chụp rõ hai mặt lá, đánh dấu cây bị ảnh hưởng và kiểm tra tốc độ lan sau 12-24 giờ. Chỉ số hiện tại là ${zone.snapshot}. Tôi chưa thể kết luận bệnh chỉ từ một ảnh; hãy chuyển ca sang Kỹ sư nếu vùng tổn thương lan nhanh.`;
  }
  if (normalized.includes("ẩm") || normalized.includes("tưới")) {
    return `Snapshot ${zone.name}: ${zone.snapshot}. Anh nên kiểm tra chênh lệch ẩm giữa đầu và cuối tuyến tưới trước khi thay đổi lịch. Không tăng nước chỉ dựa trên một điểm đo.`;
  }
  if (normalized.includes("phân") || normalized.includes("kali")) {
    return `Với ${zone.crop}, cần đối chiếu tải trái, EC đất và lần bón gần nhất trước khi bổ sung dinh dưỡng. Hãy nhập lượng vật tư vào Lịch canh tác và nhờ kỹ sư xác nhận nếu cây đang mang trái nhạy cảm.`;
  }
  return `Tôi đã ghi nhận câu hỏi cho ${zone.name}. Bước an toàn là kiểm tra thực địa, đối chiếu dữ liệu IoT trong 24 giờ gần nhất và tránh can thiệp thuốc khi chưa xác định nguyên nhân. Anh có thể chuyển nguyên nội dung này sang phòng Kỹ sư để được xác nhận.`;
}

const modeMeta: Record<
  FarmerChatMode,
  {
    title: string;
    description: string;
    icon: typeof Bot;
  }
> = {
  AI: {
    title: "Trợ lý AI 24/7",
    description: "Sàng lọc triệu chứng và đọc nhanh dữ liệu vườn",
    icon: Bot,
  },
  EXPERT: {
    title: "Kỹ sư hệ thống",
    description: "Tạo yêu cầu cứu trợ có phân khu và ảnh thực địa",
    icon: UserRoundCheck,
  },
};

function ImageBubble({
  message,
  fromOwner,
}: {
  message: FarmerMessage;
  fromOwner: boolean;
}) {
  return (
    <div
      className={`max-w-sm overflow-hidden rounded-2xl border shadow-sm ${
        fromOwner
          ? "border-[#416c55] bg-[#2E5A44]"
          : "border-neutral-100 bg-white"
      }`}
    >
      <div
        role="img"
        aria-label="Ảnh lá sầu riêng trong hội thoại"
        className="aspect-[4/2.5] bg-neutral-100 bg-cover bg-center"
        style={{ backgroundImage: `url(${message.image})` }}
      />
      <p
        className={`px-3.5 py-3 text-[9px] leading-relaxed ${
          fromOwner ? "text-white" : "text-neutral-600"
        }`}
      >
        {message.content}
      </p>
    </div>
  );
}

function MessageStream({
  messages,
  isThinking,
}: {
  messages: FarmerMessage[];
  isThinking: boolean;
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-[#f6f8f4] px-4 py-5 scrollbar-thin sm:px-6">
      <div className="mx-auto flex max-w-xl items-center gap-3 py-1">
        <i className="h-px flex-1 bg-neutral-200" />
        <span className="text-[7px] font-bold uppercase tracking-[0.16em] text-neutral-400">
          Hôm nay • Bảo mật trong tài khoản chủ vườn
        </span>
        <i className="h-px flex-1 bg-neutral-200" />
      </div>
      {messages.map((message) => {
        const fromOwner = message.sender === "OWNER";
        const senderLabel =
          message.sender === "ASSISTANT" ? "Durian AI" : "Kỹ sư phụ trách";
        return (
          <div
            key={message.id}
            className={`flex ${fromOwner ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[86%] sm:max-w-[78%]">
              {!fromOwner && (
                <small className="mb-1.5 flex items-center gap-1.5 text-[7px] font-bold text-neutral-400">
                  {message.sender === "ASSISTANT" ? (
                    <Sparkles size={10} />
                  ) : (
                    <ShieldCheck size={10} />
                  )}
                  {senderLabel}
                </small>
              )}
              {message.type === "IMAGE" && message.image ? (
                <ImageBubble message={message} fromOwner={fromOwner} />
              ) : (
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[9px] leading-relaxed shadow-sm ${
                    fromOwner
                      ? "rounded-br-md bg-[#2E5A44] text-white"
                      : "rounded-bl-md border border-neutral-100 bg-white text-neutral-700"
                  }`}
                >
                  {message.content}
                </div>
              )}
              <span
                className={`mt-1 flex items-center gap-1 text-[7px] text-neutral-400 ${
                  fromOwner ? "justify-end" : "justify-start"
                }`}
              >
                {message.sentAt}
                {fromOwner && <CheckCheck size={10} />}
              </span>
            </div>
          </div>
        );
      })}
      {isThinking && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
            <span className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <i
                  key={dot}
                  className="size-1.5 animate-pulse rounded-full bg-[#6d8d79]"
                  style={{ animationDelay: `${dot * 160}ms` }}
                />
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({
  mode,
  draft,
  attachment,
  disabled,
  onDraft,
  onAttachment,
  onRemoveAttachment,
  onSend,
}: {
  mode: FarmerChatMode;
  draft: string;
  attachment: FarmerAttachment | null;
  disabled: boolean;
  onDraft: (value: string) => void;
  onAttachment: (attachment: FarmerAttachment) => void;
  onRemoveAttachment: () => void;
  onSend: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSend = !disabled && (draft.trim().length > 0 || attachment !== null);

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onAttachment({ name: file.name, preview: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) onSend();
  };

  return (
    <div className="border-t border-neutral-100 bg-white p-3 sm:p-4">
      {attachment && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
          <div
            className="size-12 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${attachment.preview})` }}
          />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[9px] text-neutral-700">
              {attachment.name}
            </b>
            <small className="mt-1 block text-[7px] text-neutral-400">
              {mode === "AI"
                ? "Ảnh sẽ được đưa vào phiên phân tích mô phỏng"
                : "Ảnh sẽ đi cùng hồ sơ cứu trợ"}
            </small>
          </span>
          <button
            type="button"
            onClick={onRemoveAttachment}
            className="grid size-8 place-items-center rounded-lg text-neutral-400 transition-all duration-200 hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            aria-label="Xóa ảnh"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={selectImage}
      />
      <form onSubmit={submit} className="flex items-end gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition-all duration-200 hover:border-[#9bb0a0] hover:bg-[#edf3ee] hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Đính kèm ảnh lá"
        >
          <ImagePlus size={17} />
        </button>
        <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-neutral-200 bg-neutral-50 px-3 transition-all duration-200 focus-within:border-[#6f8d78] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2E5A4414]">
          <textarea
            rows={1}
            value={draft}
            disabled={disabled}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder={
              mode === "AI"
                ? "Hỏi về lá bệnh, tưới nước, dinh dưỡng..."
                : "Mô tả dấu hiệu bất thường cần kỹ sư hỗ trợ..."
            }
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-3 text-[10px] leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed"
          />
          <Paperclip size={14} className="mb-3 text-neutral-300" />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2E5A44] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-neutral-200 disabled:text-neutral-400"
          aria-label="Gửi tin nhắn"
        >
          <Send size={16} />
        </button>
      </form>
      <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[7px] text-neutral-400">
        <span>Enter để gửi • Shift + Enter để xuống dòng</span>
        <span className="inline-flex items-center gap-1 text-emerald-600">
          <CircleDot size={10} />
          State cục bộ an toàn
        </span>
      </div>
    </div>
  );
}

function ZoneContext({
  selectedZone,
  selectedZoneId,
  onSelect,
}: {
  selectedZone: FarmerZone;
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
}) {
  return (
    <div className="grid gap-2 border-b border-neutral-100 bg-white px-4 py-3 sm:grid-cols-[minmax(180px,.7fr)_1fr] sm:items-center sm:px-6">
      <label className="relative">
        <span className="sr-only">Chọn phân khu cần hỗ trợ</span>
        <MapPin
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#2E5A44]"
        />
        <select
          value={selectedZoneId}
          onChange={(event) => onSelect(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-neutral-200 bg-white pl-9 pr-8 text-[9px] font-bold text-neutral-700 outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
        >
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
      </label>
      <div className="rounded-xl bg-[#f3f6f2] px-3 py-2">
        <small className="block text-[7px] font-bold uppercase tracking-[0.12em] text-neutral-400">
          IoT snapshot • {selectedZone.crop}
        </small>
        <b className="mt-1 block text-[8px] text-neutral-700">
          {selectedZone.snapshot}
        </b>
      </div>
    </div>
  );
}

export function FarmerChatWorkspace() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isThinking, setIsThinking] = useState(false);

  const selectedZone =
    zones.find((zone) => zone.id === state.selectedZoneId) ?? zones[0];
  const currentMessages =
    state.mode === "AI" ? state.aiMessages : state.expertMessages;
  const currentDraft = state.mode === "AI" ? state.aiDraft : state.expertDraft;
  const currentAttachment =
    state.mode === "AI" ? state.aiAttachment : state.expertAttachment;

  const modeStats = useMemo(
    () => [
      { label: "Phản hồi AI", value: "< 2 giây", icon: BrainCircuit },
      { label: "Kỹ sư trực tuyến", value: "08", icon: Wifi },
      { label: "Ca đang chờ", value: "03", icon: Clock3 },
    ],
    [],
  );

  const sendMessage = () => {
    const prompt = currentDraft.trim();
    const hasAttachment = currentAttachment !== null;
    if (!prompt && !hasAttachment) return;

    dispatch({ type: "SEND_OWNER_MESSAGE", mode: state.mode });
    if (state.mode === "AI") {
      setIsThinking(true);
      window.setTimeout(() => {
        dispatch({
          type: "ADD_AI_RESPONSE",
          message: {
            id: `AI-${Date.now()}`,
            sender: "ASSISTANT",
            content: aiResponseFor(
              prompt || "Phân tích ảnh lá vừa gửi",
              selectedZone,
            ),
            sentAt: currentTime(),
            type: "TEXT",
            image: null,
          },
        });
        setIsThinking(false);
      }, 650);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid-pattern overflow-hidden rounded-[26px] bg-[#294f3b] p-6 text-white sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              <MessageCircleMore size={13} />
              Farmer support workspace
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Hỏi nhanh AI, kết nối đúng kỹ sư
            </h1>
            <p className="mt-2 text-[10px] leading-relaxed text-[#d0ddd4] sm:text-[11px]">
              Một nơi duy nhất để sàng lọc tình trạng vườn 24/7 hoặc lập hồ sơ
              cứu trợ có ảnh, phân khu và snapshot IoT.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {modeStats.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="min-w-24 rounded-xl border border-white/10 bg-white/[.08] px-3 py-3"
              >
                <Icon size={14} className="text-[#EED56D]" />
                <b className="mt-3 block text-[12px] tracking-tight">{value}</b>
                <small className="mt-1 block text-[7px] text-white/55">
                  {label}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="panel overflow-hidden">
        <div className="grid border-b border-neutral-100 bg-white sm:grid-cols-2">
          {(Object.keys(modeMeta) as FarmerChatMode[]).map((mode) => {
            const meta = modeMeta[mode];
            const Icon = meta.icon;
            const active = state.mode === mode;
            return (
              <button
                type="button"
                key={mode}
                onClick={() => dispatch({ type: "SET_MODE", mode })}
                className={`relative flex items-center gap-3 px-4 py-4 text-left transition-all duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2E5A44] sm:px-6 ${
                  active
                    ? "bg-[#f4f7f3]"
                    : "hover:bg-neutral-50"
                }`}
              >
                {active && (
                  <i className="absolute inset-x-5 bottom-0 h-[3px] rounded-t-full bg-[#D8B43F]" />
                )}
                <span
                  className={`grid size-10 place-items-center rounded-xl ${
                    active
                      ? "bg-[#2E5A44] text-[#EED56D]"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  <Icon size={19} />
                </span>
                <span>
                  <b className="block text-[11px] text-neutral-900">
                    {meta.title}
                  </b>
                  <small className="mt-1 block text-[8px] text-neutral-500">
                    {meta.description}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <section className="grid min-h-[680px] lg:grid-cols-[minmax(0,1fr)_270px]">
          <div className="flex min-h-[680px] min-w-0 flex-col border-b border-neutral-100 lg:border-b-0 lg:border-r">
            <header className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-white px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 place-items-center rounded-xl bg-[#EED56D] text-[#2E5A44]">
                  {state.mode === "AI" ? (
                    <Bot size={19} />
                  ) : (
                    <UserRoundCheck size={19} />
                  )}
                  <i className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </span>
                <span>
                  <b className="block text-[11px] text-neutral-900">
                    {state.mode === "AI"
                      ? "Durian AI Assistant"
                      : "Phòng cứu trợ Minh Phát"}
                  </b>
                  <small className="mt-1 flex items-center gap-1 text-[7px] text-neutral-400">
                    <CircleDot size={9} />
                    {state.mode === "AI"
                      ? "Mô phỏng LLM • không gửi dữ liệu ra ngoài"
                      : "Chờ Admin điều phối kỹ sư phù hợp"}
                  </small>
                </span>
              </div>
              {state.mode === "EXPERT" && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-[7px] font-bold text-amber-700 ring-1 ring-amber-100">
                  Chờ phân công
                </span>
              )}
            </header>

            <ZoneContext
              selectedZone={selectedZone}
              selectedZoneId={state.selectedZoneId}
              onSelect={(zoneId) =>
                dispatch({ type: "SELECT_ZONE", zoneId })
              }
            />
            <MessageStream
              messages={currentMessages}
              isThinking={state.mode === "AI" && isThinking}
            />
            <Composer
              mode={state.mode}
              draft={currentDraft}
              attachment={currentAttachment}
              disabled={isThinking}
              onDraft={(value) =>
                dispatch({ type: "SET_DRAFT", mode: state.mode, value })
              }
              onAttachment={(attachment) =>
                dispatch({
                  type: "SET_ATTACHMENT",
                  mode: state.mode,
                  attachment,
                })
              }
              onRemoveAttachment={() =>
                dispatch({ type: "REMOVE_ATTACHMENT", mode: state.mode })
              }
              onSend={sendMessage}
            />
          </div>

          <aside className="bg-[#fbfcfa] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Sprout size={15} className="text-[#2E5A44]" />
              <b className="text-[10px] text-neutral-900">
                Ngữ cảnh đang chia sẻ
              </b>
            </div>
            <div className="mt-4 space-y-3">
              <article className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                <small className="text-[7px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Phân khu
                </small>
                <b className="mt-2 block text-[10px] text-neutral-900">
                  {selectedZone.name}
                </b>
                <p className="mt-1 text-[8px] leading-relaxed text-neutral-500">
                  {selectedZone.crop}
                </p>
              </article>
              <article className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                <small className="text-[7px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Chỉ số gần nhất
                </small>
                <p className="mt-2 text-[9px] font-semibold leading-relaxed text-[#2E5A44]">
                  {selectedZone.snapshot}
                </p>
              </article>
              <article className="rounded-2xl bg-[#2E5A44] p-4 text-white">
                <Leaf size={18} className="text-[#EED56D]" />
                <b className="mt-4 block text-[10px]">
                  Ranh giới tư vấn an toàn
                </b>
                <p className="mt-2 text-[8px] leading-relaxed text-[#d4dfd7]">
                  AI chỉ hỗ trợ sàng lọc. Phác đồ thuốc, liều lượng và can thiệp
                  thiết bị phải được kỹ sư có quyền xác nhận.
                </p>
              </article>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
