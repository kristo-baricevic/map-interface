import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { appendClick } from "../clickLog.js";

const router = Router();

const MAX_STRING = 500;

function getVisitorId(req: Request, res: Response): string {
  const raw = req.headers.cookie;
  const match = raw?.match(/\bvid=([a-f0-9-]{36})\b/i);
  if (match) return match[1]!;
  const vid = randomUUID();
  res.setHeader("Set-Cookie", `vid=${vid}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return vid;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? "";
}

function sanitize(s: unknown, maxLen: number): string {
  if (s == null || typeof s !== "string") return "";
  return s.slice(0, maxLen).replace(/[\n\r]/g, " ");
}

router.post("/", (req: Request, res: Response) => {
  const { storeId, storeName, button } = req.body ?? {};

  if (!storeId || typeof storeId !== "string") {
    return res.sendStatus(400);
  }

  const record = {
    storeId: sanitize(storeId, MAX_STRING),
    storeName: sanitize(storeName, MAX_STRING),
    button: sanitize(button, 100) || "unknown",
    t: Date.now(),
    ip: getClientIp(req),
    visitorId: getVisitorId(req, res),
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, MAX_STRING) : "",
  };

  appendClick(record);
  res.sendStatus(200);
});

export default router;
