import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X } from "lucide-react";

type GuideSection = { title: string; points: string[] };
export type EmployeeGuideSection = "home" | "dashboard" | "personal" | "board" | "requests" | "mypage";
const SECTION_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥"];

const employeeSections: (GuideSection & { id: EmployeeGuideSection })[] = [
  { id: "home", title: "ホーム", points: [
    "ログイン直後は今日のシフトが表示されます。上部のカレンダーは1週間単位です。「前週」「次週」で移動し、日付を選ぶと、その日の出勤人数と登録された勤務を確認できます。名前を押すと個人シフトへ移動します。",
    "「月の全体シフトを見る」または下部バーの「全体」から、集計期間単位の全体シフトを開けます。下部バーの「ホーム」を押すと、今日を含む期間と今週に戻ります。PCでは左側のメニューから移動します。",
    "「操作員：名前」を押すとログアウトできます。シフトのアイコンから、対応端末のホーム画面やデスクトップへの追加方法を確認できます。",
  ] },
  { id: "dashboard", title: "全体シフト", points: [
    "全員の勤務を集計期間ごとに確認します。「前の期間」「次の期間」で切り替え、名前を選ぶと個人シフトが開きます。従業員ログインでは閲覧用の画面です。",
    "見出しが「全体シフト（案）」でオレンジ色のときは、管理者が編集中の案です。「全体シフト（確定）」で青色のときは確定済みで、この内容で出勤します。帯色は日付の目印なので、休みかどうかは各人の勤務欄で確認してください。",
    "下部バーの「全体」は現在選択中の集計期間を引き継ぎます。「ホーム」を押すと今日を含む期間と今週へ戻ります。",
  ] },
  { id: "personal", title: "個人シフト", points: [
    "選んだ人の勤務を集計期間ごとに確認します。期間は前後へ切り替えられ、「戻る」で全体シフトへ戻ります。出勤日数、合計実働時間、その期間の有給取得数も表示します。",
    "赤帯などの日付の色だけでは、個人の休みは決まりません。実際の勤務欄を確認してください。",
  ] },
  { id: "board", title: "お知らせ掲示板", points: [
    "ホームには対象期間のお知らせと、公開対象の希望・訂正依頼が表示されます。「お知らせをすべて見る」で掲示板へ移動すると、選択した期間から3期間分を確認できます。",
    "見える申請は店舗の公開設定と申請の状態によって異なります。",
    "読んだお知らせは「確認した（履歴へ）」を押すと、掲示板から消えて、一番下の「確認ずみの履歴」に移ります。「未確認に戻す」で戻せます。確認の記録はこの端末だけに残るので、別の端末では、また全部表示されます。申請の状態が変わる（承認・却下）と、もう一度表示されます。",
  ] },
  { id: "requests", title: "休み希望の提出", points: [
    "ホームの「休み希望日を提出する」、または下部バーの「休み希望」から開きます。受付中の期間で日付と希望の種類を選び、提出ノートを確認して「このノートを提出」を押してください。複数の日を選べます。押すとすぐ「提出しました」と出て、送信は裏で行われます。もし失敗したときは赤いメッセージが出るので、もう一度提出してください。",
    "出勤希望では開始・終了時間を入力します。確定済みの期間を変更したい場合は「訂正依頼」を選び、変更内容をコメントに書いて提出してください。",
    "提出後の内容や状態はマイページで確認できます。",
  ] },
  { id: "mypage", title: "マイページ", points: [
    "下部バーの「マイページ」から、現在選択している操作員の希望と、申請中・承認・却下などの状態を確認できます。却下理由がある場合もここに表示されます。",
    "「有休詳細・設定」では、残り有給日数、更新日、付与日数を任意の参考値として登録できます。「有休残数を表示」をOFFにすると、マイページ上部の残数表示が消えます。正式な残日数は会社の管理記録を確認してください。",
    "有休情報は、別の従業員のマイページには表示されません。操作員ごとのPINで本人かどうかを確かめます。ただし、管理者やNotion・GASを開ける人からは、データそのものを見られます。",
  ] },
];

