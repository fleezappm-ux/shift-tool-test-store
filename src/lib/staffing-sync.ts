import { gasFetch } from "./gas-fetch";
import { StaffingRules } from "../types";
import { getManagementApiKey, getShiftSession } from "./auth-sync";

export const EMPTY_STAFFING_RULES: StaffingRules = { minTotal: [0, 0, 0, 0, 0, 0, 0], roleMins: [], maxConsecutive: 0, people: {}, hours: [null, null, null, null, null, null, null], alwaysRoles: [] };

async function call(action: string, extra: Record<string, unknown> = {}) {
  const response = await gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action, sessionToken: getShiftSession()?.token || "", ...extra }) });
  if (!response.ok) throw new Error("人数の設定の通信に失敗しました");
  const json = await response.json();
  if (!json.success) throw new Error(json.message || "人数の設定を処理できませんでした");
  return json;
}

export async function fetchStaffingRules(): Promise<StaffingRules> {
  const json = await call("getShiftStaffingRules");
  return { ...EMPTY_STAFFING_RULES, ...(json.rules || {}) };
}

export async function saveStaffingRules(rules: StaffingRules): Promise<StaffingRules> {
  const json = await call("saveShiftStaffingRules", { shiftApiKey: getManagementApiKey(), rules });
  return { ...EMPTY_STAFFING_RULES, ...(json.rules || {}) };
}
