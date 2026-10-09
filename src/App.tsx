import { AdminNotice, AdminNoticeVisibility, fetchAdminNotices, fetchAdminNoticeVisibility, saveAdminNoticeVisibility, createAdminNotice, removeAdminNotice } from "./lib/admin-notice-sync";
import { templateStorage } from "./lib/template-storage";
import { TemplateResetSettings, RESET_PENDING_KEY } from "./components/TemplateResetSettings";
import { ErrorLogPanel } from "./components/ErrorLogPanel";
import { ShiftToolGuide, type EmployeeGuideSection } from "./components/ShiftToolGuide";
import { useState, useEffect, useRef } from "react";
import { syncResetEpoch } from "./lib/reset-epoch";
import { hasUnsaved, clearUnsaved, UNSAVED_MESSAGE } from "./lib/unsaved";
import { format, addMonths } from "date-fns";
import { ja } from "date-fns/locale/ja";
import { 
  Trash2,
  PlusCircle, 
  Download, 
  Users, 
  FileCode,
  ChevronRight,
  ChevronLeft,
  Grid3X3,
  ArrowLeft,
  Home,
  PencilLine,
  LockKeyhole,
  LockOpen,
  Settings,
  Building2,
  CalendarDays,
  BookOpen,
  Wand2,
  Repeat,
  Palette,
  Clock,
  SlidersHorizontal
  ,MessageSquareText, UserRound
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { saveAs } from "file-saver";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { AutoDraftSettings, CommentVisibility, Employee, DayShift, ShiftType, GlobalRemark, LeaveRequest, LeaveRequestStatus, LeaveRequestType, PaidLeaveBalance, SpecialDayRule, StaffingRules } from "./types";
import { DEFAULT_CYCLE_PATTERNS, CyclePatterns } from "./constants";
import { calculateTimes, generateConfiguredDateRange, normalizeShiftInput, finalizeShiftText, resolveCycleShift } from "./lib/shift-utils";
import { fetchShiftsFromServer, saveMonthToServer, fetchShiftPeriodStatus, saveShiftPeriodStatus, seedSavedBaseline, subscribePending, flushPendingNow, checkPendingOnServer, PendingStatus } from "./lib/shift-sync";
import { chooseOutputFolder, getRememberedFolderName, saveBufferToRememberedFolder } from "./lib/output-destination";
import { HomeView, sortEmployeesForDisplay } from "./components/HomeView";
import { LeaveRequestView } from "./components/LeaveRequestView";
import { LeaveRequestManager } from "./components/LeaveRequestManager";
import { PersonalShiftList } from "./components/PersonalShiftList";
import { cancelLeaveRequest, deleteLeaveRequest, fetchLeaveRequests, fetchPaidLeaveBalance, savePaidLeaveBalance, submitLeaveRequest, updateLeaveRequestStatus, updateLeaveRequestWorkTime } from "./lib/leave-request-sync";
import { SpecialDaySettings } from "./components/SpecialDaySettings";
import { fetchSpecialDayRules, saveSpecialDayRules } from "./lib/special-day-sync";
import { fetchStaffingRules, saveStaffingRules, EMPTY_STAFFING_RULES } from "./lib/staffing-sync";
import { checkStaffing, hasAnyStaffingRule } from "./lib/staffing-check";
import { StaffingRulesSettings } from "./components/StaffingRulesSettings";
import { AutoPlan } from "./components/AutoAssignDialog";
import { ShiftWizard } from "./components/ShiftWizard";
import { BusinessHoursSettings } from "./components/BusinessHoursSettings";
import { buildAutoAssign, readProfiles } from "./lib/auto-assign";
import { buildDisplayRemarks, colorForRemark, DEFAULT_SPECIAL_DAY_RULES, withDefaultSpecialDayRules, shouldRestOnDate } from "./lib/special-day-utils";
import { CalendarPeriodSettings, fetchCalendarPeriodSettings, saveCalendarPeriodSettings } from "./lib/calendar-period-sync";
import { BoardVisibility, fetchStoreSettings, saveStoreSettings, fetchBoardVisibility, saveBoardVisibility, fetchCorrectionVisibility, saveCorrectionVisibility } from "./lib/store-board-sync";
import { getManagementApiKey, getShiftSession, logoutShiftSession, saveManagementApiKey, checkManagementApiKey, ShiftSession } from "./lib/auth-sync";
import { DEFAULT_STORE_MASTER, StoreMaster, StoreMasterSettings } from "./components/StoreMasterSettings";
import { ShiftLogin } from "./components/ShiftLogin";
import { EmployeeMasterSettings } from "./components/EmployeeMasterSettings";
import { RoleAndHomeSettings } from "./components/RoleAndHomeSettings";
import { BoardSettings } from "./components/BoardSettings";
import { ToolHelp } from "./components/ToolHelp";
import { UpdateBanner } from "./components/UpdateBanner";
import { SaveStatus } from "./components/SaveStatus";
import { useUnsavedGuard } from "./lib/unsaved";
import { EmployeeMasterItem, fetchEmployeeMaster, mergeEmployeesWithMaster, saveEmployeeMaster, DEFAULT_HOME_LAYOUT, DEFAULT_ROLES, fetchShiftRoles, fetchHomeLayout, saveShiftRoles, saveHomeLayout, ShiftRole, HomeLayout } from "./lib/employee-master-sync";
import { fetchCycleMaster, saveCycleMaster } from "./lib/cycle-master-sync";
import { BoardPeriod, BulletinBoard } from "./components/BulletinBoard";
import { MyPage } from "./components/MyPage";
import { AutoDraftSettings as AutoDraftSettingsView } from "./components/AutoDraftSettings";
import { WorkTimeSettings } from "./components/WorkTimeSettings";
import { readWorkTimes, saveWorkTimes, workTimeValue, displayShift, ShiftDisplayMode } from "./lib/work-time-options";
import { fetchWorkTimeMaster, saveWorkTimeMaster } from "./lib/work-time-sync";
import { ShiftDisplayControl } from "./components/ShiftDisplayControl";
import { fetchAutoDraftSettings, saveAutoDraftSettings } from "./lib/auto-draft-sync";

const EMPLOYEE_MASTER_CACHE_KEY = "employee_master_cache_v1";

function readCachedEmployeeMaster(): EmployeeMasterItem[] | null {
  try {
    const raw = templateStorage.getItem(EMPLOYEE_MASTER_CACHE_KEY);
    if (!raw) return null;
    const items: unknown = JSON.parse(raw);
    if (!Array.isArray(items) || !items.every(item => item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" && typeof item.active === "boolean")) return null;
    return items as EmployeeMasterItem[];
  } catch { return null; }
}

const DEFAULT_EMPLOYEES: string[] = [];
const PLACEHOLDER_EMPLOYEE_PATTERN = /^従業員[A-EＡ-Ｅ]$/;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DEFAULT_CALENDAR_PERIOD: CalendarPeriodSettings = { startDay: 1, endDay: 0 };

/** 今日を含む設定済みシフト期間の開始月を返します。 */
function getCurrentShiftMonth(today = new Date(), settings = DEFAULT_CALENDAR_PERIOD) {
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonth = addMonths(thisMonth, -1);
  const candidates = [thisMonth, previousMonth];
  return candidates.find(anchor => {
    const range = generateConfiguredDateRange(anchor.getFullYear(), anchor.getMonth() + 1, settings.startDay, settings.endDay);
    return range.some(date => format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"));
  }) || thisMonth;
}

function SettingsHead({ title, description, backLabel, onBack }: { title: string; description: string; backLabel: string; onBack: () => void }) {
  return <div className="settings-head"><Button variant="ghost" className="settings-head-back" onClick={onBack}><ArrowLeft className="h-4 w-4" />{backLabel}</Button><div className="settings-head-text"><h2>{title}</h2><p>{description}</p></div></div>;
}

export default function App() {
  const [appSession, setAppSession] = useState<ShiftSession | null>(() => getShiftSession());
  const [resetProgress, setResetProgress] = useState({ running: false, archived: 0, completed: false });
  const [workTimePending, setWorkTimePending] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSection, setGuideSection] = useState<EmployeeGuideSection>("home");
  const openGuide = (section: EmployeeGuideSection) => { setGuideSection(section); setGuideOpen(true); };
  const [settingsPage, setSettingsPage] = useState<"menu" | "store" | "board" | "employee" | "shift" | "worktime" | "special" | "staffing" | "operations" | "autodraft" | "other" | "reset">(() => templateStorage.getItem(RESET_PENDING_KEY) ? "reset" : "menu");
  const [workTimes, setWorkTimes] = useState(readWorkTimes);
  const [workTimeReady, setWorkTimeReady] = useState(false);
  const [workTimeLoading, setWorkTimeLoading] = useState(true);
  const [workTimeRevision, setWorkTimeRevision] = useState("");
  const [shiftDisplayMode, setShiftDisplayMode] = useState<ShiftDisplayMode>(() => {
    const saved = templateStorage.getItem("shift_display_mode");
    return saved === "both" || saved === "abbreviation" ? saved : "time";
  });
  const visibleWorkTimes = workTimes.filter(item => item.visible).map(workTimeValue);
  useEffect(() => { templateStorage.setItem("shift_display_mode", shiftDisplayMode); }, [shiftDisplayMode]);
  useEffect(() => {
    void syncResetEpoch();
    const check = () => { if (document.visibilityState === "visible") void syncResetEpoch(); };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);
  // 勤務時間は、ログイン後に1回読み込んで端末に持っておく。設定画面を開くたびに「読み込み中」に戻さず、裏で最新を取り直すだけにする。
  const settingsPageRef = useRef(settingsPage);
  settingsPageRef.current = settingsPage;
  const refreshWorkTimeRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!appSession?.token) { setWorkTimeReady(false); return; }
    setWorkTimeReady(false); setWorkTimeLoading(true);
    let cancelled = false;
    const refresh = async () => {
      try {
        const master = await fetchWorkTimeMaster();
        if (cancelled) return;
        setWorkTimes(master.items); saveWorkTimes(master.items); setWorkTimeRevision(master.revision); setWorkTimeReady(true); setWorkTimeLoading(false);
      } catch (error) { if (!cancelled) { setWorkTimeLoading(false); console.error("勤務時間マスタ取得", error); } }
    };
    refreshWorkTimeRef.current = refresh;
    void refresh();
    const focus = () => { if (settingsPageRef.current !== "worktime") void refresh(); };
    const timer = window.setInterval(() => { if (settingsPageRef.current !== "worktime" && document.visibilityState === "visible") void refresh(); }, 30000);
    window.addEventListener("focus", focus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [appSession?.token]);
  // 勤務時間の画面を開いたとき: いまの内容をすぐ見せつつ、裏で最新を確認する。
  useEffect(() => { if (settingsPage === "worktime") void refreshWorkTimeRef.current(); }, [settingsPage]);
  const [storeMaster, setStoreMaster] = useState<StoreMaster>(() => {
    const saved = templateStorage.getItem("store_master_settings");
    if (!saved) return DEFAULT_STORE_MASTER;
    try { const stored = JSON.parse(saved); return { ...DEFAULT_STORE_MASTER, ...stored, storeName: stored.storeName === "薬局名を設定" || stored.storeName === "店舗名を設定" ? "" : stored.storeName || "" }; } catch { return DEFAULT_STORE_MASTER; }
  });
  const [calendarPeriodSettings, setCalendarPeriodSettings] = useState<CalendarPeriodSettings>(() => {
    const saved = templateStorage.getItem("calendar_period_settings");
    if (saved) {
      try { return { ...DEFAULT_CALENDAR_PERIOD, ...JSON.parse(saved) }; } catch (_) { /* default */ }
    }
    return DEFAULT_CALENDAR_PERIOD;
  });
  const [calendarPeriodDraft, setCalendarPeriodDraft] = useState<CalendarPeriodSettings>(calendarPeriodSettings);
  const [calendarPeriodSaving, setCalendarPeriodSaving] = useState(false);
  const [cachedEmployeeMaster] = useState(readCachedEmployeeMaster);
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = templateStorage.getItem("shift_data");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const uniqueMap = new Map();
        data.forEach((item: any) => {
          if (item && item.id) uniqueMap.set(item.id, item);
        });
        const initialData = (Array.from(uniqueMap.values()) as Employee[]).filter(item => !/^従業員[A-EＡ-Ｅ]$/.test(String(item.name || "").trim()));
        if (cachedEmployeeMaster) return mergeEmployeesWithMaster(initialData, cachedEmployeeMaster);
        if (initialData.length > 0) return initialData;
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    return DEFAULT_EMPLOYEES.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name,
      shifts: []
    }));
  });
  const [employeeMaster, setEmployeeMaster] = useState<EmployeeMasterItem[]>(cachedEmployeeMaster || []);
  // 従業員名を直したら、ログインし直さなくても操作員の名前をすぐ最新にします。
  const operatorName = employeeMaster.find(item => item.id === appSession?.employeeId)?.displayName || appSession?.employeeName || "";
  const [roles, setRoles] = useState<ShiftRole[]>(DEFAULT_ROLES);
  const [adminNotices, setAdminNotices] = useState<AdminNotice[]>([]);
  const [adminNoticeVisibility, setAdminNoticeVisibility] = useState<AdminNoticeVisibility>("all");
  const [homeLayout, setHomeLayout] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT);
  const [globalRemarks, setGlobalRemarks] = useState<GlobalRemark[]>([]);
  // 起動時は、保存された古い月ではなく、必ず「今の期間」から始めます。
  const [currentMonth, setCurrentMonth] = useState(() => getCurrentShiftMonth(new Date(), calendarPeriodSettings));
  // 起動時は、前回閉じた画面に関係なく必ずホームから開始します。
  const [activeTab, setActiveTab] = useState(() => getShiftSession()?.role === "admin" && templateStorage.getItem(RESET_PENDING_KEY) ? "admin" : "home");
  const [lockedMonths, setLockedMonths] = useState<string[]>(() => {
    const saved = templateStorage.getItem("locked_months");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse locked months", e);
      }
    }
    return [];
  });
  const [isFromAdmin, setIsFromAdmin] = useState(false);
  const [cycleNames, setCycleNames] = useState<Record<number, string>>(() => {
    const saved = templateStorage.getItem("cycle_names");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse cycle names", e);
      }
    }
    return { 1: "パターン1" };
  });
  const [cycleAssignments, setCycleAssignments] = useState<Record<string, { cycleType: number; anchorDate: string }>>(() => {
    const saved = templateStorage.getItem("cycle_assignments");
    if (!saved) return {};
    try { return JSON.parse(saved); } catch { return {}; }
  });
  const [cyclePatterns, setCyclePatterns] = useState<CyclePatterns>(() => {
    const saved = templateStorage.getItem("cycle_patterns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_CYCLE_PATTERNS, ...parsed } as CyclePatterns;
        Object.values(merged).forEach(pattern => pattern.forEach(entry => { entry.week3 ??= entry.week1; entry.week4 ??= entry.week2; }));
        return merged;
      } catch (e) {
        console.error("Failed to parse cycle patterns", e);
      }
    }
    return DEFAULT_CYCLE_PATTERNS;
  });
  const [cycleLengths, setCycleLengths] = useState<Record<number, number>>(() => {
    try { return JSON.parse(templateStorage.getItem("cycle_lengths") || "null") || { 1: 1, 2: 2, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1 }; } catch { return { 1: 1, 2: 2, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1 }; }
  });
  const [editingCycleId, setEditingCycleId] = useState<number | null>(null);
  const [cycleSaving, setCycleSaving] = useState(false);
  const [cycleBaseline, setCycleBaseline] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"loading" | "saved" | "dirty" | "saving" | "offline" | "read-error">("loading");
  const [initialReadError, setInitialReadError] = useState("");
  const [readRetry, setReadRetry] = useState(0);
  const [syncFailure, setSyncFailure] = useState<{ message: string; at: string; count: number } | null>(null);
  const reLoginDraftRef = useRef<{ employees: Employee[]; remarks: GlobalRemark[]; operatorId: string; start: string; end: string } | null>(null);
  const [saveElapsedSeconds, setSaveElapsedSeconds] = useState(0);
  const [saveFeedback, setSaveFeedback] = useState<{
    kind: "saving" | "success" | "error";
    message: string;
  } | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(() => templateStorage.getItem("heatmap_enabled") === "true");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveRequestLoading, setLeaveRequestLoading] = useState(false);
  const [homeBoardRequests, setHomeBoardRequests] = useState<LeaveRequest[]>([]);
  const [homePendingCorrections, setHomePendingCorrections] = useState<LeaveRequest[]>([]);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus>({ count: 0, flushing: false, lastError: "", oldestAt: "" });
  const homeEarlierCache = useRef<{ key: string; items: LeaveRequest[] } | null>(null);
  const [boardPeriods, setBoardPeriods] = useState<BoardPeriod[]>([]);
  const [boardAnchor, setBoardAnchor] = useState(() => getCurrentShiftMonth(new Date(), calendarPeriodSettings));
  useEffect(() => { setBoardAnchor(getCurrentShiftMonth(new Date(), calendarPeriodSettings)); }, [calendarPeriodSettings.startDay, calendarPeriodSettings.endDay]);
  const [correctionVisibility, setCorrectionVisibility] = useState<"all" | "private">("all");
  const [specialDayRules, setSpecialDayRules] = useState<SpecialDayRule[]>(DEFAULT_SPECIAL_DAY_RULES);
  const [specialDayLoading, setSpecialDayLoading] = useState(false);
  const [staffingRules, setStaffingRules] = useState<StaffingRules>(EMPTY_STAFFING_RULES);
  const [staffingSaving, setStaffingSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [autoUndo, setAutoUndo] = useState<{ count: number; cells: { employeeId: string; date: string; prev?: DayShift }[] } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [managementApiKey, setManagementApiKey] = useState(() => getManagementApiKey());
  const [apiKeyVerified, setApiKeyVerified] = useState(() => templateStorage.getItem("api_key_verified") === "1" && !!getManagementApiKey());
  const [apiKeyCheck, setApiKeyCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [apiKeyChecking, setApiKeyChecking] = useState(false);
  const saveAndCheckApiKey = async () => {
    setApiKeyChecking(true); setApiKeyCheck(null);
    saveManagementApiKey(managementApiKey);
    const result = await checkManagementApiKey(managementApiKey);
    setApiKeyCheck(result); setApiKeyChecking(false);
    setApiKeyVerified(result.ok);
    if (result.ok) templateStorage.setItem("api_key_verified", "1"); else templateStorage.removeItem("api_key_verified");
    if (result.ok) toast.success("接続できました"); else toast.error(result.message);
  };
  const [dashboardListView, setDashboardListView] = useState(false);
  const [showLeaveManager, setShowLeaveManager] = useState(false);
  const [correctionPopup, setCorrectionPopup] = useState<{ request: LeaveRequest; shiftText: string } | null>(null);
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [creationHintHidden, setCreationHintHidden] = useState(() => templateStorage.getItem("creation_hint_hidden") === "1");
  const [creationHintOpen, setCreationHintOpen] = useState(false);
  const inCreation = isFromAdmin && activeTab === "dashboard" && appSession?.role === "admin";

  const [overviewCell, setOverviewCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [overviewShift, setOverviewShift] = useState("none");
  const [overviewCustom, setOverviewCustom] = useState("");
  const overviewDialogRef = useRef<HTMLDialogElement>(null);
  const [periodStatusLoading, setPeriodStatusLoading] = useState(false);
  const [paidLeaveBalance, setPaidLeaveBalance] = useState<PaidLeaveBalance | null>(null);
  const [autoDraftSettings, setAutoDraftSettings] = useState<AutoDraftSettings>(() => {
    try { return JSON.parse(templateStorage.getItem("shift_auto_draft_settings") || "null") || { enabled: false, started: false, horizonMonths: 3 }; }
    catch { return { enabled: false, started: false, horizonMonths: 3 }; }
  });

  useEffect(() => {
    if (syncState !== "saving") {
      setSaveElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setSaveElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [syncState]);

  useEffect(() => {
    if (!appSession?.token) return;
    let cancelled = false;
    fetchStaffingRules().then(rules => { if (!cancelled) setStaffingRules(rules); }).catch(error => console.error("人数の設定の取得に失敗しました", error));
    return () => { cancelled = true; };
  }, [appSession?.token]);

  useEffect(() => {
    if (!appSession?.token) return;
    let cancelled = false;
    fetchSpecialDayRules()
      .then(rules => {
        if (cancelled) return;
        setSpecialDayRules(withDefaultSpecialDayRules(rules));
      })
      .catch(error => console.error("特殊日設定の取得に失敗しました", error));
    return () => { cancelled = true; };
  }, [appSession?.token]);

  useEffect(() => {
    if (!appSession?.token) return;
    fetchShiftRoles().then(setRoles).catch(error => console.error("役職の取得に失敗しました", error));
    fetchHomeLayout().then(setHomeLayout).catch(error => console.error("ホーム表示設定の取得に失敗しました", error));
    fetchAdminNotices().then(setAdminNotices).catch(error => console.error("お知らせ取得", error));
    fetchAdminNoticeVisibility().then(setAdminNoticeVisibility).catch(error => console.error("お知らせ公開設定", error));
  }, [appSession?.token]);

  useEffect(() => {
    if (!appSession?.token) return;
    let cancelled = false;
    // Keep the edited period when resuming a draft after session expiry.
    const resumeMonth = reLoginDraftRef.current ? currentMonth : null;
    fetchCalendarPeriodSettings()
      .then(settings => {
        if (cancelled || !settings) return;
        setCalendarPeriodSettings(settings);
        setCalendarPeriodDraft(settings);
        templateStorage.setItem("calendar_period_settings", JSON.stringify(settings));
        setCurrentMonth(resumeMonth || getCurrentShiftMonth(new Date(), settings));
      })
      .catch(error => console.error("カレンダー期間設定の取得に失敗しました", error));
    return () => { cancelled = true; };
  }, [appSession?.token]);

  useEffect(() => {
    if (!appSession?.token) return;
    let cancelled = false;
    fetchStoreSettings()
      .then(settings => {
        if (cancelled) return;
        setStoreMaster(current => {
          const next = { ...current, storeName: settings.storeName, showStoreNameOnHome: settings.showStoreNameOnHome };
          templateStorage.setItem("store_master_settings", JSON.stringify(next));
          return next;
        });
      })
      .catch(error => console.error("店舗名の取得に失敗しました", error));
    return () => { cancelled = true; };
  }, [appSession?.token]);

  useEffect(() => {
    if (!appSession?.token) return;
    let cancelled = false;
    fetchBoardVisibility()
      .then(visibility => {
        if (cancelled) return;
        setStoreMaster(current => {
          const next = { ...current, leaveRequestBoardVisibility: visibility };
          templateStorage.setItem("store_master_settings", JSON.stringify(next));
          return next;
        });
      })
      .catch(error => console.error("休み希望の掲示板公開設定の取得に失敗しました", error));
    return () => { cancelled = true; };
  }, [appSession?.token]);

  useEffect(() => {
    if (!appSession?.token) return;
    void fetchCorrectionVisibility().then(setCorrectionVisibility).catch(error => console.error("訂正依頼公開設定を取得できませんでした", error));
  }, [appSession?.token]);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);

  // 編集操作は、起動時に編集者用IDでログインしたセッションだけ許可します。
  const previousNavigationRef = useRef({ tab: "home", admin: false });
  const currentNavigationRef = useRef({ tab: activeTab, admin: isFromAdmin });

  useEffect(() => {
    const current = currentNavigationRef.current;
    if (current.tab !== activeTab || current.admin !== isFromAdmin) {
      previousNavigationRef.current = current;
      currentNavigationRef.current = { tab: activeTab, admin: isFromAdmin };
    }
  }, [activeTab, isFromAdmin]);

  const requestEditAccess = (action: () => void) => {
    if (appSession?.role === "admin") return action();
    toast.error("編集者用IDでログインし直してください");
  };

  // ページ再読み込み時、前回「アプリ詳細・環境設定」等の編集モードだった場合でも、
  // このセッションでまだパスワードを入力していなければ編集モードを解除します。
  useEffect(() => {
    if (appSession?.role !== "admin" && isFromAdmin) {
      setIsFromAdmin(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存先フォルダ（エクセル出力用）を覚えているか確認
  const [outputFolderName, setOutputFolderName] = useState<string | null>(null);
  useEffect(() => {
    getRememberedFolderName().then(setOutputFolderName);
  }, []);

  // ホーム画面（週間カレンダー）用の状態
  const [homeWeekOffset, setHomeWeekOffset] = useState(0);
  const [homeSelectedDate, setHomeSelectedDate] = useState<string | null>(null);
  const currentMonthKey = format(currentMonth, "yyyy-MM");
  const isLocked = lockedMonths.includes(currentMonthKey);
  const homeBoardMonth = isLocked ? addMonths(currentMonth, 1) : currentMonth;

  const goHome = () => {
    setCurrentMonth(getCurrentShiftMonth(new Date(), calendarPeriodSettings));
    setHomeWeekOffset(0);
    setHomeSelectedDate(null);
    setActiveTab("home");
    setIsFromAdmin(false);
  };

  useEffect(() => {
    if (!appSession?.token) return;
    let cancelled = false;
    const range = generateConfiguredDateRange(homeBoardMonth.getFullYear(), homeBoardMonth.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);
    const requestsFor = (start: Date, end: Date) => fetchLeaveRequests(getDateStr(start), getDateStr(end));
    // 保存待ちの申請（tmp-）があるうちは取り直さない（サーバーに届く前の状態で上書きしないため）。
    if (leaveRequests.some(item => item.id.startsWith("tmp-"))) return;
    const earlierKey = `${getDateStr(range[0])}|${calendarPeriodSettings.startDay}|${calendarPeriodSettings.endDay}`;
    const load = async () => {
      // 今の期間と過去2期間を同時に取る（前は順番待ちで遅かった）。過去分は期間が同じ間は使い回す。
      const currentPromise = requestsFor(range[0], range[range.length - 1]);
      const earlierPromise: Promise<LeaveRequest[]> = homeEarlierCache.current?.key === earlierKey
        ? Promise.resolve(homeEarlierCache.current.items)
        : Promise.all([-2, -1].map(offset => {
          const anchor = addMonths(homeBoardMonth, offset);
          const dates = generateConfiguredDateRange(anchor.getFullYear(), anchor.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);
          return requestsFor(dates[0], dates[dates.length - 1]);
        })).then(list => { const items = list.flat(); homeEarlierCache.current = { key: earlierKey, items }; return items; });
      const current = await currentPromise;
      if (cancelled) return;
      setHomeBoardRequests(current);
      const earlier = await earlierPromise;
      if (!cancelled) setHomePendingCorrections([...earlier, ...current].filter(item => item.type === "訂正依頼" && item.status === "申請中"));
    };
    void load().catch(error => { console.error("ホームのお知らせ取得に失敗しました", error); if (!cancelled) { setHomeBoardRequests([]); setHomePendingCorrections([]); } });
    return () => { cancelled = true; };
  }, [appSession?.token, appSession?.role, leaveRequests, isLocked, currentMonthKey, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay]);

  useEffect(() => {
    if (!appSession?.token || activeTab !== "board") return;
    let cancelled = false;
    const loadBoardPeriods = async () => {
      const anchors = [boardAnchor, addMonths(boardAnchor, 1), addMonths(boardAnchor, 2)];
      const loaded = await Promise.all(anchors.map(async anchor => {
        const range = generateConfiguredDateRange(anchor.getFullYear(), anchor.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);
        const start = getDateStr(range[0]);
        const end = getDateStr(range[range.length - 1]);
        const [requests, locked] = await Promise.all([fetchLeaveRequests(start, end), fetchShiftPeriodStatus(start)]);
        return { label: `${format(range[0], "M/d")}〜${format(range[range.length - 1], "M/d")}`, locked, requests };
      }));
      if (!cancelled) setBoardPeriods(loaded);
    };
    void loadBoardPeriods().catch(error => { console.error("掲示板の取得に失敗しました", error); if (!cancelled) setBoardPeriods([]); });
    return () => { cancelled = true; };
  }, [appSession?.token, activeTab, boardAnchor, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay]);

  const changeHomeWeek = (offset: number) => {
    const today = new Date();
    const diffToMonday = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const displayedMonday = new Date(today);
    displayedMonday.setDate(today.getDate() + diffToMonday + offset * 7);
    displayedMonday.setHours(0, 0, 0, 0);
    setHomeWeekOffset(offset);
    setHomeSelectedDate(null);
    setCurrentMonth(getCurrentShiftMonth(displayedMonday, calendarPeriodSettings));
  };

  const installLabel = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? "ホーム画面に追加" : "デスクトップに追加";

  const installToHomeScreen = async () => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) return toast.info("すでにホーム画面から起動しています");
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") toast.success(`${installLabel}しました`);
      setInstallPrompt(null);
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      window.alert("iPhoneへの追加方法\n\n1. Safari下部の共有ボタン（□↑）を押す\n2.『ホーム画面に追加』を押す\n3. 右上の『追加』を押す");
    } else if (/Android|Mobile/i.test(navigator.userAgent)) {
      window.alert("ブラウザのメニュー（︙）を開き、『ホーム画面に追加』または『アプリをインストール』を押してください。");
    } else {
      window.alert("ブラウザ右上のインストールアイコン、またはメニュー（︙）から『アプリをインストール』を選んでください。");
    }
  };

  const goBack = () => {
    const previous = previousNavigationRef.current;
    setActiveTab(previous.tab || "home");
    setIsFromAdmin(previous.admin && appSession?.role === "admin");
  };

  const getDateStr = (date: Date) => format(date, "yyyy-MM-dd");

  // 起動時に、他の端末で保存されたシフトを複製版専用GAS経由で読み込みます。
  // 取得できた場合はそちらを優先し、取得できない場合（オフライン等）はlocalStorageの内容のまま使います。
  const syncReadyRef = useRef(false);
  const [initialSyncComplete, setInitialSyncComplete] = useState(cachedEmployeeMaster !== null);
  const skipDirtyRef = useRef(false);
  const skipRemarkDirtyRef = useRef(false);
  const editRevisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!appSession?.token) return;
    let cancelled = false;
    setSyncState("loading");
    setInitialReadError("");
    (async () => {
      try {
        // Both reads are independent. Cached master keeps the UI available while they refresh.
        // どちらか一方の取得に失敗しても、もう一方は使えるようにします（従業員は端末の古い記憶に頼らない）。
        const [merged, fetchedMaster] = await Promise.all([fetchShiftsFromServer(employees, true), fetchEmployeeMaster().catch(error => { console.error("従業員マスタ取得", error); return null; })]);
        if (cancelled) return;
        // サーバーの内容を読み込めたときだけ「前回保存した内容」として覚え、以後は変更したマスだけを保存する
        seedSavedBaseline(merged ? merged.employees : null);
        const master = fetchedMaster ?? employeeMaster;
        if (fetchedMaster) {
          templateStorage.setItem(EMPLOYEE_MASTER_CACHE_KEY, JSON.stringify(fetchedMaster));
          setEmployeeMaster(fetchedMaster);
        }
        const pending = reLoginDraftRef.current;
        const resume = pending && appSession.role === "admin" && pending.operatorId === appSession.employeeId;
        const sourceEmployees = resume ? (merged?.employees || employees).map(employee => {
          const local = pending.employees.find(item => item.id === employee.id);
          return local ? { ...employee, shifts: [...employee.shifts.filter(item => item.date < pending.start || item.date > pending.end), ...local.shifts.filter(item => item.date >= pending.start && item.date <= pending.end)] } : employee;
        }) : merged?.employees || employees;
        skipDirtyRef.current = true;
        setEmployees(mergeEmployeesWithMaster(sourceEmployees, master));
        if (resume) { skipRemarkDirtyRef.current = true; setGlobalRemarks(pending.remarks); }
        if (merged && !resume) {
          // 旧備考は複製版では表示しない。
          if (merged.supportsGlobalRemarks) {
            skipRemarkDirtyRef.current = true;
            // 祝日取得とNotion読込が同時に終わっても、先に取得できた自動祝日を消さない。
            setGlobalRemarks(previous => {
              const combined = new Map(previous.filter(item => item.type === "祝日").map(item => [item.date, item]));
              merged.globalRemarks.forEach(item => combined.set(item.date, item));
              return Array.from(combined.values());
            });
          }
        }
        syncReadyRef.current = true;
        if (resume) { editRevisionRef.current = savedRevisionRef.current + 1; reLoginDraftRef.current = null; }
        setSyncFailure(null);
        setSyncState(resume ? "dirty" : merged ? "saved" : "read-error");
        setInitialSyncComplete(true);
      } catch (error) {
        console.error("初期同期に失敗しました", error);
        if (!cancelled) {
          syncReadyRef.current = true;
          setSyncState("read-error");
          const message = error instanceof Error ? error.message : "サーバーとの通信を確認してください。";
          setInitialReadError(message);
          setSyncFailure(previous => ({ message, at: new Date().toISOString(), count: (previous?.count || 0) + 1 }));
          setInitialSyncComplete(true);
        }
      }
    })();
    return () => { cancelled = true; };
    // ログイン後に共有データと従業員マスタを取得し、端末内の古い役職情報を上書きします。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSession?.token, readRetry]);

  // 編集内容を端末内へ保存し、管理者の変更は短い待機後に共有保存します。
  useEffect(() => {
    if (employees.length > 0) {
      templateStorage.setItem("shift_data", JSON.stringify(employees));
    }
    if (!syncReadyRef.current) return;
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    editRevisionRef.current += 1;
    setSyncState("dirty");
  }, [employees]);

  useEffect(() => {
    templateStorage.setItem("locked_months", JSON.stringify(lockedMonths));
  }, [lockedMonths]);

  useEffect(() => {
    templateStorage.setItem("global_remarks", JSON.stringify(globalRemarks));
    if (!syncReadyRef.current) return;
    if (skipRemarkDirtyRef.current) {
      skipRemarkDirtyRef.current = false;
      return;
    }
    editRevisionRef.current += 1;
    setSyncState("dirty");
  }, [globalRemarks]);

  useEffect(() => {
    templateStorage.setItem("cycle_names", JSON.stringify(cycleNames));
  }, [cycleNames]);

  useEffect(() => {
    templateStorage.setItem("cycle_assignments", JSON.stringify(cycleAssignments));
  }, [cycleAssignments]);

  useEffect(() => {
    templateStorage.setItem("cycle_patterns", JSON.stringify(cyclePatterns));
  }, [cyclePatterns]);
  useEffect(() => { templateStorage.setItem("cycle_lengths", JSON.stringify(cycleLengths)); }, [cycleLengths]);

  useEffect(() => {
    if (!appSession?.token) return;
    fetchCycleMaster().then(master => {
      if (!master) return;
      setCycleNames(master.names);
      setCycleLengths(master.lengths);
      setCyclePatterns(master.patterns);
      setCycleAssignments(master.assignments || {});
      setCycleBaseline(JSON.stringify([master.names, master.lengths, master.patterns, master.assignments || {}]));
    }).catch(error => console.error("勤務パターンマスタを取得できませんでした", error));
  }, [appSession?.token]);

  useEffect(() => {
    templateStorage.setItem("heatmap_enabled", String(heatmapEnabled));
  }, [heatmapEnabled]);


  useEffect(() => {
    templateStorage.setItem("current_month", currentMonth.toISOString());
  }, [currentMonth]);

  useEffect(() => {
    templateStorage.setItem("active_tab", activeTab);
  }, [activeTab]);

  const toggleLock = async () => {
    if (!dateRange.length || periodStatusLoading) return;
    const nextLocked = !isLocked;
    const confirmed = window.confirm(nextLocked
      ? `【${format(dateRange[0], "M月d日")}〜${format(dateRange[dateRange.length - 1], "M月d日")}】の全員のシフトを「確定」します。\n\n・従業員の画面に、確定したシフトとして表示されます\n・確定を解除するまで、編集できなくなります（解除はいつでもできます）\n\n本当に確定しますか？`
      : "確定シフトを解除して、シフト案・編集中に戻しますか？");
    if (!confirmed) return;
    setPeriodStatusLoading(true);
    try {
      if (nextLocked) await saveCurrentMonth();
      const savedLocked = await saveShiftPeriodStatus(getDateStr(dateRange[0]), getDateStr(dateRange[dateRange.length - 1]), nextLocked);
      setLockedMonths(prev => savedLocked
        ? [...new Set([...prev, currentMonthKey])]
        : prev.filter(month => month !== currentMonthKey));
      toast.success(savedLocked
        ? `${format(currentMonth, "yyyy年MM月")}を確定シフトとして全端末へ共有しました`
        : `${format(currentMonth, "yyyy年MM月")}をシフト案・作成中に戻しました`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "確定状態を保存できませんでした");
    } finally {
      setPeriodStatusLoading(false);
    }
  };

  const getCycleShift = (date: Date, cycleType: number, anchorDateStr: string): ShiftType => {
    const [ay, am, ad] = anchorDateStr.split("-").map(Number);
    const anchor = new Date(ay, am - 1, ad);
    const anchorMonday = new Date(anchor);
    anchorMonday.setDate(anchor.getDate() + (anchor.getDay() === 0 ? -6 : 1 - anchor.getDay()));
    anchorMonday.setHours(0, 0, 0, 0);
    const current = new Date(date); current.setHours(0, 0, 0, 0);
    const weeksDiff = Math.floor((current.getTime() - anchorMonday.getTime()) / (7 * 86400000));
    const length = Math.max(1, Math.min(4, cycleLengths[cycleType] || 2));
    const weekIndex = ((weeksDiff % length) + length) % length;
    return resolveCycleShift(cyclePatterns, cycleType, date.getDay(), weekIndex);
  };

  const dateRange = generateConfiguredDateRange(currentMonth.getFullYear(), currentMonth.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);

  useEffect(() => {
    if (!appSession?.token || !dateRange.length) return;
    let cancelled = false;
    setPeriodStatusLoading(true);
    fetchShiftPeriodStatus(getDateStr(dateRange[0]))
      .then(locked => {
        if (cancelled) return;
        setLockedMonths(previous => locked
          ? [...new Set([...previous, currentMonthKey])]
          : previous.filter(month => month !== currentMonthKey));
      })
      .catch(error => console.error("確定状態の取得に失敗しました", error))
      .finally(() => { if (!cancelled) setPeriodStatusLoading(false); });
    return () => { cancelled = true; };
    // dateRangeはcurrentMonthKeyと期間設定から決まります。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSession?.token, currentMonthKey, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay]);

  useEffect(() => {
    if (!appSession?.token || !dateRange.length) return;
    let cancelled = false;
    setLeaveRequestLoading(true);
    fetchLeaveRequests(getDateStr(dateRange[0]), getDateStr(dateRange[dateRange.length - 1]))
      .then(items => { if (!cancelled) setLeaveRequests(items); })
      .catch(error => { if (!cancelled) console.error("希望申請の取得に失敗しました", error); })
      .finally(() => { if (!cancelled) setLeaveRequestLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSession?.token, currentMonthKey, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay]);

  useEffect(() => {
    if (activeTab !== "requests" || !appSession?.token) return;
    let cancelled = false;
    const moveToFirstOpenRequestPeriod = async () => {
      let candidate = currentMonth;
      for (let offset = 0; offset < 12; offset += 1) {
        const range = generateConfiguredDateRange(candidate.getFullYear(), candidate.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);
        if (!range.length) return;
        try {
          const locked = await fetchShiftPeriodStatus(getDateStr(range[0]));
          if (!locked) {
            if (!cancelled && format(candidate, "yyyy-MM") !== currentMonthKey) setCurrentMonth(candidate);
            return;
          }
        } catch (error) {
          console.error("希望提出期間の確認に失敗しました", error);
          return;
        }
        candidate = addMonths(candidate, 1);
      }
    };
    void moveToFirstOpenRequestPeriod();
    return () => { cancelled = true; };
    // 希望提出画面を開いた時だけ、確定済み期間を飛ばして最初の未確定期間へ進めます。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, appSession?.token]);

  const leaveSubmitQueue = useRef<Promise<unknown>>(Promise.resolve());
  const handleLeaveRequestSubmit = async (input: { employeeId: string; employeeName: string; date: string; periodStart: string; periodEnd: string; type: LeaveRequestType; comment: string; commentVisibility: CommentVisibility; desiredWorkStart?: string; desiredWorkEnd?: string }) => {
    if (!input.periodStart || !input.periodEnd) throw new Error("対象期間がありません");
    // 押した瞬間に画面へ反映し、送信は裏で順番に行う（失敗したら元に戻して知らせる）。
    const now = new Date().toISOString();
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const temp = { id: tempId, employeeId: input.employeeId, employeeName: input.employeeName, date: input.date, periodStart: input.periodStart, periodEnd: input.periodEnd, type: input.type, comment: input.comment, commentVisibility: input.commentVisibility, status: "申請中", submittedAt: now, updatedAt: now, desiredWorkStart: input.desiredWorkStart, desiredWorkEnd: input.desiredWorkEnd } as LeaveRequest;
    const inView = () => dateRange.length > 0 && input.periodStart === getDateStr(dateRange[0]);
    const sameSlot = (item: LeaveRequest) => item.employeeName === input.employeeName && item.date === input.date && (item.type === "訂正依頼") === (input.type === "訂正依頼");
    if (inView()) setLeaveRequests(prev => [...prev.filter(item => !sameSlot(item)), temp]);
    toast.success(input.type === "訂正依頼" ? "訂正依頼を提出しました" : "希望を提出しました");
    leaveSubmitQueue.current = leaveSubmitQueue.current.then(async () => {
      try {
        const saved = await submitLeaveRequest(input);
        setLeaveRequests(prev => prev.map(item => item.id === tempId ? saved : item));
      } catch (error) {
        setLeaveRequests(prev => prev.filter(item => item.id !== tempId));
        toast.error(`${input.date} の提出に失敗しました。もう一度提出してください（${error instanceof Error ? error.message : ""}）`);
      }
    });
    return temp;
  };

  const handleLeaveRequestCancel = async (id: string) => {
    setLeaveRequestLoading(true);
    try {
      const saved = await cancelLeaveRequest(id);
      setLeaveRequests(prev => prev.map(item => item.id === id ? saved : item));
      toast.success("希望を取り消しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "取り消せませんでした");
    } finally { setLeaveRequestLoading(false); }
  };

  const handleLeaveRequestStatus = async (request: LeaveRequest, status: LeaveRequestStatus, rejectionReason = "") => {
    // 押した瞬間に画面へ反映し、サーバー保存は裏で行う（失敗したら元に戻す）。
    const apply = (saved: LeaveRequest) => {
      if (homeEarlierCache.current) homeEarlierCache.current = { ...homeEarlierCache.current, items: homeEarlierCache.current.items.map(item => item.id === saved.id ? saved : item) };
      setLeaveRequests(prev => prev.map(item => item.id === saved.id ? saved : item));
      setBoardPeriods(prev => prev.map(period => ({ ...period, requests: period.requests.map(item => item.id === saved.id ? saved : item) })));
      setHomeBoardRequests(prev => prev.map(item => item.id === saved.id ? saved : item));
    };
    apply({ ...request, status, rejectionReason: status === "却下" ? rejectionReason : "", updatedAt: new Date().toISOString() } as LeaveRequest);
    let note = "";
    if (status === "承認" && request.status !== "承認" && request.date) {
      const shift: ShiftType | null = request.type === "有給希望" ? "有休" : request.type === "休み希望" ? "休み" : null;
      if (shift) {
        const target = request.employeeId ? employees.find(item => item.id === request.employeeId) : employees.find(item => (item.displayName || item.name) === request.employeeName || item.name === request.employeeName);
        if (target && dateRange.some(date => getDateStr(date) === request.date)) { handleShiftChange(target.id, request.date, shift); note = "（シフト表にも反映しました）"; }
        else note = "（シフト表には反映されていません。シフト作成で手動入力してください）";
      }
    }
    toast.success(status === "申請中" ? "申請中に戻しました" : status === "承認" ? `承認しました${note}` : "却下しました");
    void updateLeaveRequestStatus(request.id, status, rejectionReason).then(apply).catch(error => {
      apply(request);
      toast.error(`${request.employeeName}さんの状態を保存できなかったので元に戻しました（${error instanceof Error ? error.message : ""}）`);
    });
  };

  const handleLeaveRequestDelete = async (request: LeaveRequest) => {
    setLeaveRequestLoading(true);
    try {
      await deleteLeaveRequest(request.id);
      setLeaveRequests(prev => prev.filter(item => item.id !== request.id));
      setBoardPeriods(prev => prev.map(period => ({ ...period, requests: period.requests.filter(item => item.id !== request.id) })));
      setHomeBoardRequests(prev => prev.filter(item => item.id !== request.id));
      if (homeEarlierCache.current) homeEarlierCache.current = { ...homeEarlierCache.current, items: homeEarlierCache.current.items.filter(item => item.id !== request.id) };
      toast.success("申請とお知らせを削除しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "申請を削除できませんでした");
      throw error;
    } finally { setLeaveRequestLoading(false); }
  };

  // ホーム画面用: 今日を含む週（月〜日）を、homeWeekOffset週分ずらして計算します。
  const homeWeekDates: Date[] = (() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon + homeWeekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  })();
  const todayStr = getDateStr(new Date());
  const homeSelectedDateStr = homeSelectedDate && homeWeekDates.some(date => getDateStr(date) === homeSelectedDate)
    ? homeSelectedDate
    : (homeWeekDates.some(date => getDateStr(date) === todayStr) ? todayStr : getDateStr(homeWeekDates[0]));
  const homeOutputPeriods = Array.from(
    new Map(homeWeekDates.map(date => {
      const anchor = getCurrentShiftMonth(date, calendarPeriodSettings);
      const range = generateConfiguredDateRange(
        anchor.getFullYear(),
        anchor.getMonth() + 1,
        calendarPeriodSettings.startDay,
        calendarPeriodSettings.endDay
      );
      return [getDateStr(range[0]), range] as const;
    })).values()
  );
  const outputPeriods = activeTab === "home" ? homeOutputPeriods : [dateRange];
  const dashboardEmployees = sortEmployeesForDisplay(employees);
  const staffingWarnings = hasAnyStaffingRule(staffingRules)
    ? checkStaffing({ dates: dateRange, employees: dashboardEmployees, rules: staffingRules, roleNames: Object.fromEntries(roles.map(role => [role.id, role.name])), specialDayRules })
    : null;
  const operatorEmployee = dashboardEmployees.find(item => item.id === appSession?.employeeId || (item.displayName || item.name) === operatorName);
  const masterLoginEmployees = employeeMaster.filter(item => !PLACEHOLDER_EMPLOYEE_PATTERN.test(item.displayName || item.name));
  const cachedLoginEmployees = employees.filter(item => !PLACEHOLDER_EMPLOYEE_PATTERN.test(item.displayName || item.name));
  const loginEmployees: EmployeeMasterItem[] = masterLoginEmployees.length
    ? masterLoginEmployees
    : (cachedLoginEmployees.length ? cachedLoginEmployees.map((item, index) => ({ id: item.id, name: item.name, displayName: item.displayName || item.name, displayOrder: index + 1, active: item.active !== false, aliases: item.aliases || [], role: item.role || "事務員" }))
      : []);
  const displayDates = [...dateRange, ...homeWeekDates.filter(homeDate => !dateRange.some(date => getDateStr(date) === getDateStr(homeDate)))];
  const displayRemarks = buildDisplayRemarks([], specialDayRules, displayDates);
  const bandLegendItems = specialDayRules
    .filter(rule => rule.id.startsWith("band-v3:") && rule.enabled)
    .sort((first, second) => (first.order ?? 999) - (second.order ?? 999))
    .map(rule => ({ color: rule.color, label: rule.name }));

  useEffect(() => {
    if (!appSession?.employeeId) return;
    fetchPaidLeaveBalance(appSession.employeeId).then(setPaidLeaveBalance).catch(error => console.error("有休情報の取得に失敗しました", error));
  }, [appSession?.employeeId]);

  useEffect(() => { templateStorage.setItem("shift_auto_draft_settings", JSON.stringify(autoDraftSettings)); }, [autoDraftSettings]);
  useEffect(() => { if (appSession?.role !== "admin") return; fetchAutoDraftSettings().then(value => { if (value) setAutoDraftSettings(value); }).catch(() => undefined); }, [appSession?.role]);

  const updateAutoDraftSettings = async (value: AutoDraftSettings): Promise<boolean> => { setAutoDraftSettings(value); try { setAutoDraftSettings(await saveAutoDraftSettings(value)); return true; } catch (error) { toast.error(error instanceof Error ? error.message : "自動作成設定を保存できませんでした"); return false; } };

  const [autoDraftRun, setAutoDraftRun] = useState<{ state: "idle" | "running" | "done" | "error"; message: string; at?: string }>({ state: "idle", message: "" });
  const autoDraftRangeLabel = (() => {
    const base = addMonths(getCurrentShiftMonth(new Date(), calendarPeriodSettings), 1);
    const first = generateConfiguredDateRange(base.getFullYear(), base.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);
    const lastAnchor = addMonths(base, 2);
    const last = generateConfiguredDateRange(lastAnchor.getFullYear(), lastAnchor.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);
    return `${format(first[0], "M/d")}〜${format(last[last.length - 1], "M/d")}`;
  })();
  const startAutoDraft = async (silent = false) => {
    if (autoDraftRun.state === "running") return;
    if (!silent && !window.confirm(`${autoDraftRangeLabel}のシフト案を作成します。確定済み・手動編集済みの勤務は上書きしません。開始しますか？`)) return;
    setAutoDraftRun({ state: "running", message: "シフト案を作成しています…（アプリは閉じないでください）" });
    try {
    const baseMonth = addMonths(getCurrentShiftMonth(new Date(), calendarPeriodSettings), 1);
    const allRanges = Array.from({ length: 3 }, (_, offset) => {
      const anchor = addMonths(baseMonth, offset);
      return generateConfiguredDateRange(anchor.getFullYear(), anchor.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay);
    });
    // 確定済みの期間は触らない（画面にも案を入れない）
    const lockedFlags = await Promise.all(allRanges.map(range => fetchShiftPeriodStatus(getDateStr(range[0])).catch(() => false)));
    const targetRanges = allRanges.filter((_, index) => !lockedFlags[index]);
    const lockedCount = allRanges.length - targetRanges.length;
    const allDates = targetRanges.flat();
    const mondayOf = (date: Date) => { const result = new Date(date); result.setDate(date.getDate() + (date.getDay() === 0 ? -6 : 1 - date.getDay())); result.setHours(0, 0, 0, 0); return result; };
    const cycleWeekIndex = (date: Date, assignment: { cycleType: number; anchorDate: string }) => {
      const anchorMonday = mondayOf(new Date(`${assignment.anchorDate}T00:00:00`));
      const currentMonday = mondayOf(date);
      const weeks = Math.round((currentMonday.getTime() - anchorMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const length = Math.max(1, Math.min(4, cycleLengths[assignment.cycleType] || 2));
      return ((weeks % length) + length) % length;
    };
    const generatedEmployees = employees.map(employee => {
      const assignment = cycleAssignments[employee.id];
      if (!assignment) return employee;
      const shifts = [...employee.shifts];
      allDates.forEach(date => {
        const key = getDateStr(date);
        if (shifts.some(item => item.date === key)) return;
        const weekIndex = cycleWeekIndex(date, assignment);
        let shift = resolveCycleShift(cyclePatterns, assignment.cycleType, date.getDay(), weekIndex);
        if (shouldRestOnDate(date, employee.id, specialDayRules)) shift = "休み";
        
        if (!shift) return;
        const times = calculateTimes(shift);
        shifts.push({ date: key, shift, breakTime: times.breakTime, workTime: times.workTime, comment: "" });
      });
      return { ...employee, shifts };
    });
    setEmployees(generatedEmployees);
    let skipped = lockedCount;
    const startedAtMs = Date.now();
    let rangeNo = 0;
    for (const range of targetRanges) {
      rangeNo += 1;
      setAutoDraftRun({ state: "running", message: `保存中… ${rangeNo}/${targetRanges.length}期間目（${format(range[0], "M/d")}〜${format(range[range.length - 1], "M/d")}）。1期間に1〜2分かかります。他の画面に移っても大丈夫ですが、アプリは閉じないでください`, at: `経過 ${Math.round((Date.now() - startedAtMs) / 1000)}秒` });
      try {
        let tries = 0;
        for (;;) {
          try { await saveMonthToServer(generatedEmployees, globalRemarks, getDateStr(range[0]), getDateStr(range[range.length - 1]), operatorName || "シフト編集者"); break; }
          catch (innerError) {
            // 別の保存が裏で動いているだけのときは、少し待ってやり直します。
            if (innerError instanceof Error && /別の保存処理/.test(innerError.message) && tries < 5) { tries += 1; await new Promise(resolve => window.setTimeout(resolve, 8000)); continue; }
            throw innerError;
          }
        }
      } catch (error) {
        // 確定済みの期間は保存できないため、その期間だけ飛ばして続けます。
        if (error instanceof Error && /確定|ロック/.test(error.message)) skipped += 1; else throw error;
      }
    }
    const recorded = await updateAutoDraftSettings({ ...autoDraftSettings, started: true, lastRunAt: new Date().toISOString() });
    if (!recorded) { setAutoDraftRun({ state: "error", message: "シフト案は作成しましたが、「開始ずみ」の記録を共通設定に保存できませんでした。もう一度「開始する」を押してください（作成ずみの勤務は上書きされません）", at: new Date().toLocaleString("ja-JP") }); return; }
    const doneMessage = skipped ? `シフト案を作成しました（確定済みの${skipped}期間は変更していません）` : "シフト案を作成しました。「全体」「シフト作成」で確認できます";
    setAutoDraftRun({ state: "done", message: doneMessage, at: new Date().toLocaleString("ja-JP") });
    toast.success(doneMessage);
    } catch (error) { const message = error instanceof Error ? error.message : "シフト案を自動作成できませんでした"; setAutoDraftRun({ state: "error", message: `作成できませんでした：${message}`, at: new Date().toLocaleString("ja-JP") }); toast.error(message); }
  };

  const autoDraftRunRef = useRef("");
  useEffect(() => {
    if (appSession?.role !== "admin" || !autoDraftSettings.enabled || !autoDraftSettings.started) return;
    const actualMonthKey = format(getCurrentShiftMonth(new Date(), calendarPeriodSettings), "yyyy-MM");
    const lastMonth = autoDraftSettings.lastRunAt ? format(new Date(autoDraftSettings.lastRunAt), "yyyy-MM") : "";
    if (lastMonth === actualMonthKey || autoDraftRunRef.current === actualMonthKey) return;
    autoDraftRunRef.current = actualMonthKey;
    void startAutoDraft(true);
    // 月が進んだときに不足する最終月だけを補完します。既存行は上書きしません。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSession?.role, autoDraftSettings.enabled, autoDraftSettings.started, currentMonthKey]);

  const handleSaveStaffingRules = async (rules: StaffingRules) => {
    setStaffingSaving(true);
    try {
      setStaffingRules(await saveStaffingRules(rules));
      toast.success("人数・連勤の設定を保存しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "人数の設定を保存できませんでした");
    } finally {
      setStaffingSaving(false);
    }
  };
  const handleSaveSpecialDayRules = async (rules: SpecialDayRule[]) => {
    setSpecialDayLoading(true);
    try {
      const saved = await saveSpecialDayRules(rules);
      const effectiveRules = saved.length ? saved : rules;
      setSpecialDayRules(effectiveRules);
      markSetupSeen("holiday-saved");
      toast.success("お店のお休みの日を保存しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "特殊日設定を保存できませんでした");
      throw error;
    } finally {
      setSpecialDayLoading(false);
    }
  };

  const [setupHidden, setSetupHidden] = useState(() => templateStorage.getItem("setup_checklist_hidden") === "1");
  const [setupSeen, setSetupSeen] = useState<string[]>(() => { try { const v = JSON.parse(templateStorage.getItem("setup_checklist_seen") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } });
  const markSetupSeen = (key: string) => setSetupSeen(current => { if (current.includes(key)) return current; const next = [...current, key]; templateStorage.setItem("setup_checklist_seen", JSON.stringify(next)); return next; });
  const setupSteps = [
    { title: "管理者用の接続キーを入れる", hint: "「その他設定」で接続キーを入れて「保存して接続を確認」を押します。✓が出れば成功です（端末ごとに1回）", done: apiKeyVerified, onClick: () => goSettings("other") },
    { title: "従業員を登録して保存する", hint: "最初は操作員1名だけです。名前を自分の名前に直して、ほかの従業員を追加し、最後に「保存」を押します（1人だけのお店でも、名前を直して保存すれば完了）", done: setupSeen.includes("employee-saved"), onClick: () => goSettings("employee") },
    { title: "店舗名と月の区切りを決めて保存する", hint: "店舗名と、シフト表の月の区切り（例：毎月1日〜月末）を決めて「保存」を押します", done: setupSeen.includes("store-saved"), onClick: () => goSettings("store") },
    { title: "帯色（お店のお休みの日）を決めて保存する", hint: "日曜・祝日など、カレンダーに色をつける休みの日を決めます。休みがなければ「定休日はない」にチェックして保存します", done: setupSeen.includes("holiday-saved"), onClick: () => goSettings("special") },
    { title: "勤務時間を確認する", hint: "早番・遅番などの初期の勤務時間を、自分のお店に合わせて直します。このままでよければ、開いて「このままでOK」を押します", done: setupSeen.includes("worktime-confirmed"), onClick: () => goSettings("worktime") },
    { title: "勤務パターン（くり返す勤務の型）を見る", hint: "毎週・2週間ごとなど、くり返す勤務の型です。使わないお店は、開いて見るだけでOKです（見たら✓がつきます）", done: setupSeen.includes("cycle-seen"), onClick: () => { markSetupSeen("cycle-seen"); goSettings("operations"); } },
    { title: "シフトを作ってみる", hint: "「シフト作成」で、1日だけ勤務を入れてみましょう", done: employees.some(employee => employee.shifts.some(shift => shift.shift || shift.customShiftText)), onClick: () => requestEditAccess(() => { setActiveTab("dashboard"); setIsFromAdmin(true); }) },
    { title: "使い方・説明書を読む", hint: "困ったときはここを開きます", done: setupSeen.includes("guide"), onClick: () => { markSetupSeen("guide"); setGuideOpen(true); } },
  ];
  const handleSaveCalendarPeriod = async (): Promise<boolean> => {
    const startDay = calendarPeriodDraft.startDay;
    const settings = { startDay, endDay: startDay === 1 ? 0 : startDay - 1 };
    setCalendarPeriodSaving(true);
    try {
      const saved = await saveCalendarPeriodSettings(settings);
      setCalendarPeriodSettings(saved);
      setCalendarPeriodDraft(saved);
      templateStorage.setItem("calendar_period_settings", JSON.stringify(saved));
      setCurrentMonth(getCurrentShiftMonth(new Date(), saved));
      toast.success(`シフト期間を「毎月${saved.startDay}日〜${saved.endDay === 0 ? "月末" : `翌月${saved.endDay}日`}」に設定しました`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "カレンダー期間を保存できませんでした");
      return false;
    } finally {
      setCalendarPeriodSaving(false);
    }
  };

  const handleSaveBoardVisibility = async (visibility: BoardVisibility) => {
    try {
      const saved = await saveBoardVisibility(visibility);
      setStoreMaster(current => {
        const next = { ...current, leaveRequestBoardVisibility: saved };
        templateStorage.setItem("store_master_settings", JSON.stringify(next));
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "休み希望の掲示板公開設定を保存できませんでした");
      throw error;
    }
  };

  // Notionへの反映待ち（裏書き込み）の状態を画面に出す。開いたときにサーバーの反映待ちも確認する。
  useEffect(() => subscribePending(setPendingStatus), []);
  useEffect(() => { if (appSession?.role === "admin" && appSession.token) void checkPendingOnServer(); }, [appSession?.role, appSession?.token]);

  // Serialize saves so an older request cannot overwrite a newer edit.
  const saveCurrentMonth = (): Promise<void> => {
    if (!dateRange.length) return Promise.resolve();
    const revision = editRevisionRef.current;
    const snapshot = { employees, globalRemarks, start: getDateStr(dateRange[0]), end: getDateStr(dateRange[dateRange.length - 1]), editor: operatorName || "シフト編集者" };
    const task = saveQueueRef.current.catch(() => {}).then(async () => {
      if (savedRevisionRef.current >= revision) { toast.info("保存する変更はありません"); return; }
      setSyncState("saving");
      try {
        await saveMonthToServer(snapshot.employees, snapshot.globalRemarks, snapshot.start, snapshot.end, snapshot.editor);
        savedRevisionRef.current = revision;
        setSyncFailure(null);
        setSyncState(editRevisionRef.current === revision ? "saved" : "dirty");
      } catch (error) {
        setSyncState("offline");
        const message = error instanceof Error ? error.message : "共有保存に失敗しました。";
        setSyncFailure(previous => ({ message, at: new Date().toISOString(), count: (previous?.count || 0) + 1 }));
        toast.error(error instanceof Error ? error.message : "自動保存に失敗しました。編集内容は端末に残っています");
        throw error;
      }
    });
    saveQueueRef.current = task.catch(() => {});
    return task;
  };

  useEffect(() => { if (isLocked && !periodStatusLoading && (syncState === "dirty" || syncState === "offline")) { setSyncFailure(null); setSyncState("saved"); } }, [isLocked, periodStatusLoading, syncState]);

  useEffect(() => {
    if (appSession?.role !== "admin" || !initialSyncComplete || periodStatusLoading || isLocked || syncState !== "dirty") return;
    const timer = window.setTimeout(() => { void saveCurrentMonth().catch(() => {}); }, 400);
    return () => window.clearTimeout(timer);
  }, [employees, globalRemarks, currentMonthKey, syncState, initialSyncComplete, periodStatusLoading, isLocked, appSession?.role]);

  useEffect(() => {
    // 「シフト作成」に入った時は、すぐ入力できるよう編集モードで始めます（閲覧に切り替えることもできます）。
    setOverviewEditing(inCreation && !isLocked);
    setOverviewCell(null);
  }, [activeTab, currentMonthKey, isFromAdmin, isLocked]);

  useEffect(() => {
    const dialog = overviewDialogRef.current;
    if (overviewCell && dialog && !dialog.open) dialog.showModal();
    if (!overviewCell && dialog?.open) dialog.close();
  }, [overviewCell]);

  const openOverviewCell = (employee: Employee, date: string) => {
    if (!overviewEditing || !isFromAdmin || appSession?.role !== "admin" || isLocked || periodStatusLoading) return;
    const shift = employee.shifts.find(item => item.date === date);
    setOverviewShift(shift?.shift || "none");
    setOverviewCustom(shift?.customShiftText || "");
    setOverviewCell({ employeeId: employee.id, date });
  };

  const applyOverviewCell = () => {
    if (!overviewCell || !overviewEditing || !isFromAdmin || appSession?.role !== "admin" || isLocked || periodStatusLoading) return;
    const value = overviewShift === "none" ? "" : overviewShift;
    const custom = finalizeShiftText(overviewCustom);
    if (value === "任意入力" && !custom) { toast.error("勤務時間を入力してください"); return; }
    const times = calculateTimes(value === "任意入力" ? custom : value);
    setEmployees(previous => previous.map(employee => {
      if (employee.id !== overviewCell.employeeId) return employee;
      const existing = employee.shifts.find(item => item.date === overviewCell.date);
      const updated: DayShift = { ...existing, date: overviewCell.date, shift: value, customShiftText: value === "任意入力" ? custom : existing?.customShiftText, ...times, comment: existing?.comment || "" };
      return { ...employee, shifts: existing ? employee.shifts.map(item => item.date === updated.date ? updated : item) : [...employee.shifts, updated] };
    }));
    setOverviewCell(null);
  };

  const makeAutoPlan = (rules: StaffingRules): AutoPlan => {
    const roleNames = Object.fromEntries(roles.map(role => [role.id, role.name]));
    const result = buildAutoAssign({ dates: dateRange, employees: dashboardEmployees, rules, specialDayRules, leaveRequests, roleNames, defaultShift: visibleWorkTimes[0] || "9:00～18:00" });
    const count = (list: Employee[]) => checkStaffing({ dates: dateRange, employees: list, rules, roleNames, specialDayRules }).list.length;
    const applied = dashboardEmployees.map(emp => {
      const mine = result.changes.filter(change => change.employeeId === emp.id);
      const shifts = emp.shifts.map(item => { const change = mine.find(c => item.date.startsWith(c.date)); return change ? { ...item, shift: change.shift } : item; });
      const extra = mine.filter(c => !emp.shifts.some(item => item.date.startsWith(c.date))).map(c => ({ date: c.date, shift: c.shift, breakTime: "", workTime: "", comment: "" }));
      return { ...emp, shifts: [...shifts, ...extra] };
    });
    return { result, before: count(dashboardEmployees), after: count(applied), names: Object.fromEntries(dashboardEmployees.map(emp => [emp.id, emp.displayName || emp.name])), labels: Object.fromEntries(dateRange.map(d => [getDateStr(d), format(d, "M/d（E）", { locale: ja })])) };
  };
  const applyAutoPlan = (autoPlan: AutoPlan, rules: StaffingRules, saveRules: boolean) => {
    if (isLocked || periodStatusLoading || appSession?.role !== "admin") return;
    const changes = autoPlan.result.changes;
    const cells = changes.map(change => ({ employeeId: change.employeeId, date: change.date, prev: employees.find(emp => emp.id === change.employeeId)?.shifts.find(item => item.date === change.date) }));
    setEmployees(previous => previous.map(employee => {
      const mine = changes.filter(change => change.employeeId === employee.id);
      if (!mine.length) return employee;
      let shifts = [...employee.shifts];
      mine.forEach(change => {
        const existing = shifts.find(item => item.date === change.date);
        const updated: DayShift = { ...existing, date: change.date, shift: change.shift, ...calculateTimes(change.shift), comment: existing?.comment || "" };
        shifts = existing ? shifts.map(item => item.date === change.date ? updated : item) : [...shifts, updated];
      });
      return { ...employee, shifts };
    }));
    setAutoUndo({ count: changes.length, cells });
    setWizardOpen(false);
    toast.success(`${changes.length}か所に出勤を入れました。自動で保存されます`);
    if (saveRules) void handleSaveStaffingRules(rules);
  };
  const undoAutoPlan = () => {
    if (!autoUndo || isLocked) return;
    const { cells } = autoUndo;
    setEmployees(previous => previous.map(employee => {
      const mine = cells.filter(cell => cell.employeeId === employee.id);
      if (!mine.length) return employee;
      let shifts = [...employee.shifts];
      mine.forEach(cell => { shifts = cell.prev ? shifts.map(item => item.date === cell.date ? cell.prev! : item) : shifts.filter(item => item.date !== cell.date); });
      return { ...employee, shifts };
    }));
    setAutoUndo(null);
    toast.success("入れた出勤を元に戻しました");
  };

  const handleShiftChange = (employeeId: string, date: string, shift: ShiftType | "none") => {
    if (isLocked) {
      toast.error("この月は確定済みのため編集できません");
      return;
    }
    if (periodStatusLoading) {
      toast.error("確定状態を確認中です。少し待ってからもう一度お試しください");
      return;
    }
    const finalShift = shift === "none" ? "" : shift;
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== employeeId) return emp;
      
      const existingShiftIndex = emp.shifts.findIndex(s => s.date === date);
      const { breakTime, workTime } = calculateTimes(finalShift as ShiftType);
      
      const newShifts = [...emp.shifts];
      if (existingShiftIndex >= 0) {
        newShifts[existingShiftIndex] = { 
          ...newShifts[existingShiftIndex], 
          shift: finalShift as ShiftType, 
          breakTime: finalShift === "任意入力" ? newShifts[existingShiftIndex].breakTime : breakTime, 
          workTime: finalShift === "任意入力" ? newShifts[existingShiftIndex].workTime : workTime 
        };
      } else {
        newShifts.push({ date, shift: finalShift as ShiftType, breakTime, workTime, comment: "" });
      }
      
      return { ...emp, shifts: newShifts };
    }));
  };

  const handleCustomShiftTextChange = (employeeId: string, date: string, text: string) => {
    if (isLocked) return;
    const input = normalizeShiftInput(text);
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== employeeId) return emp;
      const existingShiftIndex = emp.shifts.findIndex(s => s.date === date);
      const previous = existingShiftIndex >= 0 ? emp.shifts[existingShiftIndex] : undefined;
      const { breakTime, workTime } = calculateTimes(input, previous?.breakCustom ? previous.breakTime : undefined);
      const parsed = workTime !== "0:00";
      
      const newShifts = [...emp.shifts];
      if (existingShiftIndex >= 0) {
        newShifts[existingShiftIndex] = { 
          ...newShifts[existingShiftIndex], 
          customShiftText: input,
          breakTime: parsed ? breakTime : newShifts[existingShiftIndex].breakTime,
          workTime: parsed ? workTime : newShifts[existingShiftIndex].workTime
        };
      } else {
        newShifts.push({ date, shift: "任意入力", customShiftText: input, breakTime, workTime, comment: "" });
      }
      return { ...emp, shifts: newShifts };
    }));
  };

  const finalizeCustomShiftText = (employeeId: string, date: string) => {
    if (isLocked) return;
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== employeeId) return emp;
      const existingShiftIndex = emp.shifts.findIndex(s => s.date === date);
      if (existingShiftIndex === -1) return emp;

      const currentShift = emp.shifts[existingShiftIndex];
      const finalized = finalizeShiftText(currentShift.customShiftText || "");
      if (finalized === currentShift.customShiftText) return emp;

      const { breakTime, workTime } = calculateTimes(finalized, currentShift.breakCustom ? currentShift.breakTime : undefined);
      const parsed = workTime !== "0:00";
      const newShifts = [...emp.shifts];
      newShifts[existingShiftIndex] = {
        ...currentShift,
        customShiftText: finalized,
        breakTime: parsed ? breakTime : currentShift.breakTime,
        workTime: parsed ? workTime : currentShift.workTime
      };
      return { ...emp, shifts: newShifts };
    }));
  };

  const [employeeMasterLoadError, setEmployeeMasterLoadError] = useState("");
  // 従業員マスタの画面を開くたびに、サーバーの最新を取り直します（古い画面の内容で上書きしないため）。
  useEffect(() => {
    if (appSession?.role !== "admin" || settingsPage !== "employee") return;
    let cancelled = false;
    setEmployeeMasterLoadError("");
    fetchEmployeeMaster()
      .then(master => { if (cancelled) return; templateStorage.setItem(EMPLOYEE_MASTER_CACHE_KEY, JSON.stringify(master)); setEmployeeMaster(master); })
      .catch(() => { if (!cancelled) setEmployeeMasterLoadError("最新の従業員一覧を読み込めませんでした。通信を確認して、もう一度開き直してください。"); });
    return () => { cancelled = true; };
  }, [appSession?.role, settingsPage]);

  // 保存していない変更があるまま設定画面を移動しようとしたら、確認します。
  const goSettings = (page: typeof settingsPage) => {
    if (hasUnsaved()) { if (!window.confirm(UNSAVED_MESSAGE)) return; clearUnsaved(); }
    setSettingsPage(page);
  };

  const handleSaveEmployeeMaster = async (items: EmployeeMasterItem[]) => {
    const saved = await saveEmployeeMaster(items);
    markSetupSeen("employee-saved");
    templateStorage.setItem(EMPLOYEE_MASTER_CACHE_KEY, JSON.stringify(saved));
    setEmployeeMaster(saved);
    skipDirtyRef.current = true;
    setEmployees(mergeEmployeesWithMaster(employees, saved));
    return saved;
  };

  const handleSaveRoles = async (items: ShiftRole[]) => {
    const saved = await saveShiftRoles(items);
    setRoles(saved.roles);
    setEmployeeMaster(saved.employees);
    setEmployees(previous => mergeEmployeesWithMaster(previous, saved.employees));
    templateStorage.setItem(EMPLOYEE_MASTER_CACHE_KEY, JSON.stringify(saved.employees));
  };

  // 任意入力の休憩：「標準（6時間より長いと1時間）」か「それ以外（自分で入力）」。実働時間は自動で計算します。
  const handleCustomBreakChange = (employeeId: string, date: string, mode: "standard" | "custom", value?: string) => {
    if (isLocked) return;
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== employeeId) return emp;
      return { ...emp, shifts: emp.shifts.map(item => {
        if (item.date !== date) return item;
        const text = item.customShiftText || "";
        if (mode === "standard") return { ...item, ...calculateTimes(text), breakCustom: false };
        const breakTime = value ?? item.breakTime ?? "0:00";
        const times = calculateTimes(text, breakTime || "0:00");
        return { ...item, breakTime, workTime: times.workTime, breakCustom: true };
      }) };
    }));
  };

  const copyShiftDown = (employeeId: string, startDate: string) => {
    if (isLocked) return;
    if (activeTab === employeeId && !isFromAdmin) {
      toast.error("管理者画面からのみコピー機能を使用できます");
      return;
    }
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    
    const sourceShift = emp.shifts.find(s => s.date === startDate);
    const shiftToCopy = sourceShift?.shift || "";
    const breakToCopy = sourceShift?.breakTime || "0:00";
    const workToCopy = sourceShift?.workTime || "0:00";
    const customShiftTextToCopy = sourceShift?.customShiftText;

    const datesToUpdate = dateRange
      .map(d => getDateStr(d))
      .filter(d => d > startDate);

    setEmployees(prev => prev.map(e => {
      if (e.id !== employeeId) return e;
      const newShifts = [...e.shifts];
      datesToUpdate.forEach(date => {
        const idx = newShifts.findIndex(s => s.date === date);
        if (idx >= 0) {
          newShifts[idx] = { ...newShifts[idx], shift: shiftToCopy as ShiftType, breakTime: breakToCopy, workTime: workToCopy, customShiftText: customShiftTextToCopy };
        } else {
          newShifts.push({ date, shift: shiftToCopy as ShiftType, breakTime: breakToCopy, workTime: workToCopy, customShiftText: customShiftTextToCopy, comment: "" });
        }
      });
      return { ...e, shifts: newShifts };
    }));
    toast.success("下の行にコピーしました");
  };

  const applyCycle = (employeeId: string, startDateStr: string, cycleType: number) => {
    if (isLocked) return;
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    // Use local date parsing
    const [y, m, d] = startDateStr.split("-").map(Number);
    const startDate = new Date(y, m - 1, d);
    
    const day = startDate.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const week1Mon = new Date(startDate);
    week1Mon.setDate(startDate.getDate() + diffToMon);
    week1Mon.setHours(0, 0, 0, 0);

    const datesToUpdate = dateRange
      .map(d => getDateStr(d))
      .filter(d => d >= startDateStr);

    const affected = datesToUpdate.filter(date => emp.shifts.some(shift => shift.date === date)).length;
    if (affected && !window.confirm(`${affected}件の既存シフトを勤務パターンで上書きします。続けますか？`)) return;
    setEmployees(prev => prev.map(e => {
      if (e.id !== employeeId) return e;
      const newShifts = [...e.shifts];
      
      datesToUpdate.forEach(dateStr => {
        const [currY, currM, currD] = dateStr.split("-").map(Number);
        const date = new Date(currY, currM - 1, currD);
        const dayOfWeek = date.getDay();
        const msDiff = date.getTime() - week1Mon.getTime();
        const weeksDiff = Math.floor(msDiff / (7 * 24 * 60 * 60 * 1000));
        const length = Math.max(1, Math.min(4, cycleLengths[cycleType] || 2));
        const weekIndex = ((weeksDiff % length) + length) % length;
        const cycleShift: ShiftType = resolveCycleShift(cyclePatterns, cycleType, dayOfWeek, weekIndex);
        const shift: ShiftType = shouldRestOnDate(date, e.id, specialDayRules) ? "休み" : cycleShift;

        if (shift) {
          const { breakTime, workTime } = calculateTimes(shift);
          const idx = newShifts.findIndex(s => s.date === dateStr);
          if (idx >= 0) {
            newShifts[idx] = { ...newShifts[idx], shift, breakTime, workTime, customShiftText: undefined };
          } else {
            newShifts.push({ date: dateStr, shift, breakTime, workTime, comment: "" });
          }
        }
      });
      
      return { ...e, shifts: newShifts };
    }));
    
    const nextAssignments = { ...cycleAssignments, [employeeId]: { cycleType, anchorDate: startDateStr } };
    setCycleAssignments(nextAssignments);
    // 「誰がどの勤務パターンか」は他の端末や自動作成でも使うため、適用した時点でサーバーにも保存します。
    saveCycleMaster({ names: cycleNames, lengths: cycleLengths, patterns: cyclePatterns, assignments: nextAssignments })
      .then(saved => setCycleBaseline(JSON.stringify([saved.names, saved.lengths, saved.patterns, saved.assignments || {}])))
      .catch(error => toast.error(`勤務パターンの割り当てを共通保存できませんでした：${error instanceof Error ? error.message : "通信エラー"}。勤務パターン設定画面で「保存」を押してください`));
    const forcedRest = datesToUpdate.filter(dateStr => { const [y, m, d] = dateStr.split("-").map(Number); return shouldRestOnDate(new Date(y, m - 1, d), employeeId, specialDayRules); }).length;
    toast.success(`${cycleNames[cycleType]}を適用しました`, forcedRest ? { description: `お店の「お休みの日」設定で休みにしている日が${forcedRest}日あるため、その日は「休み」になっています（設定の「お店のお休みの日」で変更できます）`, duration: 9000 } : undefined);
  };

  const reapplyCycleToCurrentMonth = (cycleType: number) => {
    if (isLocked) {
      toast.error("この月は確定済みです。確定解除してから再適用してください");
      return;
    }
    const targets = employees.filter(emp => cycleAssignments[emp.id]?.cycleType === cycleType);
    if (!targets.length) {
      toast.info(`現在${cycleNames[cycleType]}が割り当てられている従業員はいません`);
      return;
    }
    if (!window.confirm(`「${cycleNames[cycleType]}」を割り当て済みの${targets.length}名（${targets.map(emp => emp.displayName || emp.name).join("・")}）の、いま表示している期間（${format(dateRange[0], "M月d日")}〜${format(dateRange[dateRange.length - 1], "M月d日")}）に入れ直します。\n手で入れた勤務も上書きされます。よろしいですか？`)) return;

    setEmployees(prev => prev.map(emp => {
      const assignment = cycleAssignments[emp.id];
      if (!assignment || assignment.cycleType !== cycleType) return emp;
      const newShifts = [...emp.shifts];
      dateRange.forEach(date => {
        const dateStr = getDateStr(date);
        const baseShift = getCycleShift(date, cycleType, assignment.anchorDate);
        const shift = shouldRestOnDate(date, emp.id, specialDayRules) ? "休み" : baseShift;
        if (!shift) return;
        const { breakTime, workTime } = calculateTimes(shift);
        const index = newShifts.findIndex(item => item.date === dateStr);
        if (index >= 0) {
          newShifts[index] = { ...newShifts[index], shift, breakTime, workTime, customShiftText: undefined };
        } else {
          newShifts.push({ date: dateStr, shift, breakTime, workTime, comment: "" });
        }
      });
      return { ...emp, shifts: newShifts };
    }));
    toast.success(`${cycleNames[cycleType]}を表示中の期間へ再適用しました`);
  };

  const renameCycle = (num: number, name: string) => {
    setCycleNames(prev => ({ ...prev, [num]: name }));
  };

  const isUntouchedCycle = (num: number) => {
    const pattern = cyclePatterns[num] || [];
    const blank = pattern.every(day => ["week1", "week2", "week3", "week4"].every(key => (day as Record<string, string>)[key] === "休み"));
    return /^(クール|パターン)\d+$/.test(cycleNames[num] || "") && blank && !Object.values(cycleAssignments).some(assignment => (assignment as { cycleType: number }).cycleType === num);
  };
  const newCycleRef = useRef<number | null>(null);
  useEffect(() => {
    if (newCycleRef.current === null) return;
    const row = document.querySelector<HTMLElement>(`[data-cycle-row="${newCycleRef.current}"]`);
    newCycleRef.current = null;
    if (row) { row.scrollIntoView({ behavior: "smooth", block: "center" }); row.querySelector<HTMLInputElement>("input")?.focus(); }
  }, [cycleNames]);
  const addCycle = () => {
    const ids = Object.keys(cycleNames).map(Number);
    const untouched = ids.find(isUntouchedCycle);
    if (untouched !== undefined) {
      toast.error(`「${cycleNames[untouched]}」がまだ空のままです。先にその勤務パターンの中身を入れてください（連続追加はできません）`);
      newCycleRef.current = untouched; setEditingCycleId(untouched); setCycleNames(previous => ({ ...previous }));
      return;
    }
    if (ids.length >= 12) return toast.error("勤務パターンは12件までです。使わないものを削除してください");
    const nextId = Math.max(0, ...ids) + 1;
    const blank = Array.from({ length: 7 }, () => ({ week1: "休み" as ShiftType, week2: "休み" as ShiftType, week3: "休み" as ShiftType, week4: "休み" as ShiftType }));
    newCycleRef.current = nextId;
    setCycleNames(previous => ({ ...previous, [nextId]: `パターン${nextId}` }));
    setCyclePatterns(previous => ({ ...previous, [nextId]: blank }));
    setCycleLengths(previous => ({ ...previous, [nextId]: 1 }));
    setEditingCycleId(nextId);
    toast.success(`新しい勤務パターン（${ids.length + 1}件目）を追加しました。名前と曜日ごとの勤務を入れて、いちばん下の保存を押してください`);
  };
  const removeUntouchedCycles = () => {
    const ids = Object.keys(cycleNames).map(Number);
    const targets = ids.filter(isUntouchedCycle);
    const removable = targets.length >= ids.length ? targets.slice(1) : targets;
    if (!removable.length) return;
    if (!window.confirm(`中身が空のままの勤務パターン${removable.length}件をまとめて削除しますか？\n（名前を変えたもの・中身を入れたもの・人に割り当てたものは残ります）`)) return;
    const drop = new Set(removable);
    const keep = <T,>(record: Record<number, T>) => Object.fromEntries(Object.entries(record).filter(([key]) => !drop.has(Number(key)))) as Record<number, T>;
    setCycleNames(previous => keep(previous));
    setCyclePatterns(previous => keep(previous));
    setCycleLengths(previous => keep(previous));
    setEditingCycleId(value => value !== null && drop.has(value) ? null : value);
    toast.success(`${removable.length}件を削除しました。いちばん下の保存を押すと確定します`);
  };

  const deleteCycle = (cycleId: number) => {
    if (Object.keys(cycleNames).length <= 1) return toast.error("勤務パターンは最低1件必要です");
    if (!window.confirm(`${cycleNames[cycleId]}を削除しますか？`)) return;
    setCycleNames(previous => { const next = { ...previous }; delete next[cycleId]; return next; });
    setCyclePatterns(previous => { const next = { ...previous }; delete next[cycleId]; return next; });
    setCycleLengths(previous => { const next = { ...previous }; delete next[cycleId]; return next; });
    setCycleAssignments(previous => Object.fromEntries(Object.entries(previous).filter(([, assignment]) => (assignment as { cycleType: number }).cycleType !== cycleId)) as Record<string, { cycleType: number; anchorDate: string }>);
    setEditingCycleId(value => value === cycleId ? null : value);
  };

  const cycleSnapshot = JSON.stringify([cycleNames, cycleLengths, cyclePatterns, cycleAssignments]);
  const cycleInitialRef = useRef<string | null>(null);
  if (cycleInitialRef.current === null) cycleInitialRef.current = cycleSnapshot;
  const cycleDirty = cycleSnapshot !== (cycleBaseline ?? cycleInitialRef.current);
  useUnsavedGuard("cycle-master", cycleDirty);
  const handleSaveCycleMaster = async () => {
    setCycleSaving(true);
    try {
      const saved = await saveCycleMaster({ names: cycleNames, lengths: cycleLengths, patterns: cyclePatterns, assignments: cycleAssignments });
      setCycleNames(saved.names); setCycleLengths(saved.lengths); setCyclePatterns(saved.patterns); setCycleAssignments(saved.assignments || {});
      setCycleBaseline(JSON.stringify([saved.names, saved.lengths, saved.patterns, saved.assignments || {}]));
      markSetupSeen("cycle-seen");
      toast.success("勤務パターンマスタを全端末へ保存しました");
    } catch (error) { toast.error(error instanceof Error ? error.message : "勤務パターン作成マスタを保存できませんでした"); }
    finally { setCycleSaving(false); }
  };

  const downloadCSV = (outputDateRange: Date[] = dateRange) => {
    if (!outputDateRange.length) return;
    const exportEmployees = sortEmployeesForDisplay(employees);
    const headers = ["日付", "曜日", ...exportEmployees.map(e => `${e.name}(シフト)`)];
    const rows = outputDateRange.map(date => {
      const row = [
        format(date, "MM/dd"),
        format(date, "E", { locale: ja }),
        ...exportEmployees.map(e => {
          const s = getShift(e, date);
          const shiftText = s?.shift === "任意入力" ? (s?.customShiftText || "任意入力") : (s?.shift === "休み" ? "" : (s?.shift || "-"));
          return shiftText;
        })
      ];
      return row;
    });

    const csvCell = (value: string) => {
      const text = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csvContent = [headers, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `shift_${getDateStr(outputDateRange[0])}_${getDateStr(outputDateRange[outputDateRange.length - 1])}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSVをダウンロードしました");
  };

  const downloadExcel = async (outputDateRange: Date[] = dateRange) => {
    try { await buildExcel(outputDateRange); } catch (error) { toast.error(error instanceof Error ? `Excelを作成できませんでした：${error.message}` : "Excelを作成できませんでした"); }
  };

  const buildExcel = async (outputDateRange: Date[]) => {
    if (!outputDateRange.length) return;
    const ExcelJS = await import("exceljs");
    const exportEmployees = sortEmployeesForDisplay(employees);
    const workbook = new ExcelJS.Workbook();
    const borderStyle = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    } as const;

    const usedSheetNames = new Set<string>();
    // 1. 全体シフトシートの作成
    const overallSheet = workbook.addWorksheet("全体シフト");
    
    // 印刷設定: 縦向き(portrait)に変更
    overallSheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1, // 1枚に収める
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    };

    const totalCols = exportEmployees.length + 1;

    // 題名とメタデータ
    const titleRow = overallSheet.addRow(["全体シフト"]);
    titleRow.font = { size: 16, bold: true };
    overallSheet.mergeCells(1, 1, 1, totalCols);
    titleRow.alignment = { horizontal: 'center' };

    const periodStr = `集計期間: ${format(outputDateRange[0], "yyyy/MM/dd")} 〜 ${format(outputDateRange[outputDateRange.length - 1], "yyyy/MM/dd")}`;
    const outputDateStr = `出力日: ${format(new Date(), "yyyy/MM/dd")}`;
    const metaRow = overallSheet.addRow([periodStr, ...Array(exportEmployees.length).fill(""), outputDateStr]);
    overallSheet.mergeCells(2, 1, 2, totalCols - 1);
    metaRow.getCell(totalCols).alignment = { horizontal: 'right' };
    overallSheet.addRow([]); // 空行

    const overallHeaders = ["日付", ...exportEmployees.map(e => e.name)];
    const headerRow = overallSheet.addRow(overallHeaders);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.eachCell({ includeEmpty: true }, cell => {
      cell.border = borderStyle;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    });

    outputDateRange.forEach(date => {
      const gr = getGlobalRemark(date);
      const rowData = [
        format(date, "M/d(E)", { locale: ja }),
        ...exportEmployees.map(e => {
          const s = getShift(e, date);
          return s?.shift === "任意入力" ? (s?.customShiftText || "任意入力") : (s?.shift === "休み" ? "" : (s?.shift || "-"));
        }),
      ];
      const row = overallSheet.addRow(rowData);
      row.height = 22;
      
      const day = date.getDay();
      const isSunday = gr?.color === "red";
      const isSaturday = day === 6;
      const bandColor = gr?.color;
      const bandArgb = bandColor ? ({ red: "FFFEE2E2", blue: "FFDBEAFE", green: "FFDCFCE7", amber: "FFFEF3C7", purple: "FFF3E8FF", gray: "FFF1F5F9" } as Record<string, string>)[bandColor] : undefined;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 背景色（帯色）の反映
        if (bandArgb) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandArgb } };
        }

        // 日付列（1列目）のみフォント色を変更
        if (colNumber === 1) {
          if (isSunday) {
            cell.font = { color: { argb: 'FFFF0000' }, bold: true };
          } else if (isSaturday) {
            cell.font = { color: { argb: 'FF00B0F0' }, bold: true };
          }
        }


      });
    });

    // 集計行の追加
    overallSheet.addRow([]); // 空行
    
    const attendanceData = ["出勤日数合計"];
    const workHoursData = ["実働時間合計"];
    const paidLeaveData = ["有休日数合計"];

    exportEmployees.forEach(emp => {
      const stats = emp.shifts
        .filter(s => outputDateRange.some(d => s.date.startsWith(getDateStr(d))))
        .reduce((acc, s) => {
          const isWorking = s.shift && s.shift !== "休み" && s.shift !== "有休";
          const [wh, wm] = (s.workTime || "0:00").split(":").map(Number);
          return {
            workHours: acc.workHours + (isNaN(wh) ? 0 : wh + wm/60),
            attendance: acc.attendance + (isWorking ? 1 : 0),
            paid: acc.paid + (s.shift === "有休" ? 1 : 0)
          };
        }, { workHours: 0, attendance: 0, paid: 0 });

      attendanceData.push(`${stats.attendance}日`);
      workHoursData.push(`${stats.workHours.toFixed(1)}h`);
      paidLeaveData.push(`${stats.paid}日`);
    });

    [attendanceData, workHoursData, paidLeaveData].forEach(data => {
      const row = overallSheet.addRow(data);
      row.font = { bold: true };
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center' };
        if (colNumber === 1) cell.alignment = { horizontal: 'right' };
      });
    });

    // 列幅の調整 (Portrait用に最適化)
    overallSheet.getColumn(1).width = 10;
    exportEmployees.forEach((_, i) => {
      overallSheet.getColumn(i + 2).width = 12; // 少し広げる
    });

    // 2. 各個人のシートを作成
    exportEmployees.forEach(emp => {
      const baseSheetName = ((emp.displayName || emp.name || "従業員").replace(/[\\/?*[\]:]/g, "_").slice(0, 28)) || "従業員";
      let sheetName = baseSheetName;
      for (let n = 2; usedSheetNames.has(sheetName.toLowerCase()) || sheetName === "全体シフト"; n++) sheetName = `${baseSheetName.slice(0, 26)}_${n}`;
      usedSheetNames.add(sheetName.toLowerCase());
      const empSheet = workbook.addWorksheet(sheetName);
      empSheet.pageSetup = { 
        paperSize: 9, 
        orientation: 'portrait', 
        fitToPage: true, 
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0, footer: 0 }
      };
      
      const empTitleRow = empSheet.addRow([`${emp.displayName || emp.name} 様 シフト表`]);
      empTitleRow.font = { size: 14, bold: true };
      empSheet.mergeCells(1, 1, 1, 5);
      
      const empMetaRow = empSheet.addRow([periodStr, "", "", "", outputDateStr]);
      empSheet.mergeCells(2, 1, 2, 4);
      empMetaRow.getCell(5).alignment = { horizontal: 'right' };
      empSheet.addRow([]);

      const empHeaders = ["日付", "シフト", "休憩時間", "実働時間"];
      const empHeaderRow = empSheet.addRow(empHeaders);
      empHeaderRow.font = { bold: true };
      empHeaderRow.alignment = { horizontal: 'center' };
      empHeaderRow.eachCell({ includeEmpty: true }, cell => {
        cell.border = borderStyle;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      });

      outputDateRange.forEach(date => {
        const s = getShift(emp, date);
        const gr = getGlobalRemark(date);
        const shiftText = s?.shift === "任意入力" ? (s?.customShiftText || "任意入力") : (s?.shift === "休み" ? "" : (s?.shift || "-"));
        const rowData = [
          format(date, "M/d(E)", { locale: ja }),
          shiftText,
          s?.breakTime || "0:00",
          s?.workTime || "0:00"
        ];
        const row = empSheet.addRow(rowData);
        row.height = 22;
        const day = date.getDay();
        const isSunday = gr?.color === "red";
        const isSaturday = day === 6;
        const bandColor = gr?.color;
        const bandArgb = bandColor ? ({ red: "FFFEE2E2", blue: "FFDBEAFE", green: "FFDCFCE7", amber: "FFFEF3C7", purple: "FFF3E8FF", gray: "FFF1F5F9" } as Record<string, string>)[bandColor] : undefined;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = borderStyle;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };

          // 背景色（帯色）の反映
          if (bandArgb) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandArgb } };
        }

          // 日付列（1列目）のみフォント色を変更
          if (colNumber === 1) {
            if (isSunday) {
              cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            } else if (isSaturday) {
              cell.font = { color: { argb: 'FF00B0F0' }, bold: true };
            }
          }

          if (colNumber === 5) {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          }
        });
      });

      // 合計行の追加
      const stats = emp.shifts
        .filter(s => outputDateRange.some(d => s.date.startsWith(getDateStr(d))))
        .reduce((acc, s) => {
          const isWorking = s.shift && s.shift !== "休み" && s.shift !== "有休";
          const [wh, wm] = (s.workTime || "0:00").split(":").map(Number);
          const [bh, bm] = (s.breakTime || "0:00").split(":").map(Number);
          return {
            workHours: acc.workHours + (isNaN(wh) ? 0 : wh + wm/60),
            breakHours: acc.breakHours + (isNaN(bh) ? 0 : bh + bm/60),
            attendance: acc.attendance + (isWorking ? 1 : 0),
            paid: acc.paid + (s.shift === "有休" ? 1 : 0)
          };
        }, { workHours: 0, breakHours: 0, attendance: 0, paid: 0 });

      empSheet.addRow([]);
      const totalRow = empSheet.addRow([
        "期間合計",
        "",
        `${stats.breakHours.toFixed(1)}h`,
        `${stats.workHours.toFixed(1)}h`,
        ""
      ]);
      totalRow.font = { bold: true };
      totalRow.eachCell({ includeEmpty: true }, cell => {
        cell.alignment = { horizontal: 'center' };
        cell.border = borderStyle;
      });

      const detailRow = empSheet.addRow([
        "出勤日数",
        `${stats.attendance}日`,
        "有休日数",
        `${stats.paid}日`,
        ""
      ]);
      detailRow.font = { bold: true };
      detailRow.eachCell({ includeEmpty: true }, cell => {
        cell.alignment = { horizontal: 'center' };
        cell.border = borderStyle;
      });

      empSheet.getColumn(1).width = 10;
      empSheet.getColumn(2).width = 18;
      empSheet.getColumn(3).width = 8;
      empSheet.getColumn(4).width = 8;
      empSheet.getColumn(5).width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `shift_${getDateStr(outputDateRange[0])}_${getDateStr(outputDateRange[outputDateRange.length - 1])}.xlsx`;
    const savedToFolder = await saveBufferToRememberedFolder(fileName, buffer as ArrayBuffer);
    if (savedToFolder) {
      toast.success(`保存先フォルダに ${fileName} を書き出しました`);
    } else {
      saveAs(new Blob([buffer]), fileName);
      toast.success("Excelファイルをダウンロードしました");
    }
  };

  const getGlobalRemark = (date: Date) => {
    const dateStr = getDateStr(date);
    return displayRemarks.find(r => r.date === dateStr);
  };

  const getRowBgClass = (date: Date) => {
    const color = colorForRemark(getGlobalRemark(date), specialDayRules);
    return color ? `shift-row-special-${color}` : "";
  };

  const getShift = (employee: Employee | undefined, date: Date) => {
    if (!employee || !employee.shifts) return null;
    const dateStr = getDateStr(date);
    return employee.shifts.find(s => s.date.startsWith(dateStr));
  };

  const needsReLogin = /ログイン.*(有効期限|必要|切れ)|再.*ログイン/.test(syncFailure?.message || initialReadError);
  const reLoginForSync = () => {
    if (editRevisionRef.current > savedRevisionRef.current && dateRange.length) {
      reLoginDraftRef.current = { employees, remarks: globalRemarks, operatorId: appSession?.employeeId || "", start: getDateStr(dateRange[0]), end: getDateStr(dateRange[dateRange.length - 1]) };
    }
    syncReadyRef.current = false;
    logoutShiftSession(); setAppSession(null); setOverviewCell(null);
    toast.info("同じ操作員で再ログインしてください。未保存の編集は保持します。");
  };
  const copySyncError = async () => {
    const message = (syncFailure?.message || initialReadError).replace(/https?:\/\/\S+/g, "[接続先]").replace(/(token|key|password|パスワード|接続キー)\s*[:=]\s*[^\s、]+/gi, "$1=[非表示]");
    const detail = `シフトツールのエラー\n発生日時：${syncFailure ? new Date(syncFailure.at).toLocaleString("ja-JP") : "不明"}\n対象期間：${dateRange.length ? `${getDateStr(dateRange[0])}〜${getDateStr(dateRange[dateRange.length - 1])}` : "不明"}\n内容：${message}`;
    try { await navigator.clipboard.writeText(detail); toast.success("エラー詳細をコピーしました。管理者へお伝えください。"); }
    catch { window.prompt("この内容をコピーして管理者へお伝えください。", detail); }
  };
  const renderSyncStatus = () => <span className={`creation-save-status status-${syncState}`} role="status"><i aria-hidden="true" />{syncState === "loading" ? "読込中…" : syncState === "saving" ? "保存中…" : syncState === "dirty" ? "まもなく自動保存します…" : syncState === "offline" ? "保存できていません" : syncState === "read-error" ? needsReLogin ? "再ログインが必要" : "読込失敗" : "✓ 自動保存ずみ"}</span>;
  const renderAutoSaveNote = () => <p className="mx-3 my-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">入力は「案」として自動で保存されます（保存ボタンなし）。「シフトを確定」を押すまで、従業員には「案」として見えます。</p>;
  const renderSyncFailure = () => (syncState === "offline" || syncState === "read-error") && <div className="creation-sync-error" role="alert">
    <strong>{needsReLogin ? "再ログインしてください。未保存の編集内容は保持します。" : syncState === "read-error" ? "共有データを読み込めませんでした。" : "保存できませんでした。編集内容は端末に残っています。"}</strong>
    <p>{syncFailure?.message || initialReadError}</p>
    <div>{needsReLogin ? <Button size="sm" onClick={reLoginForSync}>再ログイン</Button> : syncState === "read-error" ? <Button size="sm" onClick={() => setReadRetry(value => value + 1)}>再読み込み</Button> : <Button size="sm" disabled={isLocked || periodStatusLoading} onClick={() => { void saveCurrentMonth().catch(() => {}); }}>再保存</Button>}
    <Button size="sm" variant="outline" onClick={() => { void copySyncError(); }}>エラー詳細をコピー</Button></div>
    {(syncFailure?.count || 0) > 1 && <p>解決しない場合は、エラー詳細を管理者へ連絡してください。</p>}
  </div>;
  const moveCreationPeriod = async (direction: number) => {
    if (appSession?.role === "admin" && editRevisionRef.current > savedRevisionRef.current) {
      try { await saveCurrentMonth(); } catch { return; }
    }
    setCurrentMonth(previous => addMonths(previous, direction));
  };
  const renderCreationPeriod = () => <div className="creation-period-bar"><Button variant="outline" size="sm" disabled={syncState === "saving"} onClick={() => { void moveCreationPeriod(-1); }} aria-label="前の期間"><ChevronLeft className="h-4 w-4" /><span>前の期間</span></Button><div><small>{dateRange.length ? format(dateRange[0], "yyyy年") : ""}</small><strong>{dateRange.length ? `${format(dateRange[0], "M月d日")}〜${format(dateRange[dateRange.length - 1], "M月d日")}` : "期間未設定"}</strong></div><Button variant="outline" size="sm" disabled={syncState === "saving"} onClick={() => { void moveCreationPeriod(1); }} aria-label="次の期間"><span>次の期間</span><ChevronRight className="h-4 w-4" /></Button></div>;
  if (!appSession) return <><ShiftLogin employees={loginEmployees} onLogin={session => { setAppSession(session); if (templateStorage.getItem("shift_guide_hidden_v1") !== "1") openGuide("home"); toast.success(session.role === "admin" ? "編集者としてログインしました" : "ログインしました"); }} /><UpdateBanner /><Toaster position="top-center" /></>;
  if (!initialSyncComplete) return <main className="flex min-h-dvh items-center justify-center bg-slate-50"><div className="rounded-2xl bg-white px-8 py-7 text-center shadow-xl"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /><strong className="text-slate-800">従業員マスタを同期しています</strong><p className="mt-2 text-xs text-slate-500">役職情報を確認してから表示します</p></div></main>;

  return (
    <Tabs value={activeTab} onValueChange={value => {
      if (!workTimePending || window.confirm("勤務時間の追加・変更がまだ完了していません。画面を離れますか？")) setActiveTab(value);
    }} onClickCapture={event => {
      if (activeTab !== "admin" || settingsPage !== "worktime" || !workTimePending ||
        (event.target instanceof Element && event.target.closest("[data-work-time-settings]"))) return;
      if (!window.confirm("勤務時間の追加・変更がまだ完了していません。画面を離れますか？")) {
        event.preventDefault(); event.stopPropagation();
      }
    }} className="shift-shell flex h-dvh w-full overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar */}
      <aside className="shift-sidebar hidden md:flex w-64 bg-card border-r border-border p-6 flex-col shrink-0 overflow-y-auto">
        <div className="text-xl font-bold text-primary mb-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-10 h-10 object-contain rounded-xl" />
            <div className="leading-tight"><span className="block text-base">シフト管理</span></div>
          </div>
        </div>

        <div className="space-y-8 flex-1">
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-4 px-2">
              基本メニュー
            </h3>
            <div className="flex flex-col gap-2.5">
            <Button 
                variant="outline" 
                className={`w-full justify-start h-12 px-4 text-sm font-semibold transition-all group relative overflow-hidden ${(activeTab === "home" && !isFromAdmin) ? "bg-slate-100 border-slate-300 shadow-inner" : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"}`}
                onClick={() => {
                  goHome();
                }}
              >
                <div className={`absolute inset-y-0 left-0 w-1 transform -translate-x-full group-hover:translate-x-0 transition-transform ${(activeTab === "home" && !isFromAdmin) ? "bg-blue-500 translate-x-0" : "bg-slate-400"}`} />
                <Home className="w-4 h-4 mr-3 text-blue-600" />
                ホーム
              </Button>
              <Button
                variant="outline"
                className={`w-full justify-start h-12 px-4 text-sm font-semibold transition-all group relative overflow-hidden ${(activeTab === "dashboard" && !isFromAdmin) ? "bg-slate-100 border-slate-300 shadow-inner" : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"}`}
                onClick={() => { setActiveTab("dashboard"); setIsFromAdmin(false); }}
              >
                <div className={`absolute inset-y-0 left-0 w-1 transform -translate-x-full group-hover:translate-x-0 transition-transform ${(activeTab === "dashboard" && !isFromAdmin) ? "bg-blue-500 translate-x-0" : "bg-slate-400"}`} />
                <Grid3X3 className="w-4 h-4 mr-3 text-blue-600" />
                全体シフト
              </Button>
              {appSession.role === "employee" && <>
                <Button variant="outline" className="w-full justify-start h-12 px-4 text-sm font-semibold" onClick={() => { setBoardAnchor(getCurrentShiftMonth(new Date(), calendarPeriodSettings)); setActiveTab("board"); }}><MessageSquareText className="mr-3 h-4 w-4 text-amber-600" />お知らせ掲示板</Button>
                <Button variant="outline" className="w-full justify-start h-12 px-4 text-sm font-semibold" onClick={() => setActiveTab("mypage")}><UserRound className="mr-3 h-4 w-4 text-blue-600" />マイページ</Button>
              </>}
              <Button variant="outline" className="sidebar-leave-button w-full justify-start h-12 px-4 text-sm font-semibold" onClick={() => { setActiveTab("requests"); setIsFromAdmin(false); }}><CalendarDays className="mr-3 h-4 w-4" />休み希望日提出</Button>
            </div>
          </section>

          {appSession.role === "admin" && <>
          <section className="mb-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-4 px-2">
              アクション
            </h3>
            <div className="flex flex-col gap-2.5">
              <Button 
                variant="outline" 
                className={`w-full justify-start h-12 px-4 text-sm font-semibold transition-all group relative overflow-hidden ${(activeTab === "dashboard" && isFromAdmin) ? "bg-slate-100 border-slate-300 shadow-inner" : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"}`}
                onClick={() => requestEditAccess(() => { setActiveTab("dashboard"); setIsFromAdmin(true); })}
              >
                <div className={`absolute inset-y-0 left-0 w-1 transform -translate-x-full group-hover:translate-x-0 transition-transform ${(activeTab === "dashboard" && isFromAdmin) ? "bg-blue-500 translate-x-0" : "bg-slate-400"}`} />
                <PencilLine className="w-4 h-4 mr-3 text-blue-600" />
                シフト作成
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button 
                    variant="outline" 
                    className="w-full justify-start h-12 px-4 text-sm font-semibold bg-white hover:bg-slate-50 border-slate-200 transition-all group relative overflow-hidden" 
                  />}>
                    <div className="absolute inset-y-0 left-0 w-1 bg-green-500 transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                    <Download className="w-4 h-4 mr-3 text-green-600" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>データ出力</span>
                      <span className="text-[10px] font-medium opacity-70">
                        {outputPeriods.map(period => `${format(period[0], "MM/dd")}〜${format(period[period.length - 1], "MM/dd")}`).join(" / ")}
                      </span>
                    </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-white border-border shadow-2xl z-50 w-56 p-1">
                  {outputPeriods.map(period => {
                    const periodLabel = `${format(period[0], "MM/dd")}〜${format(period[period.length - 1], "MM/dd")}`;
                    return (
                      <div key={getDateStr(period[0])} className="border-b border-slate-100 last:border-b-0 py-1">
                        <div className="px-3 py-1 text-[10px] font-black text-slate-500">{periodLabel}</div>
                        <DropdownMenuItem className="text-xs font-medium cursor-pointer py-2 px-3 rounded-md focus:bg-slate-100 transition-colors" onClick={() => downloadCSV(period)}>
                          <FileCode className="w-3 h-3 mr-2 text-slate-400" /> CSV形式でダウンロード
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-medium cursor-pointer py-2 px-3 rounded-md focus:bg-slate-100 transition-colors" onClick={() => void downloadExcel(period)}>
                          <Grid3X3 className="w-3 h-3 mr-2 text-green-600" /> Excel形式でダウンロード
                        </DropdownMenuItem>
                      </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-4 px-2">
              システム設定
            </h3>
            <div className="flex flex-col gap-2.5">
              <Button 
                variant="outline" 
                className={`w-full justify-start h-12 px-4 text-sm font-semibold transition-all group relative overflow-hidden ${(activeTab === "admin" && isFromAdmin) ? "bg-slate-100 border-slate-300 shadow-inner" : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"}`}
                onClick={() => {
                  requestEditAccess(() => {
                    setActiveTab("admin");
                    setIsFromAdmin(true);
                    setSettingsPage("menu");
                  });
                }}
              >
                <div className={`absolute inset-y-0 left-0 w-1 transform -translate-x-full group-hover:translate-x-0 transition-transform ${(activeTab === "admin" && isFromAdmin) ? "bg-slate-800 translate-x-0" : "bg-slate-400"}`} />
                <Settings className="w-4 h-4 mr-3 text-slate-600" />
                設定
              </Button>
            </div>
          </section>
          </>}
        </div>

        <div className="mt-auto pt-6 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-slate-500" onClick={() => { logoutShiftSession(); setAppSession(null); setActiveTab("home"); setIsFromAdmin(false); }}>
            ログアウト
          </Button>
          {appSession.role === "admin" && <>
          <div className="sync-indicator flex items-center gap-2 text-xs">
            <span className={`sync-dot ${syncState}`} />
            {syncState === "loading" ? "読込中" : syncState === "saving" ? "自動保存中" : syncState === "dirty" ? "自動保存待ち" : syncState === "read-error" ? "共有データの読込失敗" : syncState === "offline" ? "保存失敗（端末内に保存済み）" : "保存済み"}
          </div></>}
        </div>
      </aside>

      {appSession?.role === "admin" && !getManagementApiKey() && activeTab !== "admin" && <div role="status" className="fixed inset-x-3 top-3 z-[60] rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-900 shadow-xl"><p>最初に1回だけ、管理者用の接続キーを入れてください。入れるまで、シフトは保存できません。</p><button type="button" className="mt-2 rounded-lg bg-white px-3 py-1 text-sm font-black text-slate-900" onClick={() => { setActiveTab("admin"); setSettingsPage("other"); }}>接続キーを入れる</button></div>}
      {appSession?.role === "admin" && pendingStatus.count > 0 && pendingStatus.lastError && <div role="alert" className="fixed inset-x-3 top-3 z-[70] rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-xl"><p>⚠ Notionへの反映が終わっていません（{pendingStatus.count}件）。内容はサーバーに保存済みで、画面には表示されます。自動で再試行しています。</p><p className="mt-1 text-xs font-normal">{pendingStatus.lastError}</p><button type="button" disabled={pendingStatus.flushing} className="mt-2 rounded-lg bg-white px-3 py-1 text-sm font-black text-red-700 disabled:opacity-60" onClick={() => { void flushPendingNow(); }}>{pendingStatus.flushing ? "反映中…" : "今すぐ再試行"}</button></div>}

      {/* Mobile bottom bar (PCはサイドバーのまま) */}
      {appSession?.role === "admin" && (syncState === "saving" || syncState === "dirty" || syncState === "offline") && <div role="status" className={`md:hidden fixed inset-x-3 bottom-[76px] z-50 rounded-xl px-4 py-3 text-center text-base font-black shadow-xl ${syncState === "offline" ? "bg-red-600 text-white" : "bg-amber-400 text-slate-900"}`}>{syncState === "offline" ? (/接続キー/.test(syncFailure?.message || "") ? "⚠ 保存できていません。接続キーが未設定です（設定→その他設定）" : "⚠ 保存できていません。通信を確認してください") : "保存しています…この画面を動かさないでください"}</div>}
      <nav onClickCapture={event => { if (appSession?.role === "admin" && (syncState === "saving" || syncState === "dirty")) { event.stopPropagation(); event.preventDefault(); toast.error("保存中です。数秒待ってから移動してください"); } }} className="shift-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex items-stretch">
        <button
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${(activeTab === "home" && !isFromAdmin) ? "text-blue-600" : "text-slate-500"}`}
          onClick={goHome}
        >
          <Home className="w-5 h-5" />
          ホーム
        </button>
        <button
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${(activeTab === "dashboard" && !isFromAdmin) ? "text-blue-600" : "text-slate-500"}`}
          onClick={() => { setActiveTab("dashboard"); setIsFromAdmin(false); }}
        >
          <Grid3X3 className="w-5 h-5" />
          全体
        </button>
        {appSession.role === "employee" ? <>
          <button className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${activeTab === "board" ? "text-blue-600" : "text-slate-500"}`} onClick={() => { setBoardAnchor(getCurrentShiftMonth(new Date(), calendarPeriodSettings)); setActiveTab("board"); setIsFromAdmin(false); }}><MessageSquareText className="w-5 h-5" />掲示板</button>
          <button className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${activeTab === "requests" ? "text-pink-600" : "text-slate-500"}`} onClick={() => { setActiveTab("requests"); setIsFromAdmin(false); }}><CalendarDays className="w-5 h-5" />休み希望</button>
          <button className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${activeTab === "mypage" ? "text-blue-600" : "text-slate-500"}`} onClick={() => { setActiveTab("mypage"); setIsFromAdmin(false); }}><UserRound className="w-5 h-5" />マイページ</button>
        </> : <>
          <button className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${isFromAdmin && activeTab !== "admin" ? "text-blue-600" : "text-slate-500"}`} onClick={() => requestEditAccess(() => { setActiveTab("dashboard"); setIsFromAdmin(true); })}><PencilLine className="w-5 h-5" />シフト作成</button>
          <button className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${activeTab === "board" ? "text-amber-600" : "text-slate-500"}`} onClick={() => { setBoardAnchor(getCurrentShiftMonth(new Date(), calendarPeriodSettings)); setActiveTab("board"); setIsFromAdmin(true); }}><MessageSquareText className="w-5 h-5" />掲示板</button>
          <button className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${(activeTab === "admin" && isFromAdmin) ? "text-blue-600" : "text-slate-500"}`} onClick={() => { requestEditAccess(() => { setActiveTab("admin"); setIsFromAdmin(true); setSettingsPage("menu"); }); }}><FileCode className="w-5 h-5" />設定</button>
        </>}
      </nav>

      {/* Main Content */}
      <main className={`shift-main flex-1 flex flex-col overflow-hidden p-6 pb-24 md:pb-6 gap-6 ${activeTab === "dashboard" ? "dashboard-active" : ""}`}>
        {appSession.role === "employee" && activeTab !== "home" && activeTab !== "mypage" && <div className="flex shrink-0 justify-end"><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700" onClick={() => openGuide(activeTab === "dashboard" ? "dashboard" : activeTab === "board" ? "board" : activeTab === "requests" ? "requests" : activeTab === "mypage" ? "mypage" : "personal")}><BookOpen className="h-4 w-4" />このページの説明</button></div>}
        {activeTab === "mypage" && (
        <header className="mypage-header shrink-0">
          <div className="mypage-header-top">
            <Button variant="ghost" size="sm" className="mypage-back" onClick={goBack}><ArrowLeft className="w-4 h-4" />戻る</Button>
            <h1 className="mypage-title"><UserRound className="h-6 w-6" />マイページ</h1>
            {appSession.role === "employee" && <button type="button" className="mypage-guide" onClick={() => openGuide("mypage")}><BookOpen className="h-4 w-4" /><span className="sm:hidden">説明</span><span className="hidden sm:inline">このページの説明</span></button>}
          </div>
          <div className="mypage-header-period">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}><ChevronLeft className="w-4 h-4" />前の期間</Button>
            <strong>{dateRange.length ? `${format(dateRange[0], "M/d")}〜${format(dateRange[dateRange.length - 1], "M/d")}` : "期間未設定"}</strong>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>次の期間<ChevronRight className="w-4 h-4" /></Button>
          </div>
        </header>
        )}

        <div className={`flex-1 min-h-0 pt-2 ${activeTab === "dashboard" ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto"}`}>
          <AnimatePresence mode="wait">
            {activeTab === "home" ? (
              <HomeView
                employees={employees}
                storeName={storeMaster.storeName}
                showStoreNameOnHome={storeMaster.showStoreNameOnHome}
                roles={roles}
                layout={homeLayout}
                remarks={displayRemarks}
                weekDates={homeWeekDates}
                selectedDate={homeSelectedDateStr}
                today={todayStr}
                weekOffset={homeWeekOffset}
                heatmapEnabled={heatmapEnabled}
                monthDates={dateRange}
                onWeekOffsetChange={changeHomeWeek}
                onDateSelect={setHomeSelectedDate}
                onShowDashboard={() => { setActiveTab("dashboard"); setIsFromAdmin(false); }}
                onEmployeeSelect={(employeeId) => { setActiveTab(employeeId); setIsFromAdmin(false); }}
                onOpenLeaveRequest={() => { setActiveTab("requests"); setIsFromAdmin(false); }}
                onInstall={installToHomeScreen}
                installLabel={installLabel}
                operatorName={operatorName || "未選択"}
                onOpenGuide={() => openGuide("home")}
                onLogout={() => { logoutShiftSession(); setAppSession(null); setActiveTab("home"); setIsFromAdmin(false); }}
                requests={homeBoardRequests}
                pendingCorrections={homePendingCorrections}
                boardMonthLabel={(() => { const r = generateConfiguredDateRange(homeBoardMonth.getFullYear(), homeBoardMonth.getMonth() + 1, calendarPeriodSettings.startDay, calendarPeriodSettings.endDay); return r.length ? `${format(r[0], "M/d")}〜${format(r[r.length - 1], "M/d")}` : "期間未設定"; })()}
                boardLocked={false}
                boardVisibility={storeMaster.leaveRequestBoardVisibility || "immediate"}
                correctionVisibility={correctionVisibility}
                isEditor={appSession.role === "admin"}
                notices={adminNotices}
                onOpenBoard={() => { setBoardAnchor(getCurrentShiftMonth(new Date(), calendarPeriodSettings)); setActiveTab("board"); setIsFromAdmin(false); }}
              />
            ) : activeTab === "requests" ? (
              <LeaveRequestView employees={dashboardEmployees} dates={dateRange} remarks={displayRemarks} requests={leaveRequests} locked={isLocked} loading={leaveRequestLoading || periodStatusLoading} operatorId={appSession.employeeId || ""} isAdmin={appSession.role === "admin"} onSubmit={handleLeaveRequestSubmit} onCancel={handleLeaveRequestCancel} onSaveWorkTime={async (id, start, end) => { const saved = await updateLeaveRequestWorkTime(id, start, end); setLeaveRequests(prev => prev.map(item => item.id === id ? saved : item)); }} onPeriodChange={async direction => { if (appSession.role === "admin" && (syncState === "dirty" || syncState === "saving")) { try { await saveCurrentMonth(); } catch { return; } } setCurrentMonth(prev => addMonths(prev, direction)); }} />
            ) : activeTab === "board" ? (
              <BulletinBoard onBack={goBack} notices={adminNotices} employees={employeeMaster} defaultNoticeVisibility={adminNoticeVisibility} onCreateNotice={async (text, visibility, ids) => { const tempId = `tmp-${Date.now()}`; setAdminNotices(items => [{ id: tempId, text, visibility, employeeIds: ids, createdAt: new Date().toISOString() }, ...items]); toast.success("お知らせを公開しました"); void createAdminNotice(text, visibility, ids).then(notice => setAdminNotices(items => items.map(item => item.id === tempId ? notice : item))).catch(error => { setAdminNotices(items => items.filter(item => item.id !== tempId)); toast.error(`お知らせを公開できませんでした：${error instanceof Error ? error.message : ""}`); }); }} onDeleteNotice={async id => { if (!window.confirm("このお知らせを削除しますか？")) return; try { await removeAdminNotice(id); setAdminNotices(items => items.filter(item => item.id !== id)); } catch (error) { toast.error(error instanceof Error ? error.message : "削除できませんでした"); } }} periods={boardPeriods} isEditor={appSession.role === "admin"} visibility={storeMaster.leaveRequestBoardVisibility || "immediate"} correctionVisibility={correctionVisibility} operatorName={operatorName} operatorId={appSession.employeeId} onShiftPeriod={direction => setBoardAnchor(prev => addMonths(prev, direction))} onResolve={async item => { const saved = await updateLeaveRequestStatus(item.id, "対応済み"); setBoardPeriods(prev => prev.map(period => ({ ...period, requests: period.requests.map(request => request.id === saved.id ? saved : request) }))); setHomeBoardRequests(prev => prev.map(request => request.id === saved.id ? saved : request)); setHomePendingCorrections(prev => prev.filter(request => request.id !== saved.id)); }} />
            ) : activeTab === "mypage" ? (
              <MyPage employee={operatorEmployee} requests={leaveRequests} locked={isLocked} initialBalance={paidLeaveBalance} onSaveBalance={async balance => { const saved = await savePaidLeaveBalance(balance); setPaidLeaveBalance(saved); }} onCancel={handleLeaveRequestCancel} onSaveWorkTime={async (id, start, end) => { const saved = await updateLeaveRequestWorkTime(id, start, end); setLeaveRequests(prev => prev.map(item => item.id === id ? saved : item)); }} onEdit={() => setActiveTab("requests")} />
            ) : activeTab === "dashboard" && dashboardEmployees.length === 0 ? (
              <div key="dashboard-empty" className="rounded-2xl border bg-white p-8 text-center text-sm leading-7 text-slate-700">
                <p className="font-bold text-slate-900">まだ従業員が登録されていません</p>
                <p className="mt-2">{appSession.role === "admin" ? "「設定」→「従業員マスタ」で従業員を登録すると、ここにシフトが表示されます。" : "管理者が従業員を登録すると、ここにシフトが表示されます。"}</p>
              </div>
            ) : activeTab === "dashboard" ? (
              <motion.div
                key="dashboard"
                className="md:h-full md:min-h-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`dashboard-card border-border shadow-none ${isFromAdmin ? "creation-card" : ""} md:h-full md:min-h-0 md:flex md:flex-col ${dashboardListView ? "dashboard-list-view" : ""}`}>
                  <CardHeader className={`dashboard-card-header dashboard-blue-header page-blue-header border-b border-border ${isLocked ? "is-final" : "is-draft"}`}>
                    {isFromAdmin && <div className="creation-head">
                      <div className="creation-head-row">
                        <div className="creation-head-title">
                          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
                          <div><CardTitle>シフト作成</CardTitle><span><UserRound className="h-3.5 w-3.5" />操作員：{operatorName || "未選択"}</span></div>
                        </div>
                        <div className="creation-head-main">
                          {renderSyncStatus()}
                          <Button disabled={periodStatusLoading} size="sm" className={`dashboard-lock-button creation-lock-button ${isLocked ? "is-unlock" : ""}`} onClick={toggleLock}>{isLocked ? <LockOpen className="w-3.5 h-3.5 mr-1" /> : <LockKeyhole className="w-3.5 h-3.5 mr-1" />}{periodStatusLoading ? "処理中…" : isLocked ? "確定を解除" : "シフトを確定"}</Button>
                        </div>
                      </div>
                      <div className="creation-head-row creation-head-tools">
                        <div className="creation-head-left">
                          {appSession.role === "admin" && <div className="creation-mode-toggle" role="group" aria-label="全体表の操作モード">
                            <button type="button" aria-pressed={!overviewEditing} className={!overviewEditing ? "is-on" : ""} onClick={() => setOverviewEditing(false)}>閲覧</button>
                            <button type="button" aria-pressed={overviewEditing} disabled={isLocked || periodStatusLoading} className={overviewEditing ? "is-on is-edit" : ""} onClick={() => setOverviewEditing(true)}>編集</button>
                          </div>}
                          <select aria-label="全体編集・個人編集の選択" value="dashboard" onChange={event => setActiveTab(event.target.value)}><option value="dashboard">全体編集</option>{dashboardEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.displayName || employee.name}</option>)}</select>
                        </div>
                        <div className="creation-head-right">
                          <ShiftDisplayControl value={shiftDisplayMode} onChange={setShiftDisplayMode} />
                          <Button variant="outline" size="sm" className="dashboard-list-toggle" onClick={() => setDashboardListView(value => !value)}><Grid3X3 className="w-3.5 h-3.5 mr-1.5" />{dashboardListView ? "通常表示" : "一覧表示"}</Button>
                        </div>
                      </div>
                      {appSession.role === "admin" && !creationHintHidden && <div className="creation-hint mt-3 rounded-xl bg-white p-3 text-xs leading-6 text-slate-800">
                        <div className="flex items-center justify-between gap-2"><strong className="text-sm text-blue-900">ここでシフトを作ります</strong><div className="flex shrink-0 gap-1.5"><button type="button" aria-expanded={creationHintOpen} className="min-h-10 rounded-md border px-3 py-2 text-[11px] font-bold text-blue-800" onClick={() => setCreationHintOpen(value => !value)}>{creationHintOpen ? "たたむ" : "くわしく"}</button><button type="button" className="min-h-10 rounded-md border px-3 py-2 text-[11px] font-bold text-slate-600" onClick={() => { templateStorage.setItem("creation_hint_hidden", "1"); setCreationHintHidden(true); }}>閉じる</button></div></div>
                        {!creationHintOpen ? <p className="mt-0.5">{isLocked ? "この期間は確定済みで、いまは見るだけです。" : overviewEditing ? "マス目をタップして勤務を選び、できたら「シフトを確定」を押します。" : "いまは見るだけです。入力するには「編集」を押します。"}</p> : isLocked ? <p>この期間は「確定」されているので、いまは見るだけです。直したいときは右上の「確定を解除」を押します。</p> : overviewEditing ? <ol className="mt-1 list-decimal space-y-0.5 pl-4"><li>表のマス目（人と日付の交わるところ）をタップして、勤務を選びます。</li><li>1人ずつ入れたいときは、上の「全体編集」の欄から名前を選びます。</li><li>できあがったら、右上の「シフトを確定」を押します。確定するとみんなに公開されます。</li></ol> : <p>いまは「閲覧」モードで、見るだけです。入力するには、左上の「編集」を押してください。</p>}
                      </div>}
                      {appSession.role === "admin" && renderAutoSaveNote()}
                    </div>}
                    {!isFromAdmin && <div className="dashboard-blue-top">
                      <div className="dashboard-blue-brand">
                        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
                        <div><CardTitle className={appSession.role === "admin" ? "admin-shift-title" : ""}>{isLocked ? "全体シフト（確定）" : "全体シフト（案）"}</CardTitle><span><UserRound className="h-3.5 w-3.5" />操作員：{operatorName || "未選択"}</span></div>
                      </div>
                      <div className="dashboard-blue-period">
                        {dateRange.length > 0 ? `${format(dateRange[0], "yyyy年M月d日")}〜${format(dateRange[dateRange.length - 1], "M月d日")}` : "期間未設定"}
                      </div>
                    </div>}
                    {!isFromAdmin && <div className="dashboard-blue-controls">
                      
                      <div className="dashboard-period-step"><Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}><ChevronLeft className="h-4 w-4" />前の期間</Button><div className="dashboard-period-title"><div className="dashboard-title-status"><strong>{dateRange.length ? `${format(dateRange[0], "M/d")}〜${format(dateRange[dateRange.length - 1], "M/d")}` : "期間未設定"}</strong></div></div><Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>次の期間<ChevronRight className="h-4 w-4" /></Button></div>
                      
                    </div>}
                  </CardHeader>
                  <CardContent className="p-0 md:flex-1 md:min-h-0 md:flex md:flex-col">
                    {isFromAdmin && renderCreationPeriod()}
                    {isFromAdmin && <button type="button" className={`creation-leave-strip ${leaveRequests.some(item => item.status === "申請中" && item.type === "訂正依頼") ? "has-correction" : leaveRequests.some(item => item.status === "申請中" && item.type !== "希望なし" && item.type !== "訂正依頼") ? "has-pending" : ""}`} aria-expanded={showLeaveManager} onClick={() => setShowLeaveManager(value => !value)}>{(() => { const corrections = leaveRequests.filter(item => item.status === "申請中" && item.type === "訂正依頼").length; const count = leaveRequests.filter(item => item.status === "申請中" && item.type !== "希望なし" && item.type !== "訂正依頼").length; if (corrections) return `⚠ 訂正依頼があります（${corrections}件）${count ? `／申請希望 ${count}件` : ""}`; return count ? `対応待ちの申請希望あり（${count}件）` : "対応待ちの希望はありません"; })()} <span aria-hidden="true">{showLeaveManager ? "▲" : "▼"}</span></button>}
                    {isFromAdmin && renderSyncFailure()}
                    {!isFromAdmin && <div className="dashboard-overview-toolbar"><ShiftDisplayControl value={shiftDisplayMode} onChange={setShiftDisplayMode} /><Button variant="outline" size="sm" className="dashboard-list-toggle" onClick={() => setDashboardListView(value => !value)}><Grid3X3 className="w-3.5 h-3.5 mr-1.5" />{dashboardListView ? "通常表示" : "一覧表示"}</Button></div>}
                    {!isFromAdmin && <div className="dashboard-mobile-person-jump">
                      <label htmlFor="dashboard-person-jump">個人シフトを見る</label>
                      <select
                        id="dashboard-person-jump"
                        value=""
                        onChange={(event) => {
                          if (!event.target.value) return;
                          setActiveTab(event.target.value);
                          setIsFromAdmin(false);
                        }}
                      >
                        <option value="">名前を選択</option>
                        {dashboardEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.displayName || employee.name}</option>)}
                      </select>
                    </div>}
                    <dialog ref={overviewDialogRef} aria-labelledby="overview-edit-title" onCancel={() => setOverviewCell(null)} onClose={() => setOverviewCell(null)} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/50">
                      {overviewCell && <form onSubmit={event => { event.preventDefault(); applyOverviewCell(); }} className="space-y-4">
                        <h2 id="overview-edit-title" className="text-lg font-bold">{employees.find(item => item.id === overviewCell.employeeId)?.displayName || employees.find(item => item.id === overviewCell.employeeId)?.name}・{overviewCell.date.slice(5).replace("-", "/")}の勤務</h2>
                        <label className="block text-sm font-bold">勤務<select autoFocus className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3" value={overviewShift} onChange={event => setOverviewShift(event.target.value)}>
                          <option value="none">なし</option>
                          {[...new Set([...visibleWorkTimes, "有休", "休み", "任意入力", ...(overviewShift !== "none" ? [overviewShift] : [])])].map(value => <option key={value} value={value}>{displayShift(value, workTimes, "both")}</option>)}
                        </select></label>
                        {overviewShift === "任意入力" && <label className="block text-sm font-bold">勤務時間<Input className="mt-2" placeholder="例：9:00～17:00" value={overviewCustom} onChange={event => setOverviewCustom(event.target.value)} /></label>}
                        <p className="text-xs text-slate-500">変更後は自動保存され、個人シフトにも反映されます。</p>
                        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOverviewCell(null)}>キャンセル</Button><Button type="submit" disabled={isLocked || periodStatusLoading}>変更する</Button></div>
                      </form>}
                    </dialog>
                    {correctionPopup && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setCorrectionPopup(null)}><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}><h3 className="text-lg font-black text-red-700">訂正依頼</h3><p className="mt-2 text-sm font-bold">{correctionPopup.request.employeeName}　{correctionPopup.request.date ? format(new Date(`${correctionPopup.request.date}T00:00:00`), "M/d（E）", { locale: ja }) : ""}</p><div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm"><span className="text-xs font-bold text-slate-500">現在の勤務</span><p className="font-black">{correctionPopup.shiftText}</p></div><div className="mt-2 rounded-xl bg-red-50 p-3 text-sm"><span className="text-xs font-bold text-red-700">依頼内容</span><p className="whitespace-pre-wrap font-bold">{correctionPopup.request.comment || "（コメントなし）"}</p></div><p className="mt-3 text-xs text-slate-600">返事が必要なら「管理者からのお知らせ」で本人を指定して送れます。</p><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setCorrectionPopup(null)}>閉じる</Button>{appSession.role === "admin" && <Button className="bg-red-600 hover:bg-red-700" onClick={async () => { const target = correctionPopup.request; try { const saved = await updateLeaveRequestStatus(target.id, "対応済み"); setLeaveRequests(prev => prev.map(r => r.id === saved.id ? saved : r)); setHomePendingCorrections(prev => prev.filter(r => r.id !== saved.id)); setCorrectionPopup(null); toast.success("確認しました"); } catch (error) { toast.error(error instanceof Error ? error.message : "更新できませんでした"); } }}>確認した</Button>}</div></div></div>}
                    {isFromAdmin && showLeaveManager && <LeaveRequestManager requests={leaveRequests} loading={leaveRequestLoading} onStatusChange={handleLeaveRequestStatus} onDelete={handleLeaveRequestDelete} />}
                    {inCreation && overviewEditing && !isLocked && <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3" data-auto-assign-bar>
                      <div className="flex flex-wrap items-center gap-2"><Button type="button" className="h-11 font-bold" disabled={periodStatusLoading} onClick={() => setWizardOpen(true)} data-wizard-open><Wand2 className="mr-2 h-4 w-4" />質問に答えてシフト案を作る</Button>{autoUndo && <Button type="button" variant="outline" className="h-11 font-bold" onClick={undoAutoPlan} data-auto-assign-undo>さっき入れた{autoUndo.count}か所を元に戻す</Button>}</div>
                      <p className="mt-2 text-xs leading-6 text-blue-900">いくつかの質問（最低人数・連勤など）に答えると、「こんなシフトになります」と言葉で確認してから、足りない日に出勤を足す案を作ります。使うかどうかは、案を見てから選べます。今入っている勤務は変えません。</p>
                    </div>}
                    {wizardOpen && <ShiftWizard rules={staffingRules} roles={roles} employees={dashboardEmployees} periodLabel={`${format(dateRange[0], "M/d")}〜${format(dateRange[dateRange.length - 1], "M/d")}`} leaveCount={leaveRequests.filter(item => ["申請中", "承認", "対応済み"].includes(item.status) && ["有給希望", "休み希望", "午前休希望", "午後休希望"].includes(item.type) && dateRange.some(d => getDateStr(d) === item.date)).length} profiles={readProfiles({ dates: dateRange, employees: dashboardEmployees, specialDayRules })} makePlan={makeAutoPlan} displayShift={value => displayShift(value, workTimes, shiftDisplayMode)} onApply={applyAutoPlan} onClose={() => setWizardOpen(false)} />}
                    {staffingWarnings && staffingWarnings.list.length > 0 && appSession.role === "admin" && <details data-staffing-warnings className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><summary className="cursor-pointer font-bold">⚠ 確認が必要なところが{staffingWarnings.list.length}件あります（押すと一覧）</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{staffingWarnings.list.map((line, index) => <li key={index}>{line}</li>)}</ul><p className="mt-2 text-[11px] text-amber-800">基準は「設定 → シフトマスタ → 人数・連勤のチェック」で変えられます。</p></details>}
                    <div className="dashboard-table-wrap overflow-x-auto" onScroll={event => { const el = event.currentTarget; if (window.innerWidth < 768 && el.scrollTop > 0 && el.getBoundingClientRect().top > 8) el.scrollIntoView({ block: "start" }); }}>
                      <Table className="dashboard-table text-[13px]">
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="dashboard-date-col w-16 h-10 font-bold text-muted-foreground border-r border-border">日付</TableHead>
                            <TableHead className="dashboard-day-col w-10 h-10 font-bold text-muted-foreground border-r border-border">曜</TableHead>
                            {dashboardEmployees.map(emp => (
                              <TableHead key={emp.id} className="dashboard-employee-col font-bold text-muted-foreground border-r border-border min-w-[120px]">
                                <button
                                  className="dashboard-employee-link"
                                  onClick={() => setActiveTab(emp.id)}
                                  title={`${emp.displayName || emp.name}さんの${isFromAdmin ? "シフトを編集" : "個人シフトを見る"}`}
                                >
                                  {emp.displayName || emp.name}<ChevronRight className="w-3 h-3" />
                                </button>
                              </TableHead>
                            ))}
                            <TableHead className="dashboard-remarks-col h-10 font-bold text-muted-foreground border-r border-border">備考</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dateRange.map(date => {
                            const dateStr = getDateStr(date);
                            const gr = getGlobalRemark(date);
                            const rowBgClass = getRowBgClass(date);

                            return (
                              <TableRow key={date.toISOString()} className={`h-10 ${rowBgClass}`}>
                                <TableCell className="dashboard-date-col py-2 border-r border-border">{format(date, "MM/dd")}</TableCell>
                                <TableCell className="dashboard-day-col py-2 text-muted-foreground border-r border-border">{format(date, "E", { locale: ja })}</TableCell>
                                {dashboardEmployees.map(emp => {
                                  const s = getShift(emp, date);
                                  const leaveRequest = leaveRequests.find(item => (item.employeeId ? item.employeeId === emp.id : item.employeeName === (emp.displayName || emp.name) || item.employeeName === emp.name) && item.date === dateStr && (item.status === "申請中" || item.status === "承認"));
                                  const actualShiftText = s?.shift === "任意入力" ? (s?.customShiftText || "任意") : (s?.shift === "休み" ? "" : (s?.shift || "-"));
                                  const shiftText = displayShift(actualShiftText, workTimes, shiftDisplayMode);
                                  const compactParts = shiftText.includes("～") ? shiftText.split("～") : [shiftText];
                                  return (
                                    <TableCell key={emp.id} className={`dashboard-employee-cell py-1 px-1 border-r border-border ${leaveRequest ? "has-leave-request" : ""} ${appSession.role === "admin" && staffingWarnings?.byCell[`${emp.id}|${dateStr}`] ? "ring-2 ring-inset ring-amber-400" : ""}`} data-staffing-cell={appSession.role === "admin" ? staffingWarnings?.byCell[`${emp.id}|${dateStr}`]?.join("／") : undefined} title={`${staffingWarnings?.byCell[`${emp.id}|${dateStr}`] && appSession.role === "admin" ? `⚠ ${staffingWarnings.byCell[`${emp.id}|${dateStr}`].join("／")}　` : ""}${actualShiftText}${leaveRequest ? `・${leaveRequest.type}${leaveRequest.desiredWorkStart && leaveRequest.desiredWorkEnd ? ` ${leaveRequest.desiredWorkStart}〜${leaveRequest.desiredWorkEnd}` : ""}（${leaveRequest.status}）` : ""}`}>
                                      <button type="button" disabled={!isFromAdmin || !overviewEditing || isLocked || periodStatusLoading || appSession.role !== "admin"} onClick={() => openOverviewCell(emp, dateStr)} aria-label={`${emp.displayName || emp.name} ${format(date, "M月d日")} ${actualShiftText || (s?.shift === "休み" ? "休み" : "なし")}の勤務を変更`} className={`w-full min-h-9 text-[12px] py-1.5 rounded-sm disabled:cursor-default enabled:cursor-pointer enabled:ring-1 enabled:ring-amber-500 enabled:bg-amber-50 enabled:hover:bg-amber-100 enabled:focus-visible:outline-2 enabled:focus-visible:outline-amber-600 text-center font-bold leading-none ${
                                        s?.shift === "有休" 
                                          ? "bg-red-100 text-red-800 border border-red-200" 
                                          : s?.shift === "休み"
                                            ? ""
                                            : s?.shift === "任意入力"
                                              ? "text-blue-600"
                                              : s?.shift 
                                                ? "text-slate-900"
                                                : "text-muted-foreground"
                                      }`}>
                                        <span className="dashboard-shift-full">{shiftText || (leaveRequest && s?.shift === "休み" ? "休み" : "")}</span>
                                        <span className="dashboard-shift-compact">{leaveRequest && !shiftText && s?.shift === "休み" ? "休み" : compactParts[0]}{compactParts[1] && <><br />{compactParts[1]}</>}</span>
                                        {leaveRequest && leaveRequest.type !== "訂正依頼" && <small className="leave-request-marker">{leaveRequest.type === "出勤希望" && leaveRequest.desiredWorkStart && leaveRequest.desiredWorkEnd ? `出勤希望 ${leaveRequest.desiredWorkStart}〜${leaveRequest.desiredWorkEnd}` : leaveRequest.type}</small>}
                                      </button>
                                      {leaveRequest && leaveRequest.type === "訂正依頼" && <button type="button" className="correction-chip" onClick={() => setCorrectionPopup({ request: leaveRequest, shiftText: actualShiftText || (s?.shift === "休み" ? "休み" : "なし") })}>⚠訂正</button>}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="dashboard-remarks-col dashboard-band-name py-2 border-r border-border">{gr?.type || ""}{appSession.role === "admin" && staffingWarnings?.byDate[dateStr] && <span data-staffing-date className="ml-1 text-[11px] font-bold text-amber-700" title={staffingWarnings.byDate[dateStr].join("／")}>⚠ {staffingWarnings.byDate[dateStr].join("／")}</span>}</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Summary Row */}
                          <TableRow className="dashboard-summary-row bg-muted/50 font-bold h-12">
                            <TableCell colSpan={2} className="text-right border-r border-border pr-4">期間合計</TableCell>
                            {dashboardEmployees.map(emp => {
                              const stats = emp.shifts
                                .filter(s => dateRange.some(d => s.date.startsWith(getDateStr(d))))
                                .reduce((acc, s) => {
                                  const isWorking = s.shift && s.shift !== "休み" && s.shift !== "有休";
                                  if (!s.workTime || !s.workTime.includes(":")) {
                                    return { ...acc, attendance: acc.attendance + (isWorking ? 1 : 0), paid: acc.paid + (s.shift === "有休" ? 1 : 0) };
                                  }
                                  const [h, m] = s.workTime.split(":").map(Number);
                                  if (isNaN(h) || isNaN(m)) {
                                    return { ...acc, attendance: acc.attendance + (isWorking ? 1 : 0), paid: acc.paid + (s.shift === "有休" ? 1 : 0) };
                                  }
                                  return {
                                    hours: acc.hours + h + m/60,
                                    paid: acc.paid + (s.shift === "有休" ? 1 : 0),
                                    attendance: acc.attendance + (isWorking ? 1 : 0)
                                  };
                                }, { hours: 0, paid: 0, attendance: 0 });
                              return (
                                <TableCell key={emp.id} className="dashboard-employee-cell py-1 px-2 border-r border-border text-center">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-slate-900 font-bold text-[12px]">{stats.hours.toFixed(1)}h</span>
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-slate-600 text-[11px] font-medium">{stats.attendance}日</span>
                                      <span className={`${stats.paid > 0 ? "text-red-700" : "text-slate-400"} text-[11px] font-medium`}>{stats.paid}日(有)</span>
                                    </div>
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell className="dashboard-remarks-col border-r border-border" />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    {bandLegendItems.length > 0 && <div className="dashboard-band-legend">
                      <strong>帯色の見方</strong>
                      <div>{bandLegendItems.map(item => <span key={`${item.color}-${item.label}`}><i className={`band-swatch band-${item.color}`} />{item.label}</span>)}</div>
                    </div>}
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === "admin" && settingsPage === "menu" ? (
              <motion.div key="settings-menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Card className="border-border shadow-sm">
                  <CardHeader className="settings-card-header settings-slate page-blue-header rounded-t-xl border-b py-5">
                    <CardTitle className="admin-page-title flex items-center gap-2 text-xl"><Settings className="h-5 w-5" />設定</CardTitle>
                    <CardDescription className="text-xs">変更したい項目を選んでください</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                    {setupSteps.some(step => !step.done) && !setupHidden && <div className="sm:col-span-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                      <div className="flex items-start justify-between gap-3"><div><strong className="text-base text-amber-950">はじめの準備（{setupSteps.filter(step => step.done).length}/{setupSteps.length}完了）</strong><p className="mt-0.5 text-xs text-amber-800">上から順に進めると、すぐ使い始められます。押すと該当の画面が開きます。</p></div><button type="button" className="-mr-3 -mt-3 shrink-0 p-3 text-xs font-bold text-amber-800 underline" onClick={() => { templateStorage.setItem("setup_checklist_hidden", "1"); setSetupHidden(true); }}>閉じる</button></div>
                      <div className="mt-3 grid gap-2">{setupSteps.map((step, index) => <button key={step.title} type="button" onClick={step.onClick} className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left ${step.done ? "border-emerald-200" : "border-amber-200"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${step.done ? "bg-emerald-500 text-white" : "bg-amber-200 text-amber-900"}`}>{step.done ? "✓" : index + 1}</span><span className="min-w-0"><strong className={`block text-sm ${step.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{step.title}</strong><small className="block text-xs text-slate-500">{step.hint}</small></span><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" /></button>)}</div>
                    </div>}
                    {[
                      { key: "store", icon: Building2, title: "店舗マスタ", description: "店舗名・月の区切り・お休みの日" },
                      { key: "board", icon: MessageSquareText, title: "お知らせ掲示板設定", description: "お知らせ・希望の公開範囲" },
                      { key: "employee", icon: Users, title: "従業員マスタ", description: "従業員・役職・ホーム表示" },
                      { key: "shift", icon: SlidersHorizontal, title: "シフトマスタ", description: "勤務時間・勤務パターン・お休みの日など" },
                      { key: "other", icon: Settings, title: "その他設定", description: "接続キー・表示・出力" },
                      { key: "reset", icon: Trash2, title: "データ初期化", description: "業務データをまとめて初期化" },
                    ].map(item => <button key={item.key} type="button" onClick={() => goSettings(item.key as typeof settingsPage)} className="group flex min-h-24 items-center gap-4 rounded-2xl border-2 border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><item.icon className="h-6 w-6" /></span>
                      <span><strong className="flex items-center gap-2 text-base text-slate-900">{item.title}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></strong><small className="mt-1 block leading-relaxed text-slate-500">{item.description}</small></span>
                    </button>)}
                    <button type="button" onClick={() => setGuideOpen(true)} className="flex min-h-24 items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 text-left font-bold text-slate-700 shadow-sm hover:border-slate-300"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><BookOpen className="h-6 w-6" /></span>使い方・説明書を開く</button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === "admin" && settingsPage === "reset" ? (
              <TemplateResetSettings onBack={() => goSettings("menu")} onProgress={setResetProgress} />
            ) : activeTab === "admin" && settingsPage === "store" ? (
              <motion.div key="settings-store" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <SettingsHead title="店舗マスタ" description="店舗全体の基本ルール" backLabel="設定へ戻る" onBack={() => goSettings("menu")} /><Card><CardContent className="p-6 space-y-5"><StoreMasterSettings master={storeMaster} onMasterChange={setStoreMaster} period={calendarPeriodSettings} periodDraft={calendarPeriodDraft} saving={calendarPeriodSaving} onPeriodDraftChange={setCalendarPeriodDraft} onSavePeriod={handleSaveCalendarPeriod} onSaveStore={async settings => { const saved = await saveStoreSettings(settings); markSetupSeen("store-saved"); setStoreMaster(current => { const next = { ...current, ...saved }; templateStorage.setItem("store_master_settings", JSON.stringify(next)); return next; }); }} onOpenBandSettings={() => goSettings("special")} /><BusinessHoursSettings rules={staffingRules} roles={roles} saving={staffingSaving} onSave={handleSaveStaffingRules} /></CardContent></Card>
              </motion.div>
            ) : activeTab === "admin" && settingsPage === "board" ? (
              <motion.div key="settings-board" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <SettingsHead title="お知らせ掲示板設定" description="承認済みの希望を従業員へ共有する設定" backLabel="設定へ戻る" onBack={() => goSettings("menu")} /><Card>
                <CardContent className="p-6"><BoardSettings leave={storeMaster.leaveRequestBoardVisibility || "immediate"} notice={adminNoticeVisibility} correction={correctionVisibility} onSaveLeave={value => handleSaveBoardVisibility(value)} onSaveNotice={async value => { const saved = await saveAdminNoticeVisibility(value); setAdminNoticeVisibility(saved); return saved; }} onSaveCorrection={async value => { const saved = await saveCorrectionVisibility(value); setCorrectionVisibility(saved); return saved; }} /></CardContent></Card>
              </motion.div>
            ) : activeTab === "admin" && settingsPage === "employee" ? (
              <motion.div key="settings-employee" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4"><SettingsHead title="従業員マスタ" description="従業員の登録、役職、ホームの表示" backLabel="設定へ戻る" onBack={() => goSettings("menu")} /><EmployeeMasterSettings loadError={employeeMasterLoadError} employees={employeeMaster} roles={roles} onSave={handleSaveEmployeeMaster} operatorId={appSession?.employeeId} /><RoleAndHomeSettings roles={roles} layout={homeLayout} onSaveRoles={handleSaveRoles} onSaveLayout={async value => setHomeLayout(await saveHomeLayout(value))} /></motion.div>
            ) : activeTab === "admin" && settingsPage === "shift" ? (
              <motion.div key="settings-shift" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4"><SettingsHead title="シフトマスタ" description="シフト作成のもとになる設定" backLabel="設定へ戻る" onBack={() => goSettings("menu")} /><div className="grid gap-3 sm:grid-cols-2">{[
                  { key: "worktime", icon: Clock, title: "勤務時間設定", description: "早番・遅番などの時間と略称" },
                  { key: "autodraft", icon: Wand2, title: "シフト案自動作成マスタ", description: "シフト案を自動で作る条件" },
                  { key: "operations", icon: Repeat, title: "勤務パターン作成マスタ", description: "1〜4週間の勤務パターン" },
                  { key: "staffing", icon: Users, title: "人数・連勤のチェック", description: "最低人数・連勤の上限・1人ごとの条件" },
                  { key: "special", icon: Palette, title: "お店のお休みの日・色付け", description: "定休日・祝日・年末年始・毎月○日など" },
                ].map(item => <button key={item.key} type="button" onClick={() => goSettings(item.key as typeof settingsPage)} className="group flex min-h-24 items-center gap-4 rounded-2xl border-2 border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><item.icon className="h-6 w-6" /></span><span><strong className="flex items-center gap-2 text-base text-slate-900">{item.title}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></strong><small className="mt-1 block leading-relaxed text-slate-500">{item.description}</small></span></button>)}</div>
              </motion.div>
            ) : activeTab === "admin" && settingsPage === "worktime" ? (
              <motion.div key="settings-worktime" className="space-y-4"><SettingsHead title="勤務時間設定" description="シフトで使う勤務時間パターン" backLabel="シフトマスタへ戻る" onBack={() => goSettings("shift")} /><Card><CardContent className="p-5 sm:p-6"><ToolHelp title="勤務時間設定って何？"><p>シフトの入力で選べる「勤務時間」の候補を登録します。例：9:00〜18:00（早番）。</p><p>追加・変更は、押したその場で自動的に保存されます（保存ボタンはありません）。登録しなくても「休み」「有休」「任意入力」はいつでも選べます。</p><p>夜勤など日をまたぐ勤務は、退勤の時刻を出勤より早く入れると自動で判定されます。</p></ToolHelp><WorkTimeSettings values={workTimes} ready={workTimeReady} loading={workTimeLoading} onPendingChange={setWorkTimePending} confirmed={setupSeen.includes("worktime-confirmed")} onConfirm={() => { markSetupSeen("worktime-confirmed"); toast.success("勤務時間は、このままで使います"); }} onSave={async values => { markSetupSeen("worktime-confirmed"); const master = await saveWorkTimeMaster(values, workTimeRevision); saveWorkTimes(master.items); setWorkTimes(master.items); setWorkTimeRevision(master.revision); toast.success("勤務時間設定を共通保存しました"); }} /></CardContent></Card></motion.div>
            ) : activeTab === "admin" && settingsPage === "autodraft" ? (
              <motion.div key="settings-autodraft" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4"><SettingsHead title="シフト案自動作成マスタ" description="シフト案を自動で作る条件" backLabel="シフトマスタへ戻る" onBack={() => goSettings("shift")} /><ToolHelp title="シフト案の自動作成って何？"><p>勤務パターンを割り当てた人について、先の月のシフト案を自動で作る機能です。勤務パターンを使っていないお店は、OFFのままで大丈夫です。</p><p>確定したシフトや、手で直した勤務は上書きしません。</p></ToolHelp><AutoDraftSettingsView settings={autoDraftSettings} onChange={value => void updateAutoDraftSettings(value)} onStart={() => startAutoDraft()} run={autoDraftRun} rangeLabel={autoDraftRangeLabel} /></motion.div>
            ) : activeTab === "admin" && settingsPage === "staffing" ? (
              <motion.div key="settings-staffing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4"><SettingsHead title="人数・連勤のチェック" description="足りない日や連勤をシフト表で知らせる基準" backLabel="シフトマスタへ戻る" onBack={() => goSettings("shift")} /><ToolHelp title="これは何？"><p>シフトを自動で変える設定ではありません。決めた基準に合わないところを、シフト表で「⚠」と知らせるだけです。</p><p>空欄や「0」の項目はチェックしません。決めたものだけ働きます。</p></ToolHelp><StaffingRulesSettings rules={staffingRules} employees={employeeMaster} roles={roles} saving={staffingSaving} onSave={handleSaveStaffingRules} /></motion.div>
            ) : activeTab === "admin" && settingsPage === "special" ? (
              <motion.div key="settings-special" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <SettingsHead title="お店のお休みの日・色付け" description="定休日・祝日・年末年始・毎月○日などを決める" backLabel="設定へ戻る" onBack={() => goSettings("menu")} /><Card><CardContent className="p-6"><div className="mb-4"><ToolHelp title="お休みの日・色付けって何？" defaultOpen><p>お店の休みの日を決めます。決めた日は、カレンダーやシフト表に色が付きます（初期は日曜と祝日が赤）。</p><p>「毎週の定休日」＝曜日で決まる休み／「お休みの日を追加」＝第○曜日・毎月○日・毎年同じ日・今年だけの日付。</p><p>色だけでなく、シフト案の自動作成で「その日を休みにする」こともできます。変更したら一番下の「保存」を押してください。</p></ToolHelp></div><SpecialDaySettings rules={specialDayRules} employees={employeeMaster} loading={specialDayLoading} onSave={handleSaveSpecialDayRules} /></CardContent></Card>
              </motion.div>
            ) : activeTab === "admin" && settingsPage === "operations" ? (
              <motion.div key="settings-cycles" className="space-y-4"><SettingsHead title="勤務パターン作成マスタ" description="1〜4週間の勤務パターン" backLabel="シフトマスタへ戻る" onBack={() => goSettings("shift")} /><Card><CardContent className="space-y-4 p-6">
                      <ToolHelp title="勤務パターンって何？使い方は？"><p><b>勤務パターン</b>＝くり返す勤務の「型」です。例：「毎週、月〜金が勤務・土日が休み」は1週間の型。「A週は土曜出勤、B週は日曜出勤」は2週間の型です。</p><p><b>使う手順</b>：①ここで型を作る（曜日ごとに勤務を選ぶ）→ ②「シフト作成」→人ごとの画面で、「この日から」と日付を選んで勤務パターンを当てはめる → ③型を直したら、ここの「今期を作り直す」で入れ直す。</p><p>使わなくても大丈夫です。毎週同じなら、手で入れる方が早いこともあります。</p></ToolHelp>
                      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3"><div><h4 className="font-black text-slate-900">勤務パターン作成マスタ</h4><p className="mt-1 text-xs text-slate-500">「勤務パターン」は、くり返す勤務の型です（例：毎週同じ／2週間で交代）。編集する勤務パターンだけを開きます。</p></div><Button variant="outline" onClick={addCycle}><PlusCircle className="mr-1 h-4 w-4" />勤務パターン追加</Button></div>
                        {Object.keys(cycleNames).map(Number).filter(isUntouchedCycle).length >= 2 && <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900">中身が空のままの勤務パターンが{Object.keys(cycleNames).map(Number).filter(isUntouchedCycle).length}件あります。<Button size="sm" variant="outline" className="ml-2 text-red-600" onClick={removeUntouchedCycles}>空の勤務パターンをまとめて削除</Button></div>}
                        <div className="space-y-3">{Object.keys(cycleNames).map(Number).sort((a, b) => a - b).map(num => {
                          const isOpen = editingCycleId === num;
                          const length = cycleLengths[num] || 1;
                          const assignedNames = employees.filter(emp => cycleAssignments[emp.id]?.cycleType === num).map(emp => emp.displayName || emp.name);
                          return <div key={num} data-cycle-row={num} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-black">{num}</span><Input aria-label="勤務パターンの名前" className="h-9 min-w-[8rem] flex-1 text-sm font-bold" value={cycleNames[num]} onChange={event => renameCycle(num, event.target.value)} /><Badge variant="outline">{length}週間</Badge><Button variant="outline" size="sm" onClick={() => setEditingCycleId(isOpen ? null : num)}>{isOpen ? "閉じる" : "編集"}</Button><Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteCycle(num)}>削除</Button></div>
                            {isOpen && <div className="mt-4 border-t pt-4">
                              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><label><span className="mb-1 block text-xs font-bold text-slate-600">勤務パターンの名前（自由に変えられます）</span><Input value={cycleNames[num]} onChange={event => renameCycle(num, event.target.value)} /></label><label><span className="mb-1 block text-xs font-bold text-slate-600">周期</span><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={length} onChange={event => setCycleLengths(previous => ({ ...previous, [num]: Number(event.target.value) }))}>{[1,2,3,4].map(value => <option key={value} value={value}>{value}週間</option>)}</select></label></div>
                              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong className="block">この型を、いま表示している期間のシフトに入れ直す</strong>{assignedNames.length ? <>この勤務パターンを割り当て済みの人：{assignedNames.join("・")}。押すと、この人たちの「いま表示している期間」のシフトが、この型で作り直されます（手で入れた勤務も上書きされます）。</> : <>まだ誰にも割り当てていません。割り当ては、「シフト作成」→人ごとの画面で、日付を選んで勤務パターンを当てはめます。</>}<Button className="mt-2 w-full" variant="outline" disabled={!assignedNames.length} onClick={() => reapplyCycleToCurrentMonth(num)}>割り当て済みの人の今期を作り直す</Button></div>
                              <div className="space-y-3 overflow-x-auto">{Array.from({ length }, (_, weekIndex) => { const weekKey = `week${weekIndex + 1}` as "week1" | "week2" | "week3" | "week4"; return <div key={weekKey} className="min-w-[760px]"><strong className="mb-2 block text-xs text-blue-700">第{weekIndex + 1}週</strong><div className="grid grid-cols-7 gap-2">{["日", "月", "火", "水", "木", "金", "土"].map((label, dayIdx) => <label key={label} className="text-center"><span className="mb-1 block text-[10px] font-bold text-slate-500">{label}</span><select className="h-10 w-full rounded-lg border bg-white px-2 text-xs" value={cyclePatterns[num]?.[dayIdx]?.[weekKey] || ""} onChange={event => setCyclePatterns(previous => { const pattern = [...previous[num]]; pattern[dayIdx] = { ...pattern[dayIdx], [weekKey]: event.target.value as ShiftType }; return { ...previous, [num]: pattern }; })}><option value="">なし</option>{[...new Set([...visibleWorkTimes, cyclePatterns[num]?.[dayIdx]?.[weekKey], "有休", "休み"])].filter(Boolean).map(option => <option key={option} value={option}>{displayShift(option, workTimes, "both")}</option>)}</select></label>)}</div></div>; })}</div>
                            </div>}
                          </div>;
                        })}</div>
                        <SaveStatus className="mt-4" dirty={cycleDirty} saving={cycleSaving} />
                        <div className={(cycleDirty || cycleSaving) ? "h-20 md:hidden" : "hidden"} /><Button className={`fixed inset-x-4 bottom-[76px] z-40 h-12 font-bold shadow-xl md:sticky md:inset-x-auto md:bottom-2 md:z-10 md:w-full ${(cycleDirty || cycleSaving) ? "" : "max-md:hidden"}`} disabled={cycleSaving || !cycleDirty} onClick={() => void handleSaveCycleMaster()}>{cycleSaving ? "保存中…" : "勤務パターン作成マスタを保存"}</Button>
                      </section>

</CardContent></Card></motion.div>
            ) : activeTab === "admin" && settingsPage === "other" ? (
              <motion.div key="settings-other" className="space-y-4"><SettingsHead title="その他設定" description="接続・表示・ファイル出力" backLabel="設定へ戻る" onBack={() => goSettings("menu")} /><Card><CardContent className="space-y-5 p-6">                      <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-5 space-y-4">
                        <div>
                          <h4 className="text-base font-black text-blue-950">管理者用の接続キー</h4>
                          <p className="mt-1 text-xs text-slate-600">シフトの保存、確定状態の共有、管理者操作に使用します。この端末だけに保存されます。</p>
                        </div>
                        <p className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600">従業員ID・パスワードはGAS側で設定済みです。安全のため、この画面には値を表示しません。</p>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Input type="password" value={managementApiKey} onChange={event => setManagementApiKey(event.target.value)} placeholder="管理者用の接続キー" className="h-11 bg-white" />
                          <Button className="h-11 font-bold" disabled={apiKeyChecking} onClick={() => void saveAndCheckApiKey()}>{apiKeyChecking ? "確認中…" : "保存して接続を確認"}</Button>
                        </div>
                        {managementApiKey && (managementApiKey.length < 10 || /^\d+$/.test(managementApiKey) || /^[a-zA-Z]+$/.test(managementApiKey)) && <p role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-800">⚠ この接続キーは簡単すぎます（短い・数字だけ・英字だけ）。他の人に当てられると、シフトを書き換えられるおそれがあります。GAS側の「SHIFT_API_KEY」と、ここの入力を、12文字以上の英字と数字がまざったものに変えてください。</p>}
                        {(apiKeyCheck || apiKeyVerified) && <p role="status" className={`rounded-lg px-3 py-2 text-xs font-bold ${(apiKeyCheck ? apiKeyCheck.ok : apiKeyVerified) ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{apiKeyCheck ? (apiKeyCheck.ok ? "✓ " : "× ") + apiKeyCheck.message : "✓ この端末は接続確認ずみです"}</p>}
                        <p className="text-[11px] text-slate-500">従業員は共通の従業員ID・パスワードでログイン後、自分の名前を選んで希望を提出します。</p>
                      </div>
                      <div className="pt-6 border-t border-slate-100"><ErrorLogPanel /></div>

                      <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">期間の人員配置ヒートマップ</h4>
                            <p className="text-[10px] text-muted-foreground mt-1">ホーム画面に日ごとの出勤人数を色分け表示します（初期設定はOFF）</p>
                          </div>
                          <Button
                            type="button"
                            variant={heatmapEnabled ? "default" : "outline"}
                            size="sm"
                            className="h-9 min-w-20 text-xs"
                            onClick={() => setHeatmapEnabled(value => !value)}
                          >
                            {heatmapEnabled ? "ON" : "OFF"}
                          </Button>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">エクセル出力の保存先</h4>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-slate-600 flex-1">
                            {outputFolderName
                              ? <>現在の保存先: <span className="font-bold">{outputFolderName}</span></>
                              : "保存先フォルダは未設定です（毎回ダウンロードフォルダに保存されます）"}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={async () => {
                              const name = await chooseOutputFolder();
                              if (name) {
                                setOutputFolderName(name);
                                toast.success(`保存先を「${name}」に設定しました`);
                              } else {
                                toast.info("この操作に対応していないブラウザか、選択がキャンセルされました");
                              }
                            }}
                          >
                            {outputFolderName ? "変更する" : "フォルダを選ぶ"}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          ※ 対応ブラウザ（Chrome / Edge）限定です。一度設定すると、次回以降は同じフォルダに自動で保存されます。
                        </p>
                      </div>

                      <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">シフトデータ出力</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Button variant="outline" className="h-11 font-bold" onClick={() => downloadCSV()}>
                            <FileCode className="w-4 h-4 mr-2" />CSV出力
                          </Button>
                          <Button className="h-11 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => void downloadExcel()}>
                            <Grid3X3 className="w-4 h-4 mr-2" />Excel出力
                          </Button>
                        </div>
                      </div>

</CardContent></Card></motion.div>
            ) : activeTab === "admin" ? (
              <p>設定項目を選んでください。</p>
            ) : (
              (() => {
                const emp = employees.find(e => e.id === activeTab);
                if (!emp) return null;
                const periodShifts = emp.shifts.filter(s => dateRange.some(d => s.date.startsWith(getDateStr(d))));
                const attendanceDays = periodShifts.filter(s => s.shift && s.shift !== "休み" && s.shift !== "有休").length;
                const totalWorkHours = periodShifts.reduce((acc, s) => {
                  if (!s.workTime || !s.workTime.includes(":")) return acc;
                  const [h, m] = s.workTime.split(":").map(Number);
                  if (isNaN(h) || isNaN(m)) return acc;
                  return acc + h + m / 60;
                }, 0).toFixed(1);
                const paidLeaveDays = periodShifts.filter(s => s.shift === "有休").length;
                return (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="employee-shift-card border-border shadow-none">
                      <CardHeader className={`employee-card-header employee-blue-header page-blue-header border-b border-border ${isLocked ? "is-final" : "is-draft"}`}>
                        <div className="employee-blue-top">
                          <Button variant="ghost" size="sm" className="employee-back-button" onClick={() => setActiveTab("dashboard")}><ArrowLeft className="w-4 h-4" />戻る</Button>
                          <div>
                          <div className="flex items-center gap-2 group">
                            <CardTitle className="text-base">{emp.displayName || emp.name} の個人シート</CardTitle>
                          </div>
                          </div>
                          <Badge className={isLocked ? "bg-emerald-500 text-white border-0" : "bg-amber-300 text-amber-950 border-0"}>{isLocked ? "確定" : "シフト案"}</Badge>
                        </div>
                        <div className="employee-blue-controls"><div className="employee-month-step"><Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}><ChevronLeft className="h-4 w-4" />前の期間</Button><strong>{format(dateRange[0], "M月d日")}〜{format(dateRange[dateRange.length - 1], "M月d日")}</strong><Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>次の期間<ChevronRight className="h-4 w-4" /></Button></div></div></CardHeader>
                      <CardContent className="p-0">
                        <div className="personal-display-toolbar"><ShiftDisplayControl value={shiftDisplayMode} onChange={setShiftDisplayMode} /></div>
                        {isFromAdmin && <><div className="creation-person-status personal-creation-picker"><select aria-label="全体編集・個人編集の選択" value={emp.id} onChange={event => setActiveTab(event.target.value)}><option value="dashboard">全体編集</option>{dashboardEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.displayName || employee.name}</option>)}</select>{renderSyncStatus()}</div>{renderAutoSaveNote()}{isLocked && <p className="mx-3 mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">この期間は「確定」されています。解除したいときは、上の選択を「全体編集」に戻して、右上の「確定を解除」を押してください。</p>}{renderSyncFailure()}</>}
                        {!isFromAdmin ? <div className="personal-overview-layout">
                          <PersonalShiftList employee={emp} dates={dateRange} remarks={displayRemarks} workTimes={workTimes} displayMode={shiftDisplayMode} requests={leaveRequests} />
                          <aside className="personal-summary-panel">
                            <div><span>出勤日数</span><strong>{attendanceDays}<small>日</small></strong></div>
                            <div><span>合計実働時間</span><strong>{totalWorkHours}<small>時間</small></strong></div>
                            <div><span>有休取得数</span><strong>{paidLeaveDays}<small>日</small></strong></div>
                          </aside>
                        </div> : <div className="employee-shift-table-wrap overflow-x-auto">
                          <Table className="employee-shift-table text-[13px]">
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="w-16 h-10 font-bold text-muted-foreground border-r border-border">日付</TableHead>
                                <TableHead className="w-10 h-10 font-bold text-muted-foreground border-r border-border">曜</TableHead>
                                <TableHead className="w-48 h-10 font-bold text-muted-foreground border-r border-border">シフト</TableHead>
                                <TableHead className="w-24 h-10 font-bold text-muted-foreground border-r border-border">休憩</TableHead>
                                <TableHead className="w-24 h-10 font-bold text-muted-foreground border-r border-border">実働</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dateRange.map(date => {
                                const dateStr = getDateStr(date);
                                const s = getShift(emp, date);
                                const rowBgClass = getRowBgClass(date);

                                return (
                                  <TableRow key={dateStr} className={`h-12 ${rowBgClass}`}>
                                    <TableCell className="py-1 border-r border-border">{format(date, "MM/dd")}</TableCell>
                                    <TableCell className="py-1 text-muted-foreground border-r border-border">{format(date, "E", { locale: ja })}</TableCell>
                                    <TableCell className="py-1 border-r border-border">
                                      {getGlobalRemark(date)?.type && <div className="mb-1 text-[11px] font-bold text-slate-700">📅 {getGlobalRemark(date)?.type}{shouldRestOnDate(date, emp.id, specialDayRules) ? "（設定で休みになる日）" : ""}</div>}
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                          <Select 
                                            value={s?.shift || "none"} 
                                            onValueChange={(val) => handleShiftChange(emp.id, dateStr, val as ShiftType | "none")}
                                            disabled={isLocked}
                                          >
                                            <SelectTrigger className={`h-8 text-xs flex-1 ${s?.shift === "有休" ? "bg-red-100 border-red-300 text-red-800" : "bg-white"} ${isLocked ? "opacity-70 cursor-not-allowed" : ""}`}>
                                              <SelectValue placeholder="選択">{s?.shift ? displayShift(s.shift, workTimes, shiftDisplayMode) : "なし"}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-border shadow-xl z-50">
                                              <SelectItem value="none" className="text-xs text-muted-foreground italic">なし</SelectItem>
                                              {[...new Set([...visibleWorkTimes, "有休", "休み", "任意入力"])].map(opt => (
                                                <SelectItem key={opt} value={opt} className="text-xs">{displayShift(opt, workTimes, shiftDisplayMode)}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          {isFromAdmin && !isLocked && (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger render={<Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                  title="コピー・勤務パターン適用"
                                                />}>
                                                  <Download className="w-3 h-3 rotate-180" />
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="bg-white border-border shadow-xl z-50 min-w-[140px]">
                                                {Object.keys(cycleNames).map(Number).sort((a, b) => a - b).map(num => (
                                                  <DropdownMenuItem 
                                                    key={num} 
                                                    className="text-xs cursor-pointer py-2 border-b border-border/30 last:border-0" 
                                                    onClick={() => applyCycle(emp.id, dateStr, num)}
                                                  >
                                                    <span className="font-medium mr-1 text-primary">{num}.</span> {cycleNames[num]}を適用
                                                  </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuItem className="text-xs cursor-pointer font-bold text-slate-800 bg-muted/50 mt-1 py-2 text-center" onClick={() => copyShiftDown(emp.id, dateStr)}>
                                                  下に一括コピー
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          )}
                                        </div>
                                        {s?.shift === "任意入力" && (
                                          <Input 
                                            className="h-7 text-[10px] bg-white border-primary/30"
                                            placeholder="例：9:00～17:00"
                                            value={s?.customShiftText || ""}
                                            onChange={(e) => handleCustomShiftTextChange(emp.id, dateStr, e.target.value)}
                                            onBlur={() => finalizeCustomShiftText(emp.id, dateStr)}
                                            disabled={isLocked}
                                          />
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-1 text-muted-foreground text-xs border-r border-border">
                                      {s?.shift === "任意入力" ? (() => {
                                        const standard = calculateTimes(s?.customShiftText || "").breakTime;
                                        const isCustom = Boolean(s?.breakCustom) || (s?.breakTime || "0:00") !== standard;
                                        return <div className="flex flex-col gap-1">
                                          <select aria-label="休憩" className="h-7 rounded-md border border-primary/30 bg-white px-1 text-[10px]" value={isCustom ? "custom" : "standard"} disabled={isLocked} onChange={event => handleCustomBreakChange(emp.id, dateStr, event.target.value === "custom" ? "custom" : "standard")}>
                                            <option value="standard">標準（6時間超は1時間）</option>
                                            <option value="custom">それ以外</option>
                                          </select>
                                          {isCustom && <Input type="text" aria-label="休憩時間" className="h-7 w-16 border-primary/30 bg-white px-1 text-[10px] focus:border-primary" value={s?.breakTime || ""} placeholder="0:30" onChange={event => handleCustomBreakChange(emp.id, dateStr, "custom", event.target.value)} onFocus={event => event.target.select()} disabled={isLocked} />}
                                        </div>;
                                      })() : (
                                        s?.breakTime || "0:00"
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1 font-semibold text-xs border-r border-border">
                                      {s?.workTime || "0:00"}
                                    </TableCell>

                                  </TableRow>
                                );
                              })}
                              {/* Summary Row */}
                              <TableRow className="bg-muted/50 font-bold h-12">
                                <TableCell colSpan={3} className="text-right border-r border-border pr-4">期間合計</TableCell>
                                <TableCell className="py-1 text-muted-foreground text-xs border-r border-border">
                                  {
                                    emp.shifts
                                      .filter(s => dateRange.some(d => s.date.startsWith(getDateStr(d))))
                                      .reduce((acc, s) => {
                                        if (!s.breakTime || !s.breakTime.includes(":")) return acc;
                                        const [h, m] = s.breakTime.split(":").map(Number);
                                        if (isNaN(h) || isNaN(m)) return acc;
                                        return acc + h + m/60;
                                      }, 0).toFixed(1)
                                  }h
                                </TableCell>
                                <TableCell className="py-1 font-semibold text-xs border-r border-border">
                                  <div className="flex flex-col">
                                    <span className="text-slate-900 font-bold">{
                                      emp.shifts
                                        .filter(s => dateRange.some(d => s.date.startsWith(getDateStr(d))))
                                        .reduce((acc, s) => {
                                          if (!s.workTime || !s.workTime.includes(":")) return acc;
                                          const [h, m] = s.workTime.split(":").map(Number);
                                          if (isNaN(h) || isNaN(m)) return acc;
                                          return acc + h + m/60;
                                        }, 0).toFixed(1)
                                    }h</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-700 text-[10px]">{
                                        emp.shifts
                                          .filter(s => dateRange.some(d => s.date.startsWith(getDateStr(d))))
                                          .filter(s => s.shift && s.shift !== "休み" && s.shift !== "有休")
                                          .length
                                      }日</span>
                                      {(() => { const paid = emp.shifts                                           .filter(s => dateRange.some(d => s.date.startsWith(getDateStr(d))))                                           .filter(s => s.shift === "有休")                                           .length; return <span className={`${paid > 0 ? "text-red-700" : "text-slate-400"} text-[10px]`}>{paid}日(有)</span>; })()}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="bg-muted/30" />
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })()
            )}
          </AnimatePresence>
        </div>
      </main>
      {(resetProgress.running || resetProgress.completed) && <div role="status" aria-live="polite" className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/75 p-5">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-6 text-center shadow-2xl">
          <strong className={`block text-xl font-black ${resetProgress.completed ? "text-green-700" : "text-red-700"}`}>{resetProgress.completed ? "初期化が完了しました" : "初期化を実行中です"}</strong>
          <p className="mt-3 text-base font-bold text-red-700">処理済み：{resetProgress.archived}件</p>
          <p className="mt-3 text-sm text-slate-700">{resetProgress.completed ? "初期化は終了しました。" : "件数が多い場合は数分以上かかります。完了まで画面を閉じないでください。"}</p>
          {resetProgress.completed && <Button className="mt-5" onClick={() => window.location.reload()}>ログイン画面へ戻る</Button>}
        </div>
      </div>}
      {saveFeedback && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 top-3 z-[90] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 rounded-2xl border px-4 py-3 shadow-2xl md:top-5 ${
            saveFeedback.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : saveFeedback.kind === "error"
                ? "border-red-300 bg-red-50 text-red-950"
                : "border-blue-300 bg-white text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`sync-dot shrink-0 ${saveFeedback.kind === "saving" ? "saving" : saveFeedback.kind === "error" ? "offline" : "saved"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {saveFeedback.kind === "saving" ? `保存中（${saveElapsedSeconds}秒経過）` : saveFeedback.kind === "success" ? "保存完了" : "保存失敗"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed">{saveFeedback.message}</p>
              {saveFeedback.kind === "saving" && saveElapsedSeconds >= 15 && (
                <p className="mt-1 text-[11px] text-slate-500">変更件数が多い月は1分以上かかることがあります。</p>
              )}
            </div>
            {saveFeedback.kind !== "saving" && (
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold hover:bg-black/5"
                onClick={() => setSaveFeedback(null)}
                aria-label="保存結果を閉じる"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      )}
      {guideOpen && <ShiftToolGuide role={appSession.role} initialSection={guideSection} onClose={hideNextTime => { if (hideNextTime) templateStorage.setItem("shift_guide_hidden_v1", "1"); setGuideOpen(false); }} />}
      <UpdateBanner />
      <Toaster position="top-center" />
    </Tabs>
  );
}
