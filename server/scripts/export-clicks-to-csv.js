#!/usr/bin/env node
/**
 * Export store click logs to CSV.
 * Usage:
 *   node scripts/export-clicks-to-csv.js [YYYY_MM] [output.csv]
 * Examples:
 *   node scripts/export-clicks-to-csv.js              # all months in logs/, stdout
 *   node scripts/export-clicks-to-csv.js 2026_03     # one month to stdout
 *   node scripts/export-clicks-to-csv.js 2026_03 out.csv
 *
 * Log dir: LOG_DIR env or ./logs relative to cwd.
 */

import fs from "fs";
import path from "path";

const LOG_DIR = process.env.CLICK_LOG_DIR ?? path.join(process.cwd(), "logs");
const monthArg = process.argv[2];
const outArg = process.argv[3];

function readLogFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function toCsvRow(record) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [
    record.storeId,
    record.storeName,
    record.button,
    record.t,
    new Date(record.t).toISOString(),
    record.ip,
    record.visitorId,
    record.userAgent,
  ].map(esc).join(",");
}

const header =
  "storeId,storeName,button,timestamp_ms,timestamp_iso,ip,visitorId,userAgent";

let files = [];
if (monthArg && !monthArg.endsWith(".csv")) {
  const name = `store_clicks_${monthArg}.log`;
  files = [path.join(LOG_DIR, name)];
} else {
  if (!fs.existsSync(LOG_DIR)) {
    console.error("No logs dir:", LOG_DIR);
    process.exit(1);
  }
  files = fs
    .readdirSync(LOG_DIR)
    .filter((f) => f.startsWith("store_clicks_") && f.endsWith(".log"))
    .sort()
    .map((f) => path.join(LOG_DIR, f));
}

const rows = [header];
for (const file of files) {
  const records = readLogFile(file);
  for (const r of records) {
    rows.push(toCsvRow(r));
  }
}

const out = outArg
  ? fs.createWriteStream(outArg, { encoding: "utf8" })
  : process.stdout;
out.write(rows.join("\n") + "\n");
if (out !== process.stdout) out.end();
if (out !== process.stdout) console.log("Wrote", rows.length - 1, "rows to", outArg);
