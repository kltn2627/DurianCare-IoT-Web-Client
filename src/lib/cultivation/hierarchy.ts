import type { CultivationActivity, CultivationPlan, CultivationSeason, FarmCatalog } from "./types";

export type CalendarSelection = { farmId: string; plotId: string; seasonId: string };
export type CalendarScope = { farmId: string; plotId: string; cultivationSeasonId: string };

export function catalogOptions(farms: FarmCatalog[], seasons: CultivationSeason[], selection: CalendarSelection) {
  const zones = farms.find((farm) => farm.id === selection.farmId)?.zones ?? [];
  return {
    farms: farms.map((farm) => ({ id: farm.id, label: farm.name || farm.code || farm.id })),
    plots: zones.filter((zone) => zone.status !== "ARCHIVED")
      .map((zone) => ({ id: zone.id, label: zone.name || zone.code || zone.id })),
    seasons: seasons.filter((season) => season.farmId === selection.farmId && season.plotId === selection.plotId)
      .map((season) => ({ id: season.id, label: season.name })),
  };
}

export function initialCatalogSelection(farms: FarmCatalog[], current: CalendarSelection): CalendarSelection {
  const farm = farms.find((item) => item.id === current.farmId) ?? farms[0];
  const zones = farm?.zones.filter((zone) => zone.status !== "ARCHIVED") ?? [];
  const zone = zones.find((item) => item.id === current.plotId) ?? zones[0];
  if (farm?.id === current.farmId && zone?.id === current.plotId) return current;
  return { farmId: farm?.id ?? "", plotId: zone?.id ?? "", seasonId: "" };
}

export function filterCalendarScope(plans: CultivationPlan[], activities: CultivationActivity[], scope: CalendarScope) {
  const scopedPlans = plans.filter((plan) => plan.farmId === scope.farmId &&
    plan.plotId === scope.plotId && plan.cultivationSeasonId === scope.cultivationSeasonId);
  const planIds = new Set(scopedPlans.map((plan) => plan.id));
  const scopedActivities = activities.filter((activity) => activity.farmId === scope.farmId &&
    activity.plotId === scope.plotId && activity.cultivationSeasonId === scope.cultivationSeasonId &&
    planIds.has(activity.cultivationPlanId));
  return { plans: scopedPlans, activities: scopedActivities };
}
