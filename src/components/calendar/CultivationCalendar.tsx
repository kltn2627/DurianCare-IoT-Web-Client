"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  Beaker,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Droplets,
  Filter,
  Leaf,
  MapPin,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Wrench,
} from "lucide-react";
import {
  cultivationTasks,
  cultivationTaskTypes,
  farmZones,
} from "@/constants/durianMockData";
import { MockDataBanner } from "@/components/shared/MockDataBanner";
import type {
  CultivationTask,
  CultivationTaskType,
  IotEvidence,
  TaskFilter,
  TaskFormState,
} from "./types";

const INITIAL_TASKS = cultivationTasks as CultivationTask[];

const TASK_META: Record<
  CultivationTaskType,
  {
    label: string;
    icon: typeof Droplets;
    accent: string;
    iconClass: string;
    surfaceClass: string;
  }
> = {
  IRRIGATION: {
    label: "Tưới nước",
    icon: Droplets,
    accent: "#3f7f72",
    iconClass: "text-teal-700",
    surfaceClass: "bg-teal-50",
  },
  FERTILIZATION: {
    label: "Bón phân",
    icon: Beaker,
    accent: "#b28a20",
    iconClass: "text-amber-700",
    surfaceClass: "bg-amber-50",
  },
  TREATMENT: {
    label: "Phun sinh học",
    icon: ShieldCheck,
    accent: "#b45f42",
    iconClass: "text-orange-700",
    surfaceClass: "bg-orange-50",
  },
  SCOUTING: {
    label: "Khảo sát sâu bệnh",
    icon: Search,
    accent: "#52715e",
    iconClass: "text-emerald-700",
    surfaceClass: "bg-emerald-50",
  },
  PRUNING: {
    label: "Tỉa cành",
    icon: Sprout,
    accent: "#6e7f3e",
    iconClass: "text-lime-700",
    surfaceClass: "bg-lime-50",
  },
  MAINTENANCE: {
    label: "Bảo trì IoT",
    icon: Wrench,
    accent: "#59656e",
    iconClass: "text-slate-700",
    surfaceClass: "bg-slate-100",
  },
};

const WEEK_DAYS = [
  { date: "2026-06-09", weekday: "T3", day: "09" },
  { date: "2026-06-10", weekday: "T4", day: "10" },
  { date: "2026-06-11", weekday: "T5", day: "11" },
  { date: "2026-06-12", weekday: "T6", day: "12" },
  { date: "2026-06-13", weekday: "T7", day: "13" },
  { date: "2026-06-14", weekday: "CN", day: "14" },
  { date: "2026-06-15", weekday: "T2", day: "15" },
];

const DEFAULT_FORM: TaskFormState = {
  title: "",
  type: "IRRIGATION",
  zoneId: "A1",
  crop: "Vụ Dona 2026",
  scheduledDate: "2026-06-11",
  startTime: "06:00",
  durationMinutes: "60",
  assignee: "Tổ canh tác 01",
  materialName: "",
  materialQuantity: "",
  materialUnit: "kg",
  materialUnitCost: "",
  notes: "",
};

const inputClass =
  "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 outline-none transition-all duration-200 ease-in-out placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00`));

function FieldLabel({
  children,
  optional = false,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="mb-2 flex items-center justify-between text-xs font-bold text-neutral-700">
      {children}
      {optional && <small className="font-medium text-neutral-400">Không bắt buộc</small>}
    </span>
  );
}