const commonSections: GuideSection[] = [
  { title: "ログインと操作員", points: [
    "ログインID・パスワードを入力し、今回操作する自分の名前を選び、自分のPIN（4〜6桁の数字）を入れます。はじめてのときは、PINを決めてください（ほかの人には見えません）。別の名前を選んだ場合は、ホームの『操作員：名前』からログアウトして入り直してください。",
    "PINを忘れたときは、管理者に「PINのリセット」を頼んでください。リセット後の最初のログインで、新しいPINを決め直します。PINを何回も間違えると、10分ほど入れなくなります。",
    "管理者と従業員では使える操作が異なります。ログイン情報が分からない場合は店舗の管理者に確認してください。",
  ] },
  { title: "ホームと今日のシフト", points: [
    "前週・次週で週を切り替え、日付を選ぶと、その日に出勤する人と勤務内容を確認できます。従業員名から個人のシフトを開けます。",
    "月の全体シフト、お知らせ掲示板、休み希望への入口があります。カレンダーの帯色と勤務の休み判定は別々に設定できます。",
  ] },
  { title: "全体・個人シフト", points: [
    "全体シフトでは期間内の全員の勤務を確認できます。従業員名を選ぶと個人シフトが開き、期間を切り替えられます。",
    "オレンジ色の「（案）」は編集中、青色の「（確定）」は確定済みです。色付きの日付も、勤務の有無とは別に確認してください。",
  ] },
  { title: "休み希望・出勤希望", points: [
    "休み希望ページで対象期間と日付を選び、希望の種類と必要なコメントを入力して提出します。出勤希望では開始・終了時間を入力してください。",
    "提出内容と状態はマイページで確認できます。確定済みシフトの変更が必要なときは訂正依頼を使います。",
  ] },
  { title: "お知らせ掲示板とマイページ", points: [
    "掲示板で表示対象のお知らせ、希望申請、訂正依頼を確認できます。公開範囲によって見える内容が変わります。読んだものは「確認した（履歴へ）」で履歴に移せます（この端末だけの記録です）。",
    "マイページで自分の希望、承認・却下の状態、有給残数を確認します。有給残数の登録・更新は画面の案内に従ってください。",
  ] },
];

