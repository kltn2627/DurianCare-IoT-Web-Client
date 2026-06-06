"use client";

import { useState } from "react";
import { BadgeCheck, BookOpenCheck, Check, FileSearch, Plus, X } from "lucide-react";
import { engineerApplications, treatmentProtocols } from "@/constants/durianMockData";

export function AdminManagement() {
  const [applicationStates, setApplicationStates] = useState<Record<string, string>>({});

  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <article id="protocols" className="panel scroll-mt-24 p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><BookOpenCheck size={20} /></span><div><h2 className="text-[15px] font-bold">Danh mục phác đồ nền tảng</h2><p className="mt-1 text-[10px] text-[#7e8b83]">Chuẩn điều trị dùng chung toàn hệ sinh thái</p></div></div>
          <button className="flex items-center gap-1 rounded-xl bg-[#2E5A44] px-3 py-2.5 text-[8px] font-bold text-white"><Plus size={13} /> Tạo phác đồ</button>
        </div>
        <div className="mt-5 overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead><tr className="bg-[#f6f8f5] text-[7px] tracking-[.8px] text-[#859189]"><th className="rounded-l-lg px-3 py-3">PHÁC ĐỒ</th><th className="px-3 py-3">NHÓM BỆNH</th><th className="px-3 py-3">THỜI LƯỢNG</th><th className="px-3 py-3">ĐANG ÁP DỤNG</th><th className="rounded-r-lg px-3 py-3">TRẠNG THÁI</th></tr></thead>
            <tbody>{treatmentProtocols.map((protocol) => <tr key={protocol.id} className="border-b border-[#ebeee9] text-[9px]"><td className="px-3 py-4"><b className="block text-[10px]">{protocol.name}</b><small className="mt-1 block text-[7px] text-[#8b968f]">{protocol.id}</small></td><td className="px-3 py-4 font-mono text-[8px]">{protocol.disease}</td><td className="px-3 py-4">{protocol.duration}</td><td className="px-3 py-4">{protocol.activeFarms} trang trại</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-[7px] font-bold ${protocol.status.includes("áp dụng") ? "bg-[#e9f2ea] text-[#3f7253]" : "bg-[#fbf1c9] text-[#806417]"}`}>{protocol.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      </article>

      <article id="engineers" className="panel scroll-mt-24 p-5 lg:p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><FileSearch size={20} /></span><div><h2 className="text-[15px] font-bold">Phê duyệt hồ sơ kỹ sư</h2><p className="mt-1 text-[10px] text-[#7e8b83]">Kiểm tra năng lực chuyên môn mới</p></div></div>
        <div className="mt-5 space-y-3">
          {engineerApplications.map((application) => {
            const status = applicationStates[application.id] ?? application.status;
            return (
              <div key={application.id} className="rounded-2xl border border-[#e1e6df] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]"><BadgeCheck size={19} /></span>
                  <div className="flex-1"><b className="block text-[11px]">{application.name}</b><small className="mt-1 block text-[8px] leading-4 text-[#849087]">{application.degree} • {application.experience}<br />Nộp ngày {application.submittedAt}</small></div>
                  <span className={`rounded-full px-2 py-1 text-[7px] font-bold ${status === "Đã xác minh" || status === "Đã phê duyệt" ? "bg-[#e8f2ea] text-[#39704f]" : status === "Đã từ chối" ? "bg-[#f7e9e4] text-[#94523d]" : "bg-[#fbf1ca] text-[#7c6116]"}`}>{status}</span>
                </div>
                {status === "Chờ phê duyệt" && <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setApplicationStates({ ...applicationStates, [application.id]: "Đã phê duyệt" })} className="flex items-center justify-center gap-1 rounded-lg bg-[#2E5A44] py-2 text-[8px] font-bold text-white"><Check size={13} /> Phê duyệt</button><button onClick={() => setApplicationStates({ ...applicationStates, [application.id]: "Đã từ chối" })} className="flex items-center justify-center gap-1 rounded-lg border border-[#ead8d1] py-2 text-[8px] font-bold text-[#95523c]"><X size={13} /> Từ chối</button></div>}
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
