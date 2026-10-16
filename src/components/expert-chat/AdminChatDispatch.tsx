"use client";

import { useMemo, useReducer, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircleMore,
  Search,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  Wifi,
} from "lucide-react";
import {
  chatDispatchQueue,
  dispatchEngineers,
} from "@/constants/durianMockData";
import type { ExpertConversation } from "./types";

type DispatchPriority = "HIGH" | "MEDIUM" | "NORMAL";

interface DispatchCase extends ExpertConversation {
  priority: DispatchPriority;
  assignedEngineer: string | null;
  submittedAt: string;
}

interface EngineerOption {
  id: string;
  name: string;
  specialty: string;
  activeCases: number;
  online: boolean;
}

interface DispatchState {
  cases: DispatchCase[];
  selectedCaseId: string;
  selectedEngineerId: string;
}

type DispatchAction =
  | { type: "SELECT_CASE"; caseId: string }
  | { type: "SELECT_ENGINEER"; engineerId: string }
  | { type: "ASSIGN" };

const engineers = dispatchEngineers as EngineerOption[];
const initialCases = chatDispatchQueue as DispatchCase[];

const initialState: DispatchState = {
  cases: initialCases,
  selectedCaseId: initialCases[0]?.id ?? "",
  selectedEngineerId: engineers.find((engineer) => engineer.online)?.id ?? "",
};

function reducer(
  state: DispatchState,
  action: DispatchAction,
): DispatchState {
  switch (action.type) {
    case "SELECT_CASE":
      return { ...state, selectedCaseId: action.caseId };
    case "SELECT_ENGINEER":
      return { ...state, selectedEngineerId: action.engineerId };
    case "ASSIGN": {
      const engineer = engineers.find(
        (item) => item.id === state.selectedEngineerId,
      );
      if (!engineer) return state;
      return {
        ...state,
        cases: state.cases.map((item) =>
          item.id === state.selectedCaseId
            ? {
                ...item,
                assignedEngineer: engineer.name,
                status: "IN_PROGRESS",
                activityLabel: "Đã điều phối kỹ sư",
              }
            : item,
        ),
      };
    }
    default:
      return state;
  }
}

const priorityMeta: Record<
  DispatchPriority,
  { label: string; className: string }
