"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, TreePine, X } from "lucide-react";
import { treeClient, TreeApiError } from "@/lib/trees/client";
import type { FarmSummary, ZoneSummary } from "@/lib/trees/types";

// ── Create Farm inline form ───────────────────────────────────────────────────

interface CreateFarmFormProps {
  onCreated: (farm: FarmSummary) => void;
  onCancel: () => void;
}

function CreateFarmForm({ onCreated, onCancel }: CreateFarmFormProps) {
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [areaHectares, setAreaHectares] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Tên trang trại là bắt buộc."); return; }
    setSaving(true);
    setErr(null);
    try {
      const farm = await treeClient.createFarm({
        name: name.trim(),
        province: province.trim() || null,
        district: district.trim() || null,
        areaHectares: areaHectares ? parseFloat(areaHectares) : null,
      });
      onCreated(farm);
    } catch (caught) {
      setErr(
        caught instanceof TreeApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Tạo trang trại thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[#2E5A44] bg-[#f0f7f1] p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-[#2E5A44] text-sm">Tạo trang trại mới</p>
        <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-600">
          <X size={18} />
        </button>
      </div>
      {err ? (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{err}</p>
      ) : null}
      <input
        required
        placeholder="Tên trang trại *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44]"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Tỉnh/Thành"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44]"
        />
        <input
          placeholder="Quận/Huyện"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44]"
        />
      </div>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Diện tích (ha)"
        value={areaHectares}
        onChange={(e) => setAreaHectares(e.target.value)}
        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44]"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-2 text-sm font-bold text-white disabled:opacity-60 hover:bg-[#25493a]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Tạo trang trại
        </button>
      </div>
    </form>
  );
}

// ── Create Zone inline form ───────────────────────────────────────────────────

interface CreateZoneFormProps {
  farmId: string;
  onCreated: (zone: ZoneSummary) => void;
  onCancel: () => void;
}

function CreateZoneForm({ farmId, onCreated, onCancel }: CreateZoneFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState("");
  const [treesPerRow, setTreesPerRow] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Tên vùng là bắt buộc."); return; }
    setSaving(true);
    setErr(null);
    try {
      const zone = await treeClient.createZone(farmId, {
        name: name.trim(),
        code: code.trim() || null,
        rowCount: rows ? parseInt(rows, 10) : null,
        treesPerRow: treesPerRow ? parseInt(treesPerRow, 10) : null,
      });
      onCreated(zone);
    } catch (caught) {
      setErr(
        caught instanceof TreeApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Tạo vùng thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-2 rounded-xl border border-[#2E5A44]/40 bg-[#f0f7f1] p-4 space-y-2"
    >
      <p className="font-bold text-[#2E5A44] text-xs">Tạo vùng trồng mới</p>
      {err ? (
        <p className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">{err}</p>
      ) : null}
      <input
        required
        placeholder="Tên vùng *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#2E5A44]"
      />
      <input
        placeholder="Mã vùng (tùy chọn)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#2E5A44]"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="1"
          max="500"
          placeholder="Số hàng"
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#2E5A44]"
        />
        <input
          type="number"
          min="1"
          max="500"
          placeholder="Cây/hàng"
          value={treesPerRow}
          onChange={(e) => setTreesPerRow(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#2E5A44]"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[#2E5A44] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60 hover:bg-[#25493a]"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : null}
          Tạo vùng
        </button>
      </div>
    </form>
  );
}

// ── FarmCard ──────────────────────────────────────────────────────────────────

interface FarmCardProps {
  farm: FarmSummary;
}

function FarmCard({ farm }: FarmCardProps) {
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addingZone, setAddingZone] = useState(false);

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

  const handleZoneCreated = (zone: ZoneSummary) => {
    setZones((prev) => [...prev, zone]);
    setAddingZone(false);
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
                  {zone.rowCount && zone.treesPerRow ? (
                    <span className="text-xs text-neutral-400 mt-0.5">
                      {zone.rowCount} hàng × {zone.treesPerRow} cây/hàng
                    </span>
                  ) : null}
                  <span className="mt-2 text-xs font-bold text-[#2E5A44]">
                    {zone.treeCount} cây → Xem bản đồ
                  </span>
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setAddingZone(true)}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 p-3 text-xs font-bold text-neutral-400 hover:border-[#2E5A44] hover:text-[#2E5A44] transition-colors"
              >
                <Plus size={18} />
                Thêm vùng
              </button>
            </div>
          )}
          {addingZone ? (
            <CreateZoneForm
              farmId={farm.id}
              onCreated={handleZoneCreated}
              onCancel={() => setAddingZone(false)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── FarmsWorkspace ────────────────────────────────────────────────────────────

export function FarmsWorkspace() {
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingFarm, setCreatingFarm] = useState(false);

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

  const handleFarmCreated = (farm: FarmSummary) => {
    setFarms((prev) => [...prev, farm]);
    setCreatingFarm(false);
  };

  return (
    <div className="space-y-4">
      <div className="panel p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
            <TreePine size={22} />
          </span>
          <div className="flex-1">
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
          <button
            type="button"
            onClick={() => setCreatingFarm(true)}
            className="flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-2 text-sm font-bold text-white hover:bg-[#25493a] transition-colors"
          >
            <Plus size={16} />
            Tạo trang trại
          </button>
        </div>
      </div>

      {creatingFarm ? (
        <CreateFarmForm
          onCreated={handleFarmCreated}
          onCancel={() => setCreatingFarm(false)}
        />
      ) : null}

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

      {!loading && farms.length === 0 && !error && !creatingFarm ? (
        <div className="panel p-8 text-center">
          <p className="text-sm font-semibold text-neutral-500">
            Chưa có trang trại nào.{" "}
            <button
              type="button"
              onClick={() => setCreatingFarm(true)}
              className="text-[#2E5A44] font-bold underline"
            >
              Tạo trang trại đầu tiên
            </button>
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
