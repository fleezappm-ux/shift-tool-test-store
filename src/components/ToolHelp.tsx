import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

// 各設定画面の上に置く「このツールの使い方」。開いたり閉じたりできます。
export function ToolHelp({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details open={defaultOpen} className="group rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-sm text-slate-800">
    <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-blue-900"><HelpCircle className="h-4 w-4 shrink-0" />{title}<span className="ml-auto text-xs font-normal text-blue-700 group-open:hidden">開く</span><span className="ml-auto hidden text-xs font-normal text-blue-700 group-open:inline">閉じる</span></summary>
    <div className="mt-2 space-y-1.5 text-xs leading-6 text-slate-700">{children}</div>
  </details>;
}