const adminSections: GuideSection[] = [
  { title: "シフトの作成・自動保存", points: [
    "左側メニュー（スマホは下部バー）の「シフト作成」を開き、上部の期間で月を選んで、勤務を編集します。「閲覧」「編集」の切り替えで、誤操作を防げます。変更は自動で保存されます（保存ボタンはありません）。画面の保存状態が「保存済み」になれば完了です。保存したあと、Notionへは裏で書き込まれます。もし書き込めなかったときは、画面の上に赤い警告が出て、自動でやり直します（「今すぐ再試行」も押せます）。警告が出たまま画面を閉じても、内容はサーバーに残っています。",
    "「シフトを確定」を押すと、その期間が確定（青色）になり、従業員に確定シフトとして見えます。確定した期間は保存できなくなるため、直す場合は「確定を解除」してから編集します。確定前に勤務と希望申請を確認してください。",
  ] },
  { title: "希望申請の対応", points: [
    "「シフト作成」画面の「対応待ちの申請希望あり」を押すと、一覧が開きます。申請中のものは「承認」「却下」で処理します（却下は理由を入力）。処理結果は本人のマイページにも反映されます。",
    "押すとすぐ画面が切り替わり、保存は裏で行われます（保存できなかったときは元に戻って知らせます）。「休み希望」「有給希望」を承認すると、表示中の期間なら、シフト表にも「休み」「有休」が自動で入ります。ほかの種類（出勤希望など）は自動では変わらないので、必要なら自分で直してください。判定を間違えたときは、一覧下の「対応履歴・訂正・削除」から訂正できます。",
    "確定後の変更依頼は「訂正依頼」として届きます。対応したら、掲示板の「確認した（対応済みにする）」か、シフト表の赤い「訂正」の印から「確認した」を押して、対応済みにします。誰に見えるかは、設定の「お知らせ掲示板設定」で決めます。非公開にしたい申請が他の従業員に見えないか確認してください。",
  ] },
  { title: "店舗・従業員・勤務の設定", points: [
    "最初の準備は、①設定の「従業員マスタ」で、最初の操作員の名前を自分の名前に直し、従業員を登録する（最大50人）、②「店舗マスタ」で店舗名と集計期間（月の区切り）を決める、③「シフトマスタ」の「勤務時間設定」で早番・遅番などを登録する、の順がおすすめです。",
    "従業員マスタでは役職の追加・並べ替えと、ホームの列分け（店長・事務｜スタッフなど）も決められます。",
    "シフトマスタには、勤務時間設定、シフト案自動作成マスタ、勤務パターン作成マスタ（1〜4週間の勤務パターン）、お店のお休みの日・色付け、人数・連勤のチェック（最低人数・連勤の上限・1人ごとの条件。決めた基準に合わない所を、全体シフトで「⚠」と知らせます）があります。「シフト作成」の画面の「質問に答えてシフト案を作る」を押すと、最低人数・役職・連勤・個人の条件を1つずつ聞かれます。答え終わると「こんなシフトになります」と言葉で確認でき、足りない日に出勤を足す案を作ります（今の勤務・有休・休み希望は変えません。案を見て使うか選べて、入れたあとも元に戻せます。答えは設定に保存できます）。「店舗マスタ」で営業時間と「いつもいてほしい役職」を決めておくと、その役職の人が抜ける時間帯も「⚠」で知らせ、案でも優先して埋めます。自動作成は設定でONにして開始し、確定済みのシフトや手作業で変えた勤務は、実行後に画面で確認してください。",
  ] },
  { title: "管理者のお知らせ", points: ["掲示板の「管理者からのお知らせを作成」で本文を入れ、全員または指定従業員を選んで公開します。既定の公開範囲はお知らせ掲示板設定で変更できます。", "指定従業員のお知らせは対象の従業員と管理者だけが読めます。"] },
  { title: "カレンダーの帯色", points: [
    "「設定」→「シフトマスタ」→「お店のお休みの日・色付け」（店舗マスタの「お店のお休みの日を決める」からも開けます）で、定休日の曜日と祝日、年末年始などを設定します。初期値は日曜日と祝日が赤帯で、選択を外すと帯は消えます。",
    "各ルールで『勤務は変更しない』『全員を休みにする』『指定従業員を休みにする』を選べます。休み判定はシフト案の自動作成と勤務パターン適用時に反映し、設定を変えただけでは既存の勤務は変更しません。重複時は特定日・毎年の日付、祝日、第何週の曜日、毎週の定休日の順に優先します。",
  ] },
  { title: "データ出力・接続・初期化", points: [
    "シフトはCSV・Excelで出力できます。ブラウザが対応する場合はExcelの保存先フォルダも選べます。",
    "管理者としてはじめて使うときは、まず「その他設定」で管理者用の接続キーを入れ、「保存して接続を確認」を押します。✓が出れば成功、×が出たらキーを確かめ直します。管理者用の接続キーとヒートマップ、Excel保存先は「その他設定」にあります。これらはその端末だけの設定で、パソコンで設定してもスマホには反映されません。接続キーやパスワードを掲示板やGitHubへ書き込まないでください。",
    "従業員がPINを忘れたら、設定→従業員マスタの「PIN（暗証番号）のリセット」で、その人の「PINをリセット」を押します。本人は次のログインで新しいPINを決めます（PINは管理者にも見えません）。",
    "データ初期化は、対象件数を確認したうえで実行する操作です。Notionのページはアーカイブされ、通常の画面からは戻せません。",
  ] },
];

