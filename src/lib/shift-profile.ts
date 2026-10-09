import { addDays, format } from "date-fns";
import { DayShift, Employee } from "../types";
import { isWorkingShift } from "./staffing-check";
import { parseShiftRange } from "./shift-time";

export type ShiftKind = "early" | "mid" | "late";

export interface PersonProfile {
  /** 前の月たちの実績から読み取った、週あたりの出勤日数 */
  weeklyDays: number;
  /** よく出勤する曜日（出勤する割合が半分以上）。頻度の高い順 */
  usualWeekdays: number[];
  /** ほとんど出勤していない曜日（定期休みらしい曜日） */
  fixedOff: number[];
  /** よく使う勤務時間（多い順） */
  shifts: { text: string; share: number; kind: ShiftKind }[];
  usualShift: string;
  /** 読み取りに使った期間のうち、土日・祝日に出勤した日数 */
  weekendWorked: number;
  /** 読み取りに使った出勤日数（目安） */
  samples: number;
}

const WINDOW_DAYS = 56;
const MIN_ENTRIES = 14;

const shiftText = (s: DayShift) => (s.shift === "任意入力" ? (s.customShiftText || "") : s.shift);
export const startMinutes = (text: string): number | null => {
  const range = parseShiftRange({ date: "", shift: text, breakTime: "", workTime: "", comment: "" });
  return range ? range[0] : null;
};

/** お店全体の勤務開始時刻の中央値。これより早い・遅い勤務を「早番」「遅番」とみなす。 */
export function storeMedianStart(employees: Employee[]): number {
  const starts: number[] = [];
  employees.forEach(emp => emp.shifts.forEach(s => { if (isWorkingShift(s.shift)) { const m = startMinutes(shiftText(s)); if (m !== null) starts.push(m); } }));
  if (!starts.length) return 9 * 60;
  starts.sort((a, b) => a - b);
  return starts[Math.floor(starts.length / 2)];
}

export function kindOf(text: string, median: number): ShiftKind {
  const m = startMinutes(text);
  if (m === null) return "mid";
  if (m <= median - 30) return "early";
  if (m >= median + 30) return "late";
  return "mid";
}

/**
 * 対象期間の直前8週間の実績から、人ごとの「いつもの働き方」を読み取る。
 * 実績が少ない人（14日未満）は null。
 */
export function inferProfiles(employees: Employee[], start: Date, isWeekendLike: (date: Date) => boolean): Record<string, PersonProfile | null> {
  const out: Record<string, PersonProfile | null> = {};
  const median = storeMedianStart(employees);
  const winStart = format(addDays(start, -WINDOW_DAYS), "yyyy-MM-dd");
  const winEnd = format(addDays(start, -1), "yyyy-MM-dd");
  employees.forEach(emp => {
    const entries = emp.shifts.filter(s => { const d = s.date.slice(0, 10); return s.shift && d >= winStart && d <= winEnd; });
    if (entries.length < MIN_ENTRIES) { out[emp.id] = null; return; }
    const seen = [0, 0, 0, 0, 0, 0, 0], worked = [0, 0, 0, 0, 0, 0, 0];
    const texts = new Map<string, number>();
    let weekendWorked = 0, samples = 0;
    entries.forEach(s => {
      const date = new Date(`${s.date.slice(0, 10)}T00:00:00`); const wd = date.getDay();
      seen[wd]++;
      if (isWorkingShift(s.shift)) {
        worked[wd]++; samples++;
        const t = shiftText(s); if (t) texts.set(t, (texts.get(t) || 0) + 1);
        if (isWeekendLike(date)) weekendWorked++;
      }
    });
    if (samples === 0) { out[emp.id] = null; return; }
    const ratio = (wd: number) => seen[wd] >= 3 ? worked[wd] / seen[wd] : null;
    const usualWeekdays = [0, 1, 2, 3, 4, 5, 6].filter(wd => (ratio(wd) ?? 0) >= 0.5).sort((a, b) => (ratio(b) ?? 0) - (ratio(a) ?? 0) || a - b);
    const fixedOff = [0, 1, 2, 3, 4, 5, 6].filter(wd => ratio(wd) !== null && (ratio(wd) as number) <= 0.1);
    const weeklyDays = Math.max(1, Math.min(7, Math.round([0, 1, 2, 3, 4, 5, 6].reduce((sum, wd) => sum + (ratio(wd) ?? 0), 0))));
    const total = [...texts.values()].reduce((a, b) => a + b, 0) || 1;
    const shifts = [...texts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([text, count]) => ({ text, share: count / total, kind: kindOf(text, median) }));
    out[emp.id] = { weeklyDays, usualWeekdays, fixedOff, shifts, usualShift: shifts[0]?.text || "", weekendWorked, samples };
  });
  return out;
}
