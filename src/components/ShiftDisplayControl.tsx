import { ShiftDisplayMode } from "../lib/work-time-options";
export function ShiftDisplayControl({ value, onChange }: { value: ShiftDisplayMode; onChange: (value: ShiftDisplayMode) => void }) {
  return <label className="shift-display-control">勤務の表示<select aria-label="勤務の表示" value={value} onChange={event => onChange(event.target.value as ShiftDisplayMode)}><option value="both">時間＋短い名前</option><option value="time">時間のみ</option><option value="abbreviation">短い名前のみ</option></select></label>;
}
