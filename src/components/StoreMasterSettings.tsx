import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarPeriodSettings } from "../lib/calendar-period-sync";
import { SaveStatus } from "./SaveStatus";
import { useUnsavedGuard } from "../lib/unsaved";

export interface StoreMaster {
  storeName: string;
  showStoreNameOnHome: boolean;
  leaveRequestBoardVisibility: "immediate" | "after_approval" | "private";
}

export const DEFAULT_STORE_MASTER: StoreMaster = {
  storeName: "", showStoreNameOnHome: false, leaveRequestBoardVisibility: "immediate"
};

interface Props {
  master: StoreMaster;
  onMasterChange: (master: StoreMaster) => void;
  period: CalendarPeriodSettings;
  periodDraft: CalendarPeriodSettings;
  saving: boolean;
  onPeriodDraftChange: (settings: CalendarPeriodSettings) => void;
  onSavePeriod: () => Promise<boolean>;
  onSaveStore: (settings: { storeName: string; showStoreNameOnHome: boolean }) => Promise<void>;
  onOpenBandSettings: () => void;
}

const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const heading = "text-sm font-bold text-slate-900";
const description = "mt-1 text-xs leading-5 text-slate-500";
const field = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function StoreMasterSettings({ master, onMasterChange, period, periodDraft, saving, onPeriodDraftChange, onSavePeriod, onSaveStore, onOpenBandSettings }: Props) {
  const [draft, setDraft] = useState(master);
  useEffect(() => setDraft(master), [master.storeName, master.showStoreNameOnHome]);
  const shownName = (value: string) => value === "店舗名を設定" || value === "薬局名を設定" ? "" : value;
  const dirty = shownName(draft.storeName).trim() !== shownName(master.storeName).trim() || draft.showStoreNameOnHome !== master.showStoreNameOnHome || period.startDay !== periodDraft.startDay || period.endDay !== periodDraft.endDay;
  useUnsavedGuard("store-master", dirty);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await doSave(); } finally { setBusy(false); }
  };
  const doSave = async () => {
    try {
      await onSaveStore({ storeName: draft.storeName.trim(), showStoreNameOnHome: draft.showStoreNameOnHome });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "店舗名を保存できませんでした");
      return;
    }
    if (period.startDay !== periodDraft.startDay || period.endDay !== periodDraft.endDay) {
      if (!await onSavePeriod()) { toast.error("店舗名は保存しましたが、集計期間は保存できませんでした"); return; }
    }
    toast.success("店舗マスタを保存しました（全員の画面に反映されます）");
  };

  return <section className="space-y-4 font-sans text-slate-900">
    <div className={panel}>
      <label className={heading}>店舗名</label><p className={description}>店舗名を入れてください。</p>
      <Input className="mt-3 h-11 rounded-xl text-sm" placeholder="店舗名を入れてください" value={draft.storeName === "店舗名を設定" || draft.storeName === "薬局名を設定" ? "" : draft.storeName} onChange={event => setDraft(current => ({ ...current, storeName: event.target.value }))} />
      <label className="mt-4 flex items-center gap-3 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={draft.showStoreNameOnHome} onChange={event => setDraft(current => ({ ...current, showStoreNameOnHome: event.target.checked }))} />店舗名＋シフトをホームに表示</label>
      <p className={description}>OFFならホームの見出しは「シフト」です。店舗名が空欄の場合も「シフト」になります。</p>
    </div>
    <div className={panel}>
      <h4 className={heading}>シフト表の月の区切り</h4><p className={description}>シフト表を「毎月何日から何日まで」で1か月分とするか選びます。給料の締め日に合わせるお店が多いです。例：毎月1日 → 月末まで／毎月21日 → 翌月20日まで。終了日は自動で決まり、画面・CSV・Excelも同じ期間になります。</p>
      <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <label><span className="mb-2 block text-xs font-bold text-slate-600">この日から始める</span><select className={field} value={periodDraft.startDay} onChange={event => { const startDay = Number(event.target.value); onPeriodDraftChange({ startDay, endDay: startDay === 1 ? 0 : startDay - 1 }); }}>{Array.from({ length: 28 }, (_, index) => index + 1).map(day => <option key={day} value={day}>毎月{day}日</option>)}</select></label>
        <span className="pb-3 text-center text-sm font-bold text-blue-600">→</span>
        <label><span className="mb-2 block text-xs font-bold text-slate-600">終わりの日（自動で決まります）</span><div className={`${field} flex items-center bg-slate-50`}>{periodDraft.endDay === 0 ? "同月末日" : `翌月${periodDraft.endDay}日`}</div></label>
      </div>
    </div>
    <div className={panel}>
      <h4 className={heading}>お店のお休みの日</h4><p className={description}>お店が休みの日（日曜、祝日、年末年始、毎月○日など）を決めます。休みの日はカレンダーに色が付いて、シフト案の自動作成でも休みとして扱えます。「お休みなし」でもOKです。</p>
      <Button variant="outline" className="mt-3" onClick={onOpenBandSettings}>お店のお休みの日を決める →</Button>
      <p className={description}>※ここで変更中の内容は、先に下の「店舗マスタを保存」を押してから移動してください。</p>
    </div>
    <SaveStatus dirty={dirty} saving={busy || saving} />
    <div className={(dirty || busy || saving) ? "h-20 md:hidden" : "hidden"} /><Button className={`fixed inset-x-4 bottom-[76px] z-40 h-12 font-bold shadow-xl md:sticky md:inset-x-auto md:bottom-2 md:z-10 md:w-full ${(dirty || busy || saving) ? "" : "max-md:hidden"}`} disabled={saving || busy || !dirty} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{busy ? "保存中…" : "店舗マスタを保存"}</Button>
  </section>;
}
