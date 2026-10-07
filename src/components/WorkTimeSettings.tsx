import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ABBREVIATIONS, WorkTimeOption, validateWorkTimes, workTimeValue } from "../lib/work-time-options";

interface Props { values: WorkTimeOption[]; ready: boolean; loading?: boolean; confirmed?: boolean; onConfirm?: () => void; onSave: (values: WorkTimeOption[]) => Promise<void>; onPendingChange?: (pending: boolean) => void; }
type SaveStatus = "idle" | "saving" | "saved" | "error";

export function WorkTimeSettings({ values, ready, loading = false, confirmed = true, onConfirm, onSave, onPendingChange }: Props) {
  const [draft, setDraft] = useState(values);
  const [editing, setEditing] = useState<WorkTimeOption | null>(null);
  const [freeInput, setFreeInput] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [pending, setPending] = useState(false);
  useEffect(() => { onPendingChange?.(pending || Boolean(editing)); return () => onPendingChange?.(false); }, [pending, editing, onPendingChange]);
  useEffect(() => { if (!pending && status !== "saving") setDraft(values); }, [values, pending, status]);
  useEffect(() => {
    if (!pending && !editing) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending, editing]);

  const persist = async (items: WorkTimeOption[], closeEditor = false) => {
    const message = validateWorkTimes(items);
    if (message) { setError(message); return; }
    setDraft(items);
    setPending(true);
    setError("");
    setStatus("saving");
    try {
      await onSave(items);
      setPending(false);
      setStatus("saved");
      if (closeEditor) setEditing(null);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "保存できませんでした。");
    }
  };
  const move = (index: number, direction: number) => {
    const items = [...draft];
    [items[index], items[index + direction]] = [items[index + direction], items[index]];
    void persist(items);
  };
  const openEditor = (item: WorkTimeOption) => {
    setEditing({ ...item });
    setFreeInput(Boolean(item.abbreviation && !ABBREVIATIONS.includes(item.abbreviation)));
    setError("");
    setStatus("idle");
  };
  const commit = () => {
    if (!editing) return;
    const items = draft.some(item => item.id === editing.id) ? draft.map(item => item.id === editing.id ? editing : item) : [...draft, editing];
    void persist(items, true);
  };
  const saving = status === "saving";
  const custom = editing && editing.abbreviation && !ABBREVIATIONS.includes(editing.abbreviation);
  return <section data-work-time-settings className="space-y-4">
    <p className="text-sm text-slate-600">シフト入力のプルダウンに出す「勤務時間」を決めます。追加・変更・削除は、押したその場で自動的に保存されます（保存ボタンはありません）。</p>
    {!confirmed && onConfirm && !editing && <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3"><p className="text-sm font-bold text-amber-950">最初から入っている勤務時間でよければ、このまま使えます。</p><Button className="mt-2" variant="outline" onClick={onConfirm}>このままでOK（確認ずみにする）</Button></div>}
    {!ready && loading && <p role="status" className="text-sm font-bold text-slate-600">共通設定を読み込み中…</p>}
    {!ready && !loading && <p role="alert" className="text-sm font-bold text-red-700">共通設定に接続できません。画面を再読み込みしてください。つながるまで変更できません。</p>}
    <div role="status" aria-live="polite" className={`rounded-lg p-3 text-sm font-bold ${status === "error" ? "bg-red-50 text-red-700" : saving ? "bg-amber-50 text-amber-900" : status === "saved" ? "bg-green-50 text-green-800" : "bg-slate-50 text-slate-600"}`}>
      {status === "error" ? <>保存できていません。{error} {!editing && <Button variant="outline" size="sm" className="ml-2" disabled={!ready} onClick={() => void persist(draft)}>再試行</Button>}</> : saving ? "共通設定に保存中…画面を閉じないでください" : status === "saved" ? "✓ 保存しました。PC・スマホに反映されます。" : "自動で保存されます。変更すると、ここに結果が出ます。"}
    </div>
    <div className="space-y-2">{draft.map((item, index) => <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
      <span className="text-xs font-bold text-slate-500">{index + 1}</span><strong className="flex-1 text-sm">{workTimeValue(item)}{item.nextDay && "（翌日まで）"}{item.abbreviation && <small className="ml-2 text-blue-700">{item.abbreviation}</small>}</strong>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" disabled={!ready || saving || !!editing || pending} checked={item.visible} onChange={event => void persist(draft.map(row => row.id === item.id ? { ...row, visible: event.target.checked } : row))} />表示</label>
      <Button aria-label={`${workTimeValue(item)}を上へ`} variant="outline" size="sm" disabled={!ready || index === 0 || saving || !!editing || pending} onClick={() => move(index, -1)}>↑</Button>
      <Button aria-label={`${workTimeValue(item)}を下へ`} variant="outline" size="sm" disabled={!ready || index === draft.length - 1 || saving || !!editing || pending} onClick={() => move(index, 1)}>↓</Button>
      <Button variant="outline" size="sm" disabled={!ready || saving || !!editing || pending} onClick={() => openEditor(item)}>編集</Button>
      <Button variant="outline" size="sm" disabled={!ready || saving || !!editing || pending} className="text-red-600" onClick={() => void persist(draft.filter(row => row.id !== item.id))}>削除</Button>
    </div>)}</div>
    <Button variant="outline" disabled={!ready || saving || !!editing || pending} onClick={() => openEditor({ id: crypto.randomUUID(), start: "09:00", end: "18:00", nextDay: false, abbreviation: "", visible: true })}>＋ 新しい勤務時間を追加</Button>
    <p className="text-xs text-slate-500">非表示・削除しても、入力済みのシフトは残ります。「有休」「休み」「任意入力」は常に選べます。</p>
    {editing && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="work-time-editor-title" className="max-h-[90vh] w-full max-w-md space-y-4 overflow-auto rounded-2xl bg-white p-5">
      <h2 id="work-time-editor-title" className="text-lg font-black">勤務時間の入力</h2>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">出勤（始まる時刻）<input type="time" className="mt-1 h-11 w-full rounded-lg border px-3" value={editing.start} disabled={saving} onChange={event => setEditing({ ...editing, start: event.target.value, nextDay: editing.end < event.target.value })} /></label><label className="text-sm font-bold">退勤（終わる時刻）<input type="time" className="mt-1 h-11 w-full rounded-lg border px-3" value={editing.end} disabled={saving} onChange={event => setEditing({ ...editing, end: event.target.value, nextDay: event.target.value < editing.start })} /></label></div>
      {editing.nextDay && <p className="rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-700">退勤が出勤より早い時刻なので、「次の日の朝まで働く」勤務（夜勤など）として登録します。</p>}
      <label className="block text-sm font-bold">シフト表に出す短い名前（なくてもOK）<select className="mt-1 h-11 w-full rounded-lg border bg-white px-3" value={freeInput || custom ? "custom" : editing.abbreviation} disabled={saving} onChange={event => { setFreeInput(event.target.value === "custom"); setEditing({ ...editing, abbreviation: event.target.value === "custom" ? "" : event.target.value }); }}><option value="">つけない</option>{ABBREVIATIONS.map(value => <option key={value}>{value}</option>)}<option value="custom">自由入力</option></select></label>
      {(freeInput || custom) && <input aria-label="短い名前の自由入力" maxLength={20} placeholder="例：短時間、応援" className="h-11 w-full rounded-lg border px-3" value={editing.abbreviation} disabled={saving} onChange={event => setEditing({ ...editing, abbreviation: event.target.value })} />}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.visible} disabled={saving} onChange={event => setEditing({ ...editing, visible: event.target.checked })} />シフト入力の選択肢に出す</label>
      <p className="rounded-lg bg-blue-50 p-3 text-sm">シフト表ではこう見えます：{workTimeValue(editing)}{editing.abbreviation && `（${editing.abbreviation}）`}</p>
      <p role="status" className={`rounded-lg p-3 text-sm font-bold ${status === "error" ? "bg-red-50 text-red-700" : status === "saving" ? "bg-amber-50 text-amber-900" : "bg-amber-50 text-amber-900"}`}>
        {status === "error" ? `保存できていません。${error} 修正して再試行してください。` : error ? `まだ完了していません。${error}` : saving ? "共通設定に保存中…" : "まだ追加・変更は完了していません。下のボタンで共通保存してください。"}
      </p>
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => { setEditing(null); setError(""); setStatus(pending ? "error" : "idle"); }}>戻る</Button><Button disabled={saving || !ready} onClick={commit}>{saving ? "保存中…" : "追加・変更を確定"}</Button></div>
    </div></div>}
  </section>;
}
