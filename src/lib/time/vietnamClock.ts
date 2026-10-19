export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: VIETNAM_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

/** Today's date in Vietnam as dd/MM/yyyy, independent of the server or browser time zone. */
export function formatVietnamDate(now: Date) {
  return dateFormatter.format(now);
}

export function vietnamHour(now: Date) {
  return Number(hourFormatter.format(now));
}

export function vietnamGreeting(now: Date) {
  const hour = vietnamHour(now);
  if (hour >= 4 && hour < 11) return "Chào buổi sáng";
  if (hour >= 11 && hour < 13) return "Chào buổi trưa";
  if (hour >= 13 && hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Milliseconds until the next whole minute, so date and greeting roll over on time. */
export function msUntilNextMinute(now: Date) {
  return 60_000 - (now.getTime() % 60_000);
}
