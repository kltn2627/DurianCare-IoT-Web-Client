"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  Check,
  FileSearch,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { engineerApplications, treatmentProtocols } from "@/constants/durianMockData";
import { authClient, ClientAuthError } from "@/lib/auth/client";
import { friendlyApiMessage } from "@/lib/feedback";

export function AdminManagement() {
  const [applicationStates, setApplicationStates] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

  const approveExpert = async (userId: string, applicationId: string) => {
    setPendingIds((current) => ({ ...current, [applicationId]: true }));
    try {
      const result = await authClient.approveExpert(userId);
      setApplicationStates((current) => ({ ...current, [applicationId]: "Đã phê duyệt" }));
      return result;
    } catch (error) {
      const message = friendlyApiMessage(
        error instanceof ClientAuthError
          ? { status: error.status, message: error.message }
          : null,
        "auth",
        "Không thể phê duyệt hồ sơ kỹ sư.",
      );
      setApplicationStates((current) => ({
        ...current,
        [applicationId]: message,
      }));
      throw error;
    } finally {
      setPendingIds((current) => ({ ...current, [applicationId]: false }));
    }
  };

  return (
    <section className="grid gap-9 xl:grid-cols-[1.15fr_.85fr]">
      <article id="protocols" className="panel scroll-mt-24 p-7 lg:p-8">
        <div className="flex items-center justify-between gap-7">
          <div className="flex items-center gap-7">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
              <BookOpenCheck size={20} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold">Danh mục phác đồ nền tảng</h2>
              <p className="mt-1 text-[13px] text-[#7e8b83]">
                Chuẩn điều trị dùng chung toàn hệ sinh thái
              </p>
            </div>
          </div>
          <button className="flex items-center gap-1 rounded-xl bg-[#2E5A44] px-4 py-3 text-[14px] font-bold text-white">
            <Plus size={13} /> Tạo phác đồ
          </button>
        </div>

        <div className="mt-7 overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f6f8f5] text-[13px] tracking-[.8px] text-[#859189]">
                <th className="rounded-l-lg px-4 py-4">PHÁC ĐỒ</th>
                <th className="px-4 py-4">NHÓM BỆNH</th>
                <th className="px-4 py-4">THỜI LƯỢNG</th>
                <th className="px-4 py-4">ĐANG ÁP DỤNG</th>
                <th className="rounded-r-lg px-4 py-4">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {treatmentProtocols.map((protocol) => (
                <tr key={protocol.id} className="border-b border-[#ebeee9] text-[15px]">
                  <td className="px-4 py-5">
                    <b className="block text-[13px]">{protocol.name}</b>
                    <small className="mt-1 block text-[13px] text-[#8b968f]">
                      {protocol.id}
                    </small>
                  </td>
                  <td className="px-4 py-5 font-mono text-[14px]">{protocol.disease}</td>
                  <td className="px-4 py-5">{protocol.duration}</td>
                  <td className="px-4 py-5">{protocol.activeFarms} trang trại</td>
                  <td className="px-4 py-5">
                    <span
                      className={`rounded-full px-2 py-1 text-[13px] font-bold ${
                        protocol.status.includes("áp dụng")
                          ? "bg-[#e9f2ea] text-[#3f7253]"
                          : "bg-[#fbf1c9] text-[#806417]"
                      }`}
                    >
                      {protocol.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article id="engineers" className="panel scroll-mt-24 p-7 lg:p-8">
        <div className="flex items-center gap-7">
          <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
            <FileSearch size={20} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">Phê duyệt hồ sơ kỹ sư</h2>
            <p className="mt-1 text-[13px] text-[#7e8b83]">Kiểm tra năng lực chuyên môn mới</p>
          </div>
        </div>

        <div className="mt-7 space-y-5">
          {engineerApplications.map((application) => {
            const status = applicationStates[application.id] ?? application.status;
            const busy = pendingIds[application.id] ?? false;
            const userId = application.userId ?? application.id;

            return (
              <div key={application.id} className="rounded-2xl border border-[#e1e6df] p-5">
                <div className="flex items-start gap-7">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
                    <BadgeCheck size={19} />
                  </span>
                  <div className="flex-1">
                    <b className="block text-[14px]">{application.name}</b>
                    <small className="mt-1 block text-[14px] leading-4 text-[#849087]">
                      {application.degree} • {application.experience}
                      <br />
                      Nộp ngày {application.submittedAt}
                    </small>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[13px] font-bold ${
                      status === "Đã xác minh" || status === "Đã phê duyệt"
                        ? "bg-[#e8f2ea] text-[#39704f]"
                        : status === "Đã từ chối"
                          ? "bg-[#f7e9e4] text-[#94523d]"
                          : "bg-[#fbf1ca] text-[#7c6116]"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {status === "Chờ phê duyệt" ? (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => approveExpert(userId, application.id)}
                      disabled={busy}
                      className="flex items-center justify-center gap-1 rounded-lg bg-[#2E5A44] py-2 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      {busy ? "Đang xử lý" : "Phê duyệt"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setApplicationStates((current) => ({
                          ...current,
                          [application.id]: "Đã từ chối",
                        }))
                      }
                      disabled={busy}
                      className="flex items-center justify-center gap-1 rounded-lg border border-[#ead8d1] py-2 text-[14px] font-bold text-[#95523c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X size={13} />
                      Từ chối
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
