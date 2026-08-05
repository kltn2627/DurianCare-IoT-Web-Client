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
import type { BoundingBox, PredictionData, PredictionSource } from "@/lib/ai/types";
import { diseaseLabels } from "@/lib/labels";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type HistoryItem = {
  id: string;
  fileName: string;
  createdAt: string;
  result: PredictionData;
};

type SourceOption = {
  value: PredictionSource;
  label: string;
  hint: string;
};

type PredictionErrorKind = "invalid-image" | "service-unavailable" | "general";

const sourceOptions: SourceOption[] = [
  {
    value: "WEB",
    label: "Web",
    hint: "Ảnh chụp từ máy tính hoặc điện thoại, nguồn mặc định cho luồng web.",
  },
  {
    value: "MOBILE",
    label: "Mobile",
    hint: "Ảnh gửi từ app di động hoặc ảnh chụp trực tiếp từ điện thoại.",
  },
  {
    value: "IOT_CAMERA",
    label: "IoT Camera",
    hint: "Dành cho ảnh đẩy từ camera/gateway, cần mã thiết bị.",
  },
];

export function DiseaseDiagnosisWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [source, setSource] = useState<PredictionSource>("WEB");
  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<PredictionErrorKind | null>(null);
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

    return (
      diseaseLabels[result.predictedDisease] ??
      diseaseLabels[normalizeDiseaseKey(result.predictedDisease)] ??
      result.predictedDisease
    );
  }, [result]);

  const sourceLabel = useMemo(() => getSourceLabel(source), [source]);
  const confidenceLabel = result?.confidenceText ?? result?.confidenceLabel ?? "—";
  const uiState = getDiagnosisUiState(errorKind, loading, Boolean(result));

  const handleFileChange = (selectedFile: File | null) => {
    setError("");
    setErrorKind(null);
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      !ACCEPTED_IMAGE_TYPES.includes(
        selectedFile.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
      )
    ) {
      setFile(null);
      setError("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP.");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setError("Ảnh vượt quá giới hạn 10MB.");
      return;
    }

    setFile(selectedFile);
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl("");
    setError("");
    setErrorKind(null);
    setResult(null);
    setDeviceId("");
    setSource("WEB");
    setLoading(false);
  };

  const upload = async () => {
    if (!file) {
      setError("Vui lòng chọn một ảnh lá sầu riêng để chẩn đoán.");
      setErrorKind(null);
      return;
    }

    if (source === "IOT_CAMERA" && !deviceId.trim()) {
      setError("Vui lòng nhập mã thiết bị IoT khi chọn nguồn camera.");
      setErrorKind("general");
      return;
    }

    setLoading(true);
    setError("");
    setErrorKind(null);
    setResult(null);

    try {
      const response = await predictLeafDisease(
        file,
        source,
        source === "IOT_CAMERA" ? deviceId.trim() : null,
      );

      setResult(response.data);
      setHistory((current) =>
        [
          {
            id: `${Date.now()}-${file.name}`,
            fileName: file.name,
            createdAt: new Date().toISOString(),
            result: response.data,
          },
          ...current,
        ].slice(0, 5),
      );
    } catch (cause) {
      const failure = classifyPredictionFailure(cause);
      setErrorKind(failure.kind);
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  };

  const canUpload =
    Boolean(file) && !loading && (source !== "IOT_CAMERA" || deviceId.trim().length > 0);

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
              Ảnh được gửi qua Gateway đến AI Service dưới dạng multipart/form-data. Kết quả trả
              về được render trực tiếp từ backend, không suy đoán thêm ở frontend.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
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
                    Hỗ trợ JPEG, PNG, WEBP. Khi chọn nguồn IoT Camera, hãy nhập mã thiết bị để
                    backend ghép đúng nguồn dữ liệu.
                  </p>
                </>
              )}
            </label>
            <input
              id="ai-leaf-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              capture="environment"
              className="sr-only"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(120px,0.75fr)_minmax(230px,1.35fr)_minmax(180px,1fr)_minmax(150px,0.85fr)]">
              <label className="min-w-0 space-y-2">
                <span className="block text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">
                  Nguồn ảnh
                </span>
                <select
                  value={source}
                  onChange={(event) => {
                    setError("");
                    setErrorKind(null);
                    setResult(null);
                    setSource(event.target.value as PredictionSource);
                  }}
                  className="h-[54px] w-full rounded-2xl border border-[#d8e1d8] bg-white px-4 text-base font-semibold text-neutral-900 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4415]"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0 space-y-2">
                <span className="block text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">
                  Mã thiết bị IoT
                </span>
                <input
                  value={deviceId}
                  onChange={(event) => {
                    setError("");
                    setErrorKind(null);
                    setDeviceId(event.target.value);
                  }}
                  disabled={source !== "IOT_CAMERA"}
                  placeholder={
                    source === "IOT_CAMERA"
                      ? "VD: ESP32-CAM-DEMO-001"
                      : "Chỉ cần khi chọn IoT Camera"
                  }
                  className="h-[54px] w-full min-w-0 rounded-2xl border border-[#d8e1d8] bg-white px-4 text-base font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4415] disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
                />
              </label>

              <button
                type="button"
                onClick={() => void upload()}
                disabled={!canUpload}
                className="mt-6 inline-flex h-[54px] min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#2E5A44] px-5 text-base font-bold text-white transition hover:bg-[#254c39] disabled:cursor-not-allowed disabled:opacity-60 lg:mt-[26px]"
              >
                {loading ? <LoaderCircle size={16} className="animate-spin" /> : <ScanSearch size={16} />}
                <span className="truncate">{loading ? "Đang xử lý..." : "Chẩn đoán ngay"}</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="mt-6 inline-flex h-[54px] min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#d8e1d8] bg-white px-5 text-base font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8] lg:mt-[26px]"
              >
                <RotateCw size={16} />
                <span className="truncate">Làm mới</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {file ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-3 py-1.5 text-xs font-bold text-[#2E5A44]">
                  <FileImage size={13} />
                  {file.name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2 rounded-full bg-[#faf3d6] px-3 py-1.5 text-xs font-bold text-[#7b6015]">
                <Camera size={13} />
                Nguồn: {sourceLabel}
              </span>
              {source === "IOT_CAMERA" ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eef5ef] px-3 py-1.5 text-xs font-bold text-[#2E5A44]">
                  Mã thiết bị sẽ được gửi kèm trong request
                </span>
              ) : null}
            </div>

            {error ? (
              <div
                role="alert"
                className={`mt-4 rounded-xl px-4 py-3 text-xs ${
                  uiState === "invalid-image"
                    ? "border border-amber-100 bg-amber-50 text-amber-900"
                    : uiState === "service-unavailable"
                      ? "border border-orange-100 bg-orange-50 text-orange-900"
                      : "border border-red-100 bg-red-50 text-red-700"
                }`}
              >
                <b className="block text-[13px] font-bold">
                  {uiState === "invalid-image"
                    ? "Ảnh không hợp lệ / Không phát hiện lá sầu riêng"
                    : uiState === "service-unavailable"
                      ? "Hệ thống tạm thời chưa sẵn sàng"
                      : "Không thể chẩn đoán hình ảnh"}
                </b>
                <p className="mt-1 leading-6">{error}</p>
                {uiState === "invalid-image" ? (
                  <p className="mt-2 leading-6 text-amber-800">
                    Vui lòng upload lại ảnh lá sầu riêng rõ nền, đủ sáng, chụp cận lá.
                  </p>
                ) : uiState === "service-unavailable" ? (
                  <p className="mt-2 leading-6 text-orange-800">
                    Dịch vụ AI đang tạm gián đoạn. Hãy thử lại sau ít phút.
                  </p>
                ) : null}
              </div>
            ) : null}

            {loading ? (
              <div className="mt-4 rounded-xl border border-[#e1e8df] bg-[#f7faf7] px-4 py-3 text-xs text-neutral-500">
                Đang xử lý ảnh trên AI Service. Nếu ảnh hợp lệ, kết quả sẽ xuất hiện ở khối bên
                phải ngay sau khi backend trả về.
              </div>
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
              value={result ? confidenceLabel : "—"}
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
              value={result?.source ?? source}
              tone="text-[#4d6f5a]"
            />
            <SummaryCard
              icon={<FileImage size={18} />}
              label="Mã thiết bị"
              value={result?.deviceId ?? (source === "IOT_CAMERA" ? deviceId || "—" : "Không áp dụng")}
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
                Frontend hiển thị trực tiếp dữ liệu backend trả về, an toàn khi `image`,
                `boundingBox`, `recommendation` hoặc `decisionSupport` là `null`.
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
              title="Crop YOLO"
              content={result.usedDetectionCrop ? "Đã crop lá trước khi dự đoán." : "Không crop, dùng ảnh gốc."}
            />
            <DetailBlock title="Bounding box" content={formatBoundingBox(result.boundingBox)} />
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
              title="Biện pháp hóa học"
              items={result.recommendation?.chemicalTreatments?.map((item) => item.treatmentText) ?? []}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <DetailBlock title="Hành động ngay" items={result.decisionSupport?.immediateActions ?? []} />
            <DetailBlock title="Kế hoạch theo dõi" items={result.decisionSupport?.monitoringPlan ?? []} />
            <DetailBlock title="Kế hoạch sinh học" items={result.decisionSupport?.biologicalPlan ?? []} />
            <DetailBlock title="Kế hoạch hữu cơ" items={result.decisionSupport?.organicPlan ?? []} />
            <DetailBlock title="Kế hoạch hóa học" items={result.decisionSupport?.chemicalPlan ?? []} />
            <DetailBlock title="Lưu ý nông hộ" items={result.decisionSupport?.farmerNotes ?? []} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <DetailBlock title="Sẵn sàng xuất khẩu" items={result.decisionSupport?.exportReadiness ?? []} />
            <div className="rounded-[20px] border border-[#e3e9e3] bg-[#fafcf9] p-5">
              <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">Ảnh lưu trữ</p>
              {result.image?.url ? (
                <a
                  href={result.image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex break-all text-sm leading-7 text-[#2E5A44] underline decoration-[#2E5A4430] underline-offset-4"
                >
                  {result.image.url}
                </a>
              ) : (
                <p className="mt-3 text-[13px] text-neutral-500">
                  Backend không trả URL lưu trữ, nhưng kết quả chẩn đoán vẫn hợp lệ.
                </p>
              )}
            </div>
          </div>
        </article>
      ) : errorKind === "invalid-image" ? (
        <article className="panel p-7 lg:p-8">
          <div className="flex items-center gap-6">
            <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <AlertCircle size={22} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold">Ảnh không hợp lệ</h2>
              <p className="mt-1 text-[13px] text-[#7e8b83]">
                Backend đã từ chối ảnh vì không nhận diện được lá sầu riêng rõ ràng.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[20px] border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            Chúng tôi không hiển thị bệnh, recommendation hay decision support khi API trả về 422
            cho ảnh không phải lá sầu riêng hoặc ảnh có chất lượng chưa đủ tốt.
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
              Lưu cục bộ trong trình duyệt để kiểm tra nhanh luồng upload và kết quả backend trả
              về.
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
        <span className={`grid size-10 place-items-center rounded-xl bg-[#f6f8f5] ${tone}`}>
          {icon}
        </span>
        <span className="min-w-0">
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

function formatBoundingBox(box?: BoundingBox | null) {
  if (!box) return "Không có bounding box từ backend.";
  return `left: ${box.left}, top: ${box.top}, right: ${box.right}, bottom: ${box.bottom}`;
}

function classifyPredictionFailure(cause: unknown): {
  kind: PredictionErrorKind;
  message: string;
} {
  if (!(cause instanceof AiApiError)) {
    return {
      kind: "general",
      message: "Không thể thực hiện chẩn đoán hình ảnh. Vui lòng thử lại sau.",
    };
  }

  const message = getApiMessage(cause);
  const normalized = normalizeText(message);

  if (cause.status === 422) {
    if (isInvalidLeafImageMessage(normalized)) {
      return {
        kind: "invalid-image",
        message:
          "Ảnh chưa rõ là lá sầu riêng hoặc chất lượng chưa đủ tốt. Vui lòng chụp lại lá rõ hơn.",
      };
    }

    return {
      kind: "general",
      message: message || "Dữ liệu upload chưa hợp lệ. Vui lòng kiểm tra lại ảnh và thử lại.",
    };
  }

  if (cause.status === 502 || cause.status === 503) {
    return {
      kind: "service-unavailable",
      message: "Hệ thống tạm thời chưa sẵn sàng. Vui lòng thử lại sau.",
    };
  }

  if (cause.status === 401) {
    return {
      kind: "general",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  if (cause.status === 403) {
    return {
      kind: "general",
      message: "Bạn không có quyền thực hiện thao tác này.",
    };
  }

  if (cause.status === 404) {
    return {
      kind: "general",
      message: "Không tìm thấy dịch vụ chẩn đoán phù hợp.",
    };
  }

  if (cause.status === 409) {
    return {
      kind: "general",
      message: "Dữ liệu đang xung đột. Vui lòng tải lại và thử lại.",
    };
  }

  if (cause.status === 429) {
    return {
      kind: "general",
      message: "Bạn đang gửi quá nhiều yêu cầu. Vui lòng chờ một chút rồi thử lại.",
    };
  }

  return {
    kind: "general",
    message: message || "Không thể thực hiện chẩn đoán hình ảnh. Vui lòng thử lại sau.",
  };
}

function getApiMessage(cause: AiApiError) {
  const parts = [
    readString(cause.body?.message),
    readString(cause.body?.error),
    readString(extractFastApiDetail(cause.body?.detail)),
    readString(cause.message),
  ].filter(Boolean);

  return parts[0] ?? "";
}

function extractFastApiDetail(detail: unknown) {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!isRecord(item)) return "";
        const text = readString(item.msg ?? item.message ?? item.detail);
        if (!text) return "";
        const location = Array.isArray(item.loc) ? item.loc.at(-1) : null;
        const field = readString(location);
        return field ? `${field}: ${text}` : text;
      })
      .filter(Boolean);

    return messages.length > 0 ? messages.join("; ") : "";
  }

  if (isRecord(detail)) {
    return readString(detail.message ?? detail.detail ?? detail.error) ?? "";
  }

  return "";
}

function isInvalidLeafImageMessage(normalized: string) {
  if (!normalized) return false;

  const leafTerms = [
    "durian leaf",
    "leaf photo",
    "durian leaf photo",
    "lá sầu riêng",
    "la sau rieng",
    "lá",
  ];

  const invalidTerms = [
    "uploaded image does not appear to contain",
    "does not appear to contain",
    "please upload a clear",
    "clear durian leaf",
    "not a clear durian leaf",
    "not a durian leaf",
    "not contain a durian leaf",
    "no durian leaf",
    "blurry",
    "unclear",
    "low quality",
    "image quality",
    "too dark",
    "không phát hiện",
    "khong phat hien",
    "không rõ",
    "khong ro",
  ];

  if (invalidTerms.some((term) => normalized.includes(term))) return true;

  return leafTerms.some((leafTerm) => normalized.includes(leafTerm)) && /\b(not|no|clear|unclear|blurry|invalid|appear)\b/.test(normalized);
}

function getDiagnosisUiState(
  errorKind: PredictionErrorKind | null,
  loading: boolean,
  hasResult: boolean,
) {
  if (hasResult) return "success";
  if (loading) return "loading";
  return errorKind;
}

function getSourceLabel(value: PredictionSource) {
  if (value === "MOBILE") return "Mobile";
  if (value === "IOT_CAMERA") return "IoT Camera";
  return "Web";
}

function normalizeDiseaseKey(value: string) {
  return value.replace(/[-\s]/g, "_");
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}
