import { gasFetch } from "./gas-fetch";
import { getManagementApiKey, getShiftSession } from "./auth-sync";
import { templateStorage } from "./template-storage";
import { setExtraOffTypes } from "./off-types";

const CACHE_KEY = "off_types_extra_v1";
async function call(action: string, extra: Record<string, unknown> = {}) {
  const response = await gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action, sessionToken: getShiftSession()?.token || "", shiftApiKey: getManagementApiKey(), ...extra }) });
  if (!response.ok) throw new Error(`休みの種類の通信に失敗しました（${response.status}）`);
  const json = await response.json();
  if (!json.success) throw new Error(json.message || "休みの種類を保存できませんでした");
  return json;
}
/** 端末に残っている前回の内容を、すぐ使えるようにします（通信を待たずに表示するため）。 */
export function loadCachedOffTypes(): string[] {
  try { const value = JSON.parse(templateStorage.getItem(CACHE_KEY) || "[]"); return setExtraOffTypes(Array.isArray(value) ? value.map(String) : []); } catch { return setExtraOffTypes([]); }
}
export async function fetchOffTypes(): Promise<string[]> {
  const json = await call("getShiftOffTypes");
  const types = setExtraOffTypes(Array.isArray(json.types) ? json.types.map(String) : []);
  templateStorage.setItem(CACHE_KEY, JSON.stringify(types));
  return types;
}
export async function saveOffTypes(types: string[]): Promise<string[]> {
  const json = await call("saveShiftOffTypes", { types });
  const saved = setExtraOffTypes(Array.isArray(json.types) ? json.types.map(String) : types);
  templateStorage.setItem(CACHE_KEY, JSON.stringify(saved));
  return saved;
}
