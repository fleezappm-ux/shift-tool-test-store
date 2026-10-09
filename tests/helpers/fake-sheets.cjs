// テスト用の、メモリ上だけの簡易スプレッドシート（GASのSpreadsheetApp相当の最小部分）
function makeFakeSpreadsheet(id) {
  const sheets = {};
  const stats = { reads: 0, writes: 0 };
  function Sheet(name) {
    const data = []; // data[r][c]
    const self = {
      name, data,
      getLastRow() { let n = 0; data.forEach((row, i) => { if (row && row.some(v => v !== '' && v != null)) n = i + 1; }); return n; },
      getLastColumn() { return data.reduce((m, r) => Math.max(m, (r || []).length), 0) || 1; },
      getMaxRows() { return Math.max(1000, data.length); },
      setFrozenRows() {},
      deleteRow(n) { data.splice(n - 1, 1); },
      getRange(r, c, h = 1, w = 1) {
        return {
          getValues() { stats.reads++; const out = []; for (let i = 0; i < h; i++) { const row = []; for (let j = 0; j < w; j++) row.push((data[r - 1 + i] || [])[c - 1 + j] ?? ''); out.push(row); } return out; },
          setValues(vals) { stats.writes++; vals.forEach((rowVals, i) => { data[r - 1 + i] = data[r - 1 + i] || []; rowVals.forEach((v, j) => { data[r - 1 + i][c - 1 + j] = v; }); }); return this; },
          clearContent() { for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) if (data[r - 1 + i]) data[r - 1 + i][c - 1 + j] = ''; return this; },
          setFontWeight() { return this; }, setBackground() { return this; }, setNumberFormat() { return this; }
        };
      }
    };
    return self;
  }
  return {
    stats, sheets,
    getId: () => id || 'FAKE-SHEET',
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => (sheets[n] = Sheet(n))
  };
}
function installSpreadsheetApp(ctx, book) {
  ctx.SpreadsheetApp = { getActiveSpreadsheet: () => book, openById: () => book, flush() {} };
  const origFmt = ctx.Utilities && ctx.Utilities.formatDate;
  if (ctx.Utilities && !origFmt) ctx.Utilities.formatDate = (d) => d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 19);
}
module.exports = { makeFakeSpreadsheet, installSpreadsheetApp };
