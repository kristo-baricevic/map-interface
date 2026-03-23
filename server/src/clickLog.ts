import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Logs next to the server app (e.g. server/logs when run from server/dist). Override with CLICK_LOG_DIR. */
export const CLICK_LOG_DIR =
  process.env.CLICK_LOG_DIR ?? path.join(__dirname, "..", "logs");

function getLogPath(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const name = `store_clicks_${y}_${m}.log`;
  return path.join(CLICK_LOG_DIR, name);
}

/** Ensure logs directory exists. Call once at startup or first write. */
function ensureLogDir(): void {
  try {
    fs.mkdirSync(CLICK_LOG_DIR, { recursive: true });
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
