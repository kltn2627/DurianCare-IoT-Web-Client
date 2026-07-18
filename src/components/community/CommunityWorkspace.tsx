"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Leaf,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  Sprout,
  Trash2,
  UsersRound,
  Video,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

type PostKind = "QUESTION" | "EXPERIENCE";
type TopicKey = "ALL" | "PESTS" | "NUTRITION" | "IRRIGATION" | "FLOWERING" | "MARKET" | "GENERAL";

type CommunityComment = {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
};

type CommunityAttachment = {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
};

type CommunityPost = {
  id: string;
  kind: PostKind;
  topic: Exclude<TopicKey, "ALL">;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
  attachments?: CommunityAttachment[];
  comments: CommunityComment[];
};

const STORAGE_KEY = "duriancare.community.posts";

const topicLabels: Record<TopicKey, string> = {
  ALL: "Tất cả",
  PESTS: "Sâu bệnh",
  NUTRITION: "Dinh dưỡng",
  IRRIGATION: "Tưới tiêu",
  FLOWERING: "Ra hoa",
  MARKET: "Thị trường",
  GENERAL: "Kinh nghiệm chung",
};

const roleLabels: Record<string, string> = {
  OWNER: "Chủ vườn",
  ENGINEER: "Kỹ sư",
  ADMIN: "Quản trị",
};

const seedPosts: CommunityPost[] = [
  {
    id: "community-seed-1",
    kind: "QUESTION",
    topic: "PESTS",
    title: "Lá non sầu riêng bị đốm nâu sau mưa kéo dài nên xử lý thế nào?",
    content:
      "Vườn mình có vài cây RI6 lá non xuất hiện đốm nâu, đất còn ẩm nhiều. Nhờ kỹ sư và anh chị có kinh nghiệm góp ý cách xử lý an toàn.",
    authorName: "Nguyễn Văn Minh",
    authorRole: "Chủ vườn",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    likes: 8,
    likedBy: [],
    comments: [
      {
        id: "community-comment-1",
        authorName: "Kỹ sư An",
        authorRole: "Kỹ sư",
        content: "Nên kiểm tra thoát nước trước, tỉa cành thông thoáng và chụp rõ mặt dưới lá để phân biệt nấm với cháy phân.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      },
    ],
  },
  {
    id: "community-seed-2",
    kind: "EXPERIENCE",
    topic: "FLOWERING",
    title: "Kinh nghiệm siết nước trước khi xử lý ra hoa",
    content:
      "Mình ghi lại mốc theo dõi ẩm đất, tình trạng lá và thời điểm tưới lại. Anh chị nào đang làm vụ nghịch có thể tham khảo và điều chỉnh theo đất vườn.",
    authorName: "Trần Thị Lan",
    authorRole: "Chủ vườn",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    likes: 14,
    likedBy: [],
    comments: [],
  },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function safePosts(value: string | null) {
  if (!value) return seedPosts;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as CommunityPost[]) : seedPosts;
  } catch {
    return seedPosts;
  }
}

