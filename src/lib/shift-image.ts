export interface ShiftImageRow {
  label: string;      // 例: 10/16
  weekday: string;    // 例: 金
  holiday: boolean;   // 日曜・祝日などで日付を赤にする
  remark: string;     // 帯の名前（なければ空）
  cells: string[];    // 従業員ごとの勤務。例: "9:00～18:00" / "休み" / "午前有休 13:00～18:00"
}

export interface ShiftImageInput {
  title: string;
  subtitle: string;
  employees: string[];
  rows: ShiftImageRow[];
}

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
  const dateCol = 170;
  const colW = Math.floor((WIDTH - dateCol) / count);
  const width = dateCol + colW * count;
  const titleH = 120;
  const headH = 84;
  const rowH = 116;
  const height = titleH + headH + rowH * input.rows.length + 24;
  const scale = 1;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を作れませんでした");
  ctx.scale(scale, scale);

  const nameSize = count >= 7 ? 24 : 30;
  const fit = (text: string, maxWidth: number, size: number, weight = "700") => {
    let s = size;
    ctx.font = `${weight} ${s}px ${FONT}`;
    while (ctx.measureText(text).width > maxWidth && s > 14) { s -= 1; ctx.font = `${weight} ${s}px ${FONT}`; }
    return s;
  };
  const center = (text: string, cx: number, cy: number, size: number, color: string, weight = "700", maxWidth = colW - 12) => {
    fit(text, maxWidth, size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy);
  };

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  // タイトル
  ctx.fillStyle = "#1f4e6b";
  ctx.fillRect(0, 0, width, titleH);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  fit(input.title, width - 60, 44, "800");
  ctx.fillText(input.title, 30, 48);
  ctx.fillStyle = "#cfe3ef";
  fit(input.subtitle, width - 60, 28, "500");
  ctx.fillText(input.subtitle, 30, 92);

  // 見出し行
  let y = titleH;
  ctx.fillStyle = "#eef2f5";
  ctx.fillRect(0, y, width, headH);
  center("日付", dateCol / 2, y + headH / 2, 28, "#1c2733", "700", dateCol - 12);
  input.employees.forEach((name, index) => center(name, dateCol + colW * index + colW / 2, y + headH / 2, nameSize, "#1c2733"));
  y += headH;

  input.rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) { ctx.fillStyle = "#f8fafb"; ctx.fillRect(0, y, width, rowH); }
    if (row.holiday) { ctx.fillStyle = "#fdf1f0"; ctx.fillRect(0, y, width, rowH); }
    const dateColor = row.holiday ? "#c62828" : row.weekday === "土" ? "#1f4e6b" : "#1c2733";
    center(`${row.label}（${row.weekday}）`, dateCol / 2, y + (row.remark ? rowH / 2 - 16 : rowH / 2), 30, dateColor, "700", dateCol - 12);
    if (row.remark) center(row.remark, dateCol / 2, y + rowH / 2 + 24, 20, "#56636f", "500", dateCol - 12);
    row.cells.forEach((cell, index) => {
      const cx = dateCol + colW * index + colW / 2;
      const part = splitShiftText(cell);
      if (part.tone === "off" || part.tone === "empty") center(part.lines[0], cx, y + rowH / 2, 30, part.tone === "empty" ? "#9aa7b2" : "#7a8791", "500");
      else if (part.tone === "paid") {
        ctx.fillStyle = "#fde3e1";
        ctx.fillRect(dateCol + colW * index + 6, y + 10, colW - 12, rowH - 20);
        center(part.lines[0], cx, y + rowH / 2, 32, "#b3261e", "800");
      } else {
        const lines = part.lines;
        const top = part.head ? 30 : 0;
        if (part.tone === "half") {
          ctx.fillStyle = "#ffe9c7";
          ctx.fillRect(dateCol + colW * index + 6, y + 10, colW - 12, rowH - 20);
          center(part.head, cx, y + 26, 20, "#9a5a00", "800");
        }
        const size = lines.length === 1 ? 30 : 28;
        const gap = size + 4;
        const startY = y + rowH / 2 + top / 2 - ((lines.length - 1) * gap) / 2;
        lines.forEach((line, i) => center(line, cx, startY + i * gap, size, "#1c2733", "700"));
      }
    });
    y += rowH;
    ctx.fillStyle = "#e3e8ec";
    ctx.fillRect(0, y - 1, width, 1);
  });
  // 縦線
  ctx.fillStyle = "#e3e8ec";
  for (let i = 0; i <= count; i += 1) ctx.fillRect(dateCol + colW * i - 1, titleH, 1, height - titleH - 24);
  ctx.fillRect(dateCol - 1, titleH, 1, height - titleH - 24);
  ctx.fillStyle = "#7a8791";
  ctx.font = `500 20px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("シフトツールで作成", width - 20, height - 6);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("画像を作れませんでした")), "image/png"));
}
