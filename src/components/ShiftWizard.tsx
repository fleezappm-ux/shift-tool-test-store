import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonRule, StaffingRules } from "../types";
import { PersonProfile } from "../lib/shift-profile";
import { describeRules } from "../lib/staffing-describe";
import { DayGrid } from "./DayGrid";
import { AutoPlan, PlanView } from "./AutoAssignDialog";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const STEPS = ["最低人数", "役職", "連勤", "個人の条件", "まとめ"];
const zero = () => [0, 0, 0, 0, 0, 0, 0];

interface Props {
  rules: StaffingRules;
  roles: { id: string; name: string }[];
  employees: { id: string; name: string; displayName?: string; roleId?: string }[];
  periodLabel: string;
  leaveCount: number;
  /** 前の月までの実績から読み取った、人ごとの「いつもの働き方」（質問の初期値） */
  profiles?: Record<string, PersonProfile | null>;
  makePlan: (rules: StaffingRules) => AutoPlan;
  displayShift: (value: string) => string;
  onApply: (plan: AutoPlan, rules: StaffingRules, saveRules: boolean) => void;
  onClose: () => void;
}

/** 前の月の実績から読み取れた「週の日数」「決まった休み」を、まだ決めていない人にだけ初期値として入れる */
function prefillPeople(rules: StaffingRules, profiles: Props["profiles"], employees: Props["employees"]): Record<string, PersonRule> {
  const people: Record<string, PersonRule> = { ...rules.people };
  employees.forEach(emp => {
    const prof = profiles?.[emp.id];
    const cur = people[emp.id];
    if (!prof || prof.weeklyDays < 1 || (cur && (cur.weeklyDays || cur.ngWeekdays.length))) return;
    people[emp.id] = { maxPerWeek: cur?.maxPerWeek || 0, ngWeekdays: prof.fixedOff, weeklyDays: prof.weeklyDays, shiftPref: cur?.shiftPref };
  });
  return people;
}

