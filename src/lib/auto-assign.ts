import { addDays, format } from "date-fns";
import { Employee, LeaveRequest, PersonRule, SpecialDayRule, StaffingRules } from "../types";
import { findSpecialDayRule } from "./special-day-utils";
import { isWorkingShift } from "./staffing-check";
import { formatMinutes, parseShiftRange, toMinutes, uncoveredGaps } from "./shift-time";
import { PersonProfile, ShiftKind, inferProfiles, kindOf, storeMedianStart } from "./shift-profile";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export interface AssignChange { employeeId: string; date: string; shift: string; reason: string; replacesRest?: boolean }
export interface AssignUnresolved { date: string; label: string; message: string }
export interface PersonStat { id: string; name: string; days: number; weekendDays: number; early: number; late: number }
export interface AssignResult {
  changes: AssignChange[];
  unresolved: AssignUnresolved[];
  /** 全員の出勤日数など（案を入れたあとの数）。不公平に見えないかの確認用 */
  stats: PersonStat[];
  /** 何も決まっていないとき（最低人数が未設定など）の案内 */
  notice?: string;
}

export interface AssignInput {
  dates: Date[];
  employees: Employee[];
  rules: StaffingRules;
  specialDayRules: SpecialDayRule[];
  leaveRequests: LeaveRequest[];
  roleNames: Record<string, string>;
  /** その人の「いつもの勤務」が分からないときに使う勤務時間 */
  defaultShift: string;
}

type Cell = "work" | "fixed-rest" | "free";
const AVOID_TYPES = ["有給希望", "休み希望", "午前休希望", "午後休希望"];
const ACTIVE_STATUS = ["申請中", "承認", "対応済み"];

/** 前の月までの実績から、人ごとの「いつもの働き方」を読み取る（質問の初期値にも使う）。 */
export function readProfiles(input: Pick<AssignInput, "dates" | "employees" | "specialDayRules">) {
  const weekendLike = (date: Date) => date.getDay() === 0 || date.getDay() === 6 || findSpecialDayRule(date, input.specialDayRules)?.id === "band-v3:holiday";
  return inferProfiles(input.employees, input.dates[0], weekendLike);
}

/**
 * ルールどおりにシフト案を作ります。流れ：
 *  ① 決まっているもの（出勤・有休・休み希望・お店の休み）はそのまま動かさない
 *  ② 前の月の並び（いつもの曜日・勤務時間）で、空いているマスを埋める
 *  ③ 人数・役職・営業時間のすき間を、足りない日から順に埋める（出勤が少ない人・土日が少ない人を優先）
 * 休み希望・入れない曜日・週の日数・連勤は、必ず守ります。守れないときは足りないまま理由を報告します。
 */
