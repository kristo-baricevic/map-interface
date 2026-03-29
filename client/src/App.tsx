import { useCallback, useEffect, useState } from "react";
import MapViewMapboxDrawer from "./MapViewMapboxDrawer";
import type { Store } from "./types";

/** Load stores from the API (`server/src/data/stores.json`). */
async function loadStores(): Promise<Store[]> {
  let res: Response;
  try {
    res = await fetch("/api/stores");
  } catch {
    throw new Error(
      "Could not reach the API. Run the dev server from the repo root (npm run dev) so /api is proxied.",
    );
  }
  if (!res.ok) {
    throw new Error(
      `Failed to load stores (${res.status}). Ensure the API server is running.`,
    );
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid stores response from API.");
  }
  return data;
}

/** Load Mapbox token from API (optional). */
async function loadMapboxToken(): Promise<string> {
  try {
    const res = await fetch("/api/mapbox/config");
    if (res.ok) {
      const data = await res.json();
      return data.accessToken ?? "";
    }
  } catch {
    // ignore
  }
  return "";
}

async function patchStoreCoords(
  id: string,
  lng: number,
  lat: number,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/stores/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lng, lat }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadStores(), loadMapboxToken()])
      .then(([storeData, token]) => {
        if (!cancelled) {
          setStores(storeData);
          setMapboxToken(token);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStoreMove = useCallback(
    (id: string, lng: number, lat: number) => {
      setStores((prev) =>
        prev.map((s) => (s.id === id ? { ...s, lng, lat } : s)),
      );
      patchStoreCoords(id, lng, lat);
    },
    [],
  );

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading map…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <p>{error}</p>
      </div>
    );
  }

  const canUseMapbox = mapboxToken.length > 0;

  return (
    <main className="app">
      <div id="map-panel" className="app-map-panel">
        {canUseMapbox && (
          <MapViewMapboxDrawer
            mapboxToken={mapboxToken}
            stores={stores}
            // editMode={editMode}
            // onEditModeToggle={() => setEditMode((v) => !v)}
            onStoreMove={handleStoreMove}
          />
        )}
        {!canUseMapbox && (
          <div className="app-map-unavailable">
            <p>Mapbox needs an access token.</p>
            <p className="app-map-unavailable-hint">
              Run the API server with <code>MAPBOX_ACCESS_TOKEN</code> set.
            </p>
          </div>
        )}
        {stores.length === 0 && canUseMapbox && (
          <p className="app-no-stores-hint">
            No stores loaded. Add entries to{" "}
            <code>server/src/data/stores.json</code>.
          </p>
        )}
      </div>
    </main>
  );
}
