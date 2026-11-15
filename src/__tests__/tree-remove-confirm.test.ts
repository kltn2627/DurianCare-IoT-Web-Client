import { readFileSync } from "node:fs";
import { join } from "node:path";
import { removeTreeConfirmation } from "@/lib/trees/removal";

// Regression: window.confirm() returns false without showing anything in embedded browsers (and when
// the user blocked dialogs), so the "Đã đốn cây" button silently did nothing.
describe("tree removal confirmation", () => {
  const panel = readFileSync(join(__dirname, "../components/trees/TreeDetailPanel.tsx"), "utf8");

  it("uses the in-app ConfirmDialog instead of window.confirm", () => {
    expect(panel).not.toMatch(/window\.confirm\(/);
    expect(panel).toContain('import { ConfirmDialog } from "@/components/feedback/ConfirmDialog"');
    expect(panel).toContain("onClick={() => setConfirmingRemove(true)}");
    expect(panel).toContain("open={confirmingRemove}");
    expect(panel).toContain("onConfirm={() => void removeTree()}");
    expect(panel).toContain("await treeClient.removeTree(treeId);");
  });

  it("names the tree in the confirmation", () => {
    const text = removeTreeConfirmation("H01-C01");
    expect(text.title).toBe("Đã đốn cây H01-C01?");
    expect(text.confirmLabel).toBe("Đã đốn cây");
    expect(text.description).toContain("Lịch sử chẩn đoán");
  });

  it("removeTree still sends DELETE /api/trees/{id}", () => {
    const client = readFileSync(join(__dirname, "../lib/trees/client.ts"), "utf8");
    expect(client).toMatch(/removeTree: \(treeId: string\) =>\s*treeRequest<TreeDetail>\(`\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}`, \{\s*method: "DELETE"/);
  });
});
