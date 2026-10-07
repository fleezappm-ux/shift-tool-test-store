import { useEffect, useState } from "react";
import { isNewVersionAvailable, reloadToLatest } from "../lib/app-version";

// 新しい版が公開されたら、画面の上に知らせます。古い画面のまま使い続けるのを防ぎます。
export function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let stopped = false;
    const check = async () => { if (!stopped && document.visibilityState === "visible" && await isNewVersionAvailable() && !stopped) setAvailable(true); };
    void check();
    const timer = window.setInterval(() => void check(), 5 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);
  if (!available) return null;
  return <div role="alert" className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-3 bg-amber-400 px-3 py-2 text-sm font-bold text-slate-900 shadow">
    新しい版が出ています。更新すると最新の画面になります。
    <button type="button" className="rounded-md bg-slate-900 px-3 py-1.5 text-white" onClick={reloadToLatest}>更新する</button>
  </div>;
}
