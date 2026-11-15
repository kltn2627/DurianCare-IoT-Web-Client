import { treeErrorMessage } from "@/lib/trees/errors";
import {
  HEALTH_STATUS_CATALOG, LIFECYCLE_STATUS_CATALOG, UNASSESSED, countByHealth, matchesHealthFilter, toggleFilterValue,
} from "@/lib/trees/statusCatalog";
import type { TreeSummary } from "@/lib/trees/types";

jest.mock("@/lib/auth/client", () => ({ apiFetch: jest.fn() }));
import { apiFetch } from "@/lib/auth/client";
import { TreeApiError, treeClient } from "@/lib/trees/client";

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, statusText: "", text: async () => JSON.stringify(body) }) as unknown as Response;

describe("tree error messages", () => {
  it("does not call a missing endpoint a service failure", () => {
    expect(treeErrorMessage(404, "Endpoint not found")).toMatch(/chưa có chức năng này.*Không có cây nào bị thay đổi/);
    expect(treeErrorMessage(404, "Tree not found: x")).toMatch(/Không tìm thấy cây/);
  });

  it("explains removed trees, auth and permission without any recovery-gate wording", () => {
    expect(treeErrorMessage(409, "Trạng thái cây đã thay đổi")).not.toMatch(/chẩn đoán AI|hồi phục/);
    expect(treeErrorMessage(409, "Tree health status cannot be changed after removal: DC-T001")).toMatch(/đã được đốn/);
    expect(treeErrorMessage(401, "")).toMatch(/đăng nhập lại/);
    expect(treeErrorMessage(403, "Access denied to tree: x")).toMatch(/không có quyền/);
    expect(treeErrorMessage(400, "healthStatus: must not be null")).toMatch(/không hợp lệ/);
    expect(treeErrorMessage(500, "An unexpected error occurred")).toMatch(/Dịch vụ cây đang gặp lỗi/);
    expect(treeErrorMessage(500, "java.lang.NullPointerException at ...")).not.toMatch(/java|Exception/);
  });

  it("bulk client surfaces the parsed server status instead of a generic failure", async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce(json(404, { status: 404, error: "Not Found", message: "Endpoint not found" }));
    const error = await treeClient.bulkUpdateHealthStatus(["tree-001"], "TREATING").catch((e) => e);
    expect(error).toBeInstanceOf(TreeApiError);
    expect(error.status).toBe(404);
    expect(error.message).toMatch(/chưa có chức năng này/);
    (apiFetch as jest.Mock).mockResolvedValueOnce(json(200, { healthStatus: "TREATING", requested: 1, updated: 1, failed: 0, results: [] }));
    await expect(treeClient.bulkUpdateHealthStatus(["tree-001"], "TREATING")).resolves.toMatchObject({ updated: 1 });
    const [, init] = (apiFetch as jest.Mock).mock.calls[1];
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ treeIds: ["tree-001"], healthStatus: "TREATING" });
  });
});

describe("tree status catalog", () => {
  it("mirrors the backend enums and manual-transition rules exactly", () => {
    expect(HEALTH_STATUS_CATALOG.map((s) => s.value)).toEqual(["HEALTHY", "SUSPECTED", "DISEASED", "TREATING", "RECOVERED"]);
    expect(HEALTH_STATUS_CATALOG.map((s) => s.label)).toEqual(["Khỏe mạnh", "Nghi ngờ", "Bệnh", "Đang điều trị", "Đã hồi phục"]);
    expect(LIFECYCLE_STATUS_CATALOG.map((s) => s.value)).toEqual(["ACTIVE", "REMOVED", "DEAD"]);
  });

  it("filters by health including unassessed trees", () => {
    const trees = [
      { healthStatus: "DISEASED" }, { healthStatus: "DISEASED" }, { healthStatus: "HEALTHY" }, { healthStatus: null },
    ] as TreeSummary[];
    expect(countByHealth(trees)).toEqual({ DISEASED: 2, HEALTHY: 1, [UNASSESSED]: 1 });
    const filter = toggleFilterValue(new Set(), "DISEASED");
    expect(trees.filter((t) => matchesHealthFilter(t, filter))).toHaveLength(2);
    expect(trees.filter((t) => matchesHealthFilter(t, toggleFilterValue(filter, UNASSESSED)))).toHaveLength(3);
    expect(trees.filter((t) => matchesHealthFilter(t, new Set()))).toHaveLength(4);
    expect(toggleFilterValue(filter, "DISEASED").size).toBe(0);
  });
});
