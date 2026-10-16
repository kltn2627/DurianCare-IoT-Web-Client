import { enrichGardenZone, loadGardenCatalog } from "@/lib/cultivation/garden";
import { treeClient } from "@/lib/trees/client";
import { farmZoneClient } from "@/lib/cultivation/client";
import { partitionMapTrees } from "@/lib/trees/map";
import type { CanonicalCultivationZone } from "@/lib/cultivation/types";
import type { TreeSummary } from "@/lib/trees/types";

jest.mock("@/lib/trees/client", () => ({ treeClient: { getZone: jest.fn(), listTrees: jest.fn() } }));
jest.mock("@/lib/cultivation/client", () => ({ farmZoneClient: { listFarms: jest.fn() } }));
const zone = { id: "zone-a", farmId: "farm-a", name: "A", areaSquareMeters: 100 } as CanonicalCultivationZone;
const tree = (id: string, positionX: number | null = 0.5, positionY: number | null = 0.5): TreeSummary =>
  ({ id, treeCode: id, positionX, positionY, diagnosisCount: 0, status: "ACTIVE", variety: "Ri6" });

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(treeClient.getZone).mockResolvedValue({ ...zone, activeTreeCount: 1, treeCount: 1 });
  jest.mocked(treeClient.listTrees).mockResolvedValue([tree("tree-a")]);
});

it("counts persisted active trees and uses actual varieties/area without inventing age", async () => {
  const result = await enrichGardenZone(zone);
  expect(result).toMatchObject({ currentTreeCount: 1, variety: "Ri6", areaValue: 100, plantingDate: null });
  expect(treeClient.listTrees).toHaveBeenCalledWith("zone-a");
});
it("does not turn backend failures into a zero-tree garden", async () => {
  jest.mocked(treeClient.listTrees).mockRejectedValue(new Error("unavailable"));
  await expect(enrichGardenZone(zone)).rejects.toThrow("unavailable");
});
it("rejects a mismatched farm or zone", async () => {
  jest.mocked(treeClient.getZone).mockResolvedValue({ ...zone, farmId: "other", treeCount: 1, activeTreeCount: 1 });
  await expect(enrichGardenZone(zone)).rejects.toThrow("chưa đồng bộ");
});
it("rejects inconsistent counts rather than silently presenting incomplete results", async () => {
  jest.mocked(treeClient.listTrees).mockResolvedValue([]);
  await expect(enrichGardenZone(zone)).rejects.toThrow("Số cây chưa đồng bộ");
});
it("uses authenticated canonical farms and embedded zones, not the legacy area route", async () => {
  jest.mocked(farmZoneClient.listFarms).mockResolvedValue([{ id: "farm-a", name: "Farm", ownerUserId: "owner-a", status: "ACTIVE", zones: [zone] }]);
  expect((await loadGardenCatalog()).zones[0].currentTreeCount).toBe(1);
});
it("empty gardens remain empty without creating a farm or assigning trees", async () => {
  jest.mocked(farmZoneClient.listFarms).mockResolvedValue([]);
  expect(await loadGardenCatalog()).toEqual({ farms: [], zones: [] });
  expect(treeClient.listTrees).not.toHaveBeenCalled();
});
it("renders only finite normalized positions; removed trees are not missing-position trees", () => {
  const result = partitionMapTrees([tree("a", 0, 1), tree("b", NaN), tree("c", 1.1), tree("d", null),
    { ...tree("removed"), status: "REMOVED" }]);
  expect(result.positioned.map(t => t.id)).toEqual(["a"]);
  expect(result.unpositionedCount).toBe(3);
});
