import { Router } from "express";

const router = Router();
// const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1Ijoia3Jpc3RvLWJhcmljZXZpYyIsImEiOiJjbW1oMGs3NzYwYXlrMnFxMHZ3dTZuYjZ6In0.DOORMMb6JxS5U75DQqenFQ";

console.log("MAPBOX_ACCESS_TOKEN -->", MAPBOX_ACCESS_TOKEN);

/**
 * Returns Mapbox config for the client (e.g. access token).
 * Client uses this to initialize the map without hardcoding the token.
 */
router.get("/config", (_req, res) => {
  res.json({
    accessToken: MAPBOX_ACCESS_TOKEN,
  });
});

/**
 * Proxies Mapbox Geocoding API. Optional server-side usage.
 * Example: GET /api/mapbox/geocode?q=lexington+ave+nyc
 */
router.get("/geocode", async (req, res) => {
  const q = req.query.q;
  if (typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ error: 'Missing or invalid query "q"' });
  }
  if (!MAPBOX_ACCESS_TOKEN) {
    return res
      .status(503)
      .json({ error: "Mapbox not configured (MAPBOX_ACCESS_TOKEN)" });
  }
  try {
    const url = new URL(
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
        encodeURIComponent(q) +
        ".json",
    );
    url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
    console.log("api call: ", url.toString());
    url.searchParams.set("limit", "5");
    const r = await fetch(url.toString());
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || r.statusText);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Geocoding failed" });
  }
});

export default router;
