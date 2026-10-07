import { gasFetch } from "../lib/gas-fetch";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getManagementApiKey, getShiftSession } from "@/lib/auth-sync";
import { templateStorage } from "@/lib/template-storage";

export const RESET_PENDING_KEY = "template_reset_pending_v1";
type Preview = { token: string; counts: { label: string; count: number }[]; employees: number; operatorName: string };
type PendingReset = { preview: Preview; archived: number };

function readPendingReset(): PendingReset | null {
  try {
    const value: unknown = JSON.parse(templateStorage.getItem(RESET_PENDING_KEY) || "null");
    if (value && typeof value === "object" && "preview" in value && "archived" in value &&
      typeof value.archived === "number" && value.preview && typeof value.preview === "object" && "token" in value.preview && typeof value.preview.token === "string") {
      return value as PendingReset;
    }
  } catch { /* no saved reset */ }
  return null;
}

async function resetRequest(action: string, payload: Record<string, unknown>) {
  const session = getShiftSession();
  if (session?.role !== "admin") throw new Error("管理者としてログインしてください。");
  const apiKey = getManagementApiKey();
  if (!apiKey) throw new Error("その他設定で管理者用の接続キーを設定してください。");
  const response = await gasFetch({
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, sessionToken: session.token, apiKey, ...payload })
  });
  if (!response.ok) throw new Error("GASへの通信に失敗しました。");
  const result = await response.json();
  if (!result.success) throw new Error(result.message || "処理に失敗しました。");
  return result;
}

export function TemplateResetSettings({ onBack, onProgress }: { onBack: () => void; onProgress: (progress: { running: boolean; archived: number; completed: boolean }) => void }) {
  const saved = readPendingReset();
  const [preview, setPreview] = useState<Preview | null>(saved?.preview || null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [archived, setArchived] = useState(saved?.archived || 0);
  const [failure, setFailure] = useState("");
  const [statusReady, setStatusReady] = useState(!saved);
  const [statusChecking, setStatusChecking] = useState(false);

  const verifyPending = async () => {
    const pending = readPendingReset();
    if (!pending) return;
    setStatusChecking(true); setFailure("");
    try {
      const result = await resetRequest("getTemplateResetStatus", { token: pending.preview.token });
      const count = Math.max(pending.archived, Number(result.archived) || 0);
      setArchived(count);
      setStatusReady(true);
      templateStorage.setItem(RESET_PENDING_KEY, JSON.stringify({ preview: pending.preview, archived: count }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "進行状況を確認できませんでした。";
      setFailure(message);
      // 通信エラーでは確認情報を残し、復帰後に再試行できるようにする。
      if (message.includes("期限が切れ") || message.includes("確認が無効")) {
        templateStorage.removeItem(RESET_PENDING_KEY);
        setPreview(null);
        setArchived(0);
      }
    } finally { setStatusChecking(false); }
  };
  useEffect(() => {
    if (saved) void verifyPending();
    // 起動時だけ、前回の進行状況を確認する。
  }, []);

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const inspect = async () => {
    setBusy(true); setFailure("");
    try {
      const result = await resetRequest("previewTemplateReset", {});
      setPreview(result as Preview);
      setStatusReady(true);
      setArchived(0); setConfirmation("");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "対象を確認できませんでした。");
    } finally { setBusy(false); }
  };

  const run = async () => {
    if (!preview || !statusReady || confirmation !== "初期化" || running) return;
    setRunning(true); setBusy(true); setFailure("");
    templateStorage.setItem(RESET_PENDING_KEY, JSON.stringify({ preview, archived }));
    onProgress({ running: true, archived, completed: false });
    let count = archived;
    try {
      for (;;) {
        const result = await resetRequest("runTemplateReset", { token: preview.token, confirmation: "初期化" });
        count += Number(result.archived || 0);
        setArchived(count);
        templateStorage.setItem(RESET_PENDING_KEY, JSON.stringify({ preview, archived: count }));
        onProgress({ running: true, archived: count, completed: false });
        if (result.done) break;
      }
      templateStorage.clearBusinessData();
      setPreview(null);
      onProgress({ running: false, archived: count, completed: true });
      toast.success("業務データを初期化しました。ログイン画面に戻ります。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "処理を中断しました。進行状況を確認してから再開してください。";
      setFailure(message.includes("504") ? "Notionが一時的に応答しませんでした。進行状況を確認してから再開してください。" : message);
      setStatusReady(false);
      templateStorage.setItem(RESET_PENDING_KEY, JSON.stringify({ preview, archived: count }));
      setArchived(count);
      onProgress({ running: false, archived: count, completed: false });
      toast.error("初期化が中断しました。画面の進行状況を確認してください。");
    } finally { setBusy(false); setRunning(false); }
  };

  return <div className="space-y-4">
    <Button variant="outline" size="sm" onClick={onBack} disabled={busy || running}><ArrowLeft className="mr-1 h-4 w-4" />設定へ戻る</Button>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><Trash2 className="h-5 w-5" />データ初期化</CardTitle>
        <CardDescription>シフト、希望届、店舗の公開設定、従業員・勤務時間設定を初期化します。現在ログインしている操作員1名と、接続情報・ログインID・パスワードは残します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-slate-600">Notionのページはアーカイブされ、完全削除はしません。ほかの端末は、次に開いたときに自動で初期化されます。</p>
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">件数が多い場合、完了まで数分以上かかります。完了表示が出るまで画面を閉じないでください。</p>
        {!preview && <Button variant="outline" disabled={busy} onClick={() => void inspect()}>{busy ? "件数を確認中…" : "対象件数を確認"}</Button>}
        {failure && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{failure}{preview && statusReady && " 同じ画面から再開できます。"}</p>}
        {preview && !statusReady && <Button variant="outline" disabled={statusChecking} onClick={() => void verifyPending()}>{statusChecking ? "進行状況を確認中…" : "進行状況を再確認"}</Button>}
        {preview && <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-semibold text-red-800">初期化対象（複製用DB）</p>
          <ul className="list-inside list-disc">{preview.counts.map(item => <li key={item.label}>{item.label}: {item.count >= 100 ? "100件以上" : `${item.count}件`}</li>)}<li>従業員登録: {preview.employees}件（無効・非表示の登録も含む。{preview.operatorName}のみ残す）</li></ul>
          {archived > 0 && <p role="status" className="text-base font-black text-red-800">処理済み: {archived}件</p>}
          <label className="block space-y-2"><span className="font-bold text-red-800">実行する場合は「初期化」と入力</span><Input value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} placeholder="初期化" /></label>
          <Button variant="destructive" disabled={busy || !statusReady || confirmation !== "初期化"} onClick={() => void run()}>{busy ? `初期化実行中… ${archived}件処理済み` : archived ? "初期化を再開" : "業務データを初期化"}</Button>
        </div>}
      </CardContent>
    </Card>
  </div>;
}
