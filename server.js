// Eidos UI server — zero-dependency node.
// Serves /api/versions (dynamic: scans demos/<family>/v<N>/ dirs, merges each
// dir's meta.json, appends planned.json rungs) plus the static site, so
// `node server.js` is also full local dev. In production Caddy serves static
// and proxies only /api/* here.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const argPort = process.argv.indexOf("--port");
const PORT = argPort > -1 ? +process.argv[argPort + 1] : 8123;

const FAMILIES = [
  { key: "reference-chat", name: "Agent chat", filterable: true },
  { key: "product-shell-mock", name: "Product shell mocks", filterable: false },
  { key: "icons", name: "Icons", filterable: false },
];

function scanVersions() {
  return FAMILIES.map((f) => {
    const dir = path.join(ROOT, "demos", f.key);
    const live = [];
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch {}
    for (const d of entries) {
      const m = d.isDirectory() && d.name.match(/^v(\d+)$/);
      if (!m) continue;
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(path.join(dir, d.name, "meta.json"), "utf8")); } catch {}
      live.push({
        v: +m[1], live: true, href: `demos/${f.key}/${d.name}/`,
        title: meta.title || d.name, desc: meta.desc || "",
        why: meta.why || "", tags: meta.tags || [], auto: !!meta.auto,
      });
    }
    let planned = [];
    try { planned = JSON.parse(fs.readFileSync(path.join(dir, "planned.json"), "utf8")); } catch {}
    const liveVs = new Set(live.map((x) => x.v));
    planned = planned.filter((p) => !liveVs.has(p.v)).map((p) => ({ ...p, live: false }));
    return { name: f.name, filterable: f.filterable, items: [...live, ...planned].sort((a, b) => a.v - b.v) };
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8", ".woff2": "font/woff2",
};

http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (u === "/api/versions") {
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-cache");
    return res.end(JSON.stringify({ families: scanVersions() }));
  }
  let p = path.normalize(path.join(ROOT, u));
  if (!p.startsWith(ROOT) || p.includes(path.sep + ".git")) { res.writeHead(403); return res.end(); }
  try { if (fs.statSync(p).isDirectory()) p = path.join(p, "index.html"); } catch {}
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.setHeader("content-type", MIME[path.extname(p)] || "application/octet-stream");
    res.end(buf);
  });
}).listen(PORT, "127.0.0.1", () => console.log("eidos-ui server on 127.0.0.1:" + PORT));