export function CommunityWorkspace() {
  const { user } = useAuth();
  const currentName = user?.profile.fullName ?? "Nhà vườn DurianCare";
  const currentRole = roleLabels[user?.role ?? ""] ?? "Thành viên";
  const currentUserKey = user?.userId ?? currentName;
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    if (typeof window === "undefined") return seedPosts;
    return safePosts(window.localStorage.getItem(STORAGE_KEY));
  });
  const [topic, setTopic] = useState<TopicKey>("ALL");
  const [query, setQuery] = useState("");
  const [openComposer, setOpenComposer] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [form, setForm] = useState({
    kind: "QUESTION" as PostKind,
    topic: "GENERAL" as Exclude<TopicKey, "ALL">,
    title: "",
    content: "",
  });

  const handleAttachmentPick = async (files: FileList | null) => {
    if (!files?.length) return;
    const availableSlots = Math.max(0, 4 - attachments.length);
    if (!availableSlots) return;
    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .slice(0, availableSlots);
    const loaded = await Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<CommunityAttachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `attachment-${Date.now()}-${file.name}`,
                name: file.name,
                type: file.type.startsWith("video/") ? "video" : "image",
                url: String(reader.result),
              });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setAttachments((current) => [...current, ...loaded].slice(0, 4));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return posts
      .filter((post) => topic === "ALL" || post.topic === topic)
      .filter((post) => {
        if (!normalizedQuery) return true;
        return [post.title, post.content, post.authorName, topicLabels[post.topic]]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(normalizedQuery);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, query, topic]);

  const stats = useMemo(() => {
    const questions = posts.filter((post) => post.kind === "QUESTION").length;
    const experiences = posts.filter((post) => post.kind === "EXPERIENCE").length;
    const comments = posts.reduce((sum, post) => sum + post.comments.length, 0);
    return { questions, experiences, comments };
  }, [posts]);

  const createPost = (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) return;
    const nextPost: CommunityPost = {
      id: `community-${Date.now()}`,
      kind: form.kind,
      topic: form.topic,
      title,
      content,
      authorName: currentName,
      authorRole: currentRole,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      attachments,
      comments: [],
    };
    setPosts((current) => [nextPost, ...current]);
    setForm({ kind: "QUESTION", topic: "GENERAL", title: "", content: "" });
    setAttachments([]);
    setOpenComposer(false);
  };

  const toggleLike = (postId: string) => {
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== postId) return post;
        const liked = post.likedBy.includes(currentUserKey);
        return {
          ...post,
          likes: liked ? Math.max(0, post.likes - 1) : post.likes + 1,
          likedBy: liked ? post.likedBy.filter((id) => id !== currentUserKey) : [...post.likedBy, currentUserKey],
        };
      }),
    );
  };

  const addComment = (postId: string) => {
    const content = commentDrafts[postId]?.trim();
    if (!content) return;
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `comment-${Date.now()}`,
                  authorName: currentName,
                  authorRole: currentRole,
                  content,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : post,
      ),
    );
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
  };

  return (
    <div className="space-y-4">
      <section className="grid-pattern overflow-hidden rounded-2xl bg-[#294f3b] p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EED56D] text-[#2E5A44]">
              <UsersRound size={24} />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#EED56D]">Cộng đồng DurianCare</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Hỏi đáp và chia sẻ kinh nghiệm trồng vườn</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#d4e1d8]">
                Nhà vườn và kỹ sư cùng đăng câu hỏi, chia sẻ cách chăm sóc, phòng bệnh, xử lý ra hoa và kinh nghiệm thị trường.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenComposer((current) => !current)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#EED56D] px-5 text-[15px] font-extrabold text-[#2E5A44]"
          >
            <Plus size={18} />
            Đăng bài
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="panel p-4">
          <HelpCircle size={20} className="text-[#2E5A44]" />
          <b className="mt-3 block text-2xl text-neutral-950">{stats.questions}</b>
          <span className="text-[13px] font-bold text-neutral-600">Câu hỏi</span>
        </article>
        <article className="panel p-4">
          <BookOpen size={20} className="text-[#2E5A44]" />
          <b className="mt-3 block text-2xl text-neutral-950">{stats.experiences}</b>
          <span className="text-[13px] font-bold text-neutral-600">Bài chia sẻ</span>
        </article>
        <article className="panel p-4">
          <MessageCircle size={20} className="text-[#2E5A44]" />
          <b className="mt-3 block text-2xl text-neutral-950">{stats.comments}</b>
          <span className="text-[13px] font-bold text-neutral-600">Trao đổi</span>
        </article>
      </section>

      {openComposer ? (
        <section className="panel p-4 sm:p-5">
          <form onSubmit={createPost} className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-950">Tạo bài viết cộng đồng</h2>
                <p className="mt-1 text-[13px] font-medium text-neutral-600">Đăng câu hỏi cần tư vấn hoặc chia sẻ kinh nghiệm thực tế từ vườn.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
                {(["QUESTION", "EXPERIENCE"] as PostKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, kind }))}
                    className={`min-h-10 rounded-lg px-3 text-[13px] font-extrabold ${
                      form.kind === kind ? "bg-[#2E5A44] text-white" : "text-neutral-700"
                    }`}
                  >
                    {kind === "QUESTION" ? "Hỏi đáp" : "Chia sẻ"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <select
                value={form.topic}
                onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value as Exclude<TopicKey, "ALL"> }))}
                className="h-12 rounded-xl border border-neutral-300 bg-white px-3 text-[15px] font-bold text-neutral-950 outline-none focus:border-[#2E5A44]"
              >
                {(Object.keys(topicLabels).filter((item) => item !== "ALL") as Array<Exclude<TopicKey, "ALL">>).map((item) => (
                  <option key={item} value={item}>
                    {topicLabels[item]}
                  </option>
                ))}
              </select>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="h-12 rounded-xl border border-neutral-300 bg-white px-3 text-[15px] font-bold text-neutral-950 outline-none focus:border-[#2E5A44]"
                placeholder="Tiêu đề bài viết"
                required
              />
            </div>
            <textarea
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              className="min-h-32 rounded-xl border border-neutral-300 bg-white px-3 py-3 text-[15px] font-semibold leading-6 text-neutral-950 outline-none focus:border-[#2E5A44]"
              placeholder="Mô tả tình trạng vườn, kinh nghiệm đã thử, hình ảnh/ghi chú nếu có..."
              required
            />
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <b className="text-sm text-neutral-950">Ảnh / video minh họa</b>
                  <p className="mt-1 text-[13px] font-medium text-neutral-600">Đính kèm tối đa 4 tệp ảnh hoặc video.</p>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#2E5A44] ring-1 ring-neutral-200">
                  <ImageIcon size={16} />
                  Chọn ảnh/video
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      void handleAttachmentPick(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {attachments.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                      {attachment.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={attachment.url} alt={attachment.name} className="aspect-video w-full object-cover" />
                      ) : (
                        <video src={attachment.url} className="aspect-video w-full object-cover" controls />
                      )}
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="flex min-w-0 items-center gap-1 text-xs font-bold text-neutral-700">
                          {attachment.type === "video" ? <Video size={14} /> : <ImageIcon size={14} />}
                          <span className="truncate">{attachment.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700"
                          aria-label="Xóa tệp đính kèm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpenComposer(false)} className="min-h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700">
                Hủy
              </button>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white">
                <Send size={16} />
                Đăng lên cộng đồng
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-[15px] font-semibold text-neutral-950 outline-none focus:border-[#2E5A44]"
              placeholder="Tìm bài viết, tác giả, chủ đề..."
            />
          </label>
          <div className="flex gap-2 overflow-x-auto scrollbar-thin">
            {(Object.keys(topicLabels) as TopicKey[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-extrabold ${
                  topic === item ? "bg-[#2E5A44] text-white" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {topicLabels[item]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {filteredPosts.length ? (
          filteredPosts.map((post) => {
            const liked = post.likedBy.includes(currentUserKey);
            return (
              <article key={post.id} className="panel p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${post.kind === "QUESTION" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                        {post.kind === "QUESTION" ? "Hỏi đáp" : "Chia sẻ"}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-extrabold text-neutral-700">{topicLabels[post.topic]}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-extrabold leading-7 text-neutral-950">{post.title}</h2>
                    <p className="mt-2 text-[15px] font-medium leading-7 text-neutral-700">{post.content}</p>
                  </div>
                  {post.authorRole === "Kỹ sư" ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eef6ef] px-3 py-1 text-xs font-extrabold text-[#2E5A44]">
                      <BadgeCheck size={14} />
                      Kỹ sư
                    </span>
                  ) : null}
                </div>

                {post.attachments?.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {post.attachments.map((attachment) => (
                      <div key={attachment.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                        {attachment.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={attachment.url} alt={attachment.name} className="aspect-video w-full object-cover" />
                        ) : (
                          <video src={attachment.url} className="aspect-video w-full object-cover" controls />
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4 text-[13px] font-bold text-neutral-600">
                  <span className="inline-flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
                      <Leaf size={16} />
                    </span>
                    {post.authorName} · {post.authorRole} · {formatTime(post.createdAt)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLike(post.id)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-extrabold ${
                      liked ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    <Heart size={16} className={liked ? "fill-current" : ""} />
                    Hữu ích · {post.likes}
                  </button>
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-neutral-100 px-3 text-[13px] font-extrabold text-neutral-700">
                    <MessageCircle size={16} />
                    Bình luận · {post.comments.length}
                  </span>
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-neutral-100 px-3 text-[13px] font-extrabold text-neutral-700">
                    <Share2 size={16} />
                    Chia sẻ kinh nghiệm
                  </span>
                </div>

                {post.comments.length ? (
                  <div className="mt-4 grid gap-2">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl bg-neutral-50 p-3">
                        <b className="text-[13px] text-neutral-950">{comment.authorName}</b>
                        <span className="ml-2 text-xs font-semibold text-neutral-500">{comment.authorRole} · {formatTime(comment.createdAt)}</span>
                        <p className="mt-1 text-sm font-medium leading-6 text-neutral-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={commentDrafts[post.id] ?? ""}
                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                    className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none focus:border-[#2E5A44]"
                    placeholder="Viết góp ý hoặc kinh nghiệm của bạn..."
                  />
                  <button
                    type="button"
                    onClick={() => addComment(post.id)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white"
                  >
                    <Send size={16} />
                    Gửi
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
            <Sprout className="mx-auto text-neutral-300" size={30} />
            <b className="mt-3 block text-base text-neutral-950">Chưa có bài viết phù hợp</b>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">Thử đổi bộ lọc hoặc tạo bài viết đầu tiên cho chủ đề này.</p>
          </div>
        )}
      </section>
    </div>
  );
}
