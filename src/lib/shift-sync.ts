import { gasFetch } from "./gas-fetch";
import { templateStorage } from "./template-storage";
import { Employee, DayShift, ShiftType, GlobalRemark } from "../types";
import { SHIFT_OPTIONS } from "../constants";
import { isWorkTime } from "./work-time-options";
import { getShiftSession } from "./auth-sync";

// この店舗専用GAS（Web App）のURL。既存デプロイの新バージョンならURLは変わりません。

const SHIFT_API_KEY_STORAGE = "shift_api_key";
export function hasShiftApiKey(): boolean {
  return Boolean(templateStorage.getItem(SHIFT_API_KEY_STORAGE));
}

export function saveShiftApiKey(value: string): void {
  templateStorage.setItem(SHIFT_API_KEY_STORAGE, value.trim());
}

export async function clearTemplateShiftRemarks(preview: boolean): Promise<{ count?: number; cleared: number; remaining?: number }> {
  const json = await callGas("clearTemplateShiftRemarks", { preview });
  return { count: json.count, cleared: json.cleared, remaining: json.remaining };
}

/** 全端末で共有される、期間単位のシフト確定状態を取得します。 */
export async function fetchShiftPeriodStatus(periodStart: string): Promise<boolean> {
  let timeoutId: number | undefined;
  try {
    const json = await Promise.race([
      callGas("getShiftPeriodStatus", { periodStart }, false),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error("確定状態の確認がタイムアウトしました")), 10000);
      })
    ]);
    return Boolean(json.locked);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

/** 期間単位の確定／作成中状態をGASへ保存します。 */
export async function saveShiftPeriodStatus(periodStart: string, periodEnd: string, locked: boolean): Promise<boolean> {
  const json = await callGas("saveShiftPeriodStatus", { periodStart, periodEnd, locked });
  return Boolean(json.locked);
}

interface ShiftRow {
  id: string;
  "従業員ID"?: string;
  "社員名"?: string;
  "日付"?: { start?: string; end?: string } | null;
  "シフト内容"?: string;
  "休憩時間"?: string;
  "実働時間"?: string;
  "備考"?: string;
  "全体補足種別"?: string;
  "全体補足内容"?: string;
}

export interface ShiftFetchResult {
  employees: Employee[];
  globalRemarks: GlobalRemark[];
  supportsGlobalRemarks: boolean;
}

async function callGas(action: string, extra: Record<string, unknown> = {}, requireApiKey = true): Promise<any> {
  const shiftApiKey = templateStorage.getItem(SHIFT_API_KEY_STORAGE) || "";
  if (requireApiKey && !shiftApiKey) throw new Error("管理者用の接続キーが未設定です。設定の「その他設定」で登録してください。");
  const response = await gasFetch({
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // GAS doPostはContent-Typeに関わらずpostData.contentsを見るため、プリフライトを避けるtext/plainにしています
    body: JSON.stringify({ action, shiftApiKey, sessionToken: getShiftSession()?.token || "", ...extra })
  });
  if (!response.ok) {
    throw new Error("サーバーとの通信に失敗しました（status " + response.status + "）。少し待ってから「再保存」を押してください。");
  }
  const json = await response.json();
  if (!json.success) {
    throw new Error(json.message || "サーバーでエラーが発生しました");
  }
  return json;
}

/** シフト内容の文字列を、アプリ内の shift / customShiftText の形に変換します。 */
function parseShiftContent(content: string): { shift: ShiftType; customShiftText?: string } {
  if (!content) return { shift: "" };
  if (((SHIFT_OPTIONS as string[]).includes(content) && content !== "任意入力") || isWorkTime(content)) {
    return { shift: content as ShiftType };
  }
  return { shift: "任意入力", customShiftText: content };
}

/** shift / customShiftText を、Notionに保存する1本の文字列に変換します。 */
function buildShiftContent(shift: ShiftType, customShiftText?: string): string {
  if (shift === "任意入力") return customShiftText || "";
  return shift || "";
}

/**
 * サーバー（Notionのシフト管理DB）から全件取得し、Employee[] の形に組み立てます。
 * 取得できない場合（オフライン・未設定など）は null を返します（呼び出し側でlocalStorageにフォールバック）。
 */
