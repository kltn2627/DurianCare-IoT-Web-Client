"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  CloudUpload,
  FileImage,
  LoaderCircle,
  RotateCw,
  ScanSearch,
  Sprout,
} from "lucide-react";
import { predictLeafDisease, AiApiError } from "@/lib/ai/client";
import type { PredictionData } from "@/lib/ai/types";
import { diseaseLabels } from "@/lib/labels";
import { friendlyApiMessage } from "@/lib/feedback";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type HistoryItem = {
  id: string;
  fileName: string;
  createdAt: string;
  result: PredictionData;
};

export function DiseaseDiagnosisWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PredictionData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const predictedLabel = useMemo(() => {
    if (!result) return "";
    return diseaseLabels[result.predictedDisease] ?? diseaseLabels[normalizeDiseaseKey(result.predictedDisease)] ?? result.predictedDisease;
  }, [result]);

  const handleFileChange = (selectedFile: File | null) => {
    setError("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("Chỉ hỗ trợ file hình ảnh hợp lệ.");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setError("Ảnh vượt quá giới hạn 10MB.");
      return;
    }

    setFile(selectedFile);
  };

  const upload = async () => {
    if (!file) {
      setError("Vui lòng chọn một ảnh lá sầu riêng để chẩn đoán.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await predictLeafDisease(file, "WEB");
      setResult(response.data);
      setHistory((current) => [
        {
          id: `${Date.now()}-${file.name}`,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          result: response.data,
        },
        ...current,
      ].slice(0, 5));
    } catch (cause) {
      const message = friendlyApiMessage(
        cause instanceof AiApiError
          ? { status: cause.status, message: cause.message }
          : null,
        "general",
        "Không thể thực hiện chẩn đoán hình ảnh.",
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-8">
      <article className="panel p-7 lg:p-8">
        <div className="flex items-center gap-6">
          <span className="grid size-11 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
            <BrainCircuit size={22} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">Upload ảnh lá để chẩn đoán</h2>
            <p className="mt-1 text-[13px] text-[#7e8b83]">
              Ảnh được gửi qua Gateway đến AI Service, sau đó trả về bệnh dự đoán, độ tin cậy và khuyến nghị xử lý.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[24px] border border-dashed border-[#cfd8d0] bg-[#fafcf9] p-5">
            <label
              htmlFor="ai-leaf-upload"
              className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-[#e4ebe4] bg-white px-6 py-8 text-center transition hover:border-[#b8c8ba] hover:shadow-sm"
            >
              {previewUrl ? (
                <div className="relative h-[220px] w-full overflow-hidden rounded-[20px] bg-[#f1f5f2]">
                  <Image
                    src={previewUrl}
                    alt="Preview ảnh lá sầu riêng"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              ) : (
                <>
                  <span className="grid size-14 place-items-center rounded-full bg-[#edf3ee] text-[#2E5A44]">
                    <CloudUpload size={28} />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold text-[#203329]">
                    Chọn hoặc kéo thả ảnh lá
                  </h3>
                  <p className="mt-2 max-w-md text-[13px] leading-6 text-neutral-500">
                    Hỗ trợ JPG, JPEG, PNG. AI sẽ crop vùng lá bằng YOLO trước khi chạy MobileNetV2 và trả về kết quả chẩn đoán.
                  </p>
                </>
              )}
            </label>
            <input
              id="ai-leaf-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void upload()}
                disabled={loading || !file}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#254c39] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <LoaderCircle size={16} className="animate-spin" /> : <ScanSearch size={16} />}
                Chẩn đoán ngay
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl("");
                  setError("");
                  setResult(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] px-4 py-3 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
              >
                <RotateCw size={16} />
                Làm mới
              </button>
              {file ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-3 py-1.5 text-xs font-bold text-[#2E5A44]">
                  <FileImage size={13} />
                  {file.name}
                </span>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <SummaryCard
              icon={<BadgeCheck size={18} />}
              label="Kết quả dự đoán"
              value={result ? predictedLabel : "Chưa có kết quả"}
              tone="text-[#2E5A44]"
            />
            <SummaryCard
              icon={<Sprout size={18} />}
              label="Độ tin cậy"
              value={result ? result.confidenceLabel : "—"}
              tone="text-[#7b6015]"
            />
            <SummaryCard
              icon={<Camera size={18} />}
              label="Crop YOLO"
              value={result ? (result.usedDetectionCrop ? "Đã crop lá" : "Không crop") : "—"}
              tone="text-[#4d6f5a]"
            />
            <SummaryCard
              icon={<CheckCircle2 size={18} />}
              label="Nguồn"
              value={result?.source ?? "—"}
              tone="text-[#4d6f5a]"
            />
          </div>
        </div>
      </article>

      {result ? (
        <article className="panel p-7 lg:p-8">
          <div className="flex items-center gap-6">
            <span className="grid size-11 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
              <AlertCircle size={22} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold">Chi tiết chẩn đoán AI</h2>
              <p className="mt-1 text-[13px] text-[#7e8b83]">
                Frontend hiển thị trực tiếp dữ liệu từ API, không dùng dữ liệu giả.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <DetailBlock
              title="Mô tả bệnh"
              content={result.recommendation?.diseaseSummary ?? "Không có mô tả chi tiết từ API."}
            />
            <DetailBlock
              title="Mức độ"
              content={result.recommendation?.severity ?? result.decisionSupport?.riskLevel ?? "—"}
            />
            <DetailBlock
              title="Biện pháp sinh học"
              items={result.recommendation?.biologicalTreatments?.map((item) => item.text) ?? []}
            />
            <DetailBlock
              title="Biện pháp hữu cơ"
              items={result.recommendation?.organicTreatments?.map((item) => item.text) ?? []}
            />
            <DetailBlock
              title="Phòng ngừa"
              items={result.recommendation?.prevention?.map((item) => item.text) ?? []}
            />
            <DetailBlock
              title="Cán cân hóa học"
              items={result.recommendation?.chemicalTreatments?.map((item) => item.treatmentText) ?? []}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <DetailBlock
              title="Lưu ý cho nông hộ"
              items={result.decisionSupport?.farmerNotes ?? []}
            />
            <DetailBlock
              title="Bằng chứng tham khảo"
              items={result.recommendation?.references?.map((item) => `${item.sourceName} (${item.sourceType})`) ?? []}
            />
          </div>
        </article>
      ) : null}

      <article className="panel p-7 lg:p-8">
        <div className="flex items-center gap-6">
          <span className="grid size-11 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
            <BrainCircuit size={22} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">Lịch sử chẩn đoán gần đây</h2>
            <p className="mt-1 text-[13px] text-[#7e8b83]">
              Lưu cục bộ trong phiên trình duyệt để kiểm thử luồng upload.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {history.length === 0 ? (
            <p className="rounded-2xl border border-[#e3e9e3] bg-[#fafcf9] px-4 py-5 text-[13px] text-neutral-500">
              Chưa có lượt chẩn đoán nào.
            </p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#e3e9e3] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <b className="block text-sm text-[#203329]">{item.fileName}</b>
                    <small className="mt-1 block text-xs text-neutral-500">
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </small>
                  </div>
                  <span className="rounded-full bg-[#edf3ee] px-3 py-1.5 text-xs font-bold text-[#2E5A44]">
                    {diseaseLabels[item.result.predictedDisease] ??
                      diseaseLabels[normalizeDiseaseKey(item.result.predictedDisease)] ??
                      item.result.predictedDisease}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#e3e9e3] bg-white p-5">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-xl bg-[#f6f8f5] ${tone}`}>{icon}</span>
        <span>
          <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{label}</p>
          <b className={`mt-1 block text-[15px] ${tone}`}>{value}</b>
        </span>
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  content,
  items,
}: {
  title: string;
  content?: string;
  items?: string[];
}) {
  return (
    <div className="rounded-[20px] border border-[#e3e9e3] bg-[#fafcf9] p-5">
      <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{title}</p>
      {content ? <p className="mt-3 text-sm leading-7 text-neutral-700">{content}</p> : null}
      {items && items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-2 size-2 rounded-full bg-[#2E5A44]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {!content && (!items || items.length === 0) ? (
        <p className="mt-3 text-[13px] text-neutral-500">Chưa có dữ liệu từ API.</p>
      ) : null}
    </div>
  );
}

function normalizeDiseaseKey(value: string) {
  return value.replace(/[-\s]/g, "_");
}
