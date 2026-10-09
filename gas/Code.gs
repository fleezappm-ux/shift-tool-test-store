/** Shift Tool standalone GAS backend. Configure Script Properties before deployment. */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data || !data.action) throw new Error("actionが必要です。");
    // 読み込みを1回の通信にまとめる（画面を開いた直後に何十回も通信すると遅いため）
    if (data.action === "batchShift") return runShiftBatch_(data);
    return dispatchShiftAction_(data);
  } catch (error) {
    return createJsonResponse(false, error.message || "処理に失敗しました。");
  }
}

/** 「読み込み(get…)」だけを、まとめて実行します。1件ごとにログイン確認も行い、結果は同じ順番で返します。 */
function runShiftBatch_(data) {
  var calls = data.calls;
  if (!Array.isArray(calls) || !calls.length || calls.length > 20) throw new Error("まとめて実行できる件数は1〜20件です。");
  var results = [];
  var timings = [];
  var batchStart = Date.now();
  for (var i = 0; i < calls.length; i += 1) {
    var out;
    var callStart = Date.now();
    try {
      var sub = calls[i];
      if (!sub || typeof sub.action !== "string" || sub.action.indexOf("get") !== 0) throw new Error("読み込み以外はまとめて実行できません。");
      out = JSON.parse(dispatchShiftAction_(sub).getContent());
    } catch (error) {
      out = { success: false, message: error.message || "処理に失敗しました。" };
    }
    results.push(out);
    timings.push((calls[i] && calls[i].action || "?") + ":" + (Date.now() - callStart));
  }
  return createJsonDataResponse({ success: true, results: results, timing: { totalMs: Date.now() - batchStart, calls: timings } });
}

/** 1件の操作を実行します（doPostとバッチの共通部分）。 */
function dispatchShiftAction_(data) {
  if (!data || !data.action) throw new Error("actionが必要です。");
    // 公開ログイン操作以外は、ルーティング時に必ずセッションを検証する。
    // 各関数内の本人・接続キー・管理者チェックも引き続き適用する。
    var publicActions = ["loginShift", "getShiftLoginEmployees", "getShiftResetEpoch"];
    var adminActions = ["previewTemplateReset", "getTemplateResetStatus", "runTemplateReset", "clearTemplateShiftRemarks", "saveShiftEmployeeMaster", "resetShiftEmployeePin", "saveShiftRoleMaster", "saveShiftHomeLayout", "saveShiftAdminNotice", "deleteShiftAdminNotice", "saveShiftAdminNoticeVisibility", "saveShiftWorkTimeMaster", "saveShiftCycleMaster", "saveShiftAutoDraftSettings", "saveShiftStoreBoardVisibility", "saveShiftCorrectionVisibility", "updateShiftLeaveRequestStatus", "deleteShiftLeaveRequest", "saveShiftSpecialDayRules", "saveShiftStaffingRules", "saveShiftCalendarPeriodSettings", "saveShiftPeriodStatus", "saveShiftStoreSettings", "checkShiftApiKey", "saveShiftMonth", "flushShiftPending", "getShiftErrorLog", "clearShiftErrorLog"];
    if (publicActions.indexOf(data.action) < 0) requireShiftSession(data.sessionToken, adminActions.indexOf(data.action) >= 0 ? "admin" : null);
    if (data.action === "previewTemplateReset") return previewTemplateReset(data);
    if (data.action === "getTemplateResetStatus") return getTemplateResetStatus(data);
    if (data.action === "runTemplateReset") return runTemplateReset(data);
    if (data.action === "clearTemplateShiftRemarks") return clearTemplateShiftRemarks(data);
    if (data.action === "getShiftResetEpoch") return createJsonDataResponse({ success: true, epoch: PropertiesService.getScriptProperties().getProperty("SHIFT_RESET_EPOCH") || "" });
    if (data.action === "loginShift") return loginShift(data);
    if (data.action === "logoutShift") return logoutShift(data);
    if (data.action === "checkShiftApiKey") { verifyShiftApiKey(data.shiftApiKey); return createJsonDataResponse({ success: true }); }
    if (data.action === "getShiftStoreSettings") return getShiftStoreSettings(data);
    if (data.action === "saveShiftStoreSettings") return saveShiftStoreSettings(data);
    if (data.action === "getShiftLoginEmployees") return getShiftLoginEmployees(data);
    if (data.action === "getShiftEmployeeMaster") return getShiftEmployeeMaster(data);
    if (data.action === "saveShiftEmployeeMaster") return saveShiftEmployeeMaster(data);
    if (data.action === "resetShiftEmployeePin") return resetShiftEmployeePin(data);
    if (data.action === "getShiftRoleMaster") return getShiftRoleMaster(data);
    if (data.action === "saveShiftRoleMaster") return saveShiftRoleMaster(data);
    if (data.action === "getShiftHomeLayout") return getShiftHomeLayout(data);
    if (data.action === "saveShiftHomeLayout") return saveShiftHomeLayout(data);
    if (data.action === "getShiftAdminNotices") return getShiftAdminNotices(data);
    if (data.action === "saveShiftAdminNotice") return saveShiftAdminNotice(data);
    if (data.action === "deleteShiftAdminNotice") return deleteShiftAdminNotice(data);
    if (data.action === "getShiftAdminNoticeVisibility") return getShiftAdminNoticeVisibility(data);
    if (data.action === "saveShiftAdminNoticeVisibility") return saveShiftAdminNoticeVisibility(data);
    if (data.action === "getShiftWorkTimeMaster") return getShiftWorkTimeMaster(data);
    if (data.action === "saveShiftWorkTimeMaster") return saveShiftWorkTimeMaster(data);
    if (data.action === "getShiftCycleMaster") return getShiftCycleMaster(data);
    if (data.action === "saveShiftCycleMaster") return saveShiftCycleMaster(data);
    if (data.action === "getShiftPaidLeaveBalance") return getShiftPaidLeaveBalance(data);
    if (data.action === "saveShiftPaidLeaveBalance") return saveShiftPaidLeaveBalance(data);
    if (data.action === "getShiftAutoDraftSettings") return getShiftAutoDraftSettings(data);
    if (data.action === "saveShiftAutoDraftSettings") return saveShiftAutoDraftSettings(data);
    if (data.action === "getShiftStoreBoardVisibility") return getShiftStoreBoardVisibility(data);
    if (data.action === "saveShiftStoreBoardVisibility") return saveShiftStoreBoardVisibility(data);
    if (data.action === "getShiftCorrectionVisibility") return getShiftCorrectionVisibility(data);
    if (data.action === "saveShiftCorrectionVisibility") return saveShiftCorrectionVisibility(data);
    if (data.action === "getShifts") return getShifts(data);
    if (data.action === "getShiftLeaveRequests") return getShiftLeaveRequests(data);
    if (data.action === "saveShiftLeaveRequest") return saveShiftLeaveRequest(data);
    if (data.action === "cancelShiftLeaveRequest") return cancelShiftLeaveRequest(data);
    if (data.action === "updateShiftLeaveRequestWorkTime") return updateShiftLeaveRequestWorkTime(data);
    if (data.action === "updateShiftLeaveRequestStatus") return updateShiftLeaveRequestStatus(data);
    if (data.action === "deleteShiftLeaveRequest") return deleteShiftLeaveRequest(data);
    if (data.action === "getShiftSpecialDayRules") return getShiftSpecialDayRules(data);
    if (data.action === "saveShiftSpecialDayRules") return saveShiftSpecialDayRules(data);
    if (data.action === "getShiftStaffingRules") return getShiftStaffingRules(data);
    if (data.action === "saveShiftStaffingRules") return saveShiftStaffingRules(data);
    if (data.action === "getShiftCalendarPeriodSettings") return getShiftCalendarPeriodSettings(data);
    if (data.action === "saveShiftCalendarPeriodSettings") return saveShiftCalendarPeriodSettings(data);
    if (data.action === "getShiftPeriodStatus") return getShiftPeriodStatus(data);
    if (data.action === "saveShiftPeriodStatus") return saveShiftPeriodStatus(data);
    if (data.action === "saveShiftMonth") return saveShiftMonth(data);
    if (data.action === "flushShiftPending") return flushShiftPending(data);
    if (data.action === "getShiftPendingStatus") return getShiftPendingStatus(data);
    if (data.action === "logShiftClientError") return logShiftClientError(data);
    if (data.action === "getShiftErrorLog") return getShiftErrorLog(data);
    if (data.action === "clearShiftErrorLog") return clearShiftErrorLog(data);
  return createJsonResponse(false, "未対応のシフト操作です。");
}



/** 文字列を安全な長さに丸めます。想定外に巨大な入力でNotion APIがエラーになるのを防ぎます。 */
/** 文字列の長さを検証します。上限を超えた場合は、黙って切り詰めずエラーにします。 */
function sanitizeText(value, maxLength) {
  var text = value === null || value === undefined ? "" : String(value);
  var limit = maxLength || 2000;
  if (text.length > limit) {
    throw new Error("入力内容が長すぎます（" + limit + "文字以内にしてください）。");
  }
  return text;
}



/** "YYYY-MM-DD"形式かつ実在する日付だけを許可します。形式違反・存在しない日付はエラーにします。 */
function sanitizeDateValue(value) {
  if (!value) return null;
  var text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("日付の形式が正しくありません（YYYY-MM-DD）。");
  }
  var parts = text.split("-").map(Number);
  var dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  if (dateObj.getFullYear() !== parts[0] || dateObj.getMonth() !== parts[1] - 1 || dateObj.getDate() !== parts[2]) {
    throw new Error("実在しない日付です。");
  }
  return text;
}



function createTitleProperty(text) {
  var safeText = sanitizeText(text, 500);
  return {
    title: safeText
      ? [{ text: { content: safeText } }]
      : []
  };
}



function createRichTextProperty(text) {
  var safeText = sanitizeText(text, 2000);
  return {
    rich_text: safeText
      ? [{ text: { content: safeText } }]
      : []
  };
}



function createJsonResponse(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: success,
      message: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}



function statusPageToObject(page) {
  var obj = flattenStatusProperties(page.properties || {});
  obj.id = page.id || "";
  obj.url = page.url || "";
  return obj;
}



function flattenStatusProperties(properties) {
  var result = {};
  Object.keys(properties || {}).forEach(function(name) {
    result[name] = statusPlainValue(properties[name]);
  });
  return result;
}



function statusPlainValue(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case "title": return statusJoinText(prop.title);
    case "rich_text": return statusJoinText(prop.rich_text);
    case "number": return prop.number;
    case "select": return prop.select ? prop.select.name : "";
    case "multi_select": return (prop.multi_select || []).map(function(x){ return x.name; });
    case "date": return prop.date ? { start: prop.date.start || "", end: prop.date.end || "" } : null;
    case "checkbox": return Boolean(prop.checkbox);
    case "url": return prop.url || "";
    case "email": return prop.email || "";
    case "phone_number": return prop.phone_number || "";
    case "status": return prop.status ? prop.status.name : "";
    case "created_time": return prop.created_time || "";
    case "last_edited_time": return prop.last_edited_time || "";
    default: return null;
  }
}



function statusJoinText(items) {
  return (items || []).map(function(x) { return x.plain_text || ""; }).join("");
}



/**
 * Notionデータベースを検索します。Notion APIは1回のリクエストで最大100件までしか
 * 返さない仕様があるため、たくさんの件数が必要な呼び出し（page_size未指定、または
 * 100以上を指定した場合）では、has_more/next_cursorを使って自動的に複数回に
 * 分けて全件取得します。少量だけ欲しい場合（page_sizeに100未満を明示指定した場合）は、
 * 従来通り1回のリクエストだけで終わります。
 */
function queryNotionDatabase(apiKey, databaseId, body) {
  var perfNotionStart = Date.now();
  var perfPageCount = 0;
  var requestBody = {};
  for (var k in body) { requestBody[k] = body[k]; }

  var wantsAll = requestBody.page_size === undefined || requestBody.page_size >= 100;
  if (requestBody.page_size !== undefined && requestBody.page_size > 100) {
    requestBody.page_size = 100;
  }

  var allResults = [];
  var hasMore = true;

  while (hasMore) {
    perfPageCount += 1;
    var response = UrlFetchApp.fetch(
      "https://api.notion.com/v1/databases/" + databaseId + "/query",
      {
        method: "post",
        contentType: "application/json",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Notion-Version": "2022-06-28"
        },
        payload: JSON.stringify(requestBody),
        muteHttpExceptions: true
      }
    );

    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    if (responseCode !== 200) {
      var message = responseBody;
      try {
        var errorJson = JSON.parse(responseBody);
        message = errorJson.message || responseBody;
      } catch (_) {}
      throw new Error("Notion API Error: " + message);
    }

    var parsed = JSON.parse(responseBody);
    allResults = allResults.concat(parsed.results || []);

    hasMore = wantsAll && !!parsed.has_more;
    if (hasMore) {
      requestBody.start_cursor = parsed.next_cursor;
    }
  }

  console.log(
    "[PERF] stage=notion_query_complete" +
    " pages=" + perfPageCount +
    " rows=" + allResults.length +
    " ms=" + (Date.now() - perfNotionStart)
  );

  return allResults;
}



function createJsonDataResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}



function createNotionPage(apiKey, databaseId, properties) {
  return requestNotion(apiKey, "https://api.notion.com/v1/pages", "post", {
    parent: { database_id: databaseId },
    properties: properties
  });
}



/** Notion IDのハイフン有無・大文字小文字の違いを吸収して比較できる形に正規化します。 */
function normalizeNotionId(id) {
  return String(id || "").replace(/-/g, "").toLowerCase();
}



/** 指定したページIDが、実際に想定するデータベースに属しているかを確認します。属していなければ処理を中断します。 */
function assertPageBelongsToDatabase(apiKey, pageId, expectedDatabaseId) {
  if (!pageId) {
    throw new Error("IDが指定されていません。");
  }
  if (!expectedDatabaseId) {
    throw new Error("対象データベースの設定が未完了です。");
  }
  var page = requestNotion(apiKey, "https://api.notion.com/v1/pages/" + pageId, "get", null);
  var actualDatabaseId = page.parent && page.parent.database_id ? page.parent.database_id : null;
  if (!actualDatabaseId || normalizeNotionId(actualDatabaseId) !== normalizeNotionId(expectedDatabaseId)) {
    throw new Error("指定されたIDが対象のデータベースに属していないため、処理を中断しました。");
  }
  return page;
}



function updateNotionPage(apiKey, pageId, properties) {
  return requestNotion(apiKey, "https://api.notion.com/v1/pages/" + pageId, "patch", {
    properties: properties
  });
}



function requestNotion(apiKey, url, method, body) {
  var options = {
    method: method,
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Notion-Version": "2022-06-28"
    },
    muteHttpExceptions: true
  };
  if (body !== null && body !== undefined) {
    options.payload = JSON.stringify(body);
  }
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  if (responseCode < 200 || responseCode >= 300) {
    var responseBody = response.getContentText();
    var message = responseBody;
    try {
      message = JSON.parse(responseBody).message || responseBody;
    } catch (_) {}
    throw new Error("Notion API Error: " + message);
  }
  return JSON.parse(response.getContentText());
}



/* ============================================================
 * 【追加機能】カレンダー予定・一包化サポート機能
 * ============================================================ */

/** 現在の店舗IDを返します。多店舗化までは固定のスクリプトプロパティを使います。 */
function getStoreId() {
  return PropertiesService.getScriptProperties().getProperty("STORE_ID") || "STORE-NEW";
}



/* ------------------------------------------------------------
 * シフト管理ツール：休み希望の掲示板公開設定
 * 店舗設定DB（NOTION_STORE_DATABASE_ID）を正本とし、店舗ID行に
 * 「休み希望公開設定」プロパティを保存・取得します。端末のlocalStorage
 * には依存せず、全端末が同じ設定を取得できるようにします。
 * ------------------------------------------------------------ */
var SHIFT_BOARD_VISIBILITY_VALUES = ["immediate", "after_approval", "private"];


var SHIFT_BOARD_VISIBILITY_LABELS = {
  immediate: "提出と同時に全員へ公開",
  after_approval: "管理者確認後に全員へ公開",
  private: "本人と編集者だけに表示"
};



function shiftBoardVisibilityLabelToValue(label) {
  var found = Object.keys(SHIFT_BOARD_VISIBILITY_LABELS).filter(function(key) {
    return SHIFT_BOARD_VISIBILITY_LABELS[key] === label;
  });
  return found.length ? found[0] : "immediate";
}



/** 休み希望の掲示板公開設定を店舗設定DBから取得します。DB未設定時は安全側でimmediateを返します。 */
/** 休み希望の公開設定を読み取って値（immediate / after_approval / private）を返す共通処理。 */
function readShiftBoardVisibilityValue() {
  var p = PropertiesService.getScriptProperties();
  var apiKey = p.getProperty("NOTION_API_KEY");
  var storeDbId = p.getProperty("NOTION_STORE_DATABASE_ID");
  var stored = p.getProperty("SHIFT_BOARD_VISIBILITY_FALLBACK_" + getStoreId());
  // 保存時にここへも書いているので、あればNotionへ問い合わせず（約0.7秒の節約）これを使う。
  if (stored) return stored;
  var fallback = "immediate";
  if (!apiKey || !storeDbId) return fallback;
  var rows = queryNotionDatabase(apiKey, storeDbId, {
    filter: { property: "店舗ID", rich_text: { equals: getStoreId() } },
    page_size: 1
  });
  var resolved = fallback;
  if (rows.length) {
    var obj = statusPageToObject(rows[0]);
    var label = obj["休み希望公開設定"] || "";
    if (label) resolved = shiftBoardVisibilityLabelToValue(label);
  }
  // 次からNotionへ問い合わせなくて済むよう、ここへ控えておく（保存時にも更新される）。
  p.setProperty("SHIFT_BOARD_VISIBILITY_FALLBACK_" + getStoreId(), resolved);
  return resolved;
}

