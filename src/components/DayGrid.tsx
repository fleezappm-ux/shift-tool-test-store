const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const box = "h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-1 text-center text-base";

/** 日〜土の7つの数字入力。quick を付けると「月〜金をまとめて」入れる欄も出ます。 */
export function DayGrid({ values, onChange, label, quick }: { values: number[]; onChange: (next: number[]) => void; label: string; quick?: boolean }) {
  const clamp = (value: string) => Math.max(0, Math.min(99, Math.floor(Number(value) || 0)));
  const set = (day: number, value: string) => { const next = [...values]; next[day] = clamp(value); onChange(next); };
  return <div className="space-y-2">
    {quick && <label className="flex items-center gap-2 text-sm font-bold text-slate-700">月〜金を、まとめて<input aria-label={`${label}の月から金をまとめて`} type="number" inputMode="numeric" min={0} max={99} className={box + " !w-16"} value={[1, 2, 3, 4, 5].every(d => values[d] === values[1]) ? values[1] || 0 : ""} placeholder="—" onChange={event => { const n = clamp(event.target.value); const next = [...values]; [1, 2, 3, 4, 5].forEach(d => { next[d] = n; }); onChange(next); }} />人にする</label>}
    <div className="grid grid-cols-7 gap-1">{[1, 2, 3, 4, 5, 6, 0].map(day => <label key={day} className="flex min-w-0 flex-col items-center gap-1 text-xs font-bold text-slate-600">{WEEK[day]}<input aria-label={`${label}${WEEK[day]}曜`} type="number" inputMode="numeric" min={0} max={99} className={box} value={values[day] || 0} onChange={event => set(day, event.target.value)} /></label>)}</div>
  </div>;
}
