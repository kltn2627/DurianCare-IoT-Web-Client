"use client";

import type { TreeSummary } from "@/lib/trees/types";

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

function DurianTreeMarker({ color, selected }: { color: string; selected: boolean }) {
  return (
    <>
      <ellipse cx="0" cy="13" rx="15" ry="3.5" fill="#14532d" opacity={0.14} />
      <path d="M-2 12h4L3 1h-6l1 11Z" fill="#7c4a2d" />
      <path d="M-4 2c2-4 6-4 8 0" fill="none" stroke="#a16207" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="-9" cy="-4" r="7.5" fill={color} opacity={0.88} />
      <circle cx="0" cy="-8" r="8.5" fill={color} />
      <circle cx="9" cy="-4" r="7.5" fill={color} opacity={0.92} />
      <circle cx="-5" cy="3" r="8" fill={color} opacity={0.96} />
      <circle cx="5" cy="3" r="8" fill={color} opacity={0.96} />
      <path d="M-10-2 10-2M-6-9 0 8M6-9 0 8" fill="none" stroke="white" strokeWidth="0.8" opacity={0.26} strokeLinecap="round" />
      {selected ? <circle cx="0" cy="-2" r="19" fill="none" stroke="#1e293b" strokeWidth="2.5" /> : null}
    </>
  );
}

function FruitBadge({ fruitCount }: { fruitCount: number }) {
  return (
    <g transform="translate(11 -25)">
      <rect width="37" height="19" rx="9.5" fill="#fffdf4" stroke="#e7c77d" strokeWidth="1" />
      <path d="M7 15c-3.5-3.2-2.1-9 1-11.3 3.1 2.3 4.5 8.1 1 11.3L8 17 7 15Z" fill="#9a7b13" />
      <path d="M8 5v9M5.8 8.4l4.4 1.5M5.9 12.1l4.2-1.3" fill="none" stroke="#f5df82" strokeWidth="0.8" strokeLinecap="round" />
      <text x="15" y="13" fill="#6b4b17" fontSize="10" fontWeight="700">{fruitCount}</text>
    </g>
  );
}

function treeColor(tree: TreeSummary): string {
  if (!tree.healthStatus) return "#9ca3af";
  return HEALTH_COLORS[tree.healthStatus] ?? "#9ca3af";
}

interface TreeMapCanvasProps {
  trees: TreeSummary[];
  /** Latest persisted count for each tree in the active season; never mock data. */
  fruitCounts?: Record<string, number>;
  selectedTreeId?: string | null;
  onTreeClick?: (tree: TreeSummary) => void;
}

export function TreeMapCanvas({
  trees,
  fruitCounts = {},
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
            <svg aria-hidden="true" className="size-5" viewBox="-20 -20 40 40"><DurianTreeMarker color={HEALTH_COLORS[key]} selected={false} /></svg>
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <svg aria-hidden="true" className="size-5" viewBox="-20 -20 40 40"><DurianTreeMarker color="#9ca3af" selected={false} /></svg>
          Chưa đánh giá
        </span>
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
            const isSelected = tree.id === selectedTreeId;
            const fruitCount = fruitCounts[tree.id];
            return (
              <g
                key={tree.id}
                onClick={() => onTreeClick?.(tree)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onTreeClick?.(tree);
                  }
                }}
                className="cursor-pointer outline-none"
                role="button"
                tabIndex={0}
                aria-label={`Cây ${tree.treeCode}${fruitCount > 0 ? `, ${fruitCount} trái` : ""}`}
              >
                <title>{`${tree.treeCode}${fruitCount > 0 ? ` · ${fruitCount} trái` : ""}`}</title>
                <g transform={`translate(${cx} ${cy})`}>
                  <DurianTreeMarker color={color} selected={isSelected} />
                  {fruitCount > 0 ? <FruitBadge fruitCount={fruitCount} /> : null}
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
