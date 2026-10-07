declare const __BUILD_ID__: string;

// 公開された最新の版と、いま開いている画面の版が違うかを確かめます（古い画面のまま使い続けて事故になるのを防ぎます）。
export async function isNewVersionAvailable(): Promise<boolean> {
  try {
    const current = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "";
    if (!current) return false;
    const base = import.meta.env?.BASE_URL ?? "/";
    const response = await fetch(`${base}version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return false;
    const json = await response.json();
    return typeof json.id === "string" && json.id !== current;
  } catch { return false; }
}

export function reloadToLatest() {
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(Date.now()));
  window.location.replace(url.toString());
}
