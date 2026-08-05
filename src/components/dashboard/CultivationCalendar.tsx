"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  ClipboardList,
  Droplets,
  Filter,
  Leaf,
  Plus,
  SprayCan,
  StickyNote,
  X,
} from "lucide-react";
import { cropLots, farmZones } from "@/constants/durianMockData";
import { formatDosageLabel, formatSafetyInterval } from "@/lib/treatment-terms";
import type { DashboardRole } from "./DashboardShell";

type TaskType =
  | "fertilizer"
  | "pesticide"
  | "irrigation"
  | "pruning"
  | "inspection";
type TaskStatus = "planned" | "in-progress" | "done";

type CultivationTask = {
  id: string;
  assignee: string;
  cropId: string;
  date: string;
  dosage: string;
  materialName: string;
  notes: string;
  safetyInterval: string;
  status: TaskStatus;
  time: string;
  type: TaskType;
  zoneId: string;
};

const taskTypes: Record<
  TaskType,
  { label: string; icon: typeof Leaf; tone: string }
> = {
  fertilizer: {
    label: "Rải phân",
    icon: Leaf,
    tone: "bg-[#e9f2ea] text-[#39704f]",
  },
  pesticide: {
    label: "Xịt thuốc",
    icon: SprayCan,
    tone: "bg-[#fbf1ca] text-[#7b6015]",
  },
  irrigation: {
    label: "Tưới nước",
    icon: Droplets,
    tone: "bg-[#e8f2f4] text-[#477681]",
  },
  pruning: {
    label: "Tỉa cành",
    icon: ClipboardList,
    tone: "bg-[#f1eee8] text-[#755f3d]",
  },
  inspection: {
    label: "Kiểm tra vườn",
    icon: CalendarCheck,
    tone: "bg-[#edf0f7] text-[#435d8a]",
  },
};

const statusLabels: Record<TaskStatus, string> = {
  planned: "Đã lên lịch",
  "in-progress": "Đang thực hiện",
  done: "Hoàn thành",
};

const initialTasks: CultivationTask[] = [
  {
    id: "CAL-001",
    assignee: "Tổ canh tác 01",
    cropId: "DC-2026-DONA-018",
    date: "2026-06-12",
    dosage: "2.5 kg/cây",
    materialName: "Phân hữu cơ vi sinh 3-2-2",
    notes: "Rải theo tán, giữ cách gốc 40 cm, tưới nhẹ sau khi rải.",
    safetyInterval: "0 ngày",
    status: "planned",
    time: "07:30",
    type: "fertilizer",
    zoneId: "A1",
  },
  {
    id: "CAL-002",
    assignee: "KS. Trần Hoàng Nam",
    cropId: "DC-2026-RI6-012",
    date: "2026-06-13",
    dosage: "1.2 lít/ha",
    materialName: "Bacillus subtilis",
    notes: "Phun mặt dưới lá vào chiều mát, tránh mưa trong 6 giờ sau phun.",
    safetyInterval: "7 ngày",
    status: "in-progress",
    time: "16:00",
    type: "pesticide",
    zoneId: "B2",
  },
  {
    id: "CAL-003",
    assignee: "Chủ vườn Nguyễn Minh",
    cropId: "DC-2026-DONA-018",
    date: "2026-06-14",
    dosage: "Kiểm tra 12 trạm",
    materialName: "Độ ẩm đất và áp lực tưới",
    notes: "Ưu tiên các cây có độ ẩm dưới 72%.",
    safetyInterval: "Không áp dụng",
    status: "planned",
    time: "06:45",
    type: "inspection",
    zoneId: "A2",
  },
];

const blankTask: Omit<CultivationTask, "id" | "status"> = {
  assignee: "KS. Trần Hoàng Nam",
  cropId: cropLots[0]?.id ?? "",
  date: "2026-06-15",
  dosage: "",
  materialName: "",
  notes: "",
  safetyInterval: "",
  time: "07:00",
  type: "fertilizer",
  zoneId: farmZones[0]?.id ?? "",
};

