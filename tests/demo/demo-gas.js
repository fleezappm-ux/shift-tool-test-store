// お試し用：サーバー（GAS・Notion）なしで、画面の中だけで動かすための疑似サーバー。
// 保存した内容はこのページの中だけに残り、閉じると消えます。架空のお店「デモ店」のデータです。
(function () {
  var mem = {};
  var shim = { getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; }, key: function (i) { return Object.keys(mem)[i] || null; }, get length() { return Object.keys(mem).length; }, clear: function () { mem = {}; } };
  try { Object.defineProperty(window, "localStorage", { value: shim, configurable: true }); } catch (e) {}
  var ns = "shift-tool:v1:/:";
  shim.setItem(ns + "shift_app_session", JSON.stringify({ token: "demo", role: "admin", employeeId: "e1", employeeName: "山田", expiresAt: new Date(Date.now() + 864e5 * 30).toISOString() }));
  shim.setItem(ns + "shift_api_key", "demo");

  var staff = [["e1", "山田", "lead"], ["e2", "佐藤", "staff"], ["e3", "鈴木", "staff"], ["e4", "高橋", "staff"], ["e5", "田中", "staff"]];
  var master = staff.map(function (s, i) { return { id: s[0], name: s[1], displayName: s[1], displayOrder: i + 1, active: true, aliases: [], role: s[2] === "lead" ? "リーダー" : "スタッフ", roleId: s[2] }; });
  var roles = [{ id: "lead", name: "リーダー" }, { id: "staff", name: "スタッフ" }];
  var rows = {};
  var iso = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  var put = function (id, name, date, text) { rows[id + "|" + date] = { id: id + "-" + date, "従業員ID": id, "社員名": name, "日付": { start: date }, "シフト内容": text, "休憩時間": text === "休み" ? "" : (/～1[0-3]:|～9:/.test(text) ? "" : "1:00"), "実働時間": "", "備考": "" }; };
  // 9月までは「いつもの並び」が入っている（山田：月〜金・佐藤：火〜金＋隔週土・鈴木：遅番 月水金土・高橋：月〜水の午前・田中：木〜土の午後）。10月以降は山田と高橋だけ入っている。
  for (var d = new Date(2026, 6, 1); d <= new Date(2026, 11, 31); d.setDate(d.getDate() + 1)) {
    var wd = d.getDay(), key = iso(d), past = d < new Date(2026, 9, 1), wk = Math.floor((d.getTime() - new Date(2026, 6, 1).getTime()) / 864e5 / 7);
    if (wd >= 1 && wd <= 5) put("e1", "山田", key, "9:00～18:00");
    if (wd >= 1 && wd <= 3) put("e4", "高橋", key, "9:00～13:00");
    if (!past) continue;
    if (wd >= 2 && wd <= 5 || (wd === 6 && wk % 2 === 0)) put("e2", "佐藤", key, "9:00～18:00");
    if (wd === 1 || wd === 3 || wd === 5 || (wd === 6 && wk % 2 === 1)) put("e3", "鈴木", key, "10:00～19:00");
    if (wd >= 4 && wd <= 6) put("e5", "田中", key, "13:00～18:00");
  }
  var rules = { minTotal: [0, 0, 0, 0, 0, 0, 0], roleMins: [], maxConsecutive: 0, people: {}, hours: [null, null, null, null, null, null, null], alwaysRoles: [] };
  var workTimes = { revision: "r1", items: [
    { id: "w1", start: "09:00", end: "18:00", nextDay: false, abbreviation: "早番", visible: true },
    { id: "w2", start: "10:00", end: "19:00", nextDay: false, abbreviation: "遅番", visible: true },
    { id: "w3", start: "09:00", end: "13:00", nextDay: false, abbreviation: "午前勤務", visible: true },
    { id: "w4", start: "13:00", end: "18:00", nextDay: false, abbreviation: "午後勤務", visible: true }] };
  var special = [
    { id: "band-v3:closed-0", name: "日曜", color: "red", behavior: "information", enabled: true, mode: "recurring", weekday: 0, weeks: [1, 2, 3, 4, 5], dates: [], showName: true, restMode: "none", restEmployeeIds: [] },
    { id: "band-v3:holiday", name: "祝日", color: "red", behavior: "information", enabled: true, mode: "annual", weekday: 0, weeks: [], dates: [], showName: true, restMode: "none", restEmployeeIds: [] }];
  var now = new Date().toISOString();
  var leaves = [
    { id: "l1", employeeId: "e2", employeeName: "佐藤", date: "2026-10-14", periodStart: "2026-10-01", periodEnd: "2026-10-31", type: "休み希望", comment: "用事", commentVisibility: "all", status: "承認", submittedAt: now, updatedAt: now },
    { id: "l2", employeeId: "e3", employeeName: "鈴木", date: "2026-10-21", periodStart: "2026-10-01", periodEnd: "2026-10-31", type: "有給希望", comment: "", commentVisibility: "all", status: "承認", submittedAt: now, updatedAt: now }];
  var store = { storeName: "デモ店", showStoreNameOnHome: true };
  var period = { startDay: 1, endDay: 0 };
  var rev = 1;
  var ok = { success: true };
  function handle(a, b) {
    switch (a) {
      case "getShiftResetEpoch": return Object.assign({ epoch: "" }, ok);
      case "getShiftStoreSettings": return Object.assign({ settings: store }, ok);
      case "saveShiftStoreSettings": store = Object.assign({}, store, b.settings || b); return Object.assign({ settings: store }, ok);
      case "getShiftLoginEmployees": return Object.assign({ employees: master }, ok);
      case "getShiftEmployeeMaster": return Object.assign({ employees: master, revision: "rev" + rev }, ok);
      case "saveShiftEmployeeMaster": master = b.employees || master; rev++; return Object.assign({ employees: master, revision: "rev" + rev }, ok);
      case "getShiftRoleMaster": return Object.assign({ roles: roles }, ok);
      case "saveShiftRoleMaster": roles = b.roles || roles; return Object.assign({ roles: roles }, ok);
      case "getShiftHomeLayout": return Object.assign({ layout: { visible: true, columns: [["lead"], ["staff"]] } }, ok);
      case "saveShiftHomeLayout": return Object.assign({ layout: b.layout }, ok);
      case "getShiftWorkTimeMaster": return Object.assign({ master: workTimes }, ok);
      case "saveShiftWorkTimeMaster": workTimes = { items: b.items, revision: "r" + (++rev) }; return Object.assign({ master: workTimes }, ok);
      case "getShiftCalendarPeriodSettings": return Object.assign({ settings: period }, ok);
      case "saveShiftCalendarPeriodSettings": period = b.settings || period; return Object.assign({ settings: period }, ok);
      case "getShiftSpecialDayRules": return Object.assign({ rules: special }, ok);
      case "saveShiftSpecialDayRules": special = b.rules || special; return Object.assign({ rules: special }, ok);
      case "getShiftStaffingRules": return Object.assign({ rules: rules }, ok);
      case "saveShiftStaffingRules": rules = b.rules; return Object.assign({ rules: rules }, ok);
      case "getShifts": return Object.assign({ shifts: Object.keys(rows).map(function (k) { return rows[k]; }) }, ok);
      case "saveShiftMonth": (b.shifts || []).forEach(function (r) { var k = r["従業員ID"] + "|" + r["日付"]; if (r["シフト内容"]) rows[k] = { id: r["従業員ID"] + "-" + r["日付"], "従業員ID": r["従業員ID"], "社員名": r["社員名"], "日付": { start: r["日付"] }, "シフト内容": r["シフト内容"], "休憩時間": r["休憩時間"], "実働時間": r["実働時間"], "備考": "" }; else delete rows[k]; }); return Object.assign({ created: 0, updated: 0, cleared: 0 }, ok);
      case "getShiftHolidays": return Object.assign({ holidays: ["2026-10-12", "2026-11-03", "2026-11-23"] }, ok);
      case "getShiftPeriodStatus": return Object.assign({ locked: false }, ok);
      case "getShiftLeaveRequests": return Object.assign({ requests: leaves }, ok);
      case "getShiftPaidLeaveBalance": return Object.assign({ balance: { employeeId: b.employeeId, enabled: false, remainingDays: 0, renewalDate: "", grantDays: 0, updatedAt: now } }, ok);
      case "getShiftCycleMaster": return Object.assign({ master: null }, ok);
      case "getShiftAutoDraftSettings": return Object.assign({ settings: { enabled: false, started: false, horizonMonths: 3 } }, ok);
      case "getShiftStoreBoardVisibility": return Object.assign({ visibility: "immediate" }, ok);
      case "getShiftCorrectionVisibility": return Object.assign({ visibility: "all" }, ok);
      case "getShiftAdminNotices": return Object.assign({ notices: [] }, ok);
      case "getShiftAdminNoticeVisibility": return Object.assign({ visibility: "all" }, ok);
      case "getShiftPendingStatus": return Object.assign({ count: 0 }, ok);
      case "flushShiftPending": return Object.assign({ pending: 0 }, ok);
      default: return ok;
    }
  }
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, init) {
    var u = String(url && url.url || url);
    if (u.indexOf("script.google.com") >= 0) {
      var b = {}; try { b = JSON.parse((init && init.body) || "{}"); } catch (e) {}
      var out = b.action === "batchShift" ? { success: true, results: (b.calls || []).map(function (c) { return handle(c.action, c); }) } : handle(b.action, b);
      return new Promise(function (resolve) { setTimeout(function () { resolve(new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } })); }, 120); });
    }
    if (u.indexOf("version.json") >= 0) return Promise.resolve(new Response("", { status: 404 }));
    return realFetch ? realFetch(url, init) : Promise.reject(new Error("offline"));
  };
  document.addEventListener("DOMContentLoaded", function () {
    var tag = document.createElement("div");
    tag.textContent = "お試し版（保存はこのページの中だけ・閉じると消えます）";
    tag.style.cssText = "position:fixed;top:calc(env(safe-area-inset-top,0px) + 4px);left:50%;transform:translateX(-50%);z-index:9999;background:#1e293b;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;opacity:.92;pointer-events:none;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis";
    document.body.appendChild(tag);
  });
})();
