"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  ImageIcon,
  Share2,
  X,
} from "lucide-react";
import type { KnowledgeArticle } from "@/lib/knowledge/types";

type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

type LightboxImage = {
  src: string;
  alt: string;
};

type ParsedContent = {
  nodes: ReactNode[];
  toc: TocItem[];
  images: LightboxImage[];
};

const allowedLinks = /^(https?:|mailto:|tel:|#|\/)/i;
const allowedImages = /^(https?:|\/)/i;

function roleLabel(role?: string | null) {
  if (role === "ENGINEER") return "Kỹ sư";
  if (role === "EXPERT") return "Chuyên gia";
  if (role === "ADMIN") return "Quản trị viên";
  return "DurianCare";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const selected = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return selected.map((part) => part[0]?.toUpperCase()).join("") || "DC";
}

function formatCount(value: number) {
  return value.toLocaleString("vi-VN");
}

function headingId(text: string, index: number) {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || `section-${index + 1}`;
}

function looksLikeHtml(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function plainTextNodes(content: string): ReactNode[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => (
      <p key={`p-${index}`} className="whitespace-pre-line">
        {block}
      </p>
    ));
}

function parseHtmlContent(
  content: string,
  openLightbox: (index: number) => void,
): ParsedContent {
  if (typeof window === "undefined" || !looksLikeHtml(content)) {
    return { nodes: plainTextNodes(content), toc: [], images: [] };
  }

  const document = new DOMParser().parseFromString(content, "text/html");
  const toc: TocItem[] = [];
  const images: LightboxImage[] = [];

  const renderChildren = (node: Node, keyPrefix: string) =>
    Array.from(node.childNodes)
      .map((child, index) => renderNode(child, `${keyPrefix}-${index}`))
      .filter(Boolean);

  const renderNode = (node: Node, key: string): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    const children = renderChildren(element, key);

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = element.textContent?.trim() ?? "";
      const level = Number(tag.slice(1)) as 1 | 2 | 3;
      const id = headingId(text, toc.length);
      if (text) toc.push({ id, text, level });
      const className =
        tag === "h1"
          ? "scroll-mt-28 text-3xl font-extrabold tracking-tight text-neutral-950"
          : tag === "h2"
            ? "scroll-mt-28 text-2xl font-extrabold tracking-tight text-neutral-950"
            : "scroll-mt-28 text-xl font-extrabold tracking-tight text-neutral-900";
      const HeadingTag = tag as "h1" | "h2" | "h3";
      return (
        <HeadingTag key={key} id={id} className={className}>
          {children}
        </HeadingTag>
      );
    }

    if (tag === "p") return <p key={key}>{children}</p>;
    if (tag === "ul") return <ul key={key}>{children}</ul>;
    if (tag === "ol") return <ol key={key}>{children}</ol>;
    if (tag === "li") return <li key={key}>{children}</li>;
    if (tag === "blockquote") return <blockquote key={key}>{children}</blockquote>;
    if (tag === "strong" || tag === "b") return <strong key={key}>{children}</strong>;
    if (tag === "em" || tag === "i") return <em key={key}>{children}</em>;
    if (tag === "br") return <br key={key} />;
    if (tag === "table") {
      return (
        <div key={key} className="overflow-x-auto rounded-2xl border border-[#dce7de]">
          <table>{children}</table>
        </div>
      );
    }
    if (["thead", "tbody", "tr", "th", "td"].includes(tag)) {
      const TableTag = tag as "thead" | "tbody" | "tr" | "th" | "td";
      return <TableTag key={key}>{children}</TableTag>;
    }
    if (tag === "a") {
      const href = element.getAttribute("href") ?? "#";
      const safeHref = allowedLinks.test(href) ? href : "#";
      return (
        <a key={key} href={safeHref} target={safeHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
          {children}
        </a>
      );
    }
    if (tag === "img") {
      const src = element.getAttribute("src");
      if (!src || !allowedImages.test(src)) return null;
      const alt = element.getAttribute("alt") || "Ảnh trong bài viết";
      const imageIndex = images.push({ src, alt }) - 1;
      return (
        <button
          key={key}
          type="button"
          onClick={() => openLightbox(imageIndex)}
          className="my-7 block w-full overflow-hidden rounded-2xl border border-[#dce7de] bg-[#eef4ef] text-left"
        >
          <img src={src} alt={alt} className="max-h-[560px] w-full object-cover" />
        </button>
      );
    }

    return <>{children}</>;
  };

  return {
    nodes: renderChildren(document.body, "content"),
    toc,
    images,
  };
}

