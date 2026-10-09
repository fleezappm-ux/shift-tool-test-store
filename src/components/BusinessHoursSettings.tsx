import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffingRules } from "../types";
import { SaveStatus } from "./SaveStatus";
import { useUnsavedGuard } from "../lib/unsaved";

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
type Hours = NonNullable<StaffingRules["hours"]>;
const emptyHours = (): Hours => [null, null, null, null, null, null, null];

/** 店舗マスタの中で、営業時間と「営業時間のあいだ、ずっといてほしい役職」を決める。 */
export function BusinessHoursSettings({ rules, roles, saving, onSave }: { rules: StaffingRules; roles: { id: string; name: string }[]; saving: boolean; onSave: (rules: StaffingRules) => Promise<void> }) {
  const [hours, setHours] = useState<Hours>(rules.hours?.length === 7 ? rules.hours : emptyHours());
  const [always, setAlways] = useState<string[]>(rules.alwaysRoles || []);
  useEffect(() => { setHours(rules.hours?.length === 7 ? rules.hours : emptyHours()); setAlways(rules.alwaysRoles || []); }, [rules]);
  const saved = { hours: rules.hours?.length === 7 ? rules.hours : emptyHours(), always: rules.alwaysRoles || [] };
  const dirty = JSON.stringify({ hours, always }) !== JSON.stringify(saved);
  useUnsavedGuard("business-hours", dirty);
  const setDay = (day: number, value: Hours[number]) => setHours(current => current.map((item, i) => i === day ? value : item));
  const invalid = hours.some(item => item && item.open >= item.close);
  const copyMonday = () => { const monday = hours[1]; if (monday) setHours(current => current.map((item, i) => i >= 1 && i <= 5 ? { ...monday } : item)); };
  const input = "h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm";
  return <div className="space-y-4 border-t pt-5" data-business-hours>
    <div><h3 className="font-black">営業時間と、ずっといてほしい役職</h3><p className="mt-1 text-xs leading-6 text-slate-500">決めなくても使えます。決めると、営業時間のあいだ誰かが抜けている日を、シフト表で「⚠」と知らせます。シフト案の自動作成でも、そのすき間を優先して埋めます。</p></div>
    <div className="space-y-2">{ORDER.map(day => { const item = hours[day]; return <div key={day} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
      <label className="flex w-24 items-center gap-2 font-bold"><input type="checkbox" aria-label={`${WEEK[day]}曜は営業する`} checked={!!item} onChange={event => setDay(day, event.target.checked ? { open: "09:00", close: "18:00" } : null)} />{WEEK[day]}曜</label>
      {item ? <><input aria-label={`${WEEK[day]}曜の開店`} type="time" className={input} value={item.open} onChange={event => setDay(day, { ...item, open: event.target.value })} /><span>〜</span><input aria-label={`${WEEK[day]}曜の閉店`} type="time" className={input} value={item.close} onChange={event => setDay(day, { ...item, close: event.target.value })} /></> : <span className="text-xs text-slate-400">お休み、または決めない</span>}
    </div>; })}</div>
    {hours[1] && <Button type="button" variant="outline" size="sm" onClick={copyMonday}>月曜の時間を、火〜金にもコピーする</Button>}
    {invalid && <p className="rounded-lg bg-red-50 p-2 text-xs font-bold text-red-700">閉店は、開店より後の時刻にしてください。</p>}
    <div><b className="text-sm">営業時間のあいだ、いつも誰かいてほしい役職</b><div className="mt-2 flex flex-wrap gap-3">{roles.map(role => <label key={role.id} className="flex items-center gap-1 text-sm"><input type="checkbox" aria-label={`${role.name}はいつもいてほしい`} checked={always.includes(role.id)} onChange={event => setAlways(current => event.target.checked ? [...current, role.id] : current.filter(id => id !== role.id))} />{role.name}</label>)}</div></div>
    <SaveStatus dirty={dirty} saving={saving} />
    <Button className="h-12 w-full font-bold" disabled={!dirty || saving || invalid} onClick={() => void onSave({ ...rules, hours, alwaysRoles: always })}><Save className="mr-2 h-4 w-4" />{saving ? "保存しています…" : "営業時間を保存"}</Button>
  </div>;
}
