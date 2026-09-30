"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { sensorTimeline } from "@/constants/durianMockData";
import { MockDataBanner } from "@/components/shared/MockDataBanner";

export function TraceabilityChart() {
  return (
    <div className="space-y-3">
      <MockDataBanner />
      <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 900, height: 240 }}>
        <AreaChart data={sensorTimeline} margin={{ left: -25, right: 8 }}>
          <defs>
            <linearGradient id="traceSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2E5A44" stopOpacity={0.3}/><stop offset="95%" stopColor="#2E5A44" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
          <YAxis domain={[60, 90]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 13 }} />
          <Area type="monotone" dataKey="soilMoisture" name="Độ ẩm đất %" stroke="#2E5A44" strokeWidth={2.5} fill="url(#traceSoil)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    </div>
  );
}

