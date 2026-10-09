import { format } from "date-fns";
import { Employee, SpecialDayRule, StaffingRules } from "../types";
import { findSpecialDayRule } from "./special-day-utils";
import { formatMinutes, parseShiftRange, toMinutes, uncoveredGaps } from "./shift-time";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
export const isWorkingShift = (shift?: string) => !!shift && shift !== "休み" && shift !== "有休" && shift !== "none";

export interface StaffingWarnings {
  /** 日付ごとの警告（人数不足など） */
  byDate: Record<string, string[]>;
  /** 「従業員ID|日付」ごとの警告（連勤・NG曜日・週の上限） */
  byCell: Record<string, string[]>;
  /** 画面の上に出す一覧 */
  list: string[];
}

export function hasAnyStaffingRule(rules: StaffingRules) {
  return rules.minTotal.some(n => n > 0) || rules.roleMins.some(r => r.min.some(n => n > 0)) || rules.maxConsecutive > 0 || Object.keys(rules.people).length > 0 || ((rules.alwaysRoles || []).length > 0 && (rules.hours || []).some(Boolean));
}

/**
 * 表示中の期間のシフトを、設定した基準と照らし合わせます。
 * 祝日・「全員お休み」にした日は人数チェックから外します（営業しない日なので）。
 */
export function checkStaffing(opts: { dates: Date[]; employees: Employee[]; rules: StaffingRules; roleNames: Record<string, string>; specialDayRules: SpecialDayRule[] }): StaffingWarnings {
  const { dates, employees, rules, roleNames, specialDayRules } = opts;
  const out: StaffingWarnings = { byDate: {}, byCell: {}, list: [] };
  const addDate = (date: string, msg: string) => { (out.byDate[date] ||= []).push(msg); };
  const addCell = (id: string, date: string, msg: string) => { (out.byCell[`${id}|${date}`] ||= []).push(msg); };
  const keys = dates.map(d => format(d, "yyyy-MM-dd"));
  const workOn = (emp: Employee, key: string) => isWorkingShift(emp.shifts?.find(s => s.date.startsWith(key))?.shift);
  const label = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
  const nameOf = (emp: Employee) => emp.displayName || emp.name;

  dates.forEach((date, i) => {
    const key = keys[i];
    const special = findSpecialDayRule(date, specialDayRules);
    if (special && (special.id === "band-v3:holiday" || special.restMode === "all")) return;
    const wd = date.getDay();
    const working = employees.filter(emp => workOn(emp, key));
    const total = rules.minTotal[wd] || 0;
    if (total > 0 && working.length < total) {
      const msg = `出勤が${working.length}人（必要${total}人）`;
      addDate(key, msg); out.list.push(`${label(date)} ${msg}`);
    }
    const hours = rules.hours?.[wd];
    if (hours && (rules.alwaysRoles || []).length) {
      (rules.alwaysRoles || []).forEach(roleId => {
        const same = working.filter(emp => emp.roleId === roleId);
        const ranges = same.map(emp => parseShiftRange(emp.shifts?.find(s => s.date.startsWith(key))));
        if (ranges.some(range => !range)) return; // 時間が読めない勤務がある日は、判定しない（誤報を避ける）
        uncoveredGaps(toMinutes(hours.open), toMinutes(hours.close), ranges as [number, number][]).forEach(([from, to]) => {
          const msg = `${roleNames[roleId] || "この役職"}が ${formatMinutes(from)}〜${formatMinutes(to)} にいません`;
          addDate(key, msg); out.list.push(`${label(date)} ${msg}`);
        });
      });
    }
    rules.roleMins.forEach(rule => {
      const need = rule.min[wd] || 0;
      if (need <= 0) return;
      const have = working.filter(emp => emp.roleId === rule.roleId).length;
      if (have < need) {
        const role = roleNames[rule.roleId] || "この役職";
        const msg = `${role}が${have}人（必要${need}人）`;
        addDate(key, msg); out.list.push(`${label(date)} ${msg}`);
      }
    });
  });

  employees.forEach(emp => {
    const person = rules.people[emp.id];
    // 連勤：期間の外に続いている分も数えるため、その人の全シフトを日付順に見る
    if (rules.maxConsecutive > 0) {
      const all = [...(emp.shifts || [])].sort((a, b) => a.date.localeCompare(b.date));
      let run: string[] = [];
      const flush = () => {
        if (run.length > rules.maxConsecutive) {
          const inRange = run.filter(d => keys.includes(d.slice(0, 10)));
          inRange.forEach(d => addCell(emp.id, d.slice(0, 10), `${run.length}連勤（上限${rules.maxConsecutive}日）`));
          if (inRange.length) out.list.push(`${nameOf(emp)}さん ${run.length}連勤（${run[0].slice(5, 10).replace("-", "/")}〜${run[run.length - 1].slice(5, 10).replace("-", "/")}）`);
        }
        run = [];
      };
      let prev = "";
      all.forEach(s => {
        const day = s.date.slice(0, 10);
        const contiguous = prev && Math.round((new Date(day).getTime() - new Date(prev).getTime()) / 86400000) === 1;
        if (isWorkingShift(s.shift) && (run.length === 0 || contiguous)) run.push(day);
        else { flush(); if (isWorkingShift(s.shift)) run.push(day); }
        prev = day;
      });
      flush();
    }
    if (!person) return;
    dates.forEach((date, i) => {
      if (person.ngWeekdays.includes(date.getDay()) && workOn(emp, keys[i])) {
        addCell(emp.id, keys[i], `${WEEK[date.getDay()]}曜は入れない設定です`);
        out.list.push(`${nameOf(emp)}さん ${label(date)} 入れない曜日に出勤`);
      }
    });
    const weeklyCap = [person.maxPerWeek, person.weeklyDays || 0].filter(n => n > 0).reduce((a, b) => Math.min(a, b), 99);
    if (weeklyCap < 99) {
      // 週は日曜はじまりで数える
      const weeks = new Map<string, number[]>();
      dates.forEach((date, i) => {
        const start = new Date(date); start.setDate(date.getDate() - date.getDay());
        const wk = format(start, "yyyy-MM-dd");
        if (!weeks.has(wk)) weeks.set(wk, []);
        weeks.get(wk)!.push(i);
      });
      weeks.forEach(indexes => {
        const worked = indexes.filter(i => workOn(emp, keys[i]));
        if (worked.length > weeklyCap) {
          worked.forEach(i => addCell(emp.id, keys[i], `週${weeklyCap}日までの設定です`));
          out.list.push(`${nameOf(emp)}さん ${label(dates[indexes[0]])}の週に${worked.length}日出勤（上限${weeklyCap}日）`);
        }
      });
    }
  });
  return out;
}
