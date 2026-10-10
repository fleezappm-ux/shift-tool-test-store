import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUILTIN_OFF_TYPES, MAX_EXTRA_OFF_TYPES, RESERVED_SHIFT_WORDS } from "../lib/off-types";

/** 勤務時間設定の中の「休みの種類」。休み・有休・代休は最初から使え、お店ごとに追加もできます（例：特別休暇・夏季休暇・振替休日）。 */
export function OffTypeSettings({ extra, onSave }: { extra: string[]; onSave: (types: string[]) => Promise<void> }) {
  const [draft, setDraft] = useState(extra);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!busy) setDraft(extra); }, [extra, busy]);
  const persist = async (next: string[], done: string) => {
    setBusy(true);
    try { await onSave(next); setDraft(next); toast.success(done); }
    catch (error) { toast.error(error instanceof Error ? error.message : "休みの種類を保存できませんでした"); }
    finally { setBusy(false); }
  };
  const add = async () => {
    const value = name.trim();
    if (!value) return toast.error("追加する休みの名前を入れてください");
    if (value.length > 10) return toast.error("名前は10文字までです");
    if ((BUILTIN_OFF_TYPES as readonly string[]).includes(value) || RESERVED_SHIFT_WORDS.includes(value)) return toast.error(`「${value}」は最初から使えます`);
    if (/[～~:：0-9０-９]/.test(value)) return toast.error("数字や時刻のような文字は使えません（例：特別休暇）");
    if (draft.includes(value)) return toast.error("同じ名前がすでにあります");
    if (draft.length >= MAX_EXTRA_OFF_TYPES) return toast.error(`追加できるのは${MAX_EXTRA_OFF_TYPES}件までです`);
    await persist([...draft, value], `「${value}」を追加しました。シフトのプルダウンに出ます`);
    setName("");
  };
  return <section className="mt-6 space-y-3 rounded-2xl border-2 border-purple-300 bg-white p-5" aria-label="休みの種類">
    <h3 className="font-black text-purple-900">休みの種類（プルダウンに出る「休み」）</h3>
    <p className="text-xs leading-5 text-slate-600">シフトの入力で選べる「休み系」の一覧です。<b>休み・有休・代休</b>は最初から使えます。お店で使う休みがほかにあれば、ここで追加します（例：特別休暇、夏季休暇、振替休日）。追加すると、シフトのプルダウンと、勤務パターンの選択肢に出ます。</p>
    <div className="flex flex-wrap gap-2">
      {BUILTIN_OFF_TYPES.map(type => <span key={type} className="rounded-full border bg-slate-50 px-3 py-1 text-sm font-bold text-slate-700">{type}<small className="ml-1 font-normal text-slate-400">（最初から）</small></span>)}
      {draft.map(type => <span key={type} className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-sm font-bold text-purple-900">{type}<button type="button" aria-label={`${type}を削除`} disabled={busy} className="ml-1 rounded-full p-0.5 hover:bg-purple-200" onClick={() => { if (window.confirm(`「${type}」を一覧から削除しますか？\nすでにシフトに入っている「${type}」の文字は、そのまま残ります。`)) void persist(draft.filter(item => item !== type), `「${type}」を削除しました`); }}><Trash2 className="h-3.5 w-3.5" /></button></span>)}
    </div>
    <div className="flex gap-2"><Input aria-label="追加する休みの名前" className="h-11" placeholder="追加する休みの名前（例：特別休暇）" maxLength={10} value={name} disabled={busy} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void add(); }} /><Button type="button" className="h-11 shrink-0 bg-purple-700 font-bold text-white hover:bg-purple-800" disabled={busy} onClick={() => void add()}><Plus className="mr-1 h-4 w-4" />追加</Button></div>
    <p className="text-xs text-slate-500">追加・削除は、押したその場で自動的に保存されます。「有休」だけは、有給の日数に数えます。ほかの休みは、出勤日数にも有給日数にも数えません。</p>
  </section>;
}
