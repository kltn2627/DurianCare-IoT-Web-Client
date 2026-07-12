import type { Metadata } from "next";
import { Leaf, ShieldCheck } from "lucide-react";
import { ApprovalStatusPanel } from "@/components/auth/ApprovalStatusPanel";

export const metadata: Metadata = {
  title: "Trạng thái hồ sơ",
  description: "Theo dõi trạng thái xác minh và phê duyệt tài khoản kỹ sư.",
};

export default function ApprovalPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
      <section className="grid-pattern relative hidden overflow-hidden bg-[#244b37] p-12 text-white lg:flex lg:flex-col">
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[15px_15px_15px_5px] bg-[#EED56D] text-[#2E5A44]">
            <Leaf size={25} />
          </span>
          <span>
            <b className="block text-xl">DurianCare</b>
            <small className="text-[10px] font-bold tracking-[2.4px] text-[#c7d8cc]">
              ACCOUNT APPROVAL
            </small>
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <ShieldCheck size={30} className="text-[#EED56D]" />
          <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight">
            Tài khoản kỹ sư
            <br />
            <span className="text-[#EED56D]">được duyệt an toàn.</span>
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#d2dfd6]">
            Hồ sơ sẽ chỉ mở dashboard kỹ sư sau khi email được xác minh và quản trị viên kiểm tra
            đủ thông tin chuyên môn cùng tài liệu đính kèm.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-16">
        <ApprovalStatusPanel />
      </section>
    </main>
  );
}
