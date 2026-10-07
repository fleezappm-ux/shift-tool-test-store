import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "./SaveStatus";
import { useUnsavedGuard } from "../lib/unsaved";

interface Props<L extends string, N extends string, C extends string> {
  leave: L; notice: N; correction: C;
  onSaveLeave: (value: L) => Promise<void>;
  onSaveNotice: (value: N) => Promise<N>;
  onSaveCorrection: (value: C) => Promise<C>;
}

const select = "mt-2 h-11 w-full rounded-xl border bg-white px-3";

// 3つの公開設定。それぞれ「保存ずみ／まだ保存していない」を表示します。
export function BoardSettings<L extends string, N extends string, C extends string>({ leave, notice, correction, onSaveLeave, onSaveNotice, onSaveCorrection }: Props<L, N, C>) {
  const [leaveDraft, setLeaveDraft] = useState(leave);
  const [noticeDraft, setNoticeDraft] = useState(notice);
  const [correctionDraft, setCorrectionDraft] = useState(correction);
  const [busy, setBusy] = useState("");
  useEffect(() => setLeaveDraft(leave), [leave]);
  useEffect(() => setNoticeDraft(notice), [notice]);
  useEffect(() => setCorrectionDraft(correction), [correction]);
  const dirtyLeave = leaveDraft !== leave, dirtyNotice = noticeDraft !== notice, dirtyCorrection = correctionDraft !== correction;
  useUnsavedGuard("board-leave", dirtyLeave);
  useUnsavedGuard("board-notice", dirtyNotice);
  useUnsavedGuard("board-correction", dirtyCorrection);
  const run = async (key: string, task: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try { await task(); toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "保存できませんでした"); } finally { setBusy(""); }
  };
  const saveButton = (key: string, dirty: boolean, label: string, task: () => Promise<unknown>, message: string) => <>
    <SaveStatus className="mt-3" dirty={dirty} saving={busy === key} />
    <Button className="mt-2 h-11 w-full font-bold" disabled={!dirty || busy !== ""} onClick={() => void run(key, task, message)}><Save className="mr-2 h-4 w-4" />{busy === key ? "保存中…" : label}</Button>
  </>;
  return <div className="space-y-4">
    <div><label className="block text-sm font-bold">休み希望の公開設定<select className={select} value={leaveDraft} onChange={event => setLeaveDraft(event.target.value as L)}><option value="immediate">提出と同時に全員へ公開</option><option value="after_approval">管理者確認後に全員へ公開</option><option value="private">本人と編集者だけに表示</option></select></label>
      {saveButton("leave", dirtyLeave, "休み希望の公開設定を保存", () => onSaveLeave(leaveDraft), "休み希望の公開設定を保存しました")}</div>
    <div className="border-t pt-4"><label className="block text-sm font-bold">管理者からのお知らせ設定<select className={select} value={noticeDraft} onChange={event => setNoticeDraft(event.target.value as N)}><option value="all">全員</option><option value="selected">指定従業員</option></select></label>
      {saveButton("notice", dirtyNotice, "管理者からのお知らせ設定を保存", () => onSaveNotice(noticeDraft), "お知らせ公開設定を保存しました")}</div>
    <div className="border-t pt-4"><label className="block text-sm font-bold">確定シフト訂正依頼の公開範囲<select className={select} value={correctionDraft} onChange={event => setCorrectionDraft(event.target.value as C)}><option value="all">全員に表示</option><option value="private">本人と管理者のみ表示</option></select></label>
      {saveButton("correction", dirtyCorrection, "訂正依頼の公開設定を保存", () => onSaveCorrection(correctionDraft), "訂正依頼の公開設定を保存しました")}</div>
  </div>;
}
