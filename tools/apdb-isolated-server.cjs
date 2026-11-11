"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.APDB_PILOT_PORT || 8790);
const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey || !/^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(supabaseUrl)) {
  throw new Error("APDB isolated server requires SUPABASE_URL on 127.0.0.1 and SUPABASE_ANON_KEY");
}

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".json": "application/json" };
const html = fs.readFileSync(path.join(root, "index_online.html"), "utf8");
const bootstrap = `<script>window.APDB_SUPABASE_URL=${JSON.stringify(supabaseUrl)};window.APDB_SUPABASE_ANON_KEY=${JSON.stringify(anonKey)};</script>`;

function serve(request, response) {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname === "/" || pathname === "/index_online.html") {
    response.writeHead(200, { "content-type": mime[".html"], "cache-control": "no-store" });
    response.end(html.replace("<head>", `<head>${bootstrap}`));
    return;
  }
  const relative = pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404); response.end("Not found"); return;
  }
  response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(response);
}

http.createServer(serve).listen(port, "127.0.0.1", () => {
  console.log(`APDB_ISOLATED_BROWSER_URL=http://127.0.0.1:${port}/index_online.html?secureResults=1`);
});