/** 質問に1つずつ答えると、最後に「こんなシフトになります」と言葉で見せて、案を作る画面。 */
export function ShiftWizard({ rules, roles, employees, periodLabel, leaveCount, profiles, makePlan, displayShift, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<StaffingRules>(() => ({ ...rules, roleMins: rules.roleMins.map(r => ({ ...r, min: [...r.min] })), minTotal: [...rules.minTotal], people: prefillPeople(rules, profiles, employees) }));
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<AutoPlan | null>(null);
  const [saveRules, setSaveRules] = useState(true);
  const usedRoles = roles.filter(role => employees.some(e => e.roleId === role.id));
  const roleMin = (id: string) => draft.roleMins.find(r => r.roleId === id)?.min || zero();
  const roleNames = useMemo(() => Object.fromEntries(roles.map(r => [r.id, r.name])), [roles]);
  const personNames = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e.displayName || e.name])), [employees]);
  const person = (id: string): PersonRule => draft.people[id] || { maxPerWeek: 0, ngWeekdays: [] };
  const setPerson = (id: string, value: PersonRule) => setDraft(d => ({ ...d, people: { ...d.people, [id]: value } }));
  const cleanRules = (): StaffingRules => ({ ...draft, roleMins: draft.roleMins.filter(r => r.min.some(n => n > 0)), people: Object.fromEntries((Object.entries(draft.people) as [string, PersonRule][]).filter(([, p]) => p.maxPerWeek > 0 || p.ngWeekdays.length || p.weeklyDays || (p.shiftPref && p.shiftPref !== "any"))) });
  const noNeed = !draft.minTotal.some(n => n > 0) && !draft.roleMins.some(r => r.min.some(n => n > 0)) && !((draft.alwaysRoles || []).length > 0 && (draft.hours || []).some(Boolean));
  const visibleSteps = usedRoles.length ? STEPS : STEPS.filter(s => s !== "役職");
  const name = visibleSteps[step];
  const last = step === visibleSteps.length - 1;
  const lines = describeRules({ rules: cleanRules(), roleNames, personNames, leaveCount });

  const body = () => {
    if (plan) return <PlanView plan={plan} displayShift={displayShift} />;
    if (name === "最低人数") return <div className="space-y-3"><h3 className="text-base font-black">① 1日に、最低何人いれば足りますか？</h3><p className="text-xs leading-6 text-slate-500">曜日ごとの人数です。お休みの日や、決めない日は「0」にします。</p><DayGrid values={draft.minTotal} label="最低人数" quick onChange={next => setDraft(d => ({ ...d, minTotal: next }))} /></div>;
    if (name === "役職") return <div className="space-y-4"><h3 className="text-base font-black">② 役職ごとに、必ずいてほしい人数は？</h3><p className="text-xs leading-6 text-slate-500">例：薬剤師は平日いつも1人以上。決めない役職は「0」のままで大丈夫です。</p>{usedRoles.map(role => <div key={role.id} className="space-y-1"><b className="text-sm">{role.name}</b><DayGrid values={roleMin(role.id)} label={`${role.name}の最低人数`} quick onChange={next => setDraft(d => ({ ...d, roleMins: [...d.roleMins.filter(r => r.roleId !== role.id), { roleId: role.id, min: next }] }))} /></div>)}</div>;
    if (name === "連勤") return <div className="space-y-3"><h3 className="text-base font-black">{usedRoles.length ? "③" : "②"} 続けて、何日まで出勤していいですか？</h3><div className="grid grid-cols-3 gap-2">{[0, 4, 5, 6, 7].map(n => <button key={n} type="button" aria-pressed={draft.maxConsecutive === n} onClick={() => setDraft(d => ({ ...d, maxConsecutive: n }))} className={`h-12 rounded-xl border-2 text-sm font-bold ${draft.maxConsecutive === n ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700"}`}>{n === 0 ? "制限しない" : `最大${n}日`}</button>)}</div></div>;
    if (name === "個人の条件") return <div className="space-y-3" data-wizard-people><h3 className="text-base font-black">{usedRoles.length ? "④" : "③"} みんなの働き方は、これで合っていますか？</h3><p className="text-xs leading-6 text-slate-500">{profiles && Object.values(profiles).some(Boolean) ? "前の月までの実績から、先に入れておきました。違うところだけ直してください。" : "週の日数・決まった休み・早番か遅番か、分かる人だけ選んでください。分からなければ何も選ばずに「次へ」で大丈夫です。"}</p>{employees.map(emp => { const p = person(emp.id); const nm = emp.displayName || emp.name; const prof = profiles?.[emp.id]; return <div key={emp.id} className="space-y-2 rounded-xl bg-slate-50 p-3" data-wizard-person={emp.id}><div className="flex flex-wrap items-baseline gap-2"><b className="text-sm">{nm}</b>{prof && <span className="text-[11px] text-slate-500">前月まで：週{prof.weeklyDays}日くらい{prof.usualShift ? `・${prof.usualShift}` : ""}</span>}</div><div className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-600"><span className="mr-1">週に何日？</span>{[0, 1, 2, 3, 4, 5, 6, 7].map(n => <button key={n} type="button" aria-label={`${nm}は週${n || "決めない"}${n ? "日勤務" : ""}`} aria-pressed={(p.weeklyDays || 0) === n} onClick={() => setPerson(emp.id, { ...p, weeklyDays: n || undefined })} className={`h-9 min-w-9 rounded-lg border px-2 ${(p.weeklyDays || 0) === n ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>{n === 0 ? "決めない" : n}</button>)}</div><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-600"><span>毎週決まった休み：</span>{[1, 2, 3, 4, 5, 6, 0].map(day => <label key={day} className="flex items-center gap-0.5"><input type="checkbox" aria-label={`${nm}は${WEEK[day]}曜に入れない`} checked={p.ngWeekdays.includes(day)} onChange={event => setPerson(emp.id, { ...p, ngWeekdays: event.target.checked ? [...p.ngWeekdays, day].sort() : p.ngWeekdays.filter(item => item !== day) })} />{WEEK[day]}</label>)}</div><div className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-600"><span className="mr-1">時間帯：</span>{([["any", "どちらでも"], ["early", "早番がいい"], ["late", "遅番がいい"]] as const).map(([v, t]) => <button key={v} type="button" aria-label={`${nm}は${t}`} aria-pressed={(p.shiftPref || "any") === v} onClick={() => setPerson(emp.id, { ...p, shiftPref: v === "any" ? undefined : v })} className={`h-9 rounded-lg border px-2 ${(p.shiftPref || "any") === v ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>{t}</button>)}</div></div>; })}</div>;
    return <div className="space-y-3" data-wizard-summary><h3 className="text-base font-black">こんなシフトになります</h3><ul className="space-y-2 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-950">{lines.map((line, i) => <li key={i} className="list-disc ml-4">{line}</li>)}</ul>{noNeed && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">最低人数が決まっていません。「もどる」で、最低人数を入れてください。</p>}<label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" className="mt-1" checked={saveRules} onChange={event => setSaveRules(event.target.checked)} /><span><b>この答えを設定に保存する</b><span className="block text-xs text-slate-500">次からは、この条件がはじめから入った状態で始まります。シフト表の「⚠」の基準にもなります。</span></span></label></div>;
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="wizard-title" data-wizard>
    <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
      <div><h2 id="wizard-title" className="text-lg font-black">質問に答えて、シフト案を作る</h2><p className="text-xs text-slate-500">{periodLabel}　{plan ? "できた案" : `${step + 1} / ${visibleSteps.length}`}</p></div>
      {body()}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose}>やめる</Button>
        {plan ? <>
          <Button variant="outline" onClick={() => setPlan(null)}>もどる（答えを直す）</Button>
          {plan.result.changes.length > 0 && <Button data-wizard-apply onClick={() => onApply(plan, cleanRules(), saveRules)}>この案を使う</Button>}
        </> : <>
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>もどる</Button>}
          {last ? <Button data-wizard-make disabled={noNeed} onClick={() => setPlan(makePlan(cleanRules()))}>この条件で案を作る</Button> : <Button onClick={() => setStep(step + 1)}>次へ</Button>}
        </>}
      </div>
    </div>
  </div>;
}
