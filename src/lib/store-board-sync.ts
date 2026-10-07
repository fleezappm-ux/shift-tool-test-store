import { gasFetch } from "./gas-fetch";
import { templateStorage } from "./template-storage";
import { getShiftSession } from "./auth-sync";

export type BoardVisibility = "immediate" | "after_approval" | "private";

const SHIFT_API_KEY_STORAGE = "shift_api_key";

async function call(action: string, extra: Record<string, unknown> = {}) {
  const response = await gasFetch({
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, sessionToken: getShiftSession()?.token || "", shiftApiKey: templateStorage.getItem(SHIFT_API_KEY_STORAGE) || "", ...extra })
  });
  if (!response.ok) throw new Error(`通信に失敗しました（${response.status}）`);
  const json = await response.json();
  if (!json.success) throw new Error(json.message || "掲示板公開設定を処理できませんでした");
  return json;
}

export async function fetchBoardVisibility(): Promise<BoardVisibility> {
  const json = await call("getShiftStoreBoardVisibility");
  const value = json.visibility;
  return value === "after_approval" || value === "private" ? value : "immediate";
}

export async function saveBoardVisibility(visibility: BoardVisibility): Promise<BoardVisibility> {
  const json = await call("saveShiftStoreBoardVisibility", { visibility });
  const value = json.visibility;
  return value === "after_approval" || value === "private" ? value : "immediate";
}

export async function fetchCorrectionVisibility(): Promise<"all" | "private"> {
  const json = await call("getShiftCorrectionVisibility");
  return json.visibility === "all" ? "all" : "private";
}
export async function saveCorrectionVisibility(visibility: "all" | "private"): Promise<"all" | "private"> {
  const json = await call("saveShiftCorrectionVisibility", { visibility });
  return json.visibility === "all" ? "all" : "private";
}

export interface SharedStoreSettings { storeName: string; showStoreNameOnHome: boolean }
export async function fetchStoreSettings(): Promise<SharedStoreSettings> {
  const json = await call("getShiftStoreSettings");
  return { storeName: String(json.settings?.storeName || ""), showStoreNameOnHome: json.settings?.showStoreNameOnHome === true };
}
export async function saveStoreSettings(settings: SharedStoreSettings): Promise<SharedStoreSettings> {
  const json = await call("saveShiftStoreSettings", { settings });
  return { storeName: String(json.settings?.storeName || ""), showStoreNameOnHome: json.settings?.showStoreNameOnHome === true };
}
