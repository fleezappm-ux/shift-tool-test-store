import { gasFetch } from "./gas-fetch";
import { templateStorage } from "./template-storage";

const SEEN_KEY = "reset_epoch_seen";
const RESET_PENDING_KEY = "template_reset_pending_v1";

/**
 * 管理者が「データ初期化」を実行すると、GAS側に初期化の日時が記録されます。
 * 各端末は開いたとき・戻ったときにその日時を確認し、前回と違えば端末内の設定を消して読み込み直します。
 * 通信できないときは何もしません（次の機会に再確認）。
 */
export async function syncResetEpoch(): Promise<void> {
  if (templateStorage.getItem(RESET_PENDING_KEY)) return;
  try {
    const response = await gasFetch({ method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "getShiftResetEpoch" }) });
    if (!response.ok) return;
    const json = await response.json();
    if (!json?.success || typeof json.epoch !== "string") return;
    const seen = templateStorage.getItem(SEEN_KEY);
    if (seen === json.epoch) return;
    const needsClear = json.epoch !== "";
    if (needsClear) templateStorage.clearBusinessData();
    templateStorage.setItem(SEEN_KEY, json.epoch);
    if (needsClear) window.location.reload();
  } catch { /* 通信できないときは次回に確認します */ }
}
