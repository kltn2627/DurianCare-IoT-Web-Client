"use client";

import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ChevronDown, ChevronUp, Download, Printer, QrCode } from "lucide-react";
import { treeQrBaseUrl, treeQrFileName, treeQrUrl } from "@/lib/trees/qr";

interface Props {
  treeId: string;
  treeCode: string;
  nickname?: string | null;
}

/** Label image: QR on top, tree code (and nickname) below — used for both PNG and print. */
function renderLabel(qr: HTMLCanvasElement, treeCode: string, nickname?: string | null) {
  const pad = 24;
  const width = qr.width + pad * 2;
  const height = qr.height + pad * 2 + (nickname ? 70 : 44);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ tạo ảnh QR.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(qr, pad, pad);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(treeCode, width / 2, qr.height + pad + 38);
  if (nickname) {
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(nickname, width / 2, qr.height + pad + 66);
  }
  return canvas.toDataURL("image/png");
}

export function TreeQrCard({ treeId, treeCode, nickname }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const url = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return treeQrUrl(treeQrBaseUrl(process.env.NEXT_PUBLIC_WEB_BASE_URL, origin), treeId);
  }, [treeId]);

  function labelDataUrl() {
    const canvas = holder.current?.querySelector("canvas");
    if (!canvas) throw new Error("Chưa tạo được mã QR.");
    return renderLabel(canvas, treeCode, nickname);
  }

  function download() {
    try {
      setError(null);
      const link = document.createElement("a");
      link.href = labelDataUrl();
      link.download = treeQrFileName(treeCode);
      link.click();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được ảnh QR.");
    }
  }

  function print() {
    try {
      setError(null);
      const image = labelDataUrl();
      const win = window.open("", "_blank", "width=480,height=640");
      if (!win) throw new Error("Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
      const doc = win.document;
      doc.title = `QR cây ${treeCode}`;
      const style = doc.createElement("style");
      style.textContent = "body{margin:0;display:flex;justify-content:center;align-items:flex-start;padding:16px}"
        + "img{width:70mm;height:auto}@page{margin:10mm}";
      doc.head.appendChild(style);
      const img = doc.createElement("img");
      img.alt = `QR cây ${treeCode}`;
      img.onload = () => { win.focus(); win.print(); };
      img.src = image;
      doc.body.appendChild(img);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không in được mã QR.");
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-extrabold text-neutral-800"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2"><QrCode size={15} /> Mã QR của cây</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div ref={holder} className="rounded-xl border border-neutral-100 bg-white p-3">
            <QRCodeCanvas value={url} size={192} level="M" marginSize={1} />
          </div>
          <p className="text-base font-extrabold text-neutral-900">{treeCode}</p>
          {nickname ? <p className="text-xs text-neutral-500">{nickname}</p> : null}
          <div className="flex gap-2">
            <button type="button" onClick={download}
              className="flex items-center gap-1.5 rounded-xl bg-[#2E5A44] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#25493a]">
              <Download size={13} /> Tải PNG
            </button>
            <button type="button" onClick={print}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50">
              <Printer size={13} /> In tem
            </button>
          </div>
          {error ? <p role="alert" className="text-xs font-semibold text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
