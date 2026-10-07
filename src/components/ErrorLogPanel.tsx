import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { clearErrorLog, ErrorLogEntry, fetchErrorLog } from "../lib/error-report";

// 管理者用：画面で起きたエラーの記録（直近15件）。困ったとき、この内容を開発担当に見せてください。
export function ErrorLogPanel() {
  const [list, setList] = useState<ErrorLogEntry[] | null>(null);
  const [message, setMessage] = useState("");
  const load = () => { setMessage(""); fetchErrorLog().then(setList).catch(error => { setList(null); setMessage(error instanceof Error ? error.message : "取得できませんでした"); }); };
  useEffect(load, []);
  const clear = async () => { try { await clearErrorLog(); setList([]); } catch (error) { setMessage(error instanceof Error ? error.message : "消去できませんでした"); } };
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <div><h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">エラー記録</h4><p className="mt-1 text-[10px] text-muted-foreground">画面で起きたエラーを自動で記録します（直近15件）。接続キーの設定が必要です。</p></div>
      <div className="flex gap-2"><Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={load}>更新</Button><Button type="button" variant="outline" size="sm" className="h-9 text-xs" disabled={!list?.length} onClick={() => void clear()}>消去</Button></div>
    </div>
    {message && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{message}</p>}
    {list && list.length === 0 && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">エラーの記録はありません。</p>}
    {list && list.length > 0 && <ul className="space-y-1">{list.map(item => <li key={`${item.t}${item.m}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950"><span className="font-bold">{new Date(item.t).toLocaleString("ja-JP")}</span>{item.n > 1 && <span>（{item.n}回）</span>}{item.who && <span>　{item.who}</span>}<br />{item.m}{item.w && <span className="text-slate-500">　[{item.w}]</span>}</li>)}</ul>}
  </div>;
}
