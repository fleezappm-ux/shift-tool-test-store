// 全部の設定画面で同じ見た目の「保存の状態」。押し忘れを防ぎます。
export function SaveStatus({ dirty, saving = false, className = "" }: { dirty: boolean; saving?: boolean; className?: string }) {
  const tone = saving ? "border-2 border-amber-400 bg-amber-100 text-amber-950" : dirty ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800";
  const text = saving ? "⏳ 保存しています…終わるまで画面を切り替えたり閉じたりしないでください。途中で動かすと保存に失敗して、最初からやり直しになることがあります。" : dirty ? "● まだ保存していません。下の保存ボタンを押してください" : "✓ 保存ずみ（変更はありません）";
  return <p role="status" aria-live="polite" className={`rounded-lg px-3 py-2 ${saving ? "text-sm leading-6" : "text-xs"} font-bold ${tone} ${className}`}>{text}</p>;
}
