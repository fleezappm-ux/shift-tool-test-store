import { gasFetch } from "./gas-fetch";
import { getManagementApiKey, getShiftSession } from "./auth-sync";

export interface AdminNotice { id: string; text: string; visibility: "all" | "selected"; employeeIds: string[]; createdAt: string }
export type AdminNoticeVisibility = "all" | "selected";

async function call(action: string, payload: Record<string, unknown> = {}) {
  const response = await gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action, sessionToken: getShiftSession()?.token, ...payload }) });
  if (!response.ok) throw new Error(`通信に失敗しました（${response.status}）`);
  const result = await response.json();
  if (!result.success) throw new Error(result.message || "お知らせを処理できませんでした");
  return result;
}
export async function fetchAdminNotices(): Promise<AdminNotice[]> { return (await call("getShiftAdminNotices")).notices || []; }
export async function fetchAdminNoticeVisibility(): Promise<AdminNoticeVisibility> { return (await call("getShiftAdminNoticeVisibility")).visibility || "all"; }
export async function saveAdminNoticeVisibility(visibility: AdminNoticeVisibility): Promise<AdminNoticeVisibility> {
  return (await call("saveShiftAdminNoticeVisibility", { visibility, shiftApiKey: getManagementApiKey() })).visibility;
}
export async function createAdminNotice(text: string, visibility: AdminNoticeVisibility, employeeIds: string[]): Promise<AdminNotice> {
  return (await call("saveShiftAdminNotice", { text, visibility, employeeIds, shiftApiKey: getManagementApiKey() })).notice;
}
export async function removeAdminNotice(id: string): Promise<void> {
  await call("deleteShiftAdminNotice", { id, shiftApiKey: getManagementApiKey() });
}
