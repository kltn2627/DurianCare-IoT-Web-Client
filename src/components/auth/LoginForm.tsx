"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { mockAccounts } from "@/constants/durianMockData";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@duriancare.vn");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const account = mockAccounts.find((item) => item.email === email.trim() && item.password === password);
    if (!account) {
      setError("Email hoặc mật khẩu không đúng. Hãy dùng một tài khoản mẫu bên dưới.");
      return;
    }
    setLoading(true);
    sessionStorage.setItem("durian-session", JSON.stringify({ email: account.email, role: account.role, name: account.name }));
    document.cookie = `durian-role=${account.role}; path=/; max-age=28800; samesite=lax`;
    window.setTimeout(() => {
      router.push(account.role === "OWNER" ? "/dashboard/client" : "/dashboard/admin");
    }, 450);
  };

  const fillAccount = (account: (typeof mockAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="w-full max-w-[460px]">
      <div className="mb-8">
        <span className="mb-4 inline-flex items-center gap-4 rounded-full bg-[#edf3ee] px-4 py-1.5 text-[15px] font-bold tracking-[1px] text-[#2E5A44]">
          <ShieldCheck size={13} /> CỔNG QUẢN TRỊ AN TOÀN
        </span>
        <h1 className="text-3xl font-extrabold tracking-[-1.2px] text-[#203329] sm:text-4xl">Đăng nhập DurianCare</h1>
        <p className="mt-4 text-sm leading-6 text-[#728078]">Một hệ thống duy nhất cho chủ trang trại, kỹ sư nông nghiệp và quản trị viên.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <label className="block">
          <span className="mb-2 block text-[14px] font-bold text-[#415348]">Địa chỉ email</span>
          <span className="flex items-center gap-7 rounded-xl border border-[#dfe6df] bg-white px-5 transition focus-within:border-[#5d856c] focus-within:ring-4 focus-within:ring-[#e9f0ea]">
            <Mail size={17} className="text-[#7f8e85]" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-12 w-full bg-transparent text-sm outline-none" required />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-[14px] font-bold text-[#415348]">Mật khẩu</span>
          <span className="flex items-center gap-7 rounded-xl border border-[#dfe6df] bg-white px-5 transition focus-within:border-[#5d856c] focus-within:ring-4 focus-within:ring-[#e9f0ea]">
            <LockKeyhole size={17} className="text-[#7f8e85]" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} className="h-12 w-full bg-transparent text-sm outline-none" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#7a8980]" aria-label="Hiện mật khẩu">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </span>
        </label>
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-4 text-[#67766d]"><input type="checkbox" defaultChecked className="accent-[#2E5A44]" /> Duy trì đăng nhập</label>
          <button type="button" className="font-bold text-[#2E5A44]">Quên mật khẩu?</button>
        </div>
        {error && <p className="rounded-xl border border-[#edd7cb] bg-[#fff6f1] px-5 py-4 text-[14px] text-[#9b543b]">{error}</p>}
        <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-4 rounded-xl bg-[#2E5A44] text-sm font-bold text-white shadow-lg shadow-[#2e5a4425] transition hover:bg-[#254c39] disabled:opacity-70">
          {loading ? <><LoaderCircle size={18} className="animate-spin" /> Đang phân luồng...</> : "Đăng nhập hệ thống"}
        </button>
      </form>

      <div className="mt-7 border-t border-[#e2e7e1] pt-6">
        <p className="mb-3 text-[15px] font-bold tracking-[1.2px] text-[#8b968f]">TÀI KHOẢN TRẢI NGHIỆM</p>
        <div className="grid gap-4">
          {mockAccounts.map((account) => (
            <button key={account.role} onClick={() => fillAccount(account)} className="flex items-center justify-between rounded-xl border border-[#e1e7e0] bg-white px-5 py-4 text-left transition hover:border-[#9ab09f] hover:bg-[#f8faf7]">
              <span><b className="block text-[14px] text-[#30483a]">{account.role === "OWNER" ? "Chủ trang trại" : account.role === "ADMIN" ? "Quản trị viên" : "Kỹ sư"}</b><small className="mt-1 block text-[15px] text-[#86928a]">{account.email}</small></span>
              <span className="rounded-lg bg-[#fbf2c9] px-2 py-1 text-[14px] font-bold text-[#785e13]">Dùng tài khoản</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


