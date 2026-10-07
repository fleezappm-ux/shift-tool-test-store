# 画面の通し確認（Playwright・疑似GAS）

本物のGAS・Notionにつながず、通信を疑似で返して、画面の動きを確かめるスクリプト集です（自動テストではなく、手元で流す確認用）。

1. ビルド：`VITE_SHIFT_GAS_URL=https://script.google.com/macros/s/AAA/exec VITE_BASE_PATH=/ npx vite build --outDir /tmp/smokedist`
2. 配信：`cd /tmp/smokedist && python3 -m http.server 5199`
3. 準備：`mkdir /tmp/pw && cd /tmp/pw && npm i playwright-core playwright`（この場所に `tests/e2e/*.js` をコピー）
4. 実行：`node flow1.js` など（`s22.js` が疑似GAS本体と画面ツアー。`errlog.js` はエラー記録、`bp.js` は別の公開パスの確認）

注意：スクリプト内のスクリーンショット保存先（OUT）は、実行する環境に合わせて書き換えてください。`flow4.js` の「掲示板: 公開」は疑似環境で失敗します（原因未調査。`flow5.js` は成功）。
