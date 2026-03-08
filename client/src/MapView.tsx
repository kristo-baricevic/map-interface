import { useCallback, useState } from "react";
import Map, { Marker, Popup, NavigationControl, useMap } from "react-map-gl/maplibre";
import { IconMapPin, IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Store } from "./types";
import { getLocalIconUrl } from "./types";

const UES_CENTER = { lng: -73.966, lat: 40.769 };
const UES_ZOOM = 14;

/** Basemap with fewer labels (Alidade Smooth – muted, fewer POIs; Stadia, free on localhost). */
const FREE_STYLE = {
  version: 8 as const,
  name: 'Alidade Smooth',
  sources: {
    'osm-raster': {
      type: 'raster' as const,
      tiles: [
        'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'osm-raster-layer',
      type: 'raster' as const,
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const PAN_PX = 80;

/** Pan arrows (up/down/left/right) overlay. */
function PanControls() {
  const { map } = useMap();
  const pan = useCallback(
    (dx: number, dy: number) => {
      map?.panBy([dx, dy], { duration: 150 });
    },
    [map]
  );
  return (
    <div className="map-pan-controls" role="group" aria-label="Pan map">
      <button
        type="button"
        className="map-pan-btn map-pan-up"
        onClick={() => pan(0, PAN_PX)}
        aria-label="Pan up"
      >
        <IconChevronUp size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-left"
        onClick={() => pan(PAN_PX, 0)}
        aria-label="Pan left"
      >
        <IconChevronLeft size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-right"
        onClick={() => pan(-PAN_PX, 0)}
        aria-label="Pan right"
      >
        <IconChevronRight size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-down"
        onClick={() => pan(0, -PAN_PX)}
        aria-label="Pan down"
      >
        <IconChevronDown size={20} stroke={2} />
      </button>
    </div>
  );
}

interface MapViewProps {
  stores: Store[];
}

function StoreMarker({
  store,
  onSelect,
  isSelected,
}: {
  store: Store;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const [iconError, setIconError] = useState(false);
  const iconSrc =
    store.icon != null ? getLocalIconUrl(store.icon) : store.iconUrl;
  const usePlaceholder = !iconSrc || iconError;

  return (
    <button
      type="button"
      className="store-marker"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      aria-label={store.name}
      style={{
        border: isSelected ? "3px solid #0d6efd" : "none",
        borderRadius: "50%",
        padding: 0,
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {usePlaceholder ? (
        <span className="store-marker-placeholder" aria-hidden>
          <IconMapPin size={36} stroke={2} color="#0d6efd" />
        </span>
      ) : (
        <img
          src={iconSrc}
          alt=""
          width={40}
          height={40}
          onError={() => setIconError(true)}
          style={{ display: "block", objectFit: "contain" }}
        />
      )}
    </button>
  );
}

export default function MapView({ stores }: MapViewProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const handleMapClick = useCallback(() => {
    setSelectedStore(null);
  }, []);

  return (
    <div className="map-container">
      <Map
        initialViewState={{
          longitude: UES_CENTER.lng,
          latitude: UES_CENTER.lat,
          zoom: UES_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={FREE_STYLE}
        onClick={handleMapClick}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass showZoom />
        <PanControls />
        {stores.map((store) => (
          <Marker
            key={store.id}
            longitude={store.lng}
            latitude={store.lat}
            anchor="bottom"
            onClick={(e: { originalEvent?: Event }) =>
              e.originalEvent?.stopPropagation()
            }
          >
            <StoreMarker
              store={store}
              isSelected={selectedStore?.id === store.id}
              onSelect={() =>
                setSelectedStore(selectedStore?.id === store.id ? null : store)
              }
            />
          </Marker>
        ))}

        {selectedStore && (
          <Popup
            longitude={selectedStore.lng}
            latitude={selectedStore.lat}
            anchor="bottom"
            onClose={() => setSelectedStore(null)}
            closeButton
            closeOnClick={false}
            className="store-popup"
          >
            <div className="store-tooltip">
              <h3 className="store-tooltip-name">{selectedStore.name}</h3>
              <p className="store-tooltip-address">{selectedStore.address}</p>
              <p className="store-tooltip-hours">{selectedStore.hours}</p>
              <p className="store-tooltip-deal">{selectedStore.deal}</p>
              {(selectedStore.iconUrl ?? selectedStore.icon) && (
                <p className="store-tooltip-link">
                  <a
                    href={
                      selectedStore.iconUrl ??
                      getLocalIconUrl(selectedStore.icon!)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    File / link
                  </a>
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
