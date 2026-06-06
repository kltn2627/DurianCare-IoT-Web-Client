import { BadgeCheck, Droplets, Radio, ScanSearch, ShieldAlert, Trees, Warehouse } from "lucide-react";

const icons = { BadgeCheck, Droplets, Radio, ScanSearch, ShieldAlert, Trees, Warehouse };

export function StatCards({ items }: { items: Array<{ label: string; value: string; note: string; icon: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = icons[item.icon as keyof typeof icons];
        return (
          <article className="panel flex items-center gap-4 p-5" key={item.label}>
            <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[#e8efe9] text-[#2E5A44]"><Icon size={21} /></span>
            <span><small className="block text-[10px] text-[#77867d]">{item.label}</small><b className="mt-1 block text-2xl tracking-[-.7px]">{item.value}</b><small className="mt-1 block text-[9px] font-semibold text-[#63816d]">{item.note}</small></span>
          </article>
        );
      })}
    </div>
  );
}
