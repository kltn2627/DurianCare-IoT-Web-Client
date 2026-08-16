"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenText,
  Check,
  Eye,
  FilePenLine,
  ImagePlus,
  Loader2,
  PenLine,
  RefreshCw,
  Send,
  UploadCloud,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { knowledgeClient } from "@/lib/knowledge/client";
import type {
  KnowledgeArticle,
  KnowledgeCategoryOption,
  KnowledgeStatus,
} from "@/lib/knowledge/types";

type AuthoringRole = "ADMIN" | "ENGINEER";
type WriterRole = "ADMIN" | "ENGINEER";
type Mode = "create" | "edit";

type FormState = {
  id: string | null;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  content: string;
  status: KnowledgeStatus;
  rejectionReason: string | null;
  coverImage: string | null;
  coverPreview: string | null;
  coverFile: File | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  excerpt: "",
  category: "",
  author: "",
  content: "",
  status: "DRAFT",
  rejectionReason: null,
  coverImage: null,
  coverPreview: null,
  coverFile: null,
};

const statusLabels: Record<KnowledgeStatus, string> = {
  DRAFT: "Bản nháp",
  REVIEW: "Chờ duyệt",
  PUBLISHED: "Đã duyệt",
  REJECTED: "Từ chối",
};

const statusTone: Record<KnowledgeStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  REVIEW: "bg-amber-50 text-amber-700 ring-amber-100",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  REJECTED: "bg-red-50 text-red-700 ring-red-100",
};

const tabs: Array<{ label: string; value: KnowledgeStatus | "ALL" }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Chờ duyệt", value: "REVIEW" },
  { label: "Đã duyệt", value: "PUBLISHED" },
  { label: "Từ chối", value: "REJECTED" },
];

function canWrite(role?: string | null): role is WriterRole {
  return role === "ADMIN" || role === "ENGINEER";
}

function basePath(role: AuthoringRole) {
  return role === "ADMIN" ? "/dashboard/admin/knowledge" : "/dashboard/engineer/knowledge";
}

function createPath(role: AuthoringRole) {
  return `${basePath(role)}/create`;
}

function myPath(role: AuthoringRole) {
  return `${basePath(role)}/my-articles`;
}

function editPath(role: AuthoringRole, id: string) {
  return `${basePath(role)}/${encodeURIComponent(id)}/edit`;
}

function statusBadge(status: KnowledgeStatus) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${statusTone[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function roleLabel(role?: string | null) {
  if (role === "ADMIN") return "Quản trị viên";
  if (role === "EXPERT") return "Chuyên gia";
  if (role === "ENGINEER") return "Kỹ sư";
  return "Tác giả";
}

function initialAuthorName(userName?: string | null, email?: string | null) {
  return userName?.trim() || email?.trim() || "Tác giả DurianCare";
}

function toForm(article: KnowledgeArticle): FormState {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    author: article.author,
    content: article.content,
    status: article.status,
    rejectionReason: article.rejectionReason ?? null,
    coverImage: article.coverImage,
    coverPreview: article.coverImage,
    coverFile: null,
  };
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-2 text-xs font-bold text-red-600">{children}</p>;
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle size={17} className="mt-0.5 shrink-0" />
        <span className="min-w-0">
          {message}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-red-700 ring-1 ring-red-100"
            >
              <RefreshCw size={13} />
              Thử lại
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="rounded-[24px] border border-[#dce7de] bg-white p-5 shadow-sm">
        <div className="h-9 w-2/3 animate-pulse rounded bg-neutral-100" />
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="mt-4 h-72 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
      <div className="h-96 animate-pulse rounded-[24px] bg-neutral-100" />
    </div>
  );
}

function loadEditableArticle(role: AuthoringRole, id: string) {
  const request = role === "ADMIN"
    ? knowledgeClient.listAdmin({ size: 100, sort: "updatedAt,desc" })
    : knowledgeClient.listMine({ size: 100, sort: "updatedAt,desc" });
  return request.then((page) =>
    page.articles.find((article) => article.id === id || article.slug === id) ?? null,
  );
}

