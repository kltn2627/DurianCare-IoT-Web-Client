"use client";

import { useState } from "react";
import { BadgeCheck, Check, ShieldCheck, ShieldX, UserRoundCheck, X } from "lucide-react";
import { activeEngineers, authorizationRequests } from "@/constants/durianMockData";
type RequestState = "pending" | "approved" | "rejected";

export function AuthorizationManager() {
  const [states, setStates] = useState<Record<string, RequestState>>({});
  const [permissions, setPermissions] = useState<Record<string, { treatment: boolean; irrigation: boolean }>>(
    Object.fromEntries(authorizationRequests.map((request) => [request.id, { treatment: true, irrigation: false }])),
  );
  const [revoked, setRevoked] = useState<string[]>([]);

  return (
    <section id="authorization" className="grid scroll-mt-24 gap-9 xl:grid-cols-[1.3fr_.7fr]">
      <article className="panel p-7 lg:p-8">
        <div className="flex items-center gap-7"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><UserRoundCheck size={20} /></span><div><h2 className="text-[15px] font-bold">Yêu cầu hợp tác quản lý vườn</h2><p className="mt-1 text-[13px] text-[#7e8b83]">Xét duyệt kỹ sư và giới hạn phạm vi can thiệp</p></div></div>
        <div className="mt-7 space-y-5">
          {authorizationRequests.map((request) => {
            const state = states[request.id] ?? "pending";
            const permission = permissions[request.id];
            return (
              <div key={request.id} className="rounded-2xl border border-[#e1e6df] p-5">
                <div className="flex flex-col gap-8 md:flex-row md:items-start">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2E5A44] text-sm font-bold text-[#EED56D]">{request.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-4"><b className="text-[15px]">{request.engineer}</b><span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3eb] px-2 py-1 text-[13px] font-bold text-[#3b7552]"><BadgeCheck size={10} /> {request.certificate}</span></div>
                    <p className="mt-1 text-[15px] text-[#7f8c84]">{request.specialty} • {request.experience} • Đăng ký {request.targetZone}</p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="flex items-center gap-4 rounded-xl bg-[#f6f8f5] px-4 py-3 text-[15px] font-semibold"><input type="checkbox" checked={permission.treatment} onChange={(event) => setPermissions({ ...permissions, [request.id]: { ...permission, treatment: event.target.checked } })} className="accent-[#2E5A44]" /> Cho phép lên phác đồ điều trị</label>
                      <label className="flex items-center gap-4 rounded-xl bg-[#f6f8f5] px-4 py-3 text-[15px] font-semibold"><input type="checkbox" checked={permission.irrigation} onChange={(event) => setPermissions({ ...permissions, [request.id]: { ...permission, irrigation: event.target.checked } })} className="accent-[#2E5A44]" /> Cho phép can thiệp thiết bị tưới</label>
                    </div>
                  </div>
                  {state === "pending" ? (
                    <div className="flex gap-4 md:flex-col">
                      <button onClick={() => setStates({ ...states, [request.id]: "approved" })} className="flex items-center justify-center gap-1 rounded-lg bg-[#2E5A44] px-4 py-2 text-sm font-bold text-white"><Check size={13} /> Phê duyệt</button>
                      <button onClick={() => setStates({ ...states, [request.id]: "rejected" })} className="flex items-center justify-center gap-1 rounded-lg border border-[#ead9d2] px-4 py-2 text-sm font-bold text-[#96543e]"><X size={13} /> Từ chối</button>
                    </div>
                  ) : (
                    <span className={`rounded-lg px-4 py-2 text-sm font-bold ${state === "approved" ? "bg-[#e8f2ea] text-[#38704f]" : "bg-[#f8eae5] text-[#98533d]"}`}>{state === "approved" ? "Đã phê duyệt" : "Đã từ chối"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="panel p-7 lg:p-8">
        <div className="flex items-center gap-7"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><ShieldCheck size={20} /></span><div><h2 className="text-[15px] font-bold">Kỹ sư đang được ủy quyền</h2><p className="mt-1 text-[13px] text-[#7e8b83]">Quyền truy cập hiện hành</p></div></div>
        <div className="mt-7 space-y-5">
          {activeEngineers.map((engineer) => {
            const isRevoked = revoked.includes(engineer.id);
            return (
              <div key={engineer.id} className={`rounded-2xl border p-5 ${isRevoked ? "border-[#eadbd5] bg-[#fcf7f5] opacity-60" : "border-[#e1e6df]"}`}>
                <div className="flex items-start justify-between gap-7"><span><b className="block text-sm">{engineer.name}</b><small className="mt-1 block text-sm text-[#849087]">{engineer.zone} • Từ {engineer.since}</small></span>{isRevoked ? <ShieldX size={18} className="text-[#9c5b45]" /> : <ShieldCheck size={18} className="text-[#4f7d61]" />}</div>
                <div className="mt-4 flex flex-wrap gap-1">{engineer.permissions.map((permission) => <span key={permission} className="rounded-full bg-[#eef3ee] px-2 py-1 text-[13px] font-bold text-[#587161]">{permission === "treatment" ? "Phác đồ" : "Thiết bị tưới"}</span>)}</div>
                <button disabled={isRevoked} onClick={() => setRevoked([...revoked, engineer.id])} className="mt-5 w-full rounded-lg border border-[#e8d6cf] py-2 text-sm font-bold text-[#96523c] disabled:cursor-not-allowed">{isRevoked ? "Đã thu hồi toàn bộ quyền" : "Thu hồi quyền tối cao"}</button>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}


