import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonRule, StaffingRules } from "../types";
import { SaveStatus } from "./SaveStatus";
import { useUnsavedGuard } from "../lib/unsaved";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const num = "h-10 w-14 rounded-lg border border-slate-300 bg-white px-2 text-center";

export function StaffingRulesSettings({ rules, employees, roles, saving, onSave }: { rules: StaffingRules; employees: { id: string; name: string; displayName?: string; active?: boolean }[]; roles: { id: string; name: string }[]; saving: boolean; onSave: (rules: StaffingRules) => Promise<void> }) {
  const [draft, setDraft] = useState<StaffingRules>(rules);
  useEffect(() => setDraft(rules), [rules]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);
  useUnsavedGuard("staffing-rules", dirty);
  const setDay = (list: number[], day: number, value: string) => { const next = [...list]; next[day] = Math.max(0, Math.min(99, Math.floor(Number(value) || 0))); return next; };
  const roleMin = (roleId: string) => draft.roleMins.find(item => item.roleId === roleId)?.min || [0, 0, 0, 0, 0, 0, 0];
  const setRoleDay = (roleId: string, day: number, value: string) => setDraft(d => ({ ...d, roleMins: [...d.roleMins.filter(item => item.roleId !== roleId), { roleId, min: setDay(roleMin(roleId), day, value) }] }));
  const person = (id: string): PersonRule => draft.people[id] || { maxPerWeek: 0, ngWeekdays: [] };
  const setPerson = (id: string, value: PersonRule) => setDraft(d => ({ ...d, people: { ...d.people, [id]: value } }));
  const dayRow = (list: number[], onChange: (day: number, value: string) => void, label: string) => <div className="grid grid-cols-7 gap-1">{WEEK.map((name, day) => <label key={day} className="flex min-w-0 flex-col items-center gap-1 text-xs font-bold text-slate-600">{name}<input aria-label={`${label}${name}曜`} type="number" inputMode="numeric" min={0} max={99} className={num + " !w-full min-w-0 px-1"} value={list[day] || 0} onChange={event => onChange(day, event.target.value)} /></label>)}</div>;
  const activeEmployees = employees.filter(item => item.active !== false);
  return <div className="space-y-5">
    <section className="space-y-3 rounded-2xl border bg-white p-5">
      <h3 className="font-black">① 曜日ごとの、最低の出勤人数</h3>
      <p className="text-xs text-slate-500">この人数に足りない日は、シフト表に「⚠ 人数不足」と出ます。「0」はチェックしません。祝日と「全員お休み」にした日は、チェックしません。</p>
      {dayRow(draft.minTotal, (day, value) => setDraft(d => ({ ...d, minTotal: setDay(d.minTotal, day, value) })), "最低人数")}
    </section>
    <section className="space-y-3 rounded-2xl border bg-white p-5">
      <h3 className="font-black">② 役職ごとの、最低の出勤人数</h3>
      <p className="text-xs text-slate-500">例：薬剤師は平日いつも1人以上。役職は「従業員マスタ」で決めたものです。</p>
      {roles.map(role => <div key={role.id} className="space-y-1"><strong className="text-sm">{role.name}</strong>{dayRow(roleMin(role.id), (day, value) => setRoleDay(role.id, day, value), `${role.name}の最低人数`)}</div>)}
    </section>
    <section className="space-y-3 rounded-2xl border bg-white p-5">
      <h3 className="font-black">③ 連勤の上限</h3>
      <p className="text-xs text-slate-500">この日数より多く続けて出勤している人に、警告が出ます。「0」はチェックしません。</p>
      <label className="flex items-center gap-2 text-sm font-bold">続けて出勤できるのは最大<input aria-label="連勤の上限" type="number" inputMode="numeric" min={0} max={31} className={num} value={draft.maxConsecutive} onChange={event => setDraft(d => ({ ...d, maxConsecutive: Math.max(0, Math.min(31, Math.floor(Number(event.target.value) || 0))) }))} />日（0＝チェックしない）</label>
    </section>
    <section className="space-y-3 rounded-2xl border bg-white p-5">
      <h3 className="font-black">④ 1人ごとの条件</h3>
      <p className="text-xs text-slate-500">「週の出勤は最大○日」「この曜日は入れない」を人ごとに決めます。決めた条件を破ると、その人のマスに警告が出ます。</p>
      <div className="space-y-3">{activeEmployees.map(emp => { const p = person(emp.id); return <div key={emp.id} className="rounded-xl bg-slate-50 p-3">
        <strong className="text-sm">{emp.displayName || emp.name}</strong>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
          <label className="flex items-center gap-1">週の出勤は最大<input aria-label={`${emp.displayName || emp.name}の週の最大日数`} type="number" inputMode="numeric" min={0} max={7} className={num} value={p.maxPerWeek} onChange={event => setPerson(emp.id, { ...p, maxPerWeek: Math.max(0, Math.min(7, Math.floor(Number(event.target.value) || 0))) })} />日（0＝制限なし）</label>
          <span className="flex items-center gap-2">毎週決まった休み：{WEEK.map((name, day) => <label key={day} className="flex items-center gap-0.5"><input type="checkbox" aria-label={`${emp.displayName || emp.name}は${name}曜に入れない`} checked={p.ngWeekdays.includes(day)} onChange={event => setPerson(emp.id, { ...p, ngWeekdays: event.target.checked ? [...p.ngWeekdays, day].sort() : p.ngWeekdays.filter(item => item !== day) })} />{name}</label>)}</span>
        </div></div>; })}</div>
    </section>
    <SaveStatus dirty={dirty} saving={saving} />
    <Button className="h-12 w-full font-bold" disabled={!dirty || saving} onClick={() => void onSave(draft)}><Save className="mr-2 h-4 w-4" />{saving ? "保存しています…" : "保存"}</Button>
  </div>;
}
