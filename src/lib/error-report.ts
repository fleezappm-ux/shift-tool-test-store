import { gasFetch } from "./gas-fetch";
import { getManagementApiKey, getShiftSession } from "./auth-sync";

// 画面で起きたエラーを、サーバーの「エラー記録」へ送ります（管理者が設定画面で見られます）。
// 送れなくても画面の動きには影響させません。同じ内容は30秒に1回までにします。
const recent = new Map<string, number>();
let sentInWindow = 0;
let windowStart = 0;

export type ErrorLogEntry = { t: string; m: string; w: string; n: number; who: string };

export function reportClientError(error: unknown, where = ""): void {
  try {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    if (/ResizeObserver loop|AbortError|通信できませんでした/.test(message)) return;
    const token = getShiftSession()?.token;
    if (!token) return;
    const key = `${message}|${where}`;
    const now = Date.now();
    if (now - (recent.get(key) || 0) < 30000) return;
    recent.set(key, now);
    if (now - windowStart > 600000) { windowStart = now; sentInWindow = 0; }
    if (++sentInWindow > 10) return;
    void gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "logShiftClientError", sessionToken: token, message, where }) }).catch(() => undefined);
  } catch { /* 記録の失敗は無視する */ }
}

export function installGlobalErrorReporting(): void {
  window.addEventListener("error", event => reportClientError(event.error || event.message, "window"));
  window.addEventListener("unhandledrejection", event => reportClientError(event.reason, "promise"));
}

async function adminCall(action: string, extra: Record<string, unknown> = {}) {
  const response = await gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action, sessionToken: getShiftSession()?.token || "", shiftApiKey: getManagementApiKey(), ...extra }) });
  const json = await response.json();
  if (!json.success) throw new Error(json.message || "処理に失敗しました");
  return json;
}
export async function fetchErrorLog(): Promise<ErrorLogEntry[]> { const json = await adminCall("getShiftErrorLog"); return Array.isArray(json.errors) ? json.errors : []; }
export async function clearErrorLog(): Promise<void> { await adminCall("clearShiftErrorLog"); }
