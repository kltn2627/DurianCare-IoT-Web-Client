"use client";

import { Printer, Share2 } from "lucide-react";

export function PublicActions() {
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Sổ tay nông sản sạch DurianCare", url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="no-print flex gap-2">
      <button onClick={share} className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10" aria-label="Chia sẻ"><Share2 size={17} /></button>
      <button onClick={() => window.print()} className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10" aria-label="In hồ sơ"><Printer size={17} /></button>
    </div>
  );
}

