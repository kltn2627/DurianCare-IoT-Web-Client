"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { diseaseDistribution } from "@/constants/durianMockData";
export function DiseasePieChart() {
  return (
    <div className="space-y-4">
      <div className="grid items-center gap-10 sm:grid-cols-[1fr_220px]">
      <div className="relative h-[300px]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 300 }}>
          <PieChart>
            <Pie data={diseaseDistribution} dataKey="value" innerRadius={76} outerRadius={112} paddingAngle={3} stroke="none">
              {diseaseDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(value) => [`${value}%`, "Tần suất"]} contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
          </PieChart>
        </ResponsiveContainer>
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><b className="text-3xl">2.840</b><small className="mt-1 text-[15px] text-[#7e8a82]">Lượt phân tích AI</small></span>
      </div>
      <div className="space-y-5">
        {diseaseDistribution.map((item) => (
          <div key={item.name} className="grid grid-cols-[10px_1fr_auto] items-center gap-4">
            <i className="size-2 rounded-sm" style={{ background: item.color }} />
            <span><b className="block text-[13px]">{item.label}</b><small className="text-[13px] text-[#8a968e]">{item.name}</small></span>
            <b className="text-sm">{item.value}%</b>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}


