import assert from "node:assert/strict";
import test from "node:test";
import { buildCompletionPayload, emptyUsage, requiresRecordedInput } from "./completionForm.ts";

const catalog = [{ id: "input-1", productName: "Thuốc A", status: "VERIFIED", unit: "ml" }, { id: "input-2", productName: "Phân B", status: "VERIFIED", unit: "kg" }];
const draft = (inputUsages = []) => ({ startedAt: "2026-10-01T07:00", completedAt: "2026-10-01T08:00", actualArea: "1.5", areaUnit: "ha", notes: "Đã phun", inputUsages });
const usage = (agriculturalInputId = "input-1", quantityUsed = "500") => ({ ...emptyUsage(), agriculturalInputId, quantityUsed, quantityUnit: "ml", batchNumber: "LOT-1" });

test("material activity types require actual input usage", () => {
  for (const type of ["CHEMICAL_TREATMENT", "BIOLOGICAL_TREATMENT", "FERTILIZATION", "FERTIGATION"]) {
    assert.equal(requiresRecordedInput(type), true);
    assert.throws(() => buildCompletionPayload(type, draft(), catalog, "actor-1"), /ít nhất một vật tư/);
  }
  for (const type of ["PRUNING", "PEST_MONITORING", "IRRIGATION"]) {
    assert.equal(requiresRecordedInput(type), false);
    assert.equal(buildCompletionPayload(type, draft(), catalog, "actor-1").inputUsages.length, 0);
  }
});

test("payload uses catalog IDs and keeps multiple usage rows", () => {
  const payload = buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage(), { ...usage("input-2", "2"), quantityUnit: "kg" }]), catalog, "actor-1");
  assert.equal(payload.executedBy, "actor-1");
  assert.equal(payload.inputUsages[0].agriculturalInputId, "input-1");
  assert.equal(payload.inputUsages[0].quantityUsed, 500);
  assert.equal(payload.inputUsages[0].quantityUnit, "ml");
  assert.equal(payload.inputUsages[0].batchNumber, "LOT-1");
  assert.equal(payload.inputUsages[1].agriculturalInputId, "input-2");
  assert.equal(payload.actualArea, 1.5);
  assert.equal(payload.notes, "Đã phun");
});

test("removed usage row is absent from submitted payload", () => {
  const rows = [usage(), usage("input-2", "2")];
  const payload = buildCompletionPayload("FERTILIZATION", draft(rows.filter((_, index) => index !== 0)), catalog, "actor-1");
  assert.deepEqual(payload.inputUsages.map((item) => item.agriculturalInputId), ["input-2"]);
});

test("unknown product, invalid amount, actor and time are rejected", () => {
  assert.throws(() => buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage("missing")]), catalog, "actor-1"), /Chọn vật tư/);
  assert.throws(() => buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage("input-1", "0")]), catalog, "actor-1"), /Chọn vật tư/);
  assert.throws(() => buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage()]), catalog, ""), /người thực hiện/);
  assert.throws(() => buildCompletionPayload("CHEMICAL_TREATMENT", { ...draft([usage()]), completedAt: "2026-09-30T08:00" }, catalog, "actor-1"), /Thời gian/);
});
