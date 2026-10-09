import { AssignResult } from "../lib/auto-assign";

export interface AutoPlan { result: AssignResult; before: number; after: number; names: Record<string, string>; labels: Record<string, string> }

/** 自動で作った案の中身（入れる日・埋められなかった日）。押すまでシフトは変わりません。 */
export function PlanView({ plan, displayShift }: { plan: AutoPlan; displayShift: (value: string) => string }) {
  const { result } = plan;
  const dates = [...new Set(result.changes.map(item => item.date))];
  return <div className="space-y-3">
    {result.notice && <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold leading-7 text-slate-800">{result.notice}</p>}
    {result.changes.length > 0 && <>
      <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold leading-7 text-emerald-900">{result.changes.length}か所に出勤を入れる案です。確認が必要なところは {plan.before}件 → {plan.after}件 になります。</p>
      <ul className="space-y-1 text-sm" data-auto-assign-changes>{dates.map(date => <li key={date}><b>{plan.labels[date] || date}</b>　{result.changes.filter(item => item.date === date).map(item => `${plan.names[item.employeeId] || ""}さん（${displayShift(item.shift)}）`).join("、")}</li>)}</ul>
      <details className="rounded-xl border border-slate-200 p-3 text-xs" data-auto-assign-reasons><summary className="cursor-pointer font-bold text-slate-700">なぜこの人を入れたか（理由を見る）</summary><ul className="mt-2 space-y-1 leading-5 text-slate-600">{result.changes.map((item, i) => <li key={i}><b>{plan.labels[item.date] || item.date} {plan.names[item.employeeId]}さん</b>：{item.reason}{item.replacesRest ? "（今は「休み」のところを出勤に変えます）" : ""}</li>)}</ul></details>
      {result.stats.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200" data-auto-assign-stats><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-2 text-left">案を入れたあとの出勤数</th><th className="p-2">日数</th><th className="p-2">土日祝</th><th className="p-2">早番</th><th className="p-2">遅番</th></tr></thead><tbody>{result.stats.map(st => <tr key={st.id} className="border-t border-slate-100"><td className="p-2 font-bold">{st.name}</td><td className="p-2 text-center">{st.days}</td><td className="p-2 text-center">{st.weekendDays}</td><td className="p-2 text-center">{st.early}</td><td className="p-2 text-center">{st.late}</td></tr>)}</tbody></table></div>}
    </>}
    {result.unresolved.length > 0 && <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" data-auto-assign-unresolved>
      <b>どうしても埋められなかった日（{result.unresolved.length}件）</b>
      <p className="mt-1 text-xs">決めたルールを守ると入れる人がいません。休み希望や条件を見直すか、手で調整してください。</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{result.unresolved.map((item, index) => <li key={index}><b>{item.label}</b> {item.message}</li>)}</ul>
    </div>}
  </div>;
}
