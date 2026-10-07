import { useState } from "react";
import { format } from "date-fns";
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, UserRound, Users } from "lucide-react";
import { motion } from "motion/react";
import { Employee, GlobalRemark, LeaveRequest } from "../types";
import { HomeLayout, ShiftRole } from "../lib/employee-master-sync";
import { WorkforceHeatmap } from "./WorkforceHeatmap";
import { Button } from "@/components/ui/button";
import { BulletinBoard } from "./BulletinBoard";
import { AdminNotice } from "../lib/admin-notice-sync";

interface HomeViewProps {
  employees: Employee[];
  storeName: string;
  showStoreNameOnHome: boolean;
  roles: ShiftRole[];
  layout: HomeLayout;
  remarks: GlobalRemark[];
  weekDates: Date[];
  selectedDate: string;
  today: string;
  weekOffset: number;
  heatmapEnabled: boolean;
  monthDates: Date[];
  onWeekOffsetChange: (offset: number) => void;
  onDateSelect: (date: string) => void;
  onShowDashboard: () => void;
  onEmployeeSelect: (employeeId: string) => void;
  onOpenLeaveRequest: () => void;
  onInstall: () => void;
  installLabel: string;
  operatorName: string;
  onLogout: () => void;
  onOpenGuide: () => void;
  requests: LeaveRequest[];
  pendingCorrections: LeaveRequest[];
  boardMonthLabel: string;
  boardLocked: boolean;
  boardVisibility: "immediate" | "after_approval" | "private";
  correctionVisibility: "all" | "private";
  isEditor: boolean;
  notices: AdminNotice[];
  onOpenBoard: () => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
export function sortEmployeesForDisplay(employees: Employee[]): Employee[] {
  // 店舗固有の氏名ではなく、共有従業員マスタの並び順だけを正本にします。
  return [...employees].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
}

function shiftLabel(employee: Employee, date: string): string {
  const shift = employee.shifts.find(item => item.date === date);
  if (!shift?.shift) return "未入力";
  if (shift.shift === "任意入力") return shift.customShiftText || "任意入力";
  return shift.shift;
}

export function HomeView({
  employees, storeName, showStoreNameOnHome, roles, layout, remarks, weekDates, selectedDate, today, weekOffset, heatmapEnabled, monthDates,
  onWeekOffsetChange, onDateSelect, onShowDashboard, onEmployeeSelect, onOpenLeaveRequest, onInstall, installLabel,
  operatorName, onLogout, onOpenGuide, requests, pendingCorrections, boardMonthLabel, boardLocked, boardVisibility, correctionVisibility, isEditor, onOpenBoard, notices
}: HomeViewProps) {
  const [showLogout, setShowLogout] = useState(false);
  const orderedEmployees = sortEmployeesForDisplay(employees);
  const selectedDateObject = new Date(`${selectedDate}T00:00:00`);
  const selectedRemark = remarks.find(item => item.date === selectedDate);
  const workingCount = orderedEmployees.filter(employee => {
    const label = shiftLabel(employee, selectedDate);
    return label !== "未入力" && label !== "休み" && label !== "有休";
  }).length;
  const groups = [0, 1].map(index => orderedEmployees.filter(employee => {
    const roleId = employee.roleId || roles.find(role => role.name === employee.role)?.id;
    return roleId && (layout.columns[index] || []).includes(roleId);
  }));
  const unassignedStaff = orderedEmployees.filter(employee => !employee.roleId && !employee.role);
  const renderRoster = (group: Employee[]) => group.map(employee => {
    const shift = employee.shifts.find(item => item.date === selectedDate);
    const label = shiftLabel(employee, selectedDate);
    const isOff = label === "休み" || label === "有休";
    if (!shift?.shift || isOff) return null;
    return <button key={employee.id} className="home-roster-row" onClick={() => onEmployeeSelect(employee.id)}><span className="home-employee-name">{employee.displayName || employee.name}</span><span className="home-shift-value">{label}</span><ChevronRight className="w-4 h-4 text-slate-300" /></button>;
  });

  return (
    <motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-4 pb-4">
      <header className="home-brand-header">
        <div className="home-brand-cluster">
          <button type="button" className="home-app-icon" onClick={onInstall} title={installLabel} aria-label={installLabel}><img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="シフトをホーム画面に追加" /></button>
          <div className="home-brand-copy">
            <div className="home-title-line">
              <h1 className={isEditor ? "home-admin-title" : "home-store-title"} style={isEditor ? undefined : { fontSize: `clamp(0.85rem, ${Math.max(1, 1.75 - Math.max(0, storeName.length - 8) * 0.06)}rem, 1.75rem)` }}>{isEditor ? "シフト管理者" : showStoreNameOnHome && storeName.trim() && storeName !== "薬局名を設定" && storeName !== "店舗名を設定" ? `${storeName.trim().slice(0, 30)} シフト` : "シフト"}</h1>
              <span className="relative inline-flex items-center">
                <button type="button" className="home-operator cursor-pointer" aria-expanded={showLogout} onClick={() => setShowLogout(value => !value)}><UserRound className="h-4 w-4" />操作員：{operatorName}</button>
                {showLogout && <button type="button" className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg border bg-white px-4 py-3 font-bold text-slate-900 shadow-lg" onClick={onLogout}>ログアウトして別のIDで入る</button>}
              </span>
            </div>
          </div>
        </div>
        <button type="button" className="inline-flex min-h-10 items-center gap-1 self-start rounded-lg border border-white/60 px-2 py-2 text-sm font-bold text-white hover:bg-white/15 sm:px-3 sm:py-1.5" onClick={onOpenGuide}><BookOpen className="h-4 w-4" /><span className="sm:hidden">説明</span><span className="hidden sm:inline">使い方</span></button>
        <div className="home-header-week">
          <Button variant="outline" size="sm" className="home-week-button" onClick={() => onWeekOffsetChange(weekOffset - 1)}><ChevronLeft className="w-4 h-4" /> 前週</Button>
          <div className="home-header-period">
            <strong>{format(weekDates[0], "M月d日")}〜{format(weekDates[6], "M月d日")}</strong>
            {weekOffset !== 0 && <button onClick={() => onWeekOffsetChange(0)}>今週へ戻る</button>}
          </div>
          <Button variant="outline" size="sm" className="home-week-button" onClick={() => onWeekOffsetChange(weekOffset + 1)}>次週 <ChevronRight className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="home-week-grid">
        {weekDates.map(date => {
          const dateStr = format(date, "yyyy-MM-dd");
          const remark = remarks.find(item => item.date === dateStr);
          const count = orderedEmployees.filter(employee => {
            const label = shiftLabel(employee, dateStr);
            return label !== "未入力" && label !== "休み" && label !== "有休";
          }).length;
          const isHoliday = remark?.color === "red";
          return (
            <button key={dateStr} onClick={() => onDateSelect(dateStr)} className={`home-day ${dateStr === selectedDate ? "is-selected" : ""} ${dateStr === today ? "is-today" : ""} ${remark?.color ? `special-${remark.color}` : ""}`} title={remark?.type}>
              <span className={isHoliday ? "text-red-500" : "text-slate-500"}>{WEEKDAYS[date.getDay()]}</span>
              <strong>{date.getDate()}</strong>
              <small>{count}人</small>
            </button>
          );
        })}
      </div>

      <div className="home-desktop-columns"><section className="home-roster">
        <div className="home-roster-header">
          <div className="home-roster-heading"><h2>{selectedDate === today ? "今日のシフト" : "この日のシフト"}</h2><div className="home-roster-count"><Users className="w-4 h-4" /> 出勤 {workingCount}人</div></div>
          <p className="home-roster-date">{format(selectedDateObject, "M月d日")}（{WEEKDAYS[selectedDateObject.getDay()]}）</p>
          <span className="home-roster-header-spacer" aria-hidden="true" />
        </div>
        {selectedRemark?.type && selectedRemark.type !== "なし" && <div className="home-remark">{selectedRemark.type}{selectedRemark.text ? `：${selectedRemark.text}` : ""}</div>}
        {layout.visible && <div className={`grid gap-3 ${groups.every(group => group.length > 0) ? "grid-cols-2" : "grid-cols-1"}`}>
          {groups.filter(group => group.length).map((group, index) => <div key={index} className={index > 0 ? "border-l pl-3" : ""}>{renderRoster(group)}</div>)}
        </div>}
        {unassignedStaff.length > 0 && <div className="home-role-warning">役職未設定：{unassignedStaff.map(employee => employee.displayName || employee.name).join("、")}（設定画面で役職を登録してください）</div>}
        <Button variant="outline" className="w-full mt-3 h-10 font-bold" onClick={onShowDashboard}>月の全体シフトを見る <ArrowRight className="w-4 h-4 ml-2" /></Button>
      </section>

      <BulletinBoard compact notices={notices} periods={[{ label: boardMonthLabel, locked: boardLocked, requests }]} pendingCorrections={pendingCorrections} isEditor={isEditor} visibility={boardVisibility} correctionVisibility={correctionVisibility} operatorName={operatorName} onOpenBoard={onOpenBoard} /></div>

      <button className="home-leave-request" onClick={onOpenLeaveRequest}>
        <CalendarDays className="w-5 h-5" /><div><strong>休み希望日を提出する</strong><span>希望受付中のシフト案に提出できます</span></div><ArrowRight className="w-5 h-5" />
      </button>

      {heatmapEnabled && <WorkforceHeatmap dates={monthDates} employees={employees} remarks={remarks} />}
    </motion.div>
  );
}