function ArticleAvatar({ article }: { article: KnowledgeArticle }) {
  const avatar = article.authorAvatarUrl ?? article.authorAvatar ?? null;
  return (
    <span className="grid size-12 shrink-0 overflow-hidden rounded-2xl bg-[#e4efe7] text-sm font-extrabold text-[#2E5A44]">
      {avatar ? (
        <img src={avatar} alt={article.author} className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center">{initials(article.author)}</span>
      )}
    </span>
  );
}

function RelatedCard({ article }: { article: KnowledgeArticle }) {
  return (
    <Link
      href={`/dashboard/client/knowledge/${article.slug}`}
      className="group grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#dce7de] bg-white p-2 transition hover:border-[#b9cabb] hover:bg-[#f7faf7]"
    >
      {article.coverImage ? (
        <img src={article.coverImage} alt={article.title} className="aspect-square rounded-xl object-cover" />
      ) : (
        <span className="grid aspect-square place-items-center rounded-xl bg-[#eef4ef] text-[#2E5A44]">
          <ImageIcon size={18} />
        </span>
      )}
      <span className="min-w-0">
        <small className="text-xs font-extrabold text-[#2E5A44]">{article.category}</small>
        <b className="mt-1 line-clamp-2 block text-sm leading-snug text-neutral-950 group-hover:text-[#2E5A44]">
          {article.title}
        </b>
        <small className="mt-2 block text-xs font-semibold text-neutral-400">
          {article.publishedAt}
        </small>
      </span>
    </Link>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onMove,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onMove: (index: number) => void;
}) {
  const image = images[index];
  if (!image) return null;
  const previous = () => onMove((index - 1 + images.length) % images.length);
  const next = () => onMove((index + 1) % images.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/82 p-4"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "ArrowLeft") previous();
        if (event.key === "ArrowRight") next();
      }}
      tabIndex={-1}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/12 text-white transition hover:bg-white/20"
        aria-label="Đóng ảnh"
      >
        <X size={20} />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              previous();
            }}
            className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white transition hover:bg-white/20"
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white transition hover:bg-white/20"
            aria-label="Ảnh sau"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
      <div className="max-h-[88vh] max-w-[min(1080px,92vw)]" onClick={(event) => event.stopPropagation()}>
        <img src={image.src} alt={image.alt} className="max-h-[84vh] w-full rounded-2xl object-contain" />
        <div className="mt-3 text-center text-xs font-bold text-white/80">
          {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}

