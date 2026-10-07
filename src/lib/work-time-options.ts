import { templateStorage } from "./template-storage";
export interface WorkTimeOption { id: string; start: string; end: string; nextDay: boolean; abbreviation: string; visible: boolean; }
export type ShiftDisplayMode = "both" | "time" | "abbreviation";
export const ABBREVIATIONS = ["通常勤務", "早番", "中番", "遅番", "午前勤務", "午後勤務", "時短勤務", "当番勤務", "夜勤", "明け"];
export const DEFAULT_WORK_TIMES: WorkTimeOption[] = [
  { id: "default-1", start: "09:00", end: "18:00", nextDay: false, abbreviation: "早番", visible: true },
  { id: "default-2", start: "10:00", end: "19:00", nextDay: false, abbreviation: "遅番", visible: true },
  { id: "default-3", start: "09:00", end: "13:00", nextDay: false, abbreviation: "午前勤務", visible: true },
];
export const workTimeValue = (item: WorkTimeOption) => `${item.start}～${item.end}`;
const normalized = (value: string) => value.replace(/(^|～)0(?=\d:)/g, "$1");
export function isWorkTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})～(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const [, sh, sm, eh, em] = match.map(Number);
  return sh < 24 && eh < 24 && sm < 60 && em < 60;
}
export function validateWorkTimes(items: WorkTimeOption[]): string {
  if (items.length > 60) return "勤務時間は60件まで登録できます。";
  const seen = new Set<string>();
  for (const item of items) {
    if (!isWorkTime(workTimeValue(item))) return "開始・終了時刻を入力してください。";
    const minutes = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
    const duration = minutes(item.end) + (item.nextDay ? 1440 : 0) - minutes(item.start);
    if (duration <= 0 || duration > 1440) return "出勤と退勤の時刻を確認してください（同じ時刻にはできません）。";
    const key = normalized(workTimeValue(item));
    if (seen.has(key)) return "同じ勤務時間は1件にまとめてください。";
    if (item.abbreviation.trim().length > 20) return "短い名前は20文字以内で入力してください。";
    seen.add(key);
  }
  return "";
}
export function readWorkTimes(): WorkTimeOption[] {
  try {
    const value = JSON.parse(templateStorage.getItem("work_time_master_v2") || "null");
    if (Array.isArray(value) && !validateWorkTimes(value)) return value;
  } catch { /* initial defaults */ }
  return DEFAULT_WORK_TIMES.map(item => ({ ...item }));
}
export function saveWorkTimes(items: WorkTimeOption[]): void { templateStorage.setItem("work_time_master_v2", JSON.stringify(items)); }
export function displayShift(value: string, items: WorkTimeOption[], mode: ShiftDisplayMode): string {
  const item = items.find(item => normalized(workTimeValue(item)) === normalized(value));
  if (!item?.abbreviation || mode === "time") return value;
  return mode === "abbreviation" ? item.abbreviation : `${value}（${item.abbreviation}）`;
}
