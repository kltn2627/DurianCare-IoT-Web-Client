"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
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

const initialForm: RegisterRequest = {
  email: "",
  password: "",
  fullName: "",
  phoneNumber: "",
  role: "FARMER",
};

type RegisterStage = "REGISTER" | "OTP" | "DONE";
type FieldTouched = {
  email: boolean;
  fullName: boolean;
  phoneNumber: boolean;
  password: boolean;
  confirmPassword: boolean;
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
  const [touched, setTouched] = useState<FieldTouched>({
    email: false,
    fullName: false,
    phoneNumber: false,
    password: false,
    confirmPassword: false,
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

  const passwordRulesState = useMemo(() => passwordRules(form.password), [form.password]);
  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  const hasRegisterErrors =
    Boolean(emailError || fullNameError || phoneError || passwordError || confirmError);

  const setTouchAll = () =>
    setTouched({
      email: true,
      fullName: true,
      phoneNumber: true,
      password: true,
      confirmPassword: true,
    });

  const startCountdown = (seconds: number) => {
    setRetryAfter(seconds);
  };

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
      startCountdown(cause.retryAfterSeconds);
    }
  };

  const otpValue = otpDigits.join("");
  const otpError = useMemo(() => {
    if (!otpValue) return "";
    return validateOtp(otpValue);
  }, [otpValue]);

  const updateField = <K extends keyof RegisterRequest>(key: K, value: RegisterRequest[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouchAll();
    setError("");

    const nextEmailError = validateEmail(form.email);
    const nextFullNameError = form.fullName.trim() ? "" : "Vui lòng nhập họ và tên.";
    const nextPhoneError = validatePhoneNumber(form.phoneNumber ?? "");
    const nextPasswordError = validatePassword(form.password);
    const nextConfirmError = validateConfirmPassword(form.password, confirmPassword);

    if (
      nextEmailError ||
      nextFullNameError ||
      nextPhoneError ||
      nextPasswordError ||
      nextConfirmError
    ) {
      setError(
        nextEmailError ||
          nextFullNameError ||
          nextPhoneError ||
          nextPasswordError ||
          nextConfirmError,
      );
      return;
    }

    setLoading(true);
    try {
      const phoneNumber = form.phoneNumber?.trim() ?? "";
      const result = await authClient.register({
        ...form,
        email: normalizeEmail(form.email),
        fullName: form.fullName.trim(),
        ...(phoneNumber ? { phoneNumber } : {}),
      });
      setNotice(result.message);
      setStage("OTP");
      startCountdown(60);
      window.setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 0);
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

  const handleOtpKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
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
      startCountdown(60);
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
      <div className="w-full max-w-[500px] rounded-[26px] border border-[#dbe5dc] bg-white p-7 text-center shadow-sm sm:p-9">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf5ee] text-[#2E5A44]">
          <CheckCircle2 size={28} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-neutral-900">
          Xác minh hoàn tất
        </h1>
        <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">{notice}</p>
        {form.role === "EXPERT" && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-700">
            Tài khoản kỹ sư cần được Admin phê duyệt trước khi có thể đăng nhập.
          </p>
        )}
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#2E5A44] px-6 text-[12px] font-bold text-white transition-all duration-200 hover:bg-[#254c39] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430]"
        >
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  if (stage === "OTP") {
    return (
      <div className="w-full max-w-[520px]">
        <button
          type="button"
          onClick={() => setStage("REGISTER")}
          className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold text-neutral-500 hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
        >
          <ArrowLeft size={14} /> Sửa thông tin đăng ký
        </button>
        <span className="grid size-12 place-items-center rounded-2xl bg-[#EED56D] text-[#2E5A44]">
          <MailCheck size={22} />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#203329]">
          Xác minh email
        </h1>
        <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
          Nhập mã OTP 6 chữ số đã gửi đến <b>{form.email}</b>.
        </p>
        {notice ? (
          <p className="mt-4 rounded-xl bg-[#edf5ee] px-4 py-3 text-[11px] leading-relaxed text-[#39704f]">
            {notice}
          </p>
        ) : null}

        <form onSubmit={verify} className="mt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Mã OTP
              </p>
              <p className="text-[11px] text-neutral-500">
                {retryAfter > 0 ? `Gửi lại sau ${retryAfter}s` : "Có thể gửi lại mã mới"}
              </p>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
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
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  pattern="[0-9]{1}"
                  maxLength={1}
                  className="h-14 rounded-xl border border-neutral-200 bg-white text-center text-xl font-extrabold tracking-[0.2em] outline-none transition-all duration-200 focus-visible:border-[#5d856c] focus-visible:ring-4 focus-visible:ring-[#e9f0ea]"
                  aria-label={`OTP số ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[11px] leading-relaxed text-red-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || Boolean(otpError) || otpValue.length !== OTP_LENGTH}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-[12px] font-bold text-white transition-all duration-200 hover:bg-[#254c39] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <LoaderCircle size={16} className="animate-spin" />}
            Xác minh tài khoản
          </button>
        </form>

        <button
          type="button"
          onClick={resend}
          disabled={loading || retryAfter > 0}
          className="mx-auto mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold text-[#2E5A44] hover:bg-[#edf3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:opacity-50"
        >
          <RotateCw size={13} />
          {retryAfter > 0 ? `Gửi lại sau ${retryAfter}s` : "Gửi lại mã OTP"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[540px]">
      <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-4 py-1.5 text-[11px] font-bold tracking-[1px] text-[#2E5A44]">
        <ShieldCheck size={13} /> Tài khoản DurianCare
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#203329]">
        Tạo tài khoản mới
      </h1>
      <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
        Đăng ký dành cho chủ vườn và kỹ sư. Admin không thể đăng ký công khai.
      </p>

      <form onSubmit={register} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
          {(["FARMER", "EXPERT"] as const).map((role) => (
            <button
              type="button"
              key={role}
              onClick={() => updateField("role", role)}
              className={`rounded-lg px-3 py-2.5 text-[11px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] ${
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
            pattern="^[0-9+() .-]{8,30}$"
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
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Độ mạnh mật khẩu
                  </span>
                  <span className="text-[11px] font-bold text-[#2E5A44]">{strength.label}</span>
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
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
                      rule.passed
                        ? "border-[#d9e7dd] bg-[#f6faf6] text-[#2E5A44]"
                        : "border-neutral-200 bg-white text-neutral-500"
                    }`}
                  >
                    <span
                      className={`grid size-4 place-items-center rounded-full text-[9px] ${
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

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[11px] leading-relaxed text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || hasRegisterErrors}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-[12px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#254c39] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {loading && <LoaderCircle size={16} className="animate-spin" />}
          Đăng ký và nhận OTP
        </button>
      </form>

      <div className="mt-5 rounded-2xl border border-[#dfe7df] bg-[#f7faf7] px-4 py-3 text-[11px] leading-relaxed text-neutral-600">
        Mã OTP sẽ được gửi qua email sau khi tạo tài khoản.
      </div>

      <p className="mt-5 text-center text-[11px] text-neutral-500">
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
      <span className="mb-2 block text-[11px] font-bold text-neutral-700">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        type={type}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12px] outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d856c] focus-visible:ring-4 focus-visible:ring-[#e9f0ea]"
      />
      {error && touched ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
    </label>
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
      <span className="mb-2 block text-[11px] font-bold text-neutral-700">{label}</span>
      <span className="flex items-center rounded-xl border border-neutral-200 bg-white px-3 transition-all duration-200 focus-within:border-[#5d856c] focus-within:ring-4 focus-within:ring-[#e9f0ea]">
        <input
          {...props}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          type={visible ? "text" : "password"}
          className="h-11 flex-1 bg-transparent text-[12px] outline-none"
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
      {error && touched ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
      {helper ? <div className="mt-3">{helper}</div> : null}
    </label>
  );
}
