import { getGasUrl } from "./gas-config";

// GASへの通信の窓口です。
// ・同時に送るのは最大4件まで（開いた瞬間に30件ほどが一斉に飛ぶと、Google側がエラー(404)を返すことがあるため）
// ・同じ「読み込み」が同時に重なったときは、1回にまとめる
// ・「読み込み」は、404／混雑／サーバーエラー／通信断のとき、間をあけて最大3回やり直す
// ・「保存」は自動でやり直さない（前の保存が裏で動いている最中に重ねると『別の保存処理を実行中』になるため）
const MAX_PARALLEL = 4;
let active = 0;
const waiting: Array<() => void> = [];
const inflight = new Map<string, Promise<Response>>();

async function acquire() {
  if (active < MAX_PARALLEL) { active += 1; return; }
  await new Promise<void>(resolve => waiting.push(resolve));
  active += 1;
}
function release() { active -= 1; waiting.shift()?.(); }

async function sendWithRetry(init: RequestInit, canRetry: boolean): Promise<Response> {
  // 「読み込み」は25秒返事がなければ打ち切って（その前の7秒で、もう1本を並走させる）、やり直す（固まった通信が枠を占領し続けないように）
  const attemptOnce = async (): Promise<Response | null> => {
    const timer = new AbortController();
    const timerId = canRetry ? window.setTimeout(() => timer.abort(), 25000) : undefined;
    const outer = init.signal;
    const onOuterAbort = () => timer.abort();
    outer?.addEventListener("abort", onOuterAbort);
    try {
      if (!canRetry) return await fetch(getGasUrl(), { ...init, signal: init.signal });
      // 読み込みは、7秒たっても返事がなければ同じ読み込みをもう1本送り、先に返った方を使う
      // （Google側がたまに十数秒止まるのを避けるため。読み込みは何度送っても害がない）
      const run = () => fetch(getGasUrl(), { ...init, signal: timer.signal }).catch(() => null);
      return await new Promise<Response | null>(resolve => {
        let pending = 1; let done = false;
        const finish = (r: Response | null) => { pending -= 1; if (r && !done) { done = true; resolve(r); } else if (pending === 0 && !done) resolve(null); };
        const first = run();
        const hedgeId = window.setTimeout(() => { pending += 1; void run().then(finish); }, 7000);
        void first.then(r => { window.clearTimeout(hedgeId); finish(r); });
      });
    }
    catch { return null; }
    finally { if (timerId !== undefined) window.clearTimeout(timerId); outer?.removeEventListener("abort", onOuterAbort); }
  };
  let response = await attemptOnce();
  for (let attempt = 1; canRetry && !init.signal?.aborted && attempt <= 3 && (!response || response.status === 404 || response.status === 429 || response.status >= 500); attempt += 1) {
    await new Promise(resolve => window.setTimeout(resolve, attempt * 1200));
    response = await attemptOnce();
  }
  if (!response) throw new Error("通信できませんでした（電波・Wi-Fiを確認してください）。編集内容は端末に残っています。電波が戻ったら「再保存」を押してください。");
  return response;
}

// 「読み込み」は30ミリ秒ほどためて、まとめて1回の通信で送る（画面を開いた直後の20回以上の通信が数回になる）。
// まとめ送りが失敗したとき（古いGASなど）は、1件ずつ送る方法に自動で戻る。
const BATCH_WINDOW_MS = 30;
const BATCH_SIZE = 8;
type Pending = { init: RequestInit; resolve: (response: Response) => void; reject: (error: unknown) => void };
let buffer: Pending[] = [];
let flushTimer: number | undefined;

async function sendSingle(init: RequestInit): Promise<Response> {
  await acquire();
  try { return await sendWithRetry(init, true); } finally { release(); }
}

function abortError() { return new DOMException("The operation was aborted.", "AbortError"); }

async function sendBatch(items: Pending[]) {
  const live = items.filter(item => {
    if (item.init.signal?.aborted) { item.reject(abortError()); return false; }
    return true;
  });
  if (live.length === 0) return;
  if (live.length === 1) { sendSingle(live[0].init).then(live[0].resolve, live[0].reject); return; }
  let results: unknown[] | null = null;
  try {
    const calls = live.map(item => JSON.parse(String(item.init.body)));
    const init: RequestInit = { method: "POST", headers: live[0].init.headers, body: JSON.stringify({ action: "batchShift", calls }) };
    await acquire();
    let response: Response;
    try { response = await sendWithRetry(init, true); } finally { release(); }
    const json = await response.json();
    if (json && json.success === true && Array.isArray(json.results) && json.results.length === live.length) results = json.results;
  } catch { results = null; }
  if (!results) {
    // 1件ずつの方法に戻す
    live.forEach(item => { sendSingle(item.init).then(item.resolve, item.reject); });
    return;
  }
  live.forEach((item, index) => item.resolve(new Response(JSON.stringify(results![index]), { status: 200, headers: { "content-type": "application/json" } })));
}

function flushBuffer() {
  flushTimer = undefined;
  const items = buffer;
  buffer = [];
  // 時間のかかる読み込み（Notionから取るもの）は単独で送り、軽いものの足を引っ張らないようにする
  const isHeavy = (item: Pending) => /"action"\s*:\s*"getShifts"/.test(String(item.init.body));
  const heavy = items.filter(isHeavy);
  const light = items.filter(item => !isHeavy(item));
  heavy.forEach(item => { sendSingle(item.init).then(item.resolve, item.reject); });
  for (let i = 0; i < light.length; i += BATCH_SIZE) void sendBatch(light.slice(i, i + BATCH_SIZE));
}

function queueRead(init: RequestInit): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    buffer.push({ init, resolve, reject });
    if (flushTimer === undefined) flushTimer = window.setTimeout(flushBuffer, BATCH_WINDOW_MS);
  });
}

export function gasFetch(init: RequestInit): Promise<Response> {
  const body = typeof init.body === "string" ? init.body : "";
  const isRead = /"action"\s*:\s*"get/.test(body);
  if (!isRead) {
    const run = async () => {
      await acquire();
      try { return await sendWithRetry(init, false); } finally { release(); }
    };
    return run();
  }
  let shared = inflight.get(body);
  if (!shared) {
    shared = queueRead(init).finally(() => { inflight.delete(body); });
    inflight.set(body, shared);
  }
  return shared.then(response => response.clone());
}
