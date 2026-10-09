// 従業員マスタとシフトの結びつけ：名前を付け替えても、別の人のシフトが混ざらないことの確認
import assert from "node:assert/strict";
import { mergeEmployeesWithMaster } from "../src/lib/employee-master-sync";
const m = (id: string, name: string, order: number, aliases: string[] = []) => ({ id, name, displayName: name, displayOrder: order, active: true, aliases, roleId: "", role: "" }) as any;
const emp = (id: string, name: string, dates: string[]) => ({ id, name, shifts: dates.map(date => ({ date, shift: id, breakTime: "", workTime: "", comment: "" })) }) as any;
// 名前が回ったマスタ（本道→藤川→金井→本道）でも、IDごとに自分のシフトだけが付く
const master = [m("a", "藤川", 1, ["本道"]), m("b", "金井", 2, ["藤川"]), m("c", "本道", 3, ["金井"])];
const source = [emp("a", "本道", ["2026-03-21"]), emp("b", "藤川", ["2026-03-21"]), emp("c", "金井", ["2026-03-21"])];
const out = mergeEmployeesWithMaster(source, master);
assert.deepEqual(out.map(e => [e.name, e.shifts.length, e.shifts[0].shift]), [["藤川", 1, "a"], ["金井", 1, "b"], ["本道", 1, "c"]]);
// IDがマスタに無い古い記録だけ、名前で引き継ぐ
const legacy = mergeEmployeesWithMaster([emp("zzz", "降旗", ["2026-03-21"])], [m("x", "降旗", 1)]);
assert.equal(legacy[0].shifts.length, 1);
// 同じ古い記録を2人に重ねて使わない
const twice = mergeEmployeesWithMaster([emp("zzz", "降旗", ["2026-03-21"])], [m("x", "降旗", 1), m("y", "降旗", 2)]);
assert.equal(twice.reduce((n, e) => n + e.shifts.length, 0), 1);
console.log("PASS: employee merge (ID first, no mixing after rename)");
