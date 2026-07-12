"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { ClientAuthError } from "@/lib/auth/client";
import { dashboardPathFor } from "@/lib/auth/types";
import { friendlyApiMessage, validateEmail } from "@/lib/feedback";

const REMEMBER_ME_KEY = "duriancare.remember-email";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    try {
      const storedEmail = window.localStorage.getItem(REMEMBER_ME_KEY);
      if (storedEmail) {
        setEmail(storedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage issues.
    }
  }, []);

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
    if (!touched.email && !email) return "";
    return validateEmail(email);
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password && !password) return "";
    if (!password.trim()) return "Vui lòng nhập mật khẩu.";
    return "";
  }, [password, touched.password]);

  const formError = error || emailError || passwordError;
  const canSubmit = !loading && retryAfter === 0 && !emailError && !passwordError;

  const startCountdown = (seconds: number) => {
    setRetryAfter(seconds);
  };

  const persistRememberedEmail = (value: string, nextRememberMe: boolean) => {
    try {
      if (nextRememberMe) {
        window.localStorage.setItem(REMEMBER_ME_KEY, value);
      } else {
        window.localStorage.removeItem(REMEMBER_ME_KEY);
      }
    } catch {
      // Ignore storage issues.
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setError("");

    const nextEmailError = validateEmail(email);
    const nextPasswordError = password.trim() ? "" : "Vui lòng nhập mật khẩu.";
    if (nextEmailError || nextPasswordError) {
      setError(nextEmailError || nextPasswordError);
      return;
    }

    setLoading(true);
    try {
      const session = await login({ email: email.trim(), password });
      persistRememberedEmail(email.trim(), rememberMe);
      router.replace(dashboardPathFor(session.role, session.accountStatus));
      router.refresh();
    } catch (cause) {
      const friendly = friendlyApiMessage(
        cause instanceof ClientAuthError
          ? { status: cause.status, message: cause.message }
          : null,
        "auth",
        "Đăng nhập không thành công. Vui lòng thử lại.",
      );
      setError(friendly);
      if (cause instanceof ClientAuthError && cause.retryAfterSeconds) {
        startCountdown(cause.retryAfterSeconds);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px]">
      <div className="mb-8 space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-4 py-1.5 text-[11px] font-bold tracking-[1px] text-[#2E5A44]">
          <ShieldCheck size={13} /> Cổng quản trị an toàn
        </span>
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#203329] sm:text-4xl">
            Đăng nhập DurianCare
          </h1>
          <p className="text-sm leading-6 text-[#728078]">
            Phiên đăng nhập được bảo vệ bằng access token ngắn hạn và refresh token luân
            chuyển.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-[13px] font-bold text-[#415348]">Địa chỉ email</span>
          <span className="flex items-center gap-3 rounded-xl border border-[#dfe6df] bg-white px-4 transition-all duration-200 focus-within:border-[#5d856c] focus-within:ring-4 focus-within:ring-[#e9f0ea]">
            <Mail size={17} className="text-[#7f8e85]" />
            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setTouched((current) => ({ ...current, email: true }));
                if (error) setError("");
              }}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              type="email"
              autoComplete="email"
              maxLength={320}
              aria-invalid={Boolean(emailError)}
              className="h-12 w-full bg-transparent text-sm outline-none"
              required
              disabled={loading}
            />
          </span>
          {emailError ? (
            <p className="mt-2 text-[12px] leading-relaxed text-red-600">{emailError}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-[13px] font-bold text-[#415348]">Mật khẩu</span>
          <span className="flex items-center gap-3 rounded-xl border border-[#dfe6df] bg-white px-4 transition-all duration-200 focus-within:border-[#5d856c] focus-within:ring-4 focus-within:ring-[#e9f0ea]">
            <LockKeyhole size={17} className="text-[#7f8e85]" />
            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setTouched((current) => ({ ...current, password: true }));
                if (error) setError("");
              }}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              maxLength={72}
              aria-invalid={Boolean(passwordError)}
              className="h-12 w-full bg-transparent text-sm outline-none"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="rounded-lg p-1 text-[#7a8980] transition-colors hover:bg-[#edf3ee] hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          {passwordError ? (
            <p className="mt-2 text-[12px] leading-relaxed text-red-600">{passwordError}</p>
          ) : null}
        </label>

        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#5e6b62]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => {
                const checked = event.target.checked;
                setRememberMe(checked);
                persistRememberedEmail(email.trim(), checked);
              }}
              className="size-4 rounded border-neutral-300 text-[#2E5A44] focus:ring-[#2E5A44]"
            />
            Nhớ email đăng nhập
          </label>

          <Link
            href="/register"
            className="text-[12px] font-semibold text-[#2E5A44] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
          >
            Tạo tài khoản
          </Link>
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-[#edd7cb] bg-[#fff6f1] px-4 py-3 text-[12px] leading-relaxed text-[#9b543b]"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-sm font-bold text-white shadow-lg shadow-[#2e5a4425] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#254c39] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70"
        >
          {loading ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              Đang xác thực...
            </>
          ) : retryAfter > 0 ? (
            `Thử lại sau ${retryAfter}s`
          ) : (
            "Đăng nhập hệ thống"
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[12px] text-[#728078]">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-bold text-[#2E5A44] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
        >
          Đăng ký chủ vườn hoặc kỹ sư
        </Link>
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#dfe7df] bg-[#f7faf7] px-4 py-3 text-[12px] text-[#5f6d64]">
        <CheckCircle2 size={16} className="shrink-0 text-[#2E5A44]" />
        <span>Thông báo lỗi sẽ được rút gọn thành ngôn ngữ thân thiện, không lộ thông điệp kỹ thuật.</span>
      </div>
    </div>
  );
}