export async function fetchShiftsFromServer(existingEmployees: Employee[], throwOnError = false): Promise<ShiftFetchResult | null> {
  try {
    // 閲覧はログイン済みの全端末で利用でき、保存系は接続キーも必須です。
    const json = await callGas("getShifts", {}, false);
    const rows: ShiftRow[] = json.shifts || [];

    const serverNames = new Set<string>();
    rows.forEach(row => {
      if (row["社員名"]) serverNames.add(row["社員名"]);
    });

    // 既存の従業員リスト（表示順・id）をなるべく維持しつつ、名前をキーにマージします。
    // ただし「サーバーに同名データが無く、ローカルにもシフトが1件も無い」＝一度も使われていない
    // 仮の初期従業員（従業員A〜E など）は、サーバーにデータがある場合は表示から外します。
    const byName = new Map<string, Employee>();
    const byId = new Map<string, Employee>();
    existingEmployees.forEach(emp => {
      if (/^従業員[A-EＡ-Ｅ]$/.test(String(emp.name || "").trim())) return;
      const hasLocalShift = emp.shifts.some(s => s.shift || s.customShiftText || s.comment);
      if (serverNames.size > 0 && !serverNames.has(emp.name) && !hasLocalShift) {
        return; // 未使用の仮従業員はスキップ
      }
      const clean = { ...emp, shifts: [] };
      byName.set(emp.name, clean);
      byId.set(emp.id, clean);
    });

    rows.forEach(row => {
      const name = row["社員名"] || "";
      if (!name) return;
      const dateStart = row["日付"]?.start;
      if (!dateStart) return;
      const employeeId = row["従業員ID"] || "";
      if (!byName.has(name) && (!employeeId || !byId.has(employeeId))) {
        const created = {
          id: employeeId || Math.random().toString(36).substr(2, 9),
          name,
          shifts: []
        };
        byName.set(name, created);
        byId.set(created.id, created);
      }
      const emp = (employeeId && byId.get(employeeId)) || byName.get(name)!;
      const { shift, customShiftText } = parseShiftContent(row["シフト内容"] || "");
      const dayShift: DayShift = {
        date: dateStart,
        shift,
        customShiftText,
        breakTime: row["休憩時間"] || "",
        workTime: row["実働時間"] || "",
        comment: ""
      };
      emp.shifts.push(dayShift);
    });

    const allowedRemarkTypes = new Set<string>();
    const remarksByDate = new Map<string, GlobalRemark>();
    rows.forEach(row => {
      const date = row["日付"]?.start?.slice(0, 10) || "";
      const type = row["全体補足種別"] || "";
      if (!date || !allowedRemarkTypes.has(type) || remarksByDate.has(date)) return;
      remarksByDate.set(date, {
        date,
        type: type as GlobalRemark["type"],
        text: row["全体補足内容"] || ""
      });
    });

    const supportsGlobalRemarks = rows.some(row => Object.prototype.hasOwnProperty.call(row, "全体補足種別"));
    return { employees: Array.from(byName.values()), globalRemarks: Array.from(remarksByDate.values()), supportsGlobalRemarks };
  } catch (error) {
    console.error("シフトのサーバー取得に失敗しました（オフラインの可能性）:", error);
    if (throwOnError) throw error;
    return null;
  }
}

/**
 * 表示中の1か月分を、ブラウザからGASへ1リクエストで送ります。
 * 空欄も含めて送るため、Notion側にある既存シフトの削除も反映できます。
 */
// 前回までに保存できた内容（社員ID|日付 → 内容の署名）。これと比べて、変わったマスだけを送ります。
// サーバーの内容を読み込めた後でだけ使い（読み込めていないときは今までどおり全部を送る）、
// 変更が無ければ通信しません。
let savedBaseline: Map<string, string> | null = null;
const rowKey = (employeeId: string, date: string) => `${employeeId}|${date}`;
// 勤務内容が空のマスは「何も無い」と同じ扱いにします（サーバーも空のマスは記録しないため）。
const rowSignature = (name: string, shiftContent: string, breakTime: string, workTime: string) =>
  shiftContent ? [name, shiftContent, breakTime, workTime].join("\u0001") : "";

export function seedSavedBaseline(employees: Employee[] | null) {
  if (!employees) { savedBaseline = null; return; }
  const next = new Map<string, string>();
  employees.forEach(employee => employee.shifts.forEach(shift => {
    const signature = rowSignature(employee.name, buildShiftContent(shift.shift, shift.customShiftText), shift.breakTime || "", shift.workTime || "");
    if (signature) next.set(rowKey(employee.id, shift.date.slice(0, 10)), signature);
  }));
  savedBaseline = next;
}

