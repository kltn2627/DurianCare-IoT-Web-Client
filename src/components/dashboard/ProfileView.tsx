"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  Check,
  LoaderCircle,
  Mail,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Sprout,
  Trees,
  X,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cultivationClient } from "@/lib/cultivation/client";
import type { CultivationZone, FarmOption } from "@/lib/cultivation/types";
import { friendlyApiMessage, validateAddress, validateBio, validateDateOfBirth, validatePhoneNumber, validateProfileFullName, validateProvinceCity } from "@/lib/feedback";
import { profileClient, ProfileApiError } from "@/lib/profile/client";
import type { ProfileGender, ProfileRecord, ProfileUpdateRequest } from "@/lib/profile/types";

type ProfileFormState = {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: ProfileGender;
  address: string;
  provinceCity: string;
  bio: string;
};

type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

const GENDER_OPTIONS: Array<{ value: ProfileGender; label: string }> = [
  { value: "", label: "Chọn giới tính" },
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

function formatDate(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAccountStatus(status?: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized.includes("ACTIVE")) return "Đang hoạt động";
  if (normalized.includes("PENDING")) return "Chờ xác minh";
  if (normalized.includes("BLOCK")) return "Bị khoá";
  return status || "Chưa cập nhật";
}

function initialsFromName(name?: string | null) {
  if (!name) return "DC";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function emptyValue(value?: string | null) {
  return value?.trim() ? value : "Chưa cập nhật";
}

const growthStageLabels: Record<string, string> = {
  SEEDLING: "Cây con",
  VEGETATIVE: "Sinh trưởng",
  FLOWERING: "Ra hoa",
  FRUITING: "Nuôi trái",
  PRODUCTIVE: "Đang thu hoạch",
  RENOVATION: "Cải tạo",
};

function farmLabel(farm: FarmOption) {
  return farm.name || farm.code || "Trang trại chưa đặt tên";
}

function zoneAge(plantingDate?: string | null) {
  if (!plantingDate) return "Chưa rõ tuổi";
  const planted = new Date(`${plantingDate}T00:00:00`);
  if (Number.isNaN(planted.getTime())) return "Chưa rõ tuổi";
  const now = new Date();
  let months = (now.getFullYear() - planted.getFullYear()) * 12 + now.getMonth() - planted.getMonth();
  if (now.getDate() < planted.getDate()) months -= 1;
  if (months < 0) return "Ngày trồng chưa hợp lệ";
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (!years) return `${Math.max(restMonths, 0)} tháng tuổi`;
  return restMonths ? `${years} năm ${restMonths} tháng` : `${years} năm`;
}

function areaText(zone: CultivationZone) {
  const unit = zone.areaUnit === "HECTARE" ? "ha" : "m2";
  return `${zone.areaValue} ${unit}`;
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-[28px] border border-neutral-100 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <div className="size-24 rounded-[28px] bg-neutral-200" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-40 rounded-full bg-neutral-200" />
            <div className="h-8 w-72 rounded-full bg-neutral-200" />
            <div className="h-4 w-56 rounded-full bg-neutral-200" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="animate-pulse rounded-[24px] border border-neutral-100 bg-white p-6">
            <div className="h-4 w-24 rounded-full bg-neutral-200" />
            <div className="mt-3 h-8 w-32 rounded-full bg-neutral-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="animate-pulse rounded-[28px] border border-neutral-100 bg-white p-6">
          <div className="h-5 w-40 rounded-full bg-neutral-200" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-12 rounded-xl bg-neutral-100" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="animate-pulse rounded-[28px] border border-neutral-100 bg-white p-6">
            <div className="h-5 w-36 rounded-full bg-neutral-200" />
            <div className="mt-4 h-40 rounded-[24px] bg-neutral-100" />
          </div>
          <div className="animate-pulse rounded-[28px] border border-neutral-100 bg-white p-6">
            <div className="h-5 w-28 rounded-full bg-neutral-200" />
            <div className="mt-4 h-28 rounded-[24px] bg-neutral-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileView() {
  const { refreshSession } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [zones, setZones] = useState<CultivationZone[]>([]);
  const [draft, setDraft] = useState<ProfileFormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gardenLoading, setGardenLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [error, setError] = useState<string | null>(null);
  const [gardenError, setGardenError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProfileFormState, string>>>(
    {},
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const result = await profileClient.me();
      setProfile(result);
      setDraft({
        fullName: result.fullName ?? "",
        phoneNumber: result.phoneNumber ?? "",
        dateOfBirth: result.dateOfBirth ?? "",
        gender: (result.gender ?? "") as ProfileGender,
        address: result.address ?? "",
        provinceCity: result.provinceCity ?? "",
        bio: result.bio ?? "",
      });
      setError(null);
    } catch (cause) {
      setProfile(null);
      setDraft(null);
      setError(
        friendlyApiMessage(
          cause instanceof ProfileApiError
            ? { status: cause.status, message: cause.message }
            : null,
          "general",
          "Không thể tải hồ sơ cá nhân.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadGardenInfo = async () => {
    setGardenLoading(true);
    setGardenError(null);
    try {
      const [nextFarms, nextZones] = await Promise.all([
        cultivationClient.listFarms().catch(() => []),
        cultivationClient.listCultivationZones().catch(() => []),
      ]);
      setFarms(nextFarms);
      setZones(nextZones);
    } catch {
      setGardenError("Không thể tải thông tin nhà vườn lúc này.");
      setFarms([]);
      setZones([]);
    } finally {
      setGardenLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    void loadGardenInfo();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const validation = useMemo(() => {
    if (!draft) return {};
    return {
      fullName: validateProfileFullName(draft.fullName),
      phoneNumber: validatePhoneNumber(draft.phoneNumber),
      dateOfBirth: validateDateOfBirth(draft.dateOfBirth),
      address: validateAddress(draft.address),
      provinceCity: validateProvinceCity(draft.provinceCity),
      bio: validateBio(draft.bio),
    } satisfies Partial<Record<keyof ProfileFormState, string>>;
  }, [draft]);

  const hasValidationError = useMemo(
    () => Object.values(validation).some(Boolean),
    [validation],
  );

  const refreshCurrentUser = async () => {
    try {
      await refreshSession();
    } catch {
      // Ignore auth context refresh issues here; the profile view remains usable.
    }
  };

  const showToast = (kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 2500);
  };

  const saveProfile = async () => {
    if (!draft) return;
    const nextErrors = {
      fullName: validateProfileFullName(draft.fullName),
      phoneNumber: validatePhoneNumber(draft.phoneNumber),
      dateOfBirth: validateDateOfBirth(draft.dateOfBirth),
      address: validateAddress(draft.address),
      provinceCity: validateProvinceCity(draft.provinceCity),
      bio: validateBio(draft.bio),
    };
    setFormErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      showToast("error", "Vui lòng kiểm tra lại thông tin vừa nhập.");
      return;
    }

    const payload: ProfileUpdateRequest = {
      fullName: draft.fullName.trim(),
    };
    if (draft.phoneNumber.trim()) payload.phoneNumber = draft.phoneNumber.trim();
    if (draft.dateOfBirth.trim()) payload.dateOfBirth = draft.dateOfBirth.trim();
    if (draft.gender) payload.gender = draft.gender;
    if (draft.address.trim()) payload.address = draft.address.trim();
    if (draft.provinceCity.trim()) payload.provinceCity = draft.provinceCity.trim();
    if (draft.bio.trim()) payload.bio = draft.bio.trim();

    setSaving(true);
    try {
      const updated = await profileClient.updateMe(payload);
      setProfile(updated);
      setDraft({
        fullName: updated.fullName ?? "",
        phoneNumber: updated.phoneNumber ?? "",
        dateOfBirth: updated.dateOfBirth ?? "",
        gender: (updated.gender ?? "") as ProfileGender,
        address: updated.address ?? "",
        provinceCity: updated.provinceCity ?? "",
        bio: updated.bio ?? "",
      });
      setEditing(false);
      setFormErrors({});
      showToast("success", "Cập nhật hồ sơ thành công.");
      await refreshCurrentUser();
    } catch (cause) {
      showToast(
        "error",
        friendlyApiMessage(
          cause instanceof ProfileApiError
            ? { status: cause.status, message: cause.message }
            : null,
          "general",
          "Không thể cập nhật hồ sơ lúc này.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = (file?: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showToast("error", "Chỉ hỗ trợ ảnh JPEG hoặc PNG.");
      return;
    }
    setSelectedAvatar(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
  };

  const uploadAvatar = async () => {
    if (!selectedAvatar) return;
    setAvatarSaving(true);
    setAvatarProgress(0);
    try {
      const result = await profileClient.uploadAvatar(selectedAvatar, (progress) => {
        setAvatarProgress(progress);
      });
      if (profile) {
        setProfile({ ...profile, avatarUrl: result.avatarUrl });
      }
      showToast("success", "Ảnh đại diện đã được cập nhật.");
      setSelectedAvatar(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshCurrentUser();
    } catch (cause) {
      showToast(
        "error",
        friendlyApiMessage(
          cause instanceof ProfileApiError
            ? { status: cause.status, message: cause.message }
            : null,
          "general",
          "Không thể tải ảnh đại diện.",
        ),
      );
    } finally {
      setAvatarSaving(false);
      setAvatarProgress(0);
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm("Xoá ảnh đại diện khỏi hồ sơ?")) return;
    setAvatarSaving(true);
    try {
      await profileClient.deleteAvatar();
      if (profile) {
        setProfile({ ...profile, avatarUrl: null });
      }
      showToast("success", "Ảnh đại diện đã được xoá.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setSelectedAvatar(null);
      await refreshCurrentUser();
    } catch (cause) {
      showToast(
        "error",
        friendlyApiMessage(
          cause instanceof ProfileApiError
            ? { status: cause.status, message: cause.message }
            : null,
          "general",
          "Không thể xoá ảnh đại diện.",
        ),
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  const currentAvatar = avatarPreview ?? profile?.avatarUrl ?? null;
  const currentName = draft?.fullName || profile?.fullName || "Người dùng DurianCare";
  const currentInitials = initialsFromName(currentName);
  const farmNameById = useMemo(() => new Map(farms.map((farm) => [farm.id, farmLabel(farm)])), [farms]);
  const gardenSummary = useMemo(() => {
    const varieties = Array.from(new Set(zones.map((zone) => zone.variety).filter(Boolean)));
    const totalTrees = zones.reduce((sum, zone) => sum + (Number(zone.currentTreeCount) || 0), 0);
    const productiveZones = zones.filter((zone) => zone.growthStage === "PRODUCTIVE").length;
    return { varieties, totalTrees, productiveZones };
  }, [zones]);

  if (loading) {
    return <LoadingBlock />;
  }

  if (!profile || !draft) {
    return (
      <div className="panel flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle size={32} className="text-amber-500" />
        <div className="max-w-lg space-y-2">
          <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
            Không tải được hồ sơ cá nhân
          </h2>
          <p className="text-[13px] leading-relaxed text-neutral-500">
            {error ?? "Vui lòng thử tải lại để lấy dữ liệu hồ sơ."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadProfile()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2E5A44] px-5 text-xs font-bold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430]"
        >
          <RotateCcw size={14} />
          Tải lại hồ sơ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`rounded-2xl px-4 py-3 text-[13px] font-semibold ${
            toast.kind === "success"
              ? "border border-[#cfe1d3] bg-[#edf7ef] text-[#39704f]"
              : "border border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {toast.kind === "success" ? <Check size={14} className="mr-2 inline" /> : null}
          {toast.message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid-pattern overflow-hidden rounded-[28px] bg-[#294f3b] p-7 text-white shadow-sm sm:p-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="grid size-24 overflow-hidden rounded-[28px] border-4 border-white/15 bg-[#EED56D] text-[#2E5A44]">
                {currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatar} alt={currentName} className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-2xl font-extrabold">
                    {currentInitials}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-[#294f3b] bg-[#EED56D] text-[#2E5A44]">
                <BadgeCheck size={14} />
              </span>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#EED56D]">
                <ShieldCheck size={12} />
                Hồ sơ cá nhân
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {profile.fullName}
              </h1>
              <p className="text-[13px] leading-relaxed text-[#d5e1d8]">
                {profile.email} • {formatAccountStatus(profile.accountStatus)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[.08] px-4 py-4">
              <small className="text-xs text-[#c8d6cc]">Vai trò</small>
              <b className="mt-1 block text-[15px]">{profile.role}</b>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.08] px-4 py-4">
              <small className="text-xs text-[#c8d6cc]">Trạng thái</small>
              <b className="mt-1 block text-[15px]">{formatAccountStatus(profile.accountStatus)}</b>
            </div>
            <div className="rounded-2xl bg-[#EED56D] px-4 py-4 text-[#294f3b]">
              <small className="text-xs font-semibold">Tạo lúc</small>
              <b className="mt-1 block text-[15px]">{formatDate(profile.createdAt)}</b>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
              <Trees size={21} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-neutral-950">Thông tin nhà vườn</h2>
              <p className="mt-1 max-w-2xl text-[13px] font-medium leading-6 text-neutral-600">
                Tổng hợp khu đất, giống sầu riêng, số cây và tuổi cây từ dữ liệu khu canh tác hiện có.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadGardenInfo()}
            disabled={gardenLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            <RotateCcw size={14} />
            Cập nhật
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Trang trại", value: farms.length, icon: MapPinned },
            { label: "Khu đất", value: zones.length, icon: Trees },
            { label: "Tổng số cây", value: gardenSummary.totalTrees.toLocaleString("vi-VN"), icon: Sprout },
            { label: "Đang thu hoạch", value: gardenSummary.productiveZones, icon: ShieldCheck },
          ].map(({ label, value, icon: MetricIcon }) => (
            <article key={label} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <MetricIcon size={18} className="text-[#2E5A44]" />
              <b className="mt-3 block text-2xl text-neutral-950">{value}</b>
              <span className="mt-1 block text-xs font-bold text-neutral-600">{label}</span>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-neutral-400">Giống đang trồng</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {gardenSummary.varieties.length ? (
              gardenSummary.varieties.map((variety) => (
                <span key={variety} className="rounded-full bg-[#eef6ef] px-3 py-1.5 text-[13px] font-bold text-[#2E5A44]">
                  {variety}
                </span>
              ))
            ) : (
              <span className="text-[13px] font-semibold text-neutral-500">Chưa có dữ liệu giống cây.</span>
            )}
          </div>
        </div>

        {gardenError ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
            {gardenError}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {gardenLoading ? (
            Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-100" />
            ))
          ) : zones.length ? (
            zones.slice(0, 6).map((zone) => (
              <article key={zone.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-neutral-950">{zone.name}</h3>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-600">{farmNameById.get(zone.farmId) ?? "Trang trại"}</p>
                  </div>
                  <span className="rounded-full bg-[#edf3ee] px-3 py-1 text-xs font-bold text-[#2E5A44]">
                    {growthStageLabels[zone.growthStage ?? ""] ?? zone.growthStage ?? "Chưa rõ giai đoạn"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                  <span className="rounded-xl bg-neutral-50 p-3">
                    <small className="block font-bold text-neutral-500">Giống</small>
                    <b className="mt-1 block text-neutral-950">{zone.variety || "Chưa cập nhật"}</b>
                  </span>
                  <span className="rounded-xl bg-neutral-50 p-3">
                    <small className="block font-bold text-neutral-500">Số cây</small>
                    <b className="mt-1 block text-neutral-950">{zone.currentTreeCount.toLocaleString("vi-VN")} cây</b>
                  </span>
                  <span className="rounded-xl bg-neutral-50 p-3">
                    <small className="block font-bold text-neutral-500">Tuổi cây</small>
                    <b className="mt-1 block text-neutral-950">{zoneAge(zone.plantingDate)}</b>
                  </span>
                  <span className="rounded-xl bg-neutral-50 p-3">
                    <small className="block font-bold text-neutral-500">Diện tích</small>
                    <b className="mt-1 block text-neutral-950">{areaText(zone)}</b>
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center lg:col-span-2">
              <MapPinned className="mx-auto text-neutral-300" size={26} />
              <b className="mt-3 block text-sm text-neutral-900">Chưa có khu đất nào</b>
              <p className="mx-auto mt-1 max-w-xl text-[13px] leading-6 text-neutral-500">
                Khi tạo khu canh tác, trang này sẽ hiển thị giống sầu riêng, số cây, tuổi cây và diện tích từng khu.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Email", value: profile.email, icon: Mail },
          { label: "Số điện thoại", value: emptyValue(profile.phoneNumber), icon: Phone },
          { label: "Ngày sinh", value: formatDate(profile.dateOfBirth), icon: CalendarDays },
          {
            label: "Tỉnh / thành phố",
            value: emptyValue(profile.provinceCity),
            icon: MapPin,
          },
        ].map(({ label, value, icon: MetricIcon }) => {
          return (
            <article key={label} className="panel flex items-center gap-4 p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
                <MetricIcon size={18} />
              </span>
              <div>
                <small className="block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {label}
                </small>
                <b className="mt-1 block text-sm text-neutral-900">{value}</b>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <article className="panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-5">
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
                <UserRound size={20} />
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900">
                  Thông tin cá nhân
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Chỉnh sửa các trường cho phép và lưu trực tiếp lên hồ sơ.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200"
            >
              <Pencil size={14} />
              {editing ? "Đóng chỉnh sửa" : "Chỉnh sửa hồ sơ"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ProfileField
              label="Họ và tên"
              value={draft.fullName}
              onChange={(value) => setDraft((current) => (current ? { ...current, fullName: value } : current))}
              error={formErrors.fullName}
              editing={editing}
              required
              maxLength={150}
            />
            <ProfileField
              label="Số điện thoại"
              value={draft.phoneNumber}
              onChange={(value) =>
                setDraft((current) => (current ? { ...current, phoneNumber: value } : current))
              }
              error={formErrors.phoneNumber}
              editing={editing}
              inputMode="tel"
              maxLength={30}
            />
            <ProfileField
              label="Ngày sinh"
              value={draft.dateOfBirth}
              onChange={(value) =>
                setDraft((current) => (current ? { ...current, dateOfBirth: value } : current))
              }
              error={formErrors.dateOfBirth}
              editing={editing}
              type="date"
            />
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                Giới tính
              </span>
              {editing ? (
                <select
                  value={draft.gender}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, gender: event.target.value as ProfileGender } : current,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none transition-all duration-200 focus-visible:border-[#5d856c] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value || "EMPTY"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-[13px] font-semibold text-neutral-900">
                  {emptyValue(
                    GENDER_OPTIONS.find((option) => option.value === draft.gender)?.label,
                  )}
                </div>
              )}
            </label>
            <ProfileField
              label="Địa chỉ"
              value={draft.address}
              onChange={(value) =>
                setDraft((current) => (current ? { ...current, address: value } : current))
              }
              error={formErrors.address}
              editing={editing}
              maxLength={500}
            />
            <ProfileField
              label="Tỉnh / thành phố"
              value={draft.provinceCity}
              onChange={(value) =>
                setDraft((current) => (current ? { ...current, provinceCity: value } : current))
              }
              error={formErrors.provinceCity}
              editing={editing}
              maxLength={150}
            />
          </div>

          <div className="mt-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                Giới thiệu
              </span>
              {editing ? (
                <textarea
                  value={draft.bio}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, bio: event.target.value } : current))
                  }
                  rows={5}
                  maxLength={500}
                  className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[13px] leading-relaxed outline-none transition-all duration-200 focus-visible:border-[#5d856c] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                />
              ) : (
                <div className="rounded-2xl border border-neutral-100 bg-[#f7faf7] px-4 py-4 text-[13px] leading-relaxed text-neutral-700">
                  {emptyValue(profile.bio)}
                </div>
              )}
            </label>
            {formErrors.bio ? <p className="mt-2 text-xs text-red-600">{formErrors.bio}</p> : null}
          </div>

          {editing ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
              <p className="text-xs leading-relaxed text-neutral-500">
                Họ và tên, địa chỉ và giới thiệu sẽ được kiểm tra trước khi gửi lên backend.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft({
                      fullName: profile.fullName ?? "",
                      phoneNumber: profile.phoneNumber ?? "",
                      dateOfBirth: profile.dateOfBirth ?? "",
                      gender: (profile.gender ?? "") as ProfileGender,
                      address: profile.address ?? "",
                      provinceCity: profile.provinceCity ?? "",
                      bio: profile.bio ?? "",
                    });
                    setFormErrors({});
                    setEditing(false);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200"
                >
                  <X size={14} />
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={saving || hasValidationError}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2E5A44] px-5 text-xs font-bold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          ) : null}
        </article>

        <div className="space-y-6">
          <article className="panel p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
                <Sparkles size={20} />
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900">
                  Ảnh đại diện
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Tải ảnh JPEG hoặc PNG. Ảnh mới sẽ được cập nhật ngay sau khi tải lên.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <div className="flex items-center gap-4 rounded-[24px] border border-neutral-100 bg-[#f8faf8] p-4">
                <div className="grid size-24 shrink-0 overflow-hidden rounded-[24px] bg-[#e9f0ea] text-[#2E5A44]">
                  {currentAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentAvatar} alt={currentName} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-2xl font-extrabold">
                      {currentInitials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-[13px] font-semibold text-neutral-700">
                    {selectedAvatar ? selectedAvatar.name : "Chưa chọn tệp ảnh"}
                  </p>
                  <p className="text-xs leading-relaxed text-neutral-500">
                    Hỗ trợ JPG/PNG. Ảnh sẽ đồng bộ với avatar ở thanh điều hướng sau khi lưu.
                  </p>
                  {avatarSaving ? (
                    <div className="space-y-2">
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-[#2E5A44] transition-all duration-200"
                          style={{ width: `${Math.max(8, avatarProgress)}%` }}
                        />
                      </div>
                      <p className="text-xs font-semibold text-[#2E5A44]">
                        Đang tải lên... {avatarProgress}%
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => handleAvatarPick(event.target.files?.[0])}
                className="block w-full text-xs text-neutral-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[#edf3ee] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[#2E5A44] hover:file:bg-[#e2ede4]"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200"
                >
                  <Upload size={14} />
                  Chọn ảnh
                </button>
                <button
                  type="button"
                  onClick={() => void uploadAvatar()}
                  disabled={!selectedAvatar || avatarSaving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {avatarSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
                  Tải ảnh lên
                </button>
                <button
                  type="button"
                  onClick={() => void removeAvatar()}
                  disabled={!profile.avatarUrl || avatarSaving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-100 bg-white px-4 text-xs font-semibold text-red-700 transition-all duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  Xoá ảnh
                </button>
              </div>
            </div>
          </article>

          <article className="panel p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900">
                  Trạng thái tài khoản
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Các trường này chỉ xem, không chỉnh sửa từ giao diện người dùng.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <InfoPill label="Email" value={profile.email} />
              <InfoPill label="Vai trò" value={profile.role} />
              <InfoPill label="Trạng thái" value={formatAccountStatus(profile.accountStatus)} />
              <InfoPill label="Ngày tạo" value={formatDateTime(profile.createdAt)} />
              <InfoPill label="Cập nhật gần nhất" value={formatDateTime(profile.updatedAt)} />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  editing,
  error,
  type = "text",
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  error?: string;
  type?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </span>
      {editing ? (
        <input
          {...props}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[13px] outline-none transition-all duration-200 focus-visible:border-[#5d856c] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
        />
      ) : (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-[13px] font-semibold text-neutral-900">
          {emptyValue(value)}
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </span>
      <b className="max-w-[55%] truncate text-xs text-neutral-900">{value}</b>
    </div>
  );
}
