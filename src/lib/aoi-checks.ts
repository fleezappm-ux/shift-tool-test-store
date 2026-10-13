import { format } from "date-fns";
import { Employee } from "../types";
import { isOffShift } from "./off-types";

/** あおい薬局だけの確認ルール（赤枠）。自動シフト作成とは無関係で、見た目のチェックだけ行います。 */
export const AOI_WEEKLY_PEOPLE = ["降旗", "藤川", "本道"] as const;
export const AOI_WEEKLY_DAYS = 5;
/** 曜日（日=0）ごとの必要人数。日曜は営業しないので 0 */
export const AOI_DAILY_MIN = [0, 4, 4, 4, 3, 4, 3] as const;
export const AOI_CLOSURE_MIN = 2;

export interface AoiFilterSettings { weekly: boolean; daily: boolean }
export const DEFAULT_AOI_FILTERS: AoiFilterSettings = { weekly: true, daily: true };
export const AOI_FILTER_KEY = "shift_aoi_filters";

export const isAoiStore = (storeName?: string) => /あおい薬局/.test(storeName || "");

export interface AoiChecks {
  /** 赤枠にするセル：キーは「従業員ID|日付」 値は枠の位置 */
  cells: Record<string, { first: boolean; last: boolean; message: string }>;
  /** 赤枠にする日（行）：キーは日付 */
  rows: Record<string, string>;
  weekMessages: string[];
  rowMessages: string[];
}

const shiftOf = (emp: Employee, key: string) => emp.shifts?.find(s => s.date.startsWith(key))?.shift;
/** 出勤として数える：勤務がある日、または有休 */
const countsAsWork = (shift?: string) => !!shift && shift !== "none" && (!isOffShift(shift) || shift === "有休");
const isWorking = (shift?: string) => !!shift && shift !== "none" && !isOffShift(shift);
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * @param bandOf その日の帯の種類（例：祝日・谷川整形休診）。空なら帯なし
 * @param isClosed 営業しない日（日曜・祝日・全員お休みの帯）
 */
export function checkAoi(opts: { dates: Date[]; employees: Employee[]; settings: AoiFilterSettings; bandOf: (date: Date) => string; isClosed: (date: Date) => boolean }): AoiChecks {
  const { dates, employees, settings, bandOf, isClosed } = opts;
  const out: AoiChecks = { cells: {}, rows: {}, weekMessages: [], rowMessages: [] };
  const keys = dates.map(d => format(d, "yyyy-MM-dd"));
  const label = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;

  if (settings.daily) {
    dates.forEach((date, i) => {
      if (date.getDay() === 0 || isClosed(date)) return;
      const closure = /休診/.test(bandOf(date));
      const need = closure ? AOI_CLOSURE_MIN : AOI_DAILY_MIN[date.getDay()];
      const count = employees.filter(emp => isWorking(shiftOf(emp, keys[i]))).length;
      if (count < need) {
        const message = `${label(date)} 出勤${count}人（${closure ? "休診の日は" : ""}${need}人以上必要）`;
        out.rows[keys[i]] = message;
        out.rowMessages.push(message);
      }
    });
  }

  if (settings.weekly) {
    const weeks = new Map<string, number[]>();
    dates.forEach((date, i) => {
      const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const id = format(monday, "yyyy-MM-dd");
      weeks.set(id, [...(weeks.get(id) || []), i]);
    });
    weeks.forEach(indexes => {
      // 月〜土がすべて表示範囲に入っている週だけ数えます（期間の端の半端な週は除く）
      const days = indexes.map(i => dates[i].getDay());
      if (![1, 2, 3, 4, 5, 6].every(d => days.includes(d))) return;
      const target = employees.filter(emp => AOI_WEEKLY_PEOPLE.some(name => (emp.displayName || emp.name || "").includes(name)));
      target.forEach(emp => {
        const worked = indexes.filter(i => countsAsWork(shiftOf(emp, keys[i]))).length;
        if (worked >= AOI_WEEKLY_DAYS) return;
        const message = `${emp.displayName || emp.name}さん ${label(dates[indexes[0]])}の週は出勤${worked}日（${AOI_WEEKLY_DAYS}日必要・有休は出勤に数えます）`;
        out.weekMessages.push(message);
        indexes.forEach((i, n) => { out.cells[`${emp.id}|${keys[i]}`] = { first: n === 0, last: n === indexes.length - 1, message }; });
      });
    });
  }
  return out;
}
