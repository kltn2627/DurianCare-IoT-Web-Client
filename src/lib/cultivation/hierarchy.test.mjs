import assert from "node:assert/strict";
import test from "node:test";
import { catalogOptions, filterCalendarScope, initialCatalogSelection } from "./hierarchy.ts";

const farms = [
  { id: "farm-a", name: "Farm A", zones: [
    { id: "a1", name: "Khu A - Ri6 nuôi trái", status: "ACTIVE" },
    { id: "a2", name: "Khu B - Dona phục hồi", status: "INACTIVE" },
    { id: "archived", name: "Khu cũ", status: "ARCHIVED" },
  ] },
  { id: "farm-b", name: "Farm B", zones: [{ id: "b1", name: "Zone B1", status: "ACTIVE" }] },
];
const seasons = [
  { id: "a1-2026", farmId: "farm-a", plotId: "a1", name: "A1-2026" },
  { id: "a1-2027", farmId: "farm-a", plotId: "a1", name: "A1-2027" },
  { id: "a2-2026", farmId: "farm-a", plotId: "a2", name: "A2-2026" },
  { id: "b1-2026", farmId: "farm-b", plotId: "b1", name: "B1-2026" },
];

test("farm and zone options use catalog IDs and exact names", () => {
  const options = catalogOptions(farms, seasons, { farmId: "farm-a", plotId: "a1", seasonId: "" });
  assert.deepEqual(options.farms, [{ id: "farm-a", label: "Farm A" }, { id: "farm-b", label: "Farm B" }]);
  assert.deepEqual(options.plots, [
    { id: "a1", label: "Khu A - Ri6 nuôi trái" },
    { id: "a2", label: "Khu B - Dona phục hồi" },
  ]);
  assert.deepEqual(options.seasons, [
    { id: "a1-2026", label: "A1-2026" }, { id: "a1-2027", label: "A1-2027" },
  ]);
});

test("changing farm or zone never exposes a sibling season", () => {
  assert.deepEqual(catalogOptions(farms, seasons, { farmId: "farm-a", plotId: "a2", seasonId: "" }).seasons,
    [{ id: "a2-2026", label: "A2-2026" }]);
  const farmB = catalogOptions(farms, seasons, { farmId: "farm-b", plotId: "b1", seasonId: "" });
  assert.deepEqual(farmB.plots, [{ id: "b1", label: "Zone B1" }]);
  assert.deepEqual(farmB.seasons, [{ id: "b1-2026", label: "B1-2026" }]);
  assert.deepEqual(initialCatalogSelection(farms, { farmId: "farm-b", plotId: "a1", seasonId: "a1-2026" }),
    { farmId: "farm-b", plotId: "b1", seasonId: "" });
});

test("empty zone and empty season remain valid catalog states", () => {
  const farmWithoutZones = [{ id: "empty", name: "Empty", zones: [] }];
  assert.deepEqual(initialCatalogSelection(farmWithoutZones, { farmId: "", plotId: "", seasonId: "" }),
    { farmId: "empty", plotId: "", seasonId: "" });
  assert.deepEqual(catalogOptions(farms, [], { farmId: "farm-a", plotId: "a1", seasonId: "" }).seasons, []);
});

test("only plans and activities matching the complete ID scope are kept", () => {
  const scope = { farmId: "farm-a", plotId: "a1", cultivationSeasonId: "a1-2026" };
  const plans = [
    { id: "plan-a1", ...scope },
    { id: "plan-a2", farmId: "farm-a", plotId: "a2", cultivationSeasonId: "a2-2026" },
  ];
  const activities = [
    { id: "good", cultivationPlanId: "plan-a1", ...scope },
    { id: "wrong-zone", cultivationPlanId: "plan-a1", farmId: "farm-a", plotId: "a2", cultivationSeasonId: "a1-2026" },
    { id: "wrong-plan", cultivationPlanId: "plan-a2", ...scope },
  ];
  const result = filterCalendarScope(plans, activities, scope);
  assert.deepEqual(result.plans.map((plan) => plan.id), ["plan-a1"]);
  assert.deepEqual(result.activities.map((activity) => activity.id), ["good"]);
});

test("a season without plans and a plan without activities remain valid empty states", () => {
  const scope = { farmId: "farm-a", plotId: "a1", cultivationSeasonId: "a1-2026" };
  assert.deepEqual(filterCalendarScope([], [], scope), { plans: [], activities: [] });
  assert.deepEqual(filterCalendarScope([{ id: "plan-a1", ...scope }], [], scope), {
    plans: [{ id: "plan-a1", ...scope }], activities: [],
  });
});
