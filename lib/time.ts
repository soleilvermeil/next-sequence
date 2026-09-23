/** Parse "HH:mm" or "H:mm" into minutes from midnight, or null. */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value || !value.trim()) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Format minutes from midnight as HH:mm. */
export function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutesToTime(
  start: string | null,
  durationMinutes: number | null,
): string | null {
  const startMins = parseTimeToMinutes(start);
  if (startMins === null || durationMinutes === null || Number.isNaN(durationMinutes)) {
    return null;
  }
  return formatMinutesAsTime(startMins + durationMinutes);
}

/** Today's date at HH:mm local time → epoch ms. */
export function timeTodayToEpoch(time: string | null): number | null {
  const mins = parseTimeToMinutes(time);
  if (mins === null) return null;
  const d = new Date();
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d.getTime();
}

export function epochToTimeString(epochMs: number): string {
  const d = new Date(epochMs);
  return formatMinutesAsTime(d.getHours() * 60 + d.getMinutes());
}

export function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDurationShort(minutes: number | null): string {
  if (minutes === null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
