"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  ImagePlus,
  Loader2,
  Maximize2,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  Smile,
  Sprout,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  X,
  ZoomIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { communityClient, CommunityApiError } from "@/lib/community/client";
import type {
  CommunityPost,
  CommunityPostStatus,
  CommunityPostVisibility,
  CommunityReactionType,
} from "@/lib/community/types";
import { connectionClient, ConnectionApiError } from "@/lib/connections/client";
import type { ConnectionRelationStatus, ConnectionUser, UserConnection } from "@/lib/connections/types";

type TabKey = "FEED" | "CREATE" | "FRIENDS" | "PROFILE" | "ADMIN";
type LightboxState = { media: CommunityPost["media"]; index: number } | null;

const topics = ["Tất cả", "Kỹ thuật trồng", "Sâu bệnh", "Dinh dưỡng", "Thị trường"];
const postTopics = topics.slice(1);
const reactionOptions: Array<{ type: CommunityReactionType; icon: string; label: string }> = [
  { type: "LIKE", icon: "👍", label: "Thích" },
  { type: "LOVE", icon: "❤️", label: "Yêu thích" },
  { type: "WOW", icon: "😮", label: "Bất ngờ" },
  { type: "SAD", icon: "😢", label: "Buồn" },
  { type: "HAHA", icon: "😄", label: "Haha" },
];

const relationLabels: Record<ConnectionRelationStatus, string> = {
  NONE: "Chưa kết nối",
  REQUEST_SENT: "Đã gửi lời mời",
  REQUEST_RECEIVED: "Chờ bạn phản hồi",
  CONNECTED: "Bạn bè",
  BLOCKED: "Đã chặn",
};

