import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  IconCompass,
  IconBrandInstagram,
  IconBrandFacebook,
  IconX,
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
/** Pixel height of marker icon; used to offset popup when shown above. */
const MARKER_PIXEL_HEIGHT = 40;
/** Padding (px) from map container edge so popup is never flush against it. */
const POPUP_CONTAINER_PADDING = 12;
/** Estimated popup dimensions for fit checks – use CSS max so we never assume it's smaller than it is. */
const POPUP_ESTIMATED_WIDTH = 320;
const POPUP_ESTIMATED_HEIGHT = 400;
/** Extra margin inside container; treat popup as off-screen if within this of the edge. */
const POPUP_SAFETY_MARGIN = 24;

/** Breakpoint below which we show the bottom-sheet popup instead of the map-anchored one. */
const MOBILE_MAX_WIDTH_PX = 768;

/** Stores ordered for Madison (lat then lng) for prev/next nav. */
function useStoresByMadison(stores: Store[]): Store[] {
  return useMemo(
    () => [...stores].sort((a, b) => a.lat - b.lat || a.lng - b.lng),
    [stores],
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/** Shared tooltip body for popup and mobile bottom sheet. */
function StoreTooltipBody({ store }: { store: Store }) {
  return (
    <div className="store-tooltip">
      <h3 className="store-tooltip-name">{store.name}</h3>
      <p className="store-tooltip-address">{store.address}</p>
      <p className="store-tooltip-hours">{store.hours}</p>
      <p className="store-tooltip-deal">{store.deal}</p>
      {(store.instagram ?? store.facebook) && (
        <p className="store-tooltip-social">
          {store.instagram && (
            <a
              href={`https://www.instagram.com/${store.instagram.replace(/^@/, "")}/`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram: ${store.instagram}`}
            >
              <IconBrandInstagram size={20} stroke={1.5} />
              <span>{store.instagram}</span>
            </a>
          )}
          {store.facebook && (
            <a
              href={`https://www.facebook.com/${store.facebook}/`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Facebook: ${store.facebook}`}
            >
              <IconBrandFacebook size={20} stroke={1.5} />
              <span>{store.facebook}</span>
            </a>
          )}
        </p>
      )}
      {(store.iconUrl ?? store.icon) && (
        <p className="store-tooltip-link">
          <a
            href={store.iconUrl ?? getLocalIconUrl(store.icon!)}
            target="_blank"
            rel="noopener noreferrer"
          >
            File / link
          </a>
        </p>
      )}
      <p className="store-tooltip-vip">
        Get your Spring Down Madison VIP Pass{" "}
        <a href="https://92ny.org" target="_blank" rel="noopener noreferrer">
          here
        </a>{" "}
        to unlock exclusive experiences &amp; shopping incentives. Proceeds support The 92nd Street Y, New York.
      </p>
    </div>
  );
}

/** Custom compass: click and drag to rotate (bearing) and tilt (pitch) the map. */
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
        border: "none",
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
        onClick={() => pan(0, -PAN_PX)}
        aria-label="Pan up (up the street)"
      >
        <IconChevronUp size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-left"
        onClick={() => pan(-PAN_PX, 0)}
        aria-label="Pan left"
      >
        <IconChevronLeft size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-right"
        onClick={() => pan(PAN_PX, 0)}
        aria-label="Pan right"
      >
        <IconChevronRight size={20} stroke={2} />
      </button>
      <button
        type="button"
        className="map-pan-btn map-pan-down"
        onClick={() => pan(0, PAN_PX)}
        aria-label="Pan down (down the street)"
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

/** Manhattan's grid is ~29° east of true north; rotate map so avenues run straight up/down. */
const MANHATTAN_GRID_BEARING = 29;

const INITIAL_VIEW_STATE = {
  longitude: CARNEGIE_HILL_CENTER.lng,
  latitude: CARNEGIE_HILL_CENTER.lat,
  zoom: INITIAL_ZOOM,
  bearing: MANHATTAN_GRID_BEARING,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

export default function MapViewMapbox({
  mapboxToken,
  stores,
}: MapViewMapboxProps) {
  const isMobile = useIsMobile();
  const storesByMadison = useStoresByMadison(stores);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "left"
    | "right"
  >("bottom");
  const [popupLngLat, setPopupLngLat] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const mapInstanceRef = useRef<MapboxMap | null>(null);

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

  /** Position tooltip so it never covers the icon and doesn’t get cut off at map edges. */
  useEffect(() => {
    if (!selectedStore || !mapInstanceRef.current || isMobile) return;
    const map = mapInstanceRef.current;
    const point = map.project([selectedStore.lng, selectedStore.lat]);
    const container = map.getContainer();
    const width = container?.clientWidth ?? 400;
    const height = container?.clientHeight ?? 400;
    const pad = POPUP_CONTAINER_PADDING;
    const margin = POPUP_SAFETY_MARGIN;
    const popupH = Math.min(POPUP_ESTIMATED_HEIGHT, Math.floor(height * 0.7));
    const popupW = Math.min(POPUP_ESTIMATED_WIDTH, width - 2 * (pad + margin));
    const halfW = popupW / 2;

    const spaceBelow = height - point.y - pad;
    const spaceAbove = point.y - pad;
    const spaceLeft = point.x - pad;
    const spaceRight = width - point.x - pad;

    const fitsBelow = spaceBelow >= popupH;
    const fitsAbove = spaceAbove >= popupH;
    const preferBelow = fitsBelow;
    const showAbove = !preferBelow && fitsAbove;

    const useLeft = spaceRight < halfW || (spaceLeft < halfW && spaceLeft < spaceRight);
    const useRight = spaceLeft < halfW || (spaceRight < halfW && spaceRight < spaceLeft);

    let anchor: typeof popupAnchor;
    if (showAbove) {
      anchor = useRight ? "bottom-right" : useLeft ? "bottom-left" : "bottom";
    } else {
      anchor = useRight ? "top-right" : useLeft ? "top-left" : "top";
    }

    function popupRect(
      px: number,
      py: number,
      w: number,
      h: number,
      a: typeof popupAnchor,
    ): { left: number; right: number; top: number; bottom: number } {
      switch (a) {
        case "top":
          return { left: px - w / 2, right: px + w / 2, top: py, bottom: py + h };
        case "bottom":
          return { left: px - w / 2, right: px + w / 2, top: py - h, bottom: py };
        case "top-left":
          return { left: px, right: px + w, top: py, bottom: py + h };
        case "top-right":
          return { left: px - w, right: px, top: py, bottom: py + h };
        case "bottom-left":
          return { left: px, right: px + w, top: py - h, bottom: py };
        case "bottom-right":
          return { left: px - w, right: px, top: py - h, bottom: py };
        default:
          return { left: px - w / 2, right: px + w / 2, top: py, bottom: py + h };
      }
    }

    const anchorIsAbove =
      anchor === "bottom" ||
      anchor === "bottom-left" ||
      anchor === "bottom-right";
    const anchorPointY = anchorIsAbove ? point.y - MARKER_PIXEL_HEIGHT : point.y;

    const rect = popupRect(point.x, anchorPointY, popupW, popupH, anchor);
    const minX = pad + margin;
    const maxX = width - pad - margin;
    const minY = pad + margin;
    const maxY = height - pad - margin;

    const needsPan =
      rect.left < minX ||
      rect.right > maxX ||
      rect.top < minY ||
      rect.bottom > maxY;

    const targetX = width / 2;
    const targetY = Math.max(
      minY + 20,
      Math.min(height / 3, height - popupH - pad - margin),
    );

    const setPopupState = () => {
      setPopupAnchor(anchor);
      if (anchorIsAbove) {
        const topOfIcon = map.unproject([point.x, point.y - MARKER_PIXEL_HEIGHT]);
        setPopupLngLat({ lng: topOfIcon.lng, lat: topOfIcon.lat });
      } else {
        setPopupLngLat({ lng: selectedStore.lng, lat: selectedStore.lat });
      }
    };

    if (needsPan) {
      setPopupLngLat(null);
      const dx = point.x - targetX;
      const dy = point.y - targetY;
      map.panBy([dx, dy], { duration: 300 });
      map.once("moveend", setPopupState);
    } else {
      setPopupState();
    }
  }, [selectedStore, isMobile]);

  /** Mobile only: pan so the selected marker is in the top 1/3 when using arrows. */
  useEffect(() => {
    if (!isMobile || !selectedStore || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const container = map.getContainer();
    const width = container?.clientWidth ?? 400;
    const height = container?.clientHeight ?? 400;
    const pad = POPUP_CONTAINER_PADDING;
    const topThirdY = height / 3;

    const runPan = () => {
      const m = mapInstanceRef.current;
      if (!m) return;
      const point = m.project([selectedStore.lng, selectedStore.lat]);
      const dy = point.y - topThirdY;
      let dx = 0;
      const minX = pad;
      const maxX = width - pad;
      if (point.x < minX) dx = point.x - minX;
      else if (point.x > maxX) dx = point.x - maxX;
      if (dx !== 0 || dy !== 0) {
        m.panBy([dx, dy], { duration: 300 });
      }
    };

    const id = requestAnimationFrame(() => {
      runPan();
    });
    return () => cancelAnimationFrame(id);
  }, [selectedStore, isMobile]);

  const handleMapClick = useCallback(() => {
    setSelectedStore(null);
  }, []);

  /** Store map ref for compass, force grid bearing, and remove POI label layers. */
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
        // ignore if already removed
      }
    });
  }, []);

  return (
    <div className="map-container">
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        reuseMaps={false}
      >
        <NavigationControl position="top-right" showCompass={false} showZoom />
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
        {!isMobile && selectedStore && popupLngLat && (
          <Popup
            longitude={popupLngLat.lng}
            latitude={popupLngLat.lat}
            anchor={popupAnchor}
            onClose={() => {
              setSelectedStore(null);
              setPopupLngLat(null);
            }}
            closeButton
            closeOnClick={false}
            className="store-popup"
          >
            <StoreTooltipBody store={selectedStore} />
            <div className="store-popup-footer">
              <div className="store-drawer-nav">
                <button
                  type="button"
                  className="store-drawer-nav-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (prevStore) setSelectedStore(prevStore);
                  }}
                  aria-label="Previous (down Madison)"
                  title="Previous (down Madison)"
                >
                  <IconChevronLeft size={24} stroke={2} />
                </button>
                <button
                  type="button"
                  className="store-drawer-nav-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (nextStore) setSelectedStore(nextStore);
                  }}
                  aria-label="Next (up Madison)"
                  title="Next (up Madison)"
                >
                  <IconChevronRight size={24} stroke={2} />
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>
      {isMobile && selectedStore && (
        <div
          className="store-popup-mobile"
          role="dialog"
          aria-label={selectedStore.name}
        >
          <div className="store-popup-mobile-inner">
            <button
              type="button"
              className="store-popup-mobile-close"
              onClick={() => setSelectedStore(null)}
              aria-label="Close"
            >
              <IconX size={24} stroke={2} />
            </button>
            <StoreTooltipBody store={selectedStore} />
            <div className="store-popup-footer">
              <div className="store-drawer-nav">
                <button
                  type="button"
                  className="store-drawer-nav-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (prevStore) setSelectedStore(prevStore);
                  }}
                  aria-label="Previous (down Madison)"
                  title="Previous (down Madison)"
                >
                  <IconChevronLeft size={24} stroke={2} />
                </button>
                <button
                  type="button"
                  className="store-drawer-nav-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (nextStore) setSelectedStore(nextStore);
                  }}
                  aria-label="Next (up Madison)"
                  title="Next (up Madison)"
                >
                  <IconChevronRight size={24} stroke={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CompassControl mapRef={mapInstanceRef} />
    </div>
  );
}
