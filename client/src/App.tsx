import { useCallback, useEffect, useState } from "react";
import MapViewMapboxDrawer from "./MapViewMapboxDrawer";
import type { Store } from "./types";

/** Load stores: try API first, then fall back to local /stores.json. */
async function loadStores(): Promise<Store[]> {
  try {
    const res = await fetch("/api/stores");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {
    // API not available; use local file
  }
  const local = await fetch("/stores.json");
  if (!local.ok) return [];
  const data = await local.json();
  return Array.isArray(data) ? data : [];
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

async function patchStoreCoords(id: string, lng: number, lat: number): Promise<boolean> {
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
  const [editMode, setEditMode] = useState(false);

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
      {/* <header className="app-header">
        <div className="app-header-row">
          <div className="app-header-left">
            <img
              src="https://www.92ny.org/getmedia/cc83767a-db0c-486a-abe5-54ef56da7c91/logo_1.svg"
              alt="92nd Street Y"
              className="app-header-logo"
            />
            <h1 className="app-title">Spring Down Madison</h1>
          </div>
        </div>
        <p className="app-subtitle">Tap a pin to open the drawer</p>
      </header> */}

      <div id="map-panel" className="app-map-panel">
        {canUseMapbox && (
          <MapViewMapboxDrawer
            mapboxToken={mapboxToken}
            stores={stores}
            editMode={editMode}
            onEditModeToggle={() => setEditMode((v) => !v)}
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
            No stores loaded. Add data to <code>public/stores.json</code> or run
            the API.
          </p>
        )}
      </div>
    </main>
  );
}
