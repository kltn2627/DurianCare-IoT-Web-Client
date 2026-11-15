import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AdminDeviceInventory } from "@/components/iot/AdminDeviceInventory";

export const metadata: Metadata = {
  title: "Thiết bị IoT",
  description: "Đăng ký thiết bị và cấp mã kích hoạt.",
};

export default async function AdminDevicesPage() {
  return (
    <DashboardShell role="ADMIN">
      <AdminDeviceInventory />
    </DashboardShell>
  );
}
