import { Component, ErrorInfo, ReactNode } from "react";
import { reportClientError } from "../lib/error-report";

// 画面が壊れたとき、真っ白にならず、案内を出します（内容は管理者の「エラー記録」にも残ります）。
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  declare props: { children: ReactNode };
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { reportClientError(error, `画面:${(info.componentStack || "").trim().split("\n")[0] || ""}`); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="mx-auto mt-16 max-w-md space-y-4 rounded-2xl border-2 border-red-300 bg-red-50 p-6 text-center">
      <h1 className="text-lg font-black text-red-800">画面でエラーが起きました</h1>
      <p className="text-sm leading-6 text-red-900">入力した内容は、この端末とサーバーに残っています。下のボタンで画面を読み込み直してください。何度も出るときは、管理者に伝えてください。</p>
      <button type="button" className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white" onClick={() => window.location.reload()}>読み込み直す</button>
    </div>;
  }
}
