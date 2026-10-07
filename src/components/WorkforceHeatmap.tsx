import { format } from "date-fns";
import { Employee, GlobalRemark } from "../types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkforceHeatmapProps {
  dates: Date[];
  employees: Employee[];
  remarks: GlobalRemark[];
}

export function WorkforceHeatmap({ dates, employees, remarks }: WorkforceHeatmapProps) {
  const getWorkingCount = (dateStr: string) => employees.filter(employee => {
    const shift = employee.shifts.find(item => item.date.startsWith(dateStr));
    return Boolean(shift?.shift && shift.shift !== "休み" && shift.shift !== "有休");
  }).length;

  const colorFor = (count: number) => {
    if (count <= 1) return "border-red-200 bg-red-100 text-red-800";
    if (count === 2) return "border-amber-200 bg-amber-100 text-amber-800";
    return "border-emerald-200 bg-emerald-100 text-emerald-800";
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="py-4 border-b border-border flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">月間の人員配置</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">赤: 0〜1人／黄: 2人／緑: 3人以上</p>
        </div>
        <Badge variant="outline" className="text-[10px]">出勤人数</Badge>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-2">
          {dates.map(date => {
            const dateStr = format(date, "yyyy-MM-dd");
            const count = getWorkingCount(dateStr);
            const remark = remarks.find(item => item.date === dateStr);
            return (
              <div key={dateStr} className={`rounded-xl border p-2 text-center ${colorFor(count)}`}>
                <div className="text-[10px] font-semibold opacity-75">{format(date, "M/d")}（{["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}）</div>
                <div className="text-lg font-black leading-tight mt-1">{count}<span className="text-[10px] ml-0.5">人</span></div>
                <div className="text-[9px] h-3 truncate">{remark && remark.type !== "コメント" ? remark.type : ""}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