function getShiftStoreBoardVisibility(data) {
  try {
    return createJsonDataResponse({ success: true, visibility: readShiftBoardVisibilityValue() });
  } catch (error) {
    console.error("getShiftStoreBoardVisibility failed: " + error);
    return createJsonDataResponse({ success: true, visibility: "immediate" });
  }
}



/** 休み希望の掲示板公開設定を店舗設定DBへ保存します。編集者用のSHIFT_API_KEYを必須とします。 */
function saveShiftStoreBoardVisibility(data) {
  var lock = shiftLockHandle_();
  try {
    if (!lock.tryLock(10000)) throw new Error("別の保存処理を実行中です。");
    verifyShiftApiKey(data.shiftApiKey);
    var visibility = sanitizeText(data.visibility, 30);
    if (SHIFT_BOARD_VISIBILITY_VALUES.indexOf(visibility) === -1) throw new Error("公開設定の値が正しくありません。");
    var label = SHIFT_BOARD_VISIBILITY_LABELS[visibility];

    var p = PropertiesService.getScriptProperties();
    p.setProperty("SHIFT_BOARD_VISIBILITY_FALLBACK_" + getStoreId(), visibility);

    var apiKey = p.getProperty("NOTION_API_KEY");
    var storeDbId = p.getProperty("NOTION_STORE_DATABASE_ID");
    if (!apiKey || !storeDbId) {
      return createJsonDataResponse({ success: true, visibility: visibility });
    }

    var databaseUrl = "https://api.notion.com/v1/databases/" + storeDbId;
    var database = requestNotion(apiKey, databaseUrl, "get", null);
    if (!database.properties || !database.properties["休み希望公開設定"]) {
      requestNotion(apiKey, databaseUrl, "patch", {
        properties: { "休み希望公開設定": { select: { options: Object.keys(SHIFT_BOARD_VISIBILITY_LABELS).map(function(key) { return { name: SHIFT_BOARD_VISIBILITY_LABELS[key] }; }) } } }
      });
    }

    var rows = queryNotionDatabase(apiKey, storeDbId, {
      filter: { property: "店舗ID", rich_text: { equals: getStoreId() } },
      page_size: 1
    });
    if (rows.length) {
      updateNotionPage(apiKey, rows[0].id, { "休み希望公開設定": { select: { name: label } } });
    } else {
      createNotionPage(apiKey, storeDbId, {
        "店舗名": createTitleProperty("店舗名を設定"),
        "店舗ID": createRichTextProperty(getStoreId()),
        "休み希望公開設定": { select: { name: label } }
      });
    }
    appendShiftAudit(data, "休み希望掲示板公開設定変更", getStoreId(), null, { visibility: visibility });
    return createJsonDataResponse({ success: true, visibility: visibility });
  } catch (error) {
    console.error("saveShiftStoreBoardVisibility failed: " + error);
    return createJsonResponse(false, error.message || "公開設定を保存できませんでした。");
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}



/* ============================================================
 * シフト管理ツール連携
 * ============================================================ */

/** シフト管理ツールからのリクエストを検証します（Googleログインの代わりに合言葉で確認）。 */
function verifyShiftApiKey(providedKey) {
  var expected = PropertiesService.getScriptProperties().getProperty("SHIFT_API_KEY");
  if (!expected || !providedKey || providedKey !== expected) {
    throw new Error("シフト管理ツールの認証に失敗しました。");
  }
}



/* ------------------------------------------------------------
 * 共通ヘルパー：保存の排他制御・サイズ確認
 * ------------------------------------------------------------ */
var SHIFT_LOCK_HELD_ = false;
var SHIFT_PROPERTY_MAX_BYTES_ = 8500;

/** スクリプトロックを包み、同じ実行内で二重に取得しようとしても止まらないようにします。 */
function shiftLockHandle_() {
  var inner = LockService.getScriptLock();
  var mine = false;
  function mark(ok) { if (ok) { SHIFT_LOCK_HELD_ = true; mine = true; } return ok; }
  return {
    tryLock: function(ms) { if (SHIFT_LOCK_HELD_) return true; return mark(inner.tryLock(ms)); },
    waitLock: function(ms) { if (SHIFT_LOCK_HELD_) return; inner.waitLock(ms); mark(true); },
    hasLock: function() { return mine && inner.hasLock(); },
    releaseLock: function() { if (!mine) return; mine = false; SHIFT_LOCK_HELD_ = false; inner.releaseLock(); }
  };
}

/** 読み取り→書き込みの処理を、他の保存と重ならないように実行します。 */
function withShiftLock_(fn) {
  if (SHIFT_LOCK_HELD_) return fn();
  var lock = shiftLockHandle_();
  try { lock.waitLock(10000); }
  catch (error) { throw new Error("別の保存処理を実行中です。少し待ってからもう一度お試しください。"); }
  try { return fn(); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}

function shiftByteLength_(text) {
  try { return Utilities.newBlob(String(text)).getBytes().length; }
  catch (_) {
    var bytes = 0, str = String(text);
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) bytes += 1; else if (c < 0x800) bytes += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { bytes += 4; i++; } else bytes += 3;
    }
    return bytes;
  }
}

function assertShiftPropertySize_(value) {
  if (shiftByteLength_(value) > SHIFT_PROPERTY_MAX_BYTES_) throw new Error("保存できるデータの上限を超えました。不要なデータを整理してください。");
}

/** 1つの設定値が上限を超えないことを確認してから保存します。 */
function safeSetProperty_(key, value) {
  assertShiftPropertySize_(value);
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function formatShiftDateParts_(year, monthIndex, day) {
  var d = new Date(year, monthIndex, day);
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

/** 今日から指定月数ずれた日付（yyyy-MM-dd）。 */
function shiftDateFromToday_(monthOffset) {
  var now = new Date();
  return formatShiftDateParts_(now.getFullYear(), now.getMonth() + monthOffset, now.getDate());
}

/** 店舗共通のシフト期間設定（未設定なら毎月1日〜月末）。 */
function readShiftCalendarSettings_() {
  var settings = { startDay: 1, endDay: 0 };
  try {
    var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_CALENDAR_PERIOD_JSON");
    var parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Number(parsed.startDay) >= 1 && Number(parsed.startDay) <= 28) settings = { startDay: Number(parsed.startDay), endDay: Number(parsed.endDay) || 0 };
  } catch (_) {}
  return settings;
}

/** 期間の開始日から、設定に沿った終了日を求めます（古い確定情報にperiodEndが無い場合の補完用）。 */
function deriveShiftPeriodEnd_(periodStart) {
  var settings = readShiftCalendarSettings_();
  var parts = String(periodStart).split("-").map(Number);
  if (!settings.endDay) return formatShiftDateParts_(parts[0], parts[1], 0);
  if (settings.endDay < settings.startDay) return formatShiftDateParts_(parts[0], parts[1], settings.endDay);
  return formatShiftDateParts_(parts[0], parts[1] - 1, settings.endDay);
}



function getShiftManagementSettings() {
  var p = PropertiesService.getScriptProperties();
  var apiKey = p.getProperty("NOTION_API_KEY");
  var databaseId = p.getProperty("NOTION_SHIFT_DATABASE_ID");
  if (!apiKey || !databaseId) throw new Error("シフト管理DBの設定が未完了です。");
  return { apiKey: apiKey, databaseId: databaseId };
}



/** シフト管理DBの全レコードを返します。 */
/** シフト一覧の短時間キャッシュ（Notionから毎回読むと約2秒かかるため）。書き込み・初期化のたびに破棄する。 */
function shiftsCacheKey_() { return "SHIFTS_" + (PropertiesService.getScriptProperties().getProperty("SHIFT_RESET_EPOCH") || "0"); }
function readShiftsCache_() {
  try { var raw = CacheService.getScriptCache().get(shiftsCacheKey_()); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
}
function writeShiftsCache_(shifts) {
  try { var json = JSON.stringify(shifts); if (json.length < 90000) CacheService.getScriptCache().put(shiftsCacheKey_(), json, 120); } catch (_) {}
}
function invalidateShiftsCache_() { try { CacheService.getScriptCache().remove(shiftsCacheKey_()); } catch (_) {} }

function getShifts(data) {
  try {
    // doPostでログインセッションを確認済み。保存・削除系では接続キーも必須にする。
    var shifts = readShiftsCache_();
    if (!shifts) {
      var settings = getShiftManagementSettings();
      var pages = queryNotionDatabase(settings.apiKey, settings.databaseId, { page_size: 100 });
      shifts = pages.map(function(page) {
        var obj = flattenStatusProperties(page.properties || {});
        obj.id = page.id;
        return obj;
      });
      writeShiftsCache_(shifts);
    }
    return createJsonDataResponse({ success: true, shifts: overlayShiftPending_(shifts) });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "シフトの取得エラーが発生しました。");
  }
}



/** 期間別の確定状態。閲覧端末も取得でき、変更だけ管理者キーを必須にします。 */
function getShiftPeriodStatus(data) {
  try {
    var periodStart = sanitizeDateValue(data.periodStart);
    if (!periodStart) throw new Error("対象期間が正しくありません。");
    var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_PERIOD_STATUSES_JSON") || "{}";
    var statuses = JSON.parse(raw);
    // 新しい店舗では全期間を未確定で開始します。
    var locked = Object.prototype.hasOwnProperty.call(statuses, periodStart)
      ? Boolean(statuses[periodStart].locked)
      : false;
    return createJsonDataResponse({ success: true, periodStart: periodStart, locked: locked });
  } catch (error) {
    return createJsonResponse(false, error.message || "確定状態を取得できませんでした。");
  }
}



function saveShiftPeriodStatus(data) {
  try {
    verifyShiftApiKey(data.shiftApiKey);
    var periodStart = sanitizeDateValue(data.periodStart);
    var periodEnd = sanitizeDateValue(data.periodEnd);
    if (!periodStart || !periodEnd || periodStart > periodEnd) throw new Error("対象期間が正しくありません。");
    var locked = Boolean(data.locked);
    return withShiftLock_(function() {
      var p = PropertiesService.getScriptProperties();
      var statuses = {};
      try { statuses = JSON.parse(p.getProperty("SHIFT_PERIOD_STATUSES_JSON") || "{}"); }
      catch (_) { throw new Error("確定状態のデータを読み込めませんでした。管理者に連絡してください。"); }
      var before = statuses[periodStart] || null;
      // 先にすべて計算し、サイズも確認してから、台帳→残日数→確定状態の順に書き込みます。
      var plan = reconcileShiftPaidLeaveForPeriod(periodStart, periodEnd, locked);
      statuses[periodStart] = { locked: locked, periodEnd: periodEnd, updatedAt: new Date().toISOString() };
      var statusesJson = JSON.stringify(statuses);
      assertShiftPropertySize_(statusesJson);
      if (plan.changed) {
        assertShiftPropertySize_(plan.ledgerJson);
        assertShiftPropertySize_(plan.balancesJson);
        p.setProperty("SHIFT_PAID_LEAVE_LEDGER_JSON", plan.ledgerJson);
        p.setProperty("SHIFT_PAID_LEAVE_BALANCES_JSON", plan.balancesJson);
      }
      p.setProperty("SHIFT_PERIOD_STATUSES_JSON", statusesJson);
      appendShiftAudit(data, locked ? "シフト確定" : "シフト確定解除", periodStart + "〜" + periodEnd, before, statuses[periodStart]);
      return createJsonDataResponse({ success: true, periodStart: periodStart, locked: locked });
    });
  } catch (error) {
    return createJsonResponse(false, error.message || "確定状態を保存できませんでした。");
  }
}



/**
 * 確定・確定解除に伴う有給残日数の変更を計算して返します（ここでは保存しません）。
 * 台帳は期間の開始日をキーにします。旧形式（開始日|終了日）のキーも解除時に読み取ります。
 */
function reconcileShiftPaidLeaveForPeriod(periodStart, periodEnd, locked) {
  var p = PropertiesService.getScriptProperties();
  var balances = {};
  var ledger = {};
  try { balances = JSON.parse(p.getProperty("SHIFT_PAID_LEAVE_BALANCES_JSON") || "{}"); } catch (_) { balances = {}; }
  try { ledger = JSON.parse(p.getProperty("SHIFT_PAID_LEAVE_LEDGER_JSON") || "{}"); } catch (_) { ledger = {}; }
  var matchingKeys = Object.keys(ledger).filter(function(key) { return key === periodStart || key.indexOf(periodStart + "|") === 0; });
  var changed = false;
  if (!locked) {
    matchingKeys.forEach(function(key) {
      var previous = ledger[key] || {};
      Object.keys(previous).forEach(function(employeeId) {
        if (balances[employeeId]) balances[employeeId].remainingDays = Math.max(0, Number(balances[employeeId].remainingDays || 0) + Number(previous[employeeId] || 0));
      });
      delete ledger[key];
    });
    changed = true;
  } else if (!matchingKeys.length) {
    var settings = getShiftManagementSettings();
    var pages = queryNotionDatabase(settings.apiKey, settings.databaseId, { filter: { and: [{ property: "日付", date: { on_or_after: periodStart } }, { property: "日付", date: { on_or_before: periodEnd } }] }, page_size: 100 });
    var wanted = {};
    pages.forEach(function(page) {
      var flat = flattenStatusProperties(page.properties || {});
      if (String(flat["シフト内容"] || "") !== "有休") return;
      var employeeId = String(flat["従業員ID"] || "");
      if (employeeId && balances[employeeId] && balances[employeeId].enabled) wanted[employeeId] = Number(wanted[employeeId] || 0) + 1;
    });
    // 実際に引いた日数（0未満にならないよう丸めた後の値）だけを台帳へ記録し、解除時にその分だけ戻します。
    var deductions = {};
    Object.keys(wanted).forEach(function(employeeId) {
      var remaining = Math.max(0, Number(balances[employeeId].remainingDays || 0));
      var actual = Math.min(remaining, wanted[employeeId]);
      balances[employeeId].remainingDays = remaining - actual;
      balances[employeeId].updatedAt = new Date().toISOString();
      if (actual > 0) deductions[employeeId] = actual;
    });
    ledger[periodStart] = deductions;
    changed = true;
  }
  if (changed) {
    // 24か月より前の期間の台帳は整理します。
    var cutoff = shiftDateFromToday_(-24);
    Object.keys(ledger).forEach(function(key) {
      var start = key.split("|")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(start) && start < cutoff) delete ledger[key];
    });
  }
  return { changed: changed, balancesJson: JSON.stringify(balances), ledgerJson: JSON.stringify(ledger) };
}



/* ------------------------------------------------------------
 * シフト管理ツール認証（編集者用ID/パスワード、一般用共通ID/パスワード）
 * 初回のみScript Propertiesへ SHIFT_ADMIN_LOGIN_ID と
 * SHIFT_ADMIN_SETUP_PASSWORD を登録し、configureShiftAdmin()を実行します。
 * ------------------------------------------------------------ */
function shiftAuthHash(value, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + ":" + String(value), Utilities.Charset.UTF_8);
  return bytes.map(function(b) { var n = b < 0 ? b + 256 : b; return ("0" + n.toString(16)).slice(-2); }).join("");
}



/** 導入の自己診断：GASエディタでこの関数を実行すると、設定の抜けとNotionへのつながりを「実行ログ」に一覧で出します。値（キー・パスワード）は表示しません。何度実行しても安全です。 */
function checkShiftSetup() {
  var p = PropertiesService.getScriptProperties();
  var lines = [];
  var ng = 0;
  function mark(ok, label, note) { if (!ok) ng++; lines.push((ok ? "OK   " : "NG   ") + label + (note ? "  … " + note : "")); }
  ["NOTION_API_KEY", "NOTION_SHIFT_DATABASE_ID", "NOTION_SHIFT_REQUEST_DATABASE_ID", "NOTION_STORE_DATABASE_ID", "STORE_ID", "SHIFT_API_KEY"].forEach(function(key) {
    mark(!!p.getProperty(key), key + "（スクリプトプロパティ）", p.getProperty(key) ? "" : "未設定です");
  });
  var keyValue = p.getProperty("SHIFT_API_KEY") || "";
  if (keyValue) mark(keyValue.length >= 10 && !/^\d+$/.test(keyValue) && !/^[a-zA-Z]+$/.test(keyValue), "SHIFT_API_KEY（強さ）", "10文字以上で、英字と数字をまぜてください（短い・数字だけ・英字だけは、推測されやすいためNG）");
  mark(!!p.getProperty("SHIFT_ADMIN_PASSWORD_HASH"), "管理者ログイン", p.getProperty("SHIFT_ADMIN_PASSWORD_HASH") ? "" : "configureShiftAdmin() を実行してください");
  mark(!!p.getProperty("SHIFT_EMPLOYEE_PASSWORD_HASH"), "従業員ログイン", p.getProperty("SHIFT_EMPLOYEE_PASSWORD_HASH") ? "" : "configureShiftEmployeeLogin() を実行してください");
  mark(!!p.getProperty("SHIFT_EMPLOYEE_MASTER_JSON"), "最初の操作員", p.getProperty("SHIFT_EMPLOYEE_MASTER_JSON") ? "" : "initializeShiftOperator() を実行してください");
  var apiKey = p.getProperty("NOTION_API_KEY");
  if (apiKey) {
    [["NOTION_SHIFT_DATABASE_ID", "シフト管理DB"], ["NOTION_SHIFT_REQUEST_DATABASE_ID", "シフト希望届"], ["NOTION_STORE_DATABASE_ID", "店舗設定DB"]].forEach(function(pair) {
      var id = p.getProperty(pair[0]);
      if (!id) return;
      try { requestNotion(apiKey, "https://api.notion.com/v1/databases/" + id, "get", null); mark(true, pair[1] + " にNotionからつながる"); }
      catch (e) { mark(false, pair[1] + " にNotionからつながる", "つながりません。インテグレーションをこのDBに追加したか、IDが合っているか確認してください"); }
    });
  }
  var summary = (ng === 0 ? "【すべてOK】導入の設定は整っています。" : "【要確認 " + ng + "件】NGの行を直して、もう一度実行してください。") + "\n" + lines.join("\n");
  Logger.log(summary);
  return summary;
}

