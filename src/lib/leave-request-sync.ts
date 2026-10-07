import { gasFetch } from "./gas-fetch";
import { templateStorage } from "./template-storage";
import { CommentVisibility, LeaveRequest, LeaveRequestStatus, LeaveRequestType, PaidLeaveBalance } from "../types";
import { getEmployeeToken, getManagementApiKey, getShiftSession } from "./auth-sync";

const SHIFT_API_KEY_STORAGE = "shift_api_key";

async function request(action: string, payload: Record<string, unknown>, requireKey = false) {
  const shiftApiKey = templateStorage.getItem(SHIFT_API_KEY_STORAGE) || "";
  if (requireKey && !shiftApiKey) throw new Error("管理者用の接続キーが未設定です");
  const response = await gasFetch({
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, sessionToken: getShiftSession()?.token || "", shiftApiKey, ...payload })
  });
  if (!response.ok) throw new Error(`通信に失敗しました（${response.status}）`);
  const json = await response.json();
  if (!json.success) throw new Error(json.message || "処理に失敗しました");
  return json;
}

export async function fetchLeaveRequests(periodStart: string, periodEnd: string): Promise<LeaveRequest[]> {
  const json = await request("getShiftLeaveRequests", { periodStart, periodEnd, shiftApiKey: getManagementApiKey(), employeeToken: getEmployeeToken() });
  return Array.isArray(json.requests) ? json.requests : [];
}

export async function submitLeaveRequest(input: {
  employeeId: string;
  employeeName: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  type: LeaveRequestType;
  comment: string;
  commentVisibility: CommentVisibility;
  desiredWorkStart?: string;
  desiredWorkEnd?: string;
}): Promise<LeaveRequest> {
  const json = await request("saveShiftLeaveRequest", { employeeToken: getEmployeeToken(), request: input });
  return json.request as LeaveRequest;
}

export async function fetchPaidLeaveBalance(employeeId: string): Promise<PaidLeaveBalance | null> {
  const json = await request("getShiftPaidLeaveBalance", { employeeId });
  return json.balance || null;
}

export async function savePaidLeaveBalance(balance: PaidLeaveBalance): Promise<PaidLeaveBalance> {
  const json = await request("saveShiftPaidLeaveBalance", { balance });
  return json.balance as PaidLeaveBalance;
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const json = await request("cancelShiftLeaveRequest", { employeeToken: getEmployeeToken(), id });
  return json.request as LeaveRequest;
}

export async function updateLeaveRequestStatus(id: string, status: LeaveRequestStatus, rejectionReason = ""): Promise<LeaveRequest> {
  const json = await request("updateShiftLeaveRequestStatus", { shiftApiKey: getManagementApiKey(), id, status, rejectionReason });
  return json.request as LeaveRequest;
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  await request("deleteShiftLeaveRequest", { shiftApiKey: getManagementApiKey(), id }, true);
}

export async function updateLeaveRequestWorkTime(id: string, desiredWorkStart: string, desiredWorkEnd: string): Promise<LeaveRequest> {
  const json = await request("updateShiftLeaveRequestWorkTime", { employeeToken: getEmployeeToken(), id, desiredWorkStart, desiredWorkEnd });
  return json.request as LeaveRequest;
}
