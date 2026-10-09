import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, KeyRound, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmployeeMasterItem, ShiftRole, resetEmployeePin } from "../lib/employee-master-sync";
import { SaveStatus } from "./SaveStatus";
import { useUnsavedGuard } from "../lib/unsaved";

export function EmployeeMasterSettings({ employees, roles, onSave, operatorId, loadError = "" }: { employees: EmployeeMasterItem[]; roles: ShiftRole[]; onSave: (items: EmployeeMasterItem[]) => Promise<EmployeeMasterItem[] | void>; operatorId?: string; loadError?: string }) {
  const [drafts, setDrafts] = useState(employees);
  const [saving, setSaving] = useState(false);
  const [pinResetting, setPinResetting] = useState("");
  const resetPin = async (item: EmployeeMasterItem) => {
    const label = item.displayName || item.name;
    if (!window.confirm(`「${label}」のPINをリセットしますか？\n本人は、次にログインするときに新しいPINを決めます。`)) return;
    setPinResetting(item.id);
    try { await resetEmployeePin(item.id); toast.success(`${label}のPINをリセットしました。本人に「次のログインで新しいPINを決めてください」と伝えてください`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "PINをリセットできませんでした"); }
    finally { setPinResetting(""); }
  };
  const signature = (items: EmployeeMasterItem[]) => JSON.stringify(items.map((item, index) => [item.id, item.name.trim(), item.roleId || item.role || "", item.active, index, (item.aliases || []).length]));
  const syncedRef = useRef(employees);
  const [newerFromServer, setNewerFromServer] = useState<EmployeeMasterItem[] | null>(null);
  const dirty = signature(drafts) !== signature(syncedRef.current);
  useUnsavedGuard("employee-master", dirty);
  // 保存前の入力を、裏の更新で消さない。入力中に最新が届いたら、知らせるだけにします。
  useEffect(() => {
    if (signature(employees) === signature(syncedRef.current)) return;
    if (signature(employees) === signature(drafts)) { syncedRef.current = employees; setNewerFromServer(null); return; }
    if (signature(drafts) === signature(syncedRef.current)) { syncedRef.current = employees; setDrafts(employees); setNewerFromServer(null); }
    else setNewerFromServer(employees);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);
  const newRowRef = useRef<string | null>(null);
  useEffect(() => {
    if (!newRowRef.current) return;
    const row = document.querySelector<HTMLElement>(`[data-employee-row="${newRowRef.current}"]`);
    newRowRef.current = null;
    if (row) { row.scrollIntoView({ behavior: "smooth", block: "center" }); row.querySelector<HTMLInputElement>("input")?.focus(); }
  }, [drafts.length]);
  const update = (id: string, patch: Partial<EmployeeMasterItem>) => setDrafts(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  const move = (index: number, direction: -1 | 1) => setDrafts(items => { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= items.length) return items; const next = [...items]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next.map((item, order) => ({ ...item, displayOrder: order + 1 })); });
  const add = () => {
    const unnamed = drafts.find(item => item.active && !item.name.trim());
    if (unnamed) { toast.error("名前が空の行があります。先に名前を入れてください"); newRowRef.current = unnamed.id; setDrafts(items => [...items]); return; }
    const id = crypto.randomUUID();
    newRowRef.current = id;
    setDrafts(items => [...items, { id, name: "", displayName: "", displayOrder: items.length + 1, active: true, aliases: [], roleId: roles[0]?.id || "", role: roles[0]?.name || "" }]);
    toast.success(`${drafts.filter(item => item.active).length + 1}人目の行を追加しました。名前を入れて、いちばん下の「保存」を押してください`);
  };
  const remove = (id: string) => {
    const target = drafts.find(item => item.id === id);
    if (drafts.filter(item => item.active).length <= 1) { toast.error("最後の1人は削除できません。先に別の従業員を登録してください。"); return; }
    if (target && target.id === operatorId) { toast.error("いまログインしている操作員は削除できません。別の操作員でログインし直してから削除してください。"); return; }
    if (!target || !window.confirm(`「${target.displayName || target.name || "新しい従業員"}」を一覧から削除しますか？\n過去のシフトのデータは残ります。`)) return;
    update(id, { active: false });
  };
  const submit = async () => {
    if (drafts.some(item => item.active && !item.name.trim())) return toast.error("名前を入力してください");
    const duplicateNames = drafts.filter(item => item.active).filter((item, index, items) => items.findIndex(other => other.name.trim() === item.name.trim()) !== index);
    if (duplicateNames.length) return toast.error("同じ名前が登録されています");
    setSaving(true);
    try {
      const saved = await onSave(drafts.map((item, index) => {
        // 名前を変えたときだけ、保存ずみの旧名を別名に残します（入力途中の文字は残さない）。
        const before = syncedRef.current.find(base => base.id === item.id);
        const aliases = before && before.name.trim() && before.name.trim() !== item.name.trim() ? [...new Set([...(item.aliases || []), before.name.trim()])] : item.aliases;
        return { ...item, name: item.name.trim(), aliases, displayName: item.name.trim(), displayOrder: index + 1 };
      }));
      if (Array.isArray(saved)) { syncedRef.current = saved; setDrafts(saved); setNewerFromServer(null); }
      toast.success("従業員マスタを保存しました");
    }
    finally { setSaving(false); }
  };
  const activeDrafts = drafts.filter(item => item.active);
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex items-center justify-between gap-3"><div><h4 className="font-black text-slate-900">従業員登録</h4><p className="mt-1 text-xs text-slate-500">この順番が全体シフト・個人選択・Excelへ反映されます。</p></div><Button variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" />従業員追加</Button></div>
    <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900">「役職を選択」の選択肢（薬剤師・事務など）は、このページの<button type="button" className="mx-1 font-bold underline" onClick={() => document.getElementById("role-editor")?.scrollIntoView({ behavior: "smooth", block: "start" })}>下の「役職プルダウン編集」</button>で、自由に追加・変更できます。</p>
    <div className="space-y-2">{activeDrafts.map((item, index) => <div key={item.id} data-employee-row={item.id} className="grid items-center gap-2 rounded-xl border bg-white p-3 sm:grid-cols-[42px_minmax(180px,1fr)_150px_auto]">
      <div className="flex h-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600">{index + 1}</div>
      <Input value={item.name} aria-label="名前" placeholder="名前" onChange={event => { const name = event.target.value; update(item.id, { name, displayName: name }); }} />
      <select className="h-10 rounded-md border bg-white px-3 text-sm" value={item.roleId || roles.find(role => role.name === item.role)?.id || ""} onChange={event => { const role = roles.find(candidate => candidate.id === event.target.value); update(item.id, { roleId: role?.id || "", role: role?.name || "" }); }}><option value="">役職を選択</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
      <div className="flex gap-1"><Button variant="outline" size="icon" aria-label="上へ移動" disabled={index === 0} onClick={() => move(drafts.indexOf(item), -1)}><ArrowUp className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="下へ移動" disabled={index === activeDrafts.length - 1} onClick={() => move(drafts.indexOf(item), 1)}><ArrowDown className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-red-600" aria-label="削除" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button></div>
    </div>)}</div>
    <details className="rounded-xl border border-slate-200 bg-white p-4" data-pin-reset>
      <summary className="cursor-pointer text-sm font-black text-slate-900"><KeyRound className="mr-1 inline h-4 w-4" />PIN（暗証番号）のリセット</summary>
      <p className="mt-2 text-xs leading-5 text-slate-600">ログインのとき、操作員ごとに4〜6桁のPINを入れます。PINを忘れた人は、ここでリセットします。本人は次のログインで、新しいPINを決め直します（管理者にもPINは見えません）。</p>
      <ul className="mt-3 space-y-2">{activeDrafts.filter(item => item.name.trim()).map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="min-w-0 truncate font-bold">{item.displayName || item.name}</span><Button type="button" size="sm" variant="outline" className="min-h-10 shrink-0" disabled={pinResetting === item.id} onClick={() => void resetPin(item)}>{pinResetting === item.id ? "処理中…" : "PINをリセット"}</Button></li>)}</ul>
    </details>
    {activeDrafts.some(item => (item.aliases || []).length > 0) && <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">古い名前の記録（別名）が残っている人がいます。名前を変える前の呼び名を覚えておくためのもので、入力途中の文字などのゴミが混ざることがあります。<Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => { setDrafts(items => items.map(item => ({ ...item, aliases: [] }))); toast.success("別名を空にしました。下の「保存」を押すと確定します"); }}>別名をすべて削除する</Button></div>}
    {loadError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700">{loadError}</p>}
    {newerFromServer && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-900">他の端末で従業員が更新されました。このまま保存すると失敗します。<Button size="sm" variant="outline" className="ml-2" onClick={() => { syncedRef.current = newerFromServer; setDrafts(newerFromServer); setNewerFromServer(null); }}>最新を読み込む（入力中の変更は消えます）</Button></div>}
    <SaveStatus dirty={dirty} saving={saving} />
    <div className={(dirty || saving) ? "h-20 md:hidden" : "hidden"} /><Button className={`fixed inset-x-4 bottom-[76px] z-40 h-12 font-bold shadow-xl md:sticky md:inset-x-auto md:bottom-2 md:z-10 md:w-full ${(dirty || saving) ? "" : "max-md:hidden"}`} disabled={saving || !!loadError || !dirty} onClick={() => void submit()}><Save className="mr-2 h-4 w-4" />{saving ? "保存中…" : "従業員マスタを保存"}</Button>
  </section>;
}
