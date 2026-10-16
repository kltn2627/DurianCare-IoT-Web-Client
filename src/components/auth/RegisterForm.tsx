"use client";

import Link from "next/link";
import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FilePlus2,
  LoaderCircle,
  MailCheck,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { authClient, ClientAuthError } from "@/lib/auth/client";
import type { RegisterRequest } from "@/lib/auth/types";
import {
  friendlyApiMessage,
  normalizeEmail,
  normalizeOtpInput,
  OTP_LENGTH,
  passwordRules,
  passwordStrength,
  validateConfirmPassword,
  validateEmail,
  validateOtp,
  validatePassword,
  validatePhoneNumber,
} from "@/lib/feedback";

const MAX_QUALIFICATION_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_QUALIFICATION_TYPES = ["application/pdf", "image/jpeg", "image/png"];

type RegisterStage = "REGISTER" | "OTP" | "DONE";

type BaseFieldTouched = {
  email: boolean;
  fullName: boolean;
  phoneNumber: boolean;
  password: boolean;
  confirmPassword: boolean;
  workplace: boolean;
  specialization: boolean;
  yearsExperience: boolean;
  biography: boolean;
};

const initialForm: RegisterRequest = {
  email: "",
  password: "",
  fullName: "",
  phoneNumber: "",
  role: "FARMER",
};

