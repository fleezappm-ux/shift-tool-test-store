
export type ShiftType = string;

export interface DayShift {
  date: string; // ISO string
  shift: ShiftType;
  customShiftText?: string; // e.g. "9時～17時"
  breakTime: string; // e.g. "1:00"
  workTime: string; // e.g. "8:30"
  breakCustom?: boolean; // 任意入力で、休憩を標準以外にして入力中（画面だけの目印）
  comment: string;
}

export interface GlobalRemark {
  date: string;
  type: string;
  text: string;
  color?: SpecialDayColor;
  source?: "manual" | "rule";
}

export type SpecialDayColor = "red" | "blue" | "green" | "amber" | "purple" | "gray";
export type SpecialDayBehavior = "information" | "all-off" | "duty";

export interface SpecialDayRule {
  id: string;
  name: string;
  color: SpecialDayColor;
  behavior: SpecialDayBehavior;
  enabled: boolean;
  mode: "recurring" | "annual" | "yearly" | "monthly";
  weekday: number;
  weeks: number[];
  dates: string[];
  monthDays?: string[];
  /** 毎月○日（1〜31）。mode が "monthly" のときに使う。 */
  monthDates?: number[];
  order?: number;
  showName?: boolean;
  restMode?: "none" | "all" | "selected";
  restEmployeeIds?: string[];
}

export interface Employee {
  id: string;
  name: string;
  displayName?: string;
  displayOrder?: number;
  active?: boolean;
  aliases?: string[];
  role?: EmployeeRole;
  roleId?: string;
  shifts: DayShift[];
}

export type EmployeeRole = string;
export type CommentVisibility = "all" | "editors";

export type LeaveRequestType = "有給希望" | "休み希望" | "出勤希望" | "午前休希望" | "午後休希望" | "希望なし" | "訂正依頼";
export type LeaveRequestStatus = "申請中" | "承認" | "却下" | "取消" | "対応済み";

export interface LeaveRequest {
  id: string;
  employeeId?: string;
  employeeName: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  type: LeaveRequestType;
  comment: string;
  commentVisibility?: CommentVisibility;
  desiredWorkStart?: string;
  desiredWorkEnd?: string;
  rejectionReason?: string;
  status: LeaveRequestStatus;
  submittedAt: string;
  updatedAt: string;
}

export interface PaidLeaveBalance {
  employeeId: string;
  enabled: boolean;
  remainingDays: number;
  renewalDate: string;
  grantDays: number;
  updatedAt: string;
}

export interface AutoDraftSettings {
  enabled: boolean;
  started: boolean;
  horizonMonths: number;
  lastRunAt?: string;
}

/** 1人ごとの条件。ngWeekdays は「毎週決まった休み」、weeklyDays は「週に何日勤務か」、maxPerWeek は上限だけを決めたいとき。 */
export interface PersonRule { maxPerWeek: number; ngWeekdays: number[]; weeklyDays?: number; shiftPref?: "early" | "late" | "any" }

/** 人数・連勤・個人ごとの条件（シフト表の警告に使う）。曜日は 0=日〜6=土。0人・0日は「チェックしない」。 */
export interface StaffingRules {
  minTotal: number[];
  roleMins: { roleId: string; min: number[] }[];
  maxConsecutive: number;
  people: Record<string, PersonRule>;
  /** 曜日ごとの営業時間（日〜土の7つ）。null は「決めない／休み」 */
  hours?: ({ open: string; close: string } | null)[];
  /** 営業時間のあいだ、ずっといてほしい役職 */
  alwaysRoles?: string[];
}