export function ShiftToolGuide({ role, initialSection = "home", onClose }: { role: "admin" | "employee"; initialSection?: EmployeeGuideSection; onClose: (hideNextTime: boolean) => void }) {
  const [hideNextTime, setHideNextTime] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const jumpTo = (id: EmployeeGuideSection, behavior: ScrollBehavior = "smooth") => {
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-guide-section="${id}"]`);
    if (container && target) container.scrollTo({ top: target.offsetTop, behavior });
  };
  useEffect(() => {
    if (role !== "employee") return;
    const frame = requestAnimationFrame(() => jumpTo(initialSection, "instant"));
    return () => cancelAnimationFrame(frame);
  }, [initialSection, role]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(hideNextTime); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hideNextTime, onClose]);

  return createPortal(<div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/65 p-3 sm:p-6" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="shift-guide-title" className="mx-auto my-3 max-w-3xl rounded-2xl bg-white text-slate-900 shadow-2xl sm:my-8">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b bg-white px-5 py-4 sm:px-7">
        <div><h2 id="shift-guide-title" className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-6 w-6 text-blue-600" />シフトツールの使い方</h2><p className="mt-1 text-sm text-slate-600">{role === "employee" ? "番号を選ぶと、そのページの説明へ移動します。" : "読みたい項目を開いて確認できます。"}</p></div>
        <button type="button" aria-label="説明書を閉じる" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => onClose(hideNextTime)}><X className="h-5 w-5" /></button>
      </header>
      <div ref={scrollRef} className="relative max-h-[68vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
        {role === "employee" ? <>
          <nav className="grid grid-cols-2 gap-2 rounded-xl bg-blue-50 p-3 sm:grid-cols-3" aria-label="説明書の目次">{employeeSections.map((section, index) => <button type="button" key={section.id} className="rounded-lg border border-blue-200 bg-white p-2 text-left text-sm font-bold text-blue-800 hover:bg-blue-100" onClick={() => jumpTo(section.id)}>{SECTION_NUMBERS[index]} {section.title}</button>)}</nav>
          {employeeSections.map((section, index) => <section key={section.id} data-guide-section={section.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="mb-3 text-lg font-black text-blue-800">{SECTION_NUMBERS[index]} {section.title}</h3><div className="space-y-3 text-sm leading-7 text-slate-700">{section.points.map(point => <p key={point}>{point}</p>)}</div></section>)}
        </> : <>
          <div className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">この説明書はシフトツールの基本操作をまとめています。</div>
          <div><h3 className="mb-3 text-base font-black">全員共通</h3><div className="space-y-2">{commonSections.map((section, index) => <GuideEntry key={section.title} section={section} initiallyOpen={index === 0} />)}</div></div>
          <div><h3 className="mb-3 text-base font-black">管理者の操作</h3><div className="space-y-2">{adminSections.map(section => <GuideEntry key={section.title} section={section} />)}</div></div>
        </>}
      </div>
      <footer className="flex flex-col gap-3 rounded-b-2xl border-t bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" checked={hideNextTime} onChange={event => setHideNextTime(event.target.checked)} className="h-4 w-4 accent-blue-600" />次回からこの説明書を自動表示しない</label>
        <button type="button" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white" onClick={() => onClose(hideNextTime)}>使い始める</button>
      </footer>
    </section>
  </div>, document.body);
}

function GuideEntry({ section, initiallyOpen = false }: { key?: string; section: GuideSection; initiallyOpen?: boolean }) {
  return <details defaultOpen={initiallyOpen} className="group rounded-xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer text-sm font-bold">{section.title}</summary>
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{section.points.map(point => <li key={point}>{point}</li>)}</ul>
  </details>;
}
