// Chrome/Edge の File System Access API を使って、Excel出力の保存先フォルダを
// 一度選んだら覚えておく仕組みです（毎回の保存ダイアログを避けるため）。
// 対応していないブラウザ（Safari/Firefox等）では、従来通りのダウンロード方式にフォールバックします。

const DB_NAME = `shift-tool-fs:${import.meta.env?.BASE_URL ?? "/"}`;
const STORE_NAME = "handles";
const KEY = "excel-output-dir";

function isFileSystemAccessSupported(): boolean {
  return typeof (window as any).showDirectoryPicker === "function";
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 保存先フォルダを選び直します（初回設定・変更時に呼び出します）。 */
export async function chooseOutputFolder(): Promise<string | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    await idbSet(KEY, handle);
    return handle.name as string;
  } catch (error) {
    // ユーザーがキャンセルした場合など
    return null;
  }
}

/** 今覚えている保存先フォルダ名を返します（未設定・非対応ブラウザなら null）。 */
export async function getRememberedFolderName(): Promise<string | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await idbGet<any>(KEY);
    return handle ? (handle.name as string) : null;
  } catch {
    return null;
  }
}

/** 覚えているフォルダ設定を解除します。 */
export async function forgetOutputFolder(): Promise<void> {
  await idbDelete(KEY);
}

/**
 * 覚えているフォルダに直接ファイルを書き込みます。
 * 成功したら true、フォルダが未設定・非対応・権限拒否などの場合は false を返します
 * （false の場合は呼び出し側で従来通りのダウンロードにフォールバックしてください）。
 */
export async function saveBufferToRememberedFolder(fileName: string, buffer: ArrayBuffer): Promise<boolean> {
  if (!isFileSystemAccessSupported()) return false;
  try {
    const dirHandle = await idbGet<any>(KEY);
    if (!dirHandle) return false;

    const permission = await dirHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      const requested = await dirHandle.requestPermission({ mode: "readwrite" });
      if (requested !== "granted") return false;
    }

    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();
    return true;
  } catch (error) {
    console.error("保存先フォルダへの書き込みに失敗しました:", error);
    return false;
  }
}
