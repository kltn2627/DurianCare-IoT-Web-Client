import type { Metadata } from "next";
import { SensorCharts } from "@/components/charts/SensorCharts";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Cảm biến IoT" };

export default function ClientSensorsPage() {
  return (
    <DashboardShell role="OWNER">
      <SensorCharts />
    </DashboardShell>
  );
}


