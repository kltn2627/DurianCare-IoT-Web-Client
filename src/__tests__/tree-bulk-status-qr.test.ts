import {
  BULK_STATUS_TARGETS,
  bulkConfirmMessage,
  isBulkSelectable,
  pruneBulkSelection,
  summarizeBulkResult,
  toggleBulkSelection,
} from "@/lib/trees/bulkStatus";
import { parseTreeQr, treeQrBaseUrl, treeQrFileName, treeQrUrl } from "@/lib/trees/qr";
import type { BulkTreeHealthStatusResponse, TreeSummary } from "@/lib/trees/types";

const tree = (id: string, extra: Partial<TreeSummary> = {}): TreeSummary =>
  ({ id, treeCode: `DC-${id}`, diagnosisCount: 0, healthStatus: "DISEASED", status: "ACTIVE", ...extra });

describe("bulk tree status selection", () => {
  it("only selects active trees that are not already in the target status", () => {
    expect(isBulkSelectable(tree("a"), "TREATING")).toBe(true);
    expect(isBulkSelectable(tree("a", { healthStatus: "TREATING" }), "TREATING")).toBe(false);
    expect(isBulkSelectable(tree("a", { status: "REMOVED" }), "TREATING")).toBe(false);
  });

  it("toggles selection and prunes invalid ids after target change", () => {
    let selected = toggleBulkSelection(new Set(), tree("a"), "TREATING");
    selected = toggleBulkSelection(selected, tree("b", { status: "REMOVED" }), "TREATING");
    expect([...selected]).toEqual(["a"]);
    expect([...toggleBulkSelection(selected, tree("a"), "TREATING")]).toEqual([]);
    const trees = [tree("a", { healthStatus: "RECOVERED" }), tree("c")];
    expect([...pruneBulkSelection(new Set(["a", "c", "gone"]), trees, "RECOVERED")]).toEqual(["c"]);
  });

  it("offers every health status as a bulk target, with map labels", () => {
    expect(BULK_STATUS_TARGETS.map((t) => [t.value, t.label])).toEqual([
      ["HEALTHY", "Khỏe mạnh"], ["SUSPECTED", "Nghi ngờ"], ["DISEASED", "Bệnh"],
      ["TREATING", "Đang điều trị"], ["RECOVERED", "Đã hồi phục"],
    ]);
    expect(BULK_STATUS_TARGETS.every((t) => !/AI|chẩn đoán/.test(t.hint))).toBe(true);
    for (const target of BULK_STATUS_TARGETS.map((t) => t.value)) {
      expect(isBulkSelectable(tree("a", { healthStatus: target === "DISEASED" ? "HEALTHY" : "DISEASED" }), target)).toBe(true);
    }
  });

  it("builds the confirmation message", () => {
    expect(bulkConfirmMessage(8, "TREATING")).toBe("Đổi trạng thái 8 cây sang Đang điều trị?");
  });

  it("reports only what the server saved and keeps failed trees", () => {
    const response: BulkTreeHealthStatusResponse = {
      healthStatus: "RECOVERED", requested: 3, updated: 1, failed: 2,
      results: [
        { treeId: "a", treeCode: "DC-a", updated: true, healthStatus: "RECOVERED", errorCode: null, message: null },
        { treeId: "b", treeCode: "DC-b", updated: false, healthStatus: "TREATING", errorCode: "NOT_ACTIVE", message: "x" },
        { treeId: "c", treeCode: null, updated: false, healthStatus: null, errorCode: "FORBIDDEN", message: "x" },
      ],
    };
    const summary = summarizeBulkResult(response, (id) => `DC-${id}`);
    expect(summary.tone).toBe("partial");
    expect(summary.failedIds).toEqual(["b", "c"]);
    expect(summary.message).toContain("1/3");
    expect(summary.message).toContain("DC-b (cây đã đốn khỏi bản đồ)");
    const none = summarizeBulkResult({ ...response, updated: 0, results: response.results.slice(1) }, (id) => id);
    expect(none.tone).toBe("error");
    const all = summarizeBulkResult({ ...response, updated: 1, failed: 0, results: response.results.slice(0, 1) }, (id) => id);
    expect(all).toEqual({ tone: "success", message: "Đã đổi 1 cây sang Đã hồi phục.", failedIds: [] });
  });
});

describe("tree QR", () => {
  it("builds a stable URL with only the tree id", () => {
    const base = treeQrBaseUrl("https://farm.example.com/", "http://localhost:3000");
    expect(base).toBe("https://farm.example.com");
    expect(treeQrBaseUrl(undefined, "http://localhost:3000")).toBe("http://localhost:3000");
    const url = treeQrUrl(base, "tree-001");
    expect(url).toBe("https://farm.example.com/dashboard/client/trees/tree-001");
    expect(url).not.toMatch(/token|key|jwt/i);
    expect(() => treeQrUrl(base, "../x")).toThrow();
  });

  it("parses only DurianCare tree URLs", () => {
    expect(parseTreeQr("https://farm.example.com/dashboard/client/trees/tree-001")).toBe("tree-001");
    expect(parseTreeQr(" http://localhost:3000/dashboard/client/trees/tree-001 ")).toBe("tree-001");
    expect(parseTreeQr("https://x.com/traceability/ABC")).toBeNull();
    expect(parseTreeQr("https://x.com/trees/a/b")).toBeNull();
    expect(parseTreeQr("javascript:alert(1)")).toBeNull();
    expect(parseTreeQr("tree-001")).toBeNull();
    expect(parseTreeQr("https://x.com/trees/%3Cscript%3E")).toBeNull();
  });

  it("names the PNG after the tree code", () => {
    expect(treeQrFileName("DC-T026")).toBe("qr-cay-DC-T026.png");
    expect(treeQrFileName("A B/C")).toBe("qr-cay-A-B-C.png");
  });
});
