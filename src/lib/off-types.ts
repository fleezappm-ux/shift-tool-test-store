/** 勤務のない日の種類（シフト表のプルダウンに出る「休み系」）。休み・有休・代休は最初から使えて、お店ごとに追加もできます。 */
export const BUILTIN_OFF_TYPES = ["有休", "休み", "代休"] as const;
export const MAX_EXTRA_OFF_TYPES = 10;
export const RESERVED_SHIFT_WORDS = ["任意入力", "未入力", "none"];
let extraOffTypes: string[] = [];

export function setExtraOffTypes(values: string[]): string[] {
  extraOffTypes = [...new Set(values.map(value => value.trim()).filter(value => value && !(BUILTIN_OFF_TYPES as readonly string[]).includes(value) && !RESERVED_SHIFT_WORDS.includes(value)))].slice(0, MAX_EXTRA_OFF_TYPES);
  return extraOffTypes;
}
export const getExtraOffTypes = () => extraOffTypes;
/** プルダウンに並べる休み系（有休・休み・代休・追加分）。 */
export const allOffTypes = (): string[] => [...BUILTIN_OFF_TYPES, ...extraOffTypes];
/** 勤務がない日（休み・有休・代休・お店が追加した休み）かどうか。 */
export const isOffShift = (shift?: string | null): boolean => !!shift && allOffTypes().includes(shift);

/** 半休（有休0.5日）。勤務時間は別に持つので、有休の数え方も勤務時間の合計もそのまま使えます。 */
export const HALF_LEAVE_TYPES = ["午前有休", "午後有休"] as const;
export type HalfLeave = (typeof HALF_LEAVE_TYPES)[number];
export const isHalfLeave = (value?: string | null): value is HalfLeave => !!value && (HALF_LEAVE_TYPES as readonly string[]).includes(value);
/** 有休として数える日数（有休＝1日、半休つきの勤務＝0.5日）。 */
export const paidLeaveValue = (day?: { shift?: string; leave?: string } | null): number => !day ? 0 : day.shift === "有休" ? 1 : isHalfLeave(day.leave) && !!day.shift && !isOffShift(day.shift) ? 0.5 : 0;
/** 画面に出す「午前有休 」のような前置き（半休がなければ空）。 */
export const leavePrefix = (day?: { leave?: string } | null): string => isHalfLeave(day?.leave) ? `${day!.leave} ` : "";
/** 日数の表示（1日、0.5日、1.5日）。 */
export const formatDays = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(1);