export function RegisterForm() {
  const [form, setForm] = useState(initialForm);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stage, setStage] = useState<RegisterStage>("REGISTER");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [qualificationFiles, setQualificationFiles] = useState<File[]>([]);
  const [engineerFields, setEngineerFields] = useState({
    workplace: "",
    specialization: "",
    yearsExperience: "",
    biography: "",
  });
  const [touched, setTouched] = useState<BaseFieldTouched>({
    email: false,
    fullName: false,
    phoneNumber: false,
    password: false,
    confirmPassword: false,
    workplace: false,
    specialization: false,
    yearsExperience: false,
    biography: false,
  });

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (retryAfter <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRetryAfter((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfter]);

  const emailError = useMemo(() => {
    if (!touched.email && !form.email) return "";
    return validateEmail(form.email);
  }, [form.email, touched.email]);

  const fullNameError = useMemo(() => {
    if (!touched.fullName && !form.fullName) return "";
    if (!form.fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (form.fullName.trim().length > 150) return "Họ và tên không được vượt quá 150 ký tự.";
    return "";
  }, [form.fullName, touched.fullName]);

  const phoneError = useMemo(() => {
    if (!touched.phoneNumber && !form.phoneNumber) return "";
    return validatePhoneNumber(form.phoneNumber ?? "");
  }, [form.phoneNumber, touched.phoneNumber]);

  const passwordError = useMemo(() => {
    if (!touched.password && !form.password) return "";
    return validatePassword(form.password);
  }, [form.password, touched.password]);

  const confirmError = useMemo(() => {
    if (!touched.confirmPassword && !confirmPassword) return "";
    return validateConfirmPassword(form.password, confirmPassword);
  }, [confirmPassword, form.password, touched.confirmPassword]);

  const workplaceError = useMemo(() => {
    if (form.role !== "ENGINEER") return "";
    if (!touched.workplace && !engineerFields.workplace) return "";
    if (!engineerFields.workplace.trim()) return "Vui lòng nhập nơi công tác.";
    return "";
  }, [engineerFields.workplace, form.role, touched.workplace]);

  const specializationError = useMemo(() => {
    if (form.role !== "ENGINEER") return "";
    if (!touched.specialization && !engineerFields.specialization) return "";
    if (!engineerFields.specialization.trim()) return "Vui lòng nhập chuyên môn.";
    return "";
  }, [engineerFields.specialization, form.role, touched.specialization]);

  const yearsExperienceError = useMemo(() => {
    if (form.role !== "ENGINEER") return "";
    if (!touched.yearsExperience && !engineerFields.yearsExperience) return "";
    const parsed = Number(engineerFields.yearsExperience);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 60) {
      return "Số năm kinh nghiệm phải từ 0 đến 60.";
    }
    return "";
  }, [engineerFields.yearsExperience, form.role, touched.yearsExperience]);

  const biographyError = useMemo(() => {
    if (form.role !== "ENGINEER") return "";
    if (!touched.biography && !engineerFields.biography) return "";
    if (!engineerFields.biography.trim()) return "Vui lòng nhập giới thiệu chuyên môn.";
    if (engineerFields.biography.trim().length > 2000) {
      return "Giới thiệu không được vượt quá 2000 ký tự.";
    }
    return "";
  }, [engineerFields.biography, form.role, touched.biography]);

  const qualificationError = useMemo(() => {
    if (form.role !== "ENGINEER") return "";
    if (qualificationFiles.length === 0) return "Vui lòng tải lên ít nhất một chứng chỉ hoặc bằng cấp.";
    const invalid = qualificationFiles.find(
      (file) =>
        !ALLOWED_QUALIFICATION_TYPES.includes(file.type) ||
        file.size > MAX_QUALIFICATION_FILE_SIZE,
    );
    if (!invalid) return "";
    if (!ALLOWED_QUALIFICATION_TYPES.includes(invalid.type)) {
      return "Chỉ chấp nhận file PDF, JPG hoặc PNG.";
    }
    return "Mỗi file chứng chỉ không được vượt quá 10MB.";
  }, [form.role, qualificationFiles]);

  const passwordRulesState = useMemo(() => passwordRules(form.password), [form.password]);
  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  const otpValue = otpDigits.join("");
  const hasRegisterErrors =
    Boolean(
      emailError ||
        fullNameError ||
        phoneError ||
        passwordError ||
        confirmError ||
        workplaceError ||
        specializationError ||
        yearsExperienceError ||
        biographyError ||
        qualificationError,
    );

  const setTouchAll = () =>
    setTouched({
      email: true,
      fullName: true,
      phoneNumber: true,
      password: true,
      confirmPassword: true,
      workplace: true,
      specialization: true,
      yearsExperience: true,
      biography: true,
    });

  const showFriendlyError = (cause: unknown, fallback: string, scope: "auth" = "auth") => {
    const message = friendlyApiMessage(
      cause instanceof ClientAuthError
        ? { status: cause.status, message: cause.message }
        : null,
      scope,
      fallback,
    );
    setError(message);
    if (cause instanceof ClientAuthError && cause.retryAfterSeconds) {
      setRetryAfter(cause.retryAfterSeconds);
    }
  };

  const updateField = <K extends keyof RegisterRequest>(key: K, value: RegisterRequest[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const updateEngineerField = <K extends keyof typeof engineerFields>(key: K, value: string) => {
    setEngineerFields((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const startOtpFlow = (message: string) => {
    setNotice(message);
    setStage("OTP");
    setRetryAfter(60);
    window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouchAll();
    setError("");

    const nextErrors = [
      validateEmail(form.email),
      form.fullName.trim() ? "" : "Vui lòng nhập họ và tên.",
      validatePhoneNumber(form.phoneNumber ?? ""),
      validatePassword(form.password),
      validateConfirmPassword(form.password, confirmPassword),
      form.role === "ENGINEER" ? workplaceError : "",
      form.role === "ENGINEER" ? specializationError : "",
      form.role === "ENGINEER" ? yearsExperienceError : "",
      form.role === "ENGINEER" ? biographyError : "",
      form.role === "ENGINEER" ? qualificationError : "",
    ].filter(Boolean);

    if (nextErrors.length > 0) {
      setError(String(nextErrors[0]));
      return;
    }

    setLoading(true);
    try {
      const phoneNumber = form.phoneNumber?.trim() ?? "";
      const basePayload = {
        ...form,
        email: normalizeEmail(form.email),
        fullName: form.fullName.trim(),
        ...(phoneNumber ? { phoneNumber } : {}),
      };

      const result =
        form.role === "ENGINEER"
          ? await authClient.registerEngineer(
              {
                email: basePayload.email,
                password: basePayload.password,
                fullName: basePayload.fullName,
                role: "ENGINEER",
                ...(basePayload.phoneNumber ? { phoneNumber: basePayload.phoneNumber } : {}),
                workplace: engineerFields.workplace.trim(),
                specialization: engineerFields.specialization.trim(),
                yearsExperience: Number(engineerFields.yearsExperience),
                biography: engineerFields.biography.trim(),
              },
              qualificationFiles,
            )
          : await authClient.register(basePayload);

      startOtpFlow(result.message);
    } catch (cause) {
      showFriendlyError(cause, "Đăng ký chưa thành công.");
    } finally {
      setLoading(false);
    }
  };

  const focusOtp = (index: number) => {
    otpRefs.current[index]?.focus();
    otpRefs.current[index]?.select();
  };

  const updateOtpAt = (index: number, nextValue: string) => {
    const digits = normalizeOtpInput(nextValue);
    if (!digits) return;

    const next = [...otpDigits];
    next[index] = digits.slice(-1);
    setOtpDigits(next);
    window.setTimeout(() => focusOtp(Math.min(index + 1, OTP_LENGTH - 1)), 0);
    setError("");
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...otpDigits];
      if (next[index]) {
        next[index] = "";
      } else if (index > 0) {
        next[index - 1] = "";
        window.setTimeout(() => focusOtp(index - 1), 0);
      }
      setOtpDigits(next);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtp(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtp(index + 1);
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = normalizeOtpInput(event.clipboardData.getData("text"));
    if (!pasted) return;

    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? "");
    setOtpDigits(nextDigits);
    window.setTimeout(() => {
      const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      focusOtp(nextIndex);
    }, 0);
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const nextOtpError = validateOtp(otpValue);
    if (nextOtpError) {
      setError(nextOtpError);
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.verifyOtp({
        email: normalizeEmail(form.email),
        otpCode: otpValue,
      });
      setNotice(result.message);
      setStage("DONE");
    } catch (cause) {
      showFriendlyError(cause, "Xác minh OTP chưa thành công.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await authClient.resendOtp(normalizeEmail(form.email));
      setNotice(result.message);
      setRetryAfter(60);
      setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      window.setTimeout(() => focusOtp(0), 0);
    } catch (cause) {
      showFriendlyError(cause, "Không thể gửi lại OTP.");
    } finally {
      setLoading(false);
    }
  };

  if (stage === "DONE") {
    return (
      <div className="w-full max-w-[560px] rounded-[28px] border border-[#dbe5dd] bg-white p-8 shadow-[0_12px_40px_rgba(40,64,48,0.08)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-4 py-1.5 text-xs font-bold tracking-[1px] text-[#2E5A44]">
          <MailCheck size={13} /> Đã xác minh email
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#203329]">
          Tài khoản đã sẵn sàng
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {notice || "Email của bạn đã được xác minh thành công."}
        </p>
        <div className="mt-6 rounded-2xl border border-[#dfe7df] bg-[#f7faf7] px-4 py-3 text-[13px] leading-relaxed text-neutral-600">
          {form.role === "ENGINEER"
            ? "Hồ sơ kỹ sư sẽ chờ quản trị viên duyệt. Bạn có thể theo dõi trạng thái trên màn hình chờ duyệt sau khi đăng nhập."
            : "Bạn có thể chuyển sang màn hình đăng nhập để tiếp tục sử dụng hệ thống."}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#254c39]"
          >
            <ArrowLeft size={16} />
            Đi đến đăng nhập
          </Link>
          <button
            type="button"
            onClick={() => {
              setStage("REGISTER");
              setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
              setNotice("");
              setError("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] px-4 py-3 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
          >
            <RotateCw size={16} />
            Đăng ký tài khoản khác
          </button>
        </div>
      </div>
    );
  }

  if (stage === "OTP") {
    return (
      <div className="w-full max-w-[560px] rounded-[28px] border border-[#dbe5dd] bg-white p-8 shadow-[0_12px_40px_rgba(40,64,48,0.08)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-4 py-1.5 text-xs font-bold tracking-[1px] text-[#2E5A44]">
          <MailCheck size={13} /> Xác minh email
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#203329]">
          Nhập mã OTP
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {notice || "Mã OTP đã được gửi đến email của bạn."}
        </p>

        <form onSubmit={verify} className="mt-6 space-y-5">
          <div className="grid grid-cols-6 gap-2">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  otpRefs.current[index] = element;
                }}
                value={digit}
                onChange={(event) => updateOtpAt(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(event, index)}
                onPaste={handleOtpPaste}
                inputMode="numeric"
                maxLength={1}
                className="h-14 rounded-2xl border border-[#dfe6df] text-center text-lg font-extrabold outline-none transition focus:border-[#5d856c] focus:ring-4 focus:ring-[#e9f0ea]"
              />
            ))}
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-[13px] font-bold text-white transition hover:bg-[#254c39] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : null}
            Xác minh OTP
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-4 text-xs text-neutral-500">
          <span>
            OTP sẽ hết hạn trong 5 phút.{" "}
            {retryAfter > 0 ? `Gửi lại sau ${retryAfter}s` : "Bạn có thể gửi lại OTP nếu cần."}
          </span>
          <button
            type="button"
            onClick={() => void resend()}
            disabled={loading || retryAfter > 0}
            className="font-bold text-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Gửi lại OTP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] rounded-[28px] border border-[#dbe5dd] bg-white p-8 shadow-[0_12px_40px_rgba(40,64,48,0.08)]">
      <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-4 py-1.5 text-xs font-bold tracking-[1px] text-[#2E5A44]">
        <ShieldCheck size={13} /> Tài khoản DurianCare
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#203329]">Tạo tài khoản mới</h1>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        Đăng ký dành cho chủ vườn hoặc kỹ sư. Kỹ sư cần nộp thêm hồ sơ chuyên môn và chứng chỉ.
      </p>

      <form onSubmit={register} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
          {(["FARMER", "ENGINEER"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => updateField("role", role)}
              className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] ${
                form.role === role
                  ? "bg-white text-[#2E5A44] shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {role === "FARMER" ? "Chủ vườn" : "Kỹ sư"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Họ và tên"
            value={form.fullName}
            onChange={(value) => updateField("fullName", value)}
            onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
            autoComplete="name"
            maxLength={150}
            required
            error={fullNameError}
            touched={touched.fullName}
          />
          <TextField
            label="Số điện thoại"
            value={form.phoneNumber ?? ""}
            onChange={(value) => updateField("phoneNumber", value)}
            onBlur={() => setTouched((current) => ({ ...current, phoneNumber: true }))}
            autoComplete="tel"
            maxLength={30}
            inputMode="tel"
            pattern="^[0-9+() .\\-]{8,30}$"
            error={phoneError}
            touched={touched.phoneNumber}
          />
        </div>

        <TextField
          label="Email"
          value={form.email}
          onChange={(value) => updateField("email", value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          type="email"
          autoComplete="email"
          maxLength={320}
          required
          error={emailError}
          touched={touched.email}
        />

        {form.role === "ENGINEER" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Nơi công tác"
              value={engineerFields.workplace}
              onChange={(value) => updateEngineerField("workplace", value)}
              onBlur={() => setTouched((current) => ({ ...current, workplace: true }))}
              maxLength={255}
              required
              error={workplaceError}
              touched={touched.workplace}
            />
            <TextField
              label="Chuyên môn"
              value={engineerFields.specialization}
              onChange={(value) => updateEngineerField("specialization", value)}
              onBlur={() => setTouched((current) => ({ ...current, specialization: true }))}
              maxLength={255}
              required
              error={specializationError}
              touched={touched.specialization}
            />
            <TextField
              label="Số năm kinh nghiệm"
              value={engineerFields.yearsExperience}
              onChange={(value) => updateEngineerField("yearsExperience", value)}
              onBlur={() => setTouched((current) => ({ ...current, yearsExperience: true }))}
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              required
              error={yearsExperienceError}
              touched={touched.yearsExperience}
            />
            <FileField
              label="Chứng chỉ / bằng cấp"
              files={qualificationFiles}
              onChange={(files) => {
                setQualificationFiles(files);
                setError("");
              }}
              error={qualificationError}
            />
          </div>
        ) : null}

        <PasswordField
          label="Mật khẩu"
          value={form.password}
          onChange={(value) => updateField("password", value)}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
          visible={showPassword}
          toggleVisible={() => setShowPassword((current) => !current)}
          autoComplete="new-password"
          error={passwordError}
          touched={touched.password}
          helper={
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-neutral-500">Độ mạnh mật khẩu</span>
                  <span className="text-xs font-bold text-[#2E5A44]">{strength.label}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#b5c8ba] via-[#e6d892] to-[#2E5A44] transition-all duration-300"
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {passwordRulesState.map((rule) => (
                  <li
                    key={rule.key}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      rule.passed
                        ? "border-[#d9e7dd] bg-[#f6faf6] text-[#2E5A44]"
                        : "border-neutral-200 bg-white text-neutral-500"
                    }`}
                  >
                    <span
                      className={`grid size-4 place-items-center rounded-full text-xs ${
                        rule.passed ? "bg-[#2E5A44] text-white" : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      ✓
                    </span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>
          }
        />

        <PasswordField
          label="Xác nhận mật khẩu"
          value={confirmPassword}
          onChange={(value) => setConfirmPassword(value)}
          onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
          visible={showConfirmPassword}
          toggleVisible={() => setShowConfirmPassword((current) => !current)}
          autoComplete="new-password"
          error={confirmError}
          touched={touched.confirmPassword}
        />

        {form.role === "ENGINEER" ? (
          <TextareaField
            label="Giới thiệu chuyên môn"
            value={engineerFields.biography}
            onChange={(value) => updateEngineerField("biography", value)}
            onBlur={() => setTouched((current) => ({ ...current, biography: true }))}
            maxLength={2000}
            rows={5}
            required
            error={biographyError}
            touched={touched.biography}
            hint="Giới thiệu ngắn gọn về chuyên môn, kinh nghiệm thực tế và khu vực làm việc."
          />
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || hasRegisterErrors}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#254c39] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {loading && <LoaderCircle size={16} className="animate-spin" />}
          Đăng ký và nhận OTP
        </button>
      </form>

      <div className="mt-5 rounded-2xl border border-[#dfe7df] bg-[#f7faf7] px-4 py-3 text-xs leading-relaxed text-neutral-600">
        Mã OTP sẽ được gửi qua email sau khi tạo tài khoản.
      </div>

      <p className="mt-5 text-center text-xs text-neutral-500">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-bold text-[#2E5A44] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  touched,
  onBlur,
  type = "text",
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "onBlur">) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-neutral-700">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        type={type}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d856c] focus-visible:ring-4 focus-visible:ring-[#e9f0ea]"
      />
      {error && touched ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  error,
  touched,
  onBlur,
  hint,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  hint?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onBlur">) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-2 block text-xs font-bold text-neutral-700">{label}</span>
      <textarea
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="min-h-28 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-xs outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d856c] focus-visible:ring-4 focus-visible:ring-[#e9f0ea]"
      />
      {hint ? <p className="mt-2 text-xs text-neutral-500">{hint}</p> : null}
      {error && touched ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function FileField({
  label,
  files,
  onChange,
  error,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
}) {
  const inputId = "engineer-qualification-files";
  return (
    <div className="sm:col-span-2">
      <span className="mb-2 block text-xs font-bold text-neutral-700">{label}</span>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8d0] bg-[#f9fbf9] px-4 py-6 text-center transition hover:border-[#9fb2a4] hover:bg-white"
      >
        <FilePlus2 size={20} className="text-[#2E5A44]" />
        <span className="mt-3 text-xs font-bold text-[#2E5A44]">
          Chọn file PDF / JPG / PNG
        </span>
        <span className="mt-1 text-xs text-neutral-500">
          Có thể tải lên nhiều chứng chỉ hoặc bằng cấp.
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        className="sr-only"
        onChange={(event) => {
          const nextFiles = Array.from(event.target.files ?? []);
          onChange(nextFiles);
        }}
      />

      {files.length > 0 ? (
        <ul className="mt-3 space-y-2 rounded-2xl border border-[#e3e9e3] bg-white p-4 text-xs text-neutral-600">
          {files.map((file) => (
            <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3">
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 rounded-full bg-[#edf3ee] px-2 py-1 text-xs font-bold text-[#2E5A44]">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  touched,
  onBlur,
  visible,
  toggleVisible,
  helper,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  visible: boolean;
  toggleVisible: () => void;
  helper?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "onBlur">) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-neutral-700">{label}</span>
      <span className="flex items-center rounded-xl border border-neutral-200 bg-white px-3 transition-all duration-200 focus-within:border-[#5d856c] focus-within:ring-4 focus-within:ring-[#e9f0ea]">
        <input
          {...props}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          type={visible ? "text" : "password"}
          className="h-11 flex-1 bg-transparent text-xs outline-none"
        />
        <button
          type="button"
          onClick={toggleVisible}
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      {error && touched ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {helper ? <div className="mt-3">{helper}</div> : null}
    </label>
  );
}
