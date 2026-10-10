
import { ShiftType } from "../types";
import { CyclePatterns } from "../constants";
import { isOffShift } from "./off-types";

/** cyclePatterns（管理画面で編集可能な勤務パターン内容）から、指定した曜日・週の予定シフトを返します。 */
export function resolveCycleShift(
  patterns: CyclePatterns,
  cycleType: number,
  dayOfWeek: number,
  weekIndex: number
): ShiftType {
  const pattern = patterns[cycleType];
  if (!pattern) return "";
  const entry = pattern[dayOfWeek];
  if (!entry) return "";
  const key = `week${Math.max(0, Math.min(3, weekIndex)) + 1}` as "week1" | "week2" | "week3" | "week4";
  return entry[key] ?? entry.week1;
}

/**
 * 入力中のテキストを簡易的に正規化する (onChange用)
 */
export function normalizeShiftInput(text: string): string {
  if (!text) return "";
  
  // 全角スペースを半角に変換
  let normalized = text.replace(/　/g, " ");

  // 末尾がスペースかハイフンの場合は、一つだけ「～」に置換して維持する
  // 既に末尾が「～」の場合はさらに追加しない
  if (/[-\s]$/.test(normalized)) {
    const base = normalized.replace(/[-\s]+$/, "");
    if (base.endsWith("～")) return base;
    return base + "～";
  }

  // 途中のスペース、ハイフンを「～」に置換
  normalized = normalized.replace(/[-\s]+/g, "～");

  // ドットをコロンに変換
  normalized = normalized.replace(/(\d+)\./g, "$1:");

  return normalized;
}

/**
 * 入力が完了したテキストを厳密に正規化する (onBlurや計算用)
 * 例: "8:10 14:10" -> "8:10～14:10", "18時" -> "18:00"
 */
export function finalizeShiftText(text: string): string {
  if (!text) return "";
  
  // まず簡易正規化を通す
  let normalized = normalizeShiftInput(text);

  // 前後の「～」を削除
  normalized = normalized.replace(/^～+|～+$/g, "");

  // 個別のパーツを処理
  const parts = normalized.split("～");
  
  const processedParts = parts.map(part => {
    let p = part.trim();
    if (!p) return "";

    // 漢字（時、分）をコロンに変換
    p = p.replace(/時/g, ":");
    p = p.replace(/分/g, "");

    // 「18:」や「18」のように分がない場合に「:00」を補完
    if (p.includes(":")) {
      const parts = p.split(":");
      const hours = parts[0] || "0";
      const minutes = parts[1] ? parts[1].padEnd(2, "0").substring(0, 2) : "00";
      return `${hours}:${minutes}`;
    } else if (/^\d+$/.test(p)) {
      // 数字だけの場合は「:00」を付与
      return `${p}:00`;
    }

    return p;
  });

  const joined = processedParts.filter(p => p !== "").join("～");
  
  // 1つしか時間がない場合で、それが「18:00」のような形式ならそのまま返す
  // それ以外（例: 他の文字が混じっているなど）ならそのまま
  return joined;
}

/**
 * シフト文字列から拘束時間を計算し、休憩時間と実働時間を返す
 */
export function calculateTimes(shiftInput: string, customBreak?: string): { breakTime: string; workTime: string } {
  if (!shiftInput || isOffShift(shiftInput) || shiftInput === "任意入力") {
    return { breakTime: "0:00", workTime: "0:00" };
  }

  // 計算の時は確定版の正規化を使用
  const shift = finalizeShiftText(shiftInput);

  try {
    // Handle "～" format
    let startStr = "";
    let endStr = "";

    if (shift.includes("～")) {
      [startStr, endStr] = shift.split("～");
    } else {
      return { breakTime: "0:00", workTime: "0:00" };
    }

    const parseTime = (str: string) => {
      let h = 0;
      let m = 0;
      const clean = str.replace(/[時分]/g, ":").replace(/:$/, ":00");
      if (clean.includes(":")) {
        [h, m] = clean.split(":").map(s => parseInt(s) || 0);
      } else {
        h = parseInt(clean) || 0;
      }
      return h * 60 + m;
    };

    const startMinutes = parseTime(startStr);
    const endMinutes = parseTime(endStr);
    
    let durationMinutes = endMinutes - startMinutes;
    if (durationMinutes <= 0) durationMinutes += 24 * 60; // 日をまたぐ場合

    let breakMinutes = durationMinutes > 6 * 60 ? 60 : 0;
    if (customBreak !== undefined) {
      const [bh, bm] = customBreak.replace(/[^0-9:]/g, "").split(":");
      const parsed = (parseInt(bh) || 0) * 60 + (parseInt(bm) || 0);
      breakMinutes = Math.min(parsed, durationMinutes);
    }
    const workMinutes = durationMinutes - breakMinutes;

    return {
      breakTime: formatMinutes(breakMinutes),
      workTime: formatMinutes(workMinutes)
    };
  } catch (e) {
    return { breakTime: "0:00", workTime: "0:00" };
  }
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}


/** 店舗ごとの開始日・終了日から、開始月を基準にシフト期間を生成します。 */
export function generateConfiguredDateRange(year: number, month: number, startDay: number, endDay: number): Date[] {
  const start = new Date(year, month - 1, startDay);
  const end = endDay === 0
    ? new Date(year, month, 0)
    : new Date(year, month - 1 + (endDay < startDay ? 1 : 0), endDay);
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 62) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