function configureShiftAdmin() {
  var p = PropertiesService.getScriptProperties();
  var loginId = p.getProperty("SHIFT_ADMIN_LOGIN_ID");
  var password = p.getProperty("SHIFT_ADMIN_SETUP_PASSWORD");
  if (!loginId || !password) throw new Error("SHIFT_ADMIN_LOGIN_ID と SHIFT_ADMIN_SETUP_PASSWORD を設定してください。");
  var salt = Utilities.getUuid();
  p.setProperties({ SHIFT_ADMIN_SALT: salt, SHIFT_ADMIN_PASSWORD_HASH: shiftAuthHash(password, salt) });
  p.deleteProperty("SHIFT_ADMIN_SETUP_PASSWORD");
  return "管理者ログインを設定しました。平文パスワードは削除済みです。";
}



function shiftSessionPropertyKey(token) {
  return "SHIFT_SESSION_" + shiftAuthHash(token, "session").slice(0, 40);
}



function createShiftSession(role, employeeName, employeeId) {
  // 全セッションを1個のJSONへ追記する方式は、同時ログイン時の競合と
  // Script Propertiesの1値サイズ上限に弱いため、1セッション=1プロパティで保存します。
  var p = PropertiesService.getScriptProperties();
  // 期限切れトークンは再アクセスされないこともあるため、ログイン時に掃除する。
  var properties = p.getProperties();
  var now = Date.now();
  var sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
  var sameEmployee = [];
  Object.keys(properties).forEach(function(key) {
    if (key.indexOf("SHIFT_SESSION_") !== 0) return;
    var session;
    try { session = JSON.parse(properties[key]); } catch (_) {}
    if (!session || Number(session.expiresAtMs) <= now) { p.deleteProperty(key); return; }
    if (employeeId && session.employeeId === employeeId) {
      sameEmployee.push({ key: key, createdAt: Number(session.createdAt) || (Number(session.expiresAtMs) - sessionLifetimeMs) || 0 });
    }
  });
  // 同じ人が多数の端末でログインした場合は、新しい分を含めて5件までにし、古いものから削除する。
  if (sameEmployee.length > 4) {
    sameEmployee.sort(function(a, b) { return a.createdAt - b.createdAt; });
    sameEmployee.slice(0, sameEmployee.length - 4).forEach(function(entry) { p.deleteProperty(entry.key); });
  }
  var token = Utilities.getUuid() + Utilities.getUuid();
  var expiresAtMs = now + sessionLifetimeMs;
  var session = { role: role, employeeName: employeeName || "", employeeId: employeeId || "", createdAt: now, expiresAtMs: expiresAtMs };
  p.setProperty(shiftSessionPropertyKey(token), JSON.stringify(session));
  return { token: token, role: role, employeeName: employeeName || undefined, employeeId: employeeId || undefined, expiresAt: new Date(expiresAtMs).toISOString() };
}



function requireShiftSession(token, role) {
  var safeToken = sanitizeText(token, 200);
  if (!safeToken) throw new Error("ログインの有効期限が切れました。もう一度ログインしてください。");
  var p = PropertiesService.getScriptProperties();
  var key = shiftSessionPropertyKey(safeToken);
  var raw = p.getProperty(key);
  var session = null;
  try { session = raw ? JSON.parse(raw) : null; } catch (_) { session = null; }
  var roleAllowed = !role || session && (session.role === role || (role === "employee" && session.role === "admin"));
  if (!session || !roleAllowed || Number(session.expiresAtMs) <= Date.now()) {
    if (raw) p.deleteProperty(key);
    throw new Error("ログインの有効期限が切れました。もう一度ログインしてください。");
  }
  return session;
}



function appendShiftAudit(data, action, target, beforeValue, afterValue) {
  try {
    var session = requireShiftSession(data.sessionToken);
    withShiftLock_(function() {
      var p = PropertiesService.getScriptProperties();
      var items = [];
      try { items = JSON.parse(p.getProperty("SHIFT_AUDIT_LOG_JSON") || "[]"); } catch (_) { items = []; }
      items.push({ id: Utilities.getUuid(), at: new Date().toISOString(), operatorId: session.employeeId || "", operatorName: session.employeeName || "", role: session.role, action: action, target: sanitizeText(target, 200), before: beforeValue || null, after: afterValue || null });
      if (items.length > 500) items = items.slice(items.length - 500);
      // Script Propertiesの1値9KB上限に収まるよう古い記録から整理する。
      var json = JSON.stringify(items);
      while (items.length > 1 && shiftByteLength_(json) > 8000) {
        items.shift();
        json = JSON.stringify(items);
      }
      if (shiftByteLength_(json) > 8000) {
        items[0].before = "サイズ上限により省略";
        items[0].after = "サイズ上限により省略";
        json = JSON.stringify(items);
      }
      if (shiftByteLength_(json) > 8000) throw new Error("監査ログのサイズが上限を超えました。");
      safeSetProperty_("SHIFT_AUDIT_LOG_JSON", json);
    });
  } catch (error) { console.error("監査ログ保存失敗: " + error); }
}



function readShiftEmployeeMaster() {
  var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_EMPLOYEE_MASTER_JSON");
  try { return raw ? JSON.parse(raw) : []; } catch (_) { return []; }
}



function getShiftLoginEmployees() {
  try {
    var pinProps = PropertiesService.getScriptProperties().getProperties();
    var employees = normalizeShiftEmployeeMaster(readShiftEmployeeMaster()).filter(function(item) { var label = item.displayName || item.name || ""; return item.active && !/^従業員[A-EＡ-Ｅ]$/.test(label); }).map(function(item) { return { id: item.id, name: item.name, displayName: item.displayName, active: item.active, hasPin: !!pinProps[shiftPinPropertyKey_(item.id)] }; });
    return createJsonDataResponse({ success: true, employees: employees });
  } catch (error) { return createJsonResponse(false, "操作員一覧を取得できませんでした。"); }
}



function normalizeShiftEmployeeMaster(items, rolesOverride) {
  var roles = Array.isArray(rolesOverride) ? rolesOverride : readShiftRoleMaster();
  // 【重要メモ】従業員は最大50人まで。さらに従業員マスターは1つのScript Property（上限9KB）に保存しており、
  // 約45人前後で容量上限に近づく恐れがある。大規模店舗へ広げる際は分割保存か別保存先へ移行すること。
  return (Array.isArray(items) ? items : []).slice(0, 50).map(function(item, index) {
    var selected = roles.filter(function(role) { return role.id === item.roleId || role.name === item.role; })[0];
    return {
      id: sanitizeText(item.id, 100).trim() || Utilities.getUuid(),
      name: sanitizeText(item.name, 100).trim(),
      displayName: sanitizeText(item.displayName, 100).trim() || sanitizeText(item.name, 100).trim(),
      displayOrder: index + 1,
      active: item.active !== false,
      aliases: (Array.isArray(item.aliases) ? item.aliases : []).slice(0, 20).map(function(name) { return sanitizeText(name, 100).trim(); }).filter(Boolean)
      ,roleId: selected ? selected.id : "", role: selected ? selected.name : ""
    };
  }).filter(function(item) { return item.name || !item.active; });
}

function readShiftRoleMaster() {
  var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_ROLE_MASTER_JSON");
  try { if (raw) return JSON.parse(raw); } catch (_) {}
  return [{ id: "manager", name: "店長" }, { id: "clerk", name: "事務" }, { id: "staff", name: "スタッフ" }];
}

function getShiftRoleMaster(data) {
  try { requireShiftSession(data.sessionToken); return createJsonDataResponse({ success: true, roles: readShiftRoleMaster() }); }
  catch (error) { return createJsonResponse(false, error.message || "役職を取得できませんでした。"); }
}

function saveShiftRoleMaster(data) {
  try {
    requireShiftSession(data.sessionToken, "admin");
    verifyShiftApiKey(data.shiftApiKey);
    var source = Array.isArray(data.roles) ? data.roles : [];
    if (!source.length) throw new Error("役職を1件以上登録してください。");
    var ids = {}, names = {};
    var roles = source.map(function(role) {
      var id = sanitizeText(role.id, 80).trim(), name = sanitizeText(role.name, 50).trim();
      if (!id || !name || ids[id] || names[name]) throw new Error("役職名とIDは重複せず入力してください。");
      ids[id] = true; names[name] = true;
      return { id: id, name: name };
    });
    return withShiftLock_(function() {
      var before = readShiftRoleMaster();
      // 役職と従業員の両方を先に計算し、サイズを確認してから書き込みます（片方だけ保存される状態を防ぐ）。
      var employees = normalizeShiftEmployeeMaster(readShiftEmployeeMaster(), roles).map(function(item) {
        var current = roles.filter(function(role) { return role.id === item.roleId; })[0];
        item.role = current ? current.name : "";
        return item;
      });
      var rolesJson = JSON.stringify(roles), employeesJson = JSON.stringify(employees);
      assertShiftPropertySize_(rolesJson);
      assertShiftPropertySize_(employeesJson);
      var p = PropertiesService.getScriptProperties();
      p.setProperty("SHIFT_ROLE_MASTER_JSON", rolesJson);
      p.setProperty("SHIFT_EMPLOYEE_MASTER_JSON", employeesJson);
      appendShiftAudit(data, "役職マスタ保存", "SHIFT_ROLE_MASTER", before, roles);
      return createJsonDataResponse({ success: true, roles: roles, employees: employees, revision: shiftEmployeeMasterRevision_() });
    });
  } catch (error) { return createJsonResponse(false, error.message || "役職を保存できませんでした。"); }
}

function getShiftHomeLayout(data) {
  try {
    requireShiftSession(data.sessionToken);
    var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_HOME_LAYOUT_JSON");
    return createJsonDataResponse({ success: true, layout: raw ? JSON.parse(raw) : { visible: true, columns: [["manager", "clerk"], ["staff"]] } });
  } catch (error) { return createJsonResponse(false, error.message || "ホーム表示設定を取得できませんでした。"); }
}

function saveShiftHomeLayout(data) {
  try {
    requireShiftSession(data.sessionToken, "admin"); verifyShiftApiKey(data.shiftApiKey);
    var source = data.layout || {}, roles = readShiftRoleMaster(), ids = {};
    roles.forEach(function(role) { ids[role.id] = true; });
    var columns = (Array.isArray(source.columns) ? source.columns : []).slice(0, 2).map(function(column) {
      return (Array.isArray(column) ? column : []).map(function(id) { return sanitizeText(id, 80); }).filter(function(id) { return ids[id]; });
    });
    while (columns.length < 2) columns.push([]);
    var layout = { visible: source.visible !== false, columns: columns };
    return withShiftLock_(function() {
      safeSetProperty_("SHIFT_HOME_LAYOUT_JSON", JSON.stringify(layout));
      appendShiftAudit(data, "ホーム出勤一覧設定", "SHIFT_HOME_LAYOUT", null, layout);
      return createJsonDataResponse({ success: true, layout: layout });
    });
  } catch (error) { return createJsonResponse(false, error.message || "ホーム表示設定を保存できませんでした。"); }
}

function readShiftAdminNotices() {
  var p = PropertiesService.getScriptProperties();
  var ids = JSON.parse(p.getProperty("SHIFT_ADMIN_NOTICE_IDS") || "[]");
  return ids.map(function(id) {
    try { return JSON.parse(p.getProperty("SHIFT_ADMIN_NOTICE_" + id) || "null"); } catch (_) { return null; }
  }).filter(function(item) { return !!item; });
}
function getShiftAdminNotices(data) {
  try {
    var session = requireShiftSession(data.sessionToken);
    var notices = readShiftAdminNotices().filter(function(item) {
      return session.role === "admin" || item.visibility === "all" ||
        (session.employeeId && item.employeeIds.indexOf(session.employeeId) !== -1);
    });
    return createJsonDataResponse({ success: true, notices: notices });
  } catch (error) { return createJsonResponse(false, error.message || "お知らせを取得できませんでした。"); }
}
function getShiftAdminNoticeVisibility(data) {
  try {
    requireShiftSession(data.sessionToken);
    return createJsonDataResponse({ success: true, visibility: PropertiesService.getScriptProperties().getProperty("SHIFT_ADMIN_NOTICE_VISIBILITY") || "all" });
  } catch (error) { return createJsonResponse(false, error.message || "公開設定を取得できませんでした。"); }
}
function saveShiftAdminNoticeVisibility(data) {
  try {
    requireShiftSession(data.sessionToken, "admin"); verifyShiftApiKey(data.shiftApiKey);
    if (data.visibility !== "all" && data.visibility !== "selected") throw new Error("公開範囲を選んでください。");
    return withShiftLock_(function() {
      PropertiesService.getScriptProperties().setProperty("SHIFT_ADMIN_NOTICE_VISIBILITY", data.visibility);
      return createJsonDataResponse({ success: true, visibility: data.visibility });
    });
  } catch (error) { return createJsonResponse(false, error.message || "公開設定を保存できませんでした。"); }
}
function saveShiftAdminNotice(data) {
  try {
    requireShiftSession(data.sessionToken, "admin"); verifyShiftApiKey(data.shiftApiKey);
    var text = sanitizeText(data.text, 1200).trim();
    if (!text) throw new Error("お知らせ本文を入力してください。");
    var visibility = data.visibility === "selected" ? "selected" : "all";
    var allowed = {};
    readShiftEmployeeMaster().forEach(function(item) { if (item.active) allowed[item.id] = true; });
    var ids = (Array.isArray(data.employeeIds) ? data.employeeIds : []).map(function(id) { return sanitizeText(id, 100); }).filter(function(id) { return allowed[id]; });
    if (visibility === "selected" && !ids.length) throw new Error("対象の従業員を選んでください。");
    var lock = shiftLockHandle_(); lock.waitLock(10000);
    try {
      var p = PropertiesService.getScriptProperties();
      var index = JSON.parse(p.getProperty("SHIFT_ADMIN_NOTICE_IDS") || "[]");
      if (index.length >= 100) throw new Error("お知らせは100件までです。不要なものを削除してください。");
      var id = Utilities.getUuid();
      var item = { id: id, text: text, visibility: visibility, employeeIds: visibility === "all" ? [] : ids, createdAt: new Date().toISOString() };
      var itemJson = JSON.stringify(item), indexJson = JSON.stringify([id].concat(index));
      assertShiftPropertySize_(itemJson);
      assertShiftPropertySize_(indexJson);
      p.setProperty("SHIFT_ADMIN_NOTICE_" + id, itemJson);
      p.setProperty("SHIFT_ADMIN_NOTICE_IDS", indexJson);
      return createJsonDataResponse({ success: true, notice: item });
    } finally { lock.releaseLock(); }
  } catch (error) { return createJsonResponse(false, error.message || "お知らせを保存できませんでした。"); }
}
function deleteShiftAdminNotice(data) {
  try {
    requireShiftSession(data.sessionToken, "admin"); verifyShiftApiKey(data.shiftApiKey);
    var id = sanitizeText(data.id, 100);
    var lock = shiftLockHandle_(); lock.waitLock(10000);
    try {
      var p = PropertiesService.getScriptProperties();
      var index = JSON.parse(p.getProperty("SHIFT_ADMIN_NOTICE_IDS") || "[]");
      if (index.indexOf(id) === -1) throw new Error("対象のお知らせがありません。");
      safeSetProperty_("SHIFT_ADMIN_NOTICE_IDS", JSON.stringify(index.filter(function(item) { return item !== id; })));
      p.deleteProperty("SHIFT_ADMIN_NOTICE_" + id);
      return createJsonDataResponse({ success: true });
    } finally { lock.releaseLock(); }
  } catch (error) { return createJsonResponse(false, error.message || "お知らせを削除できませんでした。"); }
}



/* ------------------------------------------------------------
 * 店舗共通設定（店舗名・ホームへの表示）
 * ------------------------------------------------------------ */
function readShiftStoreSettings_() {
  var settings = { storeName: "", showStoreNameOnHome: false };
  try {
    var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_STORE_SETTINGS_JSON");
    var parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      settings.storeName = String(parsed.storeName || "").slice(0, 60);
      settings.showStoreNameOnHome = parsed.showStoreNameOnHome === true;
    }
  } catch (_) {}
  return settings;
}

function getShiftStoreSettings(data) {
  try {
    requireShiftSession(data.sessionToken);
    return createJsonDataResponse({ success: true, settings: readShiftStoreSettings_() });
  } catch (error) { return createJsonResponse(false, error.message || "店舗設定を取得できませんでした。"); }
}

function saveShiftStoreSettings(data) {
  try {
    requireShiftSession(data.sessionToken, "admin");
    verifyShiftApiKey(data.shiftApiKey);
    var input = data.settings || {};
    var storeName = sanitizeText(input.storeName, 60).replace(/[\r\n\t]+/g, " ").trim();
    if (typeof input.showStoreNameOnHome !== "boolean") throw new Error("店舗名の表示設定が正しくありません。画面を読み込み直してください。");
    var settings = { storeName: storeName, showStoreNameOnHome: input.showStoreNameOnHome };
    return withShiftLock_(function() {
      var before = readShiftStoreSettings_();
      safeSetProperty_("SHIFT_STORE_SETTINGS_JSON", JSON.stringify(settings));
      appendShiftAudit(data, "店舗設定保存", "SHIFT_STORE_SETTINGS", before, settings);
      return createJsonDataResponse({ success: true, settings: settings });
    });
  } catch (error) { return createJsonResponse(false, error.message || "店舗設定を保存できませんでした。"); }
}

