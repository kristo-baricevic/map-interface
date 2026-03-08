import { useCallback, useState } from "react";
import Map, { Marker, Popup, NavigationControl, useMap } from "react-map-gl";
import {
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCoffee,
  IconBuildingStore,
  IconPizza,
  IconFlower,
  IconShirt,
  IconBook,
  IconMusic,
  IconCake,
  IconGift,
  IconMug,
  IconBread,
  IconCar,
  IconBus,
  IconBike,
  IconHeart,
  IconStar,
  IconHome,
  IconDiamond,
  IconCamera,
  IconCookie,
  IconIceCream,
  IconBuildingBank,
  IconShoppingCart,
  IconShoppingBag,
  IconSalad,
  IconToolsKitchen2,
  IconGlassFull,
  IconPalette,
  IconBarbell,
  IconScissors,
} from "@tabler/icons-react";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Store } from "./types";
import {
  getLocalIconUrl,
  getStoreMarkerIconUrl,
  DEFAULT_MARKER_ICON,
} from "./types";

/** Tabler icon name → component for map markers (accepts size, stroke). */
const TABLER_ICONS = {
  Coffee: IconCoffee,
  BuildingStore: IconBuildingStore,
  Pizza: IconPizza,
  Flower: IconFlower,
  Shirt: IconShirt,
  Book: IconBook,
  Music: IconMusic,
  Cake: IconCake,
  Gift: IconGift,
  Mug: IconMug,
  Bread: IconBread,
  Car: IconCar,
  Bus: IconBus,
  Bike: IconBike,
  Heart: IconHeart,
  Star: IconStar,
  Home: IconHome,
  Diamond: IconDiamond,
  Camera: IconCamera,
  Cookie: IconCookie,
  IceCream: IconIceCream,
  BuildingBank: IconBuildingBank,
  ShoppingCart: IconShoppingCart,
  ShoppingBag: IconShoppingBag,
  Salad: IconSalad,
  ToolsKitchen2: IconToolsKitchen2,
  GlassFull: IconGlassFull,
  Palette: IconPalette,
  Barbell: IconBarbell,
  Scissors: IconScissors,
} as Record<string, React.ComponentType<{ size?: number; stroke?: number }>>;

/** Carnegie Hill: 86th–98th St, Fifth Ave–Third Ave (Upper East Side). */
const CARNEGIE_HILL_CENTER = { lng: -73.95607, lat: 40.784726 };
const INITIAL_ZOOM = 15;
const PAN_PX = 80;

/** Pan arrows overlay (Mapbox). useMap() returns { current } (map ref), not { map }. */
function PanControlsMapbox() {
  const { current: mapRef } = useMap();

  const pan = useCallback(
    (dx: number, dy: number) => {
      mapRef?.panBy([dx, dy], { duration: 150 });
    },
    [mapRef],
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

interface MapViewMapboxProps {
  mapboxToken: string;
  stores: Store[];
}

const MARKER_ICON_SIZE = 32;

function StoreMarkerMapbox({
  store,
  onSelect,
  isSelected,
}: {
  store: Store;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const [useDefaultIcon, setUseDefaultIcon] = useState(false);
  const iconSrc = useDefaultIcon
    ? getLocalIconUrl(DEFAULT_MARKER_ICON)
    : getStoreMarkerIconUrl(store);
  const TablerIcon =
    store.iconTabler != null ? TABLER_ICONS[store.iconTabler] : undefined;

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
      {TablerIcon ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            color: "#333",
            backgroundColor: "#fff",
            borderRadius: "50%",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <TablerIcon size={MARKER_ICON_SIZE} stroke={1.8} />
        </span>
      ) : (
        <img
          src={iconSrc}
          alt=""
          width={40}
          height={40}
          onError={() => setUseDefaultIcon(true)}
          style={{ display: "block", objectFit: "contain" }}
        />
      )}
    </button>
  );
}

const INITIAL_VIEW_STATE = {
  longitude: CARNEGIE_HILL_CENTER.lng,
  latitude: CARNEGIE_HILL_CENTER.lat,
  zoom: INITIAL_ZOOM,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

export default function MapViewMapbox({
  mapboxToken,
  stores,
}: MapViewMapboxProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  const handleMapClick = useCallback(() => {
    setSelectedStore(null);
  }, []);

  /** Sync view state on every move so pan/zoom/trackpad stay smooth and compass stays in sync. */
  const handleMove = useCallback(
    (evt: { viewState: typeof INITIAL_VIEW_STATE }) => {
      setViewState(evt.viewState);
    },
    [],
  );

  /** Remove only POI/business label layers; keep street names and other road/place labels. */
  const handleMapLoad = useCallback((e: { target: MapboxMap }) => {
    const map = e.target;
    const style = map.getStyle();
    if (!style?.layers) return;
    const poiLabelLayerIds = style.layers
      .filter(
        (layer) =>
          layer.type === "symbol" &&
          (layer.id.toLowerCase().includes("poi") ||
            layer.id.toLowerCase().includes("point-of-interest")),
      )
      .map((layer) => layer.id);
    poiLabelLayerIds.forEach((id) => {
      try {
        map.removeLayer(id);
      } catch {
        // ignore if already removed
      }
    });
  }, []);

  return (
    <div className="map-container">
      <Map
        mapboxAccessToken={mapboxToken}
        viewState={viewState as Parameters<typeof Map>[0]["viewState"]}
        onMove={handleMove}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        reuseMaps={false}
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