export function KnowledgeArticleEditor({
  role,
  mode,
  articleId,
}: {
  role: AuthoringRole;
  mode: Mode;
  articleId?: string;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<KnowledgeCategoryOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const writer = canWrite(user?.role);
  const categoryNames = categories.map((item) => item.value);
  const canEditCurrent =
    mode === "create" ||
    role === "ADMIN" ||
    form.status === "DRAFT" ||
    form.status === "REJECTED";
  const titleError = form.title.trim() ? "" : "Vui lòng nhập tiêu đề bài viết.";
  const excerptError = form.excerpt.trim() ? "" : "Vui lòng nhập tóm tắt.";
  const categoryError = form.category.trim() ? "" : "Vui lòng chọn danh mục.";
  const contentError = form.content.trim() ? "" : "Vui lòng nhập nội dung bài viết.";
  const valid = !titleError && !excerptError && !categoryError && !contentError;

  const update = <Key extends keyof FormState>(field: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const loadInitial = useCallback(async () => {
    setError(null);
    setLoading(mode === "edit");
    try {
      const categoryResult = await knowledgeClient.categoryOptions();
      setCategories(categoryResult);
      const firstCategory = categoryResult[0]?.value ?? "";
      if (mode === "create") {
        setForm((current) => ({
          ...current,
          category: current.category || firstCategory,
          author: current.author || initialAuthorName(user?.profile.fullName, user?.email),
        }));
        return;
      }
      if (!articleId) throw new Error("Thiếu mã bài viết cần chỉnh sửa.");
      const article = await loadEditableArticle(role, articleId);
      if (!article) throw new Error("Không tìm thấy bài viết trong danh sách của bạn.");
      setForm(toForm(article));
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Không thể tải dữ liệu bài viết.",
      );
    } finally {
      setLoading(false);
    }
  }, [articleId, mode, role, user?.email, user?.profile.fullName]);

  useEffect(() => {
    if (!authLoading && !writer) {
      router.replace("/dashboard/client/knowledge");
      return;
    }
    if (!authLoading) void loadInitial();
  }, [authLoading, loadInitial, router, writer]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  const chooseCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      update("coverPreview", reader.result);
      update("coverFile", file);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const save = async (status: KnowledgeStatus) => {
    if (!valid || saving || !canEditCurrent) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const requestedStatus =
        role === "ADMIN" && status === "PUBLISHED" ? "PUBLISHED" : status;
      const result = await knowledgeClient.save({
        id: form.id,
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        category: form.category.trim(),
        author: form.author.trim(),
        content: form.content.trim(),
        status: requestedStatus,
        featured: false,
        tags: [form.category.trim()],
        coverFile: form.coverFile,
        coverPreview: form.coverPreview,
      });
      setForm(toForm(result.article));
      setDirty(false);
      if (result.article.status === "REVIEW") {
        router.push(myPath(role));
        return;
      }
      setNotice(
        result.article.status === "PUBLISHED"
          ? "Bài viết đã được đăng."
          : "Bản nháp đã được lưu.",
      );
      if (mode === "create") router.replace(editPath(role, result.article.id));
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Không thể lưu bài viết.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save(role === "ADMIN" ? "PUBLISHED" : "REVIEW");
  };

  if (authLoading || loading) return <FormSkeleton />;
  if (!writer) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(basePath(role))}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce7de] bg-white px-3 text-sm font-extrabold text-[#2E5A44]"
        >
          <ArrowLeft size={15} />
          Quay lại thư viện
        </button>
        <Link
          href={myPath(role)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#edf3ee] px-3 text-sm font-extrabold text-[#2E5A44]"
        >
          <BookOpenText size={15} />
          Bài viết của tôi
        </Link>
      </div>

      <header className="rounded-[24px] border border-[#dce7de] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#75867a]">
          Knowledge authoring
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-950">
          {mode === "edit" ? "Chỉnh sửa bài kiến thức" : "Viết bài kiến thức"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
          Chia sẻ kinh nghiệm và kiến thức chuyên môn với cộng đồng DurianCare.
        </p>
      </header>

      {error && <ErrorPanel message={error} onRetry={mode === "edit" ? () => void loadInitial() : undefined} />}
      {notice && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
          {notice}
        </div>
      )}
      {form.status === "REJECTED" && form.rejectionReason && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <b className="block">Lý do từ chối</b>
          <p className="mt-2 leading-relaxed">{form.rejectionReason}</p>
        </div>
      )}
      {!canEditCurrent && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
          Bài viết đang ở trạng thái {statusLabels[form.status]}; frontend không mở chỉnh sửa khi backend không cho phép.
        </div>
      )}

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
        <main className="rounded-[24px] border border-[#dce7de] bg-white p-4 shadow-sm sm:p-6">
          <label className="block">
            <span className="text-sm font-extrabold text-neutral-900">Tiêu đề bài viết</span>
            <input
              value={form.title}
              disabled={!canEditCurrent}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Ví dụ: Cách nhận biết sớm bệnh Phytophthora trên cây sầu riêng"
              className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-base font-bold outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414] disabled:bg-neutral-100"
            />
            <FieldError>{titleError}</FieldError>
          </label>

          <label className="mt-5 block">
            <span className="flex items-center justify-between text-sm font-extrabold text-neutral-900">
              Tóm tắt
              <small className="text-xs font-bold text-neutral-400">
                {form.excerpt.length}/600
              </small>
            </span>
            <textarea
              value={form.excerpt}
              disabled={!canEditCurrent}
              maxLength={600}
              rows={4}
              onChange={(event) => update("excerpt", event.target.value)}
              placeholder="Viết mô tả ngắn giúp người đọc hiểu nội dung chính của bài viết..."
              className="mt-2 w-full resize-y rounded-2xl border border-neutral-200 p-4 text-sm leading-7 outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414] disabled:bg-neutral-100"
            />
            <FieldError>{excerptError}</FieldError>
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-extrabold text-neutral-900">Nội dung</span>
            <textarea
              value={form.content}
              disabled={!canEditCurrent}
              rows={18}
              onChange={(event) => update("content", event.target.value)}
              placeholder="Viết nội dung bài theo dạng plain text hoặc HTML/Rich Text đã được backend hỗ trợ..."
              className="mt-2 w-full resize-y rounded-2xl border border-neutral-200 p-4 text-[15px] leading-7 outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414] disabled:bg-neutral-100"
            />
            <FieldError>{contentError}</FieldError>
          </label>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-[24px] border border-[#dce7de] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-neutral-950">Ảnh đại diện</h2>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseCover} className="hidden" />
            {form.coverPreview ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-[#eef4ef]">
                <div className="aspect-[16/10] bg-cover bg-center" style={{ backgroundImage: `url(${form.coverPreview})` }} />
              </div>
            ) : (
              <button
                type="button"
                disabled={!canEditCurrent}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 grid h-36 w-full place-items-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-center text-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  <ImagePlus className="mx-auto" size={24} />
                  <b className="mt-2 block text-xs">Upload JPG, PNG, WEBP</b>
                </span>
              </button>
            )}
            {canEditCurrent && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#2E5A44] text-sm font-extrabold text-[#2E5A44]"
              >
                <UploadCloud size={15} />
                {form.coverPreview ? "Thay ảnh" : "Chọn ảnh"}
              </button>
            )}
          </section>

          <section className="rounded-[24px] border border-[#dce7de] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-neutral-950">Thiết lập</h2>
            <label className="mt-4 block">
              <span className="text-xs font-extrabold text-neutral-700">Danh mục</span>
              <select
                value={form.category}
                disabled={!canEditCurrent || categoryNames.length === 0}
                onChange={(event) => update("category", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-neutral-100"
              >
                <option value="">Chọn danh mục</option>
                {categoryNames.map((category) => (
                  <option key={category} value={category}>
                  {categories.find((item) => item.value === category)?.label ?? category}
                  </option>
                ))}
              </select>
              <FieldError>{categoryError}</FieldError>
              {categoryNames.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Backend chưa trả danh mục từ `/knowledge/categories`; cần có bài published/category trước khi chọn.
                </p>
              )}
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-extrabold text-neutral-700">Thông tin tác giả</span>
              <input
                value={form.author}
                disabled={!canEditCurrent}
                onChange={(event) => update("author", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-bold outline-none disabled:bg-neutral-100"
              />
              <small className="mt-2 block text-xs font-semibold text-neutral-400">
                {roleLabel(user?.role)}
              </small>
            </label>

            <div className="mt-4 rounded-2xl bg-[#f7faf7] p-3">
              <span className="text-xs font-extrabold text-neutral-500">Trạng thái hiện tại</span>
              <div className="mt-2">{statusBadge(form.status)}</div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#dce7de] bg-white p-4 shadow-sm">
            <div className="grid gap-2">
              <Link
                href={basePath(role)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 text-sm font-extrabold text-neutral-700"
              >
                Hủy
              </Link>
              {canEditCurrent && (
                <button
                  type="button"
                  disabled={!valid || saving}
                  onClick={() => void save("DRAFT")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#2E5A44] text-sm font-extrabold text-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <FilePenLine size={15} />}
                  Lưu bản nháp
                </button>
              )}
              {canEditCurrent && (
                <button
                  type="submit"
                  disabled={!valid || saving || categoryNames.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : role === "ADMIN" ? <Send size={15} /> : <Check size={15} />}
                  {role === "ADMIN" ? "Đăng bài" : form.status === "REJECTED" ? "Gửi duyệt lại" : "Gửi duyệt"}
                </button>
              )}
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="grid gap-3 border-b border-neutral-100 px-4 py-4 md:grid-cols-[minmax(0,1.5fr)_140px_130px_130px_160px]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded bg-neutral-100" />
      ))}
    </div>
  );
}

