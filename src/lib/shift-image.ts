export interface ShiftImageRow {
  label: string;      // 例: 10/16
  weekday: string;    // 例: 金
  holiday: boolean;   // 日曜・祝日などで日付を赤にする
  remark: string;     // 帯の名前（なければ空）
  color?: string;     // 帯の色（red/blue/green/amber/purple/gray。画面の帯と同じ）
  cells: string[];    // 従業員ごとの勤務。例: "9:00～18:00" / "休み" / "午前有休 13:00～18:00"
}

export interface ShiftImageInput {
  title: string;
  subtitle: string;
  employees: string[];
  rows: ShiftImageRow[];
}

const BAND_COLORS: Record<string, string> = { red: "#fee2e2", blue: "#dbeafe", green: "#dcfce7", amber: "#fef3c7", purple: "#f3e8ff", gray: "#f1f5f9" };
const WIDTH = 1080; // スマホで拡大せずに読める幅
const FONT = '"Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif';

/** 勤務の文字を「上段・下段」に分けます（時間は2行、それ以外は1行）。 */
export function splitShiftText(text: string): { head: string; lines: string[]; tone: "work" | "off" | "paid" | "half" | "empty" } {
  const value = (text || "").trim();
  if (!value) return { head: "", lines: ["―"], tone: "empty" };
  if (value === "休み") return { head: "", lines: ["休"], tone: "off" };
  if (value === "有休") return { head: "", lines: ["有休"], tone: "paid" };
  const half = value.match(/^(午前有休|午後有休)\s+(.+)$/);
  const body = half ? half[2] : value;
  const range = body.match(/^(\d{1,2}:\d{2})\s*[～〜~-]\s*(\d{1,2}:\d{2})$/);
  const lines = range ? [range[1], `～${range[2]}`] : [body];
  if (half) return { head: half[1], lines, tone: "half" };
  const isOffLike = !range && !/\d/.test(body); // 代休など
  return { head: "", lines, tone: isOffLike ? "off" : "work" };
}

export async function renderShiftImage(input: ShiftImageInput): Promise<Blob> {
  const count = Math.max(1, input.employees.length);
  const dateCol = 190;
  const colW = Math.floor((WIDTH - dateCol) / count);
  const width = dateCol + colW * count;
  const titleH = 96;
  const headH = 64;
  const footH = 28;
  // 1枚で全体が見えるように、1か月分（31日）でもスマホ1画面に収まる縦横比にします。拡大しても読めるよう2倍の解像度で描きます。
  const MAX_HEIGHT = 2000;
  const rowH = Math.max(56, Math.min(116, Math.floor((MAX_HEIGHT - titleH - headH - footH) / Math.max(1, input.rows.length))));
  const compact = rowH < 90;
  const height = titleH + headH + rowH * input.rows.length + footH;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を作れませんでした");
  ctx.scale(scale, scale);

  const nameSize = count >= 7 ? 22 : 28;
  const fit = (text: string, maxWidth: number, size: number, weight = "700") => {
    let s = size;
    ctx.font = `${weight} ${s}px ${FONT}`;
    while (ctx.measureText(text).width > maxWidth && s > 10) { s -= 1; ctx.font = `${weight} ${s}px ${FONT}`; }
    return s;
  };
  const center = (text: string, cx: number, cy: number, size: number, color: string, weight = "700", maxWidth = colW - 10) => {
    fit(text, maxWidth, size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy);
  };

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1f4e6b";
  ctx.fillRect(0, 0, width, titleH);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  fit(input.title, width - 50, 38, "800");
  ctx.fillText(input.title, 24, 36);
  ctx.fillStyle = "#cfe3ef";
  fit(input.subtitle, width - 50, 24, "500");
  ctx.fillText(input.subtitle, 24, 72);

  let y = titleH;
  ctx.fillStyle = "#eef2f5";
  ctx.fillRect(0, y, width, headH);
  center("日付", dateCol / 2, y + headH / 2, 24, "#1c2733", "700", dateCol - 10);
  input.employees.forEach((name, index) => center(name, dateCol + colW * index + colW / 2, y + headH / 2, nameSize, "#1c2733"));
  y += headH;

  const oneLine = compact && colW >= 150;
  input.rows.forEach(row => {
    const band = row.color ? BAND_COLORS[row.color] : undefined;
    if (band) { ctx.fillStyle = band; ctx.fillRect(0, y, width, rowH); }
    const dateColor = row.holiday ? "#c62828" : row.weekday === "土" ? "#1f4e6b" : "#1c2733";
    const dateSize = compact ? 26 : 30;
    if (row.remark) {
      center(`${row.label}（${row.weekday}）`, dateCol / 2, y + rowH * 0.36, dateSize, dateColor, "700", dateCol - 10);
      center(row.remark, dateCol / 2, y + rowH * 0.74, compact ? 17 : 20, "#56636f", "500", dateCol - 10);
    } else center(`${row.label}（${row.weekday}）`, dateCol / 2, y + rowH / 2, dateSize, dateColor, "700", dateCol - 10);
    row.cells.forEach((cell, index) => {
      const cx = dateCol + colW * index + colW / 2;
      const left = dateCol + colW * index + 4;
      const part = splitShiftText(cell);
      if (part.tone === "off" || part.tone === "empty") { center(part.lines[0], cx, y + rowH / 2, compact ? 26 : 30, part.tone === "empty" ? "#9aa7b2" : "#7a8791", "500"); return; }
      if (part.tone === "paid") {
        ctx.fillStyle = "#fde3e1";
        ctx.fillRect(left, y + 5, colW - 8, rowH - 10);
        center(part.lines[0], cx, y + rowH / 2, compact ? 28 : 32, "#b3261e", "800");
        return;
      }
      const half = part.tone === "half";
      if (half) {
        ctx.fillStyle = "#ffe9c7";
        ctx.fillRect(left, y + 5, colW - 8, rowH - 10);
      }
      const text = oneLine ? [part.lines.join("")] : part.lines;
      const size = oneLine ? Math.min(26, Math.floor(rowH * 0.42)) : (compact ? Math.floor((rowH - 14) / (text.length === 1 ? 1.6 : 2.3)) : (text.length === 1 ? 30 : 28));
      const gap = size + 3;
      const headSpace = half ? (compact ? 12 : 20) : 0;
      const startY = y + rowH / 2 + headSpace / 2 - ((text.length - 1) * gap) / 2;
      if (half) center(part.head, cx, y + (compact ? 14 : 24), compact ? 15 : 20, "#9a5a00", "800");
      text.forEach((line, i) => center(line, cx, startY + i * gap, size, "#1c2733", "700"));
    });
    y += rowH;
    ctx.fillStyle = "#e3e8ec";
    ctx.fillRect(0, y - 1, width, 1);
  });
  ctx.fillStyle = "#e3e8ec";
  for (let i = 0; i < count; i += 1) ctx.fillRect(dateCol + colW * i - 1, titleH, 1, height - titleH - footH);
  ctx.fillRect(dateCol - 1, titleH, 1, height - titleH - footH);
  ctx.fillStyle = "#7a8791";
  ctx.font = `500 16px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("シフトツールで作成", width - 14, height - 8);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("画像を作れませんでした")), "image/png"));
}
