"use client";

import type { TreeSummary } from "@/lib/trees/types";

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "#22c55e",
  DISEASED: "#ef4444",
  TREATING: "#f97316",
  SUSPECTED: "#f97316",
};

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Đang điều trị",
  SUSPECTED: "Nghi ngờ",
};

function treeColor(tree: TreeSummary): string {
  if (!tree.healthStatus) return "#9ca3af";
  return HEALTH_COLORS[tree.healthStatus] ?? "#9ca3af";
}

interface TreeMapCanvasProps {
  trees: TreeSummary[];
  selectedTreeId?: string | null;
  onTreeClick?: (tree: TreeSummary) => void;
}

export function TreeMapCanvas({
  trees,
  selectedTreeId,
  onTreeClick,
}: TreeMapCanvasProps) {
  const positionedTrees = trees.filter(
    (t) => t.positionX != null && t.positionY != null,
  );
  const unpositionedCount = trees.length - positionedTrees.length;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-neutral-500">
        {Object.entries(HEALTH_LABELS).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: HEALTH_COLORS[key] }}
            />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[#9ca3af]" />
          Chưa đánh giá
        </span>
      </div>

      {/* Canvas */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-[#f0f7f1]">
        <svg
          viewBox="0 0 1000 600"
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
              y2={600}
              stroke="#d1fae5"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`hg-${i}`}
              x1={0}
              y1={i * 100}
              x2={1000}
              y2={i * 100}
              stroke="#d1fae5"
              strokeWidth={1}
            />
          ))}

          {positionedTrees.map((tree) => {
            const cx = (tree.positionX ?? 0) * 1000;
            const cy = (tree.positionY ?? 0) * 600;
            const color = treeColor(tree);
            const isSelected = tree.id === selectedTreeId;
            return (
              <g
                key={tree.id}
                onClick={() => onTreeClick?.(tree)}
                className="cursor-pointer"
                role="button"
                aria-label={`Cây ${tree.treeCode}`}
              >
                {isSelected ? (
                  <circle cx={cx} cy={cy} r={18} fill={color} opacity={0.25} />
                ) : null}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 11 : 9}
                  fill={color}
                  stroke={isSelected ? "#1e293b" : "white"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                <text
                  x={cx}
                  y={cy + 22}
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
            <span className="text-xs font-normal">Thêm cây với positionX / positionY để hiển thị trên bản đồ.</span>
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
