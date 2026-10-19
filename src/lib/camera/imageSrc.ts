// Stored capture URLs are absolute Gateway URLs (".../api/v1/camera/image/cam_<digits>.jpg").
// A plain <img> cannot attach the session token, so images are loaded through the
// cookie-authenticated /api/backend proxy; the IoT service enforces farm scope.
const CAPTURE_IMAGE = /\/api\/v1\/camera\/image\/(cam_\d+\.jpg)$/;

export function captureImageSrc(imageUrl: string | null | undefined) {
  const match = imageUrl ? CAPTURE_IMAGE.exec(imageUrl) : null;
  return match ? `/api/backend/v1/camera/image/${match[1]}` : null;
}
