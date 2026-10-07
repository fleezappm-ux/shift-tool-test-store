import { useEffect } from "react";

// 保存していない変更がある画面の目印。設定画面を離れるとき・ページを閉じるときの確認に使います。
const dirtyKeys = new Set<string>();
export const hasUnsaved = () => dirtyKeys.size > 0;
export const clearUnsaved = () => dirtyKeys.clear();
export const UNSAVED_MESSAGE = "保存していない変更があります。このまま移動すると、入力した内容は消えます。移動しますか？";

export function useUnsavedGuard(key: string, dirty: boolean) {
  useEffect(() => {
    if (!dirty) { dirtyKeys.delete(key); return; }
    dirtyKeys.add(key);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => { dirtyKeys.delete(key); window.removeEventListener("beforeunload", warn); };
  }, [key, dirty]);
}
