"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { connectionClient, ConnectionApiError } from "@/lib/connections/client";
import type { ConnectionRelationStatus, ConnectionUser, UserConnection } from "@/lib/connections/types";

type TabKey = "COMMUNITY" | "PHONE" | "REQUESTS" | "CONNECTED";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "COMMUNITY", label: "Cộng đồng" },
  { key: "PHONE", label: "Tìm số điện thoại" },
  { key: "REQUESTS", label: "Lời mời" },
  { key: "CONNECTED", label: "Đã kết nối" },
];

const relationLabels: Record<ConnectionRelationStatus, string> = {
  NONE: "Chưa kết nối",
  REQUEST_SENT: "Đã gửi lời mời",
  REQUEST_RECEIVED: "Đang chờ bạn phản hồi",
  CONNECTED: "Đã kết nối",
  BLOCKED: "Đã chặn",
};

export function CommunityWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("COMMUNITY");
  const [query, setQuery] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneResult, setPhoneResult] = useState<ConnectionUser | null>(null);
  const [communityUsers, setCommunityUsers] = useState<ConnectionUser[]>([]);
  const [incoming, setIncoming] = useState<UserConnection[]>([]);
  const [outgoing, setOutgoing] = useState<UserConnection[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [community, incomingRequests, outgoingRequests, accepted] = await Promise.all([
        connectionClient.communityUsers(query, 0, 24),
        connectionClient.incoming(),
        connectionClient.outgoing(),
        connectionClient.listConnections(0, 24),
      ]);
      setCommunityUsers(community.items);
      setIncoming(incomingRequests);
      setOutgoing(outgoingRequests);
      setConnections(accepted.items);
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (searchParams.get("tab") === "phone") {
      setTab("PHONE");
    }
  }, [searchParams]);

  const incomingCount = incoming.length;
  const phoneError = useMemo(() => {
    const value = phoneNumber.trim();
    if (!value) return "";
    return /^[0-9+() .-]{8,30}$/.test(value) ? "" : "Số điện thoại chưa đúng định dạng.";
  }, [phoneNumber]);

  async function searchByPhone(event: FormEvent) {
    event.preventDefault();
    if (phoneError || !phoneNumber.trim()) return;
    setLoading(true);
    setError("");
    setPhoneResult(null);
    try {
      setPhoneResult(await connectionClient.searchByPhone(phoneNumber.trim()));
    } catch (searchError) {
      setError(messageOf(searchError));
    } finally {
      setLoading(false);
    }
  }

  async function runAction(id: string, action: () => Promise<unknown>) {
    if (actionId) return;
    setActionId(id);
    setError("");
    try {
      await action();
      await loadAll();
      if (phoneResult) {
        setPhoneResult(await connectionClient.searchByPhone(phoneNumber.trim()));
      }
    } catch (actionError) {
      setError(messageOf(actionError));
    } finally {
      setActionId(null);
    }
  }

  function openChat() {
    router.push(user?.role === "ENGINEER" ? "/dashboard/engineer/chat" : "/dashboard/client/chat");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[#294f3b] p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#EED56D]">Kết nối DurianCare</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Nông hộ và kỹ sư nông nghiệp</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#d4e1d8]">
              Tìm đúng người qua số điện thoại, gửi lời mời từ cộng đồng và quản lý các kết nối đang hoạt động.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#EED56D] px-4 text-sm font-extrabold text-[#2E5A44]"
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-2">
        <div className="grid gap-2 sm:grid-cols-4">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${
                tab === item.key ? "bg-[#2E5A44] text-white" : "bg-neutral-50 text-neutral-700"
              }`}
            >
              {item.label}
              {item.key === "REQUESTS" && incomingCount > 0 ? ` (${incomingCount})` : ""}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </section>
      ) : null}

      {tab === "COMMUNITY" ? (
        <section className="space-y-3">
          <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-[15px] font-semibold text-neutral-950 outline-none focus:border-[#2E5A44]"
                placeholder="Tìm theo tên hoặc khu vực"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white"
            >
              <Search size={16} />
              Tìm
            </button>
          </div>
          <UserGrid
            users={communityUsers}
            loading={loading}
            actionId={actionId}
            onConnect={(user) => runAction(user.id, () => connectionClient.sendRequest(user.id, "COMMUNITY"))}
            onAccept={(connectionId) => runAction(connectionId, () => connectionClient.accept(connectionId))}
            onChat={openChat}
          />
        </section>
      ) : null}

      {tab === "PHONE" ? (
        <section className="space-y-3">
          <form onSubmit={searchByPhone} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label>
                <span className="mb-2 block text-sm font-bold text-neutral-700">Số điện thoại</span>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-[15px] font-semibold text-neutral-950 outline-none focus:border-[#2E5A44]"
                  placeholder="Ví dụ: 0901234567"
                />
                {phoneError ? <span className="mt-2 block text-sm font-semibold text-red-700">{phoneError}</span> : null}
              </label>
              <button
                disabled={loading || !!phoneError || !phoneNumber.trim()}
                className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-xl bg-[#2E5A44] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                Tìm kiếm
              </button>
            </div>
          </form>
          {phoneResult ? (
            <UserCard
              user={phoneResult}
              actionId={actionId}
              onConnect={() => runAction(phoneResult.id, () => connectionClient.sendRequest(phoneResult.id, "PHONE_SEARCH"))}
              onAccept={(connectionId) => runAction(connectionId, () => connectionClient.accept(connectionId))}
              onChat={openChat}
            />
          ) : !loading && phoneNumber.trim() && !error ? (
            <EmptyState title="Không tìm thấy người dùng phù hợp" />
          ) : null}
        </section>
      ) : null}

      {tab === "REQUESTS" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <RequestList
            title="Lời mời nhận được"
            items={incoming}
            loading={loading}
            empty="Chưa có lời mời mới."
            actionId={actionId}
            actions={(item) => (
              <>
                <SmallButton onClick={() => runAction(item.id, () => connectionClient.accept(item.id))} disabled={actionId === item.id}>
                  <Check size={15} /> Chấp nhận
                </SmallButton>
                <SmallButton tone="danger" onClick={() => runAction(item.id, () => connectionClient.reject(item.id))} disabled={actionId === item.id}>
                  <X size={15} /> Từ chối
                </SmallButton>
              </>
            )}
          />
          <RequestList
            title="Lời mời đã gửi"
            items={outgoing}
            loading={loading}
            empty="Bạn chưa gửi lời mời nào."
            actionId={actionId}
            actions={(item) => (
              <SmallButton tone="danger" onClick={() => runAction(item.id, () => connectionClient.cancel(item.id))} disabled={actionId === item.id}>
                <X size={15} /> Hủy lời mời
              </SmallButton>
            )}
          />
        </section>
      ) : null}

      {tab === "CONNECTED" ? (
        <section className="grid gap-3">
          {loading ? <SkeletonRows /> : null}
          {!loading && connections.length === 0 ? <EmptyState title="Chưa có kết nối nào." /> : null}
          {connections.map((item) => (
            <ConnectionRow
              key={item.id}
              connection={item}
              actionId={actionId}
              onDisconnect={() => {
                if (window.confirm("Bạn chắc chắn muốn hủy kết nối này?")) {
                  void runAction(item.id, () => connectionClient.disconnect(item.id));
                }
              }}
              onChat={openChat}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function UserGrid({
  users,
  loading,
  actionId,
  onConnect,
  onAccept,
  onChat,
}: {
  users: ConnectionUser[];
  loading: boolean;
  actionId: string | null;
  onConnect: (user: ConnectionUser) => void;
  onAccept: (connectionId: string) => void;
  onChat: () => void;
}) {
  if (loading) return <SkeletonRows />;
  if (users.length === 0) return <EmptyState title="Không có người dùng phù hợp." />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          actionId={actionId}
          onConnect={() => onConnect(user)}
          onAccept={(connectionId) => onAccept(connectionId)}
          onChat={onChat}
        />
      ))}
    </div>
  );
}

function UserCard({
  user,
  actionId,
  onConnect,
  onAccept,
  onChat,
}: {
  user: ConnectionUser;
  actionId: string | null;
  onConnect: () => void;
  onAccept: (connectionId: string) => void;
  onChat: () => void;
}) {
  const busy = actionId === user.id || actionId === user.connectionId;
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-neutral-950">{user.fullName}</h2>
            {user.role === "ENGINEER" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-700">
                <BadgeCheck size={13} /> Kỹ sư
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-700">Nông hộ</span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-neutral-600">{user.region || "Chưa cập nhật khu vực"}</p>
          {user.phoneNumber ? <p className="mt-1 text-sm font-semibold text-neutral-500">{user.phoneNumber}</p> : null}
          <span className="mt-3 inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-extrabold text-neutral-700">
            {relationLabels[user.relationStatus]}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {user.relationStatus === "NONE" ? (
          <SmallButton onClick={onConnect} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Kết nối
          </SmallButton>
        ) : null}
        {user.relationStatus === "REQUEST_RECEIVED" && user.connectionId ? (
          <SmallButton onClick={() => onAccept(user.connectionId!)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Chấp nhận
          </SmallButton>
        ) : null}
        {user.relationStatus === "CONNECTED" ? (
          <SmallButton tone="muted" onClick={onChat}>
            <MessageCircle size={15} /> Nhắn tin
          </SmallButton>
        ) : null}
      </div>
    </article>
  );
}

function RequestList({
  title,
  items,
  loading,
  empty,
  actionId,
  actions,
}: {
  title: string;
  items: UserConnection[];
  loading: boolean;
  empty: string;
  actionId: string | null;
  actions: (item: UserConnection) => React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="text-lg font-extrabold text-neutral-950">{title}</h2>
      <div className="mt-3 grid gap-3">
        {loading ? <SkeletonRows /> : null}
        {!loading && items.length === 0 ? <EmptyState title={empty} compact /> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center gap-3">
              <Avatar user={item.user} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm text-neutral-950">{item.user.fullName}</b>
                <span className="text-xs font-bold text-neutral-500">{item.user.role === "ENGINEER" ? "Kỹ sư" : "Nông hộ"}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 opacity-100">{actionId === item.id ? <Loader2 className="animate-spin text-[#2E5A44]" size={18} /> : actions(item)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConnectionRow({
  connection,
  actionId,
  onDisconnect,
  onChat,
}: {
  connection: UserConnection;
  actionId: string | null;
  onDisconnect: () => void;
  onChat: () => void;
}) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={connection.user} />
          <div className="min-w-0">
            <b className="block truncate text-base text-neutral-950">{connection.user.fullName}</b>
            <span className="text-sm font-semibold text-neutral-600">{connection.user.region || "Chưa cập nhật khu vực"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SmallButton tone="muted" onClick={onChat}>
            <MessageCircle size={15} /> Nhắn tin
          </SmallButton>
          <SmallButton tone="danger" onClick={onDisconnect} disabled={actionId === connection.id}>
            {actionId === connection.id ? <Loader2 className="animate-spin" size={15} /> : <UserX size={15} />} Hủy kết nối
          </SmallButton>
        </div>
      </div>
    </article>
  );
}

function SmallButton({
  children,
  tone = "primary",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  tone?: "primary" | "danger" | "muted";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "muted"
        ? "border-neutral-200 bg-neutral-100 text-neutral-700"
        : "border-[#2E5A44] bg-[#2E5A44] text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function Avatar({ user }: { user: ConnectionUser }) {
  if (user.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar} alt={user.fullName} className="size-12 rounded-xl object-cover" />;
  }
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
      <UserRound size={22} />
    </span>
  );
}

function EmptyState({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-dashed border-neutral-300 bg-white text-center ${compact ? "p-4" : "p-8"}`}>
      <UserRound className="mx-auto text-neutral-300" size={compact ? 24 : 30} />
      <b className="mt-3 block text-sm text-neutral-950">{title}</b>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
      ))}
    </div>
  );
}

function messageOf(error: unknown) {
  if (error instanceof ConnectionApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Không thể tải dữ liệu kết nối.";
}
