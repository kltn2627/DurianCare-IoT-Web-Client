import type { Metadata } from "next";
import { Leaf, ShieldCheck, Sprout } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Đăng ký tài khoản chủ vườn hoặc kỹ sư DurianCare.",
};

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[.82fr_1.18fr]">
      <section className="grid-pattern relative hidden overflow-hidden bg-[#244b37] p-12 text-white lg:flex lg:flex-col">
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[15px_15px_15px_5px] bg-[#EED56D] text-[#2E5A44]">
            <Leaf size={25} />
          </span>
          <span>
            <b className="block text-xl">DurianCare</b>
            <small className="text-xs font-bold tracking-[2.4px] text-[#c7d8cc]">
              IDENTITY & FARM ACCESS
            </small>
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <ShieldCheck size={30} className="text-[#EED56D]" />
          <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight">
            Một danh tính.
            <br />
            <span className="text-[#EED56D]">Đúng quyền tại vườn.</span>
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#d2dfd6]">
            Email được xác minh bằng OTP. Hồ sơ kỹ sư cần Admin phê duyệt trước khi tham gia hệ
            sinh thái.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.07] p-4">
            <Sprout size={20} className="text-[#EED56D]" />
            <p className="text-xs leading-relaxed text-[#d2dfd6]">
              Không hỗ trợ đăng ký công khai vai trò Admin hoặc Guest.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
        <RegisterForm />
      </section>
    </main>
  );
}
