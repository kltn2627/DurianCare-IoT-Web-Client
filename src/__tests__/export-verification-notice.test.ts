import { readFileSync } from "node:fs";
import { join } from "node:path";

it("does not render the removed export verification notice in the operations workspace", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/dashboard/CropQrBuilder.tsx"),
    "utf8",
  );
  expect(source).not.toContain(
    "Chưa có dữ liệu xuất xưởng vận hành được xác minh.",
  );
});
