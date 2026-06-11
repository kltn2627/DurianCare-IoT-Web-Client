import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Leaf,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  FarmerKnowledgeArticle,
  KnowledgeSection,
} from "./types";

export function KnowledgeArticleReader({
  article,
  sections,
}: {
  article: FarmerKnowledgeArticle;
  sections: KnowledgeSection[];
}) {
  return (
    <div className="mx-auto max-w-[1180px]">
      <Link
        href="/dashboard/client/knowledge"
        className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[9px] font-bold text-neutral-500 transition-all duration-200 hover:bg-white hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
      >
        <ArrowLeft size={14} />
        Trở lại cẩm nang
      </Link>

      <article className="overflow-hidden rounded-[28px] border border-neutral-100 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1fr_420px]">
          <header className="p-6 sm:p-9 lg:p-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ee] px-3 py-1.5 text-[8px] font-bold text-[#2E5A44]">
              <BookOpenText size={11} />
              {article.category}
            </span>
            <h1 className="mt-6 max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[12px] leading-relaxed text-neutral-500">
              {article.excerpt}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-neutral-100 pt-6 text-[8px] text-neutral-500">
              <b className="text-neutral-800">{article.author}</b>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={12} />
                {article.publishedAt}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={12} />
                {article.readingTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye size={12} />
                {article.views.toLocaleString("vi-VN")} lượt xem
              </span>
            </div>
          </header>
          <div
            role="img"
            aria-label={`Ảnh bìa ${article.title}`}
            className="min-h-72 bg-cover bg-center lg:min-h-full"
            style={{ backgroundImage: `url(${article.coverImage})` }}
          />
        </div>

        <div className="grid border-t border-neutral-100 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-14">
            <div className="prose-durian max-w-3xl">
              <p className="text-[13px] font-medium leading-8 text-neutral-700">
                {article.content}
              </p>
              {sections.map((section, index) => (
                <section key={section.heading} className="scroll-mt-28 pt-10">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-[#EED56D] text-[9px] font-extrabold text-[#2E5A44]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">
                      {section.heading}
                    </h2>
                  </div>
                  <p className="mt-4 text-[12px] leading-8 text-neutral-600">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>

            <div className="mt-12 rounded-[22px] border border-[#d9e3da] bg-[#f3f7f2] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2E5A44] text-[#EED56D]">
                  <CheckCircle2 size={18} />
                </span>
                <span>
                  <b className="text-[11px] text-neutral-900">
                    Checklist sau khi áp dụng
                  </b>
                  <p className="mt-2 text-[9px] leading-relaxed text-neutral-500">
                    Ghi lại phân khu, người thực hiện, lượng vật tư, chi phí và
                    chỉ số IoT trước/sau vào Lịch canh tác. Không thay thế hướng
                    dẫn trên nhãn sản phẩm hoặc phác đồ đã được kỹ sư phê duyệt.
                  </p>
                </span>
              </div>
            </div>
          </div>

          <aside className="border-t border-neutral-100 bg-[#fbfcfa] p-5 lg:border-l lg:border-t-0 lg:p-6">
            <div className="lg:sticky lg:top-28">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                Trong bài viết
              </p>
              <div className="mt-4 space-y-2">
                {sections.map((section, index) => (
                  <div
                    key={section.heading}
                    className="flex gap-3 rounded-xl border border-neutral-100 bg-white p-3"
                  >
                    <span className="text-[8px] font-extrabold text-[#a18527]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <b className="text-[8px] leading-relaxed text-neutral-700">
                      {section.heading}
                    </b>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-[#2E5A44] p-5 text-white">
                <Sparkles size={18} className="text-[#EED56D]" />
                <b className="mt-4 block text-[10px]">
                  Cần xác nhận tại vườn?
                </b>
                <p className="mt-2 text-[8px] leading-relaxed text-[#d4dfd7]">
                  Gửi câu hỏi kèm ảnh và phân khu để kỹ sư đọc đúng ngữ cảnh.
                </p>
                <Link
                  href="/dashboard/client/chat"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EED56D] px-3 py-2.5 text-[8px] font-extrabold text-[#2E5A44] transition-all duration-200 hover:bg-[#f5df84] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <MessageCircleMore size={13} />
                  Mở phòng tư vấn
                </Link>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-4">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-[#2E5A44]"
                />
                <p className="text-[8px] leading-relaxed text-neutral-500">
                  Nội dung đã được biên tập cho mục đích hướng dẫn canh tác và
                  không thay thế chẩn đoán thực địa.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 px-6 py-5 sm:px-9 lg:px-12">
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-100 px-2.5 py-1.5 text-[7px] font-semibold text-neutral-500"
              >
                #{tag}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-2 text-[8px] text-neutral-400">
            <Leaf size={13} className="text-[#2E5A44]" />
            Cập nhật {article.updatedAt}
          </span>
        </footer>
      </article>
    </div>
  );
}
