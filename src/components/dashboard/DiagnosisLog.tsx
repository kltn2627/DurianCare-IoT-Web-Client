import { Bot } from "lucide-react";
import { diagnosisHistory } from "@/constants/durianMockData";
import { diseaseLabels } from "@/lib/labels";
import { MockDataBanner } from "@/components/shared/MockDataBanner";

export function DiagnosisLog() {
  return (
    <section id="diagnosis" className="panel scroll-mt-24 p-7 lg:p-8">
      <MockDataBanner />
      <div className="mt-5 flex items-center gap-7">
        <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
          <Bot size={20} />
        </span>
        <div>
          <h2 className="text-[15px] font-bold">Nhật ký dịch bệnh AI từ Mobile App</h2>
          <p className="mt-1 text-[13px] text-[#7e8b83]">Ca quét lá được đồng bộ vào hồ sơ từng gốc cây</p>
        </div>
      </div>
      <div className="mt-7 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-[#f6f8f5] text-[13px] tracking-[.8px] text-[#859189]">
              <th className="rounded-l-lg px-5 py-4">MÃ GỐC CÂY</th>
              <th className="px-5 py-4">PHÂN KHU</th>
              <th className="px-5 py-4">LOẠI BỆNH AI</th>
              <th className="px-5 py-4">THỜI GIAN PHÁT HIỆN</th>
              <th className="rounded-r-lg px-5 py-4">ĐỘ CHÍNH XÁC</th>
            </tr>
          </thead>
          <tbody>
            {diagnosisHistory.map((item) => (
              <tr key={item.id} className="border-b border-[#ebeee9] text-[15px]">
                <td className="px-5 py-5">
                  <b>{item.treeCode}</b>
                  <small className="mt-1 block text-[13px] text-[#8a968e]">{item.id}</small>
                </td>
                <td className="px-5 py-5">{item.zone}</td>
                <td className="px-5 py-5">
                  <span className={`rounded-full px-2.5 py-1.5 text-sm font-bold ${item.disease === "Healthy_Leaf" ? "bg-[#e9f2ea] text-[#39704f]" : "bg-[#fbf1ca] text-[#7b6015]"}`}>
                    {diseaseLabels[item.disease]}
                  </span>
                  <small className="mt-1 block font-mono text-[13px] text-[#8b968f]">{item.disease}</small>
                </td>
                <td className="px-5 py-5">{item.detectedAt}</td>
                <td className="px-5 py-5">
                  <b className="text-sm">{item.confidence}%</b>
                  <span className="ml-2 inline-block h-1.5 w-14 overflow-hidden rounded-full bg-[#e7ebe6] align-middle">
                    <i className="block h-full rounded-full bg-[#4e8062]" style={{ width: `${item.confidence}%` }} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


