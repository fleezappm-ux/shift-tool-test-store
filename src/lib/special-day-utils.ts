import { format } from "date-fns";
import { getJapaneseHolidayDates } from "./japanese-holidays";
import { GlobalRemark, SpecialDayRule } from "../types";

const weekdayRuleId = (day: number) => `band-v3:closed-${day}`;
export const DEFAULT_SPECIAL_DAY_RULES: SpecialDayRule[] = [
  { id: weekdayRuleId(0), name: "日曜", color: "red", behavior: "information", enabled: true, mode: "recurring", weekday: 0, weeks: [1, 2, 3, 4, 5], dates: [], order: 0 },
  { id: "band-v3:holiday", name: "祝日", color: "red", behavior: "information", enabled: true, mode: "annual", weekday: 0, weeks: [], dates: [], order: 1 }
];

/** Older duplicate-specific presets are intentionally discarded. New rules use the v3 prefix. */
export function withDefaultSpecialDayRules(rules: SpecialDayRule[]): SpecialDayRule[] {
  const current = rules.filter(rule => rule.id.startsWith("band-v3:"));
  return current.map((rule, order) => ({ ...rule, order }));
}

export function businessDaysFromRules(rules: SpecialDayRule[]): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter(day => !rules.some(rule => rule.id === weekdayRuleId(day) && rule.enabled));
}

export function withBusinessDays(rules: SpecialDayRule[], businessDays: number[]): SpecialDayRule[] {
  const days = new Set(businessDays);
  const others = rules.filter(rule => !/^band-v3:closed-[0-6]$/.test(rule.id));
  const weekly = [0, 1, 2, 3, 4, 5, 6].filter(day => !days.has(day)).map(day => {
    const existing = rules.find(rule => rule.id === weekdayRuleId(day));
    const shared = rules.find(rule => rule.id === "band-v3:holiday") || rules.find(rule => /^band-v3:closed-[0-6]$/.test(rule.id));
    return existing ? { ...existing, enabled: true } : {
      id: weekdayRuleId(day), name: shared?.name || "定休日", color: shared?.color || "red" as const,
      behavior: "information" as const, enabled: true, mode: "recurring" as const,
      weekday: day, weeks: [1, 2, 3, 4, 5], dates: [], showName: shared?.showName, restMode: shared?.restMode, restEmployeeIds: shared?.restEmployeeIds
    };
  });
  return [...weekly, ...others];
}

export function matchesSpecialDayRule(date: Date, rule: SpecialDayRule): boolean {
  if (!rule.enabled) return false;
  const key = format(date, "yyyy-MM-dd");
  if (rule.id === "band-v3:holiday") return getJapaneseHolidayDates(date, date).includes(key);
  if (rule.mode === "annual") return rule.dates.includes(key);
  if (rule.mode === "monthly") return (rule.monthDates || []).includes(date.getDate());
  if (rule.mode === "yearly") return (rule.monthDays || []).includes(format(date, "MM-dd"));
  const week = Math.ceil(date.getDate() / 7);
  return date.getDay() === rule.weekday && rule.weeks.includes(week);
}

/** Date exceptions win over holidays, which win over repeating closures. */
function priority(rule: SpecialDayRule): number {
  if (rule.id === "band-v3:holiday") return 2;
  if (rule.mode === "annual" || rule.mode === "yearly" || rule.mode === "monthly") return 3;
  if (rule.mode === "recurring" && rule.weeks.length < 5) return 1;
  return 0;
}

export function findSpecialDayRule(date: Date, rules: SpecialDayRule[]) {
  return rules.filter(rule => rule.id.startsWith("band-v3:") && matchesSpecialDayRule(date, rule))
    .sort((a, b) => priority(b) - priority(a) || (a.order ?? 0) - (b.order ?? 0))[0];
}

/** Band color does not decide attendance. Only this explicit per-rule choice does. */
export function shouldRestOnDate(date: Date, employeeId: string, rules: SpecialDayRule[]): boolean {
  const rule = findSpecialDayRule(date, rules);
  return rule?.restMode === "all" || (rule?.restMode === "selected" && (rule.restEmployeeIds || []).includes(employeeId));
}

export function buildDisplayRemarks(_manualRemarks: GlobalRemark[], rules: SpecialDayRule[], dates: Date[]): GlobalRemark[] {
  return dates.flatMap(date => {
    const rule = findSpecialDayRule(date, rules);
    if (!rule) return [];
    return [{ date: format(date, "yyyy-MM-dd"), type: rule.showName === false ? "" : rule.name, text: "", color: rule.color, source: "rule" as const }];
  });
}

export function colorForRemark(remark: GlobalRemark | undefined, _rules: SpecialDayRule[]) {
  return remark?.color;
}
