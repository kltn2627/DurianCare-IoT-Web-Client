import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CheckCircle2, KeyRound, Plug, RotateCcw, Wifi } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Hướng dẫn kết nối thiết bị" };

const STEPS = [
  {
    icon: Plug,
    title: "Cắm nguồn thiết bị",
    body: "Cắm nguồn 5 V cho trạm cảm biến hoặc camera. Lần đầu (hoặc khi không vào được Wi-Fi đã lưu), thiết bị tự phát Wi-Fi cài đặt.",
  },
  {
    icon: Wifi,
    title: "Vào Wi-Fi “DurianCare-Setup-XXXX”",
    body: "Dùng điện thoại kết nối Wi-Fi có tên DurianCare-Setup- và 4 ký tự cuối địa chỉ thiết bị. Trang cài đặt tự mở; nếu không, mở trình duyệt tới http://192.168.4.1.",
  },
  {
    icon: KeyRound,
    title: "Nhập Wi-Fi vườn và mã nhận",
    body: "Chọn Wi-Fi 2,4 GHz của vườn, nhập mật khẩu và mã nhận 10 ký tự (dạng ABCDE-12345) đi kèm thiết bị. Ô “Server URL” để trống, trừ khi kỹ thuật viên dặn nhập. Bấm Save: thiết bị khởi động lại.",
  },
  {
    icon: CheckCircle2,
    title: "Thiết bị tự xuất hiện",
    body: "Nhập cùng mã nhận ở mục “Thêm thiết bị” (trang Cảm biến IoT) để gắn thiết bị vào vườn — chỉ cần một lần. Sau đó thiết bị tự hiện trong danh sách với trạng thái Online; không cần nhập địa chỉ IP ở đâu cả.",
  },
];

export default function DeviceSetupPage() {
  return (
    <DashboardShell role="OWNER">
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-[#1a2a20]">Hướng dẫn kết nối thiết bị</h1>
          <p className="text-[13px] leading-relaxed text-[#536259]">
            Áp dụng cho trạm cảm biến ESP32 và camera ESP32-CAM. Thiết bị tự tìm máy chủ DurianCare (trong mạng của
            vườn hoặc trên internet); ảnh và số đo luôn xem qua ứng dụng, không cần biết địa chỉ của thiết bị.
          </p>
        </header>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-[#e8ece7] bg-white p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf4ec] text-[#2E5A44]">
                <step.icon size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[14px] font-semibold text-[#1a2a20]">
                  {index + 1}. {step.title}
                </p>
                <p className="text-[13px] leading-relaxed text-[#536259]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <RotateCcw size={16} /> Đổi Wi-Fi hoặc cài lại từ đầu
          </p>
          <p>
            Rút nguồn, giữ nút <b>BOOT</b> (trên camera: nút <b>IO0</b> của đế nạp) rồi cắm nguồn lại và giữ tiếp 5 giây.
            Thiết bị xóa Wi-Fi, Server URL, mã nhận đã lưu và phát lại Wi-Fi “DurianCare-Setup-XXXX”.
          </p>
          <p>
            Thiết bị không vào được Wi-Fi đã lưu sau nhiều lần thử cũng tự phát Wi-Fi cài đặt trong 10 phút.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-[13px] font-semibold">
          <Link href="/dashboard/client/sensors" className="rounded-xl bg-[#2E5A44] px-4 py-2 text-white hover:bg-[#264d3b]">
            Thêm thiết bị bằng mã nhận
          </Link>
          <Link href="/dashboard/client/camera" className="inline-flex items-center gap-2 rounded-xl border border-[#2E5A44] px-4 py-2 text-[#2E5A44] hover:bg-[#edf7f1]">
            <Camera size={15} /> Xem camera
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
