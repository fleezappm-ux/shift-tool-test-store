import { templateStorage } from "../lib/template-storage";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";
import { Send, Trash2 } from "lucide-react";
import { CommentVisibility, Employee, GlobalRemark, LeaveRequest, LeaveRequestType } from "../types";
import { Button } from "@/components/ui/button";

const TYPES: LeaveRequestType[] = ["有給希望", "休み希望", "出勤希望", "午前休希望", "午後休希望"];
const HELP_STORAGE_KEY = "shift-leave-help-dismissed-v1";

interface Draft {
  type: LeaveRequestType;
  periodStart: string;
  periodEnd: string;
  shiftLabel: string;
}
type DraftMap = Record<string, Draft>;
type WorkTimes = Record<string, { start: string; end: string }>;

interface Props {
  employees: Employee[];
  dates: Date[];
  requests: LeaveRequest[];
  remarks: GlobalRemark[];
  locked: boolean;
  loading: boolean;
  operatorId: string;
  isAdmin: boolean;
  onSubmit: (input: { employeeId: string; employeeName: string; date: string; periodStart: string; periodEnd: string; type: LeaveRequestType; comment: string; commentVisibility: CommentVisibility; desiredWorkStart?: string; desiredWorkEnd?: string }) => Promise<LeaveRequest>;
  onCancel: (id: string) => Promise<void>;
  onSaveWorkTime: (id: string, start: string, end: string) => Promise<void>;
  onPeriodChange: (direction: number) => Promise<void>;
}

function readNote(key: string): { drafts: DraftMap; times: WorkTimes; comment: string } {
  try {
    const saved = JSON.parse(templateStorage.getItem(key) || "null");
    const drafts: DraftMap = {};
    if (saved?.drafts && typeof saved.drafts === "object") {
      Object.entries(saved.drafts).forEach(([date, value]) => {
        const draft = value as Draft;
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && draft && [...TYPES, "訂正依頼"].includes(draft.type)
          && /^\d{4}-\d{2}-\d{2}$/.test(draft.periodStart) && /^\d{4}-\d{2}-\d{2}$/.test(draft.periodEnd)) drafts[date] = draft;
      });
    }
    return { drafts, times: saved?.times && typeof saved.times === "object" ? saved.times : {}, comment: typeof saved?.comment === "string" ? saved.comment : "" };
  } catch { return { drafts: {}, times: {}, comment: "" }; }
}

function shiftLabelFor(employee: Employee | undefined, date: string) {
  const shift = employee?.shifts.find(item => item.date.slice(0, 10) === date);
  return shift?.shift === "任意入力" ? shift.customShiftText || "任意入力" : shift?.shift || "―";
}

