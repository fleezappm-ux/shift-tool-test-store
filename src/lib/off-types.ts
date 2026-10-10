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
