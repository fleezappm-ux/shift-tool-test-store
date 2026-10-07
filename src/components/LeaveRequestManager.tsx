import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";
import { AlertTriangle, Check, Trash2, X } from "lucide-react";
import { LeaveRequest, LeaveRequestStatus } from "../types";
import { Button } from "@/components/ui/button";

interface Props {
  requests: LeaveRequest[];
  loading: boolean;
  onStatusChange: (request: LeaveRequest, status: LeaveRequestStatus, rejectionReason?: string) => Promise<void>;
  onDelete: (request: LeaveRequest) => Promise<void>;
}

export function LeaveRequestManager({ requests, loading, onStatusChange, onDelete }: Props) {
  const [target, setTarget] = useState<{ request: LeaveRequest; status: "申請中" | "承認" | "却下" } | null>(null);
  const [deleting, setDeleting] = useState<LeaveRequest | null>(null);
  const [reason, setReason] = useState("");
  const pendingItems = requests.filter(item => item.status === "申請中" && item.type !== "希望なし" && item.type !== "訂正依頼");
  const history = requests.filter(item => item.status !== "申請中" || item.type === "希望なし" || item.type === "訂正依頼");
  const pending = pendingItems.length;
  const counts = pendingItems.filter(item => item.date).reduce<Record<string, number>>((r, item) => ({ ...r, [item.date]: (r[item.date] || 0) + 1 }), {});
  const confirm = async () => {
    if (!target) return;
    try {
      await onStatusChange(target.request, target.status, target.status === "却下" ? reason.trim() : "");
      setTarget(null); setReason("");
    } catch (_) { /* エラー表示は親側。確認ダイアログを残す。 */ }
  };
  return <section className="leave-manager">
    <div className="leave-manager-header"><div><strong>休み希望の調整</strong><span>申請中 {pending}件</span></div>{Object.values(counts).some(c => c >= 2) && <div className="leave-conflict"><AlertTriangle className="w-4 h-4" />同日希望あり</div>}</div>
    {pendingItems.length === 0 ? <p>対応待ちの希望申請はありません</p> : <div className="leave-manager-list">
      {[...pendingItems].sort((a,b)=>a.date.localeCompare(b.date)).map(item => <div key={item.id} className={`leave-manager-row status-${item.status}`}>
        <div className="leave-manager-date"><strong>{item.date ? format(new Date(`${item.date}T00:00:00`),"M/d",{locale:ja}) : "希望"}</strong><span>{item.date ? format(new Date(`${item.date}T00:00:00`),"E",{locale:ja}) : "なし"}</span></div>
        <div className="leave-manager-person"><strong>{item.employeeName}</strong><span>{item.type}{item.type === "出勤希望" && item.desiredWorkStart && item.desiredWorkEnd ? `（${item.desiredWorkStart}〜${item.desiredWorkEnd}）` : ""}{item.comment ? `・${item.comment}` : ""}</span>{item.rejectionReason && <small className="text-red-600">却下理由：{item.rejectionReason}</small>}</div>
        <span className="leave-status">{item.status === "申請中" ? "申請中" : item.status}</span>
        {item.status === "申請中" && item.type !== "希望なし" && item.type !== "訂正依頼" && <div className="leave-manager-actions"><button disabled={loading} onClick={()=>setTarget({request:item,status:"承認"})}><Check className="w-4 h-4"/>承認</button><button disabled={loading} onClick={()=>setTarget({request:item,status:"却下"})}><X className="w-4 h-4"/>却下</button><button disabled={loading} title="申請を削除" onClick={() => setDeleting(item)}><Trash2 className="w-4 h-4"/>削除</button></div>}
      </div>)}
    </div>}
    <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer font-bold">対応履歴・訂正・削除（{history.length}件）</summary><p className="mt-2 text-xs text-slate-600">判定の訂正はシフト自体を元に戻しません。必要ならシフトも手動で直してください。</p><div className="mt-3 space-y-2">{history.map(item => <div key={item.id} className="rounded-xl border p-3 text-sm"><strong>{item.date || "この期間"}　{item.employeeName}　{item.type}{item.type === "出勤希望" && item.desiredWorkStart && item.desiredWorkEnd ? `（${item.desiredWorkStart}〜${item.desiredWorkEnd}）` : ""}</strong><span className="ml-2 font-bold">{item.status}</span>{item.comment && <p className="mt-1 whitespace-pre-wrap text-slate-600">{item.comment}</p>}{item.rejectionReason && <p className="text-red-600">却下理由：{item.rejectionReason}</p>}<div className="mt-2 flex flex-wrap gap-2">{item.status !== "申請中" && item.status !== "取消" && <button disabled={loading} className="rounded-lg border px-3 py-1" onClick={() => setTarget({request:item,status:"申請中"})}>申請中に戻す</button>}{item.status !== "承認" && item.status !== "取消" && <button disabled={loading} className="rounded-lg border px-3 py-1" onClick={() => setTarget({request:item,status:"承認"})}>承認にする</button>}{item.status !== "却下" && item.status !== "取消" && <button disabled={loading} className="rounded-lg border px-3 py-1" onClick={() => setTarget({request:item,status:"却下"})}>却下にする</button>}<button disabled={loading} className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-red-700" onClick={() => setDeleting(item)}><Trash2 className="h-4 w-4" />申請を削除</button></div></div>)}</div></details>
    {target && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h3 className="text-lg font-black">{target.status === "申請中" ? "この希望を申請中に戻しますか？" : target.status === "承認" ? "この希望を承認しますか？" : "この希望を却下しますか？"}</h3><p className="mt-2 text-sm text-slate-600">{target.request.employeeName}　{target.request.date}　{target.request.type}</p>{target.status === "却下" && <label className="mt-4 block text-sm font-bold">却下理由（任意）<textarea className="mt-2 min-h-24 w-full rounded-xl border p-3 font-normal" value={reason} onChange={e=>setReason(e.target.value)} placeholder="例：人員調整のため" /></label>}<div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" onClick={()=>{setTarget(null);setReason("");}}>戻る</Button><Button className={target.status === "却下" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"} disabled={loading} onClick={()=>void confirm()}>{target.status === "申請中" ? "申請中に戻す" : target.status === "承認" ? "承認する" : "却下する"}</Button></div></div></div>}
    {deleting && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h3 className="text-lg font-black text-red-700">この申請を削除しますか？</h3><p className="mt-2 text-sm">{deleting.date || "この期間"}　{deleting.employeeName}　{deleting.type}（{deleting.status}）</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{deleting.comment}</p><p className="mt-3 text-xs text-red-700">申請と紐づくお知らせ・履歴を画面から削除します。Notionの記録はゴミ箱へ移動します。</p><div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setDeleting(null)}>戻る</Button><Button className="bg-red-600 hover:bg-red-700" disabled={loading} onClick={async () => { try { await onDelete(deleting); setDeleting(null); } catch (_) { /* エラー表示は親側。 */ } }}>削除する</Button></div></div></div>}
  </section>;
}
