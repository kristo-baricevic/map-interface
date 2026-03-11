import { useCallback, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, useMap } from "react-map-gl";
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
  IconCompass,
  IconX,
  IconBrandInstagram,
  IconBrandFacebook,
} from "@tabler/icons-react";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Store } from "./types";
import {
  getLocalIconUrl,
  getStoreMarkerIconUrl,
  DEFAULT_MARKER_ICON,
} from "./types";

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

const CARNEGIE_HILL_CENTER = { lng: -73.95607, lat: 40.784726 };
const INITIAL_ZOOM = 15;
const MANHATTAN_GRID_BEARING = 29;
const INITIAL_VIEW_STATE = {
  longitude: CARNEGIE_HILL_CENTER.lng,
  latitude: CARNEGIE_HILL_CENTER.lat,
  zoom: INITIAL_ZOOM,
  bearing: MANHATTAN_GRID_BEARING,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};
/** Size (px) of icon markers when zoomed out. */
const ICON_MARKER_SIZE = 40;
/** Size (px) of Tabler icon inside the icon marker. */
const ICON_INNER_SIZE = 32;
/** Size (px) of logo markers (selected store, or all stores when zoomed in). */
const LOGO_MARKER_SIZE = 72;
/** Padding (px) inside logo markers so logos don't touch the edge. */
const LOGO_MARKER_PADDING = 4;
/** Zoom at or above which all markers switch from icons to logos. */
const LOGO_ZOOM_THRESHOLD = 15.3;

function CompassControl({
  mapRef,
}: {
  mapRef: React.RefObject<MapboxMap | null>;
}) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startBearing: number;
    startPitch: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const map = mapRef.current;
      if (!map) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startBearing: map.getBearing(),
        startPitch: map.getPitch(),
      };
    },
    [mapRef],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const map = mapRef.current;
      const drag = dragRef.current;
      if (!map || !drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const bearing = drag.startBearing + dx;
      const pitch = Math.max(0, Math.min(60, drag.startPitch + dy));
      map.setBearing(bearing);
      map.setPitch(pitch);
    },
    [mapRef],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
    dragRef.current = null;
  }, []);

  return (
    <div
      role="group"
      aria-label="Compass: drag to rotate and tilt map"
      className="map-compass-drawer"
      style={{
        position: "absolute",
        top: 80,
        right: 11,
        zIndex: 10,
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        borderRadius: 4,
        boxShadow: "0 0 0 2px rgba(0,0,0,.1)",
        cursor: dragging ? "grabbing" : "grab",
        padding: 0,
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <IconCompass size={20} stroke={1.5} style={{ pointerEvents: "none" }} />
    </div>
  );
}

/** Pan arrows overlay. Up/down pan by the full viewport height so the topmost icon becomes the bottommost. */
function PanControlsMapbox() {
  const { current: mapRef } = useMap();
  const pan = useCallback(
    (dx: number, dy: number) => {
      if (!mapRef) return;
      const container = (
        mapRef as unknown as { getContainer(): HTMLElement }
      ).getContainer();
      const h = container?.clientHeight ?? 400;
      const w = container?.clientWidth ?? 400;
      mapRef.panBy([dx * w, dy * h], { duration: 400 });
    },
    [mapRef],
  );

  return (
    <div className="map-pan-controls" role="group" aria-label="Pan map">
      <button
        type="button"
        className="map-pan-btn map-pan-up"
        onClick={() => pan(0, -1)}
        aria-label="Pan up (up the street)"
      >
        <IconChevronUp size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-left"
        onClick={() => pan(-1, 0)}
        aria-label="Pan left"
      >
        <IconChevronLeft size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-right"
        onClick={() => pan(1, 0)}
        aria-label="Pan right"
      >
        <IconChevronRight size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-down"
        onClick={() => pan(0, 1)}
        aria-label="Pan down (down the street)"
      >
        <IconChevronDown size={20} stroke={2} />
      </button>
    </div>
  );
}

function StoreMarkerMapbox({
  store,
  onSelect,
  isSelected,
  showLogo,
}: {
  store: Store;
  onSelect: () => void;
  isSelected: boolean;
  showLogo: boolean;
}) {
  const [useDefaultIcon, setUseDefaultIcon] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const logoLoadedRef = useRef(false);
  const iconSrc = useDefaultIcon
    ? getLocalIconUrl(DEFAULT_MARKER_ICON)
    : getStoreMarkerIconUrl(store);
  const TablerIcon =
    store.iconTabler != null ? TABLER_ICONS[store.iconTabler] : undefined;
  const hasLogo = Boolean(store.logoUrl) && !logoLoadFailed;
  const displayLogo = showLogo && hasLogo;

  const size = displayLogo ? LOGO_MARKER_SIZE : ICON_MARKER_SIZE;
  const padding = displayLogo ? LOGO_MARKER_PADDING : 0;

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
        padding,
        width: size,
        height: size,
        boxSizing: "border-box",
        overflow: "hidden",
        backgroundColor: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        cursor: "pointer",
        transition: "width 0.2s, height 0.2s, padding 0.2s",
      }}
    >
      {displayLogo ? (
        <img
          src={store.logoUrl}
          alt=""
          onLoad={() => {
            logoLoadedRef.current = true;
          }}
          onError={() => {
            if (!logoLoadedRef.current) setLogoLoadFailed(true);
          }}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : TablerIcon ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            color: "#333",
          }}
        >
          <TablerIcon size={ICON_INNER_SIZE} stroke={1.8} />
        </span>
      ) : (
        <img
          src={iconSrc}
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          onError={() => setUseDefaultIcon(true)}
        />
      )}
    </button>
  );
}

