// お試し版（1枚のHTML）を作る。使い方：
//   VITE_SHIFT_GAS_URL=https://script.google.com/macros/s/DEMO/exec VITE_BASE_PATH=/ npx vite build --outDir /tmp/demodist
//   node tests/demo/build-demo.cjs /tmp/demodist /tmp/demo.html
const fs = require("fs"), path = require("path");
const [dist, out] = process.argv.slice(2);
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const js = fs.readFileSync(path.join(dist, html.match(/src="\/(assets\/index-[^"]+\.js)"/)[1]), "utf8");
let css = fs.readFileSync(path.join(dist, html.match(/href="\/(assets\/index-[^"]+\.css)"/)[1]), "utf8");
css = css.replace(/url\(\/(assets\/[^)]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(dist, f)).toString("base64")})`);
const mock = fs.readFileSync(path.join(__dirname, "demo-gas.js"), "utf8");
const safe = s => s.replace(/<\/(script|style)/gi, "<\\/$1");
fs.writeFileSync(out, `<title>シフト作成デモ</title>
<script>${safe(mock)}</script>
<style>${safe(css)}</style>
<div id="root"></div>
<script type="module">${safe(js)}</script>
`);
console.log("wrote", out, (fs.statSync(out).size / 1e6).toFixed(2) + "MB");
