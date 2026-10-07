import { useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { fetchShiftLoginEmployees, loginShift, ShiftLoginEmployee, ShiftSession, getManagementApiKey, saveManagementApiKey, checkManagementApiKey } from "../lib/auth-sync";
import { EmployeeMasterItem } from "../lib/employee-master-sync";

export function ShiftLogin({ employees, onLogin }: { employees: EmployeeMasterItem[]; onLogin: (session: ShiftSession) => void }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [operatorId, setOperatorId] = useState("");
  // 前回の端末内の名簿は、サーバーから取れなかった時だけの予備にします（初期化後の古い名前を出さないため）。
  const [operatorOptions, setOperatorOptions] = useState<ShiftLoginEmployee[]>([]);
  const [listState, setListState] = useState<"loading" | "ready" | "failed">("loading");
  const loadOperators = () => {
    setListState("loading");
    fetchShiftLoginEmployees().then(items => {
      setOperatorOptions(items.filter(item => !/^従業員[A-EＡ-Ｅ]$/.test(item.displayName || item.name)));
      setListState("ready");
    }).catch(() => { setOperatorOptions(employees); setListState("failed"); });
  };
  useEffect(() => { loadOperators(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [loading, setLoading] = useState(false);
  // 管理者でログインしたとき、この端末にまだ接続キーが無ければ、ここで1回だけ入力を促す
  const [keyStep, setKeyStep] = useState<ShiftSession | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const saveKeyAndStart = async () => {
    if (!keyStep) return;
    if (!keyValue.trim()) { setKeyMessage("接続キーを入力してください"); return; }
    setLoading(true);
    saveManagementApiKey(keyValue);
    const result = await checkManagementApiKey(keyValue);
    setLoading(false);
    if (result.ok) { onLogin(keyStep); return; }
    saveManagementApiKey("");
    setKeyMessage(result.message);
  };
  const submit = async () => {
    if (!loginId.trim() || !password || !operatorId) return toast.error("ID・パスワード・操作員を入力してください");
    const operator = operatorOptions.find(item => item.id === operatorId);
    if (!operator) return toast.error("操作員を選択してください");
    setLoading(true);
    try {
      const session = await loginShift(loginId.trim(), password, operator.id, operator.displayName || operator.name);
      setPassword("");
      if (session.role === "admin" && !getManagementApiKey()) { setKeyStep(session); return; }
      onLogin(session);
    } catch (error) { toast.error(error instanceof Error ? error.message : "ログインできませんでした"); }
    finally { setLoading(false); }
  };
  if (keyStep) return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-5 font-sans">
    <section className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-7 shadow-2xl shadow-blue-950/10">
      <h1 className="text-xl font-black text-slate-900">管理者用の接続キーを入れてください</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">この端末で管理者の操作（シフトの保存など）をするために必要です。入れるのは、この端末で最初の1回だけです。</p>
      <Input type="password" value={keyValue} onChange={event => { setKeyValue(event.target.value); setKeyMessage(""); }} onKeyDown={event => { if (event.key === "Enter") void saveKeyAndStart(); }} placeholder="管理者用の接続キー" autoComplete="off" className="mt-4 h-12 rounded-xl" />
      {keyMessage && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{keyMessage}</p>}
      <Button className="mt-5 h-12 w-full rounded-xl font-bold" disabled={loading} onClick={() => void saveKeyAndStart()}>{loading ? "確認中…" : "保存して始める"}</Button>
      <button type="button" className="mt-3 w-full text-center text-sm font-bold text-slate-500" onClick={() => onLogin(keyStep)}>あとで入れる（設定→その他設定）</button>
    </section>
  </main>;
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-5 font-sans">
    <section className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-7 shadow-2xl shadow-blue-950/10">
      <div className="mb-6 flex items-center gap-4"><img className="h-14 w-14 rounded-2xl shadow-sm" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" /><div><span className="text-[11px] font-black tracking-[.18em] text-blue-600">SHIFT</span><h1 className="text-2xl font-black text-slate-900">シフト管理</h1></div></div>
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-950"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><p className="leading-6">一般用または編集者用のIDでログインし、今回操作員の名前を必ず選択してください。</p></div>
      <label className="text-xs font-bold text-slate-600">ログインID</label><Input value={loginId} onChange={event => setLoginId(event.target.value)} autoComplete="username" className="mt-2 h-12 rounded-xl" />
      <label className="mt-4 block text-xs font-bold text-slate-600">パスワード</label><Input type="password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void submit(); }} autoComplete="current-password" className="mt-2 h-12 rounded-xl" />
      <label className="mt-4 block text-xs font-bold text-slate-600">操作員</label>
      <select className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={operatorId} onChange={event => setOperatorId(event.target.value)}>
        <option value="">名前を選択してください</option>
        {operatorOptions.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.displayName || item.name}</option>)}
      </select>
      {listState === "loading" && <p className="mt-2 text-xs text-slate-500">名前の一覧を読み込み中…</p>}
      {listState === "failed" && operatorOptions.filter(item => item.active).length === 0 && <div className="mt-2 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700">名前の一覧を読み込めませんでした（通信が混んでいます）。<button type="button" className="ml-2 rounded-lg border border-red-300 bg-white px-3 py-1 text-red-700" onClick={loadOperators}>もう一度読み込む</button></div>}
      {listState === "ready" && operatorOptions.filter(item => item.active).length === 0 && <p className="mt-2 text-xs font-bold text-red-600">従業員マスタが未設定です。管理者へ確認してください。</p>}
      <Button className="mt-6 h-12 w-full rounded-xl font-bold" disabled={loading} onClick={() => void submit()}><LogIn className="mr-2 h-4 w-4" />{loading ? "確認中…" : "ログイン"}</Button>
      <p className="mt-4 text-center text-[11px] text-slate-400">ID・パスワードを忘れた場合は管理者へ確認してください。</p>
    </section>
  </main>;
}