/** 従業員マスタの「版」。他の端末が先に保存していたら、古い画面からの上書きを止めるために使います。 */
function shiftEmployeeMasterRevision_() {
  var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_EMPLOYEE_MASTER_JSON") || "";
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length < 2 ? "0" + v : v; }).join("");
}

function getShiftEmployeeMaster(data) {
  try {
    requireShiftSession(data.sessionToken);
    // Reading must never register names from a browser cache in a new store.
    var master = normalizeShiftEmployeeMaster(readShiftEmployeeMaster());
    return createJsonDataResponse({ success: true, employees: master, revision: shiftEmployeeMasterRevision_() });
  } catch (error) { return createJsonResponse(false, error.message || "従業員マスターを取得できませんでした。"); }
}



function saveShiftEmployeeMaster(data) {
  try {
    requireShiftSession(data.sessionToken, "admin");
    var master = normalizeShiftEmployeeMaster(data.employees);
    var displayNames = {};
    master.filter(function(item) { return item.active; }).forEach(function(item) {
      if (!item.name || !item.displayName) throw new Error("氏名と表示名を入力してください。");
      if (displayNames[item.displayName]) throw new Error("同じ表示名は登録できません。");
      displayNames[item.displayName] = true;
    });
    return withShiftLock_(function() {
      // 古い画面の内容で、他の端末が保存した最新の登録を上書きしないための確認です。
      if (!data.revision || String(data.revision) !== shiftEmployeeMasterRevision_()) {
        throw new Error("他の端末で従業員が更新されています。画面を開き直して、最新の状態から変更してください。（今回の変更は保存されていません）");
      }
      var before = readShiftEmployeeMaster();
      safeSetProperty_("SHIFT_EMPLOYEE_MASTER_JSON", JSON.stringify(master));
      appendShiftAudit(data, "従業員マスター保存", "SHIFT_EMPLOYEE_MASTER", before, master);
      return createJsonDataResponse({ success: true, employees: master, revision: shiftEmployeeMasterRevision_() });
    });
  } catch (error) { return createJsonResponse(false, error.message || "従業員マスターを保存できませんでした。"); }
}



function getShiftCycleMaster(data) {
  try {
    requireShiftSession(data.sessionToken);
    var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_CYCLE_MASTER_JSON");
    var master = null;
    try { master = raw ? JSON.parse(raw) : null; } catch (_) { master = null; }
    return createJsonDataResponse({ success: true, master: master });
  } catch (error) { return createJsonResponse(false, error.message || "勤務パターンマスターを取得できませんでした。"); }
}



function saveShiftCycleMaster(data) {
  try {
    requireShiftSession(data.sessionToken, "admin");
    var master = data.master;
    if (!master || typeof master !== "object") throw new Error("勤務パターンマスターが正しくありません。");
    var names = master.names || {};
    var lengths = master.lengths || {};
    var patterns = master.patterns || {};
    var ids = Object.keys(names).slice(0, 30);
    if (!ids.length) throw new Error("勤務パターンは最低1件必要です。");
    var safe = { names: {}, lengths: {}, patterns: {}, assignments: {} };
    ids.forEach(function(id) {
      var length = Math.max(1, Math.min(4, Number(lengths[id]) || 1));
      safe.names[id] = sanitizeText(names[id], 100).trim() || ("パターン" + id);
      safe.lengths[id] = length;
      var pattern = Array.isArray(patterns[id]) ? patterns[id].slice(0, 7) : [];
      safe.patterns[id] = pattern.map(function(day) {
        return {
          week1: sanitizeText(day.week1, 100), week2: sanitizeText(day.week2, 100),
          week3: sanitizeText(day.week3, 100), week4: sanitizeText(day.week4, 100)
        };
      });
      while (safe.patterns[id].length < 7) safe.patterns[id].push({ week1: "休み", week2: "休み", week3: "休み", week4: "休み" });
    });
    var validIds = {};
    ids.forEach(function(id) { validIds[String(id)] = true; });
    var assignments = master.assignments && typeof master.assignments === "object" ? master.assignments : {};
    Object.keys(assignments).slice(0, 100).forEach(function(employeeId) {
      var assignment = assignments[employeeId] || {};
      var cycleType = String(Number(assignment.cycleType));
      var anchorDate = sanitizeDateValue(assignment.anchorDate);
      if (validIds[cycleType] && anchorDate) safe.assignments[sanitizeText(employeeId, 100)] = { cycleType: Number(cycleType), anchorDate: anchorDate };
    });
    return withShiftLock_(function() {
      var beforeRaw = PropertiesService.getScriptProperties().getProperty("SHIFT_CYCLE_MASTER_JSON") || "";
      safeSetProperty_("SHIFT_CYCLE_MASTER_JSON", JSON.stringify(safe));
      appendShiftAudit(data, "勤務パターンマスター保存", "SHIFT_CYCLE_MASTER", beforeRaw, safe);
      return createJsonDataResponse({ success: true, master: safe });
    });
  } catch (error) { return createJsonResponse(false, error.message || "勤務パターンマスターを保存できませんでした。"); }
}



/** ログイン失敗の回数制限（同じログインIDで10分間に8回まで）。 */
var SHIFT_LOGIN_MAX_FAILURES_ = 8;
var SHIFT_LOGIN_WINDOW_SECONDS_ = 600;

function shiftLoginThrottleKey_(loginId) {
  return "shift_login_fail_" + shiftAuthHash(String(loginId || "").toLowerCase(), "login-throttle").slice(0, 40);
}

function getShiftLoginCache_() {
  try { return typeof CacheService !== "undefined" ? CacheService.getScriptCache() : null; } catch (_) { return null; }
}

function assertShiftLoginAllowed_(loginId) {
  var cache = getShiftLoginCache_();
  if (!cache) return;
  var count = Number(cache.get(shiftLoginThrottleKey_(loginId)) || 0);
  if (count >= SHIFT_LOGIN_MAX_FAILURES_) throw new Error("ログインに失敗した回数が多すぎます。10分ほど待ってから、もう一度お試しください。");
}

function recordShiftLoginFailure_(loginId) {
  var cache = getShiftLoginCache_();
  if (!cache) return;
  var key = shiftLoginThrottleKey_(loginId);
  cache.put(key, String(Number(cache.get(key) || 0) + 1), SHIFT_LOGIN_WINDOW_SECONDS_);
}

function clearShiftLoginFailures_(loginId) {
  var cache = getShiftLoginCache_();
  if (cache) cache.remove(shiftLoginThrottleKey_(loginId));
}

