import { StaffingRules } from "../types";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
// 月・火・水…の並び（月はじまり）で、同じ人数の曜日をまとめて「月〜金」のように書く
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function daysText(days: number[]): string {
  const sorted = ORDER.filter(d => days.includes(d));
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && ORDER.indexOf(sorted[j + 1]) === ORDER.indexOf(sorted[j]) + 1) j++;
    parts.push(j - i >= 2 ? `${WEEK[sorted[i]]}〜${WEEK[sorted[j]]}` : sorted.slice(i, j + 1).map(d => WEEK[d]).join("・"));
    i = j + 1;
  }
  return parts.join("・");
}

/** 曜日ごとの人数を、「月〜金は3人、土は2人」のように読める文にする。0人の曜日は触れない。 */
export function perDayText(values: number[], unit = "人"): string {
  const byValue = new Map<number, number[]>();
  ORDER.forEach(d => { const n = values[d] || 0; if (n > 0) byValue.set(n, [...(byValue.get(n) || []), d]); });
  return [...byValue.entries()].map(([n, days]) => `${daysText(days)}は${n}${unit}`).join("、");
}

export function describeRules(opts: { rules: StaffingRules; roleNames: Record<string, string>; personNames: Record<string, string>; leaveCount: number }): string[] {
  const { rules, roleNames, personNames, leaveCount } = opts;
  const lines: string[] = [];
  const total = perDayText(rules.minTotal);
  lines.push(total ? `出勤は、${total.replace(/は(\d+)人/g, "は最低$1人")}にします。` : "最低人数は決まっていません。");
  const closed = ORDER.filter(d => !(rules.minTotal[d] > 0));
  if (total && closed.length) lines.push(`${daysText(closed)}は人数を決めていません（お休み、または今のままです）。`);
  rules.roleMins.forEach(item => {
    const text = perDayText(item.min);
    if (text) lines.push(`${roleNames[item.roleId] || "この役職"}は、${text.replace(/は(\d+)人/g, "に最低$1人")}必ず入れます。`);
  });
  const always = (rules.alwaysRoles || []).map(id => roleNames[id]).filter(Boolean);
  const hourGroups = new Map<string, number[]>();
  ORDER.forEach(d => { const h = rules.hours?.[d]; if (h) hourGroups.set(`${h.open}〜${h.close}`, [...(hourGroups.get(`${h.open}〜${h.close}`) || []), d]); });
  if (always.length && hourGroups.size) lines.push(`営業時間（${[...hourGroups.entries()].map(([t, days]) => `${daysText(days)} ${t}`).join("、")}）のあいだ、${always.join("・")}がいつもいるようにします。`);
  lines.push(rules.maxConsecutive > 0 ? `続けて出勤するのは最大${rules.maxConsecutive}日までにします。` : "連勤の制限はありません。");
  Object.entries(rules.people).forEach(([id, p]) => {
    const parts = [] as string[];
    if (p.weeklyDays) parts.push(`週${p.weeklyDays}日勤務`);
    if (p.ngWeekdays.length) parts.push(`毎週${daysText(p.ngWeekdays)}曜は休み`);
    if (p.maxPerWeek > 0 && p.maxPerWeek !== p.weeklyDays) parts.push(`週${p.maxPerWeek}日まで`);
    if (p.shiftPref === "early") parts.push("早番がいい");
    if (p.shiftPref === "late") parts.push("遅番がいい");
    if (parts.length) lines.push(`${personNames[id] || "（退職した人）"}さんは、${parts.join("・")}。`);
  });
  lines.push("遅番の翌日に早番を入れないよう、前の勤務から11時間はあけます。");
  lines.push(leaveCount > 0 ? `休み希望・有給希望（${leaveCount}件）は、必ず守ります。` : "この期間の休み希望はありません。");
  lines.push("今入っている勤務・有休は変えません。足りない日にだけ、出勤が少ない人から順に入れます。");
  return lines;
}
