const ORDINAL_SUFFIX = { 1: "st", 2: "nd", 3: "rd" };

/** 1 -> 1st, 2 -> 2nd, 11 -> 11th, 22 -> 22nd. */
export function ordinal(day) {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) return `${day}th`;
  return `${day}${ORDINAL_SUFFIX[day % 10] || "th"}`;
}

function parts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const hour24 = date.getHours();
  return {
    weekday: date.toLocaleDateString("en-GB", { weekday: "short" }),
    day: date.getDate(),
    month: date.toLocaleDateString("en-GB", { month: "short" }),
    year: String(date.getFullYear()).slice(-2),
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: String(date.getMinutes()).padStart(2, "0"),
    meridiem: hour24 < 12 ? "am" : "pm",
  };
}

/** "Sun, 8th Nov 26" */
export function formatTrackingDay(value) {
  const p = parts(value);
  if (!p) return "";
  return `${p.weekday}, ${ordinal(p.day)} ${p.month} ${p.year}`;
}

/** "Sun, 8th Nov 26 - 9:53am" */
export function formatTrackingDate(value) {
  const p = parts(value);
  if (!p) return "";
  return `${formatTrackingDay(value)} - ${p.hour}:${p.minute}${p.meridiem}`;
}

/** "9:53am" */
export function formatTrackingTime(value) {
  const p = parts(value);
  if (!p) return "";
  return `${p.hour}:${p.minute}${p.meridiem}`;
}