export function LeaveRequestView({ employees, dates, requests, remarks, locked, loading, operatorId, isAdmin, onSubmit, onCancel, onSaveWorkTime, onPeriodChange }: Props) {
  const operator = employees.find(item => item.id === operatorId);
  const employeeName = operator?.displayName || operator?.name || "";
  const noteKey = `shift-leave-note-v2-${operatorId}`;
  const [initialNote] = useState(() => readNote(noteKey));
  const [drafts, setDrafts] = useState<DraftMap>(initialNote.drafts);
  const [times, setTimes] = useState<WorkTimes>(initialNote.times);
  const [comment, setComment] = useState(initialNote.comment);
  const [view, setView] = useState<"overall" | "personal">("overall");
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches && templateStorage.getItem(HELP_STORAGE_KEY) !== "yes");
  const [dismissHelp, setDismissHelp] = useState(false);

  useEffect(() => {
    if (operatorId) templateStorage.setItem(noteKey, JSON.stringify({ drafts, times, comment }));
  }, [noteKey, operatorId, drafts, times, comment]);

  const periodStart = dates[0] ? format(dates[0], "yyyy-MM-dd") : "";
  const periodEnd = dates.length ? format(dates[dates.length - 1], "yyyy-MM-dd") : "";
  const periodLabel = dates.length ? `${format(dates[0], "M/d")}〜${format(dates[dates.length - 1], "M/d")}` : "期間未設定";
  const fullPeriodLabel = dates.length ? `${format(dates[0], "yyyy年M月d日")}〜${format(dates[dates.length - 1], "M月d日")}` : "期間未設定";
  const mine = useMemo(() => requests.filter(item => (item.employeeId ? item.employeeId === operatorId : item.employeeName === employeeName) && item.status !== "取消"), [requests, employeeName, operatorId]);
  const requestByDate = new Map<string, LeaveRequest>(mine.filter(item => item.date).map(item => [item.date, item] as [string, LeaveRequest]));
  const draftEntries = (Object.entries(drafts) as [string, Draft][]).sort(([a], [b]) => a.localeCompare(b));
  const hasInvalidTime = draftEntries.some(([date, draft]) => draft.type === "出勤希望" && (!times[date]?.start || !times[date]?.end || times[date].start >= times[date].end));
  const needsComment = draftEntries.some(([, draft]) => draft.type === "訂正依頼");

  const updateDraft = (date: string, value: string) => {
    setError("");
    setDrafts(previous => {
      const next = { ...previous };
      if (!value) delete next[date];
      else next[date] = { type: value as LeaveRequestType, periodStart, periodEnd, shiftLabel: shiftLabelFor(operator, date) };
      return next;
    });
    if (!value) {
      setTimes(previous => { const next = { ...previous }; delete next[date]; return next; });
      setOpenDate(null);
    }
  };

  const submitNote = async () => {
    if (!operator || !draftEntries.length || submitting || hasInvalidTime || (needsComment && !comment.trim())) return;
    setSubmitting(true);
    setError("");
    try {
      const summary = draftEntries.map(([date, draft]) => `${format(new Date(`${date}T00:00:00`), "M/d（E）", { locale: ja })}　${draft.type}`).join("\n");
      if (!window.confirm(`以下の希望を提出します。よろしいですか？\n\n${summary}`)) return;
      for (const [date, draft] of draftEntries) {
        const wantsTime = draft.type === "出勤希望";
        const saved = await onSubmit({ employeeId: operatorId, employeeName, date, periodStart: draft.periodStart, periodEnd: draft.periodEnd, type: draft.type, comment, commentVisibility: "all", ...(wantsTime ? { desiredWorkStart: times[date].start, desiredWorkEnd: times[date].end } : {}) });
        // 古いGASでは提出と同時に時間を保存できないので、そのときだけ時間を別に保存する
        if (wantsTime && saved.desiredWorkStart !== times[date].start) await onSaveWorkTime(saved.id, times[date].start, times[date].end);
        setDrafts(previous => { const next = { ...previous }; delete next[date]; return next; });
        setTimes(previous => { const next = { ...previous }; delete next[date]; return next; });
      }
      setComment("");
      setOpenDate(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "提出に失敗しました。未提出の希望はノートに残っています。");
    } finally { setSubmitting(false); }
  };

  const selectFor = (date: string) => <select
    value={drafts[date]?.type || ""}
    disabled={submitting}
    onClick={event => event.stopPropagation()}
    onChange={event => updateDraft(date, event.target.value)}
    aria-label={`${format(new Date(`${date}T00:00:00`), "M/d")}の希望`}
  >
    <option value="">希望なし</option>
    {locked ? <option value="訂正依頼">訂正依頼</option> : TYPES.map(type => <option key={type} value={type}>{type.replace("希望", "")}</option>)}
  </select>;

  const remarkFor = (date: string) => remarks.find(item => item.date === date);
  const colorFor = (date: Date, key: string) => {
    const remark = remarkFor(key);
    return remark?.color || "";
  };
  const cellFor = (employee: Employee, date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const own = employee.id === operatorId;
    const selected = drafts[key]?.type;
    const existing = own ? requestByDate.get(key) : undefined;
    return <td key={employee.id} className={`leave-shift-cell ${own ? "is-own" : ""} ${selected ? "has-draft" : ""}`}>
      {own ? <>
        <button type="button" className="leave-shift-pick" disabled={submitting} onClick={() => setOpenDate(openDate === key ? null : key)} aria-label={`${format(date, "M/d")}の自分の希望を選ぶ`}>
          <strong>{shiftLabelFor(employee, key)}</strong>{selected ? <small>{selected}</small> : <span className="leave-shift-click-hint">クリックして希望を選ぶ ›</span>}
        </button>
        <span className="leave-desktop-select">{selectFor(key)}</span><span className="leave-mobile-select">{(openDate === key || selected) && selectFor(key)}</span>
        {existing && !selected && <span className="leave-shift-existing">提出済：{existing.type}</span>}
      </> : <span className="leave-shift-other">{shiftLabelFor(employee, key)}</span>}
    </td>;
  };

  return <div className="leave-request-page leave-shift-page space-y-4 pb-5">
    <header className={`leave-shift-hero ${locked ? "is-locked" : ""}`}>
      <div className="leave-shift-brand">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
        <div><h1>希望シフト受付{isAdmin && <span className="leave-admin-desktop">・管理者用</span>}</h1><span>操作員：{employeeName || "未選択"}</span></div>
        <button type="button" className="leave-help-button" onClick={() => setShowHelp(true)}>使い方</button>
      </div>
      <div className="leave-shift-full-period">{fullPeriodLabel}</div>
      <nav className="leave-shift-period-nav" aria-label="希望提出の対象期間">
        <button type="button" onClick={() => void onPeriodChange(-1)} disabled={loading || submitting}>‹ 前の期間</button>
        <strong>{periodLabel}<small>{locked ? "確定済み・訂正依頼のみ" : "希望受付中"}</small></strong>
        <button type="button" onClick={() => void onPeriodChange(1)} disabled={loading || submitting}>次の期間 ›</button>
      </nav>
    </header>

    <div className="leave-shift-switch">
      <button type="button" onClick={() => { setView(view === "overall" ? "personal" : "overall"); setOpenDate(null); }}>
        {view === "overall" ? "個人シフトに切り替え" : "全体シフトに切り替え"} ›
      </button>
      <span className="leave-mobile-instruction">本人の欄を押して希望を選択</span><span className="leave-desktop-instruction">本人の欄をクリックして希望を選択</span>
    </div>

    {locked && <p className="leave-locked-message">確定済みの期間です。希望を変更する場合は「訂正依頼」を選び、コメントに内容を書いてください。</p>}
    {employeeName ? <>
      {view === "overall" ? <div className="leave-shift-table-scroll">
        <table className="leave-shift-table" style={{ "--leave-employee-count": employees.length } as CSSProperties}>
          <thead><tr><th>日付</th><th>曜</th>{employees.map(employee => <th key={employee.id} className={employee.id === operatorId ? "is-own" : ""}>{employee.displayName || employee.name}</th>)}<th className="leave-shift-remark-heading">帯の名前</th></tr></thead>
          <tbody>{dates.map(date => {
            const key = format(date, "yyyy-MM-dd");
            return <tr key={key} className={colorFor(date, key) ? `special-${colorFor(date, key)}` : ""}>
              <th scope="row">{format(date, "M/d")}</th><td>{format(date, "E", { locale: ja })}</td>
              {employees.map(employee => cellFor(employee, date))}
              <td className="leave-shift-remark-cell">{remarkFor(key)?.type || ""}</td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <div className="leave-personal-list">
        <div className="leave-desktop-weekdays" aria-hidden="true"><span>日付</span><span>勤務・希望</span><span>帯の名前</span></div>
        {dates.map(date => {
          const key = format(date, "yyyy-MM-dd");
          const remark = remarkFor(key);
          return <div key={key} className={`leave-personal-row ${colorFor(date, key) ? `special-${colorFor(date, key)}` : ""} ${drafts[key] ? "has-draft" : ""}`}>
            <div className="leave-personal-date"><strong>{format(date, "M/d")}</strong><small>{format(date, "E", { locale: ja })}</small></div>
            <div className="leave-personal-work"><button type="button" disabled={submitting} onClick={() => setOpenDate(openDate === key ? null : key)} aria-label={`${format(date, "M/d")}の自分の希望を選ぶ`}><strong>{shiftLabelFor(operator, key)}</strong>{drafts[key] && <small>{drafts[key].type}</small>}</button><span className="leave-desktop-select">{selectFor(key)}</span><span className="leave-mobile-select">{(openDate === key || drafts[key]) && selectFor(key)}</span>{requestByDate.get(key) && !drafts[key] && <span className="leave-shift-existing">提出済：{requestByDate.get(key)?.type}</span>}</div>
            <small className="leave-personal-remark">{remark?.type || ""}</small>
          </div>;
        })}
      </div>}

      <section className="leave-note-card" aria-label="提出ノート">
        <h2>提出ノート</h2>
        {draftEntries.length === 0 ? <p className="leave-empty">自分の欄で希望する日を押し、希望を選ぶとここに表示されます。</p> : <div className="leave-note-lines">
          {draftEntries.map(([date, draft]) => <div key={date} className={draft.type === "出勤希望" && (!times[date]?.start || !times[date]?.end) ? "work-time-missing" : ""}>
            <strong>{format(new Date(`${date}T00:00:00`), "yyyy/M/d（E）", { locale: ja })}</strong>
            <span><b>{draft.type}</b><small>現在のシフト：{draft.shiftLabel}</small></span>
            <button type="button" onClick={() => updateDraft(date, "")} aria-label={`${date}を削除`}><Trash2 className="w-4 h-4" /></button>
            {draft.type === "出勤希望" && <div className="col-span-full mt-2 w-full"><p className={`text-xs font-bold ${times[date]?.start && times[date]?.end && times[date].start >= times[date].end ? "text-red-700" : "text-amber-700"}`}>{!(times[date]?.start && times[date]?.end) ? "希望時間を入力してください" : times[date].start >= times[date].end ? "⚠ 終わりの時間が始めより前です。直すと提出できます" : "希望時間"}</p><div className="flex gap-2"><input className="w-1/2 rounded border p-2" type="time" aria-label={`${date}の開始時間`} value={times[date]?.start || ""} onChange={event => setTimes(previous => ({ ...previous, [date]: { start: event.target.value, end: previous[date]?.end || "" } }))} /><input className="w-1/2 rounded border p-2" type="time" aria-label={`${date}の終了時間`} value={times[date]?.end || ""} onChange={event => setTimes(previous => ({ ...previous, [date]: { start: previous[date]?.start || "", end: event.target.value } }))} /></div></div>}
          </div>)}
        </div>}
        <label className="leave-field-label" htmlFor="leave-note-comment">{needsComment ? "訂正したい内容をコメントに書いてください（必須）" : "コメント（任意）"}</label>
        <textarea id="leave-note-comment" value={comment} onChange={event => setComment(event.target.value)} placeholder="まとめて伝えたいことがあれば入力してください" rows={3} />
        {error && <p role="alert" className="leave-submit-error">{error}</p>}
        {hasInvalidTime && <p role="alert" className="leave-submit-error">提出できません：出勤希望の時間を確認してください（終わりの時間は始めより後にします）</p>}
        <Button className="w-full h-12 font-bold" disabled={!draftEntries.length || loading || submitting || (needsComment && !comment.trim()) || hasInvalidTime} onClick={() => void submitNote()}><Send className="w-4 h-4 mr-2" />{submitting ? "提出中…" : "このノートを提出"}</Button>
      </section>
      <section className="leave-request-card">
        <h2>この期間に提出済みの希望</h2>
        {mine.length === 0 ? <p className="leave-empty">まだ提出されていません</p> : <div className="leave-submitted-list">
          {mine.map(item => <div key={item.id}><div><strong>{item.type}</strong><span>{item.date ? format(new Date(`${item.date}T00:00:00`), "M月d日（E）", { locale: ja }) : "この期間"}</span>{item.comment && <small>{item.comment}</small>}</div><span className={`leave-status status-${item.status}`}>{item.status}</span>{item.status === "申請中" && <button aria-label="希望を取り消す" onClick={() => { if (window.confirm(`${item.date || "この期間"}の${item.type}を取り下げますか？`)) void onCancel(item.id); }}><Trash2 className="w-4 h-4" /></button>}</div>)}
        </div>}
      </section>
    </> : <p className="leave-request-card">操作員の情報を取得できません。ログインし直してください。</p>}

    {showHelp && <div className="leave-help-overlay" role="presentation">
      <div className="leave-help-dialog" role="dialog" aria-modal="true" aria-labelledby="leave-help-title">
        <h2 id="leave-help-title">希望シフトの出し方</h2>
        <ol>
          <li>自分の欄で、希望を出したい日を押してください。</li>
          <li>「有給希望」など、希望する内容を選んでください。複数の日を選べます。</li>
          <li>選んだ内容は、画面を下に進むと「提出ノート」に表示されます。</li>
          <li>提出ノートの内容を確認し、「このノートを提出」を押してください。</li>
        </ol>
        <p>確定済みの日は「訂正依頼」を選び、コメントに変更内容を入力してください。</p>
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={dismissHelp} onChange={event => setDismissHelp(event.target.checked)} />次回から表示しない</label>
        <Button className="w-full" onClick={() => { if (dismissHelp) templateStorage.setItem(HELP_STORAGE_KEY, "yes"); setShowHelp(false); }}>使い始める</Button>
      </div>
    </div>}
  </div>;
}
