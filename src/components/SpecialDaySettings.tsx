import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarPlus, Check, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SpecialDayColor, SpecialDayRule } from "../types";
import { EmployeeMasterItem } from "../lib/employee-master-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveStatus } from "./SaveStatus";
import { useUnsavedGuard } from "../lib/unsaved";

const COLORS: { value: SpecialDayColor; label: string }[] = [
  { value: "red", label: "赤" }, { value: "blue", label: "青" }, { value: "green", label: "緑" },
  { value: "amber", label: "黄" }, { value: "purple", label: "紫" }, { value: "gray", label: "灰" }
];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
interface Props { rules: SpecialDayRule[]; employees: EmployeeMasterItem[]; loading: boolean; onSave: (rules: SpecialDayRule[]) => Promise<void>; }

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function SpecialDaySettings({ rules, employees, loading, onSave }: Props) {
  const [drafts, setDrafts] = useState<SpecialDayRule[]>(rules);
  const [dateInputs, setDateInputs] = useState<Record<string, string>>({});
  const [ymInputs, setYmInputs] = useState<Record<string, { m: string; d: string; m2?: string; d2?: string }>>({});
  const [addLocked, setAddLocked] = useState(false);
  const [newRuleId, setNewRuleId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  useEffect(() => { setDrafts(rules); }, [rules]);
  const [baseline, setBaseline] = useState(() => JSON.stringify(rules));
  useEffect(() => setBaseline(JSON.stringify(rules)), [rules]);
  const fixedRule = (rule: SpecialDayRule) => /^band-v3:closed-[0-6]$/.test(rule.id) || rule.id === "band-v3:holiday";
  const dirty = JSON.stringify(drafts) !== baseline;
  useUnsavedGuard("special-days", dirty);
  const closedDays = WEEKDAYS.map((_, day) => drafts.some(rule => rule.id === `band-v3:closed-${day}` && rule.enabled));
  const noClosed = !closedDays.some(Boolean) && !drafts.some(rule => rule.id === "band-v3:holiday" && rule.enabled);
  const holidayClosed = drafts.some(rule => rule.id === "band-v3:holiday" && rule.enabled);
  const toggleClosed = (id: string, weekday: number, checked: boolean) => {
    const isHoliday = id === "band-v3:holiday";
    const name = isHoliday ? "祝日" : `${WEEKDAYS[weekday]}曜日`;
    const color: SpecialDayColor = isHoliday || weekday === 0 ? "red" : weekday === 6 ? "blue" : "gray";
    setDrafts(items => checked ? [...items.filter(rule => rule.id !== id), { id, name, color, showName: true, restMode: "none", restEmployeeIds: [], behavior: "information", enabled: true, mode: isHoliday ? "annual" : "recurring", weekday, weeks: isHoliday ? [] : [1, 2, 3, 4, 5], dates: [] } as SpecialDayRule] : items.filter(rule => rule.id !== id));
  };
  type DisplayKind = "none" | "calendar" | "closed" | "custom";
  const [customKinds, setCustomKinds] = useState<string[]>([]);
  const calendarName = (rule: SpecialDayRule) => rule.id === "band-v3:holiday" ? "祝日" : `${WEEKDAYS[rule.weekday]}曜日`;
  const displayKind = (rule: SpecialDayRule): DisplayKind => {
    if (customKinds.includes(rule.id)) return "custom";
    if (rule.showName === false) return "none";
    const name = rule.name.trim();
    if (name === calendarName(rule) || name === WEEKDAYS[rule.weekday] + "曜" || (rule.id === "band-v3:holiday" && name === "祝日")) return "calendar";
    if (name === "定休日") return "closed";
    return "custom";
  };
  const setDisplayKind = (rule: SpecialDayRule, kind: DisplayKind) => {
    setCustomKinds(current => kind === "custom" ? [...new Set([...current, rule.id])] : current.filter(id => id !== rule.id));
    if (kind === "none") update(rule.id, { showName: false });
    else if (kind === "calendar") update(rule.id, { showName: true, name: calendarName(rule) });
    else if (kind === "closed") update(rule.id, { showName: true, name: "定休日" });
    else update(rule.id, { showName: true, name: displayKind(rule) === "custom" ? rule.name : "" });
  };
  const closedRules = [...WEEKDAYS.map((_, day) => drafts.find(rule => rule.id === `band-v3:closed-${day}`)), drafts.find(rule => rule.id === "band-v3:holiday")].filter(Boolean) as SpecialDayRule[];

  const update = (id: string, patch: Partial<SpecialDayRule>) => setDrafts(current => current.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
  const add = () => {
    if (addLocked) return;
    const id = crypto.randomUUID();
    const rule: SpecialDayRule = { id: `band-v3:${id}`, name: "新しいお休みの日", color: "amber", behavior: "information", enabled: true, mode: "monthly", weekday: 0, weeks: [1], dates: [], monthDates: [] };
    const ruleId = rule.id;
    setDrafts(current => [...current, rule]);
    setNewRuleId(ruleId);
    setAddLocked(true);
    toast.success("新しいお休みの日を追加しました（②の一番下です）。名前と日にちを入れて、一番下の保存を押してください");
    window.setTimeout(() => {
      document.getElementById(`special-rule-${ruleId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setAddLocked(false);
    }, 250);
    window.setTimeout(() => setNewRuleId(""), 1600);
  };

  const removeRule = async (id: string) => {
    const target = drafts.find(rule => rule.id === id);
    if (!target || !window.confirm(`「${target.name}」を完全に削除しますか？`)) return;
    const before = drafts;
    const next = drafts.filter(rule => rule.id !== id);
    setDrafts(next);
    setDeletingId(id);
    try {
      await onSave(next);
      toast.success(`「${target.name}」を削除しました`);
    } catch {
      setDrafts(before);
    } finally { setDeletingId(""); }
  };

  const addDate = (rule: SpecialDayRule) => {
    const start = dateInputs[rule.id] || "";
    const end = dateInputs[`${rule.id}:end`] || "";
    if (!start) return toast.error("「はじまり」の日付を選んでください");
    if (end && end < start) return toast.error("「おわり」は「はじまり」より後の日にしてください");
    const days: string[] = [];
    for (let cursor = new Date(`${start}T00:00:00`); format(cursor, "yyyy-MM-dd") <= (end || start) && days.length < 366; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) days.push(format(cursor, "yyyy-MM-dd"));
    const added = days.filter(day => !rule.dates.includes(day));
    if (!added.length) return toast.info("その日付は登録済みです");
    update(rule.id, { dates: [...rule.dates, ...added].sort() });
    setDateInputs(current => ({ ...current, [rule.id]: "", [`${rule.id}:end`]: "" }));
    toast.success(days.length > 1 ? `${displayDate(days[0])}〜${displayDate(days[days.length - 1])}（${added.length}日）を追加しました` : `${displayDate(start)}を追加しました`);
  };
  const setYm = (id: string, patch: Partial<{ m: string; d: string; m2: string; d2: string }>) => setYmInputs(current => ({ ...current, [id]: { m: "", d: "", m2: "", d2: "", ...current[id], ...patch } }));
  const addYearly = (rule: SpecialDayRule) => {
    const v = { m: "", d: "", m2: "", d2: "", ...ymInputs[rule.id] };
    const valid = (m: string, d: string) => { const date = new Date(`2023-${m}-${d}T00:00:00`); return !!m && !!d && !Number.isNaN(date.getTime()) && format(date, "MM-dd") === `${m}-${d}`; };
    if (!valid(v.m, v.d)) return toast.error("「はじまり」の月と日を正しく選んでください");
    const hasEnd = !!(v.m2 || v.d2);
    if (hasEnd && !valid(v.m2, v.d2)) return toast.error("「おわり」の月と日を正しく選んでください");
    const days: string[] = [];
    const first = new Date(`2023-${v.m}-${v.d}T00:00:00`);
    const last = hasEnd ? new Date(`2023-${v.m2}-${v.d2}T00:00:00`) : first;
    for (let cursor = first, guard = 0; guard < 366; guard += 1) {
      days.push(format(cursor, "MM-dd"));
      if (format(cursor, "MM-dd") === format(last, "MM-dd")) break;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    update(rule.id, { monthDays: [...new Set([...(rule.monthDays || []), ...days])].sort() });
    setYmInputs(current => ({ ...current, [rule.id]: { m: "", d: "", m2: "", d2: "" } }));
    toast.success(days.length > 1 ? `${Number(v.m)}月${Number(v.d)}日〜${Number(v.m2)}月${Number(v.d2)}日（${days.length}日）を追加しました` : `${Number(v.m)}月${Number(v.d)}日を追加しました`);
  };

  const restFields = (value: Pick<SpecialDayRule, "restMode" | "restEmployeeIds">, updateFields: (patch: Partial<SpecialDayRule>) => void) => <div className="mt-3 rounded-lg border bg-white p-3 text-sm">
    <label className="block font-bold">シフト案の自動作成で、この日を休みにしますか？<select className="mt-2 h-10 w-full rounded-lg border bg-white px-2" value={value.restMode || "none"} onChange={event => updateFields({ restMode: event.target.value as SpecialDayRule["restMode"] })}><option value="none">しない（色と文字だけ。勤務はいつもどおり入る）</option><option value="all">全員を休みにする</option><option value="selected">選んだ人だけ休みにする</option></select></label>
    <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600">「シフト案の自動作成」は、勤務パターンをもとに、先の期間のシフトをまとめて作る機能です。ここで「休みにする」を選ぶと、この日は自動作成のときに「休み」が入ります。例：日曜が定休日なら「全員を休みにする」、休診の日だけ一部の人が休むなら「選んだ人だけ」。</p>
    {value.restMode === "selected" && <fieldset className="mt-3 grid gap-2"><legend className="font-bold">休みにする人</legend>{employees.filter(item => item.active).map(item => <label key={item.id} className="flex items-center gap-2"><input type="checkbox" checked={(value.restEmployeeIds || []).includes(item.id)} onChange={event => updateFields({ restEmployeeIds: event.target.checked ? [...(value.restEmployeeIds || []), item.id] : (value.restEmployeeIds || []).filter(id => id !== item.id) })} />{item.displayName || item.name}</label>)}</fieldset>}
    <p className="mt-2 text-xs text-slate-500">すでに入力したシフトは変わりません（これから作るシフト案にだけ反映します）。</p>
  </div>;
  const findProblem = (): string => {
    for (const rule of drafts.filter(item => !fixedRule(item))) {
      const name = `「${rule.name || "名前なし"}」`;
      if (rule.mode === "recurring" && rule.weekday < 0) return `${name}は、曜日が未選択です。「① 何曜日ですか？」で曜日を選んでください`;
      if (rule.mode === "recurring" && !rule.weeks.length) return `${name}は、第何週かが未選択です。「② 第何週ですか？」を選んでください`;
      if (rule.mode === "monthly" && !(rule.monthDates || []).length) return `${name}は、毎月の何日かが未選択です。日にちをタップして選んでください`;
      if (rule.mode === "yearly" && !(rule.monthDays || []).length) return `${name}は、毎年の日付が未登録です。月と日を選んで「追加」を押してください`;
      if (rule.mode === "annual" && !rule.dates.length) return `${name}は、日付が未登録です。日付を選んで「追加」を押してください`;
    }
    return "";
  };
  const validRest = (rule: Pick<SpecialDayRule, "restMode" | "restEmployeeIds">) => rule.restMode !== "selected" || !!rule.restEmployeeIds?.some(id => employees.some(item => item.active && item.id === id));

  return <section className="special-day-settings">
    <div className="special-settings-title">
      <div><CalendarPlus className="w-5 h-5" /><div><strong>お店のお休みの日・色付け</strong><span>休みの日を決めると、カレンダーに色が付きます</span></div></div>

    </div>
    <p className="special-save-guide">お店が休みの日（例：日曜、祝日、年末年始、毎月15日など）を決めます。決めた日はカレンダーに色が付き、シフト案の自動作成では「休み」として入れられます。すでに入力したシフトは変わりません。変更したら、一番下の「保存」を押してください。</p>
    <section className="rounded-2xl border-2 border-sky-300 bg-white p-4 space-y-3 shadow-sm">
      <h3 className="-mx-4 -mt-4 mb-1 rounded-t-2xl bg-sky-600 px-4 py-2 font-black text-white">① 曜日と祝日で決まる休み</h3><p className="text-xs text-slate-600">毎週決まった曜日が休みなら、その曜日を選びます（複数OK）。<b>国民の祝日</b>も休みなら「祝日」を選びます（日付は自動で入ります）。</p>
      <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={noClosed} onChange={event => { if (event.target.checked) setDrafts(items => items.filter(rule => !fixedRule(rule))); }} />曜日・祝日で決まった休みはない</label>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{WEEKDAYS.map((label, day) => <label key={day} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border font-bold ${closedDays[day] ? "bg-red-50 text-red-700 border-red-300" : "bg-white"}`}><input className="sr-only" type="checkbox" checked={closedDays[day]} onChange={event => toggleClosed(`band-v3:closed-${day}`, day, event.target.checked)} />{label}曜日</label>)}<label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border font-bold ${holidayClosed ? "bg-red-50 text-red-700 border-red-300" : "bg-white"}`}><input className="sr-only" type="checkbox" checked={holidayClosed} onChange={event => toggleClosed("band-v3:holiday", 0, event.target.checked)} />祝日</label></div>
      {closedRules.map(rule => <div key={rule.id} className="rounded-xl border-2 border-sky-200 bg-sky-50/40 p-3 space-y-2">
        <div className="text-sm font-black text-sky-800">▼ 「{rule.id === "band-v3:holiday" ? "祝日" : `${WEEKDAYS[rule.weekday]}曜日`}」の表示設定</div>
        <label className="block text-sm font-bold">カレンダー／備考に出す表示<select className="mt-1 h-11 w-full rounded-lg border bg-white px-3" value={displayKind(rule)} onChange={event => setDisplayKind(rule, event.target.value as DisplayKind)}><option value="none">なし（色だけ付ける）</option><option value="calendar">カレンダー通り（{rule.id === "band-v3:holiday" ? "祝日" : `${WEEKDAYS[rule.weekday]}曜日`}）</option><option value="closed">定休日</option><option value="custom">任意入力（自分で文字を入れる）</option></select></label>
        {displayKind(rule) === "custom" && <label className="block text-sm font-bold">表示する文字<Input className="mt-1 bg-white" placeholder="例：休診日" value={rule.name} onChange={event => update(rule.id, { name: event.target.value })} /></label>}
        <label className="block text-sm font-bold">カレンダーの色<select className="mt-1 h-11 w-full rounded-lg border bg-white px-3" value={rule.color} onChange={event => update(rule.id, { color: event.target.value as SpecialDayColor })}>{COLORS.map(color => <option key={color.value} value={color.value}>{color.label}</option>)}</select></label>
        {restFields(rule, patch => update(rule.id, patch))}
      </div>)}
    </section>
    <section className="mt-6 rounded-2xl border-2 border-amber-300 bg-white p-4 space-y-2 shadow-sm">
      <h3 className="-mx-4 -mt-4 mb-1 rounded-t-2xl bg-amber-500 px-4 py-2 font-black text-white">② 特別なお休みの日（棚卸し・年末年始・毎月15日など）</h3>
      <p className="text-xs leading-5 text-slate-600">曜日では決まらない休みは、ここに追加します。<b>例：</b>年末年始（12/29〜1/3）、お盆休み（8/13〜8/16）、棚卸しの日、創立記念日、毎月15日、第2水曜の休診日。追加すると、下の一覧の一番下にカードが増えます。</p>
      {drafts.filter(rule => !fixedRule(rule)).length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">まだありません。必要なときだけ追加してください。</p>}
    </section>
    <div className="special-rule-list space-y-4">
      {drafts.filter(rule => !fixedRule(rule)).map(rule => <div style={{ borderLeft: "6px solid #f59e0b" }} id={`special-rule-${rule.id}`} key={rule.id} className={`special-rule-card ${newRuleId === rule.id ? "is-new" : ""}`}>
        {newRuleId === rule.id && <div className="special-new-label">ここに追加しました</div>}
        <div className="special-rule-main"><Input value={rule.name} placeholder="カレンダーに出す文字（例：棚卸し）" aria-label="カレンダーに出す文字" onChange={event => update(rule.id, { name: event.target.value })} /><select aria-label="カレンダーの色" value={rule.color} onChange={event => update(rule.id, { color: event.target.value as SpecialDayColor })}>{COLORS.map(color => <option key={color.value} value={color.value}>{color.label}</option>)}</select><label><input type="checkbox" checked={rule.enabled} onChange={event => update(rule.id, { enabled: event.target.checked })} />有効</label><button type="button" className="special-delete" disabled={loading || deletingId === rule.id} aria-label={`${rule.name}を削除`} onClick={() => removeRule(rule.id)}><Trash2 className="w-4 h-4" /></button></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.showName !== false} onChange={event => update(rule.id, { showName: event.target.checked })} />カレンダーのその日に、上の文字も表示する</label>
        {restFields(rule, patch => update(rule.id, patch))}
        <label className="mt-3 block text-sm font-bold">いつ休みですか？（まず種類を選びます）<select className="mt-1 h-11 w-full rounded-lg border bg-white px-3" value={rule.mode} onChange={event => { const mode = event.target.value as SpecialDayRule["mode"]; update(rule.id, mode === "recurring" && mode !== rule.mode ? { mode, weekday: -1, weeks: [] } : { mode }); }}>
          <option value="monthly">毎月 決まった日（例：毎月15日）</option>
          <option value="recurring">毎月 第○曜日（例：第2水曜）</option>
          <option value="yearly">毎年 同じ日・期間（例：12/29〜1/3、お盆）</option>
          <option value="annual">今年だけ 日・期間（カレンダーから選ぶ）</option>
        </select></label>
        {rule.mode === "monthly" ? <div className="special-annual"><label className="special-date-label">休みにする日（毎月）。複数選べます。31日がない月は、その月は休みになりません</label><div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4 }}>{Array.from({ length: 31 }, (_, index) => index + 1).map(day => { const on = (rule.monthDates || []).includes(day); return <button key={day} type="button" aria-pressed={on} className={`h-10 rounded-md border text-sm font-bold ${on ? "border-blue-500 bg-blue-600 text-white" : "bg-white text-slate-700"}`} onClick={() => update(rule.id, { monthDates: on ? (rule.monthDates || []).filter(value => value !== day) : [...(rule.monthDates || []), day].sort((a, b) => a - b) })}>{day}</button>; })}</div><small>{(rule.monthDates || []).length ? `毎月 ${(rule.monthDates || []).join("・")} 日` : "日にちをタップして選んでください"}</small></div> : rule.mode === "recurring" ? <div className="mt-2 space-y-3 rounded-xl border-2 border-blue-400 bg-blue-50 p-3">
          <label className="block text-sm font-black text-blue-900">① 何曜日ですか？<select aria-label="曜日" className={`mt-1 h-12 w-full rounded-lg border-2 bg-white px-3 text-base font-bold ${rule.weekday < 0 ? "border-red-400 text-red-700" : "border-blue-400"}`} value={rule.weekday >= 0 ? String(rule.weekday) : ""} onChange={event => update(rule.id, { weekday: event.target.value === "" ? -1 : Number(event.target.value) })}><option value="">曜日を選んでください</option>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}曜日</option>)}</select></label>
          <fieldset><legend className="text-sm font-black text-blue-900">② 第何週ですか？（複数選べます）</legend><div className="mt-1 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map(week => { const on = rule.weeks.includes(week); return <button key={week} type="button" aria-pressed={on} className={`h-11 rounded-lg border-2 text-sm font-bold ${on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={() => update(rule.id, { weeks: on ? rule.weeks.filter(value => value !== week) : [...rule.weeks, week].sort() })}>第{week}</button>; })}</div></fieldset>
          <small className="block text-xs text-slate-600">{rule.weekday >= 0 && rule.weeks.length ? `毎月 第${rule.weeks.join("・")} ${WEEKDAYS[rule.weekday]}曜日` : "曜日と、第何週かを選んでください"}</small>
        </div> : rule.mode === "yearly" ? <div className="special-annual">
          <label className="special-date-label">毎年休みにする日、または期間を選んで「追加」を押してください。1日だけなら「はじまり」だけ選びます。期間なら「おわり」も選びます（例：12月29日〜1月3日）。年をまたぐ期間もOKです。</label>
          {(["", "2"] as const).map(suffix => <div key={suffix} className="special-date-entry"><span className="w-16 shrink-0 text-xs font-bold text-slate-600">{suffix ? "おわり" : "はじまり"}</span><select aria-label={`${suffix ? "おわり" : "はじまり"}の月`} className="h-11 rounded-lg border bg-white px-2" value={ymInputs[rule.id]?.[`m${suffix}` as "m"] || ""} onChange={event => setYm(rule.id, { [`m${suffix}`]: event.target.value })}><option value="">月</option>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m).padStart(2, "0")}>{m}月</option>)}</select><select aria-label={`${suffix ? "おわり" : "はじまり"}の日`} className="h-11 rounded-lg border bg-white px-2" value={ymInputs[rule.id]?.[`d${suffix}` as "d"] || ""} onChange={event => setYm(rule.id, { [`d${suffix}`]: event.target.value })}><option value="">日</option>{Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d).padStart(2, "0")}>{d}日</option>)}</select></div>)}
          <Button type="button" className="mt-2 bg-blue-600 font-bold text-white hover:bg-blue-700" onClick={() => addYearly(rule)}><Plus className="w-4 h-4 mr-1" />追加</Button>
          <div className="special-date-list">{(rule.monthDays || []).map(day => <div key={day} className="special-date-chip"><span>{Number(day.slice(0, 2))}月{Number(day.slice(3))}日</span><button type="button" aria-label={`${day}を削除`} onClick={() => update(rule.id, { monthDays: (rule.monthDays || []).filter(value => value !== day) })}><Trash2 className="w-3.5 h-3.5" /></button></div>)}{!(rule.monthDays || []).length && <small>登録日はまだありません</small>}</div>
        </div> : <div className="special-annual">
          <label className="special-date-label">今年だけ休みにする日、または期間を、カレンダーから選んで追加します。1日だけなら「はじまり」だけ、期間なら「おわり」も選びます（例：8月13日〜8月16日）。</label>
          <div className="special-date-entry"><span className="w-16 shrink-0 text-xs font-bold text-slate-600">はじまり</span><input type="date" aria-label="はじまりの日" value={dateInputs[rule.id] || ""} onChange={event => setDateInputs(current => ({ ...current, [rule.id]: event.target.value }))} /></div>
          <div className="special-date-entry"><span className="w-16 shrink-0 text-xs font-bold text-slate-600">おわり</span><input type="date" aria-label="おわりの日（期間のとき）" value={dateInputs[`${rule.id}:end`] || ""} onChange={event => setDateInputs(current => ({ ...current, [`${rule.id}:end`]: event.target.value }))} /></div>
          <Button type="button" className="mt-2 bg-blue-600 font-bold text-white hover:bg-blue-700" onClick={() => addDate(rule)}><Plus className="w-4 h-4 mr-1" />追加</Button>
          <div className="special-date-list">{rule.dates.length ? rule.dates.map((date, index) => <div key={date} className="special-date-chip"><span><b>{index + 1}</b>{displayDate(date)}</span><button type="button" aria-label={`${date}を削除`} onClick={() => update(rule.id, { dates: rule.dates.filter(value => value !== date) })}><Trash2 className="w-3.5 h-3.5" /></button></div>) : <small>登録日はまだありません</small>}</div>
        </div>}
      </div>)}
    </div>
          <Button disabled={addLocked || loading} onClick={add} className={addLocked ? "special-add-done h-12 w-full px-4 text-sm font-black" : "h-12 w-full bg-blue-600 px-4 text-sm font-black text-white shadow-md hover:bg-blue-700"}>{addLocked ? <Check className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}{addLocked ? "追加しました" : "お休みの日を追加"}</Button>
    <SaveStatus className="mt-3" dirty={dirty} saving={loading} />
    <div className={(dirty || loading) ? "h-20 md:hidden" : "hidden"} /><Button className={`fixed inset-x-4 bottom-[76px] z-40 h-12 font-bold shadow-xl md:sticky md:inset-x-auto md:bottom-2 md:z-10 md:w-full ${(dirty || loading) ? "" : "max-md:hidden"}`} disabled={loading || !dirty || drafts.some(rule => !rule.name.trim() || !validRest(rule))} onClick={() => { const problem = findProblem(); if (problem) return toast.error(problem); void onSave(drafts); }}><Save className="w-4 h-4 mr-2" />お休みの日の設定を保存</Button>
  </section>;
}
