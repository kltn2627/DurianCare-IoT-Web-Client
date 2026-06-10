"use client";

import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ExternalLink, PackageCheck, QrCode, X } from "lucide-react";
import { cropLots } from "@/constants/durianMockData";

export function CropQrBuilder() {
  const [selectedCrop, setSelectedCrop] = useState<(typeof cropLots)[number] | null>(null);

  return (
    <section id="crops" className="panel scroll-mt-24 p-7 lg:p-8">
      <div className="flex items-center gap-7"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><PackageCheck size={20} /></span><div><h2 className="text-[15px] font-bold">Quản lý vụ mùa & xuất xưởng</h2><p className="mt-1 text-[13px] text-[#7e8b83]">Sinh giao thức QR truy xuất cho lô đủ điều kiện</p></div></div>
      <div className="mt-7 grid gap-7 lg:grid-cols-2">
        {cropLots.map((crop) => (
          <article key={crop.id} className="rounded-2xl border border-[#e2e7e0] p-5">
            <div className="flex items-start justify-between gap-7"><span><small className="text-[14px] font-bold tracking-[1px] text-[#849087]">MÃ VỤ MÙA</small><b className="mt-1 block text-[15px]">{crop.id}</b></span><span className="rounded-full bg-[#e9f2ea] px-2.5 py-1 text-[13px] font-bold text-[#3e7353]">{crop.status}</span></div>
            <div className="mt-5 grid grid-cols-3 gap-4 rounded-xl bg-[#f7f8f5] p-4 text-[14px]"><span><small className="block text-[#849087]">Giống</small><b className="mt-1 block">{crop.variety}</b></span><span><small className="block text-[#849087]">Phân khu</small><b className="mt-1 block">{crop.zone}</b></span><span><small className="block text-[#849087]">Thu hoạch</small><b className="mt-1 block">{crop.harvestAt}</b></span></div>
            <button onClick={() => setSelectedCrop(crop)} disabled={!crop.status.includes("Sẵn sàng")} className="mt-5 flex w-full items-center justify-center gap-4 rounded-xl bg-[#2E5A44] py-3 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#abb6ae]"><QrCode size={15} /> Xuất xưởng vụ mùa</button>
          </article>
        ))}
      </div>

      {selectedCrop && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#183226aa] p-5 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-[24px] bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between"><div><span className="text-[14px] font-bold tracking-[1.4px] text-[#8b968f]">PROTOCOL & QR BUILDER</span><h3 className="mt-2 text-xl font-extrabold">Mã truy xuất đã sẵn sàng</h3></div><button onClick={() => setSelectedCrop(null)} className="grid size-9 place-items-center rounded-xl bg-[#f2f4f1]"><X size={18} /></button></div>
            <div className="mx-auto my-6 w-fit rounded-2xl border border-[#e3e8e1] bg-white p-5 shadow-sm">
              <QRCodeSVG value={`/traceability/${selectedCrop.id}`} size={190} fgColor="#244B37" level="H" />
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-5 text-center"><b className="text-[14px]">{selectedCrop.id}</b><p className="mt-1 text-[15px] text-[#7d8981]">{selectedCrop.variety} • {selectedCrop.zone} • {selectedCrop.trees} cây</p></div>
            <Link href={`/traceability/${selectedCrop.id}`} className="mt-5 flex w-full items-center justify-center gap-4 rounded-xl bg-[#EED56D] py-4 text-[13px] font-bold text-[#2E5A44]"><ExternalLink size={15} /> Mở trang truy xuất công khai</Link>
          </div>
        </div>
      )}
    </section>
  );
}