/** 文字列を先頭から比べる途中で止めずに比較します（処理時間から内容を推測されにくくするため）。 */
function shiftConstantTimeEquals_(a, b) {
  var x = String(a), y = String(b);
  var diff = x.length ^ y.length;
  var length = Math.max(x.length, y.length);
  for (var i = 0; i < length; i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

/** 操作員ごとのPIN（4〜6桁の数字）。他の従業員が名前だけ選んで、なりすますのを防ぎます。
 *  保存するのは「塩＋ハッシュ」だけで、PINそのものは保存しません。 */
var SHIFT_PIN_MAX_FAILURES_ = 5;
var SHIFT_PIN_WINDOW_SECONDS_ = 600;

function isValidShiftPin_(pin) { return /^[0-9]{4,6}$/.test(String(pin == null ? "" : pin)); }

function shiftPinPropertyKey_(operatorId) {
  return "SHIFT_PIN_" + shiftAuthHash(String(operatorId || ""), "pin-key").slice(0, 32);
}

function shiftPinThrottleKey_(operatorId) {
  return "shift_pin_fail_" + shiftAuthHash(String(operatorId || ""), "pin-throttle").slice(0, 40);
}

function assertShiftPinAllowed_(operatorId) {
  var cache = getShiftLoginCache_();
  if (!cache) return;
  if (Number(cache.get(shiftPinThrottleKey_(operatorId)) || 0) >= SHIFT_PIN_MAX_FAILURES_) throw new Error("PINの入力に失敗した回数が多すぎます。10分ほど待ってから、もう一度お試しください。急ぐときは管理者に相談してください。");
}

function recordShiftPinFailure_(operatorId) {
  var cache = getShiftLoginCache_();
  if (!cache) return;
  var key = shiftPinThrottleKey_(operatorId);
  cache.put(key, String(Number(cache.get(key) || 0) + 1), SHIFT_PIN_WINDOW_SECONDS_);
}

function shiftPinHash_(operatorId, pin, salt) { return shiftAuthHash(String(operatorId) + ":" + String(pin), salt); }

/** PINを確かめます。まだ決めていない人は、newPin で初回登録します。失敗すると例外。 */
function verifyOrRegisterShiftPin_(operatorId, pin, newPin) {
  var p = PropertiesService.getScriptProperties();
  var key = shiftPinPropertyKey_(operatorId);
  var raw = p.getProperty(key);
  if (raw) {
    assertShiftPinAllowed_(operatorId);
    var record = {};
    try { record = JSON.parse(raw); } catch (_) { record = {}; }
    if (!isValidShiftPin_(pin) || !record.s || !record.h || !shiftConstantTimeEquals_(shiftPinHash_(operatorId, pin, record.s), record.h)) {
      recordShiftPinFailure_(operatorId);
      throw new Error("PINが違います。忘れたときは管理者にPINのリセットを頼んでください。");
    }
    var cache = getShiftLoginCache_();
    if (cache) cache.remove(shiftPinThrottleKey_(operatorId));
    return;
  }
  if (!isValidShiftPin_(newPin)) throw new Error("PIN_SETUP_REQUIRED:はじめてのログインです。4〜6桁の数字でPINを決めてください。");
  withShiftLock_(function() {
    if (p.getProperty(key)) throw new Error("ほかの端末で先にPINが決められました。もう一度ログインして、そのPINを入れてください。");
    var salt = Utilities.getUuid();
    p.setProperty(key, JSON.stringify({ s: salt, h: shiftPinHash_(operatorId, newPin, salt) }));
  });
}

/** 管理者が、従業員のPINを消します。本人は次のログインで、新しいPINを決め直します。 */
function resetShiftEmployeePin(data) {
  try {
    requireShiftSession(data.sessionToken, "admin"); verifyShiftApiKey(data.shiftApiKey);
    var employeeId = sanitizeText(data.employeeId, 100).trim();
    if (!employeeId) throw new Error("従業員を選んでください。");
    var master = normalizeShiftEmployeeMaster(readShiftEmployeeMaster());
    var target = master.filter(function(item) { return item.id === employeeId; })[0];
    if (!target) throw new Error("従業員マスターに見つかりません。");
    PropertiesService.getScriptProperties().deleteProperty(shiftPinPropertyKey_(employeeId));
    var cache = getShiftLoginCache_();
    if (cache) cache.remove(shiftPinThrottleKey_(employeeId));
    appendShiftAudit(data, "PINリセット", "従業員:" + (target.displayName || target.name), null, null);
    return createJsonDataResponse({ success: true });
  } catch (error) { return createJsonResponse(false, error.message || "PINをリセットできませんでした。"); }
}

function loginShift(data) {
  try {
    var p = PropertiesService.getScriptProperties();
    var loginId = sanitizeText(data.loginId, 100).trim();
    var password = sanitizeText(data.password, 200);
    var operatorId = sanitizeText(data.employeeId, 100).trim();
    var operatorName = sanitizeText(data.employeeName, 100).trim();
    assertShiftLoginAllowed_(loginId);
    if (!operatorId || !operatorName) throw new Error("操作員を選択してください。");

    // 操作員は共有従業員マスターに存在する有効な人だけを許可します。
    var master = normalizeShiftEmployeeMaster(readShiftEmployeeMaster());
    var operator = null;
    for (var i = 0; i < master.length; i++) {
      if (master[i].active && master[i].id === operatorId) { operator = master[i]; break; }
    }
    if (!operator) throw new Error("選択した操作員が従業員マスターに見つかりません。画面を再読み込みしてください。");
    operatorName = operator.displayName || operator.name;

    var adminId = p.getProperty("SHIFT_ADMIN_LOGIN_ID") || "";
    var adminSalt = p.getProperty("SHIFT_ADMIN_SALT") || "";
    var adminHash = p.getProperty("SHIFT_ADMIN_PASSWORD_HASH") || "";
    var employeeId = p.getProperty("SHIFT_EMPLOYEE_LOGIN_ID") || "";
    var employeeSalt = p.getProperty("SHIFT_EMPLOYEE_SALT") || "";
    var employeeHash = p.getProperty("SHIFT_EMPLOYEE_PASSWORD_HASH") || "";

    if (adminId && loginId === adminId) {
      if (!adminSalt || !adminHash) throw new Error("管理者ログインがまだGAS側で初期設定されていません。");
      if (!shiftConstantTimeEquals_(shiftAuthHash(password, adminSalt), adminHash)) { recordShiftLoginFailure_(loginId); throw new Error("ログインIDまたはパスワードが違います。"); }
      verifyOrRegisterShiftPin_(operatorId, data.pin, data.newPin);
      clearShiftLoginFailures_(loginId);
      return createJsonDataResponse({ success: true, session: createShiftSession("admin", operatorName, operatorId) });
    }
    if (employeeId && loginId === employeeId) {
      if (!employeeSalt || !employeeHash) throw new Error("従業員ログインがまだGAS側で初期設定されていません。");
      if (!shiftConstantTimeEquals_(shiftAuthHash(password, employeeSalt), employeeHash)) { recordShiftLoginFailure_(loginId); throw new Error("ログインIDまたはパスワードが違います。"); }
      verifyOrRegisterShiftPin_(operatorId, data.pin, data.newPin);
      clearShiftLoginFailures_(loginId);
      return createJsonDataResponse({ success: true, session: createShiftSession("employee", operatorName, operatorId) });
    }
    recordShiftLoginFailure_(loginId);
    throw new Error("ログインIDまたはパスワードが違います。");
  } catch (error) {
    return createJsonResponse(false, error.message || "ログインに失敗しました。");
  }
}

/** ログアウト：この端末のログイン情報をサーバー側からも削除します。 */
function logoutShift(data) {
  try {
    var token = sanitizeText(data.sessionToken, 200);
    if (token) PropertiesService.getScriptProperties().deleteProperty(shiftSessionPropertyKey(token));
    return createJsonDataResponse({ success: true });
  } catch (error) { return createJsonResponse(false, error.message || "ログアウトできませんでした。"); }
}



function configureShiftEmployeeLogin() {
  var p = PropertiesService.getScriptProperties();
  var loginId = p.getProperty("SHIFT_EMPLOYEE_LOGIN_ID");
  var password = p.getProperty("SHIFT_EMPLOYEE_SETUP_PASSWORD");
  if (!loginId || !password) throw new Error("SHIFT_EMPLOYEE_LOGIN_ID と SHIFT_EMPLOYEE_SETUP_PASSWORD を設定してください。");
  var salt = Utilities.getUuid();
  p.setProperties({ SHIFT_EMPLOYEE_SALT: salt, SHIFT_EMPLOYEE_PASSWORD_HASH: shiftAuthHash(password, salt) });
  p.deleteProperty("SHIFT_EMPLOYEE_SETUP_PASSWORD");
  return "従業員ログインを設定しました。平文パスワードは削除済みです。";
}



function getShiftPaidLeaveBalance(data) {
  try {
    var session = requireShiftSession(data.sessionToken);
    var employeeId = sanitizeText(data.employeeId, 100).trim();
    if (!employeeId || (session.role !== "admin" && session.employeeId !== employeeId)) throw new Error("本人の有給情報だけを表示できます。");
    var values = {};
    try { values = JSON.parse(PropertiesService.getScriptProperties().getProperty("SHIFT_PAID_LEAVE_BALANCES_JSON") || "{}"); } catch (_) { values = {}; }
    return createJsonDataResponse({ success: true, balance: values[employeeId] || null });
  } catch (error) { return createJsonResponse(false, error.message || "有給情報を取得できませんでした。"); }
}



function getShiftAutoDraftSettings(data) {
  try { requireShiftSession(data.sessionToken, "admin"); var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_AUTO_DRAFT_SETTINGS_JSON"); return createJsonDataResponse({ success: true, settings: raw ? JSON.parse(raw) : { enabled: false, started: false, horizonMonths: 3 } }); }
  catch (error) { return createJsonResponse(false, error.message || "自動作成設定を取得できませんでした。"); }
}



function saveShiftAutoDraftSettings(data) {
  try { requireShiftSession(data.sessionToken, "admin"); verifyShiftApiKey(data.shiftApiKey); var input = data.settings || {}; var safe = { enabled: Boolean(input.enabled), started: Boolean(input.enabled && input.started), horizonMonths: 3, lastRunAt: input.lastRunAt ? sanitizeText(input.lastRunAt, 50) : "" }; return withShiftLock_(function() { PropertiesService.getScriptProperties().setProperty("SHIFT_AUTO_DRAFT_SETTINGS_JSON", JSON.stringify(safe)); appendShiftAudit(data, "シフト案自動作成設定", "SHIFT_AUTO_DRAFT_SETTINGS", null, safe); return createJsonDataResponse({ success: true, settings: safe }); }); }
  catch (error) { return createJsonResponse(false, error.message || "自動作成設定を保存できませんでした。"); }
}



function saveShiftPaidLeaveBalance(data) {
  var lock = shiftLockHandle_();
  try {
    if (!lock.tryLock(10000)) throw new Error("別の保存処理を実行中です。");
    var session = requireShiftSession(data.sessionToken);
    var input = data.balance || {};
    var employeeId = sanitizeText(input.employeeId, 100).trim();
    if (!employeeId || (session.role !== "admin" && session.employeeId !== employeeId)) throw new Error("本人の有給情報だけを変更できます。");
    var values = {};
    var p = PropertiesService.getScriptProperties();
    try { values = JSON.parse(p.getProperty("SHIFT_PAID_LEAVE_BALANCES_JSON") || "{}"); } catch (_) { values = {}; }
    var safe = { employeeId: employeeId, enabled: Boolean(input.enabled), remainingDays: Math.max(0, Number(input.remainingDays) || 0), renewalDate: sanitizeDateValue(input.renewalDate) || "", grantDays: Math.max(0, Number(input.grantDays) || 0), updatedAt: new Date().toISOString() };
    var before = values[employeeId] || null;
    values[employeeId] = safe;
    safeSetProperty_("SHIFT_PAID_LEAVE_BALANCES_JSON", JSON.stringify(values));
    appendShiftAudit(data, "有給情報更新", employeeId, before, safe);
    return createJsonDataResponse({ success: true, balance: safe });
  } catch (error) { return createJsonResponse(false, error.message || "有給情報を保存できませんでした。"); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}



/* ------------------------------------------------------------
 * シフト希望申請（試作版）
 * 月単位でScript Propertiesへ保存し、全端末から共有します。
 * 本人確認は未実装。承認・却下だけSHIFT_API_KEYを必須にします。
 * ------------------------------------------------------------ */
function getShiftLeaveRequestPropertyKey(periodStart) {
  var safeStart = sanitizeDateValue(periodStart);
  if (!safeStart) throw new Error("対象期間が正しくありません。");
  return "SHIFT_LEAVE_REQUESTS_" + safeStart;
}



function readShiftLeaveRequestStore(periodStart) {
  var raw = PropertiesService.getScriptProperties().getProperty(getShiftLeaveRequestPropertyKey(periodStart));
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}



function writeShiftLeaveRequestStore(periodStart, requests) {
  writeShiftLeaveRequestStoreByKey_(getShiftLeaveRequestPropertyKey(periodStart), requests);
}



/**
 * 1期間分の希望をScript Property（1値9KB上限）へ保存する共通処理。
 * 8000バイトを超えそうなときだけ「取消」済みの希望を整理し、それでも8500バイトを超える場合は保存しません。
 */
function writeShiftLeaveRequestStoreByKey_(key, requests) {
  if (requests.length > 100) throw new Error("この期間の希望件数が上限を超えています。");
  var json = JSON.stringify(requests);
  if (shiftByteLength_(json) > 8000) {
    var trimmed = requests.filter(function(item) { return item.status !== "取消"; });
    if (trimmed.length !== requests.length) {
      requests.length = 0;
      trimmed.forEach(function(item) { requests.push(item); });
      json = JSON.stringify(requests);
    }
  }
  if (shiftByteLength_(json) > 8500) throw new Error("この期間の希望が上限に達しました。管理者に連絡し、対応済みの希望を整理してください。");
  PropertiesService.getScriptProperties().setProperty(key, json);
}



/** 希望提出の対象期間を確認します（開始日がシフト期間の設定どおりで、前後18か月以内であること）。 */
function assertShiftLeavePeriod_(periodStart) {
  var parts = String(periodStart).split("-").map(Number);
  var settings = readShiftCalendarSettings_();
  if (!parts[2] || parts[2] !== settings.startDay || periodStart < shiftDateFromToday_(-18) || periodStart > shiftDateFromToday_(18)) {
    throw new Error("対象期間が正しくありません。画面を読み込み直してください。");
  }
}



function syncShiftLeaveRequestToNotion(request, isNew) {
  var p = PropertiesService.getScriptProperties();
  var apiKey = p.getProperty("NOTION_API_KEY");
  var databaseId = p.getProperty("NOTION_SHIFT_REQUEST_DATABASE_ID");
  if (!apiKey || !databaseId || !request) return;
  var databaseUrl = "https://api.notion.com/v1/databases/" + databaseId;
  var schemaOk = p.getProperty("SHIFT_REQUEST_SCHEMA_OK") === databaseId;
  var database = schemaOk ? { properties: {} } : requestNotion(apiKey, databaseUrl, "get", null);
  var additions = {};
  var schema = { "申請ID": { rich_text: {} }, "従業員ID": { rich_text: {} }, "氏名": { rich_text: {} }, "希望日": { date: {} }, "対象期間開始": { date: {} }, "対象期間終了": { date: {} }, "希望区分": { select: {} }, "コメント": { rich_text: {} }, "公開範囲": { select: {} }, "状態": { select: {} }, "提出日時": { date: {} }, "更新日時": { date: {} }, "希望開始時間": { rich_text: {} }, "希望終了時間": { rich_text: {} }, "却下理由": { rich_text: {} } };
  if (!schemaOk) {
    Object.keys(schema).forEach(function(name) { if (!database.properties || !database.properties[name]) additions[name] = schema[name]; });
    if (Object.keys(additions).length) requestNotion(apiKey, databaseUrl, "patch", { properties: additions });
    p.setProperty("SHIFT_REQUEST_SCHEMA_OK", databaseId);
  }
  var properties = { "記録名": createTitleProperty((request.date || request.periodStart) + " " + request.employeeName + " " + request.type), "申請ID": createRichTextProperty(request.id), "従業員ID": createRichTextProperty(request.employeeId || ""), "氏名": createRichTextProperty(request.employeeName), "希望日": request.date ? { date: { start: request.date } } : { date: null }, "対象期間開始": { date: { start: request.periodStart } }, "対象期間終了": { date: { start: request.periodEnd } }, "希望区分": { select: { name: request.type } }, "コメント": createRichTextProperty(request.comment || ""), "公開範囲": { select: { name: request.commentVisibility === "editors" ? "編集者のみ" : "全員" } }, "状態": { select: { name: request.status } }, "提出日時": { date: { start: request.submittedAt } }, "更新日時": { date: { start: request.updatedAt } } };
  properties["希望開始時間"] = createRichTextProperty(request.desiredWorkStart || "");
  properties["希望終了時間"] = createRichTextProperty(request.desiredWorkEnd || "");
  properties["却下理由"] = createRichTextProperty(request.rejectionReason || "");
  // 新しく作った申請（isNew）には、Notion側にまだ記録が無いので、探す手間（1回の通信）を省いて作るだけにする。
  var existing = isNew ? [] : queryNotionDatabase(apiKey, databaseId, { filter: { property: "申請ID", rich_text: { equals: request.id } }, page_size: 1 });
  if (existing.length) updateNotionPage(apiKey, existing[0].id, properties); else createNotionPage(apiKey, databaseId, properties);
}



function getShiftLeaveRequests(data) {
  try {
    var periodStart = sanitizeDateValue(data.periodStart);
    var periodEnd = sanitizeDateValue(data.periodEnd);
    if (!periodStart || !periodEnd || periodStart > periodEnd) throw new Error("対象期間が正しくありません。");
    var requests = readShiftLeaveRequestStore(periodStart);
    if (data.shiftApiKey) {
      verifyShiftApiKey(data.shiftApiKey);
    } else if (data.employeeToken) {
      requireShiftSession(data.employeeToken, "employee");
    } else {
      requests = [];
    }
    var viewer = requireShiftSession(data.sessionToken);
    if (viewer.role !== "admin") {
      var correctionVisibility = PropertiesService.getScriptProperties().getProperty("SHIFT_CORRECTION_VISIBILITY_" + getStoreId()) || "all";
      var boardVisibility = "immediate";
      try { boardVisibility = readShiftBoardVisibilityValue(); } catch (visibilityError) { console.error(visibilityError); }
      requests = requests.filter(function(item) {
        var own = viewer.employeeId && item.employeeId === viewer.employeeId;
        if (own) return true;
        if (item.type === "訂正依頼") return correctionVisibility === "all";
        if (boardVisibility === "private") return false;
        if (boardVisibility === "after_approval") return item.status === "承認";
        return true;
      }).map(function(item) {
        if (viewer.employeeId && item.employeeId === viewer.employeeId) return item;
        var visible = Object.assign({}, item);
        delete visible.rejectionReason;
        if (visible.commentVisibility === "editors") visible.comment = "";
        return visible;
      });
    }
    return createJsonDataResponse({ success: true, requests: requests });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "希望申請を取得できませんでした。");
  }
}



function saveShiftLeaveRequest(data) {
  var lock = shiftLockHandle_();
  try {
    if (!lock.tryLock(10000)) throw new Error("別の申請を処理中です。少し待ってください。");
    var session = requireShiftSession(data.employeeToken, "employee");
    var input = data.request || {};
    var employeeName = "";
    var employeeId = sanitizeText(input.employeeId, 100).trim();
    var periodStart = sanitizeDateValue(input.periodStart);
    var periodEnd = sanitizeDateValue(input.periodEnd);
    var dateValue = input.date ? sanitizeDateValue(input.date) : "";
    var type = sanitizeText(input.type, 30);
    var comment = sanitizeText(input.comment, 300);
    var commentVisibility = input.commentVisibility === "editors" ? "editors" : "all";
    var allowedTypes = ["有給希望", "休み希望", "出勤希望", "午前休希望", "午後休希望", "希望なし", "訂正依頼"];
    if (!employeeId || !periodStart || !periodEnd || periodStart > periodEnd) throw new Error("申請内容が正しくありません。");
    if (session.employeeId && session.employeeId !== employeeId) throw new Error("別の従業員として希望を提出することはできません。");
    assertShiftLeavePeriod_(periodStart);
    // 氏名は端末から送られた値ではなく、従業員マスターの登録内容を使います。
    var masterEntry = normalizeShiftEmployeeMaster(readShiftEmployeeMaster()).filter(function(item) { return item.active && item.id === employeeId; })[0];
    if (!masterEntry) throw new Error("従業員マスターに登録されている有効な従業員が見つかりません。画面を読み込み直してください。");
    employeeName = masterEntry.displayName || masterEntry.name;
    if (!employeeName) throw new Error("申請内容が正しくありません。");
    if (allowedTypes.indexOf(type) < 0) throw new Error("希望種別が正しくありません。");
    if (type !== "希望なし" && (!dateValue || dateValue < periodStart || dateValue > periodEnd)) throw new Error("希望日が対象期間外です。");
    if (type === "希望なし") dateValue = "";
    if (type === "訂正依頼") {
      if (!comment.trim()) throw new Error("訂正内容をコメントに入力してください。");
      if (!readShiftPeriodStatusForCorrection(periodStart)) throw new Error("確定シフトの期間だけ訂正依頼を提出できます。");
    } else if (type !== "希望なし" && readShiftPeriodStatusForCorrection(periodStart)) {
      throw new Error("この期間は確定済みです。変更したいときは「訂正依頼」を選んでください。");
    }
    var desiredStart = "", desiredEnd = "";
    if (type === "出勤希望" && (input.desiredWorkStart || input.desiredWorkEnd)) {
      desiredStart = sanitizeText(input.desiredWorkStart || "", 5);
      desiredEnd = sanitizeText(input.desiredWorkEnd || "", 5);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(desiredStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(desiredEnd) || desiredStart >= desiredEnd) throw new Error("希望時間を正しく入力してください。");
    }

    var requests = readShiftLeaveRequestStore(periodStart);
    var now = new Date().toISOString();
    // 本人の希望かどうかはIDで判定します（IDが無い古いデータだけ氏名で判定）。
    var isSameLeaveRequestOwner_ = function(item) { return item.employeeId ? item.employeeId === employeeId : item.employeeName === employeeName; };
    if (type === "希望なし") {
      requests.forEach(function(item) { if (isSameLeaveRequestOwner_(item) && item.status === "申請中") { item.status = "取消"; item.updatedAt = now; } });
    } else {
      requests = requests.filter(function(item) { return !(isSameLeaveRequestOwner_(item) && item.type === "希望なし" && item.status === "申請中"); });
    }
    var isNewRequest = false;
    var existing = requests.find(function(item) { return (item.employeeId === employeeId || (!item.employeeId && item.employeeName === employeeName)) && item.date === dateValue && (item.type === "訂正依頼") === (type === "訂正依頼") && item.status !== "取消"; });
    if (existing) {
      existing.type = type;
      existing.desiredWorkStart = desiredStart;
      existing.desiredWorkEnd = desiredEnd;
      existing.rejectionReason = "";
      existing.comment = comment;
      existing.commentVisibility = commentVisibility;
      existing.status = "申請中";
      existing.updatedAt = now;
    } else {
      isNewRequest = true;
      existing = { id: Utilities.getUuid(), employeeId: employeeId, employeeName: employeeName, date: dateValue, periodStart: periodStart, periodEnd: periodEnd, type: type, comment: comment, commentVisibility: commentVisibility, status: "申請中", submittedAt: now, updatedAt: now, desiredWorkStart: desiredStart, desiredWorkEnd: desiredEnd };
      requests.push(existing);
    }
    writeShiftLeaveRequestStore(periodStart, requests);
    syncShiftLeaveRequestToNotion(existing, isNewRequest);
    appendShiftAudit({ sessionToken: data.employeeToken }, "休み希望提出", existing.id, null, existing);
    return createJsonDataResponse({ success: true, request: existing });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "希望を保存できませんでした。");
  } finally { try { lock.releaseLock(); } catch (_) {} }
}



function findShiftLeaveRequestStore(id) {
  var properties = PropertiesService.getScriptProperties().getProperties();
  var keys = Object.keys(properties).filter(function(key) { return key.indexOf("SHIFT_LEAVE_REQUESTS_") === 0; });
  for (var i = 0; i < keys.length; i++) {
    var items;
    try { items = JSON.parse(properties[keys[i]] || "[]"); } catch (_) { items = []; }
    var found = items.find(function(item) { return item.id === id; });
    if (found) return { key: keys[i], items: items, request: found };
  }
  throw new Error("対象の希望申請が見つかりません。");
}



function cancelShiftLeaveRequest(data) {
  var lock = shiftLockHandle_();
  try {
    if (!lock.tryLock(10000)) throw new Error("別の申請を処理中です。");
    var session = requireShiftSession(data.employeeToken, "employee");
    var store = findShiftLeaveRequestStore(sanitizeText(data.id, 100));
    if (session.role !== "admin" && (!session.employeeId || !store.request.employeeId || session.employeeId !== store.request.employeeId)) throw new Error("本人の希望だけを取り消せます。");
    store.request.status = "取消";
    store.request.updatedAt = new Date().toISOString();
    writeShiftLeaveRequestStoreByKey_(store.key, store.items);
    syncShiftLeaveRequestToNotion(store.request);
    appendShiftAudit({ sessionToken: data.employeeToken }, "休み希望取消", store.request.id, null, store.request);
    return createJsonDataResponse({ success: true, request: store.request });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "希望を取り消せませんでした。");
  } finally { try { lock.releaseLock(); } catch (_) {} }
}



function updateShiftLeaveRequestStatus(data) {
  var lock = shiftLockHandle_();
  try {
    if (!lock.tryLock(10000)) throw new Error("別の処理を実行中です。");
    verifyShiftApiKey(data.shiftApiKey);
    var status = sanitizeText(data.status, 20);
    if (["申請中", "承認", "却下", "取消", "対応済み"].indexOf(status) < 0) throw new Error("状態が正しくありません。");
    var store = findShiftLeaveRequestStore(sanitizeText(data.id, 100));
    if (status === "対応済み" && store.request.type !== "訂正依頼") throw new Error("訂正依頼だけ対応済みにできます。");
    store.request.status = status;
    store.request.rejectionReason = status === "却下" ? sanitizeText(data.rejectionReason || "", 300) : "";
    store.request.updatedAt = new Date().toISOString();
    writeShiftLeaveRequestStoreByKey_(store.key, store.items);
    syncShiftLeaveRequestToNotion(store.request);
    appendShiftAudit(data, "休み希望状態変更", store.request.id, null, store.request);
    return createJsonDataResponse({ success: true, request: store.request });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "希望の状態を更新できませんでした。");
  } finally { try { lock.releaseLock(); } catch (_) {} }
}



/** 管理者が希望申請を削除します。Notion上の対応ページは復元可能なアーカイブにします。 */
function deleteShiftLeaveRequest(data) {
  var lock = shiftLockHandle_();
  try {
    if (!lock.tryLock(10000)) throw new Error("別の処理を実行中です。");
    verifyShiftApiKey(data.shiftApiKey);
    var store = findShiftLeaveRequestStore(sanitizeText(data.id, 100));
    var before = JSON.parse(JSON.stringify(store.request));
    var p = PropertiesService.getScriptProperties();
    var apiKey = p.getProperty("NOTION_API_KEY");
    var databaseId = p.getProperty("NOTION_SHIFT_REQUEST_DATABASE_ID");
    if (apiKey && databaseId) {
      var pages = queryNotionDatabase(apiKey, databaseId, { filter: { property: "申請ID", rich_text: { equals: before.id } }, page_size: 10 });
      pages.forEach(function(page) {
        assertPageBelongsToDatabase(apiKey, page.id, databaseId);
        requestNotion(apiKey, "https://api.notion.com/v1/pages/" + page.id, "patch", { archived: true });
      });
    }
    var remaining = store.items.filter(function(item) { return item.id !== before.id; });
    writeShiftLeaveRequestStoreByKey_(store.key, remaining);
    appendShiftAudit(data, "休み希望削除", before.id, before, null);
    return createJsonDataResponse({ success: true });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "希望を削除できませんでした。");
  } finally { try { lock.releaseLock(); } catch (_) {} }
}