export function KnowledgeMyArticles({ role }: { role: AuthoringRole }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<KnowledgeStatus | "ALL">("ALL");
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const writer = canWrite(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await knowledgeClient.listMine({
        status: status === "ALL" ? undefined : status,
        size: 50,
        sort: "updatedAt,desc",
      });
      setArticles(result.articles);
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Không thể tải danh sách bài viết.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (!authLoading && !writer) {
      router.replace("/dashboard/client/knowledge");
      return;
    }
    if (!authLoading) void load();
  }, [authLoading, load, router, writer]);

  const submitArticle = async (article: KnowledgeArticle) => {
    setSubmittingId(article.id);
    setError(null);
    try {
      await knowledgeClient.save({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        author: article.author,
        content: article.content,
        status: "REVIEW",
        featured: false,
        tags: article.tags,
      });
      await load();
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Không thể gửi bài viết duyệt.",
      );
    } finally {
      setSubmittingId(null);
    }
  };

  if (authLoading || !writer) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={basePath(role)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce7de] bg-white px-3 text-sm font-extrabold text-[#2E5A44]"
        >
          <ArrowLeft size={15} />
          Quay lại thư viện
        </Link>
        <Link
          href={createPath(role)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white"
        >
          <PenLine size={15} />
          Viết bài mới
        </Link>
      </div>

      <header className="rounded-[24px] border border-[#dce7de] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#75867a]">
          My articles
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-950">
          Bài viết của tôi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
          Quản lý các bài kiến thức bạn đã tạo và theo dõi trạng thái xét duyệt.
        </p>
      </header>

      {error && <ErrorPanel message={error} onRetry={() => void load()} />}

      <section className="overflow-hidden rounded-[24px] border border-[#dce7de] bg-white shadow-sm">
        <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 p-3 scrollbar-thin">
          {tabs.map((tab) => {
            const active = tab.value === status;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`h-10 shrink-0 rounded-xl px-4 text-xs font-extrabold ${
                  active ? "bg-[#2E5A44] text-white" : "bg-[#f2f6f2] text-neutral-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="hidden md:block">
          <div className="grid grid-cols-[minmax(0,1.5fr)_140px_130px_130px_160px] bg-neutral-50 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-400">
            <span>Bài viết</span>
            <span>Danh mục</span>
            <span>Trạng thái</span>
            <span>Ngày cập nhật</span>
            <span className="text-right">Thao tác</span>
          </div>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <RowSkeleton key={index} />)
          ) : articles.length === 0 ? (
            <EmptyMyArticles filtered={status !== "ALL"} role={role} />
          ) : (
            articles.map((article) => (
              <div key={article.id} className="grid grid-cols-[minmax(0,1.5fr)_140px_130px_130px_160px] items-center gap-3 border-b border-neutral-100 px-4 py-4">
                <ArticleIdentity article={article} />
                <span className="text-sm font-bold text-neutral-600">{article.category}</span>
                <span>{statusBadge(article.status)}</span>
                <span className="text-sm font-semibold text-neutral-500">{article.updatedAt}</span>
                <ArticleActions role={role} article={article} submitting={submittingId === article.id} onSubmit={() => void submitArticle(article)} />
              </div>
            ))
          )}
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-neutral-100" />)
          ) : articles.length === 0 ? (
            <EmptyMyArticles filtered={status !== "ALL"} role={role} />
          ) : (
            articles.map((article) => (
              <article key={article.id} className="rounded-2xl border border-neutral-100 p-3">
                <ArticleIdentity article={article} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {statusBadge(article.status)}
                  <span className="text-xs font-semibold text-neutral-400">{article.updatedAt}</span>
                </div>
                {article.status === "REJECTED" && article.rejectionReason && (
                  <RejectionReason reason={article.rejectionReason} />
                )}
                <ArticleActions role={role} article={article} submitting={submittingId === article.id} onSubmit={() => void submitArticle(article)} mobile />
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ArticleIdentity({ article }: { article: KnowledgeArticle }) {
  return (
    <span className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-3">
      {article.coverImage ? (
        <span className="rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${article.coverImage})` }} />
      ) : (
        <span className="grid aspect-square place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
          <BookOpenText size={18} />
        </span>
      )}
      <span className="min-w-0">
        <b className="line-clamp-1 text-sm text-neutral-950">{article.title}</b>
        <small className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
          {article.excerpt}
        </small>
        {article.status === "REJECTED" && article.rejectionReason && (
          <RejectionReason reason={article.rejectionReason} compact />
        )}
      </span>
    </span>
  );
}

