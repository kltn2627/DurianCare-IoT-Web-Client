import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminChatDispatch } from "@/components/expert-chat/AdminChatDispatch";
import {
  DashboardShell,
  type DashboardRole,
} from "@/components/dashboard/DashboardShell";
import { ExpertChatWorkspace } from "@/components/expert-chat/ExpertChatWorkspace";

export const metadata: Metadata = {
  title: "Điều phối & tư vấn nhà vườn",
  description:
    "Không gian điều phối của Admin và workspace tư vấn dành cho Kỹ sư DurianCare.",
};

export default async function ExpertChatPage() {
  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("durian-role")?.value;
  const role: DashboardRole =
    cookieRole === "ENGINEER" ? "ENGINEER" : "ADMIN";

  return (
    <DashboardShell role={role}>
      {role === "ENGINEER" ? <ExpertChatWorkspace /> : <AdminChatDispatch />}
    </DashboardShell>
  );
}
