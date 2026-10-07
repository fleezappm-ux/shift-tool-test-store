import { gasFetch } from "./gas-fetch";
import { getManagementApiKey, getShiftSession } from "./auth-sync";
import { WorkTimeOption } from "./work-time-options";
class NetworkError extends Error {}
async function call(action: string, extra: Record<string, unknown> = {}) {
  let response: Response;
  try {
    response = await gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action, sessionToken: getShiftSession()?.token || "", shiftApiKey: getManagementApiKey(), ...extra }) });
  } catch (error) {
    if (error instanceof TypeError) throw new NetworkError("通信が途中で切れました。電波のよい場所で、もう一度お試しください。");
    throw error;
  }
  if (!response.ok) throw new Error(`勤務時間設定の通信に失敗しました（${response.status}）`);
  const json = await response.json();
  if (!json.success) throw new Error(json.message || "勤務時間設定を保存できませんでした");
  return json;
}
export async function fetchWorkTimeMaster(): Promise<{ items: WorkTimeOption[]; revision: string }> { return (await call("getShiftWorkTimeMaster")).master; }
export async function saveWorkTimeMaster(items: WorkTimeOption[], revision: string): Promise<{ items: WorkTimeOption[]; revision: string }> {
  try {
    return (await call("saveShiftWorkTimeMaster", { items, revision })).master;
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    // 返事だけ届かなかった場合は、サーバーに保存されていることがあります。最新を取り直して確かめます。
    try {
      const latest = await fetchWorkTimeMaster();
      const same = (a: WorkTimeOption[], b: WorkTimeOption[]) => JSON.stringify(a.map(item => [item.id, item.start, item.end, !!item.nextDay, item.abbreviation || "", item.visible !== false])) === JSON.stringify(b.map(item => [item.id, item.start, item.end, !!item.nextDay, item.abbreviation || "", item.visible !== false]));
      if (same(latest.items, items)) return latest;
    } catch { /* 取り直せないときは元のエラーを出す */ }
    throw error;
  }
}
