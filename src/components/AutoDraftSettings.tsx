import { CalendarClock, Play, Power } from "lucide-react";
import { AutoDraftSettings as Settings } from "../types";
import { Button } from "@/components/ui/button";

export function AutoDraftSettings({ settings, onChange, onStart, run, rangeLabel }: { rangeLabel?: string; settings: Settings; onChange: (value: Settings) => void; onStart: () => Promise<void>; run?: { state: "idle" | "running" | "done" | "error"; message: string; at?: string } }) {
  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <div className="flex items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 font-black"><CalendarClock className="h-5 w-5 text-blue-600" />シフト案自動作成</h2><p className="mt-1 text-xs text-slate-500">次の期間から3期間分のシフト案を維持します。</p></div><Button variant={settings.enabled ? "default" : "outline"} onClick={() => onChange({ ...settings, enabled: !settings.enabled, started: settings.enabled ? false : settings.started })}><Power className="mr-2 h-4 w-4" />{settings.enabled ? "ON" : "OFF"}</Button></div>
    {rangeLabel && <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4 text-sm font-bold text-blue-900">対象期間：<span className="text-lg font-black">{rangeLabel}</span><span className="mt-1 block text-xs font-normal text-blue-800">今の期間は対象外です。確定済みの期間は飛ばします。</span></div>}
    <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"><strong className="block text-slate-900">作成ルール</strong>
      <p>各従業員の勤務パターンを前月から継続します。週間の基準勤務扱いは、勤務時間にかかわらず5日です。</p>
      <p>帯色だけでは勤務を変えません。定休日・特殊日の「休みにする」設定はシフト案の作成時と勤務パターン適用時に反映します。勤務パターンの週の進み方は変わりません。</p>
      <p>確定済みシフトと手動変更済みの勤務は上書きしません。</p>
    </div>
    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">✓ 切り替えると、その場で自動的に保存されます（保存ボタンはありません）</p>
    {!settings.enabled && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">現在、シフト案の自動作成は停止しています。作成済みのシフト案は削除されません。</p>}
    {run && run.state !== "idle" && <div role="status" className={`rounded-xl border-2 p-4 text-sm font-bold leading-6 ${run.state === "running" ? "border-amber-400 bg-amber-100 text-amber-950" : run.state === "done" ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-red-400 bg-red-50 text-red-800"}`}>{run.state === "running" ? "⏳ " : run.state === "done" ? "✓ " : "⚠ "}{run.message}{run.at && <span className="block text-xs font-normal">{run.at}</span>}{run.state === "error" && <Button className="mt-2 block" variant="outline" size="sm" onClick={() => void onStart()}>もう一度やってみる</Button>}</div>}
    {settings.enabled && !settings.started && <Button className="h-12 w-full font-bold" disabled={run?.state === "running"} onClick={() => void onStart()}><Play className="mr-2 h-4 w-4" />シフト案の自動作成を開始する</Button>}
    {settings.enabled && settings.started && <Button variant="outline" className="h-12 w-full font-bold" disabled={run?.state === "running"} onClick={() => void onStart()}><Play className="mr-2 h-4 w-4" />{run?.state === "running" ? "作成中…" : "シフト案を作り足す（足りない分だけ作ります）"}</Button>}
    {settings.started && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">自動作成：稼働中{settings.lastRunAt ? `　最終作成 ${new Date(settings.lastRunAt).toLocaleString("ja-JP")}` : ""}</div>}
  </section>;
}