function RejectionReason({ reason, compact = false }: { reason: string; compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-2" : "mt-3"} rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700`}>
      <b>Lý do từ chối</b>
      <p className="mt-1 leading-relaxed">{reason}</p>
    </div>
  );
}

function ArticleActions({
  role,
  article,
  submitting,
  onSubmit,
  mobile = false,
}: {
  role: AuthoringRole;
  article: KnowledgeArticle;
  submitting: boolean;
  onSubmit: () => void;
  mobile?: boolean;
}) {
  const editable = role === "ADMIN" || article.status === "DRAFT" || article.status === "REJECTED";
  const className = mobile
    ? "mt-3 flex flex-wrap gap-2"
    : "flex justify-end gap-2";
  return (
    <span className={className}>
      {editable && (
        <Link
          href={editPath(role, article.id)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 px-3 text-xs font-extrabold text-neutral-700"
        >
          Sửa
        </Link>
      )}
      {(article.status === "DRAFT" || article.status === "REJECTED") && (
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-extrabold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {submitting && <Loader2 size={13} className="animate-spin" />}
          {article.status === "REJECTED" ? "Gửi lại" : "Gửi duyệt"}
        </button>
      )}
      {article.status === "PUBLISHED" && (
        <Link
          href={`/dashboard/client/knowledge/${article.slug}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#edf3ee] px-3 text-xs font-extrabold text-[#2E5A44]"
        >
          <Eye size={13} />
          Xem bài
        </Link>
      )}
      {article.status === "REVIEW" && (
        <span className="inline-flex h-9 items-center justify-center rounded-xl bg-amber-50 px-3 text-xs font-extrabold text-amber-700">
          Đang chờ duyệt
        </span>
      )}
    </span>
  );
}

function EmptyMyArticles({ filtered, role }: { filtered: boolean; role: AuthoringRole }) {
  return (
    <div className="grid min-h-72 place-items-center p-6 text-center">
      <span>
        <BookOpenText className="mx-auto text-neutral-300" size={32} />
        <b className="mt-4 block text-sm text-neutral-900">
          {filtered ? "Không có bài viết ở trạng thái này." : "Bạn chưa có bài viết kiến thức nào"}
        </b>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {filtered
            ? "Thử chọn tab trạng thái khác để xem bài viết."
            : "Hãy bắt đầu chia sẻ kinh nghiệm của bạn với cộng đồng DurianCare."}
        </p>
        {!filtered && (
          <Link
            href={createPath(role)}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white"
          >
            Viết bài đầu tiên
          </Link>
        )}
      </span>
    </div>
  );
}