function TaskComposer({
  onCreate,
}: {
  onCreate: (task: CultivationTask) => void;
}) {
  const [form, setForm] = useState<TaskFormState>(DEFAULT_FORM);
  const [submitted, setSubmitted] = useState(false);

  const update = <Key extends keyof TaskFormState>(
    key: Key,
    value: TaskFormState[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const projectedCost =
    (Number(form.materialQuantity) || 0) * (Number(form.materialUnitCost) || 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const zone = farmZones.find((item) => item.id === form.zoneId);
    if (!zone) return;

    onCreate({
      id: `TASK-${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      zoneId: zone.id,
      zoneName: zone.name,
      crop: form.crop,
      scheduledDate: form.scheduledDate,
      startTime: form.startTime,
      durationMinutes: Number(form.durationMinutes),
      assignee: form.assignee.trim(),
      status: "PLANNED",
      materialName: form.materialName.trim() || "Chưa khai báo",
      materialQuantity: Number(form.materialQuantity) || 0,
      materialUnit: form.materialUnit,
      materialUnitCost: Number(form.materialUnitCost) || 0,
      notes: form.notes.trim(),
      confirmedByIot: false,
      iotEvidence: null,
    });

    setForm((current) => ({
      ...DEFAULT_FORM,
      type: current.type,
      zoneId: current.zoneId,
      crop: current.crop,
      scheduledDate: current.scheduledDate,
    }));
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 2200);
  };

  return (
    <aside className="panel self-start overflow-hidden xl:sticky xl:top-24">
      <div className="border-b border-neutral-100 bg-[#294f3b] px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <span>
            <small className="text-xs font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              Task composer
            </small>
            <h2 className="mt-2 text-lg font-bold tracking-tight">
              Tạo lịch canh tác
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#d0ddd4]">
              Lập công việc, vật tư và dự toán trong một biểu mẫu.
            </p>
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#EED56D]">
            <Plus size={19} />
          </span>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5 p-5">
        {submitted && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
            <Check size={14} />
            Đã thêm công việc vào lịch tuần.
          </div>
        )}

        <label className="block">
          <FieldLabel>Tên công việc</FieldLabel>
          <input
            required
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Ví dụ: Bón Kali nuôi múi Dona"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <FieldLabel>Loại công việc</FieldLabel>
            <select
              value={form.type}
              onChange={(event) =>
                update("type", event.target.value as CultivationTaskType)
              }
              className={inputClass}
            >
              {cultivationTaskTypes.map(
                (item: { value: string; label: string }) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Phân khu</FieldLabel>
            <select
              value={form.zoneId}
              onChange={(event) => update("zoneId", event.target.value)}
              className={inputClass}
            >
              {farmZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <FieldLabel>Vụ mùa</FieldLabel>
          <select
            value={form.crop}
            onChange={(event) => update("crop", event.target.value)}
            className={inputClass}
          >
            <option>Vụ Dona 2026</option>
            <option>Vụ Ri6 2026</option>
            <option>Hạ tầng IoT</option>
          </select>
        </label>

        <div className="grid grid-cols-[1fr_.72fr] gap-3">
          <label className="block">
            <FieldLabel>Ngày thực hiện</FieldLabel>
            <input
              required
              type="date"
              value={form.scheduledDate}
              onChange={(event) => update("scheduledDate", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <FieldLabel>Bắt đầu</FieldLabel>
            <input
              required
              type="time"
              value={form.startTime}
              onChange={(event) => update("startTime", event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-[.7fr_1.3fr] gap-3">
          <label className="block">
            <FieldLabel>Thời lượng</FieldLabel>
            <div className="relative">
              <input
                required
                min="15"
                step="15"
                type="number"
                value={form.durationMinutes}
                onChange={(event) =>
                  update("durationMinutes", event.target.value)
                }
                className={`${inputClass} pr-12`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                phút
              </span>
            </div>
          </label>
          <label className="block">
            <FieldLabel>Người thực hiện</FieldLabel>
            <input
              required
              value={form.assignee}
              onChange={(event) => update("assignee", event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[#eadf9f] bg-[#fffaf0] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Banknote size={15} className="text-amber-700" />
            <span>
              <b className="block text-xs text-neutral-900">
                Chi phí vật tư tiêu hao
              </b>
              <small className="mt-0.5 block text-xs text-neutral-500">
                Ghi nhận theo từng công việc
              </small>
            </span>
          </div>

          <label className="block">
            <FieldLabel optional>Tên vật tư</FieldLabel>
            <input
              value={form.materialName}
              onChange={(event) => update("materialName", event.target.value)}
              placeholder="Kali SOP, Bacillus subtilis..."
              className={inputClass}
            />
          </label>

          <div className="mt-3 grid grid-cols-[.75fr_.55fr_1fr] gap-2">
            <label className="block">
              <FieldLabel optional>Số lượng</FieldLabel>
              <input
                min="0"
                step="0.1"
                type="number"
                value={form.materialQuantity}
                onChange={(event) =>
                  update("materialQuantity", event.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <FieldLabel>Đơn vị</FieldLabel>
              <select
                value={form.materialUnit}
                onChange={(event) => update("materialUnit", event.target.value)}
                className={inputClass}
              >
                <option>kg</option>
                <option>lít</option>
                <option>m³</option>
                <option>bộ</option>
                <option>hộp</option>
                <option>chai</option>
              </select>
            </label>
            <label className="block">
              <FieldLabel optional>Đơn giá</FieldLabel>
              <input
                min="0"
                step="1000"
                type="number"
                value={form.materialUnitCost}
                onChange={(event) =>
                  update("materialUnitCost", event.target.value)
                }
                placeholder="VND"
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-amber-200/70 pt-3">
            <small className="text-xs font-semibold text-neutral-500">
              Dự toán công việc
            </small>
            <b className="text-xs text-amber-800">
              {formatCurrency(projectedCost)}
            </b>
          </div>
        </div>

        <label className="block">
          <FieldLabel optional>Ghi chú kỹ thuật</FieldLabel>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Ngưỡng cảm biến, lưu ý an toàn, phạm vi cây..."
            className="w-full resize-none rounded-xl border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-900 outline-none transition-all duration-200 ease-in-out placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </label>

        <button
          type="submit"
          disabled={!form.title.trim()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-xs font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          <Plus size={15} />
          Thêm vào lịch canh tác
        </button>
      </form>
    </aside>
  );
}

function WeekRail({
  tasks,
  selectedDate,
  onSelectDate,
}: {
  tasks: CultivationTask[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <button
          type="button"
          disabled
          aria-label="Tuần trước"
          className="grid size-8 place-items-center rounded-lg border border-neutral-200 text-neutral-400 transition-all duration-200 ease-in-out hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-center">
          <small className="block text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
            Tuần canh tác
          </small>
          <b className="mt-1 block text-xs tracking-tight text-neutral-900">
            09 - 15 tháng 06, 2026
          </b>
        </span>
        <button
          type="button"
          disabled
          aria-label="Tuần sau"
          className="grid size-8 place-items-center rounded-lg border border-neutral-200 text-neutral-400 transition-all duration-200 ease-in-out hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 divide-x divide-neutral-100">
        {WEEK_DAYS.map((day) => {
          const count = tasks.filter(
            (task) => task.scheduledDate === day.date,
          ).length;
          const selected = selectedDate === day.date;
          const today = day.date === "2026-06-10";
          return (
            <button
              type="button"
              key={day.date}
              onClick={() => onSelectDate(selected ? null : day.date)}
              className={`relative min-h-20 px-1 py-3 text-center transition-all duration-200 ease-in-out focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2E5A44] ${
                selected
                  ? "bg-[#2E5A44] text-white"
                  : "bg-white hover:bg-[#f6f8f5]"
              }`}
            >
              <small
                className={`block text-xs font-bold ${
                  selected ? "text-white/60" : "text-neutral-400"
                }`}
              >
                {day.weekday}
              </small>
              <b
                className={`mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs ${
                  today && !selected
                    ? "bg-[#fbf2cb] text-[#735b15]"
                    : selected
                      ? "bg-white/10 text-white"
                      : "text-neutral-800"
                }`}
              >
                {day.day}
              </b>
              {count > 0 && (
                <span
                  className={`mt-1 inline-flex min-w-4 justify-center rounded-full px-1 py-0.5 text-xs font-bold ${
                    selected
                      ? "bg-[#EED56D] text-[#294f3b]"
                      : "bg-[#e9f0ea] text-[#2E5A44]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IotProof({ evidence }: { evidence: IotEvidence }) {
  return (
    <div className="mt-3 rounded-xl border border-[#cfe1d4] bg-[#f0f7f2] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#2E5A44] ring-1 ring-[#c7ddcd]">
          <Sparkles size={11} />
          🤖 Đã xác nhận tự động qua IoT
        </span>
        <small className="text-xs text-neutral-500">
          {evidence.receivedAt}
        </small>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span>
          <small className="block text-xs uppercase tracking-[0.12em] text-neutral-400">
            Trước
          </small>
          <b className="mt-1 block text-xs text-neutral-700">
            {evidence.before}
          </b>
        </span>
        <span className="rounded-lg bg-[#2E5A44] px-2 py-1 text-xs font-bold text-white">
          {evidence.delta}
        </span>
        <span className="text-right">
          <small className="block text-xs uppercase tracking-[0.12em] text-neutral-400">
            Sau
          </small>
          <b className="mt-1 block text-xs text-[#2E5A44]">
            {evidence.after}
          </b>
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        {evidence.metric} • Nguồn {evidence.sensor}
      </p>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
}: {
  task: CultivationTask;
  onToggle: (id: string) => void;
}) {
  const meta = TASK_META[task.type];
  const Icon = meta.icon;
  const completed = task.status === "COMPLETED";
  const cost = task.materialQuantity * task.materialUnitCost;

  return (
    <article className="group relative rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-neutral-200 hover:shadow-md">
      <i
        className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full"
        style={{ backgroundColor: meta.accent }}
      />
      <div className="flex gap-3 pl-1">
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          aria-label={
            completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"
          }
          className="mt-0.5 shrink-0 rounded-full text-neutral-300 transition-all duration-200 ease-in-out hover:scale-110 hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {completed ? (
            <CheckCircle2 size={20} className="text-emerald-600" />
          ) : (
            <Circle size={20} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold ${meta.surfaceClass} ${meta.iconClass}`}
                >
                  <Icon size={11} />
                  {meta.label}
                </span>
                <span className="text-xs font-medium text-neutral-400">
                  {task.crop}
                </span>
              </div>
              <h3
                className={`mt-2 text-xs font-bold tracking-tight ${
                  completed
                    ? "text-neutral-400 line-through"
                    : "text-neutral-900"
                }`}
              >
                {task.title}
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={11} />
                  {task.startTime} • {task.durationMinutes} phút
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />
                  {task.zoneName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Leaf size={11} />
                  {task.assignee}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-left sm:text-right">
              <small className="block text-xs uppercase tracking-[0.12em] text-neutral-400">
                Chi phí vật tư
              </small>
              <b className="mt-1 block text-xs text-neutral-800">
                {formatCurrency(cost)}
              </b>
            </span>
          </div>

          <div className="mt-3 grid gap-2 rounded-xl bg-neutral-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <span>
              <small className="block text-xs text-neutral-400">
                Vật tư tiêu hao
              </small>
              <b className="mt-1 block text-xs font-semibold text-neutral-700">
                {task.materialName} • {task.materialQuantity} {task.materialUnit}
              </b>
            </span>
            <small className="text-xs font-semibold text-neutral-500">
              {formatCurrency(task.materialUnitCost)}/{task.materialUnit}
            </small>
          </div>

          {task.notes && (
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              {task.notes}
            </p>
          )}
          {task.confirmedByIot && task.iotEvidence && (
            <IotProof evidence={task.iotEvidence} />
          )}
        </div>
      </div>
    </article>
  );
}

function CostSummary({ tasks }: { tasks: CultivationTask[] }) {
  const total = tasks.reduce(
    (sum, task) => sum + task.materialQuantity * task.materialUnitCost,
    0,
  );
  const completed = tasks
    .filter((task) => task.status === "COMPLETED")
    .reduce(
      (sum, task) => sum + task.materialQuantity * task.materialUnitCost,
      0,
    );
  const projected = total - completed;

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {[
        ["Đã ghi nhận", completed, "text-emerald-700"],
        ["Kế hoạch còn lại", projected, "text-amber-700"],
        ["Ngân sách tuần", total, "text-[#2E5A44]"],
      ].map(([label, value, color]) => (
        <div
          key={String(label)}
          className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5"
        >
          <small className="block text-xs font-medium text-neutral-400">
            {String(label)}
          </small>
          <b className={`mt-1 block text-xs ${String(color)}`}>
            {formatCurrency(Number(value))}
          </b>
        </div>
      ))}
    </div>
  );
}

function TaskLedger({
  tasks,
  filter,
  selectedDate,
  onFilter,
  onToggle,
}: {
  tasks: CultivationTask[];
  filter: TaskFilter;
  selectedDate: string | null;
  onFilter: (filter: TaskFilter) => void;
  onToggle: (id: string) => void;
}) {
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (selectedDate && task.scheduledDate !== selectedDate) return false;
        if (filter === "PLANNED") return task.status === "PLANNED";
        if (filter === "COMPLETED") return task.status === "COMPLETED";
        if (filter === "IOT") return task.confirmedByIot;
        return true;
      }),
    [filter, selectedDate, tasks],
  );

  const groups = useMemo(() => {
    const result = new Map<string, CultivationTask[]>();
    filteredTasks
      .slice()
      .sort((a, b) =>
        `${a.scheduledDate}${a.startTime}`.localeCompare(
          `${b.scheduledDate}${b.startTime}`,
        ),
      )
      .forEach((task) => {
        const list = result.get(task.scheduledDate) ?? [];
        list.push(task);
        result.set(task.scheduledDate, list);
      });
    return [...result.entries()];
  }, [filteredTasks]);

  const filters: Array<{ id: TaskFilter; label: string }> = [
    { id: "ALL", label: "Tất cả" },
    { id: "PLANNED", label: "Sắp tới" },
    { id: "COMPLETED", label: "Hoàn thành" },
    { id: "IOT", label: "IoT xác nhận" },
  ];

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-neutral-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <span>
            <small className="text-xs font-bold uppercase tracking-[0.18em] text-[#6a806f]">
              Work ledger
            </small>
            <h2 className="mt-1 text-base font-bold tracking-tight text-neutral-900">
              Danh sách công việc
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              {selectedDate
                ? `Đang lọc ngày ${formatDate(selectedDate)}`
                : "Toàn bộ lịch tuần 09 - 15/06"}
            </p>
          </span>
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-neutral-100 p-1">
            {filters.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onFilter(item.id)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] disabled:cursor-not-allowed disabled:opacity-50 ${
                  filter === item.id
                    ? "bg-white text-[#2E5A44] shadow-sm"
                    : "text-neutral-500 hover:bg-white/60 hover:text-neutral-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <CostSummary tasks={filteredTasks} />
        </div>
      </div>

      <div className="max-h-[760px] overflow-y-auto p-4 scrollbar-thin sm:p-5">
        {groups.length > 0 ? (
          <div className="space-y-6">
            {groups.map(([date, dateTasks]) => (
              <div key={date}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#e9f0ea] text-[#2E5A44]">
                    <CalendarDays size={15} />
                  </span>
                  <span>
                    <b className="block text-xs capitalize text-neutral-800">
                      {formatDate(date)}
                    </b>
                    <small className="mt-0.5 block text-xs text-neutral-400">
                      {dateTasks.length} công việc
                    </small>
                  </span>
                  <i className="h-px flex-1 bg-neutral-100" />
                </div>
                <div className="space-y-3">
                  {dateTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center text-center">
            <span>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400">
                <Filter size={20} />
              </span>
              <b className="mt-4 block text-xs text-neutral-700">
                Không có công việc phù hợp
              </b>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                Chọn ngày khác hoặc thay đổi bộ lọc trạng thái.
              </p>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export function CultivationCalendar() {
  const [tasks, setTasks] = useState<CultivationTask[]>(INITIAL_TASKS);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("ALL");

  const completedCount = tasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;
  const iotConfirmedCount = tasks.filter(
    (task) => task.confirmedByIot,
  ).length;
  const weeklyCost = tasks.reduce(
    (sum, task) => sum + task.materialQuantity * task.materialUnitCost,
    0,
  );

  const createTask = (task: CultivationTask) => {
    setTasks((current) => [task, ...current]);
    setSelectedDate(task.scheduledDate);
    setFilter("ALL");
  };

  const toggleTask = (id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status:
                task.status === "COMPLETED" ? "PLANNED" : "COMPLETED",
            }
          : task,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <MockDataBanner />
      <section className="grid-pattern overflow-hidden rounded-[24px] bg-[#294f3b] p-6 text-white sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              <Activity size={13} />
              Điều phối canh tác • Tuần 24
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Lịch chăm sóc Dona & Ri6
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#d0ddd4] sm:text-xs">
              Điều phối công việc, kiểm soát vật tư và đối soát kết quả thực tế
              từ cụm cảm biến tại vườn.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Công việc", tasks.length, CalendarDays],
              ["IoT xác nhận", iotConfirmedCount, Sparkles],
              ["Chi phí tuần", formatCurrency(weeklyCost), Banknote],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof CalendarDays;
              return (
                <div
                  key={String(label)}
                  className="min-w-24 rounded-xl border border-white/10 bg-white/[.08] px-3 py-3"
                >
                  <MetricIcon size={14} className="text-[#EED56D]" />
                  <b className="mt-3 block text-xs tracking-tight">
                    {String(value)}
                  </b>
                  <small className="mt-1 block text-xs text-white/55">
                    {String(label)}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
          <i
            className="block h-full rounded-full bg-[#EED56D] transition-all duration-500 ease-in-out"
            style={{
              width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%`,
            }}
          />
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.65fr)]">
        <TaskComposer onCreate={createTask} />
        <div className="min-w-0 space-y-4">
          <WeekRail
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <TaskLedger
            tasks={tasks}
            filter={filter}
            selectedDate={selectedDate}
            onFilter={setFilter}
            onToggle={toggleTask}
          />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-[1.25fr_.75fr]">
        <div className="panel flex items-start gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
            <Settings2 size={17} />
          </span>
          <span>
            <b className="block text-xs text-neutral-900">
              Quy tắc xác nhận IoT
            </b>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Chỉ công việc tưới hoặc bón phân được gắn xác nhận tự động khi
              gateway ghi nhận delta cảm biến đúng phân khu trong cửa sổ thời
              gian thực hiện.
            </p>
          </span>
        </div>
        <div className="panel flex items-start gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-amber-700">
            <Banknote size={17} />
          </span>
          <span>
            <b className="block text-xs text-neutral-900">
              Chi phí chưa gồm nhân công
            </b>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Dự toán hiện tính theo vật tư tiêu hao và có thể thay bằng dữ liệu
              kế toán khi kết nối backend.
            </p>
          </span>
        </div>
      </section>
    </div>
  );
}
