import assert from "node:assert/strict";
import { checkStaffing, hasAnyStaffingRule } from "../src/lib/staffing-check";
import { StaffingRules, Employee } from "../src/types";

const day = (n: number) => new Date(2026, 9, n); // 2026-10-n（10/1は木曜）
const mk = (id: string, roleId: string, works: number[]): Employee => ({ id, name: id, roleId, shifts: Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, shift: works.includes(i + 1) ? "9:00～18:00" : "休み", breakTime: "", workTime: "", comment: "" })) });
const dates = Array.from({ length: 14 }, (_, i) => day(i + 1));
const base: StaffingRules = { minTotal: [0, 0, 0, 0, 0, 0, 0], roleMins: [], maxConsecutive: 0, people: {} };
const emps = [mk("a", "ph", [1, 2, 3, 4, 5, 6, 7]), mk("b", "st", [1, 2])];
const run = (rules: StaffingRules, specialDayRules: never[] = []) => checkStaffing({ dates, employees: emps, rules, roleNames: { ph: "薬剤師", st: "事務" }, specialDayRules });

assert.equal(hasAnyStaffingRule(base), false);
assert.equal(run(base).list.length, 0, "設定なしなら警告ゼロ");
// 木曜(4)は最低2人。10/1(木)は2人でOK、10/8(木)は0人で不足
let w = run({ ...base, minTotal: [0, 0, 0, 0, 2, 0, 0] });
assert.deepEqual(Object.keys(w.byDate), ["2026-10-08"]);
// 薬剤師を月曜(1)に1人以上：10/5(月)はaが出勤でOK、10/12(月)は不足
w = run({ ...base, roleMins: [{ roleId: "ph", min: [0, 1, 0, 0, 0, 0, 0] }] });
assert.deepEqual(Object.keys(w.byDate), ["2026-10-12"]);
assert.match(w.byDate["2026-10-12"][0], /薬剤師が0人/);
// 連勤：aは7連勤。上限5で警告、10/1〜10/7の7マス
w = run({ ...base, maxConsecutive: 5 });
assert.equal(Object.keys(w.byCell).length, 7);
assert.equal(run({ ...base, maxConsecutive: 7 }).list.length, 0, "ちょうど上限は警告しない");
// 個人：bは週の最大1日（2日出勤で警告）、aは土曜に入れない（10/3は土）
w = run({ ...base, people: { b: { maxPerWeek: 1, ngWeekdays: [] }, a: { maxPerWeek: 0, ngWeekdays: [6] } } });
assert.ok(w.byCell["b|2026-10-01"] && w.byCell["b|2026-10-02"]);
assert.ok(w.byCell["a|2026-10-03"]);
// 「全員お休み」の日は人数チェックしない
const rest = [{ id: "band-v3:x", name: "棚卸", color: "gray", behavior: "information", enabled: true, mode: "annual", weekday: 0, weeks: [], dates: ["2026-10-08"], restMode: "all" }] as never[];
assert.equal(Object.keys(run({ ...base, minTotal: [0, 0, 0, 0, 2, 0, 0] }, rest).byDate).length, 0);
console.log("staffing-check ok");
