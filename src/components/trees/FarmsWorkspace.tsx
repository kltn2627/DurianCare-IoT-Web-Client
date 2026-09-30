"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TreePine } from "lucide-react";
import { treeClient, TreeApiError } from "@/lib/trees/client";
import type { FarmSummary, ZoneSummary } from "@/lib/trees/types";

interface FarmCardProps {
  farm: FarmSummary;
}

function FarmCard({ farm }: FarmCardProps) {
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadZones = () => {
    if (zones.length > 0) return;
    setZonesLoading(true);
    treeClient
      .listZones(farm.id)
      .then(setZones)
      .catch(() => {})
      .finally(() => setZonesLoading(false));
  };

  const toggle = () => {
    if (!expanded) loadZones();
    setExpanded((v) => !v);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <span className="grid size-10 flex-shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
          <TreePine size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-neutral-900 truncate">{farm.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {farm.province ?? ""}{farm.district ? `, ${farm.district}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-bold">
            {farm.zoneCount} vùng
          </span>
          {farm.areaHectares != null ? (
            <span className="hidden sm:inline">{farm.areaHectares} ha</span>
          ) : null}
          <span className="text-neutral-300">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-neutral-100 p-4">
          {zonesLoading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 py-2">
              <Loader2 size={13} className="animate-spin" />
              Đang tải vùng...
            </div>
          ) : zones.length === 0 ? (
            <p className="text-xs text-neutral-400 py-2">Chưa có vùng trồng nào.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {zones.map((zone) => (
                <Link
                  key={zone.id}
                  href={`/dashboard/client/farms/${encodeURIComponent(farm.id)}/zones/${encodeURIComponent(zone.id)}`}
                  className="flex flex-col rounded-xl border border-neutral-200 bg-neutral-50 p-3 hover:border-[#2E5A44] hover:bg-[#f0f7f1] transition-colors"
                >
                  <span className="font-bold text-sm text-neutral-900">{zone.name}</span>
                  {zone.code ? (
                    <span className="text-xs text-neutral-500 mt-0.5">{zone.code}</span>
                  ) : null}
                  <span className="mt-2 text-xs font-bold text-[#2E5A44]">
                    {zone.treeCount} cây → Xem bản đồ
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function FarmsWorkspace() {
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    treeClient
      .listFarms()
      .then((data) => {
        if (active) setFarms(data);
      })
      .catch((caught) => {
        if (!active) return;
        const message =
          caught instanceof TreeApiError
            ? caught.message
            : caught instanceof Error
              ? caught.message
              : "Không thể tải danh sách trang trại.";
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="panel p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
            <TreePine size={22} />
          </span>
          <div>
            <p className="text-xs font-extrabold tracking-[1px] text-neutral-500">
              TRANG TRẠI
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">
              Bản đồ cây theo vùng trồng
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Chọn trang trại → vùng trồng để xem và quản lý bản đồ cây.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="panel grid min-h-48 place-items-center p-7 text-sm font-bold text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Đang tải danh sách trang trại...
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && farms.length === 0 && !error ? (
        <div className="panel p-8 text-center">
          <p className="text-sm font-semibold text-neutral-500">
            Chưa có trang trại nào. Tạo trang trại trong ứng dụng di động để bắt đầu.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {farms.map((farm) => (
          <FarmCard key={farm.id} farm={farm} />
        ))}
      </div>
    </div>
  );
}
