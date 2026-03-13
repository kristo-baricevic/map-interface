import fs from "fs";
import path from "path";

const LOG_DIR = process.env.CLICK_LOG_DIR ?? path.join(process.cwd(), "logs");

function getLogPath(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const name = `store_clicks_${y}_${m}.log`;
  return path.join(LOG_DIR, name);
}

/** Ensure logs directory exists. Call once at startup or first write. */
function ensureLogDir(): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export interface ClickRecord {
  storeId: string;
  storeName: string;
  button: string;
  t: number;
  ip: string;
  visitorId: string;
  userAgent: string;
}

/**
 * Append one click event as a single JSON line.
 * Uses monthly rotation: store_clicks_YYYY_MM.log
 */
export function appendClick(record: ClickRecord): void {
  ensureLogDir();
  const line = JSON.stringify(record) + "\n";
  fs.appendFile(getLogPath(), line, () => {});
}