export function CommunityWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("FEED");
  const [topic, setTopic] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [adminPosts, setAdminPosts] = useState<CommunityPost[]>([]);
  const [adminStatus, setAdminStatus] = useState<CommunityPostStatus | "">("");
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const tabs = useMemo(
    () => [
      { key: "FEED" as const, label: "Bảng tin", icon: Sprout },
      { key: "CREATE" as const, label: "Tạo bài", icon: Plus },
      { key: "FRIENDS" as const, label: "Bạn bè", icon: UsersRound },
      { key: "PROFILE" as const, label: "Trang cá nhân", icon: UserRound },
      ...(isAdmin ? [{ key: "ADMIN" as const, label: "Quản trị", icon: Flag }] : []),
    ],
    [isAdmin],
  );

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const activeTopic = topic === "Tất cả" ? "" : topic;
      const [feed, mine, admin] = await Promise.all([
        communityClient.feed({ topic: activeTopic, query, size: 20 }),
        communityClient.mine(0, 20),
        isAdmin
          ? communityClient.adminPosts({ status: adminStatus, topic: activeTopic, query, size: 20 })
          : Promise.resolve(null),
      ]);
      setPosts(feed.items);
      setMyPosts(mine.items);
      if (admin) setAdminPosts(admin.items);
      if (isAdmin) {
        setUsers([]);
        setConnections([]);
        return;
      }
      const [people, accepted] = await Promise.all([
        connectionClient.communityUsers(query, 0, 12),
        connectionClient.listConnections(0, 20),
      ]);
      setUsers(people.items);
      setConnections(accepted.items);
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [adminStatus, isAdmin, query, topic]);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "connected") setTab("FRIENDS");
    if (requestedTab === "phone") setTab("FRIENDS");
  }, [searchParams]);

  async function runPostAction(id: string, action: () => Promise<CommunityPost | void>) {
    if (actionId) return;
    setActionId(id);
    setError("");
    try {
      const updated = await action();
      if (updated) {
        mergePost(updated);
      } else {
        await loadCommunity();
      }
    } catch (actionError) {
      setError(messageOf(actionError));
    } finally {
      setActionId(null);
    }
  }

  async function runConnectionAction(id: string, action: () => Promise<unknown>) {
    if (actionId) return;
    setActionId(id);
    setError("");
    try {
      await action();
      await loadCommunity();
    } catch (actionError) {
      setError(messageOf(actionError));
    } finally {
      setActionId(null);
    }
  }

  function mergePost(updated: CommunityPost) {
    setPosts((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    setMyPosts((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    setAdminPosts((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  }

  function openChat() {
    router.push(user?.role === "ENGINEER" ? "/dashboard/engineer/chat" : "/dashboard/client/chat");
  }

  async function toggleComments(post: CommunityPost) {
    const nextOpen = !openComments[post.id];
    setOpenComments((current) => ({ ...current, [post.id]: nextOpen }));
    if (!nextOpen || post.comments.length > 0 || post.commentCount === 0) return;
    await runPostAction(post.id, () => communityClient.detail(post.id));
  }

  function updateCommentDraft(postId: string, value: string) {
    setCommentDrafts((current) => ({ ...current, [postId]: value }));
  }

  function updateReplyDraft(commentId: string, value: string) {
    setReplyDrafts((current) => ({ ...current, [commentId]: value }));
  }

  async function submitComment(post: CommunityPost) {
    const content = (commentDrafts[post.id] ?? "").trim();
    if (!content) return;
    await runPostAction(post.id, async () => {
      const updated = await communityClient.comment(post.id, content);
      setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
      setOpenComments((current) => ({ ...current, [post.id]: true }));
      return updated;
    });
  }

  async function submitReply(post: CommunityPost, commentId: string) {
    const content = (replyDrafts[commentId] ?? "").trim();
    if (!content) return;
    await runPostAction(post.id, async () => {
      const updated = await communityClient.comment(post.id, content, commentId);
      setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
      setReplyingTo((current) => ({ ...current, [post.id]: null }));
      setOpenComments((current) => ({ ...current, [post.id]: true }));
      return updated;
    });
  }

  async function deleteComment(post: CommunityPost, commentId: string) {
    await runPostAction(post.id, () => communityClient.deleteComment(post.id, commentId));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-[22px] border border-[#e3e9e3] bg-white p-3 shadow-sm">
        <div className="rounded-2xl bg-[#2E5A44] p-4 text-white">
          <span className="grid size-11 place-items-center rounded-xl bg-white/12">
            <Sprout size={22} />
          </span>
          <b className="mt-3 block text-lg">DurianCare</b>
          <span className="text-sm font-semibold text-[#dce8df]">Cộng đồng</span>
        </div>
        <nav className="mt-3 space-y-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-extrabold transition ${
                  tab === item.key ? "bg-[#edf3ee] text-[#2E5A44]" : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 space-y-5">
        <section className="rounded-[22px] border border-[#e3e9e3] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#d8e1d8] bg-[#fbfcfa] pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#2E5A44] focus:bg-white"
                placeholder="Tìm bài viết, người dùng, chủ đề..."
              />
            </label>
            <button
              type="button"
              onClick={() => void loadCommunity()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Làm mới
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {topics.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className={`h-9 shrink-0 rounded-xl px-4 text-xs font-extrabold ${
                  topic === item ? "bg-[#2E5A44] text-white" : "bg-[#f4f7f3] text-neutral-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}

        {tab === "FEED" ? (
          <FeedView
            posts={posts}
            loading={loading}
            actionId={actionId}
            onReact={(post, type) => runPostAction(post.id, () => communityClient.react(post.id, post.myReaction === type ? null : type))}
            onToggleComments={(post) => void toggleComments(post)}
            onOpenMedia={(media, index) => setLightbox({ media, index })}
            onCommentDraftChange={updateCommentDraft}
            onReplyDraftChange={updateReplyDraft}
            onSubmitComment={(post) => void submitComment(post)}
            onSubmitReply={(post, commentId) => void submitReply(post, commentId)}
            onDeleteComment={(post, commentId) => void deleteComment(post, commentId)}
            onReplyingChange={(postId, commentId) => setReplyingTo((current) => ({ ...current, [postId]: commentId }))}
            onReport={(post) => runPostAction(post.id, () => communityClient.report(post.id))}
            onDelete={(post) => runPostAction(post.id, async () => {
              await communityClient.delete(post.id);
            })}
            openComments={openComments}
            commentDrafts={commentDrafts}
            replyDrafts={replyDrafts}
            replyingTo={replyingTo}
            currentUserId={user?.userId}
            isAdmin={isAdmin}
          />
        ) : null}

        {tab === "CREATE" ? <CreatePostPanel onCreated={(post) => {
          setPosts((current) => [post, ...current]);
          setMyPosts((current) => [post, ...current]);
          setTab("FEED");
        }} /> : null}

        {tab === "FRIENDS" ? (
          <FriendsView
            users={users}
            connections={connections}
            loading={loading}
            actionId={actionId}
            onConnect={(person) => runConnectionAction(person.id, () => connectionClient.sendRequest(person.id, "COMMUNITY"))}
            onAccept={(connectionId) => runConnectionAction(connectionId, () => connectionClient.accept(connectionId))}
            onDisconnect={(connectionId) => runConnectionAction(connectionId, () => connectionClient.disconnect(connectionId))}
            onChat={openChat}
          />
        ) : null}

        {tab === "PROFILE" ? (
          <ProfileView
            posts={myPosts}
            connections={connections}
            loading={loading}
            actionId={actionId}
            onReact={(post, type) => runPostAction(post.id, () => communityClient.react(post.id, post.myReaction === type ? null : type))}
            onToggleComments={(post) => void toggleComments(post)}
            onOpenMedia={(media, index) => setLightbox({ media, index })}
            onCommentDraftChange={updateCommentDraft}
            onReplyDraftChange={updateReplyDraft}
            onSubmitComment={(post) => void submitComment(post)}
            onSubmitReply={(post, commentId) => void submitReply(post, commentId)}
            onDeleteComment={(post, commentId) => void deleteComment(post, commentId)}
            onReplyingChange={(postId, commentId) => setReplyingTo((current) => ({ ...current, [postId]: commentId }))}
            onDelete={(post) => runPostAction(post.id, async () => {
              await communityClient.delete(post.id);
            })}
            openComments={openComments}
            commentDrafts={commentDrafts}
            replyDrafts={replyDrafts}
            replyingTo={replyingTo}
            currentUserId={user?.userId}
            isAdmin={isAdmin}
          />
        ) : null}

        {tab === "ADMIN" && isAdmin ? (
          <AdminView
            posts={adminPosts}
            status={adminStatus}
            loading={loading}
            actionId={actionId}
            onStatusChange={setAdminStatus}
            onOpen={(post) => void runPostAction(post.id, () => communityClient.detail(post.id))}
            onDelete={(post) => runPostAction(post.id, async () => {
              await communityClient.delete(post.id);
            })}
          />
        ) : null}
      </main>
      {lightbox ? <MediaLightbox state={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}

function CreatePostPanel({ onCreated }: { onCreated: (post: CommunityPost) => void }) {
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState(postTopics[0]);
  const [visibility, setVisibility] = useState<CommunityPostVisibility>("PUBLIC");
  const [media, setMedia] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      onCreated(await communityClient.create({ content: content.trim(), topic, visibility, media }));
      setContent("");
      setMedia([]);
    } catch (submitError) {
      setError(messageOf(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[22px] border border-[#e3e9e3] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
          <ImagePlus size={21} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-neutral-950">Tạo bài viết mới</h2>
          <p className="text-sm font-medium text-neutral-500">Chia sẻ kinh nghiệm chăm sóc sầu riêng với cộng đồng.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Select label="Chủ đề" value={topic} onChange={setTopic} options={postTopics} />
        <Select
          label="Ai có thể xem?"
          value={visibility}
          onChange={(value) => setVisibility(value as CommunityPostVisibility)}
          options={["PUBLIC", "CONNECTIONS"]}
          labels={{ PUBLIC: "Công khai", CONNECTIONS: "Bạn bè" }}
        />
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={5000}
        className="mt-4 min-h-[180px] w-full resize-none rounded-2xl border border-[#d8e1d8] bg-[#fbfcfa] p-4 text-sm font-medium outline-none focus:border-[#2E5A44] focus:bg-white"
        placeholder="Bạn đang muốn chia sẻ điều gì? Có thể thêm #kythuat #saurieng..."
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#d8e1d8] bg-white px-4 text-sm font-extrabold text-neutral-700">
          <Camera size={16} />
          Ảnh / Video
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={(event) => setMedia(Array.from(event.target.files ?? []).slice(0, 6))}
          />
        </label>
        {media.map((file) => (
          <span key={`${file.name}-${file.size}`} className="rounded-full bg-[#edf3ee] px-3 py-1.5 text-xs font-bold text-[#2E5A44]">
            {file.name}
          </span>
        ))}
      </div>
      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <button
        disabled={submitting || !content.trim()}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2E5A44] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        Đăng bài
      </button>
    </form>
  );
}

function FeedView(props: {
  posts: CommunityPost[];
  loading: boolean;
  actionId: string | null;
  currentUserId?: string;
  isAdmin: boolean;
  onReact: (post: CommunityPost, type: CommunityReactionType) => void;
  onToggleComments: (post: CommunityPost) => void;
  onOpenMedia: (media: CommunityPost["media"], index: number) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  onReplyDraftChange: (commentId: string, value: string) => void;
  onSubmitComment: (post: CommunityPost) => void;
  onSubmitReply: (post: CommunityPost, commentId: string) => void;
  onDeleteComment: (post: CommunityPost, commentId: string) => void;
  onReplyingChange: (postId: string, commentId: string | null) => void;
  onReport: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
  openComments: Record<string, boolean>;
  commentDrafts: Record<string, string>;
  replyDrafts: Record<string, string>;
  replyingTo: Record<string, string | null>;
}) {
  if (props.loading) return <SkeletonPosts />;
  if (props.posts.length === 0) return <EmptyState title="Chưa có bài viết phù hợp." />;
  return (
    <section className="grid gap-4">
      {props.posts.map((post) => <PostCard key={post.id} post={post} {...props} />)}
    </section>
  );
}

function PostCard({
  post,
  actionId,
  currentUserId,
  isAdmin,
  onReact,
  onToggleComments,
  onOpenMedia,
  onCommentDraftChange,
  onReplyDraftChange,
  onSubmitComment,
  onSubmitReply,
  onDeleteComment,
  onReplyingChange,
  onReport,
  onDelete,
  openComments,
  commentDrafts,
  replyDrafts,
  replyingTo,
}: {
  post: CommunityPost;
  actionId: string | null;
  currentUserId?: string;
  isAdmin: boolean;
  onReact: (post: CommunityPost, type: CommunityReactionType) => void;
  onToggleComments: (post: CommunityPost) => void;
  onOpenMedia: (media: CommunityPost["media"], index: number) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  onReplyDraftChange: (commentId: string, value: string) => void;
  onSubmitComment: (post: CommunityPost) => void;
  onSubmitReply: (post: CommunityPost, commentId: string) => void;
  onDeleteComment: (post: CommunityPost, commentId: string) => void;
  onReplyingChange: (postId: string, commentId: string | null) => void;
  onReport: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
  openComments: Record<string, boolean>;
  commentDrafts: Record<string, string>;
  replyDrafts: Record<string, string>;
  replyingTo: Record<string, string | null>;
}) {
  const canDelete = isAdmin || currentUserId === post.author.id;
  const commentsOpen = Boolean(openComments[post.id]);
  const commentDraft = commentDrafts[post.id] ?? "";
  return (
    <article className="rounded-[22px] border border-[#e3e9e3] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Author author={post.author} createdAt={post.createdAt} />
        <span className="rounded-full bg-[#edf3ee] px-3 py-1 text-xs font-extrabold text-[#2E5A44]">{post.topic}</span>
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-extrabold leading-7 text-neutral-950">{headline(post.content)}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">{post.content}</p>
      </div>
      <MediaGrid media={post.media} onOpen={onOpenMedia} />
      <div className="mt-3 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[#f4f7f3] px-2.5 py-1 text-xs font-bold text-[#2E5A44]">{tag}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[#edf1ec] pt-3 text-xs font-bold text-neutral-500">
        <ReactionPicker
          selected={post.myReaction}
          count={post.reactionCount}
          disabled={actionId === post.id}
          onSelect={(type) => onReact(post, type)}
        />
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => onToggleComments(post)}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-neutral-50 hover:text-[#2E5A44]"
          >
            <MessageCircle size={16} />
            {post.commentCount}
          </button>
          <span className="inline-flex items-center gap-1.5">
            <Share2 size={16} />
            {post.shareCount}
          </span>
        </div>
      </div>
      <div className="mt-2 grid gap-2 border-t border-[#edf1ec] pt-2 sm:grid-cols-3">
        <ReactionPicker
          selected={post.myReaction}
          variant="action"
          disabled={actionId === post.id}
          onSelect={(type) => onReact(post, type)}
        />
        <ActionButton
          active={commentsOpen}
          onClick={() => onToggleComments(post)}
          icon={<MessageCircle size={16} />}
        >
          Bình luận
        </ActionButton>
        <ActionButton onClick={() => void navigator.clipboard?.writeText(window.location.href)} icon={<Share2 size={16} />}>Chia sẻ</ActionButton>
      </div>
      {commentsOpen ? (
        <InlineComments
          post={post}
          draft={commentDraft}
          submitting={actionId === post.id}
          onDraftChange={(value) => onCommentDraftChange(post.id, value)}
          onReplyDraftChange={onReplyDraftChange}
          onSubmit={() => onSubmitComment(post)}
          onSubmitReply={(commentId) => onSubmitReply(post, commentId)}
          onDeleteComment={(commentId) => onDeleteComment(post, commentId)}
          onReplyingChange={(commentId) => onReplyingChange(post.id, commentId)}
          replyDrafts={replyDrafts}
          replyingTo={replyingTo[post.id] ?? null}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ) : null}
      <div className="mt-2 flex justify-end gap-2">
        <IconButton label="Báo cáo" onClick={() => onReport(post)} icon={<Flag size={15} />} />
        {canDelete ? <IconButton label="Xóa" onClick={() => onDelete(post)} icon={<Trash2 size={15} />} danger /> : null}
      </div>
    </article>
  );
}

function MediaGrid({ media, onOpen }: { media: CommunityPost["media"]; onOpen: (media: CommunityPost["media"], index: number) => void }) {
  if (media.length === 0) return null;
  return (
    <div className="mt-4 grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-3">
      {media.slice(0, 4).map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(media, index)}
          className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f4f7f3] text-left outline-none ring-[#2E5A44]/30 transition focus-visible:ring-4"
        >
          {item.type === "VIDEO" ? (
            <video src={item.url} className="h-full w-full object-cover transition group-hover:scale-[1.03]" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
          )}
          <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          {index === 3 && media.length > 4 ? (
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-2xl font-extrabold text-white">+{media.length - 3}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function MediaLightbox({
  state,
  onChange,
  onClose,
}: {
  state: NonNullable<LightboxState>;
  onChange: (state: LightboxState) => void;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(state.index);
  const [zoom, setZoom] = useState(100);
  const current = state.media[index] ?? state.media[0];
  const hasMany = state.media.length > 1;

  const move = useCallback(
    (step: number) => {
      setIndex((value) => {
        const next = (value + step + state.media.length) % state.media.length;
        onChange({ media: state.media, index: next });
        setZoom(100);
        return next;
      });
    },
    [onChange, state.media],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move, onClose]);

  function updateZoom(step: number) {
    setZoom((value) => Math.min(220, Math.max(80, value + step)));
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await frameRef.current?.requestFullscreen?.();
  }

  if (!current) return null;

  return (
    <div
      ref={frameRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 p-4 text-white"
      onClick={onClose}
    >
      <div className="absolute left-5 top-5 text-sm font-extrabold">
        {index + 1} / {state.media.length}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Đóng"
      >
        <X size={25} />
      </button>

      {hasMany ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              move(-1);
            }}
            className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20"
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              move(1);
            }}
            className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20"
            aria-label="Ảnh sau"
          >
            <ChevronRight size={26} />
          </button>
        </>
      ) : null}

      <div
        className="flex h-[78vh] w-[86vw] items-center justify-center overflow-auto rounded-xl bg-black/20"
        onClick={(event) => event.stopPropagation()}
      >
        {current.type === "VIDEO" ? (
          <video src={current.url} className="h-full w-full rounded-lg object-contain" controls autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt=""
            className="h-full w-full rounded-lg object-contain transition"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/45 px-3 py-2 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            updateZoom(-10);
          }}
          className="grid size-9 place-items-center rounded-full hover:bg-white/10"
          aria-label="Thu nhỏ"
        >
          <Minus size={18} />
        </button>
        <span className="min-w-16 text-center text-sm font-extrabold">{zoom}%</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            updateZoom(10);
          }}
          className="grid size-9 place-items-center rounded-full hover:bg-white/10"
          aria-label="Phóng to"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setZoom(100);
          }}
          className="ml-1 grid size-9 place-items-center rounded-full hover:bg-white/10"
          aria-label="Đặt lại zoom"
        >
          <ZoomIn size={18} />
        </button>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void toggleFullscreen();
        }}
        className="absolute bottom-6 right-6 grid size-11 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
        aria-label="Toàn màn hình"
      >
        <Maximize2 size={22} />
      </button>
    </div>
  );
}

function ReactionPicker({
  selected,
  count,
  variant = "summary",
  disabled,
  onSelect,
}: {
  selected: CommunityReactionType | null;
  count?: number;
  variant?: "summary" | "action";
  disabled?: boolean;
  onSelect: (type: CommunityReactionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedReaction = reactionOptions.find((reaction) => reaction.type === selected);
  const isAction = variant === "action";

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className={`relative inline-flex ${isAction ? "w-full" : ""}`} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={
          isAction
            ? `inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedReaction ? "bg-[#edf3ee] text-[#2E5A44]" : "text-neutral-600 hover:bg-neutral-50"
              }`
            : `inline-flex h-8 items-center gap-2 rounded-xl px-1.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedReaction ? "text-[#2E5A44]" : "text-neutral-600 hover:bg-neutral-50 hover:text-[#2E5A44]"
              }`
        }
      >
        {selectedReaction ? (
          <span className={isAction ? "text-base" : "text-lg"}>{selectedReaction.icon}</span>
        ) : (
          <Smile size={isAction ? 16 : 18} />
        )}
        <span>{isAction ? "Cảm xúc" : count ?? 0}</span>
      </button>

      {open ? (
        <div className="absolute bottom-full left-1/2 z-30 mb-3 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-[#edf1ec] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(28,43,35,0.18)]">
          <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-[#edf1ec] bg-white" />
          {reactionOptions.map((reaction) => (
            <button
              key={reaction.type}
              type="button"
              title={reaction.label}
              aria-label={reaction.label}
              onClick={() => {
                onSelect(reaction.type);
                setOpen(false);
              }}
              className={`relative grid size-10 place-items-center rounded-full text-2xl transition hover:-translate-y-1 hover:scale-110 ${
                selected === reaction.type ? "bg-[#f6f8f5] ring-2 ring-[#2E5A44]/25" : "hover:bg-[#f6f8f5]"
              }`}
            >
              {reaction.icon}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InlineComments({
  post,
  draft,
  submitting,
  onDraftChange,
  onReplyDraftChange,
  onSubmit,
  onSubmitReply,
  onDeleteComment,
  onReplyingChange,
  replyDrafts,
  replyingTo,
  currentUserId,
  isAdmin,
}: {
  post: CommunityPost;
  draft: string;
  submitting: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onReplyDraftChange: (commentId: string, value: string) => void;
  onSubmitReply: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReplyingChange: (commentId: string | null) => void;
  replyDrafts: Record<string, string>;
  replyingTo: string | null;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  const canDeleteComment = (authorId: string) => isAdmin || currentUserId === post.author.id || currentUserId === authorId;

  return (
    <div className="mt-3 rounded-2xl border border-[#edf1ec] bg-[#fbfcfa] p-3">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="h-11 flex-1 rounded-xl border border-[#d8e1d8] bg-white px-3 text-sm font-medium outline-none focus:border-[#2E5A44]"
          placeholder="Viết bình luận..."
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !draft.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
          Gửi
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {post.comments.length === 0 ? (
          <p className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-neutral-500">
            Chưa có bình luận nào.
          </p>
        ) : (
          post.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              submitting={submitting}
              replyDraft={replyDrafts[comment.id] ?? ""}
              replying={replyingTo === comment.id}
              canDelete={canDeleteComment(comment.author.id)}
              onReply={() => onReplyingChange(replyingTo === comment.id ? null : comment.id)}
              onReplyDraftChange={(value) => onReplyDraftChange(comment.id, value)}
              onSubmitReply={() => onSubmitReply(comment.id)}
              onDelete={() => onDeleteComment(comment.id)}
              canDeleteReply={(authorId) => canDeleteComment(authorId)}
              onDeleteReply={onDeleteComment}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  submitting,
  replyDraft,
  replying,
  canDelete,
  onReply,
  onReplyDraftChange,
  onSubmitReply,
  onDelete,
  canDeleteReply,
  onDeleteReply,
}: {
  comment: CommunityPost["comments"][number];
  submitting: boolean;
  replyDraft: string;
  replying: boolean;
  canDelete: boolean;
  onReply: () => void;
  onReplyDraftChange: (value: string) => void;
  onSubmitReply: () => void;
  onDelete: () => void;
  canDeleteReply: (authorId: string) => boolean;
  onDeleteReply: (commentId: string) => void;
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <Author author={comment.author} compact />
      <p className="mt-2 text-sm leading-6 text-neutral-700">{comment.content}</p>
      <div className="mt-2 flex items-center gap-3 text-xs font-extrabold text-neutral-500">
        <button type="button" onClick={onReply} className="hover:text-[#2E5A44]">Trả lời</button>
        {canDelete ? (
          <button type="button" onClick={onDelete} disabled={submitting} className="hover:text-red-600 disabled:opacity-60">
            Xóa
          </button>
        ) : null}
      </div>
      {replying ? (
        <div className="mt-3 flex gap-2 border-l-2 border-[#edf3ee] pl-3">
          <input
            value={replyDraft}
            onChange={(event) => onReplyDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmitReply();
              }
            }}
            className="h-10 flex-1 rounded-xl border border-[#d8e1d8] bg-white px-3 text-sm font-medium outline-none focus:border-[#2E5A44]"
            placeholder="Viết phản hồi..."
          />
          <button
            type="button"
            onClick={onSubmitReply}
            disabled={submitting || !replyDraft.trim()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2E5A44] px-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
          </button>
        </div>
      ) : null}
      {comment.replies.length > 0 ? (
        <div className="mt-3 space-y-2 border-l-2 border-[#edf3ee] pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="rounded-xl bg-[#fbfcfa] p-3">
              <Author author={reply.author} compact />
              <p className="mt-2 text-sm leading-6 text-neutral-700">{reply.content}</p>
              {canDeleteReply(reply.author.id) ? (
                <button
                  type="button"
                  onClick={() => onDeleteReply(reply.id)}
                  disabled={submitting}
                  className="mt-2 text-xs font-extrabold text-neutral-500 hover:text-red-600 disabled:opacity-60"
                >
                  Xóa
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FriendsView({
  users,
  connections,
  loading,
  actionId,
  onConnect,
  onAccept,
  onDisconnect,
  onChat,
}: {
  users: ConnectionUser[];
  connections: UserConnection[];
  loading: boolean;
  actionId: string | null;
  onConnect: (user: ConnectionUser) => void;
  onAccept: (connectionId: string) => void;
  onDisconnect: (connectionId: string) => void;
  onChat: () => void;
}) {
  if (loading) return <SkeletonPosts />;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[22px] border border-[#e3e9e3] bg-white p-4 shadow-sm">
        <h2 className="text-lg font-extrabold text-neutral-950">Gợi ý kết bạn</h2>
        <div className="mt-4 grid gap-3">
          {users.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              actionId={actionId}
              onConnect={() => onConnect(person)}
              onAccept={(id) => onAccept(id)}
              onChat={onChat}
            />
          ))}
        </div>
      </section>
      <section className="rounded-[22px] border border-[#e3e9e3] bg-white p-4 shadow-sm">
        <h2 className="text-lg font-extrabold text-neutral-950">Bạn bè ({connections.length})</h2>
        <div className="mt-4 grid gap-3">
          {connections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf1ec] p-3">
              <Author author={connection.user} compact />
              <div className="flex gap-2">
                <IconButton label="Chat" onClick={onChat} icon={<MessageCircle size={15} />} />
                <IconButton label="Hủy" onClick={() => onDisconnect(connection.id)} icon={<X size={15} />} danger />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PersonRow({
  person,
  actionId,
  onConnect,
  onAccept,
  onChat,
}: {
  person: ConnectionUser;
  actionId: string | null;
  onConnect: () => void;
  onAccept: (connectionId: string) => void;
  onChat: () => void;
}) {
  const busy = actionId === person.id || actionId === person.connectionId;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#edf1ec] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Author author={person} compact />
        <span className="mt-2 inline-flex rounded-full bg-[#f4f7f3] px-3 py-1 text-xs font-extrabold text-neutral-600">
          {relationLabels[person.relationStatus]}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {person.relationStatus === "NONE" ? (
          <SmallButton onClick={onConnect} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={15} /> : <UserPlus size={15} />} Kết bạn
          </SmallButton>
        ) : null}
        {person.relationStatus === "REQUEST_RECEIVED" && person.connectionId ? (
          <SmallButton onClick={() => onAccept(person.connectionId!)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Chấp nhận
          </SmallButton>
        ) : null}
        {person.relationStatus === "CONNECTED" ? <SmallButton onClick={onChat}>Chat</SmallButton> : null}
      </div>
    </div>
  );
}

function ProfileView({
  posts,
  connections,
  loading,
  actionId,
  onReact,
  onToggleComments,
  onOpenMedia,
  onCommentDraftChange,
  onReplyDraftChange,
  onSubmitComment,
  onSubmitReply,
  onDeleteComment,
  onReplyingChange,
  onDelete,
  openComments,
  commentDrafts,
  replyDrafts,
  replyingTo,
  currentUserId,
  isAdmin,
}: {
  posts: CommunityPost[];
  connections: UserConnection[];
  loading: boolean;
  actionId: string | null;
  onReact: (post: CommunityPost, type: CommunityReactionType) => void;
  onToggleComments: (post: CommunityPost) => void;
  onOpenMedia: (media: CommunityPost["media"], index: number) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  onSubmitComment: (post: CommunityPost) => void;
  onReplyDraftChange: (commentId: string, value: string) => void;
  onSubmitReply: (post: CommunityPost, commentId: string) => void;
  onDeleteComment: (post: CommunityPost, commentId: string) => void;
  onReplyingChange: (postId: string, commentId: string | null) => void;
  onDelete: (post: CommunityPost) => void;
  openComments: Record<string, boolean>;
  commentDrafts: Record<string, string>;
  replyDrafts: Record<string, string>;
  replyingTo: Record<string, string | null>;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-[22px] border border-[#e3e9e3] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Bài viết" value={posts.length} />
          <Stat label="Bạn bè" value={connections.length} />
          <Stat label="Theo dõi" value={posts.reduce((sum, post) => sum + post.reactionCount, 0)} />
        </div>
      </div>
      {loading ? <SkeletonPosts /> : posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          actionId={actionId}
          onReact={onReact}
          onToggleComments={onToggleComments}
          onOpenMedia={onOpenMedia}
          onCommentDraftChange={onCommentDraftChange}
          onReplyDraftChange={onReplyDraftChange}
          onSubmitComment={onSubmitComment}
          onSubmitReply={onSubmitReply}
          onDeleteComment={onDeleteComment}
          onReplyingChange={onReplyingChange}
          onReport={() => undefined}
          onDelete={onDelete}
          openComments={openComments}
          commentDrafts={commentDrafts}
          replyDrafts={replyDrafts}
          replyingTo={replyingTo}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </section>
  );
}

function AdminView({
  posts,
  status,
  loading,
  actionId,
  onStatusChange,
  onOpen,
  onDelete,
}: {
  posts: CommunityPost[];
  status: CommunityPostStatus | "";
  loading: boolean;
  actionId: string | null;
  onStatusChange: (status: CommunityPostStatus | "") => void;
  onOpen: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
}) {
  return (
    <section className="rounded-[22px] border border-[#e3e9e3] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-extrabold text-neutral-950">Quản lý bài viết</h2>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as CommunityPostStatus | "")}
          className="h-11 rounded-xl border border-[#d8e1d8] bg-white px-3 text-sm font-bold outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PUBLISHED">Công khai</option>
          <option value="REPORTED">Bị báo cáo</option>
          <option value="HIDDEN">Đã ẩn</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="text-xs uppercase text-neutral-400">
            <tr className="border-b border-[#edf1ec]">
              <th className="py-3">Bài viết</th>
              <th>Tác giả</th>
              <th>Chủ đề</th>
              <th>Trạng thái</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-6 text-neutral-500" colSpan={5}>Đang tải...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td className="py-6 text-sm font-semibold text-neutral-500" colSpan={5}>Chưa có bài viết phù hợp.</td></tr>
            ) : posts.map((post) => (
              <tr key={post.id} className="border-b border-[#f0f3ef]">
                <td className="max-w-[260px] truncate py-3 font-bold text-neutral-900">{headline(post.content)}</td>
                <td>{post.author.fullName}</td>
                <td>{post.topic}</td>
                <td className={post.status === "REPORTED" ? "font-bold text-red-600" : "font-semibold text-neutral-600"}>{statusLabel(post.status)}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <IconButton label="Xem" onClick={() => onOpen(post)} icon={<Eye size={15} />} />
                    <IconButton label="Xóa" onClick={() => onDelete(post)} icon={<Trash2 size={15} />} danger disabled={actionId === post.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Author({ author, createdAt, compact = false }: { author: { fullName: string; avatar: string | null; role: string; region?: string | null }; createdAt?: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {author.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatar} alt={author.fullName} className={`${compact ? "size-10" : "size-12"} shrink-0 rounded-xl object-cover`} />
      ) : (
        <span className={`${compact ? "size-10" : "size-12"} grid shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]`}>
          <UserRound size={compact ? 18 : 22} />
        </span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <b className="truncate text-sm text-neutral-950">{author.fullName}</b>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
            {author.role === "ENGINEER" ? <BadgeCheck size={12} /> : null}
            {roleLabel(author.role)}
          </span>
        </div>
        {!compact ? <p className="mt-1 text-xs font-semibold text-neutral-500">{createdAt ? relativeTime(createdAt) : author.region || "DurianCare"}</p> : null}
      </div>
    </div>
  );
}

function Select({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[1.2px] text-neutral-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-2xl border border-[#d8e1d8] bg-[#fbfcfa] px-3 text-sm font-bold outline-none focus:border-[#2E5A44]">
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function SmallButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-sm font-extrabold text-white disabled:opacity-60">
      {children}
    </button>
  );
}

function ActionButton({ children, icon, active, disabled, onClick }: { children: React.ReactNode; icon: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition disabled:opacity-60 ${active ? "bg-[#edf3ee] text-[#2E5A44]" : "text-neutral-600 hover:bg-neutral-50"}`}>
      {icon}
      {children}
    </button>
  );
}

function IconButton({ label, icon, danger, disabled, onClick }: { label: string; icon: React.ReactNode; danger?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={`grid size-9 place-items-center rounded-xl border disabled:opacity-50 ${danger ? "border-red-100 bg-red-50 text-red-600" : "border-[#d8e1d8] bg-white text-neutral-600 hover:bg-[#f8fbf8]"}`}>
      {icon}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <b className="block text-xl text-neutral-950">{value}</b>
      <span className="text-xs font-bold text-neutral-500">{label}</span>
    </div>
  );
}

function SkeletonPosts() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-[22px] border border-[#e3e9e3] bg-neutral-100" />)}
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#d8e1d8] bg-white p-8 text-center">
      <MoreHorizontal className="mx-auto text-neutral-300" size={30} />
      <b className="mt-3 block text-sm text-neutral-950">{title}</b>
    </div>
  );
}

function headline(content: string) {
  return content.split("\n").find(Boolean)?.replace(/^#+\s*/, "").slice(0, 96) || "Bài viết cộng đồng";
}

function roleLabel(role: string) {
  if (role === "ADMIN") return "Admin";
  if (role === "ENGINEER") return "Kỹ sư";
  return "Nông hộ";
}

function statusLabel(status: CommunityPostStatus) {
  if (status === "REPORTED") return "Bị báo cáo";
  if (status === "HIDDEN") return "Đã ẩn";
  return "Công khai";
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}

function messageOf(error: unknown) {
  if (error instanceof CommunityApiError) return error.message;
  if (error instanceof ConnectionApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Không thể tải dữ liệu cộng đồng.";
}