function updateShiftLeaveRequestWorkTime(data) {
  var lock = shiftLockHandle_();
  try {
    if (!lock.tryLock(10000)) throw new Error("別の処理を実行中です。");
    var session = requireShiftSession(data.employeeToken, "employee");
    var store = findShiftLeaveRequestStore(sanitizeText(data.id, 100));
    var item = store.request;
    if (!session.employeeId || !item.employeeId || session.employeeId !== item.employeeId) throw new Error("本人の希望だけを変更できます。");
    if (item.type !== "出勤希望" || item.status !== "申請中") throw new Error("申請中の出勤希望だけを変更できます。");
    var start = sanitizeText(data.desiredWorkStart || "", 5);
    var end = sanitizeText(data.desiredWorkEnd || "", 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) throw new Error("希望時間を正しく入力してください。");
    item.desiredWorkStart = start;
    item.desiredWorkEnd = end;
    item.updatedAt = new Date().toISOString();
    writeShiftLeaveRequestStoreByKey_(store.key, store.items);
    syncShiftLeaveRequestToNotion(item);
    appendShiftAudit({ sessionToken: data.employeeToken }, "出勤希望時間変更", item.id, null, item);
    return createJsonDataResponse({ success: true, request: item });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "希望時間を更新できませんでした。");
  } finally { try { lock.releaseLock(); } catch (_) {} }
}



/** 店舗ごとの休診・当番日ルール。本人認証導入まではシフト画面から共有編集できる試作運用です。 */
function getShiftSpecialDayRules() {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty("SHIFT_SPECIAL_DAY_RULES_JSON");
    var rules = raw ? JSON.parse(raw) : [];
    var migrated = props.getProperty("SHIFT_BAND_V3_MIGRATED") === "1";
    if (!migrated || raw === null) {
      // 初期値（日曜・祝日が赤）。初期化のあとも、保存されるまではこの初期値を返す。
      // 管理者が「定休日なし」で保存した場合は "[]" が保存されるので、初期値には戻らない。
      rules = [
        { id: "band-v3:closed-0", name: "日曜", color: "red", behavior: "information", enabled: true, mode: "recurring", weekday: 0, weeks: [1,2,3,4,5], dates: [], showName: true, restMode: "none", restEmployeeIds: [] },
        { id: "band-v3:holiday", name: "祝日", color: "red", behavior: "information", enabled: true, mode: "annual", weekday: 0, weeks: [], dates: [], showName: true, restMode: "none", restEmployeeIds: [] }
      ];
      if (!migrated) {
        props.setProperty("SHIFT_SPECIAL_DAY_RULES_JSON", JSON.stringify(rules));
        props.setProperty("SHIFT_BAND_V3_MIGRATED", "1");
      }
    }
    return createJsonDataResponse({ success: true, rules: rules });
  } catch (error) { return createJsonResponse(false, error.message || "特殊日設定を取得できませんでした。"); }
}



function saveShiftSpecialDayRules(data) {
  var lock = shiftLockHandle_();
  try {
    verifyShiftApiKey(data.shiftApiKey);
    if (!lock.tryLock(10000)) throw new Error("別の保存を処理中です。");
    var source = Array.isArray(data.rules) ? data.rules : [];
    if (source.length > 30) throw new Error("特殊日ルールは30件までです。");
    var colors = ["red", "blue", "green", "amber", "purple", "gray"];
    var activeEmployeeIds = {};
    readShiftEmployeeMaster().forEach(function(item) { if (item.active) activeEmployeeIds[item.id] = true; });
    var rules = source.filter(function(rule) { return /^band-v3:/.test(String(rule.id || "")); }).map(function(rule) {
      var dates = Array.isArray(rule.dates) ? rule.dates.map(function(value) { return sanitizeText(value, 10); }).filter(function(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }).slice(0, 366) : [];
      var monthDays = Array.isArray(rule.monthDays) ? rule.monthDays.map(function(value) { return sanitizeText(value, 5); }).filter(function(value) { return /^\d{2}-\d{2}$/.test(value); }).slice(0, 366) : [];
      var weeks = Array.isArray(rule.weeks) ? rule.weeks.map(Number).filter(function(value) { return value >= 1 && value <= 5; }) : [];
      var restMode = ["all", "selected"].indexOf(rule.restMode) >= 0 ? rule.restMode : "none";
      var restEmployeeIds = (Array.isArray(rule.restEmployeeIds) ? rule.restEmployeeIds : []).map(function(id) { return sanitizeText(id, 100); }).filter(function(id) { return activeEmployeeIds[id]; });
      if (restMode === "selected" && !restEmployeeIds.length) throw new Error("休みにする従業員を選んでください。");
      var monthDates = Array.isArray(rule.monthDates) ? rule.monthDates.map(function(value) { return Math.floor(Number(value)); }).filter(function(value, index, list) { return value >= 1 && value <= 31 && list.indexOf(value) === index; }).sort(function(a, b) { return a - b; }) : [];
      return { id: sanitizeText(rule.id, 100), name: sanitizeText(rule.name, 50), color: colors.indexOf(rule.color) >= 0 ? rule.color : "gray", behavior: "information", enabled: rule.enabled !== false, mode: ["recurring", "yearly", "monthly"].indexOf(rule.mode) >= 0 ? rule.mode : "annual", weekday: Math.max(0, Math.min(6, Number(rule.weekday) || 0)), weeks: weeks, dates: dates, monthDays: monthDays, monthDates: monthDates, showName: rule.showName !== false, restMode: restMode, restEmployeeIds: restMode === "selected" ? restEmployeeIds : [] };
    }).filter(function(rule) { return !!rule.name; });
    safeSetProperty_("SHIFT_SPECIAL_DAY_RULES_JSON", JSON.stringify(rules));
    PropertiesService.getScriptProperties().setProperty("SHIFT_BAND_V3_MIGRATED", "1");
    return createJsonDataResponse({ success: true, rules: rules });
  } catch (error) { return createJsonResponse(false, error.message || "特殊日設定を保存できませんでした。"); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}



/** 人数・連勤・個人ごとの条件。シフト表で「足りない日」「連勤」などの警告を出すための基準です。 */
function normalizeShiftStaffingRules_(input) {
  var src = input || {};
  var days = function(list) {
    var out = [0, 0, 0, 0, 0, 0, 0];
    if (Array.isArray(list)) for (var i = 0; i < 7; i++) { var n = Math.floor(Number(list[i])); out[i] = (isFinite(n) && n >= 0 && n <= 99) ? n : 0; }
    return out;
  };
  var roleMins = (Array.isArray(src.roleMins) ? src.roleMins : []).slice(0, 20).map(function(item) {
    return { roleId: sanitizeText(item && item.roleId, 100), min: days(item && item.min) };
  }).filter(function(item) { return !!item.roleId; });
  var maxConsecutive = Math.floor(Number(src.maxConsecutive));
  if (!isFinite(maxConsecutive) || maxConsecutive < 0 || maxConsecutive > 31) maxConsecutive = 0;
  var people = {};
  var count = 0;
  var srcPeople = src.people && typeof src.people === "object" ? src.people : {};
  Object.keys(srcPeople).forEach(function(id) {
    if (count >= 100) return;
    var cleanId = sanitizeText(id, 100); var item = srcPeople[id] || {};
    var maxPerWeek = Math.floor(Number(item.maxPerWeek));
    if (!isFinite(maxPerWeek) || maxPerWeek < 0 || maxPerWeek > 7) maxPerWeek = 0;
    var ng = (Array.isArray(item.ngWeekdays) ? item.ngWeekdays : []).map(Number).filter(function(d, i, list) { return d >= 0 && d <= 6 && Math.floor(d) === d && list.indexOf(d) === i; });
    var weeklyDays = Math.floor(Number(item.weeklyDays));
    if (!isFinite(weeklyDays) || weeklyDays < 0 || weeklyDays > 7) weeklyDays = 0;
    var shiftPref = ["early", "late", "any"].indexOf(item.shiftPref) >= 0 ? item.shiftPref : "";
    if (cleanId && (maxPerWeek || ng.length || weeklyDays || (shiftPref && shiftPref !== "any"))) { people[cleanId] = { maxPerWeek: maxPerWeek, ngWeekdays: ng, weeklyDays: weeklyDays, shiftPref: shiftPref || "any" }; count++; }
  });
  var hours = [];
  for (var h = 0; h < 7; h++) {
    var item = Array.isArray(src.hours) ? src.hours[h] : null;
    var ok = item && /^\d{1,2}:\d{2}$/.test(String(item.open)) && /^\d{1,2}:\d{2}$/.test(String(item.close));
    if (ok) {
      var o = String(item.open).split(":"), c = String(item.close).split(":");
      var om = Number(o[0]) * 60 + Number(o[1]), cm = Number(c[0]) * 60 + Number(c[1]);
      ok = Number(o[0]) < 24 && Number(c[0]) <= 24 && Number(o[1]) < 60 && Number(c[1]) < 60 && cm > om;
    }
    hours.push(ok ? { open: String(item.open), close: String(item.close) } : null);
  }
  var alwaysRoles = (Array.isArray(src.alwaysRoles) ? src.alwaysRoles : []).slice(0, 20).map(function(id) { return sanitizeText(id, 100); }).filter(function(id, i, list) { return !!id && list.indexOf(id) === i; });
  return { minTotal: days(src.minTotal), roleMins: roleMins, maxConsecutive: maxConsecutive, people: people, hours: hours, alwaysRoles: alwaysRoles };
}

function getShiftStaffingRules() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_STAFFING_RULES_JSON");
    var rules = normalizeShiftStaffingRules_(raw ? JSON.parse(raw) : {});
    return createJsonDataResponse({ success: true, rules: rules });
  } catch (error) { return createJsonResponse(false, error.message || "人数の設定を取得できませんでした。"); }
}

function saveShiftStaffingRules(data) {
  var lock = shiftLockHandle_();
  try {
    verifyShiftApiKey(data.shiftApiKey);
    if (!lock.tryLock(10000)) throw new Error("別の保存を処理中です。");
    var rules = normalizeShiftStaffingRules_(data.rules);
    safeSetProperty_("SHIFT_STAFFING_RULES_JSON", JSON.stringify(rules));
    return createJsonDataResponse({ success: true, rules: rules });
  } catch (error) { return createJsonResponse(false, error.message || "人数の設定を保存できませんでした。"); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}



/** 店舗共通の月次シフト期間。開始日を決めると終了日は前日へ自動設定します。 */
function getShiftCalendarPeriodSettings() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_CALENDAR_PERIOD_JSON");
    var settings = raw ? JSON.parse(raw) : { startDay: 1, endDay: 0 };
    return createJsonDataResponse({ success: true, settings: settings });
  } catch (error) {
    return createJsonResponse(false, error.message || "カレンダー期間設定を取得できませんでした。");
  }
}



function saveShiftCalendarPeriodSettings(data) {
  try {
    verifyShiftApiKey(data.shiftApiKey);
    var input = data.settings || {};
    var startDay = Number(input.startDay);
    if (!isFinite(startDay) || startDay < 1 || startDay > 28 || Math.floor(startDay) !== startDay) {
      throw new Error("開始日は1日から28日の範囲で指定してください。");
    }
    var settings = { startDay: startDay, endDay: startDay === 1 ? 0 : startDay - 1 };
    return withShiftLock_(function() {
      PropertiesService.getScriptProperties().setProperty("SHIFT_CALENDAR_PERIOD_JSON", JSON.stringify(settings));
      return createJsonDataResponse({ success: true, settings: settings });
    });
  } catch (error) {
    return createJsonResponse(false, error.message || "カレンダー期間設定を保存できませんでした。");
  }
}



/** シフトDBの必要な列があるかの確認は、最初の1回だけ行います（毎回Notionへ問い合わせると保存が遅くなるため）。 */
function ensureShiftSchema_(settings) {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty("SHIFT_SCHEMA_OK") === settings.databaseId) return;
  ensureShiftEditorProperty(settings);
  ensureShiftGlobalRemarkProperties(settings);
  ensureShiftEmployeeIdProperty(settings);
  p.setProperty("SHIFT_SCHEMA_OK", settings.databaseId);
}



/** シフトDBに監査用の最終更新者プロパティがなければ追加します。 */
function ensureShiftEditorProperty(settings) {
  var databaseUrl = "https://api.notion.com/v1/databases/" + settings.databaseId;
  var database = requestNotion(settings.apiKey, databaseUrl, "get", null);
  if (!database.properties || !database.properties["最終更新者氏名"]) {
    requestNotion(settings.apiKey, databaseUrl, "patch", {
      properties: { "最終更新者氏名": { rich_text: {} } }
    });
  }
}



/** 全体補足（帯色を含む）をシフトDBへ保存するプロパティがなければ追加します。 */
function ensureShiftGlobalRemarkProperties(settings) {
  var databaseUrl = "https://api.notion.com/v1/databases/" + settings.databaseId;
  var database = requestNotion(settings.apiKey, databaseUrl, "get", null);
  var additions = {};
  if (!database.properties || !database.properties["全体補足種別"]) additions["全体補足種別"] = { rich_text: {} };
  if (!database.properties || !database.properties["全体補足内容"]) additions["全体補足内容"] = { rich_text: {} };
  if (Object.keys(additions).length) {
    requestNotion(settings.apiKey, databaseUrl, "patch", { properties: additions });
  }
}



function ensureShiftEmployeeIdProperty(settings) {
  var databaseUrl = "https://api.notion.com/v1/databases/" + settings.databaseId;
  var database = requestNotion(settings.apiKey, databaseUrl, "get", null);
  if (!database.properties || !database.properties["従業員ID"]) requestNotion(settings.apiKey, databaseUrl, "patch", { properties: { "従業員ID": { rich_text: {} } } });
}



/**
 * 表示中の1か月分を1回のリクエストで受け取り、Notionへ差分だけ反映します。
 * - 値がある行: 新規作成または変更時だけ更新
 * - 全項目が空の行: 既存ページがある場合だけアーカイブ
 * - 変更なし: Notion APIへの書き込みなし
 */
/** Notionへの書き込み（作成・更新・アーカイブ）を3件ずつ同時に送ります。混雑(429)・一時エラーは間をあけて再試行します。 */
function runNotionBatch_(apiKey, ops) {
  var pending = ops.map(function(op, index) {
    var isCreate = op.url === "https://api.notion.com/v1/pages";
    return { index: index, request: {
      url: op.url,
      method: isCreate ? "post" : "patch",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey, "Notion-Version": "2022-06-28" },
      payload: JSON.stringify(op.body),
      muteHttpExceptions: true
    } };
  });
  var CHUNK = 3;
  var attempt = 0;
  while (pending.length) {
    var retry = [];
    var lastError = "";
    for (var start = 0; start < pending.length; start += CHUNK) {
      var chunk = pending.slice(start, start + CHUNK);
      var responses = UrlFetchApp.fetchAll(chunk.map(function(item) { return item.request; }));
      responses.forEach(function(response, k) {
        var code = response.getResponseCode();
        if (code >= 200 && code < 300) return;
        if (code === 429 || code >= 500) { retry.push(chunk[k]); return; }
        var message = response.getContentText();
        try { message = JSON.parse(message).message || message; } catch (_) {}
        lastError = "Notion API Error: " + message;
      });
      if (lastError) throw new Error(lastError);
      Utilities.sleep(150);
    }
    if (!retry.length) break;
    attempt++;
    if (attempt > 5) throw new Error("Notionが混み合っていて保存を完了できませんでした。少し待ってからもう一度お試しください。");
    Utilities.sleep(1500 * attempt);
    pending = retry;
  }
}

