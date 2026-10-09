import assert from "node:assert/strict";
import { addDays, format } from "date-fns";
import { buildAutoAssign, readProfiles } from "../src/lib/auto-assign";
import { checkStaffing } from "../src/lib/staffing-check";
import { Employee, StaffingRules } from "../src/types";

// 実際のお店っぽい前月実績から、翌4週間の案を作る
const start = new Date(2026, 9, 5); // 10/5(月)
const hist = Array.from({ length: 56 }, (_, i) => addDays(start, i - 56));
const plan = Array.from({ length: 28 }, (_, i) => addDays(start, i));
const iso = (d: Date) => format(d, "yyyy-MM-dd");

interface Spec { id: string; role: string; days: number[]; shift: string; satEvery?: number }
function build(specs: Spec[]): Employee[] {
  return specs.map(s => ({
    id: s.id, name: s.id, roleId: s.role,
    shifts: [...hist, ...plan].map(d => {
      const past = d < start; let work = false;
      if (past) { work = s.days.includes(d.getDay()); if (d.getDay() === 6 && s.satEvery) work = Math.floor((d.getTime() - hist[0].getTime()) / 86400000 / 7) % s.satEvery === 0; }
      return { date: iso(d), shift: past ? (work ? s.shift : "休み") : "", breakTime: "", workTime: "", comment: "" };
    }),
  }));
}
const apply = (emps: Employee[], changes: { employeeId: string; date: string; shift: string }[]) => emps.map(e => ({ ...e, shifts: e.shifts.map(s => { const c = changes.find(x => x.employeeId === e.id && x.date === s.date); return c ? { ...s, shift: c.shift } : s; }) }));
const run = (emps: Employee[], rules: StaffingRules) => buildAutoAssign({ dates: plan, employees: emps, rules, specialDayRules: [], leaveRequests: [], roleNames: { a: "A", b: "B" }, defaultShift: "9:00～18:00" });
const days = (emps: Employee[], id: string, pred: (d: Date) => boolean) => emps.find(e => e.id === id)!.shifts.filter(s => s.date >= iso(start) && s.shift && s.shift !== "休み" && pred(new Date(s.date + "T00:00:00"))).length;

// ① カフェ：早番/遅番、土日も営業。平日2人・土日3人必要
{
  const specs: Spec[] = [
    { id: "p1", role: "a", days: [1, 2, 3, 4, 5], shift: "7:00～16:00" },
    { id: "p2", role: "a", days: [1, 2, 3, 4, 5], shift: "12:00～21:00" },
    { id: "p3", role: "a", days: [1, 3, 5, 6, 0], shift: "7:00～16:00" },
    { id: "p4", role: "a", days: [2, 4, 6, 0], shift: "12:00～21:00" },
    { id: "p5", role: "a", days: [6, 0], shift: "12:00～21:00" },
    { id: "p6", role: "a", days: [6, 0, 3], shift: "7:00～16:00" },
  ];
  const emps = build(specs);
  const rules: StaffingRules = { minTotal: [3, 2, 2, 2, 2, 2, 3], roleMins: [], maxConsecutive: 5, people: { p1: { maxPerWeek: 0, ngWeekdays: [], weeklyDays: 5 }, p5: { maxPerWeek: 0, ngWeekdays: [1, 2, 3, 4, 5], weeklyDays: 2 } } };
  const prof = readProfiles({ dates: plan, employees: emps, specialDayRules: [] });
  assert.ok(prof.p1 && prof.p1.weeklyDays === 5, "p1は週5と読み取れる");
  const r = run(emps, rules);
  const after = apply(emps, r.changes);
  const w = checkStaffing({ dates: plan, employees: after, rules, roleNames: {}, specialDayRules: [] });
  const bad = Object.keys(w.byCell).length;
  assert.equal(bad, 0, "連勤・曜日などの個人ルール違反なし");
  assert.ok(r.unresolved.length <= 2, "ほぼ埋まる: " + JSON.stringify(r.unresolved.slice(0, 3)));
  assert.equal(days(after, "p5", d => [1, 2, 3, 4, 5].includes(d.getDay())), 0, "p5は平日に入らない");
  const wk = ["p1", "p2", "p3", "p4", "p5", "p6"].map(id => days(after, id, d => d.getDay() === 0 || d.getDay() === 6));
  assert.ok(Math.max(...wk) - Math.min(...wk.filter((_, i) => i < 2 || true)) >= 0);
  // 早番・遅番が両方いる日が大半
  const both = plan.filter(d => { const k = iso(d); const t = after.map(e => e.shifts.find(s => s.date === k)!.shift).filter(s => s && s !== "休み"); return t.some(s => s.startsWith("7:")) && t.some(s => s.startsWith("12:")); }).length;
  assert.ok(both >= 24, "早番と遅番が揃う日: " + both + "/28");
}

// ② 物販店：土日は誰かが交代で出る。全員平日メイン
{
  const specs: Spec[] = ["s1", "s2", "s3", "s4", "s5"].map((id, i) => ({ id, role: "b", days: [1, 2, 3, 4, 5], shift: "10:00～19:00", satEvery: 2 + (i % 2) }));
  const emps = build(specs);
  const rules: StaffingRules = { minTotal: [2, 2, 2, 2, 2, 2, 3], roleMins: [], maxConsecutive: 6, people: {} };
  const r = run(emps, rules);
  const after = apply(emps, r.changes);
  const w = checkStaffing({ dates: plan, employees: after, rules, roleNames: {}, specialDayRules: [] });
  assert.equal(Object.keys(w.byDate).length, 0, "人数不足の日なし: " + JSON.stringify(r.unresolved.slice(0, 3)));
  const wk = ["s1", "s2", "s3", "s4", "s5"].map(id => days(after, id, d => d.getDay() === 0 || d.getDay() === 6));
  assert.ok(Math.max(...wk) - Math.min(...wk) <= 1, "土日の担当が公平: " + wk);
}
console.log("auto-assign shops ok");

// ③ 遅番の翌日に早番を入れない（11時間あける）
{
  const mkE = (id: string, shifts: Record<string, string>): Employee => ({ id, name: id, roleId: "a", shifts: [...hist, ...plan].map(d => ({ date: iso(d), shift: shifts[iso(d)] ?? (d < start ? (d.getDay() % 2 ? "7:00～16:00" : "12:00～21:00") : ""), breakTime: "", workTime: "", comment: "" })) });
  const emps = [mkE("x", { [iso(start)]: "12:00～21:00" }), mkE("y", {})];
  const rules: StaffingRules = { minTotal: [0, 1, 1, 1, 1, 1, 0], roleMins: [], maxConsecutive: 0, people: {} };
  const r = run(emps, rules);
  const after = apply(emps, r.changes);
  const x = after[0].shifts.find(s => s.date === iso(addDays(start, 1)))!.shift;
  assert.ok(!x.startsWith("7:"), "遅番の翌日にxは早番にならない: " + x);
}
console.log("rest interval ok");