interface MapViewMapboxDrawerProps {
  mapboxToken: string;
  stores: Store[];
}

/** Stores ordered south to north along Madison (by lat, then lng). */
function useStoresByMadison(stores: Store[]): Store[] {
  return useMemo(
    () => [...stores].sort((a, b) => a.lat - b.lat || a.lng - b.lng),
    [stores],
  );
}

export default function MapViewMapboxDrawer({
  mapboxToken,
  stores,
}: MapViewMapboxDrawerProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  /** Last store selected (by click or nav); keeps that marker highlighted when drawer is closed. */
  const [highlightedStore, setHighlightedStore] = useState<Store | null>(null);
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);
  const zoomedIn = zoomLevel >= LOGO_ZOOM_THRESHOLD;
  const mapInstanceRef = useRef<MapboxMap | null>(null);
  const storesByMadison = useStoresByMadison(stores);

  const currentIndex = selectedStore
    ? storesByMadison.findIndex((s) => s.id === selectedStore.id)
    : -1;
  const prevStore =
    currentIndex > 0
      ? storesByMadison[currentIndex - 1]!
      : (storesByMadison[storesByMadison.length - 1] ?? null);
  const nextStore =
    currentIndex >= 0 && currentIndex < storesByMadison.length - 1
      ? storesByMadison[currentIndex + 1]!
      : (storesByMadison[0] ?? null);

  const handleSelectStore = useCallback((store: Store | null) => {
    setSelectedStore(store);
    if (store) setHighlightedStore(store);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedStore(null);
  }, []);

  const handleMapLoad = useCallback((e: { target: MapboxMap }) => {
    const map = e.target;
    mapInstanceRef.current = map;
    map.setBearing(MANHATTAN_GRID_BEARING);
    map.setPitch(0);
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
        // ignore
      }
    });
  }, []);

  return (
    <>
      <div className="map-container">
        <Map
          mapboxAccessToken={mapboxToken}
          initialViewState={INITIAL_VIEW_STATE}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onClick={handleMapClick}
          onLoad={handleMapLoad}
          onZoom={(e) => setZoomLevel(e.viewState.zoom)}
          reuseMaps={false}
        >
          <div
            className="map-floral-frame"
            aria-hidden
            style={{
              position: "absolute",
              top: -20,
              left: -20,
              width: "min(200px, 38vw)",
              height: "auto",
              pointerEvents: "none",
              zIndex: 1,
              background: "transparent",
            }}
          >
            <img
              src="/butterfly.png"
              alt=""
              className="map-floral-frame-img"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                transform: "scaleX(-1)",
                objectFit: "contain",
                objectPosition: "top right",
                background: "transparent",
              }}
            />
          </div>
          <NavigationControl
            position="top-right"
            showCompass={false}
            showZoom
          />
          <PanControlsMapbox />
          {stores.map((store) => {
            const selected =
              (selectedStore ?? highlightedStore)?.id === store.id;
            return (
              <Marker
                key={store.id}
                longitude={store.lng}
                latitude={store.lat}
                anchor="bottom"
                style={{ zIndex: selected ? 10 : 1 }}
                onClick={(e: { originalEvent?: Event }) =>
                  e.originalEvent?.stopPropagation()
                }
              >
                <StoreMarkerMapbox
                  store={store}
                  isSelected={selected}
                  showLogo={zoomedIn || selectedStore?.id === store.id}
                  onSelect={() =>
                    handleSelectStore(
                      selectedStore?.id === store.id ? null : store,
                    )
                  }
                />
              </Marker>
            );
          })}
        </Map>
        <CompassControl mapRef={mapInstanceRef} />
      </div>
      <aside
        className={`store-drawer ${selectedStore ? "store-drawer-open" : ""}`}
        aria-label="Store details"
        aria-hidden={!selectedStore}
      >
        <div className="store-drawer-inner">
          <div className="store-drawer-header">
            <button
              type="button"
              className="store-drawer-close"
              onClick={() => setSelectedStore(null)}
              aria-label="Close drawer (marker stays highlighted)"
            >
              <IconX size={24} stroke={2} />
            </button>
          </div>

          {selectedStore && (
            <div className="store-drawer-body">
              <div className="store-tooltip store-drawer-content">
                {selectedStore.logoUrl && (
                  <img
                    src={selectedStore.logoUrl}
                    alt={`${selectedStore.name} logo`}
                    style={{
                      display: "block",
                      maxWidth: 80,
                      maxHeight: 80,
                      objectFit: "contain",
                      margin: "0 auto 8px",
                    }}
                  />
                )}
                <h3 className="store-tooltip-name">{selectedStore.name}</h3>
                <p className="store-tooltip-address">{selectedStore.address}</p>
                <p className="store-tooltip-hours">{selectedStore.hours}</p>
                {(selectedStore.instagram ?? selectedStore.facebook) && (
                  <p className="store-tooltip-social">
                    {selectedStore.instagram && (
                      <a
                        href={`https://www.instagram.com/${selectedStore.instagram.replace(/^@/, "")}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Instagram: ${selectedStore.instagram}`}
                      >
                        <IconBrandInstagram size={20} stroke={1.5} />
                        <span>{selectedStore.instagram}</span>
                      </a>
                    )}
                    {selectedStore.facebook && (
                      <a
                        href={`https://www.facebook.com/${selectedStore.facebook}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Facebook: ${selectedStore.facebook}`}
                      >
                        <IconBrandFacebook size={20} stroke={1.5} />
                        <span>{selectedStore.facebook}</span>
                      </a>
                    )}
                  </p>
                )}
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
            </div>
          )}
          {selectedStore && (
            <div className="store-drawer-footer">
              <p className="store-drawer-vip">
                Get your Spring Down Madison VIP Pass{" "}
                <a
                  href="https://www.92ny.org/support-92ny/m/madisonave?utm_source=qr_code&utm_medium=flyer&utm_campaign=madave&utm_content=madave"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  here
                </a>{" "}
                to unlock exclusive experiences &amp; shopping incentives.
                Proceeds support The 92nd Street Y, New York.
              </p>
              <div className="store-drawer-nav">
                <button
                  type="button"
                  className="store-drawer-nav-btn"
                  onClick={() => prevStore && handleSelectStore(prevStore)}
                  aria-label="Previous (down Madison)"
                  title="Previous (down Madison)"
                >
                  <IconChevronLeft size={24} stroke={2} />
                </button>
                <button
                  type="button"
                  className="store-drawer-nav-btn"
                  onClick={() => nextStore && handleSelectStore(nextStore)}
                  aria-label="Next (up Madison)"
                  title="Next (up Madison)"
                >
                  <IconChevronRight size={24} stroke={2} />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
