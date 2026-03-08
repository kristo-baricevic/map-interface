import { useEffect, useState } from 'react';
import MapView from './MapView';
import MapViewMapbox from './MapViewMapbox';
import type { Store } from './types';

type MapMode = 'local' | 'mapbox';

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
  const [mapMode, setMapMode] = useState<MapMode>('local');
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
          <nav className="app-map-nav" role="tablist" aria-label="Map type">
            <button
              type="button"
              role="tab"
              aria-selected={mapMode === 'local'}
              aria-controls="map-panel"
              id="tab-local"
              className={`app-map-nav-btn ${mapMode === 'local' ? 'active' : ''}`}
              onClick={() => setMapMode('local')}
            >
              Local map
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mapMode === 'mapbox'}
              aria-controls="map-panel"
              id="tab-mapbox"
              className={`app-map-nav-btn ${mapMode === 'mapbox' ? 'active' : ''}`}
              onClick={() => setMapMode('mapbox')}
              title={canUseMapbox ? 'Switch to Mapbox map' : 'Mapbox token not configured'}
            >
              Mapbox
            </button>
          </nav>
        </div>
        <p className="app-subtitle">
          {mapMode === 'local'
            ? 'Tap a pin for store details · Local map, no API'
            : 'Tap a pin for store details · Mapbox'}
        </p>
      </header>

      <div id="map-panel" role="tabpanel" aria-labelledby={mapMode === 'local' ? 'tab-local' : 'tab-mapbox'} className="app-map-panel">
        {/* Keep both maps mounted and toggle visibility to avoid Marker cleanup errors when switching tabs */}
        <div className={`app-map-wrap ${mapMode === 'local' ? 'active' : 'hidden'}`}>
          <MapView stores={stores} />
        </div>
        {canUseMapbox && (
          <div className={`app-map-wrap ${mapMode === 'mapbox' ? 'active' : 'hidden'}`}>
            <MapViewMapbox mapboxToken={mapboxToken} stores={stores} />
          </div>
        )}
        {mapMode === 'mapbox' && !canUseMapbox && (
          <div className="app-map-unavailable">
            <p>Mapbox needs an access token.</p>
            <p className="app-map-unavailable-hint">Run the API server with <code>MAPBOX_ACCESS_TOKEN</code> set, or switch to Local map.</p>
          </div>
        )}
        {stores.length === 0 && mapMode === 'local' && (
          <p className="app-no-stores-hint">No stores loaded. Add data to <code>public/stores.json</code> or run the API.</p>
        )}
      </div>
    </main>
  );
}
