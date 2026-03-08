import { useEffect, useState } from 'react';
// import MapView from './MapView'; // local map – commented out, Mapbox only for now
import MapViewMapbox from './MapViewMapbox';
import type { Store } from './types';

/** Load stores: try API first, then fall back to local /stores.json. */
async function loadStores(): Promise<Store[]> {
  try {
    const res = await fetch('/api/stores');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {
    // API not available; use local file
  }
  const local = await fetch('/stores.json');
  if (!local.ok) return [];
  const data = await local.json();
  return Array.isArray(data) ? data : [];
}

/** Load Mapbox token from API (optional). */
async function loadMapboxToken(): Promise<string> {
  try {
    const res = await fetch('/api/mapbox/config');
    if (res.ok) {
      const data = await res.json();
      return data.accessToken ?? '';
    }
  } catch {
    // ignore
  }
  return '';
}

export default function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <header className="app-header">
        <div className="app-header-row">
          <h1 className="app-title">Upper East Side</h1>
          {/* Local map tab commented out – Mapbox only for now
          <nav className="app-map-nav" role="tablist" aria-label="Map type">
            <button ...>Local map</button>
            <button ...>Mapbox</button>
          </nav>
          */}
        </div>
        <p className="app-subtitle">Tap a pin for store details</p>
      </header>

      <div id="map-panel" className="app-map-panel">
        {canUseMapbox && (
          <MapViewMapbox mapboxToken={mapboxToken} stores={stores} />
        )}
        {!canUseMapbox && (
          <div className="app-map-unavailable">
            <p>Mapbox needs an access token.</p>
            <p className="app-map-unavailable-hint">Run the API server with <code>MAPBOX_ACCESS_TOKEN</code> set.</p>
          </div>
        )}
        {stores.length === 0 && canUseMapbox && (
          <p className="app-no-stores-hint">No stores loaded. Add data to <code>public/stores.json</code> or run the API.</p>
        )}
        {/* Local map – commented out
        <div className={`app-map-wrap ${mapMode === 'local' ? 'active' : 'hidden'}`}>
          <MapView stores={stores} />
        </div>
        */}
      </div>
    </main>
  );
}
