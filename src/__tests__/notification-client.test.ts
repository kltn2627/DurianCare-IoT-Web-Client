import { notificationClient, NotificationApiError } from "@/lib/notification/client";
import { notificationTargetUrl } from "@/lib/notification/target";
import type { NotificationItem } from "@/lib/notification/types";
const notification = (metadata: NotificationItem["metadata"]): NotificationItem => ({
  id: "fixture", title: "Fixture", message: "Fixture only", type: "SYSTEM", isRead: false,
  createdAt: "2026-10-15T00:00:00Z", metadata,
});

beforeEach(() => { global.fetch = jest.fn(); });
it("uses the static bulk route and parses the actual modified count", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ updatedCount: 8 }), { status: 200 }));
  expect(await notificationClient.markAllRead()).toEqual({ updatedCount: 8 });
  expect(fetch).toHaveBeenCalledWith("/api/notifications/notifications/read-all", expect.objectContaining({ method: "PATCH" }));
});
it("accepts an empty/repeated bulk operation", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"updatedCount":0}', { status: 200 }));
  expect((await notificationClient.markAllRead()).updatedCount).toBe(0);
});
it.each([400, 401, 403, 404, 503])("preserves HTTP %s without reporting success", async status => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"message":"request rejected"}', { status }));
  await expect(notificationClient.markAllRead()).rejects.toMatchObject({ status, name: "NotificationApiError" });
});
it("does not pretend an invalid bulk response is a successful update", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
  await expect(notificationClient.markAllRead()).rejects.toBeInstanceOf(NotificationApiError);
});

it.each(["//outside.invalid", "/\\outside.invalid", "/\n/outside.invalid", "https://outside.invalid", "javascript:alert(1)"])("rejects unsafe notification target %j", targetUrl => {
  expect(notificationTargetUrl(notification({ targetUrl }))).toBeNull();
});
it("keeps internal notification destinations and scoped tree links", () => {
  expect(notificationTargetUrl(notification({ targetUrl: "/notifications?page=1#inbox" }))).toBe("/notifications?page=1#inbox");
  expect(notificationTargetUrl(notification({ treeId: "tree/1", farmId: "farm", zoneId: "zone" })))
    .toBe("/dashboard/client/farms/farm/zones/zone?treeId=tree%2F1");
});