> = {
  HIGH: {
    label: "Khẩn",
    className: "bg-red-50 text-red-700 ring-red-100",
  },
  MEDIUM: {
    label: "Ưu tiên",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  NORMAL: {
    label: "Thông thường",
    className: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  },
};

export function AdminChatDispatch() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [query, setQuery] = useState("");

  const visibleCases = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return state.cases.filter(
      (item) =>
        !normalized ||
        item.ownerName.toLocaleLowerCase("vi").includes(normalized) ||
        item.farm.toLocaleLowerCase("vi").includes(normalized) ||
        item.zone.toLocaleLowerCase("vi").includes(normalized),
    );
  }, [query, state.cases]);

  const selectedCase =
    state.cases.find((item) => item.id === state.selectedCaseId) ??
    state.cases[0];
  const selectedEngineer = engineers.find(
    (item) => item.id === state.selectedEngineerId,
  );
  const waitingCount = state.cases.filter(
    (item) => item.assignedEngineer === null,
  ).length;
  const assignedCount = state.cases.length - waitingCount;

  if (!selectedCase) return null;

  return (
    <div className="space-y-4">
      <section className="grid-pattern overflow-hidden rounded-[26px] bg-[#294f3b] p-6 text-white sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              <UserRoundCog size={13} />
              Admin dispatch board
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Điều phối phòng tư vấn nhà vườn
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#d0ddd4] sm:text-xs">
              Admin chỉ phân loại mức ưu tiên và chỉ định kỹ sư. Nội dung trả lời
              trực tiếp được khóa theo đúng vai trò vận hành.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Chờ phân công", waitingCount, Clock3],
              ["Đã điều phối", assignedCount, CheckCircle2],
              ["Kỹ sư online", engineers.filter((item) => item.online).length, Wifi],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof Clock3;
              return (
                <div
                  key={String(label)}
                  className="min-w-24 rounded-xl border border-white/10 bg-white/[.08] px-3 py-3"
                >
                  <MetricIcon size={14} className="text-[#EED56D]" />
                  <b className="mt-3 block text-xs">{String(value)}</b>
                  <small className="mt-1 block text-xs text-white/55">
                    {String(label)}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel overflow-hidden">
          <header className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <span>
              <small className="text-xs font-bold uppercase tracking-[0.16em] text-[#718478]">
                Incoming rescue queue
              </small>
              <h2 className="mt-1 text-base font-extrabold tracking-tight text-neutral-900">
                Danh sách phòng chờ
              </h2>
            </span>
            <label className="relative block sm:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm chủ vườn, phân khu..."
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
              />
            </label>
          </header>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f7f9f6] text-xs uppercase tracking-[0.1em] text-neutral-400">
                  <th className="px-5 py-3">Chủ vườn / phân khu</th>
                  <th className="px-4 py-3">Mức độ</th>
                  <th className="px-4 py-3">Nội dung gần nhất</th>
                  <th className="px-4 py-3">Kỹ sư phụ trách</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleCases.map((item) => {
                  const selected = item.id === state.selectedCaseId;
                  const priority = priorityMeta[item.priority];
                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-neutral-100 text-xs transition-colors duration-200 ${
                        selected ? "bg-[#f3f7f2]" : "hover:bg-neutral-50"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <b className="block text-neutral-900">
                          {item.ownerName}
                        </b>
                        <small className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                          <MapPin size={9} />
                          {item.zone} • {item.farm}
                        </small>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${priority.className}`}
                        >
                          {priority.label}
                        </span>
                      </td>
                      <td className="max-w-64 px-4 py-4">
                        <p className="truncate text-neutral-600">
                          {item.lastMessage}
                        </p>
                        <small className="mt-1 block text-xs text-neutral-400">
                          {item.submittedAt}
                        </small>
                      </td>
                      <td className="px-4 py-4">
                        {item.assignedEngineer ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E5A44]">
                            <CheckCircle2 size={12} />
                            {item.assignedEngineer}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700">
                            Chưa phân công
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: "SELECT_CASE", caseId: item.id })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600 transition-all duration-200 hover:border-[#9db1a2] hover:bg-white hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
                        >
                          Điều phối
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="border-b border-neutral-100 bg-[#f7f9f6] p-5">
            <div className="flex items-center justify-between gap-3">
              <span>
                <small className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Hồ sơ điều phối
                </small>
                <h2 className="mt-1 text-sm font-extrabold tracking-tight text-neutral-900">
                  {selectedCase.id}
                </h2>
              </span>
              <span
                className={`rounded-full px-2.5 py-1.5 text-xs font-bold ring-1 ${
                  priorityMeta[selectedCase.priority].className
                }`}
              >
                {priorityMeta[selectedCase.priority].label}
              </span>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <b className="text-xs text-neutral-900">
                {selectedCase.ownerName}
              </b>
              <p className="mt-1 text-xs text-neutral-500">
                {selectedCase.zone} • {selectedCase.cropContext}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <small className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
                Sensor snapshot
              </small>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-[#2E5A44]">
                {selectedCase.sensorContext}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageCircleMore size={14} className="text-[#2E5A44]" />
                <b className="text-xs text-neutral-800">Tóm tắt yêu cầu</b>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-600">
                {selectedCase.lastMessage}
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-neutral-700">
                Chỉ định kỹ sư
              </span>
              <span className="relative block">
                <select
                  value={state.selectedEngineerId}
                  onChange={(event) =>
                    dispatch({
                      type: "SELECT_ENGINEER",
                      engineerId: event.target.value,
                    })
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-8 text-xs font-semibold text-neutral-700 outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                >
                  {engineers.map((engineer) => (
                    <option key={engineer.id} value={engineer.id}>
                      {engineer.name} • {engineer.activeCases} ca
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
              </span>
            </label>

            {selectedEngineer && (
              <div className="flex items-start gap-3 rounded-xl bg-[#edf3ee] p-3">
                <span
                  className={`mt-1 size-2 rounded-full ${
                    selectedEngineer.online ? "bg-emerald-500" : "bg-neutral-300"
                  }`}
                />
                <span>
                  <b className="text-xs text-[#2E5A44]">
                    {selectedEngineer.specialty}
                  </b>
                  <p className="mt-1 text-xs text-neutral-500">
                    {selectedEngineer.online
                      ? "Đang trực tuyến, có thể nhận ca"
                      : "Ngoại tuyến, phản hồi có thể chậm"}
                  </p>
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => dispatch({ type: "ASSIGN" })}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!state.selectedEngineerId}
            >
              <UsersRound size={15} />
              Xác nhận điều phối
            </button>

            <div className="flex items-start gap-2 border-t border-neutral-100 pt-4">
              <ShieldCheck
                size={14}
                className="mt-0.5 shrink-0 text-[#2E5A44]"
              />
              <p className="text-xs leading-relaxed text-neutral-400">
                Admin không có composer và không thể gửi tin vào phòng. Sau khi
                Assign, phòng chỉ xuất hiện trong workspace của kỹ sư được chỉ
                định.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <section className="flex items-start gap-3 rounded-[20px] border border-amber-100 bg-amber-50 p-4">
        <AlertTriangle
          size={17}
          className="mt-0.5 shrink-0 text-amber-700"
        />
        <span>
          <b className="block text-xs text-amber-900">
            Kiểm soát phân quyền đã bật
          </b>
          <p className="mt-1 text-xs leading-relaxed text-amber-700">
            Giao diện Admin chỉ phục vụ giám sát và điều phối. Khả năng trả lời
            trực tiếp thuộc vai trò ENGINEER.
          </p>
        </span>
      </section>
    </div>
  );
}
