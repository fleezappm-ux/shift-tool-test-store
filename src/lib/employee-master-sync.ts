import { gasFetch } from "./gas-fetch";
import { Employee, EmployeeRole } from "../types";
import { getShiftSession } from "./auth-sync";
import { getManagementApiKey } from "./auth-sync";


export interface EmployeeMasterItem {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
  active: boolean;
  aliases: string[];
  role?: EmployeeRole;
  roleId?: string;
}

export interface ShiftRole { id: string; name: string }
export interface HomeLayout { visible: boolean; columns: string[][] }
export const DEFAULT_ROLES: ShiftRole[] = [{ id: "manager", name: "店長" }, { id: "clerk", name: "事務" }, { id: "staff", name: "スタッフ" }];
export const DEFAULT_HOME_LAYOUT: HomeLayout = { visible: true, columns: [["manager", "clerk"], ["staff"]] };

async function call(action: string, payload: Record<string, unknown> = {}) {
  const sessionToken = getShiftSession()?.token || "";
  const response = await gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action, sessionToken, ...payload }) });
  if (!response.ok) throw new Error(`通信に失敗しました（${response.status}）`);
  const json = await response.json();
  if (!json.success) throw new Error(json.message || "従業員マスタを処理できませんでした");
  return json;
}

// サーバーから最後に読み込んだ従業員マスタの「版」。これが無い（＝最新を読めていない）ときは保存させません。
let masterRevision: string | null = null;
export const hasLatestEmployeeMaster = () => masterRevision !== null;

export async function fetchEmployeeMaster(): Promise<EmployeeMasterItem[]> {
  // Never submit cached shift names to GAS: its legacy read endpoint auto-registers them.
  const json = await call("getShiftEmployeeMaster", { names: [] });
  if (typeof json.revision === "string") masterRevision = json.revision;
  return Array.isArray(json.employees) ? json.employees : [];
}

export async function saveEmployeeMaster(employees: EmployeeMasterItem[]): Promise<EmployeeMasterItem[]> {
  if (masterRevision === null) throw new Error("最新の従業員一覧を読み込めていません。通信を確認して、画面を開き直してください。（保存はされていません）");
  const json = await call("saveShiftEmployeeMaster", { employees, revision: masterRevision });
  if (typeof json.revision === "string") masterRevision = json.revision;
  return Array.isArray(json.employees) ? json.employees : employees;
}

// 従業員のPINを消します（本人は次のログインで決め直します）。管理者ログイン＋接続キーが必要です。
export async function resetEmployeePin(employeeId: string): Promise<void> {
  await call("resetShiftEmployeePin", { employeeId, shiftApiKey: getManagementApiKey() });
}

export async function fetchShiftRoles(): Promise<ShiftRole[]> {
  const json = await call("getShiftRoleMaster");
  return Array.isArray(json.roles) ? json.roles : DEFAULT_ROLES;
}
export async function saveShiftRoles(roles: ShiftRole[]): Promise<{ roles: ShiftRole[]; employees: EmployeeMasterItem[] }> {
  const json = await call("saveShiftRoleMaster", { roles, shiftApiKey: getManagementApiKey() });
  if (typeof json.revision === "string") masterRevision = json.revision;
  return { roles: json.roles, employees: json.employees };
}
export async function fetchHomeLayout(): Promise<HomeLayout> {
  const json = await call("getShiftHomeLayout");
  return json.layout || DEFAULT_HOME_LAYOUT;
}
export async function saveHomeLayout(layout: HomeLayout): Promise<HomeLayout> {
  const json = await call("saveShiftHomeLayout", { layout, shiftApiKey: getManagementApiKey() });
  return json.layout;
}

export function mergeEmployeesWithMaster(source: Employee[], master: EmployeeMasterItem[]): Employee[] {
  return master.filter(item => item.active && !/^従業員[A-EＡ-Ｅ]$/.test(String(item.name || "").trim())).sort((a, b) => a.displayOrder - b.displayOrder).map(item => {
    const names = new Set([item.name, ...(item.aliases || [])]);
    const matches = source.filter(employee => employee.id === item.id || names.has(employee.name));
    return {
      id: item.id,
      name: item.name,
      displayName: item.displayName || item.name,
      displayOrder: item.displayOrder,
      active: item.active,
      aliases: item.aliases || [],
      role: item.role || matches.find(employee => employee.role)?.role,
      roleId: item.roleId,
      shifts: matches.flatMap(employee => employee.shifts)
    };
  });
}
