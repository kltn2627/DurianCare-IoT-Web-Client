"use client";

import { UNASSESSED, matchesHealthFilter } from "@/lib/trees/statusCatalog";
import type { TreeSummary } from "@/lib/trees/types";
import { partitionMapTrees } from "@/lib/trees/map";

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "#22c55e",
  DISEASED: "#ef4444",
  TREATING: "#f97316",
  SUSPECTED: "#f97316",
  RECOVERED: "#0891b2",
};

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Đang điều trị",
  SUSPECTED: "Nghi ngờ",
  RECOVERED: "Đã hồi phục",
};

function DurianTreeMarker({
  color,
  selected,
}: {
  color: string;
  selected: boolean;
}) {
  return (
    <>
      <ellipse cx="0" cy="13" rx="15" ry="3.5" fill="#14532d" opacity={0.14} />
      <path d="M-2 12h4L3 1h-6l1 11Z" fill="#7c4a2d" />
      <path
        d="M-4 2c2-4 6-4 8 0"
        fill="none"
        stroke="#a16207"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="-9" cy="-4" r="7.5" fill={color} opacity={0.88} />
      <circle cx="0" cy="-8" r="8.5" fill={color} />
      <circle cx="9" cy="-4" r="7.5" fill={color} opacity={0.92} />
      <circle cx="-5" cy="3" r="8" fill={color} opacity={0.96} />
      <circle cx="5" cy="3" r="8" fill={color} opacity={0.96} />
      <path
        d="M-10-2 10-2M-6-9 0 8M6-9 0 8"
        fill="none"
        stroke="white"
        strokeWidth="0.8"
        opacity={0.26}
        strokeLinecap="round"
      />
      {selected ? (
        <circle
          cx="0"
          cy="-2"
          r="19"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2.5"
        />
      ) : null}
    </>
  );
}

function FruitBadge({ fruitCount }: { fruitCount: number }) {
  return (
    <g transform="translate(11 -25)">
      <rect
        width="37"
        height="19"
        rx="9.5"
        fill="#fffdf4"
        stroke="#e7c77d"
        strokeWidth="1"
      />
      <path
        d="M7 15c-3.5-3.2-2.1-9 1-11.3 3.1 2.3 4.5 8.1 1 11.3L8 17 7 15Z"
        fill="#9a7b13"
      />
      <path
        d="M8 5v9M5.8 8.4l4.4 1.5M5.9 12.1l4.2-1.3"
        fill="none"
        stroke="#f5df82"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <text x="15" y="13" fill="#6b4b17" fontSize="10" fontWeight="700">
        {fruitCount}
      </text>
    </g>
  );
}

function treeColor(tree: TreeSummary): string {
  if (!tree.healthStatus) return "#9ca3af";
  return HEALTH_COLORS[tree.healthStatus] ?? "#9ca3af";
}

// Bulk-selection marker: dashed blue ring + check badge, distinct from every health color.
const BULK_MARK = "#2563eb";

interface TreeMapCanvasProps {
  trees: TreeSummary[];
  /** Latest persisted count for each tree in the active season; never mock data. */
  fruitCounts?: Record<string, number>;
  selectedTreeId?: string | null;
  onTreeClick?: (tree: TreeSummary) => void;
  /** When set, the map is in multi-select mode for a bulk status change. */
  bulkSelectedIds?: ReadonlySet<string>;
  isBulkSelectable?: (tree: TreeSummary) => boolean;
  /** View filter by health status (empty = all). Filtered-out trees stay in place, dimmed. */
  healthFilter?: ReadonlySet<string>;
  healthCounts?: Record<string, number>;
  onToggleHealthFilter?: (key: string) => void;
}

