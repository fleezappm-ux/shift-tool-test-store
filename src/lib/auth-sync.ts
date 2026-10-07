import { gasFetch } from "./gas-fetch";
import { templateStorage } from "./template-storage";

const SESSION_KEY = "shift_app_session";
const API_KEY_KEY = "shift_api_key";
export interface ShiftLoginEmployee { id: string; name: string; displayName: string; active: boolean; }

export interface ShiftSession {
  token: string;
  role: "admin" | "employee";
  employeeId?: string;
  employeeName?: string;
  expiresAt: string;
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await gasFetch({
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`通信に失敗しました（${response.status}）`);
    const json = await response.json();
    if (!json.success) throw new Error(json.message || "認証処理に失敗しました");
    return json;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("ログイン確認がタイムアウトしました。もう一度お試しください");
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function readSession(key: string): ShiftSession | null {
  try {
    const session = JSON.parse(templateStorage.getItem(key) || "null") as ShiftSession | null;
    if (!session?.token || new Date(session.expiresAt).getTime() <= Date.now()) {
      templateStorage.removeItem(key);
      return null;
    }
    return session;
  } catch (_) {
    templateStorage.removeItem(key);
    return null;
  }
}

export const getShiftSession = () => readSession(SESSION_KEY);
export const getEmployeeSession = getShiftSession;
export const getEmployeeToken = () => getShiftSession()?.token || "";
export const getManagementApiKey = () => templateStorage.getItem(API_KEY_KEY) || "";
export const saveManagementApiKey = (value: string) => templateStorage.setItem(API_KEY_KEY, value.trim());

export async function loginShift(loginId: string, password: string, employeeId: string, employeeName: string): Promise<ShiftSession> {
  // 一般用・編集者用をフロントから2本同時送信すると、GAS側でセッション保存が競合します。
  // 認証種別の判定はGAS側の loginShift に一本化し、1回の通信でログインします。
  const json = await call("loginShift", { loginId, password, employeeId, employeeName });
  const session = json.session as ShiftSession;
  templateStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logoutShiftSession() {
  // サーバー側のログインも無効にします（通信できなくても端末側は必ずログアウトします）。
  const token = readSession(SESSION_KEY)?.token;
  templateStorage.removeItem(SESSION_KEY);
  if (token) void call("logoutShift", { sessionToken: token }).catch(() => undefined);
}
export const logoutEmployee = logoutShiftSession;

export async function fetchShiftLoginEmployees(): Promise<ShiftLoginEmployee[]> {
  const json = await call("getShiftLoginEmployees");
  return Array.isArray(json.employees) ? json.employees : [];
}

// 管理者用の接続キーが正しいか、サーバーに確かめます（管理者ログイン中のみ）。
export async function checkManagementApiKey(key: string): Promise<{ ok: boolean; message: string }> {
  const session = getShiftSession();
  if (!session) return { ok: false, message: "ログインし直してください" };
  if (!key.trim()) return { ok: false, message: "接続キーを入力してください" };
  try {
    await call("checkShiftApiKey", { sessionToken: session.token, shiftApiKey: key.trim() });
    return { ok: true, message: "接続できました。この端末で管理者の操作ができます" };
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    if (/認証に失敗/.test(text)) return { ok: false, message: "接続キーが違います。もう一度確認してください" };
    if (/未対応|アクション|不明|unknown/i.test(text)) return { ok: false, message: "サーバー（GAS）が古いままです。新しい版に更新してください" };
    return { ok: false, message: text || "確認できませんでした。通信状況を確認してください" };
  }
}
