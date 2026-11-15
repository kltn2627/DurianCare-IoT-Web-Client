"use client";

import { useRef, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { treeClient } from "@/lib/trees/client";
import { HEALTH_STATUS_CATALOG } from "@/lib/trees/statusCatalog";
import type { TreeHealthStatus } from "@/lib/trees/types";

interface Props {
  treeId: string;
  treeCode: string;
  current?: TreeHealthStatus | null;
  onSaved: () => void;
}

/**
 * Farmer sets the tree's health status directly (any of the five values). AI diagnosis is a
 * separate, optional feature; the stored value shown afterwards is what the server returned.
 */
export function HealthStatusPicker({ treeId, treeCode, current, onSaved }: Props) {
  const [choice, setChoice] = useState<TreeHealthStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<TreeHealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const target = choice ?? current ?? null;

  async function save() {
    if (!choice || choice === current || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const updated = await treeClient.updateHealthStatus(treeId, choice);
      setSaved((updated.healthStatus ?? choice) as TreeHealthStatus);
      setChoice(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
      <p className="text-xs font-extrabold text-neutral-700">CẬP NHẬT TRẠNG THÁI SỨC KHỎE</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Trạng thái sức khỏe cây ${treeCode}`}>
        {HEALTH_STATUS_CATALOG.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={target === option.value}
            disabled={saving}
            onClick={() => { setChoice(option.value); setSaved(null); setError(null); }}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
              target === option.value
                ? "bg-[#2E5A44] text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {option.label}
            {option.value === current ? " (hiện tại)" : ""}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="text-xs font-semibold text-red-600">{error}</p> : null}
      {saved ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
          <CheckCircle size={14} /> Đã lưu: cây {treeCode} chuyển sang {
            HEALTH_STATUS_CATALOG.find((option) => option.value === saved)?.label ?? saved}.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={!choice || choice === current || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] py-2.5 text-sm font-bold text-white transition hover:bg-[#25493a] disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
        {saving ? "Đang lưu..." : "Lưu trạng thái"}
      </button>
    </div>
  );
}
