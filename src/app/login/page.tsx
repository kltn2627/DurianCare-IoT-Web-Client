import type { Metadata } from "next";
import { Leaf, Radar, ScanLine, Sprout } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="grid-pattern relative hidden overflow-hidden bg-[#244b37] p-12 text-white lg:flex lg:flex-col">
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[15px_15px_15px_5px] bg-[#EED56D] text-[#2E5A44]"><Leaf size={25} /></span>
          <span><b className="block text-xl">DurianCare</b><small className="text-[8px] font-bold tracking-[2.4px] text-[#c7d8cc]">SMART FARM OPERATING SYSTEM</small></span>
        </div>
        <div className="relative z-10 my-auto max-w-[620px]">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-bold tracking-[1.2px] text-[#f2dc7c]"><Sprout size={13} /> NÔNG NGHIỆP DỮ LIỆU</span>
          <h2 className="text-5xl font-extrabold leading-[1.12] tracking-[-2px]">Chăm vườn chính xác.<br /><span className="text-[#EED56D]">Mùa vụ minh bạch.</span></h2>
          <p className="mt-6 max-w-[530px] text-sm leading-7 text-[#d2dfd6]">Kết nối cảm biến IoT, chẩn đoán AI và đội ngũ kỹ sư trên cùng một nền tảng quản trị sầu riêng chuyên biệt.</p>
          <div className="mt-10 grid max-w-[560px] grid-cols-3 gap-3">
            {[["12/12", "Trạm IoT", Radar], ["98.6%", "AI chính xác", ScanLine], ["440", "Cây quản lý", Sprout]].map(([value, label, Icon]) => {
              const IconComponent = Icon as typeof Radar;
              return <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur"><IconComponent size={18} className="mb-5 text-[#EED56D]" /><b className="block text-xl">{String(value)}</b><small className="mt-1 block text-[9px] text-[#c6d5ca]">{String(label)}</small></div>;
            })}
          </div>
        </div>
        <p className="relative z-10 text-[9px] text-[#aabfb0]">© 2026 DurianCare • Hệ sinh thái sầu riêng thông minh</p>
        <div className="absolute -bottom-36 -right-28 size-[430px] rounded-full border-[75px] border-[#eed56d0d]" />
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-[#2E5A44] text-[#EED56D]"><Leaf size={22} /></span><b className="text-xl text-[#2E5A44]">DurianCare</b></div>
        <LoginForm />
      </section>
    </main>
  );
}
