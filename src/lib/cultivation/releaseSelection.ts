import type { ExportRelease } from "./types";

export function selectTraceabilityRelease(releases: ExportRelease[], selectedId: string | null) {
  return selectedId ? releases.find(release => release.id === selectedId) ?? null : releases[0] ?? null;
}
