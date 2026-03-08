import { useCallback, useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  useMap,
} from "react-map-gl";
import { IconMapPin, IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Store } from "./types";
import { getLocalIconUrl } from "./types";

const UES_CENTER = { lng: -73.966, lat: 40.769 };
const UES_ZOOM = 14;
const PAN_PX = 80;

/** Pan arrows overlay (Mapbox). */
function PanControlsMapbox() {
  const { map } = useMap();
  const pan = useCallback(
    (dx: number, dy: number) => {
      map?.panBy([dx, dy], { duration: 150 });
    },
    [map]
  );
  return (
    <div className="map-pan-controls" role="group" aria-label="Pan map">
      <button type="button" className="map-pan-btn map-pan-up" onClick={() => pan(0, PAN_PX)} aria-label="Pan up">
        <IconChevronUp size={20} stroke={2} />
      </button>
      <button type="button" className="map-pan-btn map-pan-left" onClick={() => pan(PAN_PX, 0)} aria-label="Pan left">
        <IconChevronLeft size={20} stroke={2} />
      </button>
      <button type="button" className="map-pan-btn map-pan-right" onClick={() => pan(-PAN_PX, 0)} aria-label="Pan right">
        <IconChevronRight size={20} stroke={2} />
      </button>
      <button type="button" className="map-pan-btn map-pan-down" onClick={() => pan(0, -PAN_PX)} aria-label="Pan down">
        <IconChevronDown size={20} stroke={2} />
      </button>
    </div>
  );
}

interface MapViewMapboxProps {
  mapboxToken: string;
  stores: Store[];
}

function StoreMarkerMapbox({
  store,
  onSelect,
  isSelected,
}: {
  store: Store;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const [iconError, setIconError] = useState(false);
  const iconSrc = store.icon != null ? getLocalIconUrl(store.icon) : store.iconUrl;
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

export default function MapViewMapbox({ mapboxToken, stores }: MapViewMapboxProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const handleMapClick = useCallback(() => {
    setSelectedStore(null);
  }, []);

  return (
    <div className="map-container">
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: UES_CENTER.lng,
          latitude: UES_CENTER.lat,
          zoom: UES_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={handleMapClick}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass showZoom />
        <PanControlsMapbox />
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
            <StoreMarkerMapbox
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
