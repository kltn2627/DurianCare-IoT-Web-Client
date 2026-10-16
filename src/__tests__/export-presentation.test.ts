import { batchDisplayName, displayQuantity, isSyntheticBatch, isSyntheticRelease, releaseDisplayName } from "@/lib/cultivation/presentation";
import type { ExportRelease, HarvestBatch } from "@/lib/cultivation/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

it("uses one list without widening fixture write access or removing snapshot guards", () => {
  const source = readFileSync(join(process.cwd(), "src/components/dashboard/CropQrBuilder.tsx"), "utf8");
  expect(source).not.toMatch(/dataScope|Dữ liệu minh họa|Mô phỏng/);
  expect(source).toContain("!isSyntheticBatch(batch) && isReleaseEligibleBatch(batch)");
  expect(source).toContain('disabled={isSyntheticRelease(release) || release.status !== "DRAFT"}');
  expect(source).toContain("canApproveExport && !isSyntheticRelease(release)");
  expect(source).toContain("setSnapshot(null)");
  expect(source).toContain("result.releaseId !== selectedRelease.id");
});

const fixture: ExportRelease = {id:"fixture",harvestBatchId:"fixture-lot",targetMarketCode:"VN",status:"RELEASED",createdAt:"2026-08-28T00:00:00Z",complianceAssessmentSnapshot:{},releaseCode:"DEMO-SYNTHETIC-2026-RI6",traceabilitySnapshot:{variety:"Ri6"}};
it("simplifies display without disguising fixture provenance", () => {
  expect(isSyntheticRelease(fixture)).toBe(true);
  expect(releaseDisplayName(fixture)).toBe("Lô Ri6");
  expect(isSyntheticRelease({...fixture,releaseCode:"ordinary",dataOrigin:"DEMO_SYNTHETIC"})).toBe(true);
  expect(isSyntheticRelease({...fixture,releaseCode:"ordinary",traceabilitySnapshot:{dataOrigin:"DEMO_SYNTHETIC"}})).toBe(true);
});

it("keeps technical batch identifiers out of normal fixture labels without mutating provenance", () => {
  const batch = Object.freeze({id:"fixture-lot",batchCode:"DEMO-SYNTHETIC-2026-RI6-LOT",dataOrigin:"DEMO_SYNTHETIC"}) as HarvestBatch;
  expect(batchDisplayName(batch,[fixture])).toBe("Lô Ri6");
  expect(batchDisplayName(batch,[])).toBe("Lô thu hoạch");
  expect(isSyntheticBatch(batch)).toBe(true);
  expect(batch.dataOrigin).toBe("DEMO_SYNTHETIC");
  expect(displayQuantity(3500,"KG")).toBe("3.500 kg");
  expect(displayQuantity("5000","KG")).toBe("5.000 kg");
});

it("retains all list rows while separately identifying records excluded from verified totals", () => {
  const real = {...fixture,id:"real",releaseCode:"ER-REAL",traceabilitySnapshot:{}};
  const rows = [fixture,real];
  expect(rows.map(releaseDisplayName)).toEqual(["Lô Ri6", "ER-REAL"]);
  expect(rows.filter(row=>!isSyntheticRelease(row)).map(row=>row.id)).toEqual(["real"]);
  expect(rows.filter(isSyntheticRelease)).toEqual([fixture]);
});
it("does not relabel operational dossiers based on variety or quantity", () => {
  const real = {...fixture, releaseCode:"ER-REAL", dataOrigin:"OPERATIONAL" as const};
  expect(isSyntheticRelease(real)).toBe(false);
  expect(releaseDisplayName(real)).toBe("ER-REAL");
  expect(releaseDisplayName({...fixture,traceabilitySnapshot:{}})).toBe("Hồ sơ xuất xưởng");
});
