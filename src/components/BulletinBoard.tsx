import { useState } from "react";
import { templateStorage } from "../lib/template-storage";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";
import { MessageSquareText } from "lucide-react";
import { LeaveRequest } from "../types";
import { AdminNotice, AdminNoticeVisibility } from "../lib/admin-notice-sync";
import { EmployeeMasterItem } from "../lib/employee-master-sync";

export type BoardVisibility = "immediate" | "after_approval" | "private";
export interface BoardPeriod { label: string; locked: boolean; requests: LeaveRequest[]; }
interface Props { periods: BoardPeriod[]; isEditor: boolean; visibility?: BoardVisibility; correctionVisibility?: "all" | "private"; operatorName?: string; operatorId?: string; compact?: boolean; pendingCorrections?: LeaveRequest[]; onResolve?: (request: LeaveRequest) => Promise<void>; onShiftPeriod?: (direction: number) => void; onOpenBoard?: () => void; onBack?: () => void; notices?: AdminNotice[]; employees?: EmployeeMasterItem[]; defaultNoticeVisibility?: AdminNoticeVisibility; onCreateNotice?: (text: string, visibility: AdminNoticeVisibility, ids: string[]) => Promise<void>; onDeleteNotice?: (id: string) => Promise<void> }

export function BulletinBoard({ periods, isEditor, visibility = "immediate", correctionVisibility = "private", operatorName, operatorId, compact = false, pendingCorrections, onResolve, onShiftPeriod, onOpenBoard, onBack, notices = [], employees = [], defaultNoticeVisibility = "all", onCreateNotice, onDeleteNotice }: Props) {
  const [resolving, setResolving] = useState<string | null>(null);
  // 「確認した」お知らせはこの端末だけで履歴へ移す（サーバーのお知らせ自体は消えない）。端末を変えると全部また出る。
  const storageKey = `confirmed_notices_v1:${operatorId || operatorName || "guest"}`;
  const [confirmed, setConfirmed] = useState<string[]>(() => { try { const v = JSON.parse(templateStorage.getItem(storageKey) || "[]"); return Array.isArray(v) ? v.filter(x => typeof x === "string") : []; } catch { return []; } });
  const [showHistory, setShowHistory] = useState(false);
  const saveConfirmed = (next: string[]) => { setConfirmed(next); try { templateStorage.setItem(storageKey, JSON.stringify(next.slice(-300))); } catch { /* 保存できなくても画面は動く */ } };
  const noticeKey = (item: AdminNotice) => `n:${item.id}`;
  // 申請は状態（申請中→承認など）が変わると、また未確認として出る
  const requestKey = (item: LeaveRequest) => `r:${item.id}:${item.status}`;
  const isConfirmed = (key: string) => confirmed.includes(key);
  const confirmKey = (key: string) => saveConfirmed([...confirmed.filter(x => x !== key), key]);
  const restoreKey = (key: string) => saveConfirmed(confirmed.filter(x => x !== key));
  const confirmButton = (key: string, history: boolean) => <button type="button" className="mt-2 min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700" onClick={() => history ? restoreKey(key) : confirmKey(key)}>{history ? "未確認に戻す" : "確認した（履歴へ）"}</button>;
  const [composing, setComposing] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [noticeVisibility, setNoticeVisibility] = useState<AdminNoticeVisibility | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const selectedVisibility = noticeVisibility || defaultNoticeVisibility;
  const renderNotice = (item: AdminNotice, history = false) => <article key={item.id} className={`rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm ${history ? "opacity-70" : ""}`}><div className="flex items-center justify-between gap-3"><strong className="text-blue-800">管理者からのお知らせ</strong>{isEditor && !compact && onDeleteNotice && <button type="button" className="min-h-10 rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => void onDeleteNotice(item.id)}>削除</button>}</div><p className="mt-2 whitespace-pre-wrap break-words">{item.text}</p><small className="mt-2 block text-slate-500">{new Date(item.createdAt).toLocaleDateString("ja-JP")}{isEditor && item.visibility === "selected" ? " · 指定従業員のみ" : ""}</small>{confirmButton(noticeKey(item), history)}</article>;
  const noticeCards = notices.filter(item => !isConfirmed(noticeKey(item))).map(item => renderNotice(item));
  const canShow = (item: LeaveRequest) => {
    if (item.status === "取消") return false;
    const own = item.employeeId && operatorId ? item.employeeId === operatorId : item.employeeName === operatorName;
    if (item.status === "却下") return isEditor && !compact;
    if (item.type === "訂正依頼") return isEditor || own || correctionVisibility === "all";
    if (item.commentVisibility === "editors" && !isEditor && !own) return false;
    if (visibility === "private") return isEditor || own;
    if (visibility === "after_approval") return isEditor || own || item.status === "承認";
    return true;
  };
  const visiblePeriods = compact ? periods.slice(0, 1) : periods.slice(0, 3);
  const corrections = (compact && pendingCorrections ? pendingCorrections : visiblePeriods.flatMap(period => period.requests)).filter(item => item.type === "訂正依頼" && item.status === "申請中" && canShow(item));
  const renderItem = (item: LeaveRequest, history = false) => <article key={item.id} className={`rounded-xl border p-3 text-sm ${item.type === "訂正依頼" && item.status === "申請中" ? "border-red-300 bg-red-50" : "border-amber-100 bg-amber-50"}`}>
    <div className="flex flex-wrap items-center gap-2"><strong>{item.employeeName}</strong><span>{item.date ? format(new Date(`${item.date}T00:00:00`), "M/d（E）", { locale: ja }) : "この期間"}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.type === "訂正依頼" ? "bg-red-200 text-red-800" : "bg-amber-100 text-amber-800"}`}>{item.type}</span>{item.status !== "申請中" && <span className={`text-xs font-bold ${item.status === "却下" ? "text-red-700" : "text-green-700"}`}>{item.status === "承認" ? "承認されました" : item.status === "却下" ? "却下されました" : "対応済み"}</span>}</div>
    {item.comment && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{item.comment}{isEditor && item.commentVisibility === "editors" ? "（編集者のみ）" : ""}</p>}
    {item.type === "出勤希望" && item.desiredWorkStart && item.desiredWorkEnd && <p className="mt-1 text-xs">{item.desiredWorkStart}〜{item.desiredWorkEnd}</p>}
    {item.status === "却下" && item.rejectionReason && <p className="mt-1 text-xs text-red-700">却下理由：{item.rejectionReason}</p>}
    {item.type === "訂正依頼" && item.status === "申請中" && isEditor && onResolve && <button type="button" disabled={resolving === item.id} className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-bold text-red-700" onClick={async () => { setResolving(item.id); try { await onResolve(item); } finally { setResolving(null); } }}>確認した（対応済みにする）</button>}
    {!(item.type === "訂正依頼" && item.status === "申請中") && confirmButton(requestKey(item), history)}
  </article>;
  const historyNotices = notices.filter(item => isConfirmed(noticeKey(item)));
  const historyRequests = visiblePeriods.flatMap(period => period.requests).filter(item => canShow(item) && !(item.type === "訂正依頼" && item.status === "申請中") && isConfirmed(requestKey(item)));
  const historyCount = historyNotices.length + historyRequests.length;
  const historyBlock = historyCount > 0 && <section className="rounded-xl border border-slate-200 bg-white p-3">
    <button type="button" className="w-full text-left text-sm font-bold text-slate-600" onClick={() => setShowHistory(value => !value)}>{showHistory ? "▼" : "▶"} 確認ずみの履歴（{historyCount}件）</button>
    {showHistory && <div className="mt-3 space-y-2">{historyNotices.map(item => renderNotice(item, true))}{historyRequests.map(item => renderItem(item, true))}</div>}
  </section>;
  if (compact) {
    const period = visiblePeriods[0];
    const visible = period?.requests.filter(canShow).filter(item => !(item.type === "訂正依頼" && item.status === "申請中")).filter(item => !isConfirmed(requestKey(item))) || [];
    return <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="home-bulletin-heading bg-amber-50 px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><MessageSquareText className="h-5 w-5 text-amber-600" />お知らせ掲示板</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">対象期間</span>
          <strong className="home-bulletin-period text-base font-black text-amber-900 sm:text-lg">{period?.label || "期間未設定"}</strong>
          {period && <span className={`rounded-full px-2.5 py-1 text-xs font-black ${period.locked ? "bg-blue-100 text-blue-700" : "bg-amber-200 text-amber-800"}`}>{period.locked ? "確定" : "希望受付中"}</span>}
        </div>
      </div>
      <div className="space-y-2 p-4">
        {noticeCards}
        {corrections.length > 0 && <section className="space-y-2"><h3 className="font-black text-red-700">未対応の訂正依頼</h3>{corrections.map(item => renderItem(item))}</section>}
        {visible.map(item => renderItem(item))}
        {!noticeCards.length && !corrections.length && !visible.length && <p className="py-4 text-center text-sm text-slate-400">現在お知らせはありません</p>}
        {historyBlock}
      </div>
      {onOpenBoard && <button type="button" onClick={onOpenBoard} className="w-full border-t border-amber-100 px-5 py-3 text-right text-sm font-bold text-blue-700">お知らせをすべて見る ›</button>}
    </section>;
  }
  return <section className="bulletin-board-page space-y-4">
    <header className="bulletin-page-header rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="bulletin-heading-row flex items-start justify-between gap-2"><h1 className={`flex items-center gap-2 text-xl font-black ${isEditor ? "text-red-700" : "text-slate-900"}`}><MessageSquareText className="h-6 w-6 text-amber-600" />{isEditor ? <span>お知らせ掲示板<span className="whitespace-nowrap">（管理者）</span></span> : "お知らせ掲示板"}</h1>{onBack && <button type="button" onClick={onBack} className="bulletin-back min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-amber-100">← 戻る</button>}</div><p className="mt-1 text-xs text-slate-500">選んだ期間から3期間分のお知らせ（期間は前後に切り替えられます）</p></header>
    {isEditor && onCreateNotice && <section className="rounded-xl border bg-white p-4"><button type="button" className="rounded-lg bg-blue-700 px-4 py-3 font-bold text-white" onClick={() => setComposing(value => !value)}>管理者からのお知らせを作成</button>{composing && <form className="mt-4 space-y-3" onSubmit={async event => { event.preventDefault(); setNoticeSaving(true); try { await onCreateNotice(noticeText, selectedVisibility, selectedIds); setNoticeText(""); setSelectedIds([]); setComposing(false); } finally { setNoticeSaving(false); } }}><textarea required maxLength={1200} className="min-h-28 w-full rounded-lg border p-3" placeholder="お知らせの内容" value={noticeText} onChange={event => setNoticeText(event.target.value)} /><label className="block text-sm font-bold">公開範囲<select className="mt-1 block h-11 w-full rounded-lg border bg-white px-3" value={selectedVisibility} onChange={event => setNoticeVisibility(event.target.value as AdminNoticeVisibility)}><option value="all">全員</option><option value="selected">指定従業員</option></select></label>{selectedVisibility === "selected" && <fieldset className="space-y-2"><legend className="font-bold">対象の従業員</legend>{employees.filter(item => item.active).map(item => <label key={item.id} className="flex gap-2"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={event => setSelectedIds(ids => event.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} />{item.displayName || item.name}</label>)}</fieldset>}<button disabled={noticeSaving || !noticeText.trim() || selectedVisibility === "selected" && !selectedIds.length} className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50">{noticeSaving ? "保存中…" : "お知らせを公開"}</button>{selectedVisibility === "selected" && !selectedIds.length && <p className="text-xs font-bold text-red-700">対象の従業員を1人以上選んでください</p>}</form>}</section>}
    {noticeCards.length > 0 && <section className="space-y-2">{noticeCards}</section>}
    {!compact && <nav className="bulletin-period-nav flex items-center justify-between rounded-xl border bg-white p-3" aria-label="掲示板の表示期間"><button className="min-h-11 whitespace-nowrap" onClick={() => onShiftPeriod?.(-1)}>‹ 前の期間</button><strong>{visiblePeriods.length ? `${visiblePeriods[0].label.split("〜")[0]}〜${visiblePeriods[visiblePeriods.length - 1].label.split("〜")[1]}（${visiblePeriods.length}期間分）` : "期間未設定"}</strong><button className="min-h-11 whitespace-nowrap" onClick={() => onShiftPeriod?.(1)}>次の期間 ›</button></nav>}
    {corrections.length > 0 && <section className="space-y-2"><h2 className="font-black text-red-700">未対応の訂正依頼</h2>{corrections.map(item => renderItem(item))}</section>}
    {visiblePeriods.map(period => { const visible = period.requests.filter(canShow).filter(item => !(item.type === "訂正依頼" && item.status === "申請中")).filter(item => !isConfirmed(requestKey(item))); return <section key={period.label} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3 border-b pb-3"><strong className="text-base font-black">{period.label}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-black ${period.locked ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{period.locked ? "確定" : "希望受付中"}</span></div><div className="mt-3 space-y-2">{visible.length ? visible.map(item => renderItem(item)) : <p className="py-5 text-center text-sm text-slate-400">{period.locked ? "この期間のお知らせはありません" : "まだ休み希望などの提出はありません"}</p>}</div></section>; })}
    {visiblePeriods.length === 0 && corrections.length === 0 && <p className="py-5 text-center text-sm text-slate-400">現在お知らせはありません</p>}
    {historyBlock}
  </section>;
}
