import { hasCultivationPermission } from "@/features/cultivation-calendar/permissions";
import { cultivationClient } from "@/lib/cultivation/client";
import { exportStatusLabels } from "@/features/cultivation-calendar/labels";
import { selectTraceabilityRelease } from "@/lib/cultivation/releaseSelection";
import type { ExportRelease } from "@/lib/cultivation/types";

beforeEach(() => { global.fetch = jest.fn(); });

it("allows Farmer self-verification but never grants Guest approval", () => {
  expect(hasCultivationPermission("FARMER", "EXPORT_RELEASE_APPROVE")).toBe(true);
  expect(hasCultivationPermission("GUEST", "EXPORT_RELEASE_APPROVE")).toBe(false);
  expect(hasCultivationPermission(undefined, "EXPORT_RELEASE_APPROVE")).toBe(false);
});

it("sends dated inspection evidence through the official proxy without actor claims", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"id":"fixture","status":"INSPECTED_PASSED"}', { status: 200 }));
  const evidence = { sourceRef: "fixture-inspection", inspectedAt: "2026-08-28T03:00:00Z", phiChecked: true, pestCheckPassed: true, qualityPassed: true, measuredBrix: 31 };
  await cultivationClient.inspectExportRelease("fixture", evidence);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/export-releases/fixture/inspect"), expect.objectContaining({ method: "POST", body: JSON.stringify(evidence) }));
});

it.each([400, 401, 403, 409, 503])("does not fake inspection success on HTTP %s", async status => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"message":"rejected"}', { status }));
  await expect(cultivationClient.inspectExportRelease("fixture", { sourceRef: "fixture", inspectedAt: "2026-08-28T03:00:00Z", phiChecked: true, pestCheckPassed: true, qualityPassed: true })).rejects.toMatchObject({ status });
});

it("labels self-inspection states independently from season lifecycle", () => {
  for (const state of ["INSPECTION_PENDING", "NOT_ELIGIBLE", "INSPECTED_PASSED"] as const) expect(exportStatusLabels[state]).toBeTruthy();
});

it("reads persisted dispatch status instead of deriving delivery from release status", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"id":"fixture-lot","exportReleaseId":"fixture-release","status":"DELIVERED"}', { status: 200 }));
  const result = await cultivationClient.getHarvestDispatch("fixture-lot");
  expect(result.status).toBe("DELIVERED");
  expect(fetch).toHaveBeenCalledWith("/api/backend/v1/harvest-batches/fixture-lot/dispatch", expect.objectContaining({ cache: "no-store" }));
});

it("preserves missing dispatch as an HTTP error, never invents a shipped record", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"message":"not found"}', { status: 404 }));
  await expect(cultivationClient.getHarvestDispatch("fixture-lot")).rejects.toMatchObject({ status: 404 });
});

it("keeps the QR-selected release even when it is not the first row", () => {
  const releases = [{id:"ri6"}, {id:"monthong"}] as ExportRelease[];
  expect(selectTraceabilityRelease(releases, "monthong")?.id).toBe("monthong");
  expect(selectTraceabilityRelease(releases, null)?.id).toBe("ri6");
  expect(selectTraceabilityRelease(releases, "missing")).toBeNull();
  expect(selectTraceabilityRelease([], null)).toBeNull();
});

it.each(["ri6", "monthong"])("loads exactly the requested %s snapshot", async id => {
  jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({releaseId:id,snapshot:{harvestBatchId:`${id}-lot`}})));
  expect((await cultivationClient.traceability(id)).snapshot.harvestBatchId).toBe(`${id}-lot`);
});
it("rejects a successful HTTP response with the wrong release identity", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"releaseId":"ri6","snapshot":{}}'));
  await expect(cultivationClient.traceability("monthong")).rejects.toMatchObject({status:502});
});
it.each([404,500])("does not reuse a snapshot when HTTP %s fails", async status => {
  jest.mocked(fetch).mockResolvedValue(new Response('{}',{status}));
  await expect(cultivationClient.traceability("missing")).rejects.toMatchObject({status});
});

it("keeps verified shipment totals null instead of counting demo delivery statuses", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"status":"NO_VERIFIED_DATA","quantitiesByUnit":null}'));
  const summary = await cultivationClient.dispatchSummary("farm-fixture");
  expect(summary).toEqual({status:"NO_VERIFIED_DATA",quantitiesByUnit:null});
  expect(fetch).toHaveBeenCalledWith("/api/backend/v1/harvest-batches/dispatch-summary?farmId=farm-fixture",expect.anything());
});
