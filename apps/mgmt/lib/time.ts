// MGMT renders on a UTC server and staff may open it anywhere; every date shown
// and every day boundary is Beirut time (UTC+2 winter / UTC+3 summer).
export const TZ = "Asia/Beirut";

/** Format an instant in Beirut time. */
export function fmt(date: string | number | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(date).toLocaleString("en-GB", { timeZone: TZ, ...opts });
}

/** Beirut calendar date of an instant, "YYYY-MM-DD". */
export function beirutYmd(date: string | number | Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(date),
  );
}

/** Beirut wall-clock stamp of an instant, "YYYY-MM-DD HH:mm" (for exports). */
export function beirutStamp(date: string | number | Date): string {
  const t = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(date),
  );
  return `${beirutYmd(date)} ${t}`;
}

/** UTC instant of Beirut midnight on a "YYYY-MM-DD" date. */
export function beirutMidnightOf(ymd: string): Date {
  // offset in force at noon that day (DST changes happen at night)
  const probe = new Date(`${ymd}T12:00:00Z`);
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offset);
  const sign = m?.[1] ?? "+";
  const hh = String(m?.[2] ?? "0").padStart(2, "0");
  return new Date(`${ymd}T00:00:00${sign}${hh}:${m?.[3] ?? "00"}`);
}

/** "YYYY-MM-DD" shifted by whole days. */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** UTC instant of Beirut midnight `daysAgo` days before today. */
export function beirutDayStart(daysAgo = 0): Date {
  return beirutMidnightOf(addDays(beirutYmd(), -daysAgo));
}
