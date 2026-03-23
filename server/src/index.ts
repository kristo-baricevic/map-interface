import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import storesRouter from "./routes/stores.js";
import mapboxRouter from "./routes/mapbox.js";
import storeClickRouter from "./routes/storeClick.js";
import adminRouter from "./routes/admin.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * Client static files (index.html, assets). Default: repo layout with server/dist and client/dist.
 * Override with CLIENT_DIST when deploy puts the client build elsewhere (e.g. ./public).
 */
const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.cwd(), process.env.CLIENT_DIST)
  : path.join(__dirname, "..", "..", "client", "dist");

const isProduction = process.env.NODE_ENV === "production";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/stores", storesRouter);
app.use("/api/mapbox", mapboxRouter);
app.use("/api/store-click", storeClickRouter);
app.use("/admin", adminRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// In production (or when explicitly serving build), serve the built client from client/dist.
// In development, use the Vite dev server (npm run dev) so you get the current app, not a stale build.
if (isProduction) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("*", (_req, res) => {
    res.set("Content-Type", "text/html");
    res.send(
      `<!DOCTYPE html><html><body><p>Dev server: use the <strong>Vite</strong> app at <a href="http://localhost:5173">http://localhost:5173</a> (API here is on :${PORT}).</p></body></html>`
    );
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
