"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  Camera,
  CameraOff,
  ChevronDown,
  Download,
  ExternalLink,
  FileImage,
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sprout,
  ZoomIn,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import { AiApiError, predictLeafDisease } from "@/lib/ai/client";
import type {
  KnowledgeLineItem,
  PredictionData,
  PredictionSource,
  ReferenceSourceSummary,
} from "@/lib/ai/types";
import { cameraClient } from "@/lib/camera/client";
import { diseaseLabels, getDiseaseAlertMessage, getDiseaseCategory } from "@/lib/labels";
import { translateRecommendation } from "@/lib/treatment-terms";
import { treeClient } from "@/lib/trees/client";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type ReportSnapshot = {
  id: string;
  fileName: string;
  createdAt: string;
  previewUrl: string;
  result: PredictionData;
};

type PredictionErrorKind = "invalid-image" | "service-unavailable" | "general";
type ViewerMode = "fullscreen" | null;

type SourceOption = {
  value: PredictionSource;
  label: string;
};

const sourceOptions: SourceOption[] = [
  { value: "WEB", label: "Web" },
  { value: "MOBILE", label: "Di động" },
  { value: "IOT_CAMERA", label: "Camera IoT" },
];

// Mirrors the camera list configured in CameraSection — update both when adding cameras.
const CAMERA_DEVICES = [
  { id: "ESP32-CAM-001", label: "Camera Vườn Chính", sublabel: "ESP32-CAM-001" },
];

type CaptureMode = "upload" | "esp32cam";

