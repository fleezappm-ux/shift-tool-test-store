import { useState, type FormEvent } from "react";
import { isValidGasUrl, saveGasUrl } from "../lib/gas-config";

/** はじめて開いたときに、お店の接続先（ウェブアプリのURL）を1回だけ入れてもらう画面。 */
export function GasUrlSetup({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidGasUrl(value)) { setError("URLの形が違います。「https://script.google.com/macros/s/…/exec」で終わるURLを入れてください。"); return; }
    try { saveGasUrl(value); onDone(); } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} data-gas-setup className="w-full max-w-md space-y-4 rounded-3xl border bg-white p-7 shadow-xl">
        <h1 className="text-xl font-black text-slate-900">お店につなぐ</h1>
        <p className="text-sm leading-6 text-slate-600">はじめに1回だけ、お店の「ウェブアプリのURL」を入れてください。お店の管理者から教えてもらった、<span className="font-bold">https://script.google.com/…/exec</span> で終わるURLです。</p>
        <input
          type="url" inputMode="url" autoComplete="off" required
          className="h-12 w-full rounded-xl border px-3 text-sm" placeholder="https://script.google.com/macros/s/…/exec"
          value={value} onChange={e => { setValue(e.target.value); setError(""); }}
        />
        {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
        <button className="h-12 w-full rounded-xl bg-blue-700 font-black text-white">つなぐ</button>
        <p className="text-xs text-slate-500">管理者から「リンク」をもらったときは、そのリンクを開くだけでつながります。</p>
      </form>
    </main>
  );
}
