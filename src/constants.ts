
import { ShiftType } from "./types";

export const SHIFT_OPTIONS: ShiftType[] = ["有休", "休み", "任意入力"];

export interface CycleWeekPattern {
  week1: ShiftType;
  week2: ShiftType;
  week3: ShiftType;
  week4: ShiftType;
}
// 配列のインデックスは JavaScript の Date.getDay() と同じ並び: 0=日,1=月,2=火,3=水,4=木,5=金,6=土
export type CyclePattern = CycleWeekPattern[];
export type CyclePatterns = Record<number, CyclePattern>;

const OFF: ShiftType = "休み";
const wk = (mon: ShiftType, tue: ShiftType, wed: ShiftType, thu: ShiftType, fri: ShiftType, sat: ShiftType, sun: ShiftType): ShiftType[] =>
  [sun, mon, tue, wed, thu, fri, sat];

function buildPattern(week1: ShiftType[], week2: ShiftType[]): CyclePattern {
  return week1.map((w1, i) => ({ week1: w1, week2: week2[i], week3: w1, week4: week2[i] }));
}

export const DEFAULT_CYCLE_PATTERNS: CyclePatterns = {
  1: buildPattern(
    wk("09:00～18:00", "09:00～18:00", "09:00～18:00", "09:00～18:00", "09:00～18:00", OFF, OFF),
    wk("09:00～18:00", "09:00～18:00", "09:00～18:00", "09:00～18:00", "09:00～18:00", OFF, OFF)
  )
};