export function DiseaseDiagnosisWorkspace({ treeId = null, treeCode = null }: { treeId?: string | null; treeCode?: string | null }) {
  const [captureMode, setCaptureMode] = useState<CaptureMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [source, setSource] = useState<PredictionSource>("WEB");
  // Always initialised to a real camera ID — farmers never type this manually.
  const [deviceId, setDeviceId] = useState(CAMERA_DEVICES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<PredictionErrorKind | null>(null);
  const [activeReport, setActiveReport] = useState<ReportSnapshot | null>(null);
  const [history, setHistory] = useState<ReportSnapshot[]>([]);
  const [zoom, setZoom] = useState(100);
  const [viewerMode, setViewerMode] = useState<ViewerMode>(null);
  const [cameraError, setCameraError] = useState(false);
  const [treeSaveState, setTreeSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [treeSaveError, setTreeSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const diagnosisLabel = useMemo(
    () => (activeReport ? formatDiseaseLabel(activeReport.result.predictedDisease) : ""),
    [activeReport],
  );

  const confidenceLabel = useMemo(
    () => (activeReport ? formatConfidence(activeReport.result.confidenceText || activeReport.result.confidenceLabel) : ""),
    [activeReport],
  );

  const sourceLabel = useMemo(() => getSourceLabel(source), [source]);
  const showSuccessView = Boolean(activeReport);
  const showInvalidLeafCard = errorKind === "invalid-image" && !activeReport;
  const showServiceUnavailableCard = errorKind === "service-unavailable" && !activeReport;
  const report = activeReport!;
  const canUpload = Boolean(file) && !loading && (source !== "IOT_CAMERA" || deviceId.trim().length > 0);
  const canCapture = !loading && !cameraError;
  const selectedCamera = CAMERA_DEVICES.find((c) => c.id === deviceId) ?? CAMERA_DEVICES[0];

  const handleFileChange = (selectedFile: File | null) => {
    setError("");
    setErrorKind(null);
    setActiveReport(null);
    setViewerMode(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(selectedFile.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
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
    setCaptureMode("upload");
    setFile(null);
    setPreviewUrl("");
    setSource("WEB");
    setDeviceId(CAMERA_DEVICES[0].id);
    setLoading(false);
    setError("");
    setErrorKind(null);
    setActiveReport(null);
    setZoom(100);
    setViewerMode(null);
    setCameraError(false);
    setTreeSaveState("idle");
    setTreeSaveError(null);
  };

  const handleSaveToTree = async (snap: ReportSnapshot) => {
    if (!treeId) return;
    setTreeSaveState("saving");
    setTreeSaveError(null);
    try {
      await treeClient.saveDiagnosis(treeId, {
        imageUrl: snap.result.image?.url || "WEB_AI_NO_STORED_IMAGE",
        diseaseCode: snap.result.predictedDisease,
        diseaseName: diseaseLabels[snap.result.predictedDisease] ?? null,
        confidence: snap.result.confidence / 100, // AI returns 0-100%, backend expects 0-1 float
        boundingBox: snap.result.boundingBox as Record<string, unknown> | null ?? null,
        source: snap.result.source,
      });
      setTreeSaveState("saved");
    } catch (err) {
      setTreeSaveState("error");
      setTreeSaveError(err instanceof Error ? err.message : "Không thể lưu chuẩn đoán.");
    }
  };

  const upload = async () => {
    if (!file) {
      setError("Vui lòng chọn ảnh lá sầu riêng trước khi chẩn đoán.");
      setErrorKind(null);
      return;
    }

    if (source === "IOT_CAMERA" && !deviceId.trim()) {
      setError("Vui lòng nhập mã thiết bị khi chọn nguồn camera.");
      setErrorKind("general");
      return;
    }

    setLoading(true);
    setError("");
    setErrorKind(null);
    setActiveReport(null);
    setViewerMode(null);
    setTreeSaveState("idle");
    setTreeSaveError(null);

    try {
      const response = await predictLeafDisease(
        file,
        source,
        source === "IOT_CAMERA" ? deviceId.trim() : null,
      );

      const snapshot: ReportSnapshot = {
        id: `${Date.now()}-${file.name}`,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        previewUrl,
        result: response.data,
      };

      setActiveReport(snapshot);
      setHistory((current) => [snapshot, ...current].slice(0, 5));
    } catch (cause) {
      const failure = classifyPredictionFailure(cause);
      setErrorKind(failure.kind);
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetches a live frame from ESP32-CAM and runs it through the AI pipeline.
  const captureFromEsp32 = async () => {
    if (!deviceId.trim()) {
      setError("Vui lòng nhập mã thiết bị ESP32-CAM trước khi chụp.");
      setErrorKind("general");
      return;
    }

    setLoading(true);
    setError("");
    setErrorKind(null);
    setActiveReport(null);
    setViewerMode(null);
    setTreeSaveState("idle");
    setTreeSaveError(null);

    let snapshotBlobUrl: string | null = null;
    try {
      // 1. Pull a live JPEG from the camera proxy
      snapshotBlobUrl = await cameraClient.fetchSnapshotBlob(deviceId.trim());

      // 2. Convert blob URL → ArrayBuffer → File (so predictLeafDisease can send it as FormData)
      const imageResp = await fetch(snapshotBlobUrl);
      const imageBlob = await imageResp.blob();
      const snapshotFile = new File([imageBlob], `esp32cam-${Date.now()}.jpg`, { type: "image/jpeg" });

      // Update the upload preview area so the user sees the captured frame
      setFile(snapshotFile);
      setSource("IOT_CAMERA");

      // 3. Run prediction via the existing AI service pipeline
      const response = await predictLeafDisease(snapshotFile, "IOT_CAMERA", deviceId.trim());

      const snapshot: ReportSnapshot = {
        id: `${Date.now()}-esp32cam`,
        fileName: snapshotFile.name,
        createdAt: new Date().toISOString(),
        // Keep snapshotBlobUrl alive — it becomes the preview thumbnail in history
        previewUrl: snapshotBlobUrl,
        result: response.data,
      };
      snapshotBlobUrl = null; // ownership transferred to snapshot; do NOT revoke

      setActiveReport(snapshot);
      setHistory((current) => [snapshot, ...current].slice(0, 5));
    } catch (cause) {
      if (snapshotBlobUrl) { URL.revokeObjectURL(snapshotBlobUrl); }
      const failure = classifyPredictionFailure(cause);
      setErrorKind(failure.kind);
      setError(
        failure.kind === "general" && cause instanceof Error && cause.message.includes("Snapshot")
          ? "Không thể lấy ảnh từ ESP32-CAM. Kiểm tra mã thiết bị và kết nối mạng."
          : failure.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const reopenReport = (report: ReportSnapshot) => {
    setActiveReport(report);
    setError("");
    setErrorKind(null);
    setViewerMode(null);
    setZoom(100);
  };

  const diagnosisImageUrl = report?.result.image?.url ?? null;
  const originalImageUrl = report?.previewUrl ?? previewUrl ?? null;
  const hasDecisionSupport = Boolean(report?.result.decisionSupport);

  return (
    <section className="space-y-8">
      <article className="panel p-7 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eef5ef] px-3 py-1 text-xs font-bold text-[#2E5A44]">
              <Sparkles size={14} />
              Chẩn đoán lá sầu riêng
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-neutral-900 lg:text-[2rem]">
              Phân tích lá sầu riêng từ ảnh upload
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-7 text-neutral-500">
              Chỉ khi hệ thống trả kết quả hợp lệ, các phần chẩn đoán mới được hiển thị. Ảnh không
              phù hợp hoặc lỗi hệ thống sẽ chỉ hiện thông báo ngắn gọn bằng tiếng Việt.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)] lg:min-w-[260px]">
            <MetricPill
              icon={<BadgeCheck size={16} />}
              label="Trạng thái"
              value={getStatusLabel(errorKind, loading, activeReport)}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[28px] border border-dashed border-[#d3ddd4] bg-[#fbfcfa] p-5">

            {/* ── Input-source toggle ───────────────────────────────────── */}
            <div className="mb-4 flex gap-2 rounded-2xl border border-[#e3eae3] bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setCaptureMode("upload");
                  setError("");
                  setErrorKind(null);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
                  captureMode === "upload"
                    ? "bg-[#2E5A44] text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <FileImage size={15} />
                Tải ảnh lên
              </button>
              <button
                type="button"
                onClick={() => {
                  setCaptureMode("esp32cam");
                  setSource("IOT_CAMERA");
                  setError("");
                  setErrorKind(null);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
                  captureMode === "esp32cam"
                    ? "bg-[#2E5A44] text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <Camera size={15} />
                Chụp từ ESP32-CAM
              </button>
            </div>

            {captureMode === "upload" ? (
              <>
                {/* ── File drop zone ────────────────────────────────────── */}
                <label
                  htmlFor="ai-leaf-upload"
                  className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-[#e3eae3] bg-white px-6 py-8 text-center transition hover:border-[#b8c7b9] hover:shadow-sm"
                >
                  {previewUrl ? (
                    <div className="relative h-[240px] w-full overflow-hidden rounded-[20px] bg-[#f3f6f3]">
                      <Image
                        src={previewUrl}
                        alt="Ảnh lá đã chọn"
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <>
                      <span className="grid size-14 place-items-center rounded-full bg-[#edf3ee] text-[#2E5A44]">
                        <FileImage size={28} />
                      </span>
                      <h2 className="mt-4 text-lg font-extrabold tracking-tight text-neutral-900">
                        Chọn hoặc kéo thả ảnh lá
                      </h2>
                      <p className="mt-2 max-w-md text-[13px] leading-6 text-neutral-500">
                        Hỗ trợ JPEG, PNG, WEBP.
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

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="block text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">
                        Nguồn ảnh
                      </span>
                      <select
                        value={source}
                        onChange={(event) => {
                          setError("");
                          setErrorKind(null);
                          setActiveReport(null);
                          setSource(event.target.value as PredictionSource);
                        }}
                        className="h-11 w-full rounded-xl border border-[#d8e1d8] bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4415]"
                      >
                        {sourceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 md:col-span-2">
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
                        placeholder={source === "IOT_CAMERA" ? "VD: ESP32-CAM-DEMO-001" : "Chỉ cần khi chọn IoT Camera"}
                        className="h-11 w-full rounded-xl border border-[#d8e1d8] bg-white px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4415] disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => void upload()}
                      disabled={!canUpload}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#254c39] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? <LoaderCircle size={16} className="animate-spin" /> : <ScanSearch size={16} />}
                      {loading ? "Đang phân tích..." : "Chẩn đoán ngay"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] px-4 py-3 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
                    >
                      <RefreshCw size={16} />
                      Làm mới
                    </button>
                  </div>
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
                </div>
              </>
            ) : (
              /* ── ESP32-CAM capture panel ──────────────────────────────── */
              <div className="rounded-[24px] border border-[#e3eae3] bg-white px-6 py-7 space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
                    <Camera size={22} />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-bold text-neutral-900">Chụp ảnh từ ESP32-CAM</h2>
                    <p className="mt-0.5 text-[13px] text-neutral-500">
                      Chọn camera và nhấn chụp — ảnh được lấy trực tiếp, không cần thao tác thêm.
                    </p>
                  </div>
                </div>

                {/* Camera card picker */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">
                    Chọn camera
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CAMERA_DEVICES.map((cam) => {
                      const selected = deviceId === cam.id;
                      return (
                        <button
                          key={cam.id}
                          type="button"
                          onClick={() => {
                            setDeviceId(cam.id);
                            setError("");
                            setErrorKind(null);
                            setCameraError(false);
                          }}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-[#2E5A44] bg-[#edf3ee] shadow-sm"
                              : "border-[#e3eae3] bg-white hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
                          }`}
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                              selected ? "bg-[#2E5A44] text-white" : "bg-[#f0f4f0] text-[#2E5A44]"
                            }`}
                          >
                            <Camera size={16} />
                          </span>
                          <span className="min-w-0">
                            <b className={`block text-[13px] ${selected ? "text-[#2E5A44]" : "text-neutral-800"}`}>
                              {cam.label}
                            </b>
                            <span className="block text-[11px] text-neutral-400">{cam.sublabel}</span>
                          </span>
                          {selected && (
                            <span className="ml-auto size-4 shrink-0 rounded-full bg-[#2E5A44] text-white flex items-center justify-center">
                              <svg viewBox="0 0 10 8" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 4l2.5 2.5L9 1" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live preview frame */}
                <Esp32LivePreview
                  deviceId={deviceId}
                  disabled={loading}
                  onCameraError={setCameraError}
                />

                {/* Capture + reset */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void captureFromEsp32()}
                    disabled={!canCapture}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-5 py-3.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#254c39] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <Camera size={18} />
                    )}
                    {loading ? "Đang chụp & phân tích..." : "📸  Chụp & Phân tích ngay"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] px-4 py-3.5 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
                  >
                    <RefreshCw size={16} />
                    Làm mới
                  </button>
                </div>
              </div>
            )}

            {error ? (
              <div
                role="alert"
                className={`mt-4 rounded-xl px-4 py-3 text-xs ${
                  errorKind === "invalid-image"
                    ? "border border-amber-100 bg-amber-50 text-amber-900"
                    : errorKind === "service-unavailable"
                      ? "border border-orange-100 bg-orange-50 text-orange-900"
                      : "border border-red-100 bg-red-50 text-red-700"
                }`}
              >
                <b className="block text-[13px] font-bold">
                  {errorKind === "invalid-image"
                    ? "Không phát hiện được lá sầu riêng"
                    : errorKind === "service-unavailable"
                      ? "Hệ thống AI đang tạm thời không khả dụng."
                      : "Không thể chẩn đoán hình ảnh"}
                </b>
                <p className="mt-1 leading-6">{error}</p>
                {errorKind === "invalid-image" ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 leading-6 text-amber-800">
                    <li>Chụp cận lá</li>
                    <li>Đủ ánh sáng</li>
                    <li>Không bị che</li>
                    <li>Nền đơn giản</li>
                  </ul>
                ) : errorKind === "service-unavailable" ? (
                  <p className="mt-2 leading-6 text-orange-800">Vui lòng thử lại sau.</p>
                ) : null}
              </div>
            ) : null}

            {loading ? (
              <div className="mt-4 rounded-xl border border-[#e1e8df] bg-[#f7faf7] px-4 py-3 text-xs text-neutral-500">
                {captureMode === "esp32cam"
                  ? "Đang lấy ảnh từ ESP32-CAM và phân tích AI. Vui lòng chờ..."
                  : "Đang xử lý ảnh. Nếu ảnh hợp lệ, kết quả sẽ xuất hiện ngay bên phải."}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <MetricPill
              icon={<BadgeCheck size={18} />}
              label="Tên bệnh"
              value={activeReport ? diagnosisLabel : "Chưa có kết quả"}
            />
            <MetricPill
              icon={<Sprout size={18} />}
              label="Độ tin cậy"
              value={activeReport ? confidenceLabel : "Chưa có dữ liệu"}
            />
            <div className="rounded-[20px] border border-[#e3e9e3] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">
                  Xác suất
                </span>
                <span className="text-sm font-bold text-[#2E5A44]">
                  {activeReport ? confidenceLabel : "0.00%"}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2ed]">
                <div
                  className="h-full rounded-full bg-[#2E5A44] transition-all duration-300"
                  style={{ width: `${report ? clampConfidence(report.result.confidence) : 0}%` }}
                />
              </div>
            </div>
            <MetricPill
              icon={<ShieldCheck size={18} />}
              label="Mức độ"
              value={report ? formatSeverity(report.result.recommendation?.severity) : "Đang cập nhật"}
            />
          </div>
        </div>
      </article>

      {showInvalidLeafCard ? (
        <AlertOnlyCard
          title="Không phát hiện được lá sầu riêng"
          tone="amber"
          icon={<AlertCircle size={22} />}
          body={
            <ul className="mt-3 list-disc space-y-1 pl-5 leading-7">
              <li>Chụp cận lá</li>
              <li>Đủ ánh sáng</li>
              <li>Không bị che</li>
              <li>Nền đơn giản</li>
            </ul>
          }
        />
      ) : null}

      {showServiceUnavailableCard ? (
        <AlertOnlyCard
          title="Hệ thống AI đang tạm thời không khả dụng."
          tone="orange"
          icon={<AlertCircle size={22} />}
          body={<p className="mt-3 leading-7">Vui lòng thử lại sau.</p>}
        />
      ) : null}

      {showSuccessView ? (
        <article className="panel p-7 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#faf3d6] px-3 py-1 text-xs font-bold text-[#7b6015]">
                  <BadgeCheck size={14} />
                  Báo cáo chẩn đoán
                </div>
                {treeCode ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d0dbd0] bg-[#f0f6f0] px-3 py-1 text-xs font-bold text-[#2E5A44]">
                    🌳 Cây: {treeCode}
                  </div>
                ) : null}
              </div>
              <h2 className="mt-4 text-[1.6rem] font-extrabold tracking-tight text-neutral-900">
                {diagnosisLabel}
              </h2>
              <p className="mt-3 text-[14px] leading-7 text-neutral-500">
                {report?.result.recommendation?.diseaseSummary
                  ? translateDiagnosisText(report.result.recommendation.diseaseSummary)
                  : " "}
              </p>
            </div>

            {report?.result.image?.url ? (
              <div className="flex flex-wrap gap-3">
                <a
                  href={report.result.image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] bg-white px-4 py-3 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
                >
                  <ExternalLink size={16} />
                  Mở tab mới
                </a>
                <a
                  href={report.result.image.url}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] bg-white px-4 py-3 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
                >
                  <Download size={16} />
                  Tải xuống
                </a>
              </div>
            ) : null}
          </div>

          {/* Category-based alert banner */}
          {report ? (() => {
            const cat = getDiseaseCategory(report.result.predictedDisease);
            const msg = getDiseaseAlertMessage(report.result.predictedDisease);
            const styles =
              cat === "HEALTHY"
                ? "border border-green-100 bg-green-50 text-green-800"
                : cat === "PEST"
                  ? "border border-amber-100 bg-amber-50 text-amber-900"
                  : "border border-red-100 bg-red-50 text-red-800";
            return (
              <div className={`mt-4 rounded-xl px-4 py-3 text-[13px] font-semibold leading-6 ${styles}`}>
                {msg}
              </div>
            );
          })() : null}

          {/* Save to tree — shown only when a treeId was passed via URL */}
          {treeId ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#d8e1d8] bg-[#f8fbf8] px-4 py-3">
              <span className="text-xs font-bold text-neutral-500">
                {treeCode ? `Lưu kết quả vào hồ sơ cây ${treeCode}` : "Lưu kết quả vào hồ sơ cây"}
              </span>
              {treeSaveState === "saved" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  <BadgeCheck size={13} /> {treeCode ? `Đã lưu kết quả cho cây ${treeCode}` : "Đã lưu thành công"}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={treeSaveState === "saving"}
                  onClick={() => { void handleSaveToTree(report); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#254d3a] disabled:opacity-60"
                >
                  {treeSaveState === "saving" ? (
                    <><LoaderCircle size={13} className="animate-spin" /> Đang lưu...</>
                  ) : (
                    <><BadgeCheck size={13} /> Lưu chuẩn đoán</>
                  )}
                </button>
              )}
              {treeSaveState === "error" && treeSaveError ? (
                <span className="text-xs text-red-600">{treeSaveError}</span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6">
            <DiagnosisImagePanel
              originalUrl={originalImageUrl}
              diagnosisUrl={diagnosisImageUrl}
              zoom={zoom}
              onZoomChange={setZoom}
              onFullscreen={() => {
                if (diagnosisImageUrl) setViewerMode("fullscreen");
              }}
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <ReportStatCard icon={<Sprout size={18} />} title="Độ tin cậy" value={confidenceLabel} />
            <ReportStatCard icon={<ShieldCheck size={18} />} title="Mức độ" value={formatSeverity(report.result.recommendation?.severity)} />
          </div>

          <div className="mt-6 grid gap-4">
            {report.result.recommendation?.diseaseSummary ? (
              <TextSection
                title="Mô tả"
                icon={<BookOpen size={18} />}
                content={translateDiagnosisText(report.result.recommendation.diseaseSummary)}
              />
            ) : null}

            {report.result.recommendation?.symptoms?.length ? (
              <CollapsibleSection
                title="Dấu hiệu"
                icon={<AlertCircle size={18} />}
                defaultOpen
              >
                <BulletList items={translateKnowledgeItems(report.result.recommendation.symptoms)} />
              </CollapsibleSection>
            ) : null}

            {report.result.recommendation?.causes?.length ? (
              <CollapsibleSection title="Nguyên nhân" icon={<FlaskConical size={18} />}>
                <BulletList items={translateKnowledgeItems(report.result.recommendation.causes)} />
              </CollapsibleSection>
            ) : null}

            {report.result.recommendation?.biologicalTreatments?.length ? (
              <CollapsibleSection title="Biện pháp sinh học" icon={<Sprout size={18} />}>
                <BulletList items={translateChemicalItems(report.result.recommendation.biologicalTreatments)} />
              </CollapsibleSection>
            ) : null}

            {report.result.recommendation?.chemicalTreatments?.length ? (
              <CollapsibleSection title="Biện pháp hóa học" icon={<ShieldCheck size={18} />}>
                <BulletList items={translateChemicalTreatmentItems(report.result.recommendation.chemicalTreatments)} />
              </CollapsibleSection>
            ) : null}

            {(report.result.recommendation?.prevention?.length || hasDecisionSupport) ? (
              <CollapsibleSection title="Khuyến nghị" icon={<BadgeCheck size={18} />} defaultOpen>
                <div className="space-y-4">
                  {report.result.recommendation?.favorableConditions ? (
                    <TextSection
                      title="Điều kiện thuận lợi"
                      icon={<BookOpen size={18} />}
                      content={translateDiagnosisText(report.result.recommendation.favorableConditions)}
                    />
                  ) : null}

                  {report.result.decisionSupport?.immediateActions?.length ? (
                    <SubBlock title="Việc cần làm ngay">
                      <BulletList items={translateStringItems(report.result.decisionSupport.immediateActions)} />
                    </SubBlock>
                  ) : null}

                  {report.result.decisionSupport?.monitoringPlan?.length ? (
                    <SubBlock title="Theo dõi">
                      <BulletList items={translateStringItems(report.result.decisionSupport.monitoringPlan)} />
                    </SubBlock>
                  ) : null}

                  {report.result.decisionSupport?.biologicalPlan?.length ? (
                    <SubBlock title="Biện pháp sinh học">
                      <BulletList items={translateStringItems(report.result.decisionSupport.biologicalPlan)} />
                    </SubBlock>
                  ) : null}

                  {report.result.decisionSupport?.chemicalPlan?.length ? (
                    <SubBlock title="Biện pháp hóa học">
                      <BulletList items={translateStringItems(report.result.decisionSupport.chemicalPlan)} />
                    </SubBlock>
                  ) : null}

                  {report.result.decisionSupport?.exportReadiness?.length ? (
                    <SubBlock title="Thời gian cách ly an toàn">
                      <BulletList items={translateStringItems(report.result.decisionSupport.exportReadiness)} />
                    </SubBlock>
                  ) : null}
                </div>
              </CollapsibleSection>
            ) : null}

            {report.result.recommendation?.references?.length ? (
              <CollapsibleSection title="Nguồn tham khảo" icon={<BookOpen size={18} />}>
                <ReferenceList references={report.result.recommendation.references} />
              </CollapsibleSection>
            ) : null}
          </div>
        </article>
      ) : null}

      {showSuccessView ? (
        <article className="panel p-7 lg:p-8">
          <div className="flex items-center gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
              <FileImage size={22} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900">Lịch sử chẩn đoán</h2>
              <p className="mt-1 text-[13px] leading-6 text-neutral-500">
                Mỗi bản ghi lưu lại ảnh, ngày chẩn đoán, tên bệnh và độ tin cậy để mở lại nhanh.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {history.length === 0 ? (
              <p className="rounded-2xl border border-[#e3e9e3] bg-[#fafcf9] px-4 py-5 text-[13px] text-neutral-500">
                Chưa có lượt chẩn đoán nào.
              </p>
            ) : (
              history.map((item) => {
                const thumbnail = item.result.image?.url ?? item.previewUrl;
                const title = formatDiseaseLabel(item.result.predictedDisease);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => reopenReport(item)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-[#e3e9e3] bg-white p-4 text-left transition hover:border-[#b8c7b9] hover:shadow-sm"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-[#e8eee8] bg-[#f5f8f5]">
                      {thumbnail ? (
                        <Image
                          src={thumbnail}
                          alt={`Ảnh chẩn đoán ${title}`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[#2E5A44]">
                          <FileImage size={20} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <b className="block truncate text-sm text-neutral-900">{item.fileName}</b>
                          <small className="mt-1 block text-xs text-neutral-500">
                            {formatDateTime(item.createdAt)}
                          </small>
                        </div>
                        <span className="rounded-full bg-[#edf3ee] px-3 py-1.5 text-xs font-bold text-[#2E5A44]">
                          {title}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] text-neutral-500">
                        Độ tin cậy: {formatConfidence(item.result.confidenceText || item.result.confidenceLabel)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </article>
      ) : null}

      {viewerMode === "fullscreen" && diagnosisImageUrl ? (
        <FullscreenViewer
          imageUrl={diagnosisImageUrl}
          title={diagnosisLabel || "Ảnh chẩn đoán"}
          onClose={() => setViewerMode(null)}
        />
      ) : null}
    </section>
  );
}

// ── ESP32-CAM live preview ────────────────────────────────────────────────────
// Self-contained: owns polling loop, blob lifecycle, error/retry, play/pause.

const LIVE_POLL_MS = 4_000; // matches backend CACHE_TTL — no benefit polling faster

function Esp32LivePreview({
  deviceId,
  disabled,
  onCameraError,
}: {
  deviceId: string;
  disabled: boolean;
  onCameraError: (hasError: boolean) => void;
}) {
  const [liveUrl, setLiveUrl]       = useState<string | null>(null);
  const [paused, setPaused]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lastAt, setLastAt]         = useState<number | null>(null);
  const [initializing, setInit]     = useState(true);

  const inFlightRef = useRef(false);
  const blobUrlRef  = useRef<string | null>(null);

  // Notify parent when camera error state changes
  useEffect(() => { onCameraError(error !== null); }, [error, onCameraError]);

  // Reset everything when the selected device changes
  useEffect(() => {
    setLiveUrl(null);
    setError(null);
    setLastAt(null);
    setInit(true);
    inFlightRef.current = false;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, [deviceId]);

  // Release last blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const fetchFrame = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const url = await cameraClient.fetchSnapshotBlob(deviceId);
      // Atomically swap blob URL and revoke the previous one
      setLiveUrl((prev) => {
        if (prev && prev === blobUrlRef.current) URL.revokeObjectURL(prev);
        blobUrlRef.current = url;
        return url;
      });
      setError(null);
      setLastAt(Date.now());
      setInit(false);
    } catch {
      setError("Không thể kết nối đến Camera. Vui lòng kiểm tra nguồn điện hoặc kết nối Wi-Fi.");
      setInit(false);
    } finally {
      inFlightRef.current = false;
    }
  }, [deviceId]);

  // Start/stop the polling loop
  useEffect(() => {
    if (paused || disabled) return;
    void fetchFrame();
    const timer = setInterval(() => void fetchFrame(), LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [fetchFrame, paused, disabled]);

  const isLive = !paused && !disabled && !error && liveUrl !== null;

  const retry = () => {
    setError(null);
    setInit(true);
    void fetchFrame();
  };

  return (
    <div>
      {/* 16:9 camera viewport */}
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-neutral-900 shadow-inner">

        {/* Frame image */}
        {liveUrl ? (
          <img src={liveUrl} alt="ESP32-CAM live" className="h-full w-full object-cover" />
        ) : null}

        {/* Initialising shimmer */}
        {initializing && !error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900">
            <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-[12px] text-neutral-400">Đang kết nối camera...</p>
          </div>
        ) : null}

        {/* Error overlay */}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-900/95 px-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-red-900/40 text-red-400">
              <CameraOff size={28} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-neutral-200">Camera không phản hồi</p>
              <p className="mt-1 max-w-[260px] text-[11px] leading-5 text-neutral-400">{error}</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-white/20"
            >
              <RefreshCw size={13} />
              Thử kết nối lại
            </button>
          </div>
        ) : null}

        {/* AI-analysis overlay — shown when parent is running prediction */}
        {disabled && !error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
            <div className="size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="text-[13px] font-bold text-white">Đang phân tích bệnh bằng AI...</p>
            <p className="text-[11px] text-white/60">Vui lòng chờ kết quả</p>
          </div>
        ) : null}

        {/* LIVE badge */}
        {isLive ? (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Live</span>
          </div>
        ) : null}

        {/* Paused indicator */}
        {paused && !disabled && liveUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="rounded-2xl bg-black/50 px-5 py-3 backdrop-blur-sm">
              <p className="text-[13px] font-bold text-white">⏸ Đã tạm dừng</p>
            </div>
          </div>
        ) : null}

        {/* Last-update timestamp */}
        {lastAt && !disabled ? (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[10px] text-white/70">
              {new Date(lastAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </span>
          </div>
        ) : null}
      </div>

      {/* Controls row below frame */}
      <div className="mt-2 flex items-center justify-between px-1">
        {error ? (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2E5A44] transition hover:underline"
          >
            <RefreshCw size={12} />
            Thử kết nối lại
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-700 disabled:opacity-40"
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "Tiếp tục phát" : "Tạm dừng"}
          </button>
        )}
        <span
          className={`text-[11px] font-medium ${
            error ? "text-red-500" : isLive ? "text-[#4b9666]" : "text-neutral-400"
          }`}
        >
          {error ? "⚠ Mất kết nối" : isLive ? "● Đang phát sóng" : paused ? "○ Đã tạm dừng" : "○ Chờ..."}
        </span>
      </div>
    </div>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e3e9e3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#f6f8f5] text-[#2E5A44]">
          {icon}
        </span>
        <span className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{label}</p>
          <b className="mt-1 block truncate text-[15px] text-neutral-900">{value}</b>
        </span>
      </div>
    </div>
  );
}

function ReportStatCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#e3e9e3] bg-[#fafcf9] p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
          {icon}
        </span>
        <span>
          <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{title}</p>
          <b className="mt-1 block text-[18px] text-neutral-900">{value}</b>
        </span>
      </div>
    </div>
  );
}

function DiagnosisImagePanel({
  originalUrl,
  diagnosisUrl,
  zoom,
  onZoomChange,
  onFullscreen,
}: {
  originalUrl: string | null;
  diagnosisUrl: string | null;
  zoom: number;
  onZoomChange: (value: number) => void;
  onFullscreen: () => void;
}) {
  const showComparison = Boolean(originalUrl && diagnosisUrl);

  return (
    <div className="rounded-[28px] border border-[#e3e9e3] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[1.4px] text-neutral-400">Ảnh đã chẩn đoán</p>
          <h3 className="mt-2 text-[18px] font-extrabold tracking-tight text-neutral-900">
            Ảnh gốc và ảnh chẩn đoán
          </h3>
          <p className="mt-2 text-[13px] leading-6 text-neutral-500">
            Khi có ảnh chẩn đoán từ hệ thống, bạn có thể xem, tải xuống, mở rộng toàn màn hình và
            so sánh với ảnh gốc đã chọn.
          </p>
        </div>

        {diagnosisUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton href={diagnosisUrl} label="Mở tab mới" icon={<ExternalLink size={16} />} />
            <ActionButton href={diagnosisUrl} label="Tải xuống" icon={<Download size={16} />} />
            <button
              type="button"
              onClick={onFullscreen}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] bg-white px-3 py-2 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
            >
              <Maximize2 size={16} />
              Toàn màn hình
            </button>
          </div>
        ) : null}
      </div>

      {showComparison ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ImageFrame
            title="Ảnh gốc"
            subtitle="Ảnh người dùng đã upload"
            imageUrl={originalUrl!}
            accent="bg-[#edf3ee] text-[#2E5A44]"
          />
          <div className="space-y-4">
            <ImageFrame
              title="Ảnh chẩn đoán"
              subtitle="Ảnh được hệ thống trả về"
              imageUrl={diagnosisUrl!}
              accent="bg-[#faf3d6] text-[#7b6015]"
            />
            <div className="rounded-2xl border border-[#e3e9e3] bg-[#fafcf9] p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-[#2E5A44] shadow-sm">
                  <ZoomIn size={18} />
                </span>
                <span>
                  <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">Phóng to ảnh</p>
                  <b className="mt-1 block text-[15px] text-neutral-900">{zoom}%</b>
                </span>
              </div>
              <input
                type="range"
                min={80}
                max={180}
                step={5}
                value={zoom}
                onChange={(event) => onZoomChange(Number(event.target.value))}
                className="mt-4 w-full accent-[#2E5A44]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[22px] border border-dashed border-[#d8e1d8] bg-[#fafcf9] p-5 text-sm leading-7 text-neutral-500">
          {originalUrl ? (
            <ImageFrame
              title="Ảnh gốc"
              subtitle="Ảnh người dùng đã upload"
              imageUrl={originalUrl}
              accent="bg-[#edf3ee] text-[#2E5A44]"
            />
          ) : (
            "Chưa có ảnh để hiển thị."
          )}
        </div>
      )}
    </div>
  );
}

function ImageFrame({
  title,
  subtitle,
  imageUrl,
  accent,
}: {
  title: string;
  subtitle: string;
  imageUrl: string;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e3e9e3] bg-white shadow-sm">
      <div className={`flex items-center gap-3 border-b border-[#edf1ec] px-4 py-3 ${accent}`}>
        <span className="grid size-9 place-items-center rounded-xl bg-white/85 text-current shadow-sm">
          <Camera size={16} />
        </span>
        <span>
          <p className="text-xs font-bold uppercase tracking-[1.2px] text-current/75">{title}</p>
          <b className="mt-1 block text-[13px] font-bold text-neutral-900">{subtitle}</b>
        </span>
      </div>
      <div className="relative min-h-[260px] bg-[#f7faf7]">
        <Image src={imageUrl} alt={title} fill unoptimized className="object-contain" />
      </div>
    </div>
  );
}

function AlertOnlyCard({
  title,
  body,
  icon,
  tone,
}: {
  title: string;
  body: ReactNode;
  icon: ReactNode;
  tone: "amber" | "orange";
}) {
  const classes =
    tone === "amber"
      ? "border-amber-100 bg-amber-50 text-amber-900"
      : "border-orange-100 bg-orange-50 text-orange-900";

  return (
    <article className={`panel p-7 lg:p-8 ${classes}`}>
      <div className="flex items-center gap-4">
        <span
          className={`grid size-11 place-items-center rounded-xl ${
            tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700"
          }`}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-[15px] font-bold">{title}</h2>
          <p className="mt-1 text-[13px] leading-6 opacity-80">
            {tone === "amber"
              ? "Không có kết quả chẩn đoán nào được hiển thị."
              : "Kết quả chẩn đoán tạm thời chưa khả dụng."}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[20px] border border-current/10 bg-white/70 p-5 text-sm leading-7">
        {body}
      </div>
    </article>
  );
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-[24px] border border-[#e3e9e3] bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#f6f8f5] text-[#2E5A44]">
            {icon}
          </span>
          <span className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{title}</p>
          </span>
        </div>
        <ChevronDown className="size-5 shrink-0 text-neutral-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-[#edf1ec] px-5 py-5">{children}</div>
    </details>
  );
}

function SubBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#eef2ed] bg-[#fafcf9] p-4">
      <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TextSection({
  title,
  icon,
  content,
}: {
  title: string;
  icon: ReactNode;
  content: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#e3e9e3] bg-[#fafcf9] p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{title}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-neutral-700">{content}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3">
          <span className="mt-2 size-2.5 shrink-0 rounded-full bg-[#2E5A44]" />
          <span className="text-sm leading-7 text-neutral-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ReferenceList({
  references,
}: {
  references?: ReferenceSourceSummary[] | null;
}) {
  if (!references || references.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {references.map((reference, index) => (
        <article
          key={`${reference.sourceCode}-${index}`}
          className="rounded-2xl border border-[#eef2ed] bg-[#fafcf9] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-neutral-900">
                {translateDiagnosisText(reference.sourceName || reference.publicationTitle || "Tài liệu tham khảo")}
              </p>
              {reference.publicationTitle ? (
                <p className="mt-1 text-sm leading-7 text-neutral-600">
                  {translateDiagnosisText(reference.publicationTitle)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm leading-7 text-neutral-600">
            {reference.publisher ? <p>{translateDiagnosisText(reference.publisher)}</p> : null}
            {reference.publicationYear ? <p>Năm xuất bản: {reference.publicationYear}</p> : null}
            {reference.notes ? <p>{translateDiagnosisText(reference.notes)}</p> : null}
          </div>

          {reference.url ? (
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#2E5A44] underline decoration-[#2E5A4430] underline-offset-4"
            >
              <ExternalLink size={14} />
              Mở tài liệu
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ActionButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] bg-white px-3 py-2 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
    >
      {icon}
      {label}
    </a>
  );
}

function FullscreenViewer({
  imageUrl,
  title,
  onClose,
}: {
  imageUrl: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-6xl rounded-[28px] bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#edf1ec] px-2 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">Ảnh chẩn đoán</p>
            <b className="mt-1 block text-[15px] text-neutral-900">{title}</b>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#d8e1d8] bg-white px-3 py-2 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
          >
            Đóng
          </button>
        </div>
        <div className="relative mt-4 min-h-[70vh] rounded-[22px] bg-[#f7faf7]">
          <Image src={imageUrl} alt={title} fill unoptimized className="object-contain" />
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(
  errorKind: PredictionErrorKind | null,
  loading: boolean,
  report: ReportSnapshot | null,
) {
  if (loading) return "Đang phân tích ảnh";
  if (report) return "Đã có kết quả";
  if (errorKind === "invalid-image") return "Không phát hiện lá sầu riêng";
  if (errorKind === "service-unavailable") return "Tạm thời không khả dụng";
  if (errorKind === "general") return "Đang cập nhật";
  return "Chưa xử lý";
}

function formatDiseaseLabel(value: string) {
  const normalized = normalizeDiseaseKey(value);
  return diseaseLabels[value] ?? diseaseLabels[normalized] ?? translateDiagnosisText(value);
}

function formatSeverity(value?: string | null) {
  if (!value) return "Đang cập nhật";
  const normalized = value.trim().toUpperCase();
  if (normalized === "LOW") return "Thấp";
  if (normalized === "MEDIUM") return "Trung bình";
  if (normalized === "HIGH") return "Cao";
  if (normalized === "CRITICAL") return "Rất cao";
  return translateDiagnosisText(value);
}

function formatConfidence(value?: string | null) {
  if (!value) return "Chưa có dữ liệu";
  return value.includes("%") ? value : `${value}%`;
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function translateKnowledgeItems(items?: KnowledgeLineItem[] | null) {
  return (items ?? [])
    .map((item) => translateDiagnosisText(item.text))
    .filter((item) => item.trim().length > 0);
}

function translateStringItems(items?: string[] | null) {
  return (items ?? [])
    .map((item) => translateDiagnosisText(item))
    .filter((item) => item.trim().length > 0);
}

function translateChemicalItems(items?: KnowledgeLineItem[] | null) {
  return (items ?? [])
    .map((item) => translateDiagnosisText(item.text))
    .filter((item) => item.trim().length > 0);
}

function translateChemicalTreatmentItems(items?: { treatmentText: string }[] | null) {
  return (items ?? [])
    .map((item) => translateDiagnosisText(item.treatmentText))
    .filter((item) => item.trim().length > 0);
}

function translateDiagnosisText(value: string) {
  return translateRecommendation(value);
}

function normalizeDiseaseKey(value: string) {
  return value.replace(/[-\s]/g, "_");
}

function classifyPredictionFailure(cause: unknown): {
  kind: PredictionErrorKind;
  message: string;
} {
  if (!(cause instanceof AiApiError)) {
    return {
      kind: "general",
      message: "Không thể chẩn đoán ảnh. Vui lòng thử lại sau.",
    };
  }

  const message = getApiMessage(cause);
  const normalized = normalizeText(message);

  if (cause.status === 422) {
    if (isInvalidLeafImageMessage(normalized)) {
      return {
        kind: "invalid-image",
        message: "Ảnh chưa phù hợp để chẩn đoán.",
      };
    }

    return {
      kind: "invalid-image",
      message: "Ảnh chưa phù hợp để chẩn đoán.",
    };
  }

  if (cause.status === 500 || cause.status === 502 || cause.status === 503) {
    return {
      kind: "service-unavailable",
      message: "Hệ thống AI đang tạm thời không khả dụng. Vui lòng thử lại sau.",
    };
  }

  return {
    kind: "general",
    message: "Không thể chẩn đoán ảnh. Vui lòng thử lại sau.",
  };
}

function getApiMessage(cause: AiApiError) {
  const candidates = [
    readString(cause.body?.message),
    readString(cause.body?.error),
    readString(extractFastApiDetail(cause.body?.detail)),
    readString(cause.message),
  ];

  return candidates.find(Boolean) ?? "";
}

function extractFastApiDetail(detail: unknown) {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!isRecord(item)) return "";
        const message = readString(item.msg ?? item.message ?? item.detail);
        if (!message) return "";
        const location = Array.isArray(item.loc) ? item.loc.at(-1) : null;
        const field = readString(location);
        return field ? `${field}: ${message}` : message;
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
    "khong phat hien",
    "không phát hiện",
    "khong ro",
    "không rõ",
  ];

  return invalidTerms.some((term) => normalized.includes(term));
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getSourceLabel(value: PredictionSource) {
  if (value === "MOBILE") return "Di động";
  if (value === "IOT_CAMERA") return "Camera IoT";
  return "Web";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}