export function TreeMapCanvas({
  trees,
  fruitCounts = {},
  selectedTreeId,
  onTreeClick,
  bulkSelectedIds,
  isBulkSelectable,
  healthFilter,
  healthCounts,
  onToggleHealthFilter,
}: TreeMapCanvasProps) {
  const legend = [...Object.entries(HEALTH_LABELS), [UNASSESSED, "Chưa đánh giá"] as [string, string]];
  const filtering = Boolean(healthFilter && healthFilter.size > 0);
  const bulkMode = Boolean(bulkSelectedIds);
  const { positioned: positionedTrees, unpositionedCount } = partitionMapTrees(trees);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-neutral-500">
        {onToggleHealthFilter ? <span className="text-neutral-600">Lọc theo sức khỏe:</span> : null}
        {legend.map(([key, label]) => {
          const dot = (
            <svg aria-hidden="true" className="size-5" viewBox="-20 -20 40 40">
              <DurianTreeMarker color={HEALTH_COLORS[key] ?? "#9ca3af"} selected={false} />
            </svg>
          );
          const count = healthCounts ? ` (${healthCounts[key] ?? 0})` : "";
          if (!onToggleHealthFilter) {
            return <span key={key} className="flex items-center gap-1.5">{dot}{label}</span>;
          }
          const active = healthFilter?.has(key) ?? false;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleHealthFilter(key)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors ${
                active ? "border-[#2E5A44] bg-[#2E5A44] text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
              }`}
            >
              {dot}{label}{count}
            </button>
          );
        })}
        {bulkMode ? (
          <span className="flex items-center gap-1.5 text-[#2563eb]">
            <span className="inline-block size-3 rounded-full border-2 border-dashed border-[#2563eb]" />
            Đã chọn để đổi trạng thái
          </span>
        ) : null}
      </div>

      {/* Canvas */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-[#f0f7f1]">
        <svg
          viewBox="0 0 1000 680"
          className="w-full"
          style={{ minHeight: 300 }}
          aria-label="Bản đồ cây"
        >
          {/* Grid */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`vg-${i}`}
              x1={i * 100}
              y1={0}
              x2={i * 100}
              y2={680}
              stroke="#d1fae5"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={`hg-${i}`}
              x1={0}
              y1={i * 85}
              x2={1000}
              y2={i * 85}
              stroke="#d1fae5"
              strokeWidth={1}
            />
          ))}

          {positionedTrees.map((tree) => {
            // Preserve the backend-assigned position; the marker is only a visual replacement.
            const cx = 30 + (tree.positionX ?? 0) * 940;
            const cy = 30 + (tree.positionY ?? 0) * 620;
            const color = treeColor(tree);
            const isSelected = !bulkMode && tree.id === selectedTreeId;
            const fruitCount = fruitCounts[tree.id] ?? 0;
            const isBulkSelected = bulkMode && bulkSelectedIds!.has(tree.id);
            const selectable = !bulkMode || isBulkSelected || (isBulkSelectable?.(tree) ?? true);
            const visible = !filtering || matchesHealthFilter(tree, healthFilter!);
            return (
              <g
                key={tree.id}
                onClick={() => onTreeClick?.(tree)}
                className={`${selectable ? "cursor-pointer" : "cursor-not-allowed"} outline-none`}
                opacity={!visible ? 0.15 : selectable ? 1 : 0.35}
                role={bulkMode ? "checkbox" : "button"}
                aria-checked={bulkMode ? isBulkSelected : undefined}
                aria-disabled={bulkMode && !selectable ? true : undefined}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onTreeClick?.(tree);
                  }
                }}
                aria-label={`Cây ${tree.treeCode}${fruitCount > 0 ? `, ${fruitCount} trái` : ""}`}
              >
                <title>{`${tree.treeCode}${fruitCount > 0 ? ` · ${fruitCount} trái` : ""}`}</title>
                <g transform={`translate(${cx} ${cy})`}>
                  {isBulkSelected ? (
                    <circle cx={0} cy={-2} r={22} fill="none" stroke={BULK_MARK}
                      strokeWidth={2.5} strokeDasharray="4 3" />
                  ) : null}
                  <DurianTreeMarker color={color} selected={isSelected} />
                  {fruitCount > 0 ? (
                    <FruitBadge fruitCount={fruitCount} />
                  ) : null}
                  {isBulkSelected ? (
                    <g transform="translate(-17 -19)">
                      <circle r={6} fill={BULK_MARK} stroke="white" strokeWidth={1.5} />
                      <path d="M -2.6 0 l 1.8 1.9 l 3.4 -3.6" fill="none" stroke="white"
                        strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  ) : null}
                </g>
                <text
                  x={cx}
                  y={cy + 31}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#374151"
                  fontWeight={isSelected ? 700 : 500}
                >
                  {tree.treeCode}
                </text>
              </g>
            );
          })}
        </svg>

        {positionedTrees.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-neutral-400">
            <span>Chưa có vị trí cây nào được gán</span>
            <span className="text-xs font-normal">Chưa có tọa độ hợp lệ.</span>
          </div>
        ) : null}
      </div>

      {unpositionedCount > 0 ? (
        <p className="text-xs text-neutral-500">
          {unpositionedCount} cây chưa có vị trí trên bản đồ.
        </p>
      ) : null}
    </div>
  );
}
