import assert from "node:assert";
const store: Record<string, string> = {};
(globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
(globalThis as any).window = { location: { search: "", pathname: "/shift/", hash: "" }, history: { replaceState: (_a: unknown, _b: string, url: string) => { (globalThis as any).window.location.search = url.includes("?") ? "?" + url.split("?")[1] : ""; } } };
const { readGasUrl, saveGasUrl, isValidGasUrl, normalizeGasUrl, adoptGasUrlFromAddress, getGasUrl, clearGasUrl } = await import("../src/lib/gas-config.ts");
const URL1 = "https://script.google.com/macros/s/AKfycbxAAA/exec";
assert.equal(readGasUrl(), "", "最初は未設定");
assert.throws(() => getGasUrl());
assert.equal(isValidGasUrl(" " + URL1 + "?x=1 "), true, "前後の空白や余分な部分は取り除く");
assert.equal(normalizeGasUrl(URL1 + "#a"), URL1);
assert.equal(isValidGasUrl("https://example.com/macros/s/a/exec"), false);
assert.equal(isValidGasUrl("https://script.google.com/macros/s/AAA/dev"), false);
assert.throws(() => saveGasUrl("http://bad"));
saveGasUrl(URL1); assert.equal(readGasUrl(), URL1); assert.equal(getGasUrl(), URL1);
clearGasUrl(); assert.equal(readGasUrl(), "");
// 配布リンク ?gas=… で開くと保存され、アドレス欄から消える
(globalThis as any).window.location.search = "?gas=" + encodeURIComponent(URL1) + "&x=1";
adoptGasUrlFromAddress(); assert.equal(readGasUrl(), URL1); assert.equal((globalThis as any).window.location.search, "?x=1");
// 変なリンクは保存しない
clearGasUrl(); (globalThis as any).window.location.search = "?gas=" + encodeURIComponent("https://evil.example/exec");
adoptGasUrlFromAddress(); assert.equal(readGasUrl(), "");
console.log("PASS: gas url (save, normalize, link adoption, invalid rejected)");