export function buildAutoAssign(input: AssignInput): AssignResult {
  const { dates, employees, rules, specialDayRules, leaveRequests, roleNames, defaultShift } = input;
  const keys = dates.map(d => format(d, "yyyy-MM-dd"));
  const inRange = new Set(keys);
  const dateOf = new Map(keys.map((k, i) => [k, dates[i]]));
  const nameOf = (e: Employee) => e.displayName || e.name;
  const label = (key: string) => { const d = dateOf.get(key)!; return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`; };
  const coverRoles = (rules.hours || []).some(Boolean) ? (rules.alwaysRoles || []) : [];
  const personRule = (id: string): PersonRule | undefined => rules.people[id];
  const hasPatternHint = Object.values(rules.people).some(p => p.weeklyDays || p.ngWeekdays.length);

  const needAny = rules.minTotal.some(n => n > 0) || rules.roleMins.some(r => r.min.some(n => n > 0)) || coverRoles.length > 0 || hasPatternHint;
  if (!needAny) return { changes: [], unresolved: [], stats: [], notice: "最低人数がまだ決まっていません。「設定 → シフトマスタ → 人数・連勤のチェック」で、曜日ごとの最低人数を決めてください。" };

  const weekendLike = (key: string) => { const d = dateOf.get(key)!; return d.getDay() === 0 || d.getDay() === 6 || findSpecialDayRule(d, specialDayRules)?.id === "band-v3:holiday"; };
  const profiles = readProfiles({ dates, employees, specialDayRules });
  const median = storeMedianStart(employees);

  // --- いまの状態 ---
  const state = new Map<string, Map<string, Cell>>();
  const blank = new Map<string, Set<string>>(); // まだ何も入っていないマス（「休み」と書かれたマスとは区別する）
  const reasonRest = new Map<string, Map<string, string>>();
  const requestedWork = new Map<string, Map<string, string>>();
  employees.forEach(emp => {
    const cells = new Map<string, Cell>(); const why = new Map<string, string>(); const empty = new Set<string>();
    keys.forEach(key => {
      const s = emp.shifts?.find(item => item.date.startsWith(key))?.shift;
      if (isWorkingShift(s)) cells.set(key, "work");
      else if (s === "有休") { cells.set(key, "fixed-rest"); why.set(key, "有休"); }
      else { cells.set(key, "free"); if (!s) empty.add(key); }
    });
    state.set(emp.id, cells); blank.set(emp.id, empty); reasonRest.set(emp.id, why); requestedWork.set(emp.id, new Map());
  });
  const matches = (req: LeaveRequest, emp: Employee) => req.employeeId ? req.employeeId === emp.id : (req.employeeName === (emp.displayName || emp.name) || req.employeeName === emp.name);
  leaveRequests.filter(r => ACTIVE_STATUS.includes(r.status) && inRange.has(r.date)).forEach(req => {
    const emp = employees.find(e => matches(req, e)); if (!emp) return;
    const cell = state.get(emp.id)!;
    if (AVOID_TYPES.includes(req.type) && cell.get(req.date) === "free") { cell.set(req.date, "fixed-rest"); reasonRest.get(emp.id)!.set(req.date, req.type === "有給希望" ? "有給希望" : "休み希望"); }
    if (req.type === "出勤希望" && cell.get(req.date) === "free" && req.status !== "申請中") {
      const time = req.desiredWorkStart && req.desiredWorkEnd ? `${req.desiredWorkStart}～${req.desiredWorkEnd}` : "";
      requestedWork.get(emp.id)!.set(req.date, time);
    }
  });

  // 閉める日（祝日・全員お休み）は触らない
  const closed = new Set(keys.filter(key => { const r = findSpecialDayRule(dateOf.get(key)!, specialDayRules); return !!r && (r.id === "band-v3:holiday" || r.restMode === "all"); }));
  const personalRest = (emp: Employee, key: string) => {
    const r = findSpecialDayRule(dateOf.get(key)!, specialDayRules);
    return r?.restMode === "selected" && (r.restEmployeeIds || []).includes(emp.id);
  };
  employees.forEach(emp => keys.forEach(key => { if (personalRest(emp, key) && state.get(emp.id)!.get(key) === "free") { state.get(emp.id)!.set(key, "fixed-rest"); reasonRest.get(emp.id)!.set(key, "お店の決めた休み"); } }));

  // --- 勤務時間の選び方 ---
  const shiftList = (emp: Employee): { text: string; share: number; kind: ShiftKind }[] => {
    const p = profiles[emp.id];
    if (p?.shifts.length) return p.shifts;
    const counts = new Map<string, number>();
    (emp.shifts || []).forEach(s => { if (isWorkingShift(s.shift) && s.shift !== "任意入力") counts.set(s.shift, (counts.get(s.shift) || 0) + 1); });
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    if (!total) return [{ text: defaultShift, share: 1, kind: kindOf(defaultShift, median) }];
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([text, count]) => ({ text, share: count / total, kind: kindOf(text, median) }));
  };
  const usualShift = (emp: Employee) => shiftList(emp)[0].text;

  const assigned = new Map<string, string>();
  const textAt = (emp: Employee, key: string): string => assigned.get(`${emp.id}|${key}`) ?? (() => { const s = emp.shifts?.find(item => item.date.startsWith(key)); return s ? (s.shift === "任意入力" ? (s.customShiftText || "") : s.shift) : ""; })();
  const working = (emp: Employee, key: string) => inRange.has(key)
    ? state.get(emp.id)!.get(key) === "work"
    : isWorkingShift(emp.shifts?.find(item => item.date.startsWith(key))?.shift);
  const rel = (key: string, n: number) => format(addDays(new Date(`${key}T00:00:00`), n), "yyyy-MM-dd");
  const weekStartOf = (key: string) => rel(key, -dateOf.get(key)!.getDay());
  const weekWork = (emp: Employee, key: string) => { const start = weekStartOf(key); let n = 0; for (let i = 0; i < 7; i++) if (working(emp, rel(start, i))) n++; return n; };
  const weeklyCapOf = (id: string) => { const p = personRule(id); if (!p) return 0; return [p.maxPerWeek, p.weeklyDays || 0].filter(n => n > 0).reduce((a, b) => Math.min(a, b), 99) % 99; };

  /** 入れない理由。入れるなら ""。 */
  const blocker = (emp: Employee, key: string): string => {
    const cell = state.get(emp.id)!.get(key);
    if (cell === "work") return "すでに出勤";
    if (cell === "fixed-rest") return reasonRest.get(emp.id)!.get(key) || "休み";
    const person = personRule(emp.id);
    const date = dateOf.get(key)!;
    if (person?.ngWeekdays.includes(date.getDay())) return `毎週${WEEK[date.getDay()]}曜は休み`;
    const cap = weeklyCapOf(emp.id);
    if (cap > 0 && weekWork(emp, key) + 1 > cap) return `週${cap}日までの設定`;
    if (rules.maxConsecutive > 0) {
      let run = 1;
      for (let i = 1; i <= rules.maxConsecutive; i++) { if (working(emp, rel(key, -i))) run++; else break; }
      for (let i = 1; i <= rules.maxConsecutive; i++) { if (working(emp, rel(key, i))) run++; else break; }
      if (run > rules.maxConsecutive) return `${rules.maxConsecutive}連勤までの設定`;
    }
    return "";
  };

  const changes: AssignChange[] = [];
  const kindCount = (key: string) => { const c: Record<ShiftKind, number> = { early: 0, mid: 0, late: 0 }; employees.forEach(e => { if (state.get(e.id)!.get(key) === "work") { const t = textAt(e, key); if (t) c[kindOf(t, median)]++; } }); return c; };
  const periodKind = (emp: Employee, kind: ShiftKind) => keys.filter(k => state.get(emp.id)!.get(k) === "work" && kindOf(textAt(emp, k), median) === kind).length;
  /** その日・その人に合う勤務時間を選ぶ：希望（早番/遅番）→ その日に足りない種類 → いつもの割合に近づける */
  const MIN_REST = 11 * 60;
  const rangeOf = (text: string) => parseShiftRange({ date: "", shift: text, breakTime: "", workTime: "", comment: "" });
  /** 前の日の終わり／次の日の始まりとの間が11時間以上あくか（遅番の翌日に早番を入れない）。読めないときは問題なし */
  const restOk = (emp: Employee, key: string, text: string) => {
    const me = rangeOf(text); if (!me) return true;
    const prev = working(emp, rel(key, -1)) ? rangeOf(textAt(emp, rel(key, -1))) : null;
    const next = working(emp, rel(key, 1)) ? rangeOf(textAt(emp, rel(key, 1))) : null;
    if (prev && me[0] + 1440 - prev[1] < MIN_REST) return false;
    if (next && next[0] + 1440 - me[1] < MIN_REST) return false;
    return true;
  };
  const pickShift = (emp: Employee, key: string): string => {
    const list = shiftList(emp);
    if (list.length === 1) return list[0].text;
    const pref = personRule(emp.id)?.shiftPref;
    let pool = list;
    if (pref === "early" || pref === "late") { const only = list.filter(s => s.kind === pref); if (only.length) pool = only; }
    const rested = pool.filter(s => restOk(emp, key, s.text));
    if (rested.length) pool = rested;
    else { const any = list.filter(s => restOk(emp, key, s.text)); if (any.length) pool = any; }
    if (pool.length === 1) return pool[0].text;
    const day = kindCount(key);
    const score = (s: { text: string; share: number; kind: ShiftKind }) => day[s.kind] * 10 + (periodKind(emp, s.kind) + 1) / Math.max(s.share, 0.05);
    return [...pool].sort((a, b) => score(a) - score(b))[0].text;
  };
  const assign = (emp: Employee, key: string, shift: string, reason: string) => {
    const replacesRest = !blank.get(emp.id)!.has(key) && state.get(emp.id)!.get(key) === "free" && emp.shifts?.some(s => s.date.startsWith(key) && s.shift === "休み");
    state.get(emp.id)!.set(key, "work");
    assigned.set(`${emp.id}|${key}`, shift);
    changes.push({ employeeId: emp.id, date: key, shift, reason, ...(replacesRest ? { replacesRest: true } : {}) });
  };
  const load = (emp: Employee) => keys.filter(k => state.get(emp.id)!.get(k) === "work").length;
  const weekendLoad = (emp: Employee) => keys.filter(k => weekendLike(k) && state.get(emp.id)!.get(k) === "work").length + (profiles[emp.id]?.weekendWorked || 0) / 8;

  /** 営業時間内のすき間（時間が読めない勤務があれば判定しない） */
  const coverGaps = (roleId: string, key: string): [number, number][] => {
    const hours = rules.hours?.[dateOf.get(key)!.getDay()];
    if (!hours) return [];
    const ranges: [number, number][] = [];
    for (const emp of employees.filter(e => e.roleId === roleId && state.get(e.id)!.get(key) === "work")) {
      const range = parseShiftRange({ date: key, shift: textAt(emp, key), breakTime: "", workTime: "", comment: "" });
      if (!range) return [];
      ranges.push(range);
    }
    return uncoveredGaps(toMinutes(hours.open), toMinutes(hours.close), ranges);
  };
  const coverShift = (emp: Employee, gap: [number, number]) => {
    const fits = shiftList(emp).find(s => { const r = parseShiftRange({ date: "", shift: s.text, breakTime: "", workTime: "", comment: "" }); return !!r && r[0] <= gap[0] && r[1] >= gap[1]; });
    return fits ? fits.text : `${formatMinutes(gap[0])}～${formatMinutes(gap[1])}`;
  };

  // ① 出勤希望（承認ずみ）は、そのとおり入れる
  employees.forEach(emp => requestedWork.get(emp.id)!.forEach((time, key) => { if (!closed.has(key)) assign(emp, key, time || usualShift(emp), "出勤希望（承認ずみ）"); }));

  // ② 前の月の並び（いつもの曜日・勤務時間）で、空いているマスを埋める
  const weeks: string[][] = [];
  { const byStart = new Map<string, string[]>(); keys.forEach(key => { const w = weekStartOf(key); byStart.set(w, [...(byStart.get(w) || []), key]); }); weeks.push(...byStart.values()); }
  employees.forEach(emp => {
    const p = profiles[emp.id]; const rule = personRule(emp.id);
    const target = rule?.weeklyDays || (p ? p.weeklyDays : 0);
    const off = new Set(rule?.ngWeekdays || []);
    let order: number[];
    if (p) order = p.usualWeekdays.filter(d => !off.has(d));
    else if (rule?.weeklyDays) order = [1, 2, 3, 4, 5, 6, 0].filter(d => !off.has(d));
    else return;
    if (!order.length || !target) return;
    weeks.forEach(week => {
      const days = week.filter(k => !closed.has(k) && blank.get(emp.id)!.has(k)).sort((a, b) => order.indexOf(dateOf.get(a)!.getDay()) - order.indexOf(dateOf.get(b)!.getDay()));
      for (const key of days) {
        if (weekWork(emp, key) >= target) break;
        if (!order.includes(dateOf.get(key)!.getDay())) continue;
        if (blocker(emp, key)) continue;
        assign(emp, key, pickShift(emp, key), p ? "前の月と同じ曜日" : "決めた勤務日");
      }
    });
  });

  // ③ 足りない分を、「候補が少ない日」から埋める
  type Demand = { key: string; roleId?: string; cover?: [number, number]; candidates: Employee[] };
  const stuck = new Set<string>();
  for (let guard = 0; guard < 4000; guard++) {
    const demands: Demand[] = [];
    keys.forEach(key => {
      if (closed.has(key)) return;
      const wd = dateOf.get(key)!.getDay();
      const on = employees.filter(e => state.get(e.id)!.get(key) === "work");
      rules.roleMins.forEach(rule => {
        const need = rule.min[wd] || 0;
        if (need > on.filter(e => e.roleId === rule.roleId).length && !stuck.has(`${key}|${rule.roleId}`))
          demands.push({ key, roleId: rule.roleId, candidates: employees.filter(e => e.roleId === rule.roleId && !blocker(e, key)) });
      });
      coverRoles.forEach(roleId => {
        const gap = coverGaps(roleId, key)[0];
        if (gap && !stuck.has(`${key}|cover|${roleId}`)) demands.push({ key, roleId, cover: gap, candidates: employees.filter(e => e.roleId === roleId && !blocker(e, key)) });
      });
      const total = rules.minTotal[wd] || 0;
      if (total > on.length && !stuck.has(`${key}|*`)) demands.push({ key, candidates: employees.filter(e => !blocker(e, key)) });
    });
    if (!demands.length) break;
    demands.sort((a, b) => a.candidates.length - b.candidates.length || (a.roleId ? 0 : 1) - (b.roleId ? 0 : 1) || a.key.localeCompare(b.key));
    const next = demands[0];
    if (!next.candidates.length) { stuck.add(next.cover ? `${next.key}|cover|${next.roleId}` : `${next.key}|${next.roleId || "*"}`); continue; }
    const weekend = weekendLike(next.key);
    const pick = [...next.candidates].sort((a, b) => (weekend ? weekendLoad(a) - weekendLoad(b) : 0) || load(a) - load(b) || employees.indexOf(a) - employees.indexOf(b))[0];
    const shift = next.cover ? coverShift(pick, next.cover) : pickShift(pick, next.key);
    const reason = next.cover ? `${roleNames[next.roleId!] || "この役職"}の抜ける時間をなくすため` : next.roleId ? `${roleNames[next.roleId] || "この役職"}の人数が足りないため` : "人数が足りないため";
    assign(pick, next.key, shift, weekend ? `${reason}（土日祝は出勤が少ない人から）` : `${reason}（出勤が少ない人から）`);
  }

  // ④ 埋められなかった所の理由
  const unresolved: AssignUnresolved[] = [];
  keys.forEach(key => {
    if (closed.has(key)) return;
    const wd = dateOf.get(key)!.getDay();
    const on = employees.filter(e => state.get(e.id)!.get(key) === "work");
    const why = (pool: Employee[]) => pool.filter(e => state.get(e.id)!.get(key) !== "work").map(e => `${nameOf(e)}さん：${blocker(e, key)}`).join("、") || "入れる人がいません";
    rules.roleMins.forEach(rule => {
      const need = rule.min[wd] || 0; const have = on.filter(e => e.roleId === rule.roleId).length;
      if (need > have) unresolved.push({ date: key, label: label(key), message: `${roleNames[rule.roleId] || "この役職"}があと${need - have}人足りません（${why(employees.filter(e => e.roleId === rule.roleId))}）` });
    });
    coverRoles.forEach(roleId => coverGaps(roleId, key).forEach(([from, to]) => unresolved.push({ date: key, label: label(key), message: `${roleNames[roleId] || "この役職"}が ${formatMinutes(from)}〜${formatMinutes(to)} にいません（${why(employees.filter(e => e.roleId === roleId))}）` })));
    const total = rules.minTotal[wd] || 0;
    if (total > on.length) unresolved.push({ date: key, label: label(key), message: `出勤があと${total - on.length}人足りません（${why(employees)}）` });
  });

  const stats: PersonStat[] = employees.map(emp => ({
    id: emp.id, name: nameOf(emp), days: load(emp),
    weekendDays: keys.filter(k => weekendLike(k) && state.get(emp.id)!.get(k) === "work").length,
    early: periodKind(emp, "early"), late: periodKind(emp, "late")
  }));
  changes.sort((a, b) => a.date.localeCompare(b.date) || a.employeeId.localeCompare(b.employeeId));
  return { changes, unresolved, stats, notice: changes.length === 0 && unresolved.length === 0 ? "足りない日はありません。このままで基準を満たしています。" : undefined };
}
