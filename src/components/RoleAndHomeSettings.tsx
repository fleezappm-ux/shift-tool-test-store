import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HomeLayout, ShiftRole } from "../lib/employee-master-sync";
import { SaveStatus } from "./SaveStatus";
import { useUnsavedGuard } from "../lib/unsaved";

export function RoleAndHomeSettings({ roles, layout, onSaveRoles, onSaveLayout }: {
  roles: ShiftRole[]; layout: HomeLayout;
  onSaveRoles: (value: ShiftRole[]) => Promise<void>;
  onSaveLayout: (value: HomeLayout) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState(roles);
  const [homeDraft, setHomeDraft] = useState(layout);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDrafts(roles), [roles]);
  useEffect(() => setHomeDraft(layout), [layout]);
  const rolesDirty = JSON.stringify(drafts) !== JSON.stringify(roles);
  const layoutDirty = JSON.stringify(homeDraft) !== JSON.stringify(layout);
  useUnsavedGuard("role-master", rolesDirty);
  useUnsavedGuard("home-layout", layoutDirty);
  const position = (id: string) => !homeDraft.visible ? "none" : homeDraft.columns[0]?.includes(id) ? "left" : homeDraft.columns[1]?.includes(id) ? "right" : "none";
  const setPosition = (id: string, value: string) => setHomeDraft(current => ({
    ...current,
    columns: [0, 1].map(index => {
      const remaining = (current.columns[index] || []).filter(item => item !== id);
      return value === (index === 0 ? "left" : "right") ? [...remaining, id] : remaining;
    })
  }));
  return <div className="space-y-5">
    <section id="role-editor" className="rounded-2xl border bg-white p-5">
      <h3 className="font-black">役職プルダウン編集</h3>
      <p className="mt-1 text-xs text-slate-600">名前だけ変更しても登録済み従業員との紐付けは維持されます。役職は業種に合わせて自由に追加・変更できます（例：店長・事務・スタッフ）。</p>
      <div className="mt-4 space-y-2">{drafts.map((role, index) => <div key={role.id} className="flex items-center gap-2">
        <b className="w-7 text-center text-slate-500">{index + 1}</b><Input aria-label={`役職${index + 1}`} value={role.name} onChange={event => setDrafts(current => current.map(item => item.id === role.id ? { ...item, name: event.target.value } : item))} />
        <Button variant="outline" disabled={index === 0} onClick={() => setDrafts(current => { const copy = [...current]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; return copy; })}>↑</Button>
        <Button variant="outline" disabled={index === drafts.length - 1} onClick={() => setDrafts(current => { const copy = [...current]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; return copy; })}>↓</Button>
        <Button variant="ghost" className="text-red-700" disabled={drafts.length === 1} onClick={() => window.confirm(`「${role.name}」を削除しますか？登録済み従業員の役職は未設定になります。`) && setDrafts(current => current.filter(item => item.id !== role.id))}>削除</Button>
      </div>)}</div>
      <SaveStatus className="mt-4" dirty={rolesDirty} saving={busy} />
      <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => setDrafts(current => [...current, { id: crypto.randomUUID(), name: "" }])}>＋ 役職を追加</Button>
        <Button disabled={busy || !rolesDirty} onClick={async () => { if (drafts.some(role => !role.name.trim())) return toast.error("役職名を入力してください"); setBusy(true); try { await onSaveRoles(drafts); toast.success("役職を保存しました"); } catch(error) { toast.error(error instanceof Error ? error.message : "役職を保存できませんでした"); } finally { setBusy(false); } }}>役職を保存</Button></div>
    </section>
    <section className="rounded-2xl border bg-white p-5">
      <h3 className="font-black">ホーム「本日の出勤一覧」の表示設定</h3>
      <p className="mt-1 text-xs text-slate-600">スマホは最大2列。各役職を左・右・非表示から選びます。役職が1種類なら1列に広がります。</p>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={homeDraft.visible} onChange={event => setHomeDraft(current => ({ ...current, visible: event.target.checked }))} />出勤一覧を表示する</label>
      {homeDraft.visible && <div className="mt-4 space-y-2">{roles.map(role => <label key={role.id} className="flex items-center justify-between gap-3 text-sm"><span>{role.name}</span><select className="h-10 rounded-lg border bg-white px-3" value={position(role.id)} onChange={event => setPosition(role.id, event.target.value)}><option value="left">左列</option><option value="right">右列</option><option value="none">表示しない</option></select></label>)}</div>}
      <SaveStatus className="mt-4" dirty={layoutDirty} saving={busy} />
      <Button className="mt-3" disabled={busy || !layoutDirty} onClick={async () => { setBusy(true); try { await onSaveLayout(homeDraft); toast.success("ホームの表示を保存しました"); } catch(error) { toast.error(error instanceof Error ? error.message : "表示設定を保存できませんでした"); } finally { setBusy(false); } }}>表示設定を保存</Button>
    </section>
  </div>;
}

