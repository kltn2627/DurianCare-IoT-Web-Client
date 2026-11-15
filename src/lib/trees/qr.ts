// Tree QR payload: a stable URL built only from the tree's id (never a token or personal data).
// Opening it still requires login; the backend checks farm ownership on every read/change.
export const TREE_QR_PATH = "/dashboard/client/trees/";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Base URL: NEXT_PUBLIC_WEB_BASE_URL (same convention as export QR codes), else the page origin. */
export function treeQrBaseUrl(envBase: string | undefined, origin: string) {
  return (envBase?.trim() || origin).replace(/\/+$/, "");
}

export function treeQrUrl(baseUrl: string, treeId: string) {
  if (!ID_PATTERN.test(treeId)) throw new Error("Mã cây không hợp lệ.");
  return `${baseUrl}${TREE_QR_PATH}${encodeURIComponent(treeId)}`;
}

/** Returns the tree id from a DurianCare tree QR (URL path …/trees/{id}), otherwise null. */
export function parseTreeQr(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("trees");
  const id = idx >= 0 && idx === parts.length - 2 ? decodeURIComponent(parts[idx + 1]) : null;
  return id && ID_PATTERN.test(id) ? id : null;
}

/** File name for the downloaded PNG, e.g. "qr-cay-DC-T026.png". */
export function treeQrFileName(treeCode: string) {
  return `qr-cay-${treeCode.replace(/[^A-Za-z0-9_-]+/g, "-")}.png`;
}