/** 行をNotionへ書き込む本体（保存・溜まった分の反映の両方で使う）。 */
function applyShiftRowsToNotion_(settings, incomingRows, periodStart, periodEnd, updatedBy, partial, timing, timingStart) {
    // 対象期間を最初に1回だけ読み込み、社員名＋日付で索引化します。
    // 変更分だけが送られてきたとき（partial）は、その日付の行だけをNotionから読む（期間全体を読むより速い）。
    var queryFilter = {
      and: [
        { property: "日付", date: { on_or_after: periodStart } },
        { property: "日付", date: { on_or_before: periodEnd } }
      ]
    };
    if (partial === true && incomingRows.length > 0 && incomingRows.length <= 60) {
      var distinctDates = {};
      incomingRows.forEach(function(row) { distinctDates[sanitizeDateValue(row["日付"])] = true; });
      var dateList = Object.keys(distinctDates).filter(function(value) { return value; });
      if (dateList.length > 0 && dateList.length <= 30) {
        queryFilter = { or: dateList.map(function(value) { return { property: "日付", date: { equals: value } }; }) };
      }
    }
    var existingPages = queryNotionDatabase(settings.apiKey, settings.databaseId, {
      filter: queryFilter,
      page_size: 100
    });
    timing.queryMs = Date.now() - timingStart;
    var existingByKey = {};
    existingPages.forEach(function(page) {
      var flat = flattenStatusProperties(page.properties || {});
      var employee = String(flat["社員名"] || "");
      var employeeId = String(flat["従業員ID"] || "");
      var dateObj = flat["日付"];
      var date = dateObj && dateObj.start ? String(dateObj.start).slice(0, 10) : "";
      if (!employee || !date) return;
      var key = (employeeId || employee) + "|" + date;
      if (!existingByKey[key]) existingByKey[key] = [];
      existingByKey[key].push({ page: page, flat: flat });
      if (employeeId) {
        var legacyKey = employee + "|" + date;
        if (!existingByKey[legacyKey]) existingByKey[legacyKey] = existingByKey[key];
      }
    });

    var created = 0;
    var updated = 0;
    var cleared = 0;
    var unchanged = 0;
    var seen = {};
    var notionOps = [];

    incomingRows.forEach(function(rawRow) {
      var employeeName = sanitizeText(rawRow["社員名"], 100);
      var employeeId = sanitizeText(rawRow["従業員ID"], 100);
      var dateValue = sanitizeDateValue(rawRow["日付"]);
      if (!employeeName || !dateValue || dateValue < periodStart || dateValue > periodEnd) {
        throw new Error("月次シフト内に不正な社員名または日付があります。");
      }
      var key = (employeeId || employeeName) + "|" + dateValue;
      if (seen[key]) throw new Error("同じ社員・日付のシフトが重複しています。");
      seen[key] = true;

      var shiftContent = sanitizeText(rawRow["シフト内容"], 200);
      var breakTime = sanitizeText(rawRow["休憩時間"], 50);
      var workTime = sanitizeText(rawRow["実働時間"], 50);
      var note = sanitizeText(rawRow["備考"], 500);
      var globalRemarkType = sanitizeText(rawRow["全体補足種別"], 100);
      var globalRemarkText = sanitizeText(rawRow["全体補足内容"], 500);
      // 休憩・実働の初期値（0:00）だけでは空ページを作りません。
      var hasContent = Boolean(shiftContent || note || globalRemarkType || globalRemarkText);
      var matches = existingByKey[key] || existingByKey[employeeName + "|" + dateValue] || [];

      // 空欄は新規ページを作らず、既存ページだけをアーカイブします。
      if (!hasContent) {
        matches.forEach(function(match) {
          notionOps.push({ url: "https://api.notion.com/v1/pages/" + match.page.id, body: { archived: true } });
          cleared++;
        });
        if (!matches.length) unchanged++;
        return;
      }

      var properties = {
        "記録名": createTitleProperty(dateValue + " " + employeeName),
        "社員名": createRichTextProperty(employeeName),
        "従業員ID": createRichTextProperty(employeeId),
        "日付": { date: { start: dateValue } },
        "シフト内容": createRichTextProperty(shiftContent),
        "休憩時間": createRichTextProperty(breakTime),
        "実働時間": createRichTextProperty(workTime),
        "備考": createRichTextProperty(note),
        "全体補足種別": createRichTextProperty(globalRemarkType),
        "全体補足内容": createRichTextProperty(globalRemarkText),
        "最終更新者氏名": createRichTextProperty(rawRow._u ? sanitizeText(rawRow._u, 100) : updatedBy)
      };

      if (!matches.length) {
        notionOps.push({ url: "https://api.notion.com/v1/pages", body: { parent: { database_id: settings.databaseId }, properties: properties } });
        created++;
        return;
      }

      var current = matches[0].flat;
      var isChanged =
        String(current["社員名"] || "") !== employeeName ||
        String(current["シフト内容"] || "") !== shiftContent ||
        String(current["休憩時間"] || "") !== breakTime ||
        String(current["実働時間"] || "") !== workTime ||
        String(current["備考"] || "") !== note ||
        String(current["全体補足種別"] || "") !== globalRemarkType ||
        String(current["全体補足内容"] || "") !== globalRemarkText;
      if (isChanged) {
        notionOps.push({ url: "https://api.notion.com/v1/pages/" + matches[0].page.id, body: { properties: properties } });
        updated++;
      } else {
        unchanged++;
      }

      // 過去の不具合等で同じ社員・日付が重複していた場合は1件へ整理します。
      for (var i = 1; i < matches.length; i++) {
        notionOps.push({ url: "https://api.notion.com/v1/pages/" + matches[i].page.id, body: { archived: true } });
        cleared++;
      }
    });

    timing.diffMs = Date.now() - timingStart;
    runNotionBatch_(settings.apiKey, notionOps);
    return { created: created, updated: updated, cleared: cleared, unchanged: unchanged };
}

var SHIFT_PENDING_KEY_ = "SHIFT_PENDING_JSON";

/** Notionへの反映待ちの行（サーバー側の控え）。Notionへの書き込みを裏に回すため、ここに先に保存します。 */
function readShiftPending_() {
  try {
    var o = JSON.parse(PropertiesService.getScriptProperties().getProperty(SHIFT_PENDING_KEY_) || "null");
    if (o && o.rows && typeof o.rows === "object") return o;
  } catch (_) {}
  return { rows: {}, lastError: "", lastErrorAt: "" };
}
function writeShiftPending_(state) {
  var p = PropertiesService.getScriptProperties();
  if (!Object.keys(state.rows).length) { p.deleteProperty(SHIFT_PENDING_KEY_); return true; }
  var json = JSON.stringify(state);
  if (json.length > 8000) return false;
  p.setProperty(SHIFT_PENDING_KEY_, json);
  return true;
}
function shiftPendingRowKey_(row) { return (String(row["従業員ID"] || "") || String(row["社員名"] || "")) + "|" + String(row["日付"] || ""); }
function normalizeShiftRow_(rawRow, periodStart, periodEnd, updatedBy) {
  var employeeName = sanitizeText(rawRow["社員名"], 100);
  var dateValue = sanitizeDateValue(rawRow["日付"]);
  if (!employeeName || !dateValue || dateValue < periodStart || dateValue > periodEnd) throw new Error("月次シフト内に不正な社員名または日付があります。");
  return {
    "社員名": employeeName, "従業員ID": sanitizeText(rawRow["従業員ID"], 100), "日付": dateValue,
    "シフト内容": sanitizeText(rawRow["シフト内容"], 200), "休憩時間": sanitizeText(rawRow["休憩時間"], 50), "実働時間": sanitizeText(rawRow["実働時間"], 50),
    "備考": sanitizeText(rawRow["備考"], 500), "全体補足種別": sanitizeText(rawRow["全体補足種別"], 100), "全体補足内容": sanitizeText(rawRow["全体補足内容"], 500),
    _u: updatedBy
  };
}
/** 反映待ちの行を、Notionから読んだ一覧に重ねる（別の端末にも、保存した内容がすぐ見えるように）。 */
function overlayShiftPending_(shifts) {
  var state = readShiftPending_();
  var keys = Object.keys(state.rows);
  if (!keys.length) return shifts;
  var drop = {};
  keys.forEach(function(k) { var r = state.rows[k]; drop[k] = true; drop[String(r["社員名"]) + "|" + String(r["日付"])] = true; });
  var kept = shifts.filter(function(sh) {
    var d = sh["日付"] && sh["日付"].start ? String(sh["日付"].start).slice(0, 10) : "";
    var name = String(sh["社員名"] || ""), id = String(sh["従業員ID"] || "");
    return !(d && (drop[(id || name) + "|" + d] || drop[name + "|" + d]));
  });
  keys.forEach(function(k) {
    var r = state.rows[k];
    if (!(r["シフト内容"] || r["備考"] || r["全体補足種別"] || r["全体補足内容"])) return;
    kept.push({ id: "pending-" + k, "社員名": r["社員名"], "従業員ID": r["従業員ID"], "日付": { start: r["日付"] }, "シフト内容": r["シフト内容"], "休憩時間": r["休憩時間"], "実働時間": r["実働時間"], "備考": r["備考"], "全体補足種別": r["全体補足種別"], "全体補足内容": r["全体補足内容"], "最終更新者氏名": r._u });
  });
  return kept;
}
/** 反映待ちの状態（件数・いちばん古い時刻・直近のエラー）。画面の警告表示に使う。 */
function getShiftPendingStatus(data) {
  var state = readShiftPending_();
  var keys = Object.keys(state.rows);
  var oldest = "";
  keys.forEach(function(k) { var q = state.rows[k]._q || ""; if (q && (!oldest || q < oldest)) oldest = q; });
  return createJsonDataResponse({ success: true, count: keys.length, oldestAt: oldest, lastError: state.lastError || "", lastErrorAt: state.lastErrorAt || "" });
}
// ---------- エラー記録（画面で起きたエラーを、管理者が設定で見られるようにする） ----------
var SHIFT_ERROR_LOG_KEY_ = "SHIFT_ERROR_LOG_JSON";
function readShiftErrorLog_() {
  try { var list = JSON.parse(PropertiesService.getScriptProperties().getProperty(SHIFT_ERROR_LOG_KEY_) || "[]"); return Array.isArray(list) ? list : []; }
  catch (e) { return []; }
}
/** 画面側で起きたエラーを1件記録する（同じ内容は回数だけ増やす。直近15件、容量は約7KBまで）。記録に失敗しても画面には影響させない。 */
function logShiftClientError(data) {
  try {
    var session = requireShiftSession(data.sessionToken);
    var msg = sanitizeText(data.message, 300) || "(内容なし)";
    var where = sanitizeText(data.where, 160);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) return createJsonDataResponse({ success: true, skipped: true });
    try {
      var list = readShiftErrorLog_();
      var now = new Date().toISOString();
      var hit = null;
      for (var i = 0; i < list.length; i++) { if (list[i].m === msg && list[i].w === where) { hit = list[i]; break; } }
      if (hit) { hit.n = (hit.n || 1) + 1; hit.t = now; }
      else list.push({ t: now, m: msg, w: where, n: 1, who: String((session && (session.employeeName || session.role)) || "").slice(0, 40) });
      list.sort(function(a, b) { return a.t < b.t ? 1 : -1; });
      list = list.slice(0, 15);
      while (list.length > 1 && JSON.stringify(list).length > 7000) list.pop();
      PropertiesService.getScriptProperties().setProperty(SHIFT_ERROR_LOG_KEY_, JSON.stringify(list));
    } finally { lock.releaseLock(); }
    return createJsonDataResponse({ success: true });
  } catch (error) { return createJsonResponse(false, error.message || "記録できませんでした。"); }
}
function getShiftErrorLog(data) {
  try { return createJsonDataResponse({ success: true, errors: readShiftErrorLog_() }); }
  catch (error) { return createJsonResponse(false, error.message || "取得できませんでした。"); }
}
function clearShiftErrorLog(data) {
  try { verifyShiftApiKey(data.shiftApiKey); PropertiesService.getScriptProperties().deleteProperty(SHIFT_ERROR_LOG_KEY_); return createJsonDataResponse({ success: true }); }
  catch (error) { return createJsonResponse(false, error.message || "消去できませんでした。"); }
}

