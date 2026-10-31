import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpenText,
  Bot,
  CalendarDays,
  MapPinned,
  MessageCircleMore,
  ScanSearch,
  ShieldCheck,
  Sprout,
  ThermometerSun,
  UsersRound,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OwnerDashboardLive } from "@/components/dashboard/OwnerDashboardLive";
import { AUTH_COOKIES, readSession } from "@/lib/auth/server";
import { loadOwnerOverview, SIGNED_OUT_OVERVIEW, type OwnerOverview } from "@/lib/dashboard/ownerOverview";

export const metadata: Metadata = { title: "Dashboard chủ trang trại" };

const featureLinks = [
  {
    href: "/dashboard/client/sensors",
    title: "Cảm biến IoT",
    subtitle: "Theo dõi nhiệt độ, độ ẩm không khí và độ ẩm đất theo phân khu.",
    icon: ThermometerSun,
  },
  {
    href: "/dashboard/client/cultivation-zones",
    title: "Khu canh tác",
    subtitle:
      "Tạo khu canh tác thuộc trang trại, lưu diện tích, giống cây, ngày trồng và lịch sử thu hoạch.",
    icon: MapPinned,
  },
  {
    href: "/dashboard/client/diagnosis",
    title: "Phân tích AI",
    subtitle: "Xem lịch sử quét bệnh lá từ Mobile App theo từng gốc cây.",
    icon: ScanSearch,
  },
  {
    href: "/dashboard/client/authorization",
    title: "Ủy quyền vườn",
    subtitle: "Phê duyệt, giới hạn quyền và thu hồi quyền kỹ sư hợp tác.",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/client/calendar",
    title: "Lịch canh tác",
    subtitle:
      "Lên lịch rải phân, xịt thuốc, liều lượng, cách ly và ghi chú thực địa.",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/client/crops",
    title: "Vụ mùa & QR",
    subtitle: "Quản lý lô thu hoạch và tạo mã truy xuất nguồn gốc công khai.",
    icon: Sprout,
  },
  {
    href: "/dashboard/client/export-compliance",
    title: "Đánh giá Xuất khẩu",
    subtitle: "Điểm sẵn sàng xuất khẩu, kiểm tra dư lượng MRL và thời gian cách ly theo từng thị trường.",
    icon: BadgeCheck,
  },
  {
    href: "/dashboard/community",
    title: "Cộng đồng",
    subtitle:
      "Đăng câu hỏi, chia sẻ kinh nghiệm trồng vườn và trao đổi với kỹ sư, nhà vườn khác.",
    icon: UsersRound,
  },
  {
    href: "/dashboard/client/chat",
    title: "Tư vấn AI & Kỹ sư",
    subtitle:
      "Hỏi nhanh trợ lý 24/7 hoặc gửi ảnh cứu trợ theo đúng phân khu vườn.",
    icon: MessageCircleMore,
  },
  {
    href: "/dashboard/client/knowledge",
    title: "Cẩm nang VietGAP",
    subtitle:
      "Đọc hướng dẫn sầu riêng đã kiểm duyệt theo dinh dưỡng, sâu bệnh và mùa vụ.",
    icon: BookOpenText,
  },
];

export default async function ClientDashboardPage() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  const userName = session?.profile.fullName?.trim() || "nhà vườn";
  const overview = await readOwnerOverview(cookieStore);

  return (
    <DashboardShell role="OWNER" userName={userName}>
      <div className="space-y-8">
        <OwnerDashboardLive
          initialNowIso={new Date().toISOString()}
          initialOverview={overview}
          userName={userName}
        />

        <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {featureLinks.map(({ href, title, subtitle, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="panel group flex min-h-[170px] flex-col justify-between p-7 transition hover:-translate-y-0.5 hover:border-[#cad9ce] hover:shadow-lg hover:shadow-[#2e5a4412]"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11] transition group-hover:bg-[#2E5A44] group-hover:text-[#EED56D]">
                <Icon size={20} />
              </span>
              <span>
                <b className="block text-[13px] text-[#253b2f]">{title}</b>
                <small className="mt-2 block text-[15px] leading-4 text-[#7d8981]">
                  {subtitle}
                </small>
              </span>
            </Link>
          ))}
        </section>

        <section className="panel flex flex-col gap-8 p-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-7">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
              <Bot size={20} />
            </span>
            <span>
              <b className="block text-[13px]">
                Luồng nghiệp vụ đã được tách riêng
              </b>
              <small className="mt-1 block text-[15px] text-[#7d8981]">
                Chọn từng chức năng phía trên hoặc trên thanh điều hướng để thao
                tác chi tiết.
              </small>
            </span>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

async function readOwnerOverview(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<OwnerOverview> {
  const accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  if (!accessToken) return SIGNED_OUT_OVERVIEW;
  const backendBase = (process.env.DURIANCARE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
  return loadOwnerOverview(async (path) => {
    const response = await fetch(`${backendBase}${path}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}
