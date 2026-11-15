"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { TreeApiError, treeClient } from "@/lib/trees/client";

/** Landing target of a tree QR: resolves the tree (with owner checks on the backend) and opens it on its zone map. */
export function TreeQrRedirect({ treeId }: { treeId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    treeClient.getTree(treeId).then((tree) => {
      if (cancelled) return;
      router.replace(
        `/dashboard/client/farms/${encodeURIComponent(tree.farmId)}/zones/${encodeURIComponent(tree.farmZoneId)}`
          + `?treeId=${encodeURIComponent(tree.id)}`,
      );
    }).catch((caught: unknown) => {
      if (cancelled) return;
      const status = caught instanceof TreeApiError ? caught.status : 0;
      setError(status === 404 ? "Không tìm thấy cây trong mã QR này."
        : status === 403 ? "Bạn không có quyền xem cây này."
        : caught instanceof Error ? caught.message : "Không mở được cây từ mã QR.");
    });
    return () => { cancelled = true; };
  }, [router, treeId, attempt]);

  if (!error) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-neutral-600" aria-live="polite">
        <Loader2 size={16} className="animate-spin" /> Đang mở cây từ mã QR...
      </div>
    );
  }
  return (
    <div role="alert" className="m-6 max-w-lg space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-800">{error}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setError(null); setAttempt((n) => n + 1); }}
          className="flex items-center gap-1.5 rounded-xl bg-[#2E5A44] px-3 py-1.5 text-xs font-bold text-white">
          <RefreshCw size={13} /> Thử lại
        </button>
        <Link href="/dashboard/client/farms"
          className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700">
          Về danh sách vườn
        </Link>
      </div>
    </div>
  );
}
