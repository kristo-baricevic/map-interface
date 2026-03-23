import { randomBytes, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import { Router, type Request } from "express";
import { CLICK_LOG_DIR, type ClickRecord } from "../clickLog.js";

const router = Router();
const ADMIN_COOKIE = "admin_session";
const MAX_ROWS = 2000;
const sessions = new Map<string, number>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

interface ClickRow extends ClickRecord {
  sourceFile: string;
}

interface Filters {
  day: string;
  store: string;
}

function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie ?? "";
  const pairs = raw.split(";");
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function getSessionToken(req: Request): string | null {
  const token = parseCookies(req)[ADMIN_COOKIE];
  if (!token) return null;
  const expiry = sessions.get(token);
  if (!expiry) return null;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return null;
  }
  return token;
}

function isAuthenticated(req: Request): boolean {
  return getSessionToken(req) != null;
}

function makeSessionCookie(token: string, isProduction: boolean): string {
  const parts = [
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/admin",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function clearSessionCookie(isProduction: boolean): string {
  const parts = [
    `${ADMIN_COOKIE}=`,
    "Path=/admin",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString();
}

function getDayKey(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

function getFilters(req: Request): Filters {
  const day = typeof req.query.day === "string" ? req.query.day.trim() : "";
  const store =
    typeof req.query.store === "string" ? req.query.store.trim() : "";
  return { day, store };
}

function getFilterOptions(rows: ClickRow[]): { days: string[]; stores: string[] } {
  const days = Array.from(
    new Set(rows.map((row) => getDayKey(row.t)).filter((value) => value))
  ).sort((a, b) => b.localeCompare(a));
  const stores = Array.from(
    new Set(rows.map((row) => row.storeName.trim()).filter((value) => value))
  ).sort((a, b) => a.localeCompare(b));
  return { days, stores };
}

function applyFilters(rows: ClickRow[], filters: Filters): ClickRow[] {
  return rows.filter((row) => {
    if (filters.day && getDayKey(row.t) !== filters.day) return false;
    if (filters.store && row.storeName !== filters.store) return false;
    return true;
  });
}

function buildQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.day) params.set("day", filters.day);
  if (filters.store) params.set("store", filters.store);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function toCsv(rows: ClickRow[]): string {
  const headers = [
    "timestamp",
    "storeName",
    "button",
    "storeId",
    "visitorId",
    "ip",
    "userAgent",
    "sourceFile",
  ];
  const escapeCsv = (value: string): string =>
    `"${value.replaceAll('"', '""')}"`;
  const lines = rows.map((row) =>
    [
      formatTimestamp(row.t),
      row.storeName,
      row.button,
      row.storeId,
      row.visitorId,
      row.ip,
      row.userAgent,
      row.sourceFile,
    ]
      .map((value) => escapeCsv(String(value ?? "")))
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function readClickRows(): ClickRow[] {
  if (!fs.existsSync(CLICK_LOG_DIR)) return [];
  const files = fs
    .readdirSync(CLICK_LOG_DIR)
    .filter((name) => name.endsWith(".log"))
    .sort()
    .reverse();

  const rows: ClickRow[] = [];
  for (const file of files) {
    const fullPath = path.join(CLICK_LOG_DIR, file);
    let content = "";
    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Partial<ClickRecord>;
        rows.push({
          storeId: String(parsed.storeId ?? ""),
          storeName: String(parsed.storeName ?? ""),
          button: String(parsed.button ?? ""),
          t: Number(parsed.t ?? 0),
          ip: String(parsed.ip ?? ""),
          visitorId: String(parsed.visitorId ?? ""),
          userAgent: String(parsed.userAgent ?? ""),
          sourceFile: file,
        });
      } catch {
        // Skip malformed lines.
      }
      if (rows.length >= MAX_ROWS) break;
    }
    if (rows.length >= MAX_ROWS) break;
  }

  rows.sort((a, b) => b.t - a.t);
  return rows;
}

function renderLoginHtml(errorMessage?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Login</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      .card { max-width: 420px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
      label, input, button { display: block; width: 100%; }
      input { margin: 8px 0 12px; padding: 8px; box-sizing: border-box; }
      button { padding: 10px; cursor: pointer; }
      .error { color: #b00020; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Admin</h1>
      ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ""}
      <form method="post" action="/admin/login">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">Sign in</button>
      </form>
    </div>
  </body>
</html>`;
}

function renderTableHtml(
  allRows: ClickRow[],
  filteredRows: ClickRow[],
  filters: Filters
): string {
  const { days, stores } = getFilterOptions(allRows);
  const tableRows = filteredRows
    .map(
      (row) => `<tr>
  <td>${escapeHtml(formatTimestamp(row.t))}</td>
  <td>${escapeHtml(row.storeName)}</td>
  <td>${escapeHtml(row.button)}</td>
  <td>${escapeHtml(row.storeId)}</td>
  <td>${escapeHtml(row.visitorId)}</td>
  <td>${escapeHtml(row.ip)}</td>
  <td>${escapeHtml(row.userAgent)}</td>
  <td>${escapeHtml(row.sourceFile)}</td>
</tr>`
    )
    .join("");

  const dayOptions = [
    `<option value="">All days</option>`,
    ...days.map(
      (day) =>
        `<option value="${escapeHtml(day)}"${filters.day === day ? " selected" : ""}>${escapeHtml(day)}</option>`
    ),
  ].join("");
  const storeOptions = [
    `<option value="">All stores</option>`,
    ...stores.map(
      (store) =>
        `<option value="${escapeHtml(store)}"${filters.store === store ? " selected" : ""}>${escapeHtml(store)}</option>`
    ),
  ].join("");

  const content = filteredRows.length
    ? `<table>
  <thead>
    <tr>
      <th>timestamp</th>
      <th>storeName</th>
      <th>button</th>
      <th>storeId</th>
      <th>visitorId</th>
      <th>ip</th>
      <th>userAgent</th>
      <th>sourceFile</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>`
    : `<p>No log records found for the selected filters.</p>`;

  const downloadUrl = `/admin/download.csv${buildQueryString(filters)}`;
  const filtersActive = Boolean(filters.day || filters.store);
  const clearUrl = "/admin";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Logs</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; }
      .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .meta { color: #666; margin: 0 0 12px; }
      .controls { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; margin-bottom: 12px; }
      .controls label { display: block; font-size: 12px; color: #555; margin-bottom: 4px; }
      .controls select { min-width: 180px; padding: 8px; }
      .controls a { text-decoration: none; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
      th { position: sticky; top: 0; background: #f5f5f5; }
      .table-wrap { overflow: auto; max-height: calc(100vh - 160px); border: 1px solid #ddd; }
      button { padding: 8px 12px; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="row">
      <h1>Store Click Logs</h1>
      <form method="post" action="/admin/logout">
        <button type="submit">Logout</button>
      </form>
    </div>
    <p class="meta">Showing ${filteredRows.length} of ${allRows.length} records from ${escapeHtml(
    CLICK_LOG_DIR
  )}</p>
    <form class="controls" method="get" action="/admin">
      <div>
        <label for="day">Day</label>
        <select id="day" name="day">${dayOptions}</select>
      </div>
      <div>
        <label for="store">Store</label>
        <select id="store" name="store">${storeOptions}</select>
      </div>
      <button type="submit">Apply filters</button>
      ${filtersActive ? `<a href="${clearUrl}"><button type="button">Clear</button></a>` : ""}
      <a href="${downloadUrl}"><button type="button">Download CSV</button></a>
    </form>
    <div class="table-wrap">${content}</div>
  </body>
</html>`;
}

router.get("/", (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res
      .status(500)
      .send("ADMIN_PASSWORD is not set. Set it before using /admin.");
  }
  if (!isAuthenticated(req)) {
    return res.status(200).send(renderLoginHtml());
  }
  const rows = readClickRows();
  const filters = getFilters(req);
  const filteredRows = applyFilters(rows, filters);
  return res.status(200).send(renderTableHtml(rows, filteredRows, filters));
});

router.post("/login", (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res
      .status(500)
      .send("ADMIN_PASSWORD is not set. Set it before using /admin.");
  }
  const submitted =
    typeof req.body?.password === "string" ? req.body.password : "";
  const ok = safeEqual(submitted, process.env.ADMIN_PASSWORD);
  if (!ok) {
    return res.status(401).send(renderLoginHtml("Incorrect password."));
  }
  const token = randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  const isProduction = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie", makeSessionCookie(token, isProduction));
  return res.redirect("/admin");
});

router.post("/logout", (req, res) => {
  const token = getSessionToken(req);
  if (token) sessions.delete(token);
  const isProduction = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie", clearSessionCookie(isProduction));
  return res.redirect("/admin");
});

router.get("/download.csv", (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res
      .status(500)
      .send("ADMIN_PASSWORD is not set. Set it before using /admin.");
  }
  if (!isAuthenticated(req)) {
    return res.status(401).send("Unauthorized");
  }
  const rows = readClickRows();
  const filters = getFilters(req);
  const filteredRows = applyFilters(rows, filters);
  const csv = toCsv(filteredRows);
  const dayPart = filters.day || "all-days";
  const storePart = filters.store
    ? filters.store.replaceAll(/[^a-z0-9]+/gi, "_").replaceAll(/^_+|_+$/g, "")
    : "all-stores";
  const filename = `store_clicks_${dayPart}_${storePart}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
});

export default router;
