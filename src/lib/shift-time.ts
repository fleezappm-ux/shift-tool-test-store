import { DayShift } from "../types";

/** "9:00～18:00" や "09:00～18:00" を、分（0〜）の組にする。読めないときは null。夜をまたぐ場合は終わりに24時間足す。 */
export function parseShiftRange(shift: DayShift | undefined): [number, number] | null {
  if (!shift) return null;
  const text = shift.shift === "任意入力" ? (shift.customShiftText || "") : shift.shift;
  const match = /(\d{1,2}):(\d{2})\s*[～~〜-]\s*(\d{1,2}):(\d{2})/.exec(text || "");
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  let end = Number(match[3]) * 60 + Number(match[4]);
  if (end <= start) end += 1440;
  return [start, end];
}

export const toMinutes = (value: string): number => { const [h, m] = value.split(":").map(Number); return h * 60 + (m || 0); };
export const formatMinutes = (value: number): string => `${Math.floor(value / 60) % 24}:${String(value % 60).padStart(2, "0")}`;

/** open〜close のうち、どの時間帯にも誰もいない部分（すき間）を返す。 */
export function uncoveredGaps(open: number, close: number, ranges: [number, number][]): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const gaps: [number, number][] = [];
  let cursor = open;
  for (const [start, end] of sorted) {
    if (end <= cursor) continue;
    if (start > cursor) gaps.push([cursor, Math.min(start, close)]);
    cursor = Math.max(cursor, end);
    if (cursor >= close) break;
  }
  if (cursor < close) gaps.push([cursor, close]);
  return gaps.filter(([a, b]) => b > a);
}
