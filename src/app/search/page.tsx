import type { Metadata } from "next";
import { SearchWorkspace } from "@/components/search/SearchWorkspace";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description:
    "Tra cứu bài viết, hồ sơ bệnh hại và tài liệu vận hành đã được backend lập chỉ mục.",
};

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: {
    q?: string | string[];
    type?: string | string[];
    page?: string | string[];
    size?: string | string[];
    sortBy?: string | string[];
    sortDirection?: string | string[];
  };
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const initialQuery = first(searchParams?.q) ?? "";
  const initialType = first(searchParams?.type);
  const initialPage = Number(first(searchParams?.page) ?? 0);
  const initialSize = Number(first(searchParams?.size) ?? 10);
  const initialSortBy = first(searchParams?.sortBy) === "title" ? "title" : "updatedAt";
  const initialSortDirection =
    first(searchParams?.sortDirection) === "asc" ? "asc" : "desc";

  return (
    <SearchWorkspace
      initialQuery={initialQuery}
      initialType={initialType === "ARTICLE" || initialType === "DISEASE" ? initialType : ""}
      initialPage={Number.isFinite(initialPage) && initialPage >= 0 ? initialPage : 0}
      initialSize={Number.isFinite(initialSize) && initialSize > 0 ? initialSize : 10}
      initialSortBy={initialSortBy}
      initialSortDirection={initialSortDirection}
    />
  );
}
