import { treeClient } from "@/lib/trees/client";
beforeEach(() => { global.fetch = jest.fn(); });
it.each([400,401,403,404,409,500,503])("preserves HTTP %s and presents a Vietnamese removal error", async status => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"message":"An unexpected error occurred"}', {status}));
  await expect(treeClient.removeTree("fixture / tree")).rejects.toMatchObject({status, message:expect.not.stringContaining("An unexpected")});
  expect(fetch).toHaveBeenCalledWith("/api/backend/trees/fixture%20%2F%20tree",expect.objectContaining({method:"DELETE"}));
});
it("reports network failure without reporting removal success", async () => {
  jest.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(treeClient.removeTree("fixture")).rejects.toMatchObject({status:0,message:expect.stringContaining("kết nối")});
});
it("returns the persisted removed state on repeated successful responses", async () => {
  jest.mocked(fetch).mockImplementation(async () => new Response('{"id":"fixture","status":"REMOVED"}'));
  expect((await treeClient.removeTree("fixture")).status).toBe("REMOVED");
  expect((await treeClient.removeTree("fixture")).status).toBe("REMOVED");
});
