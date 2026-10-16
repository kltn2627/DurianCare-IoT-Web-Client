import { farmZoneClient } from "./client";
import type { CanonicalCultivationZone } from "./types";
import { treeClient } from "@/lib/trees/client";
import type { TreeSummary } from "@/lib/trees/types";

export interface GardenZone extends CanonicalCultivationZone {
  currentTreeCount: number;
  variety: string;
  plantingDate: null;
  growthStage: null;
  areaValue: number | null;
  areaUnit: "SQUARE_METER";
  trees: TreeSummary[];
}

export async function enrichGardenZone(zone: CanonicalCultivationZone): Promise<GardenZone> {
  const [detail, trees] = await Promise.all([treeClient.getZone(zone.id), treeClient.listTrees(zone.id)]);
  if (detail.id !== zone.id || detail.farmId !== zone.farmId || !Array.isArray(trees)) {
    throw new Error("Dữ liệu khu canh tác chưa đồng bộ. Vui lòng tải lại.");
  }
  const active = trees.filter(tree => tree.status !== "REMOVED");
  if (detail.activeTreeCount !== active.length) {
    throw new Error("Số cây chưa đồng bộ. Vui lòng tải lại.");
  }
  return { ...zone, currentTreeCount: active.length, trees: active,
    variety: [...new Set(active.map(tree => tree.variety).filter(Boolean))].join(", "),
    plantingDate: null, growthStage: null, areaValue: zone.areaSquareMeters ?? null, areaUnit: "SQUARE_METER" };
}

export async function loadGardenCatalog() {
  const farms = await farmZoneClient.listFarms();
  const zones = await Promise.all(farms.flatMap(farm => (farm.zones ?? []).map(zone =>
    enrichGardenZone({ ...zone, farmId: farm.id, farmName: farm.name ?? farm.id }))));
  return { farms, zones };
}
