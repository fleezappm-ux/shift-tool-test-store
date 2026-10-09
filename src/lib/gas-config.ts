/** GAS WebアプリURLの形式（https://script.google.com/macros/s/…/exec）。 */
export const GAS_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/;
const STORAGE_KEY = "shift_gas_url";

/** 「…/exec」までのURLに整えます（前後の空白や、末尾の余分な文字を取り除く）。 */
export function normalizeGasUrl(raw: string): string {
  return String(raw || "").trim().replace(/[?#].*$/, "");
}

export function isValidGasUrl(raw: string): boolean {
  return GAS_URL_PATTERN.test(normalizeGasUrl(raw));
}

/** この端末に保存された店舗のURL。なければ、公開時に埋め込まれたURL（従来の方式）を使います。 */
export function readGasUrl(): string {
  try {
    const saved = normalizeGasUrl(localStorage.getItem(STORAGE_KEY) || "");
    if (GAS_URL_PATTERN.test(saved)) return saved;
  } catch (_) { /* 保存領域が使えないときは埋め込みのURLだけを見る */ }
  const built = normalizeGasUrl((import.meta as any).env?.VITE_SHIFT_GAS_URL || "");
  return GAS_URL_PATTERN.test(built) ? built : "";
}

export function saveGasUrl(raw: string): void {
  const url = normalizeGasUrl(raw);
  if (!GAS_URL_PATTERN.test(url)) throw new Error("URLの形が違います。「https://script.google.com/macros/s/…/exec」で終わるものを入れてください。");
  localStorage.setItem(STORAGE_KEY, url);
}

export function clearGasUrl(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* 何もしない */ }
}

/** 配布用リンク（…/?gas=URL）で開いたときは、URLを保存してから、アドレス欄をきれいにします。 */
export function adoptGasUrlFromAddress(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const given = params.get("gas");
    if (!given) return;
    if (isValidGasUrl(given)) saveGasUrl(given);
    params.delete("gas");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
  } catch (_) { /* 何もしない */ }
}

export function getGasUrl(): string {
  const url = readGasUrl();
  if (!url) throw new Error("お店の接続先が未設定です。");
  return url;
}
