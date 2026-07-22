"use client";

import { useState } from "react";
import { Activity, Droplets, ThermometerSun } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { zoneSensorData } from "@/constants/durianMockData";

export function SensorCharts() {
  const [zoneId, setZoneId] = useState("A1");
  const zone = zoneSensorData.find((item) => item.id === zoneId) ?? zoneSensorData[0];

  return (
    <section id="sensors" className="panel scroll-mt-24 p-7 lg:p-8">
      <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-7">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e9] text-[#2E5A44]"><Activity size={20} /></span>
          <div><h2 className="text-[15px] font-bold">Giám sát cảm biến IoT thời gian thực</h2><p className="mt-1 text-[13px] text-[#7e8b83]">DHT22 và cảm biến độ ẩm đất theo mốc giờ</p></div>
        </div>
        <div className="flex items-center gap-7">
          <span className="inline-flex items-center gap-4 rounded-full bg-[#eaf4ec] px-4 py-2 text-sm font-extrabold tracking-[1px] text-[#37704f]"><i className="live-dot size-1.5 rounded-full bg-[#4b9666]" /> LIVE MOCK</span>
          <select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="h-9 rounded-xl border border-[#dfe5de] bg-white px-4 text-[13px] font-bold outline-none">
            {zoneSensorData.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-7 grid gap-7 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#fbf5d8] p-5"><ThermometerSun size={18} className="text-[#a47c12]" /><small className="mt-5 block text-[15px] text-[#7d714d]">Nhiệt độ hiện tại</small><b className="mt-1 block text-xl">{zone.readings.at(-1)?.temperature}°C</b></div>
        <div className="rounded-2xl bg-[#edf3ee] p-5"><Droplets size={18} className="text-[#2E5A44]" /><small className="mt-5 block text-[15px] text-[#64756a]">Độ ẩm không khí DHT22</small><b className="mt-1 block text-xl">{zone.readings.at(-1)?.airHumidity}%</b></div>
        <div className="rounded-2xl bg-[#eef4f4] p-5"><Droplets size={18} className="text-[#477681]" /><small className="mt-5 block text-[15px] text-[#63777a]">Độ ẩm đất</small><b className="mt-1 block text-xl">{zone.readings.at(-1)?.soilMoisture}%</b></div>
      </div>

      <div className="mt-8 grid gap-10 xl:grid-cols-[1.45fr_1fr]">
        <div>
          <h3 className="mb-4 text-[13px] font-bold text-[#536259]">BIẾN THIÊN NHIỆT ĐỘ • 28°C - 32°C</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 260 }}>
              <LineChart data={zone.readings} margin={{ left: -25, right: 10 }}>
                <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                <YAxis domain={[27, 33]} axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                <Line type="monotone" dataKey="temperature" name="Nhiệt độ °C" stroke="#D6A928" strokeWidth={3} dot={{ r: 3, fill: "#D6A928" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-[13px] font-bold text-[#536259]">SO SÁNH ĐỘ ẨM</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 260 }}>
              <BarChart data={zone.readings} margin={{ left: -25 }}>
                <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="airHumidity" name="Không khí" fill="#78966A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="soilMoisture" name="Đất" fill="#2E5A44" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}