export async function saveMonthToServer(
  employees: Employee[],
  _globalRemarks: GlobalRemark[],
  periodStart: string,
  periodEnd: string,
  updatedBy?: string
): Promise<{ created: number; updated: number; cleared: number }> {
  const shifts = employees.flatMap(employee => {
    const shiftsByDate = new Map(employee.shifts.map(shift => [shift.date.slice(0, 10), shift]));
    const rows = [];
    const cursor = new Date(`${periodStart}T00:00:00`);
    const last = new Date(`${periodEnd}T00:00:00`);

    while (cursor <= last) {
      // toISOString()は日本時間の深夜を前日のUTCへ変換してしまうため、端末の暦日をそのまま組み立てます。
      const date = [
        cursor.getFullYear(),
        String(cursor.getMonth() + 1).padStart(2, "0"),
        String(cursor.getDate()).padStart(2, "0")
      ].join("-");
      const dayShift = shiftsByDate.get(date);
      rows.push({
        "従業員ID": employee.id,
        "社員名": employee.name,
        "日付": date,
        "シフト内容": dayShift ? buildShiftContent(dayShift.shift, dayShift.customShiftText) : "",
        "休憩時間": dayShift?.breakTime || "",
        "実働時間": dayShift?.workTime || "",
        "備考": "",
        "全体補足種別": "",
        "全体補足内容": ""
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  });

  const signatureOf = (row: (typeof shifts)[number]) => rowSignature(String(row["社員名"]), String(row["シフト内容"]), String(row["休憩時間"]), String(row["実働時間"]));
  const changed = savedBaseline ? shifts.filter(row => signatureOf(row) !== (savedBaseline!.get(rowKey(String(row["従業員ID"]), String(row["日付"]))) ?? "")) : shifts;
  if (savedBaseline && changed.length === 0) return { created: 0, updated: 0, cleared: 0 };
  // 変更分だけの保存は「サーバーの控えに保存→すぐ返事」にして、Notionへの書き込みは裏で行う（速くするため）。
  const json = await callGas("saveShiftMonth", { periodStart, periodEnd, updatedBy: updatedBy || "", shifts: changed, ...(savedBaseline ? { partial: true, defer: true } : {}) });
  if (json.queued) { notePendingQueued(Number(json.pending || 0)); }
  if (savedBaseline) shifts.forEach(row => {
    const key = rowKey(String(row["従業員ID"]), String(row["日付"]));
    const signature = signatureOf(row);
    if (signature) savedBaseline!.set(key, signature); else savedBaseline!.delete(key);
  });
  return {
    created: Number(json.created || 0),
    updated: Number(json.updated || 0),
    cleared: Number(json.cleared || 0)
  };
}


// ===== Notionへの反映待ち（裏書き込み）の管理 =====
// 保存すると、サーバーはまず自分の控えに内容を保存して返事をし、Notionへの書き込みはこの「反映」で行います。
// 反映に失敗したら控えは残り、画面に警告を出して自動で再試行します（他の端末で開いたときも同じ警告が出ます）。
export interface PendingStatus { count: number; flushing: boolean; lastError: string; oldestAt: string }
let pendingStatus: PendingStatus = { count: 0, flushing: false, lastError: "", oldestAt: "" };
const pendingListeners = new Set<(status: PendingStatus) => void>();
let flushTimer: number | undefined;
let retryStep = 0;
const RETRY_DELAYS = [4000, 10000, 20000, 40000, 60000];

function setPending(patch: Partial<PendingStatus>) {
  pendingStatus = { ...pendingStatus, ...patch };
  pendingListeners.forEach(listener => listener(pendingStatus));
}
export function subscribePending(listener: (status: PendingStatus) => void): () => void {
  pendingListeners.add(listener);
  listener(pendingStatus);
  return () => { pendingListeners.delete(listener); };
}
function notePendingQueued(count: number) {
  setPending({ count: Math.max(count, 1) });
  scheduleFlush(1500);
}
export function scheduleFlush(delayMs: number) {
  if (!hasShiftApiKey()) return;
  if (flushTimer !== undefined) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { flushTimer = undefined; void flushPendingNow(); }, delayMs);
}
export async function flushPendingNow(): Promise<boolean> {
  if (pendingStatus.flushing || !hasShiftApiKey()) return false;
  setPending({ flushing: true });
  try {
    const json = await callGas("flushShiftPending");
    retryStep = 0;
    setPending({ count: Number(json.pending || 0), flushing: false, lastError: "", oldestAt: "" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notionへ反映できませんでした";
    setPending({ flushing: false, lastError: message, count: Math.max(pendingStatus.count, 1) });
    scheduleFlush(RETRY_DELAYS[Math.min(retryStep, RETRY_DELAYS.length - 1)]);
    retryStep += 1;
    return false;
  }
}
/** 開いたときに、サーバーに反映待ちが残っていないか確認する（残っていれば反映する）。 */
export async function checkPendingOnServer(): Promise<void> {
  try {
    const json = await callGas("getShiftPendingStatus", {}, false);
    const count = Number(json.count || 0);
    setPending({ count, lastError: String(json.lastError || ""), oldestAt: String(json.oldestAt || "") });
    if (count > 0) scheduleFlush(300);
  } catch { /* 古いGASなどでは何もしない */ }
}