export function KnowledgeArticleReader({
  article,
  relatedArticles,
}: {
  article: KnowledgeArticle;
  relatedArticles: KnowledgeArticle[];
}) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const bodyImageOffset = article.coverImage ? 1 : 0;
  const openBodyLightbox = useCallback(
    (index: number) => setLightboxIndex(bodyImageOffset + index),
    [bodyImageOffset],
  );
  const reparsed = useMemo(
    () => parseHtmlContent(article.content, openBodyLightbox),
    [article.content, openBodyLightbox],
  );
  const coverImages = article.coverImage
    ? [{ src: article.coverImage, alt: `Ảnh bìa ${article.title}` }]
    : [];
  const lightboxImages = [...coverImages, ...reparsed.images];

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard/client/knowledge");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.excerpt, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareNotice("Đã sao chép liên kết");
    } catch {
      await navigator.clipboard.writeText(url);
      setShareNotice("Đã sao chép liên kết");
    }
    window.setTimeout(() => setShareNotice(null), 2200);
  };

  const categoryHref = `/dashboard/client/knowledge?category=${encodeURIComponent(article.category)}`;

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce7de] bg-white px-3 text-sm font-extrabold text-[#2E5A44] transition hover:bg-[#f5faf5]"
        >
          <ArrowLeft size={15} />
          Quay lại thư viện
        </button>
        <div className="flex items-center gap-2">
          {shareNotice && (
            <span className="rounded-full bg-[#edf3ee] px-3 py-2 text-xs font-extrabold text-[#2E5A44]">
              {shareNotice}
            </span>
          )}
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-sm font-extrabold text-white transition hover:bg-[#244a37]"
          >
            <Share2 size={15} />
            Chia sẻ
          </button>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-500">
        <Link href="/dashboard/client/knowledge" className="text-[#2E5A44] hover:underline">
          Kiến thức
        </Link>
        <span>/</span>
        <Link href={categoryHref} className="text-[#2E5A44] hover:underline">
          {article.category}
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-neutral-700">{article.title}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
        <article className="min-w-0 overflow-hidden rounded-[24px] border border-[#dce7de] bg-white shadow-sm">
          <header className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            <span className="inline-flex rounded-full bg-[#edf3ee] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#2E5A44]">
              {article.category}
            </span>
            <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-neutral-950 sm:text-4xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">
                {article.excerpt}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-neutral-100 pt-5 text-sm font-semibold text-neutral-500">
              <span className="inline-flex items-center gap-3">
                <ArticleAvatar article={article} />
                <span>
                  <b className="block text-neutral-950">{article.author}</b>
                  <small className="mt-1 inline-flex rounded-full bg-[#f2f6f2] px-2 py-1 text-xs font-extrabold text-[#2E5A44]">
                    {roleLabel(article.authorRole)}
                  </small>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} />
                {article.publishedAt}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye size={15} />
                {formatCount(article.views)} lượt xem
              </span>
            </div>
          </header>

          {article.coverImage && (
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="mx-5 mb-2 block overflow-hidden rounded-[20px] bg-[#eef4ef] sm:mx-8 lg:mx-10"
            >
              <img
                src={article.coverImage}
                alt={`Ảnh bìa ${article.title}`}
                className="max-h-[520px] w-full object-cover"
              />
            </button>
          )}

          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            {reparsed.toc.length > 0 && (
              <details className="mb-7 rounded-2xl border border-[#dce7de] bg-[#f7faf7] p-4 xl:hidden">
                <summary className="cursor-pointer text-sm font-extrabold text-neutral-950">
                  Mục lục
                </summary>
                <div className="mt-3 space-y-2">
                  {reparsed.toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block rounded-xl px-3 py-2 text-sm font-bold text-neutral-600 hover:bg-white hover:text-[#2E5A44]"
                    >
                      {item.text}
                    </a>
                  ))}
                </div>
              </details>
            )}
            <div className="prose-durian mx-auto max-w-[820px] text-[16px] leading-[1.75] text-neutral-700 sm:text-[17px]">
              {reparsed.nodes}
            </div>
          </div>
        </article>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-2xl border border-[#dce7de] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-neutral-950">Tác giả</h2>
            <div className="mt-4 flex items-center gap-3">
              <ArticleAvatar article={article} />
              <span className="min-w-0">
                <b className="block truncate text-sm text-neutral-950">{article.author}</b>
                <small className="mt-1 inline-flex rounded-full bg-[#edf3ee] px-2 py-1 text-xs font-extrabold text-[#2E5A44]">
                  {roleLabel(article.authorRole)}
                </small>
              </span>
            </div>
          </section>

          {reparsed.toc.length > 0 && (
            <section className="hidden rounded-2xl border border-[#dce7de] bg-white p-4 shadow-sm xl:block">
              <h2 className="text-sm font-extrabold text-neutral-950">Mục lục</h2>
              <div className="mt-3 space-y-1">
                {reparsed.toc.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block rounded-xl px-3 py-2 text-sm font-bold text-neutral-600 transition hover:bg-[#f2f7f2] hover:text-[#2E5A44] ${
                      item.level === 3 ? "pl-6" : ""
                    }`}
                  >
                    {index + 1}. {item.text}
                  </a>
                ))}
              </div>
            </section>
          )}

          {relatedArticles.length > 0 && (
            <section className="rounded-2xl border border-[#dce7de] bg-white p-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-neutral-950">Có thể bạn quan tâm</h2>
              <div className="mt-4 space-y-3">
                {relatedArticles.slice(0, 4).map((item) => (
                  <RelatedCard key={item.id} article={item} />
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#2E5A44] bg-white px-4 text-sm font-extrabold text-[#2E5A44] transition hover:bg-[#f5faf5]"
          >
            <Copy size={15} />
            Sao chép liên kết
          </button>
        </aside>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onMove={setLightboxIndex}
        />
      )}
    </div>
  );
}
