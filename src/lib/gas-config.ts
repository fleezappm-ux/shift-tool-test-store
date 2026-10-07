/** 新規店舗のGAS WebアプリURL。未設定なら通信しません。 */
export function getGasUrl(): string {
  const url = import.meta.env.VITE_SHIFT_GAS_URL?.trim() || "";
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    throw new Error("GAS接続先が未設定です。VITE_SHIFT_GAS_URL に新しいWebアプリURLを設定してください。");
  }
  return url;
}
