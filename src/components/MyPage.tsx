import { useEffect, useState } from "react";
import { CalendarCheck2, ChevronRight, Save, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Employee, LeaveRequest, PaidLeaveBalance } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MyPage({ employee, requests, locked, initialBalance, onSaveBalance, onCancel, onSaveWorkTime }: { employee?: Employee; requests: LeaveRequest[]; locked: boolean; initialBalance: PaidLeaveBalance | null; onSaveBalance: (balance: PaidLeaveBalance) => Promise<void>; onCancel: (id: string) => Promise<void>; onSaveWorkTime: (id: string, start: string, end: string) => Promise<void>; onEdit?: (request: LeaveRequest) => void }) {
  const [balance, setBalance] = useState<PaidLeaveBalance>(() => initialBalance || { employeeId: employee?.id || "", enabled: false, remainingDays: 0, renewalDate: "", grantDays: 0, updatedAt: "" });
  const [remainingDaysInput, setRemainingDaysInput] = useState(String(initialBalance?.remainingDays ?? 0));
  const [grantDaysInput, setGrantDaysInput] = useState(String(initialBalance?.grantDays ?? 0));
  const [showLeaveSettings, setShowLeaveSettings] = useState(false);
  const [workTimes, setWorkTimes] = useState<Record<string, { start: string; end: string }>>({});
  const [savingTime, setSavingTime] = useState<string | null>(null);
  useEffect(() => {
    setBalance(initialBalance || { employeeId: employee?.id || "", enabled: false, remainingDays: 0, renewalDate: "", grantDays: 0, updatedAt: "" });
    setRemainingDaysInput(String(initialBalance?.remainingDays ?? 0));
    setGrantDaysInput(String(initialBalance?.grantDays ?? 0));
  }, [initialBalance, employee?.id]);
  if (!employee) return <p className="p-6 text-center text-slate-500">操作員が見つかりません</p>;
  const mine = requests.filter(item => (item.employeeId ? item.employeeId === employee.id : item.employeeName === (employee.displayName || employee.name)) && item.status !== "取消");
  const save = async () => {
    const remainingDays = remainingDaysInput.trim() === "" ? 0 : Number(remainingDaysInput);
    const grantDays = grantDaysInput.trim() === "" ? 0 : Number(grantDaysInput);
    if (![remainingDays, grantDays].every(value => Number.isFinite(value) && value >= 0 && value * 2 === Math.round(value * 2))) {
      toast.error("日数は0以上で0.5日刻みで入力してください");
      return;
    }
    try {
      const next = { ...balance, remainingDays, grantDays, employeeId: employee.id, updatedAt: new Date().toISOString() };
      await onSaveBalance(next);
      setBalance(next);
      setRemainingDaysInput(String(remainingDays));
      setGrantDaysInput(String(grantDays));
      toast.success("有休情報を反映しました");
    } catch (error) { toast.error(error instanceof Error ? error.message : "有休情報を保存できませんでした"); }
  };

  if (showLeaveSettings) return <div className="space-y-4 pb-6">
    <Button variant="outline" onClick={() => setShowLeaveSettings(false)}>← マイページへ戻る</Button>
    <section className="rounded-2xl border bg-white p-5">
      <h1 className="text-xl font-black">有休詳細設定</h1><p className="mt-1 text-xs text-slate-500">本人の任意入力による参考値です。正式な残日数は会社の管理記録を確認してください。</p>
      <div className="mt-5 grid gap-4">
        <div className="flex items-center justify-between"><strong>有休残数を表示</strong><Button variant={balance.enabled ? "default" : "outline"} onClick={() => setBalance(value => ({ ...value, enabled: !value.enabled }))}>{balance.enabled ? "ON" : "OFF"}</Button></div>
        <label className="text-xs font-bold text-slate-600">残り有休日数<Input type="number" min="0" step="0.5" value={remainingDaysInput} onChange={e => setRemainingDaysInput(e.target.value)} className="mt-1" /></label>
        <label className="text-xs font-bold text-slate-600">更新日<Input type="date" value={balance.renewalDate} onChange={e => setBalance(value => ({ ...value, renewalDate: e.target.value }))} className="mt-1" /></label>
        <label className="text-xs font-bold text-slate-600">付与日数<Input type="number" min="0" step="0.5" value={grantDaysInput} onChange={e => setGrantDaysInput(e.target.value)} className="mt-1" /></label>
        <Button className="h-11 font-bold" onClick={() => void save()}><Save className="mr-2 h-4 w-4" />設定を反映する</Button>
      </div>
    </section>
  </div>;

  return <div className="space-y-4 pb-6">
    <section className="rounded-2xl border bg-white p-5"><div className="mypage-profile-line"><div className="flex items-center gap-3"><UserRound className="h-9 w-9 text-blue-600" /><div><h1 className="text-xl font-black">{employee.displayName || employee.name}</h1><p className="text-sm text-slate-500">{employee.role || "役職未設定"}</p></div></div>{balance.enabled && <span className="mypage-balance-badge">有休残 {balance.remainingDays}日</span>}</div></section>
    <button type="button" className="w-full rounded-2xl border bg-white p-5 text-left" onClick={() => setShowLeaveSettings(true)}><div className="flex items-center justify-between"><div><strong>有休詳細・設定</strong><p className="mt-1 text-xs text-slate-500">残数・更新日・付与日数を設定</p></div><ChevronRight className="h-5 w-5 text-slate-400" /></div></button>
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-black"><CalendarCheck2 className="h-5 w-5 text-blue-600" />有休・休み希望詳細</h2>
      <div className="mt-3 space-y-2">{mine.length ? mine.map(item => {
        const time = workTimes[item.id] || { start: item.desiredWorkStart || "", end: item.desiredWorkEnd || "" };
        return <div key={item.id} className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><strong className="text-sm">{item.date || "この期間"}　{item.type}</strong>{item.comment && <p className="text-xs text-slate-500">{item.comment}</p>}</div>
            <span className={`text-xs font-bold ${item.status === "却下" ? "text-red-600" : item.status === "承認" ? "text-green-700" : "text-amber-600"}`}>{item.status === "却下" ? "却下されました" : item.status}</span>
            {!locked && item.status === "申請中" && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => { if (window.confirm(`${item.date || "この期間"}の${item.type}を取り下げますか？`)) void onCancel(item.id); }}><Trash2 className="h-4 w-4" /></Button>}</div>
          {item.status === "却下" && item.rejectionReason && <p className="mt-2 text-sm text-red-600">理由：{item.rejectionReason}</p>}
          {item.type === "出勤希望" && <div className="mt-2"><p className={`text-xs font-bold ${item.desiredWorkStart && item.desiredWorkEnd ? "text-green-700" : "text-red-600"}`}>{item.desiredWorkStart && item.desiredWorkEnd ? `希望時間 ${item.desiredWorkStart}〜${item.desiredWorkEnd}` : "希望時間未入力・まだ完了していません"}</p>
            {item.status === "申請中" && !locked && <div className="mt-2 flex flex-wrap items-end gap-2"><label className="text-xs">開始<Input type="time" value={time.start} onChange={e => setWorkTimes(prev => ({ ...prev, [item.id]: { ...time, start: e.target.value } }))} /></label><label className="text-xs">終了<Input type="time" value={time.end} onChange={e => setWorkTimes(prev => ({ ...prev, [item.id]: { ...time, end: e.target.value } }))} /></label><Button disabled={savingTime === item.id || !time.start || !time.end || time.start >= time.end} onClick={async () => { setSavingTime(item.id); try { await onSaveWorkTime(item.id, time.start, time.end); toast.success("希望時間を保存しました"); } catch (error) { toast.error(error instanceof Error ? error.message : "保存できませんでした"); } finally { setSavingTime(null); } }}>時間を保存</Button></div>}
          </div>}
        </div>;
      }) : <p className="py-6 text-center text-sm text-slate-500">提出済みの希望はありません</p>}</div>
    </section>
  </div>;
}
