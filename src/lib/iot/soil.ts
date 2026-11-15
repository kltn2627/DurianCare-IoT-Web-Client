/**
 * Soil probe verdict sent by the sensor firmware (>= 1.4.0). Only "OK" carries a real percentage;
 * every other status means there is NO valid soil-moisture value, whatever the raw ADC number is.
 */
export type SoilSensorStatus = "OK" | "UNCALIBRATED" | "NO_SIGNAL" | "SATURATED" | "UNSTABLE";

const NOTES: Record<Exclude<SoilSensorStatus, "OK">, string> = {
  UNCALIBRATED: "Chưa hiệu chuẩn",
  NO_SIGNAL: "Không có tín hiệu — kiểm tra dây cảm biến",
  SATURATED: "Đầu dò hở hoặc chưa cắm vào đất",
  UNSTABLE: "Tín hiệu không ổn định — kiểm tra dây cảm biến",
};

/** Text to show instead of a percentage, or null when the reading is valid / from older firmware. */
export function soilSensorNote(status: string | null | undefined): string | null {
  if (!status || status === "OK") return null;
  return NOTES[status as Exclude<SoilSensorStatus, "OK">] ?? "Không có dữ liệu hợp lệ";
}