function getDaysUntilLabel(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${date}T00:00:00`);
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);

  if (days < 0)
    return {
      label: `Quá hạn ${Math.abs(days)} ngày`,
      tone: "bg-[#f8eae5] text-[#96523c]",
    };
  if (days === 0)
    return { label: "Hôm nay", tone: "bg-[#fbf1ca] text-[#7b6015]" };
  if (days === 1)
    return { label: "Còn 1 ngày", tone: "bg-[#e9f2ea] text-[#39704f]" };
  return { label: `Còn ${days} ngày`, tone: "bg-[#e9f2ea] text-[#39704f]" };
}

export function CultivationCalendar({ role }: { role: DashboardRole }) {
  const [tasks, setTasks] = useState<CultivationTask[]>(initialTasks);
  const [draft, setDraft] = useState(blankTask);
  const [zoneFilter, setZoneFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(true);
  const [formError, setFormError] = useState("");

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => zoneFilter === "all" || task.zoneId === zoneFilter)
        .filter((task) => typeFilter === "all" || task.type === typeFilter)
        .sort((left, right) =>
          `${left.date} ${left.time}`.localeCompare(
            `${right.date} ${right.time}`,
          ),
        ),
    [tasks, typeFilter, zoneFilter],
  );

  const upcomingTasks = visibleTasks.filter((task) => task.status !== "done");
  const completedTasks = visibleTasks
    .filter((task) => task.status === "done")
    .sort((left, right) =>
      `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`),
    );

  const summary = useMemo(
    () => ({
      done: tasks.filter((task) => task.status === "done").length,
      pesticide: tasks.filter((task) => task.type === "pesticide").length,
      planned: tasks.filter((task) => task.status !== "done").length,
    }),
    [tasks],
  );

  function addTask() {
    const scheduledAt = new Date(`${draft.date}T${draft.time}`);
    if (!draft.materialName.trim() || !draft.dosage.trim()) {
      setFormError("Không lưu được lịch. Vui lòng nhập tên vật tư và liều lượng.");
      return;
    }
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setFormError("Không lưu được lịch. Vui lòng chọn ngày và giờ sau thời gian hiện tại.");
      return;
    }
    setTasks((current) => [
      {
        ...draft,
        id: `CAL-${Date.now()}`,
        materialName: draft.materialName.trim(),
        dosage: draft.dosage.trim(),
        notes: draft.notes.trim() || "Chưa có ghi chú bổ sung.",
        safetyInterval: draft.safetyInterval.trim() || "Không yêu cầu cách ly",
        status: "planned",
      },
      ...current,
    ]);
    setDraft(blankTask);
    setFormError("");
  }

  function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
  }

  const actor =
    role === "OWNER"
      ? "Chủ vườn"
      : role === "ENGINEER"
        ? "Kỹ sư hợp tác"
        : "Điều phối viên";

  const renderTaskCard = (task: CultivationTask) => {
    const zone = farmZones.find((item) => item.id === task.zoneId);
    const type = taskTypes[task.type];
    const Icon = type.icon;
    const daysUntil = getDaysUntilLabel(task.date);

    return (
      <article
        key={task.id}
        className="rounded-2xl border border-[#e1e6df] p-5"
      >
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${type.tone}`}
          >
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <b className="text-lg leading-6">
                  {type.label} • {task.materialName}
                </b>
                <span className="rounded-full bg-[#eef3ee] px-2 py-1 text-[13px] font-bold text-[#587161]">
                  {statusLabels[task.status]}
                </span>
              </div>
              {task.status !== "done" && (
                <span
                  className={`rounded-full px-4 py-2 text-[13px] font-extrabold ${daysUntil.tone}`}
                >
                  {daysUntil.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-[15px] text-[#7f8c84]">
              {task.date} lúc {task.time} • {zone?.name} • {task.cropId}
            </p>
            <div className="mt-5 grid gap-4 text-[15px] sm:grid-cols-3">
              <Info label="Liều lượng phun" value={formatDosageLabel(task.dosage)} />
              <Info label="Phụ trách" value={task.assignee} />
              <Info
                label="Thời gian cách ly an toàn"
                value={formatSafetyInterval(task.safetyInterval)}
              />
            </div>
            <p className="mt-4 flex gap-4 rounded-xl bg-[#f7f8f5] px-4 py-2 text-[15px] leading-4 text-[#6f7d74]">
              <StickyNote
                size={14}
                className="mt-0.5 shrink-0 text-[#7b8a80]"
              />{" "}
              {task.notes}
            </p>
          </div>
          <div className="flex gap-4 xl:flex-col">
            <button
              onClick={() => updateStatus(task.id, "in-progress")}
              disabled={task.status === "done"}
              className="rounded-lg border border-[#dfe6df] px-4 py-2 text-sm font-bold text-[#607067] disabled:opacity-40"
            >
              Đang làm
            </button>
            <button
              onClick={() => updateStatus(task.id, "done")}
              disabled={task.status === "done"}
              className="flex items-center justify-center gap-1 rounded-lg bg-[#2E5A44] px-4 py-2 text-sm font-bold text-white disabled:bg-[#aeb8b1]"
            >
              <Check size={13} /> Xong
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8">
      <section className="grid-pattern rounded-[24px] bg-[#294f3b] p-8 text-white lg:flex lg:items-center lg:justify-between lg:p-10">
        <div>
          <p className="text-sm font-extrabold tracking-[1.5px] text-[#EED56D]">
            LỊCH CANH TÁC • {actor.toUpperCase()}
          </p>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
            Điều phối rải phân, xịt thuốc và chăm sóc vườn
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-[#d2ded5]">
            Chủ vườn và kỹ sư đã hợp tác có thể cùng lên lịch vật tư, liều
            lượng, thời gian cách ly và ghi chú thực địa cho từng phân khu.
          </p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="mt-7 flex items-center justify-center gap-4 rounded-xl bg-[#EED56D] px-5 py-4 text-[13px] font-bold text-[#294f3b] lg:mt-0"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}{" "}
          {showForm ? "Thu gọn tạo lịch" : "Tạo lịch mới"}
        </button>
      </section>

      <section className="grid gap-7 md:grid-cols-3">
        <article className="panel p-7">
          <small className="text-[15px] text-[#77867d]">
            Công việc đang chờ
          </small>
          <b className="mt-1 block text-2xl text-[#2E5A44]">
            {summary.planned}
          </b>
        </article>
        <article className="panel p-7">
          <small className="text-[15px] text-[#77867d]">Lịch xịt thuốc</small>
          <b className="mt-1 block text-2xl text-[#7b6015]">
            {summary.pesticide}
          </b>
        </article>
        <article className="panel p-7">
          <small className="text-[15px] text-[#77867d]">Đã hoàn thành</small>
          <b className="mt-1 block text-2xl text-[#39704f]">{summary.done}</b>
        </article>
      </section>

      {showForm && (
        <section className="panel p-7 lg:p-8">
          <div className="flex items-center gap-7">
            <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
              <Plus size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold">Tạo lịch canh tác</h2>
              <p className="mt-1 text-[13px] text-[#7e8b83]">
                Ghi rõ loại việc, tên vật tư, liều lượng, người phụ trách và lưu
                ý an toàn.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Ngày thực hiện">
              <input
                type="date"
                value={draft.date}
                onChange={(event) =>
                  setDraft({ ...draft, date: event.target.value })
                }
                className="input-control"
              />
            </Field>
            <Field label="Giờ">
              <input
                type="time"
                value={draft.time}
                onChange={(event) =>
                  setDraft({ ...draft, time: event.target.value })
                }
                className="input-control"
              />
            </Field>
            <Field label="Loại công việc">
              <select
                value={draft.type}
                onChange={(event) =>
                  setDraft({ ...draft, type: event.target.value as TaskType })
                }
                className="input-control"
              >
                {Object.entries(taskTypes).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phân khu">
              <select
                value={draft.zoneId}
                onChange={(event) =>
                  setDraft({ ...draft, zoneId: event.target.value })
                }
                className="input-control"
              >
                {farmZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vụ mùa">
              <select
                value={draft.cropId}
                onChange={(event) =>
                  setDraft({ ...draft, cropId: event.target.value })
                }
                className="input-control"
              >
                {cropLots.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.id} • {crop.variety}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tên phân/thuốc/vật tư">
              <input
                value={draft.materialName}
                onChange={(event) =>
                  setDraft({ ...draft, materialName: event.target.value })
                }
                placeholder="VD: NPK 16-16-8, thuốc sinh học..."
                className="input-control"
              />
            </Field>
            <Field label="Liều lượng phun">
              <input
                value={draft.dosage}
                onChange={(event) =>
                  setDraft({ ...draft, dosage: event.target.value })
                }
                placeholder="VD: 0.8 kg/cây, 1.2 lít/ha"
                className="input-control"
              />
            </Field>
            <Field label="Người phụ trách">
              <input
                value={draft.assignee}
                onChange={(event) =>
                  setDraft({ ...draft, assignee: event.target.value })
                }
                className="input-control"
              />
            </Field>
            <Field label="Thời gian cách ly an toàn">
              <input
                value={draft.safetyInterval}
                onChange={(event) =>
                  setDraft({ ...draft, safetyInterval: event.target.value })
                }
                placeholder="VD: 7 ngày, không yêu cầu cách ly"
                className="input-control"
              />
            </Field>
            <label className="md:col-span-2 xl:col-span-3">
              <span className="mb-1 block text-[15px] font-bold text-[#6d7a72]">
                Ghi chú thực địa
              </span>
              <textarea
                value={draft.notes}
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
                placeholder="Điều kiện thời tiết, hướng dẫn phun/rải, lưu ý an toàn..."
                className="input-control min-h-[78px] resize-none py-[27px]"
              />
            </label>
          </div>
          {formError && (
            <p className="mt-5 rounded-xl border border-[#ead8d1] bg-[#fff6f1] px-5 py-4 text-[15px] font-bold text-[#96523c]">
              {formError}
            </p>
          )}
          <button
            onClick={addTask}
            className="mt-5 flex items-center gap-4 rounded-xl bg-[#2E5A44] px-5 py-4 text-[13px] font-bold text-white"
          >
            <CalendarCheck size={15} /> Lưu lịch canh tác
          </button>
        </section>
      )}

      <section className="panel p-7 lg:p-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-7">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
              <CalendarCheck size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold">Danh sách lịch canh tác</h2>
              <p className="mt-1 text-[13px] text-[#7e8b83]">
                Theo dõi tiến độ từng lịch và xác nhận sau khi hoàn tất.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-4 rounded-xl bg-[#f6f8f5] px-4 py-2 text-[15px] font-bold text-[#607067]">
              <Filter size={13} /> Lọc
            </span>
            <select
              value={zoneFilter}
              onChange={(event) => setZoneFilter(event.target.value)}
              className="h-9 rounded-xl border border-[#dfe5de] bg-white px-4 text-[13px] font-bold outline-none"
            >
              <option value="all">Tất cả phân khu</option>
              {farmZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-9 rounded-xl border border-[#dfe5de] bg-white px-4 text-[13px] font-bold outline-none"
            >
              <option value="all">Tất cả công việc</option>
              {Object.entries(taskTypes).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-7 space-y-10">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-[#2E5A44]">
                Công việc sắp tới
              </h3>
              <span className="rounded-full bg-[#eef3ee] px-4 py-2 text-[15px] font-bold text-[#587161]">
                {upcomingTasks.length} chưa hoàn thành
              </span>
            </div>
            <div className="grid gap-7">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map(renderTaskCard)
              ) : (
                <p className="rounded-2xl bg-[#f7f8f5] px-5 py-4 text-[15px] font-semibold text-[#7f8c84]">
                  Không có công việc chưa hoàn thành trong bộ lịch hiện tại.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between border-t border-[#e1e6df] pt-8">
              <h3 className="text-[15px] font-extrabold text-[#6d7a72]">
                Lịch sử hoàn thành
              </h3>
              <span className="rounded-full bg-[#f6f8f5] px-4 py-2 text-[13px] font-bold text-[#7f8c84]">
                {completedTasks.length} đã xong
              </span>
            </div>
            <div className="grid gap-7">
              {completedTasks.length > 0 ? (
                completedTasks.map(renderTaskCard)
              ) : (
                <p className="rounded-2xl bg-[#f7f8f5] px-5 py-4 text-[15px] font-semibold text-[#7f8c84]">
                  Chưa có công việc hoàn thành trong bộ lịch hiện tại.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-[15px] font-bold text-[#6d7a72]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl bg-[#f6f8f5] px-4 py-2">
      <small className="block text-[15px] font-bold text-[#8a968e]">
        {label}
      </small>
      <b className="mt-1 block text-[15px] text-[#34483b]">{value}</b>
    </span>
  );
}
