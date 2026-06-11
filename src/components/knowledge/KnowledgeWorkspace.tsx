"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  BookOpenText,
  Check,
  ChevronRight,
  Eye,
  FilePenLine,
  ImagePlus,
  Leaf,
  LayoutList,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  knowledgeArticles,
  knowledgeCategories,
} from "@/constants/durianMockData";
import type {
  KnowledgeAction,
  KnowledgeArticle,
  KnowledgeEditorState,
  KnowledgeState,
  KnowledgeStatus,
} from "./types";

const articles = knowledgeArticles as KnowledgeArticle[];

const EMPTY_EDITOR: KnowledgeEditorState = {
  id: null,
  title: "",
  category: "Dinh dưỡng",
  author: "Ban kỹ thuật DurianCare",
  excerpt: "",
  content: "",
  status: "DRAFT",
  featured: false,
  coverPreview: null,
  coverFileName: null,
};

const initialState: KnowledgeState = {
  articles,
  selectedCategory: "Tất cả",
  query: "",
  editor: EMPTY_EDITOR,
  saveNotice: null,
};

function createSlug(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatToday() {
  return "10/06/2026";
}

function knowledgeReducer(
  state: KnowledgeState,
  action: KnowledgeAction,
): KnowledgeState {
  switch (action.type) {
    case "FILTER_CATEGORY":
      return { ...state, selectedCategory: action.value };
    case "SEARCH":
      return { ...state, query: action.value };
    case "NEW_ARTICLE":
      return {
        ...state,
        editor: EMPTY_EDITOR,
        saveNotice: null,
      };
    case "EDIT_ARTICLE":
      return {
        ...state,
        editor: {
          id: action.article.id,
          title: action.article.title,
          category: action.article.category,
          author: action.article.author,
          excerpt: action.article.excerpt,
          content: action.article.content,
          status: action.article.status,
          featured: action.article.featured,
          coverPreview: action.article.coverPreview ?? null,
          coverFileName: null,
        },
        saveNotice: null,
      };
    case "UPDATE_EDITOR":
      return {
        ...state,
        editor: {
          ...state.editor,
          [action.field]: action.value,
        },
      };
    case "SET_COVER":
      return {
        ...state,
        editor: {
          ...state.editor,
          coverPreview: action.preview,
          coverFileName: action.fileName,
        },
      };
    case "REMOVE_COVER":
      return {
        ...state,
        editor: {
          ...state.editor,
          coverPreview: null,
          coverFileName: null,
        },
      };
    case "SAVE_ARTICLE": {
      const id = state.editor.id ?? `KB-${Date.now()}`;
      const savedArticle: KnowledgeArticle = {
        id,
        title: state.editor.title.trim(),
        slug: createSlug(state.editor.title),
        category: state.editor.category,
        author: state.editor.author.trim(),
        publishedAt: formatToday(),
        updatedAt: formatToday(),
        views:
          state.articles.find((article) => article.id === state.editor.id)
            ?.views ?? 0,
        status: action.status,
        featured: state.editor.featured,
        coverTone: "green",
        excerpt: state.editor.excerpt.trim(),
        content: state.editor.content.trim(),
        coverPreview: state.editor.coverPreview,
      };
      const exists = state.articles.some((article) => article.id === id);
      return {
        ...state,
        articles: exists
          ? state.articles.map((article) =>
              article.id === id ? savedArticle : article,
            )
          : [savedArticle, ...state.articles],
        editor: {
          ...state.editor,
          id,
          status: action.status,
        },
        saveNotice:
          action.status === "PUBLISHED"
            ? "Bài viết đã được xuất bản trên thư viện DurianCare."
            : action.status === "REVIEW"
              ? "Bài viết đã được chuyển sang hàng chờ Admin duyệt."
              : "Bản nháp đã được lưu vào kho kiến thức.",
      };
    }
    case "DELETE_ARTICLE":
      return {
        ...state,
        articles: state.articles.filter(
          (article) => article.id !== action.id,
        ),
        editor:
          state.editor.id === action.id ? EMPTY_EDITOR : state.editor,
        saveNotice: "Bài viết đã được xóa khỏi kho kiến thức.",
      };
    case "CLEAR_NOTICE":
      return { ...state, saveNotice: null };
    default:
      return state;
  }
}

const STATUS_META: Record<
  KnowledgeStatus,
  { label: string; className: string }
> = {
  PUBLISHED: {
    label: "Đã xuất bản",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  REVIEW: {
    label: "Chờ duyệt",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  DRAFT: {
    label: "Bản nháp",
    className: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  },
};

const COVER_TONES: Record<string, string> = {
  gold: "from-[#f5e7a2] via-[#e6c65a] to-[#9d7422]",
  rust: "from-[#e4b39d] via-[#b76545] to-[#653a2d]",
  green: "from-[#b9d3b2] via-[#598451] to-[#264a35]",
  olive: "from-[#d5d4a4] via-[#8b9551] to-[#435333]",
  slate: "from-[#cbd5d1] via-[#778780] to-[#34443d]",
};

const inputClass =
  "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[11px] text-neutral-900 outline-none transition-all duration-200 ease-in-out placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400";

function StatusBadge({ status }: { status: KnowledgeStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function CategoryRail({
  selected,
  counts,
  onSelect,
}: {
  selected: string;
  counts: Record<string, number>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {knowledgeCategories.map((category: string) => (
        <button
          type="button"
          key={category}
          onClick={() => onSelect(category)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-bold transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-50 ${
            selected === category
              ? "border-[#2E5A44] bg-[#2E5A44] text-white"
              : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          {category}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[7px] ${
              selected === category
                ? "bg-white/15 text-white"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {counts[category] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}

function ArticleTable({
  items,
  activeId,
  onEdit,
  onDelete,
}: {
  items: KnowledgeArticle[];
  activeId: string | null;
  onEdit: (article: KnowledgeArticle) => void;
  onDelete?: (article: KnowledgeArticle) => void;
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-y border-neutral-100 bg-neutral-50 text-[7px] uppercase tracking-[0.12em] text-neutral-400">
            <th className="px-4 py-3">Bài viết</th>
            <th className="px-3 py-3">Tác giả</th>
            <th className="px-3 py-3">Ngày đăng</th>
            <th className="px-3 py-3 text-right">Lượt xem</th>
            <th className="px-3 py-3">Trạng thái</th>
            <th className="w-24 px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((article) => (
            <tr
              key={article.id}
              className={`border-b border-neutral-100 transition-colors duration-200 ${
                activeId === article.id
                  ? "bg-[#f1f6f2]"
                  : "bg-white hover:bg-neutral-50"
              }`}
            >
              <td className="px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => onEdit(article)}
                  className="group flex max-w-[340px] items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
                >
                  <span
                    className={`relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${COVER_TONES[article.coverTone] ?? COVER_TONES.green}`}
                  >
                    {article.coverPreview ? (
                      <i
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${article.coverPreview})`,
                        }}
                      />
                    ) : (
                      <Leaf size={16} className="text-white/85" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <b className="truncate text-[10px] tracking-tight text-neutral-900 group-hover:text-[#2E5A44]">
                        {article.title}
                      </b>
                      {article.featured && (
                        <Star
                          size={10}
                          className="shrink-0 fill-[#d5ad2d] text-[#d5ad2d]"
                        />
                      )}
                    </span>
                    <small className="mt-1 block truncate text-[7px] text-neutral-400">
                      {article.category} • {article.id}
                    </small>
                  </span>
                </button>
              </td>
              <td className="px-3 py-3.5 text-[8px] font-medium text-neutral-600">
                {article.author}
              </td>
              <td className="px-3 py-3.5 text-[8px] text-neutral-500">
                {article.publishedAt}
              </td>
              <td className="px-3 py-3.5 text-right text-[9px] font-bold tabular-nums text-neutral-700">
                {article.views.toLocaleString("vi-VN")}
              </td>
              <td className="px-3 py-3.5">
                <StatusBadge status={article.status} />
              </td>
              <td className="px-3 py-3.5">
                <span className="flex justify-end gap-1">
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(article)}
                      aria-label={`Xóa ${article.title}`}
                      className="grid size-8 place-items-center rounded-lg text-neutral-400 transition-all duration-200 ease-in-out hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(article)}
                    aria-label={`Chỉnh sửa ${article.title}`}
                    className="grid size-8 place-items-center rounded-lg text-neutral-400 transition-all duration-200 ease-in-out hover:bg-white hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight size={15} />
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="grid min-h-64 place-items-center text-center">
          <span>
            <Search className="mx-auto text-neutral-300" size={28} />
            <b className="mt-3 block text-[11px] text-neutral-700">
              Không tìm thấy bài viết
            </b>
            <p className="mt-1 text-[8px] text-neutral-400">
              Thử đổi danh mục hoặc từ khóa tìm kiếm.
            </p>
          </span>
        </div>
      )}
    </div>
  );
}

function EditorFieldLabel({
  children,
  optional = false,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="mb-2 flex items-center justify-between text-[9px] font-bold text-neutral-700">
      {children}
      {optional && (
        <small className="font-medium text-neutral-400">Không bắt buộc</small>
      )}
    </span>
  );
}

function ArticleEditor({
  editor,
  saveNotice,
  role,
  dispatch,
}: {
  editor: KnowledgeEditorState;
  saveNotice: string | null;
  role: "ADMIN" | "ENGINEER";
  dispatch: React.Dispatch<KnowledgeAction>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <Key extends keyof KnowledgeEditorState>(
    field: Key,
    value: KnowledgeEditorState[Key],
  ) => dispatch({ type: "UPDATE_EDITOR", field, value });

  const selectCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      dispatch({
        type: "SET_COVER",
        preview: reader.result,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const submit = (
    event: FormEvent<HTMLFormElement>,
    status: KnowledgeStatus,
  ) => {
    event.preventDefault();
    if (!editor.title.trim() || !editor.content.trim()) return;
    dispatch({ type: "SAVE_ARTICLE", status });
  };

  return (
    <section className="panel self-start overflow-hidden xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 bg-[#294f3b] px-5 py-4 text-white">
        <span>
          <small className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#EED56D]">
            Editorial desk
          </small>
          <h2 className="mt-1 text-base font-bold tracking-tight">
            {editor.id ? "Chỉnh sửa bài viết" : "Soạn bài kỹ thuật mới"}
          </h2>
          <p className="mt-1 text-[8px] leading-relaxed text-white/60">
            {editor.id ?? "Chưa cấp mã bài viết"}
          </p>
        </span>
        <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-[#EED56D]">
          <FilePenLine size={17} />
        </span>
      </div>

      <form
        onSubmit={(event) =>
          submit(event, role === "ADMIN" ? "PUBLISHED" : "REVIEW")
        }
        className="space-y-4 p-5"
      >
        {saveNotice && (
          <div className="flex items-start justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[8px] font-bold leading-relaxed text-emerald-700">
            <span className="flex gap-2">
              <Check size={13} className="mt-0.5 shrink-0" />
              {saveNotice}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: "CLEAR_NOTICE" })}
              className="rounded text-emerald-600 transition-colors hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label="Đóng thông báo"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <label className="block">
          <EditorFieldLabel>Tiêu đề bài viết</EditorFieldLabel>
          <input
            required
            value={editor.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Kỹ thuật xử lý ra hoa sầu riêng..."
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-[1fr_.82fr] gap-3">
          <label className="block">
            <EditorFieldLabel>Danh mục</EditorFieldLabel>
            <select
              value={editor.category}
              onChange={(event) => update("category", event.target.value)}
              className={inputClass}
            >
              {knowledgeCategories
                .filter((category: string) => category !== "Tất cả")
                .map((category: string) => (
                  <option key={category}>{category}</option>
                ))}
            </select>
          </label>
          <label className="block">
            <EditorFieldLabel>Tác giả</EditorFieldLabel>
            <input
              required
              value={editor.author}
              onChange={(event) => update("author", event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <EditorFieldLabel optional>Ảnh đại diện</EditorFieldLabel>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={selectCover}
            className="hidden"
          />
          {editor.coverPreview ? (
            <div
              className="relative h-36 overflow-hidden rounded-2xl border border-neutral-200 bg-cover bg-center"
              style={{ backgroundImage: `url(${editor.coverPreview})` }}
            >
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-white">
                <small className="max-w-[220px] truncate text-[8px]">
                  {editor.coverFileName ?? "Ảnh đại diện hiện tại"}
                </small>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "REMOVE_COVER" })}
                  className="grid size-7 place-items-center rounded-lg bg-white/15 transition-all duration-200 ease-in-out hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Xóa ảnh đại diện"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-32 w-full place-items-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-center transition-all duration-200 ease-in-out hover:border-[#799583] hover:bg-[#f4f8f5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
            >
              <span>
                <ImagePlus
                  size={22}
                  className="mx-auto text-[#5b7866]"
                />
                <b className="mt-2 block text-[9px] text-neutral-700">
                  Tải ảnh bìa kỹ thuật
                </b>
                <small className="mt-1 block text-[7px] text-neutral-400">
                  PNG, JPG hoặc WEBP • Preview cục bộ
                </small>
              </span>
            </button>
          )}
          {editor.coverPreview && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[8px] font-bold text-[#2E5A44] transition-colors hover:bg-[#edf3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
            >
              <UploadCloud size={12} />
              Thay ảnh
            </button>
          )}
        </div>

        <label className="block">
          <EditorFieldLabel>Mô tả ngắn</EditorFieldLabel>
          <textarea
            required
            rows={2}
            value={editor.excerpt}
            onChange={(event) => update("excerpt", event.target.value)}
            placeholder="Tóm tắt giá trị kỹ thuật của bài viết..."
            className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-[10px] leading-relaxed text-neutral-900 outline-none transition-all duration-200 ease-in-out placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>

        <label className="block">
          <EditorFieldLabel>Nội dung chuyên môn</EditorFieldLabel>
          <textarea
            required
            rows={9}
            value={editor.content}
            onChange={(event) => update("content", event.target.value)}
            placeholder="Trình bày quy trình, ngưỡng kỹ thuật và lưu ý an toàn..."
            className="w-full resize-y rounded-xl border border-neutral-200 p-3 text-[10px] leading-relaxed text-neutral-900 outline-none transition-all duration-200 ease-in-out placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <span>
            <b className="block text-[9px] text-neutral-800">
              Ghim vào nội dung nổi bật
            </b>
            <small className="mt-1 block text-[7px] text-neutral-400">
              Ưu tiên trên trang kiến thức nông nghiệp
            </small>
          </span>
          <input
            type="checkbox"
            checked={editor.featured}
            onChange={(event) => update("featured", event.target.checked)}
            className="size-4 accent-[#2E5A44]"
          />
        </label>

        <div className="grid grid-cols-[.8fr_1.2fr] gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            disabled={!editor.title.trim() || !editor.content.trim()}
            onClick={(event) => {
              event.preventDefault();
              dispatch({ type: "SAVE_ARTICLE", status: "DRAFT" });
            }}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-[9px] font-bold text-neutral-700 transition-all duration-200 ease-in-out hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
          >
            <FilePenLine size={13} />
            Lưu nháp
          </button>
          <button
            type="submit"
            disabled={!editor.title.trim() || !editor.content.trim()}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#2E5A44] text-[9px] font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {role === "ADMIN" ? <Send size={13} /> : <Check size={13} />}
            {role === "ADMIN" ? "Duyệt & xuất bản" : "Gửi Admin duyệt"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function KnowledgeWorkspace({
  role,
}: {
  role: "ADMIN" | "ENGINEER";
}) {
  const [state, dispatch] = useReducer(knowledgeReducer, initialState);

  const filteredArticles = useMemo(() => {
    const query = state.query.trim().toLocaleLowerCase("vi");
    return state.articles.filter((article) => {
      const matchesCategory =
        state.selectedCategory === "Tất cả" ||
        article.category === state.selectedCategory;
      const matchesQuery =
        !query ||
        article.title.toLocaleLowerCase("vi").includes(query) ||
        article.author.toLocaleLowerCase("vi").includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [state.articles, state.query, state.selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Tất cả": state.articles.length,
    };
    state.articles.forEach((article) => {
      counts[article.category] = (counts[article.category] ?? 0) + 1;
    });
    return counts;
  }, [state.articles]);

  const publishedCount = state.articles.filter(
    (article) => article.status === "PUBLISHED",
  ).length;
  const totalViews = state.articles.reduce(
    (sum, article) => sum + article.views,
    0,
  );

  return (
    <div className="space-y-4">
      <section className="grid-pattern overflow-hidden rounded-[24px] bg-[#294f3b] p-6 text-white sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              <BookOpenText size={13} />
              DurianCare knowledge desk
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Quản lý kiến thức nông nghiệp
            </h1>
            <p className="mt-2 text-[10px] leading-relaxed text-[#d0ddd4] sm:text-[11px]">
              Biên tập hướng dẫn kỹ thuật sầu riêng, kiểm soát danh mục và theo
              dõi mức độ tiếp cận của cộng đồng nhà vườn.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Bài viết", state.articles.length, LayoutList],
              ["Đã xuất bản", publishedCount, Sparkles],
              ["Lượt đọc", totalViews.toLocaleString("vi-VN"), Eye],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof LayoutList;
              return (
                <div
                  key={String(label)}
                  className="min-w-24 rounded-xl border border-white/10 bg-white/[.08] px-3 py-3"
                >
                  <MetricIcon size={14} className="text-[#EED56D]" />
                  <b className="mt-3 block text-[12px] tracking-tight">
                    {String(value)}
                  </b>
                  <small className="mt-1 block text-[7px] text-white/55">
                    {String(label)}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.75fr)]">
        <section className="panel min-w-0 overflow-hidden">
          <div className="space-y-4 border-b border-neutral-100 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <span>
                <small className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#6a806f]">
                  Content inventory
                </small>
                <h2 className="mt-1 text-base font-bold tracking-tight text-neutral-900">
                  Thư viện bài viết
                </h2>
              </span>
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1 lg:w-64">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    value={state.query}
                    onChange={(event) =>
                      dispatch({ type: "SEARCH", value: event.target.value })
                    }
                    placeholder="Tìm tiêu đề hoặc tác giả"
                    className={`${inputClass} pl-9`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "NEW_ARTICLE" })}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#EED56D] px-3 text-[9px] font-bold text-[#294f3b] transition-all duration-200 ease-in-out hover:bg-[#e5c95b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#EED56D55]"
                >
                  <Plus size={14} />
                  Bài mới
                </button>
              </div>
            </div>
            <CategoryRail
              selected={state.selectedCategory}
              counts={categoryCounts}
              onSelect={(value) =>
                dispatch({ type: "FILTER_CATEGORY", value })
              }
            />
          </div>
          <ArticleTable
            items={filteredArticles}
            activeId={state.editor.id}
            onEdit={(article) =>
              dispatch({ type: "EDIT_ARTICLE", article })
            }
            onDelete={
              role === "ADMIN"
                ? (article) => {
                    if (
                      window.confirm(
                        `Xóa bài viết "${article.title}" khỏi kho kiến thức?`,
                      )
                    ) {
                      dispatch({ type: "DELETE_ARTICLE", id: article.id });
                    }
                  }
                : undefined
            }
          />
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 text-[8px] text-neutral-400">
            <span>{filteredArticles.length} bài viết phù hợp</span>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-neutral-400 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MoreHorizontal size={13} />
              Trang 1/1
            </button>
          </div>
        </section>

        <ArticleEditor
          editor={state.editor}
          saveNotice={state.saveNotice}
          role={role}
          dispatch={dispatch}
        />
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="panel flex items-start gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
            <Pencil size={16} />
          </span>
          <span>
            <b className="block text-[10px] text-neutral-900">
              Quy trình biên tập
            </b>
            <p className="mt-1 text-[8px] leading-relaxed text-neutral-500">
              Bản nháp và bài chờ duyệt được giữ trong workspace. Khi nối API,
              reducer hiện tại có thể ánh xạ trực tiếp sang mutation và cache
              invalidation.
            </p>
          </span>
        </article>
        <article className="panel flex items-start gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-amber-700">
            <UploadCloud size={16} />
          </span>
          <span>
            <b className="block text-[10px] text-neutral-900">
              Ảnh hiện chỉ preview cục bộ
            </b>
            <p className="mt-1 text-[8px] leading-relaxed text-neutral-500">
              Không có request upload ra ngoài. FileReader tạo bản xem trước và
              sẵn sàng thay bằng file-service khi backend được tích hợp.
            </p>
          </span>
        </article>
      </section>
    </div>
  );
}
