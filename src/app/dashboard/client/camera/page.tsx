import type { Metadata } from "next";
import { CameraSection } from "@/components/camera/CameraSection";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Camera ESP32" };

export default function ClientCameraPage() {
  return (
    <DashboardShell role="OWNER">
      <CameraSection />
    </DashboardShell>
  );
}