/** 溜まっている行を、Notionへ書き込む。失敗したら溜めたまま残し、エラーを記録する。 */
function flushShiftPending(data) {
  var timingStart = Date.now();
  var timing = {};
  var lock = shiftLockHandle_();
  try {
    verifyShiftApiKey(data.shiftApiKey);
    if (!lock.tryLock(30000)) throw new Error("別の保存処理を実行中です。少し待ってから再度お試しください。");
    var state = readShiftPending_();
    var keys = Object.keys(state.rows);
    if (!keys.length) return createJsonDataResponse({ success: true, written: 0, pending: 0 });
    try {
      var settings = getShiftManagementSettings();
      ensureShiftSchema_(settings);
      var rows = keys.map(function(k) { return state.rows[k]; });
      var dates = rows.map(function(r) { return r["日付"]; }).sort();
      var applied = applyShiftRowsToNotion_(settings, rows, dates[0], dates[dates.length - 1], "", true, timing, timingStart);
      invalidateShiftsCache_();
      PropertiesService.getScriptProperties().deleteProperty(SHIFT_PENDING_KEY_);
      appendShiftAudit(data, "月次シフト保存(反映)", dates[0] + "〜" + dates[dates.length - 1], null, applied);
      return createJsonDataResponse({ success: true, written: keys.length, pending: 0, created: applied.created, updated: applied.updated, cleared: applied.cleared, timing: timing });
    } catch (error) {
      state.lastError = String(error && error.message || error).slice(0, 200);
      state.lastErrorAt = new Date().toISOString();
      writeShiftPending_(state);
      throw error;
    }
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "Notionへの反映に失敗しました。");
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function saveShiftMonth(data) {
  var timingStart = Date.now();
  var timing = {};
  var lock = shiftLockHandle_();
  try {
    verifyShiftApiKey(data.shiftApiKey);
    if (!lock.tryLock(30000)) throw new Error("別の保存処理を実行中です。少し待ってから再度お試しください。");
    timing.lockMs = Date.now() - timingStart;

    // 確定済みの期間はサーバー側でも保存を拒否します（画面の制限をすり抜けた場合の保険）。
    // 画面から送られた期間ではなく、保存する行の日付範囲（行が無ければ期間）と重なる確定済み期間があれば拒否します。
    var lockPeriodStart = sanitizeDateValue(data.periodStart);
    var lockPeriodEnd = sanitizeDateValue(data.periodEnd);
    var lockRangeStart = lockPeriodStart || "", lockRangeEnd = lockPeriodEnd || lockPeriodStart || "";
    var lockRowDates = (Array.isArray(data.shifts) ? data.shifts : []).map(function(row) { return row ? String(row["日付"] || "") : ""; }).filter(function(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }).sort();
    if (lockRowDates.length) { lockRangeStart = lockRowDates[0]; lockRangeEnd = lockRowDates[lockRowDates.length - 1]; }
    if (lockRangeStart) {
      var lockStatuses = {};
      try { lockStatuses = JSON.parse(PropertiesService.getScriptProperties().getProperty("SHIFT_PERIOD_STATUSES_JSON") || "{}"); } catch (_) { lockStatuses = {}; }
      Object.keys(lockStatuses).forEach(function(startKey) {
        var status = lockStatuses[startKey];
        if (!status || !status.locked || !/^\d{4}-\d{2}-\d{2}$/.test(startKey)) return;
        var endKey = /^\d{4}-\d{2}-\d{2}$/.test(String(status.periodEnd || "")) ? String(status.periodEnd) : deriveShiftPeriodEnd_(startKey);
        if (startKey <= lockRangeEnd && endKey >= lockRangeStart) throw new Error("この期間は確定済みのため保存できません。先に「確定を解除」してください。");
      });
    }

    var settings = getShiftManagementSettings();
    var updatedBy = sanitizeText(data.updatedBy, 100).trim();
    if (!updatedBy) throw new Error("保存者名が指定されていません。");
    ensureShiftSchema_(settings);
    var periodStart = sanitizeDateValue(data.periodStart);
    var periodEnd = sanitizeDateValue(data.periodEnd);
    var incomingRows = Array.isArray(data.shifts) ? data.shifts : [];
    if (!periodStart || !periodEnd || periodStart > periodEnd) throw new Error("保存期間が正しくありません。");
    if (incomingRows.length > 500) throw new Error("一度に保存できる件数は500件までです。");

    // 反映待ちの行が残っているときは、新しい保存分と合わせてNotionへ書く（古い内容で上書きしないため）。
    var pendingState = readShiftPending_();
    var pendingKeys = Object.keys(pendingState.rows);
    var normalizedIncoming = incomingRows.map(function(row) { var n = normalizeShiftRow_(row, periodStart, periodEnd, updatedBy); n._q = new Date().toISOString(); return n; });
    var seenKeys = {};
    normalizedIncoming.forEach(function(row) { var k = shiftPendingRowKey_(row); if (seenKeys[k]) throw new Error("同じ社員・日付のシフトが重複しています。"); seenKeys[k] = true; });
    if (data.defer === true && normalizedIncoming.length > 0) {
      // 先にサーバー内の控えへ保存して、すぐ返事をする。Notionへの書き込みは、このあとの「反映」で行う。
      normalizedIncoming.forEach(function(row) { pendingState.rows[shiftPendingRowKey_(row)] = row; });
      if (writeShiftPending_(pendingState)) {
        timing.totalMs = Date.now() - timingStart;
        return createJsonDataResponse({ success: true, queued: true, pending: Object.keys(pendingState.rows).length, timing: timing, message: "保存しました（Notionへ反映中）。" });
      }
      normalizedIncoming.forEach(function(row) { delete pendingState.rows[shiftPendingRowKey_(row)]; });
    }
    if (pendingKeys.length) {
      var mergedRows = {};
      pendingKeys.forEach(function(k) { mergedRows[k] = pendingState.rows[k]; });
      normalizedIncoming.forEach(function(row) { mergedRows[shiftPendingRowKey_(row)] = row; });
      incomingRows = Object.keys(mergedRows).map(function(k) { return mergedRows[k]; });
      var mergedDates = incomingRows.map(function(r) { return r["日付"]; }).sort();
      periodStart = mergedDates[0] < periodStart ? mergedDates[0] : periodStart;
      periodEnd = mergedDates[mergedDates.length - 1] > periodEnd ? mergedDates[mergedDates.length - 1] : periodEnd;
      data.partial = true;
    }

    var applied = applyShiftRowsToNotion_(settings, incomingRows, periodStart, periodEnd, updatedBy, data.partial === true, timing, timingStart);
    var created = applied.created, updated = applied.updated, cleared = applied.cleared, unchanged = applied.unchanged;
    timing.writeMs = Date.now() - timingStart;
    invalidateShiftsCache_();
    if (pendingKeys.length) PropertiesService.getScriptProperties().deleteProperty(SHIFT_PENDING_KEY_);
    appendShiftAudit(data, "月次シフト保存", periodStart + "〜" + periodEnd, null, { created: created, updated: updated, cleared: cleared, unchanged: unchanged });
    timing.totalMs = Date.now() - timingStart;
    return createJsonDataResponse({
      timing: timing,
      success: true,
      message: "月次シフトを保存しました。",
      created: created,
      updated: updated,
      cleared: cleared,
      unchanged: unchanged
    });
  } catch (error) {
    console.error(error);
    return createJsonResponse(false, error.message || "月次シフトの保存エラーが発生しました。");
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}



/** 訂正依頼は確定した期間のみ受け付けます。 */
function readShiftPeriodStatusForCorrection(periodStart) {
  var data = getShiftPeriodStatus({ periodStart: periodStart });
  try { return Boolean(JSON.parse(data.getContent()).locked); } catch (_) { return false; }
}



/** 既存の店舗設定DBに訂正依頼の公開範囲を保存します。 */
function getShiftCorrectionVisibility(data) {
  try {
    requireShiftSession(data.sessionToken);
    var p = PropertiesService.getScriptProperties();
    var storedVisibility = p.getProperty("SHIFT_CORRECTION_VISIBILITY_" + getStoreId());
    if (storedVisibility === "all" || storedVisibility === "private") return createJsonDataResponse({ success: true, visibility: storedVisibility });
    var fallback = storedVisibility || "all";
    var apiKey = p.getProperty("NOTION_API_KEY"), dbId = p.getProperty("NOTION_STORE_DATABASE_ID");
    if (!apiKey || !dbId) return createJsonDataResponse({ success: true, visibility: fallback });
    var rows = queryNotionDatabase(apiKey, dbId, { filter: { property: "店舗ID", rich_text: { equals: getStoreId() } }, page_size: 1 });
    var label = rows.length ? statusPageToObject(rows[0])["訂正依頼公開設定"] : "";
    var resolvedVisibility = label === "全員に表示" ? "all" : label === "本人と管理者のみ" ? "private" : (fallback === "private" ? "private" : "all");
    p.setProperty("SHIFT_CORRECTION_VISIBILITY_" + getStoreId(), resolvedVisibility);
    return createJsonDataResponse({ success: true, visibility: resolvedVisibility });
  } catch (error) { return createJsonResponse(false, error.message || "公開設定を取得できませんでした。"); }
}


function saveShiftCorrectionVisibility(data) {
  try {
    requireShiftSession(data.sessionToken, "admin");
    verifyShiftApiKey(data.shiftApiKey);
    var visibility = data.visibility;
    if (visibility !== "all" && visibility !== "private") throw new Error("公開設定が正しくありません。");
    return withShiftLock_(function() {
      var p = PropertiesService.getScriptProperties();
      var apiKey = p.getProperty("NOTION_API_KEY"), dbId = p.getProperty("NOTION_STORE_DATABASE_ID");
      var label = visibility === "all" ? "全員に表示" : "本人と管理者のみ";
      if (apiKey && dbId) {
        var url = "https://api.notion.com/v1/databases/" + dbId;
        var db = requestNotion(apiKey, url, "get", null);
        if (!db.properties || !db.properties["訂正依頼公開設定"]) requestNotion(apiKey, url, "patch", { properties: { "訂正依頼公開設定": { select: { options: [{ name: "全員に表示" }, { name: "本人と管理者のみ" }] } } } });
        var rows = queryNotionDatabase(apiKey, dbId, { filter: { property: "店舗ID", rich_text: { equals: getStoreId() } }, page_size: 1 });
        if (rows.length) updateNotionPage(apiKey, rows[0].id, { "訂正依頼公開設定": { select: { name: label } } });
        else createNotionPage(apiKey, dbId, { "店舗名": createTitleProperty("店舗名を設定"), "店舗ID": createRichTextProperty(getStoreId()), "訂正依頼公開設定": { select: { name: label } } });
      }
      p.setProperty("SHIFT_CORRECTION_VISIBILITY_" + getStoreId(), visibility);
      appendShiftAudit(data, "訂正依頼公開設定変更", getStoreId(), null, { visibility: visibility });
      return createJsonDataResponse({ success: true, visibility: visibility });
    });
  } catch (error) { return createJsonResponse(false, error.message || "公開設定を保存できませんでした。"); }
}

/** 新店舗の初期操作員を一人登録します。GASエディタで一度だけ実行してください。 */
function initializeShiftOperator() {
  var props = PropertiesService.getScriptProperties();
  var name = sanitizeText(props.getProperty("SHIFT_INITIAL_OPERATOR_NAME"), 100).trim();
  if (!name) throw new Error("SHIFT_INITIAL_OPERATOR_NAME を設定してください。");
  var master = normalizeShiftEmployeeMaster(readShiftEmployeeMaster());
  if (master.length) throw new Error("操作員が既に登録されています。再実行しないでください。");
  var id = Utilities.getUuid();
  props.setProperty("SHIFT_EMPLOYEE_MASTER_JSON", JSON.stringify([{ id: id, name: name, displayName: name, displayOrder: 1, active: true, aliases: [], role: "" }]));
  props.deleteProperty("SHIFT_INITIAL_OPERATOR_NAME");
  Logger.log("初期操作員を登録しました: " + name + " (" + id + ")");
}


/** GAS管理者が許可した3DB以外に向いたGASでは初期化を一切受け付けない。 */
function assertTemplateResetTarget() {
  var p = PropertiesService.getScriptProperties();
  // 既存の複製版は従来の安全装置を維持。新店舗はGAS側で許可DBを明示する。
  var defaultExpected = {
    NOTION_SHIFT_DATABASE_ID: "665ef4863f6040e9b542586083764148",
    NOTION_SHIFT_REQUEST_DATABASE_ID: "a4d434ce8dbc4e9d860167971c631738",
    NOTION_STORE_DATABASE_ID: "23de2613332d4ef3b809d21006cec516"
  };
  var configured = p.getProperty("SHIFT_RESET_ALLOWED_DB_IDS");
  var expected = configured ? JSON.parse(configured) : defaultExpected;
  Object.keys(defaultExpected).forEach(function(key) {
    if (!expected[key] || normalizeNotionId(p.getProperty(key)) !== normalizeNotionId(expected[key])) {
      throw new Error("複製用DBの設定が一致しません。初期化できません。");
    }
  });
  if (!p.getProperty("NOTION_API_KEY")) throw new Error("Notion接続が未設定です。");
  return p;
}

/** 複製用DBだけの旧備考欄を消す。シフトや申請は変更しない。1回最大25ページ。 */
function clearTemplateShiftRemarks(data) {
  try {
    requireShiftSession(data.sessionToken, "admin"); verifyShiftApiKey(data.shiftApiKey);
    var p = assertTemplateResetTarget();
    var apiKey = p.getProperty("NOTION_API_KEY"), dbId = p.getProperty("NOTION_SHIFT_DATABASE_ID");
    var rows = queryNotionDatabase(apiKey, dbId, { page_size: 100 });
    var targets = rows.filter(function(page) {
      var row = statusPageToObject(page);
      return String(row["備考"] || row["全体補足種別"] || row["全体補足内容"] || "").trim() !== "";
    });
    if (data.preview === true) return createJsonDataResponse({ success: true, count: targets.length, cleared: 0 });
    targets.slice(0, 25).forEach(function(page) {
      updateNotionPage(apiKey, page.id, {
        "備考": createRichTextProperty(""),
        "全体補足種別": createRichTextProperty(""),
        "全体補足内容": createRichTextProperty("")
      });
    });
    invalidateShiftsCache_();
    p.deleteProperty("SHIFT_DROPDOWN_MASTER_JSON");
    return createJsonDataResponse({ success: true, cleared: Math.min(targets.length, 25), remaining: Math.max(0, targets.length - 25) });
  } catch (error) { return createJsonResponse(false, error.message || "古い備考を削除できませんでした。"); }
}

function templateResetDatabases(p) {
  return [
    { key: "NOTION_SHIFT_DATABASE_ID", label: "シフト" },
    { key: "NOTION_SHIFT_REQUEST_DATABASE_ID", label: "希望届" },
    { key: "NOTION_STORE_DATABASE_ID", label: "店舗設定" }
  ];
}

function previewTemplateReset(data) {
  try {
    var session = requireShiftSession(data.sessionToken, "admin");
    verifyShiftApiKey(data.apiKey);
    var p = assertTemplateResetTarget();
    var dbs = templateResetDatabases(p);
    var counts = dbs.map(function(db) {
      return { label: db.label, count: queryNotionDatabase(p.getProperty("NOTION_API_KEY"), p.getProperty(db.key), { page_size: 100 }).length };
    });
    var operator = normalizeShiftEmployeeMaster(readShiftEmployeeMaster()).filter(function(item) {
      return item.id === session.employeeId && item.active;
    })[0];
    if (!operator) throw new Error("操作員が見つかりません。ログインし直してください。");
    var token = Utilities.getUuid();
    p.setProperty("SHIFT_TEMPLATE_RESET_AUTH", JSON.stringify({
      token: token, operator: operator, archived: 0, expiresAt: Date.now() + 60 * 60 * 1000
    }));
    return createJsonDataResponse({ success: true, counts: counts, employees: readShiftEmployeeMaster().length, token: token, operatorName: operator.displayName });
  } catch (error) { return createJsonResponse(false, error.message || "初期化対象を確認できませんでした。"); }
}

function getTemplateResetStatus(data) {
  try {
    var session = requireShiftSession(data.sessionToken, "admin");
    verifyShiftApiKey(data.apiKey);
    var p = assertTemplateResetTarget();
    var authorization = JSON.parse(p.getProperty("SHIFT_TEMPLATE_RESET_AUTH") || "null");
    if (!authorization || authorization.token !== data.token || authorization.operator.id !== session.employeeId || authorization.expiresAt <= Date.now()) {
      throw new Error("初期化の確認期限が切れました。対象件数を再確認してください。");
    }
    return createJsonDataResponse({ success: true, archived: Number(authorization.archived) || 0, active: true });
  } catch (error) { return createJsonResponse(false, error.message || "初期化の進行状況を確認できませんでした。"); }
}

function retryTemplateResetNotion(operation) {
  for (var attempt = 0; attempt < 3; attempt++) {
    try { return operation(); }
    catch (error) {
      var message = String(error && error.message || error);
      if (attempt === 2 || !/(?:\b429\b|\b500\b|\b502\b|\b503\b|\b504\b)/.test(message)) throw error;
      Utilities.sleep(700 * Math.pow(2, attempt));
    }
  }
}

function runTemplateReset(data) {
  var lock = shiftLockHandle_();
  invalidateShiftsCache_();
  var p, authorization, archived = 0, checkpointed = false;
  try {
    if (!lock.tryLock(10000)) throw new Error("別の処理中です。少し待って再試行してください。");
    var session = requireShiftSession(data.sessionToken, "admin");
    verifyShiftApiKey(data.apiKey);
    p = assertTemplateResetTarget();
    authorization = JSON.parse(p.getProperty("SHIFT_TEMPLATE_RESET_AUTH") || "null");
    if (!authorization || authorization.token !== data.token ||
        authorization.operator.id !== session.employeeId || authorization.expiresAt <= Date.now() ||
        data.confirmation !== "初期化") throw new Error("確認が無効です。対象を再確認してください。");
    var apiKey = p.getProperty("NOTION_API_KEY");
    var remaining = 0;
    var budget = 20;
    templateResetDatabases(p).forEach(function(db) {
      var rows = retryTemplateResetNotion(function() {
        return queryNotionDatabase(apiKey, p.getProperty(db.key), { page_size: Math.min(budget + 1, 100) });
      });
      var selected = rows.slice(0, budget);
      selected.forEach(function(page) {
        retryTemplateResetNotion(function() {
          return requestNotion(apiKey, "https://api.notion.com/v1/pages/" + page.id, "patch", { archived: true });
        });
        archived++;
      });
      budget -= selected.length;
      remaining += rows.length - selected.length;
    });
    authorization.archived = (Number(authorization.archived) || 0) + archived;
    authorization.expiresAt = Date.now() + 60 * 60 * 1000;
    p.setProperty("SHIFT_TEMPLATE_RESET_AUTH", JSON.stringify(authorization));
    checkpointed = true;
    // 次のバッチで最終確認を行う。失敗時は同じ確認トークンで安全に再試行できる。
    if (budget === 0 || remaining > 0) {
      return createJsonDataResponse({ success: true, done: false, archived: archived });
    }
    var businessKeys = [
      "SHIFT_CYCLE_MASTER_JSON", "SHIFT_AUTO_DRAFT_SETTINGS_JSON", "SHIFT_SPECIAL_DAY_RULES_JSON", "SHIFT_STAFFING_RULES_JSON",
      "SHIFT_WORK_TIME_MASTER_" + getStoreId(),
      "SHIFT_CALENDAR_PERIOD_JSON", "SHIFT_PERIOD_STATUSES_JSON", "SHIFT_PAID_LEAVE_BALANCES_JSON",
      "SHIFT_PAID_LEAVE_LEDGER_JSON", "SHIFT_AUDIT_LOG_JSON", "SHIFT_PENDING_JSON", "SHIFT_ERROR_LOG_JSON",
      "SHIFT_BOARD_VISIBILITY_FALLBACK_" + getStoreId(),
      "SHIFT_CORRECTION_VISIBILITY_" + getStoreId(),
      "SHIFT_STORE_SETTINGS_JSON"
    ];
    // 役職・ホームの列分け・お知らせ（本文と公開範囲）も初期仕様へ戻す。
    businessKeys.push("SHIFT_ROLE_MASTER_JSON", "SHIFT_HOME_LAYOUT_JSON", "SHIFT_ADMIN_NOTICE_VISIBILITY", "SHIFT_DROPDOWN_MASTER_JSON");
    var noticeIds = [];
    try { noticeIds = JSON.parse(p.getProperty("SHIFT_ADMIN_NOTICE_IDS") || "[]"); } catch (_) {}
    (Array.isArray(noticeIds) ? noticeIds : []).forEach(function(id) { businessKeys.push("SHIFT_ADMIN_NOTICE_" + id); });
    businessKeys.push("SHIFT_ADMIN_NOTICE_IDS");
    businessKeys.forEach(function(key) { p.deleteProperty(key); });
    // ログイン用に操作員1名だけ残し、接続情報・ログインID・パスワードは保持する。
    p.setProperty("SHIFT_EMPLOYEE_MASTER_JSON", JSON.stringify([authorization.operator]));
    var all = p.getProperties();
    Object.keys(all).forEach(function(key) {
      // 期間ごとの休み希望も初期化する（SHIFT_BAND_V3_MIGRATED は残す）。
      if (key.indexOf("SHIFT_SESSION_") === 0 || key.indexOf("SHIFT_LEAVE_REQUESTS_") === 0) p.deleteProperty(key);
      // PINも、残す操作員1名のぶん以外は消す（消えた従業員の記録を残さない）。
      if (key.indexOf("SHIFT_PIN_") === 0 && key !== shiftPinPropertyKey_(authorization.operator.id)) p.deleteProperty(key);
    });
    p.deleteProperty("SHIFT_TEMPLATE_RESET_AUTH");
    // 他の端末が次に開いたとき、端末内の設定を自動で消すための目印。
    p.setProperty("SHIFT_RESET_EPOCH", String(Date.now()));
    return createJsonDataResponse({ success: true, done: true, archived: archived });
  } catch (error) {
    if (p && authorization && archived > 0 && !checkpointed) {
      authorization.archived = (Number(authorization.archived) || 0) + archived;
      authorization.expiresAt = Date.now() + 60 * 60 * 1000;
      p.setProperty("SHIFT_TEMPLATE_RESET_AUTH", JSON.stringify(authorization));
    }
    return createJsonResponse(false, error.message || "初期化に失敗しました。");
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}

/** Shared working-hour options for this cloned store only. */
function defaultShiftWorkTimeMaster() {
  return { revision: "", items: [
    { id: "default-1", start: "09:00", end: "18:00", nextDay: false, abbreviation: "早番", visible: true },
    { id: "default-2", start: "10:00", end: "19:00", nextDay: false, abbreviation: "遅番", visible: true },
    { id: "default-3", start: "09:00", end: "13:00", nextDay: false, abbreviation: "午前勤務", visible: true }
  ] };
}
function readShiftWorkTimeMaster() {
  var raw = PropertiesService.getScriptProperties().getProperty("SHIFT_WORK_TIME_MASTER_" + getStoreId());
  return raw ? JSON.parse(raw) : defaultShiftWorkTimeMaster();
}
function getShiftWorkTimeMaster(data) {
  try { requireShiftSession(data.sessionToken); return createJsonDataResponse({ success: true, master: readShiftWorkTimeMaster() }); }
  catch (error) { return createJsonResponse(false, error.message || "勤務時間設定を取得できませんでした。"); }
}
function saveShiftWorkTimeMaster(data) {
  var lock = shiftLockHandle_();
  try {
    requireShiftSession(data.sessionToken, "admin");
    verifyShiftApiKey(data.shiftApiKey);
    if (!Array.isArray(data.items) || data.items.length > 60) throw new Error("勤務時間は60件まで登録できます。");
    var ids = {}, times = {};
    var items = data.items.map(function(item) {
      if (!item || !/^\d{2}:\d{2}$/.test(item.start) || !/^\d{2}:\d{2}$/.test(item.end)) throw new Error("時刻が正しくありません。");
      var start = item.start.split(":").map(Number), end = item.end.split(":").map(Number);
      if (start[0] > 23 || end[0] > 23 || start[1] > 59 || end[1] > 59) throw new Error("時刻が正しくありません。");
      var duration = end[0] * 60 + end[1] + (item.nextDay === true ? 1440 : 0) - start[0] * 60 - start[1];
      if (duration <= 0 || duration > 1440) throw new Error("開始・終了時刻と翌日設定を確認してください。");
      var id = sanitizeText(item.id, 100).trim(), key = item.start + "～" + item.end;
      if (!id || ids[id] || times[key]) throw new Error("勤務時間またはIDが重複しています。");
      ids[id] = true; times[key] = true;
      return { id: id, start: item.start, end: item.end, nextDay: item.nextDay === true, abbreviation: sanitizeText(item.abbreviation || "", 20).trim(), visible: item.visible !== false };
    });
    lock.waitLock(10000);
    var before = readShiftWorkTimeMaster();
    if (String(data.revision || "") !== String(before.revision || "")) throw new Error("他の端末で設定が更新されました。画面を開き直して変更してください。");
    var master = { items: items, revision: Utilities.getUuid() };
    safeSetProperty_("SHIFT_WORK_TIME_MASTER_" + getStoreId(), JSON.stringify(master));
    appendShiftAudit(data, "勤務時間設定保存", getStoreId(), before, master);
    return createJsonDataResponse({ success: true, master: master });
  } catch (error) { return createJsonResponse(false, error.message || "勤務時間設定を保存できませんでした。"); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
