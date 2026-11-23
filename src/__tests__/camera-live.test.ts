import {
  LIVE_SNAPSHOT_MS, STALE_FRAME_MS, canLivePreview, frameAgeView, liveSnapshotDelayMs, snapshotDelayMs,
} from "@/lib/camera/status";

describe("camera live view helpers", () => {
  it("refreshes fast only while live and healthy, otherwise keeps the back-off", () => {
    expect(liveSnapshotDelayMs(0)).toBe(LIVE_SNAPSHOT_MS);
    expect(snapshotDelayMs(0)).toBe(8_000);
    expect(liveSnapshotDelayMs(1)).toBe(16_000);
    expect(liveSnapshotDelayMs(10)).toBe(60_000);
  });

  it("offers live view only for push cameras that can preview", () => {
    expect(canLivePreview({ deliveryMode: "PUSH" }, true)).toBe(true);
    expect(canLivePreview({ deliveryMode: "PUSH" }, false)).toBe(false);
    expect(canLivePreview({ deliveryMode: "PULL" }, true)).toBe(false);
    expect(canLivePreview(undefined, true)).toBe(false);
  });

  it("flags an old frame and shows its date so it is not mistaken for live", () => {
    const now = new Date(2026, 10, 22, 17, 5, 0);
    const old = frameAgeView(new Date(2026, 9, 19, 14, 54, 3), now);
    expect(old.stale).toBe(true);
    expect(old.text).toContain("19/10/2026");

    const fresh = frameAgeView(new Date(now.getTime() - 4_000), now);
    expect(fresh.stale).toBe(false);
    expect(fresh.text).not.toContain("/");

    expect(frameAgeView(new Date(now.getTime() - STALE_FRAME_MS - 1), now).stale).toBe(true);
  });
});
