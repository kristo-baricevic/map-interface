import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { trackStoreClick } from "./trackStoreClick";
import { staggerOverlappingStores } from "./utils/staggerStores";

/** Map icon URL (path) to display category for the legend. */
const ICON_URL_TO_CATEGORY: Record<string, string> = {
  "/assets/new-icons/Shirt--Streamline-Flex.svg": "Apparel",
  "/assets/new-icons/Object-Diamond-Ring--Streamline-Nova (1).png": "Jewelry",
  "/assets/new-icons/Candle--Streamline-Atlas.svg": "Home Goods",
  "/assets/new-icons/Blazer--Streamline-Ultimate.png": "Jackets & Outerwear",
  "/assets/new-icons/Baby-Carriage--Streamline-Font-Awesome.svg": "Kids & Baby",
  "/assets/new-icons/Wine-Bottle--Streamline-Font-Awesome.svg":
    "Wine & Spirits",
  "/assets/new-icons/Perfume--Streamline-Solar-Ar.svg": "Perfume & Fragrance",
  "/assets/new-icons/Office-Building-2--Streamline-Sharp-Remix.svg":
    "Office & Organization",
  "/assets/new-icons/Hanging-Frame--Streamline-Atlas.svg": "Art & Museum",
  "/assets/new-icons/Chocolate--Streamline-Sharp.png": "Chocolate & Candy",
  "/assets/new-icons/Lipstick--Streamline-Core-Remix.svg": "Beauty & Skincare",
  "/assets/new-icons/Handbag-Fill--Streamline-Remix-Fill.svg":
    "Bags & Accessories",
  "/assets/new-icons/Scissors-2--Streamline-Ultimate.svg": "Salon & Services",
  "/assets/new-icons/Glasses-Sun-Circle--Streamline-Ultimate.png": "Eyewear",
  "/assets/new-icons/Restaurant-Fill--Streamline-Rounded-Fill-Streamline-Material-Free.svg":
    "Restaurant",
};

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

const INITIAL_ZOOM = 15;
const MANHATTAN_GRID_BEARING = 29;
const INITIAL_VIEW_STATE = {
  longitude: -73.9666,
  latitude: 40.7704,
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
const VIP_PASS_URL =
  "https://www.92ny.org/support-92ny/m/madisonave?utm_source=qr_code&utm_medium=flyer&utm_campaign=madave&utm_content=madave";

/** Drawer: stronger scale inside fixed slot (does not move copy). Exact `Store.name`. */
const DRAWER_LOGO_SCALE_UP_STORE_NAMES = new Set<string>(["PAUL MORELLI"]);

function drawerLogoImgClassName(storeName: string): string {
  if (DRAWER_LOGO_SCALE_UP_STORE_NAMES.has(storeName)) {
    return "store-drawer-logo store-drawer-logo--scale-up";
  }
  return "store-drawer-logo";
}

function renderAdCopyWithVipLink(adCopy: string, store: Store) {
  const hereRegex = /\bhere\b/i;
  const match = adCopy.match(hereRegex);
  if (!match || match.index == null) return adCopy;

  const before = adCopy.slice(0, match.index);
  const hereWord = match[0];
  const after = adCopy.slice(match.index + hereWord.length);

  return (
    <>
      {before}
      <a
        href={VIP_PASS_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackStoreClick(store, "drawer_vip")}
      >
        {hereWord}
      </a>
      {after}
    </>
  );
}

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
  editMode = false,
}: {
  store: Store;
  onSelect: () => void;
  isSelected: boolean;
  showLogo: boolean;
  editMode?: boolean;
}) {
  const [useDefaultIcon, setUseDefaultIcon] = useState(false);
  const [iconUrlLoadFailed, setIconUrlLoadFailed] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const logoLoadedRef = useRef(false);
  const iconSrc = useDefaultIcon
    ? getLocalIconUrl(DEFAULT_MARKER_ICON)
    : getStoreMarkerIconUrl(store);
  const TablerIcon =
    store.iconTabler != null ? TABLER_ICONS[store.iconTabler] : undefined;
  const hasLogo = Boolean(store.logoUrl) && !logoLoadFailed;
  const displayLogo = showLogo && hasLogo;
  /** Prefer new-icons (iconUrl) over Tabler icon when set and loading succeeded. */
  const useIconImage = Boolean(store.iconUrl) && !iconUrlLoadFailed;

  const size = displayLogo ? LOGO_MARKER_SIZE : ICON_MARKER_SIZE;
  const padding = displayLogo ? LOGO_MARKER_PADDING : 0;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <button
        type="button"
        className="store-marker"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        aria-label={store.name}
        style={{
          border: isSelected
            ? "3px solid #0d6efd"
            : editMode
              ? "2px dashed #f59e0b"
              : "none",
          borderRadius: "50%",
          padding,
          width: size,
          height: size,
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: "#fff",
          boxShadow: editMode
            ? "0 0 0 2px rgba(245,158,11,0.3), 0 1px 3px rgba(0,0,0,0.2)"
            : "0 1px 3px rgba(0,0,0,0.2)",
          cursor: editMode ? "grab" : "pointer",
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
        ) : useIconImage ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <img
              src={store.iconUrl}
              alt=""
              style={{
                display: "block",
                width: ICON_INNER_SIZE,
                height: ICON_INNER_SIZE,
                objectFit: "contain",
              }}
              onError={() => setIconUrlLoadFailed(true)}
            />
          </span>
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
      {editMode && (
        <span className="store-marker-edit-label">{store.name}</span>
      )}
    </div>
  );
}

interface MapViewMapboxDrawerProps {
  mapboxToken: string;
  stores: Store[];
  editMode?: boolean;
  // onEditModeToggle?: () => void;
  onStoreMove?: (id: string, lng: number, lat: number) => void;
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
  editMode = false,
  // onEditModeToggle,
  onStoreMove,
}: MapViewMapboxDrawerProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  /** Last store selected (by click or nav); keeps that marker highlighted when drawer is closed. */
  const [highlightedStore, setHighlightedStore] = useState<Store | null>(null);
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);
  const [legendOpen, setLegendOpen] = useState(false);
  const zoomedIn = zoomLevel >= LOGO_ZOOM_THRESHOLD;
  const mapInstanceRef = useRef<MapboxMap | null>(null);
  const storesByMadison = useStoresByMadison(stores);
  /** Map positions for markers: stagger overlaps along Madison; true coords in edit mode (for dragging). */
  const displayCoordsById = useMemo(() => {
    const m = new globalThis.Map<string, { lng: number; lat: number }>();
    if (editMode) {
      for (const s of stores) m.set(s.id, { lng: s.lng, lat: s.lat });
      return m;
    }
    const staggered = staggerOverlappingStores(stores);
    stores.forEach((s, i) => {
      m.set(s.id, { lng: staggered[i]!.lng, lat: staggered[i]!.lat });
    });
    return m;
  }, [stores, editMode]);

  /** Unique icon + category entries for the legend (from stores that have iconUrl). */
  const legendEntries = useMemo((): { iconUrl: string; category: string }[] => {
    const byUrl: Record<string, string> = {};
    for (const store of stores) {
      if (store.iconUrl) {
        byUrl[store.iconUrl] = ICON_URL_TO_CATEGORY[store.iconUrl] ?? "Other";
      }
    }
    return Object.entries(byUrl)
      .map(([iconUrl, category]) => ({ iconUrl, category }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [stores]);

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

  useEffect(() => {
    if (!selectedStore || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const container = map.getContainer();
    if (!container) return;

    const coords = displayCoordsById.get(selectedStore.id);
    if (!coords) return;

    const id = requestAnimationFrame(() => {
      const m = mapInstanceRef.current;
      if (!m) return;
      const point = m.project([coords.lng, coords.lat]);
      const w = container.clientWidth;
      const h = container.clientHeight;
      const pad = 80;

      const inView =
        point.x >= pad &&
        point.x <= w - pad &&
        point.y >= pad &&
        point.y <= h - pad;

      if (!inView) {
        const dx = point.x - w / 2;
        const dy = point.y - h / 2;
        m.panBy([dx, dy], { duration: 400 });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [selectedStore, displayCoordsById]);

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
          attributionControl={false}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
          onZoom={(e) => setZoomLevel(e.viewState.zoom)}
          reuseMaps={false}
        >
          <div
            className="map-floral-frame map-floral-frame-stacked-logos"
            aria-hidden
          >
            <img
              src="/stacked_logos.png"
              alt=""
              className="map-floral-frame-img"
            />
          </div>
          <div
            className="map-floral-frame map-floral-frame-butterfly"
            aria-hidden
          >
            <img
              src="/animated_butterfly.png"
              alt=""
              className="map-floral-frame-img"
            />
          </div>

          <div
            className="map-floral-frame map-floral-frame-greenery"
            aria-hidden
            style={{
              position: "absolute",
              bottom: -20,
              right: -20,
              width: "min(300px, 38vw)",
              height: "auto",
              pointerEvents: "none",
              zIndex: 1,
              background: "transparent",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <img
              src="/greenery.png"
              alt=""
              className="map-floral-frame-img"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                // transform: "scaleX(-1)",
                objectFit: "contain",
                objectPosition: "top right",
                background: "transparent",
              }}
            />{" "}
          </div>
          <NavigationControl
            position="top-right"
            showCompass={false}
            showZoom
          />
          <PanControlsMapbox />
          <button
            type="button"
            className="map-legend-btn"
            onClick={() => setLegendOpen(true)}
            aria-label="Open legend"
          >
            Legend
          </button>
          {/* {onEditModeToggle && (
            <button
              type="button"
              className={`map-edit-btn${editMode ? " map-edit-btn--active" : ""}`}
              onClick={onEditModeToggle}
              aria-label={editMode ? "Exit edit mode" : "Enter edit mode"}
            >
              {editMode ? "Done Editing" : "Edit Pins"}
            </button>
          )} */}
          {editMode && (
            <div className="map-edit-banner">
              Drag pins to reposition &middot; coordinates save automatically
            </div>
          )}
          {stores.map((store) => {
            const pos = displayCoordsById.get(store.id) ?? {
              lng: store.lng,
              lat: store.lat,
            };
            const selected =
              (selectedStore ?? highlightedStore)?.id === store.id;
            return (
              <Marker
                key={store.id}
                longitude={pos.lng}
                latitude={pos.lat}
                anchor="bottom"
                draggable={editMode}
                style={{
                  zIndex: selected ? 10 : 1,
                  cursor: editMode ? "grab" : "pointer",
                }}
                onClick={(e: { originalEvent?: Event }) =>
                  e.originalEvent?.stopPropagation()
                }
                onDragEnd={(e) => {
                  if (editMode && onStoreMove && e.lngLat) {
                    onStoreMove(store.id, e.lngLat.lng, e.lngLat.lat);
                  }
                }}
              >
                <StoreMarkerMapbox
                  store={store}
                  isSelected={selected}
                  showLogo={zoomedIn || selectedStore?.id === store.id}
                  onSelect={() => {
                    if (!editMode) {
                      if (selectedStore?.id !== store.id)
                        trackStoreClick(store, "map_marker");
                      handleSelectStore(
                        selectedStore?.id === store.id ? null : store,
                      );
                    }
                  }}
                  editMode={editMode}
                />
              </Marker>
            );
          })}
        </Map>
        <CompassControl mapRef={mapInstanceRef} />
      </div>
      {legendOpen && (
        <div
          className="map-legend-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-legend-title"
          onClick={() => setLegendOpen(false)}
        >
          <div
            className="map-legend-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="map-legend-header">
              <h2 id="map-legend-title" className="map-legend-title">
                Legend
              </h2>
              <button
                type="button"
                className="map-legend-close"
                onClick={() => setLegendOpen(false)}
                aria-label="Close legend"
              >
                <IconX size={24} stroke={2} />
              </button>
            </div>
            <ul className="map-legend-list">
              {legendEntries.map(({ iconUrl, category }) => (
                <li key={iconUrl} className="map-legend-item">
                  <img src={iconUrl} alt="" className="map-legend-icon" />
                  <span className="map-legend-category">{category}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
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
                <div className="store-drawer-logo-slot">
                  {selectedStore.logoUrl ? (
                    <img
                      src={selectedStore.logoUrl}
                      alt={`${selectedStore.name} logo`}
                      className={drawerLogoImgClassName(selectedStore.name)}
                    />
                  ) : (
                    <div
                      className="store-drawer-logo-placeholder"
                      aria-hidden
                    />
                  )}
                </div>
                <h3 className="store-tooltip-name">{selectedStore.name}</h3>
                <p className="store-tooltip-address">{selectedStore.address}</p>
                <p className="store-tooltip-hours">{selectedStore.hours}</p>
                {selectedStore.adCopy && (
                  <p className="store-tooltip-ad-copy">
                    {renderAdCopyWithVipLink(
                      selectedStore.adCopy,
                      selectedStore,
                    )}
                  </p>
                )}
                {(selectedStore.instagram ?? selectedStore.facebook) && (
                  <p className="store-tooltip-social">
                    {selectedStore.instagram && (
                      <a
                        href={`https://www.instagram.com/${selectedStore.instagram.replace(/^@/, "")}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Instagram: ${selectedStore.instagram}`}
                        onClick={() =>
                          trackStoreClick(selectedStore, "drawer_instagram")
                        }
                      >
                        <IconBrandInstagram size={20} stroke={1.5} />
                        <span>{selectedStore.instagram}</span>
                      </a>
                    )}
                    {selectedStore.facebook && (
                      <a
                        href={`https://www.facebook.com/${selectedStore.facebook}${selectedStore.facebook.startsWith("profile.php?") ? "" : "/"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Facebook: ${selectedStore.facebook}`}
                        onClick={() =>
                          trackStoreClick(selectedStore, "drawer_facebook")
                        }
                      >
                        <IconBrandFacebook size={20} stroke={1.5} />
                        <span>{selectedStore.facebook}</span>
                      </a>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
          {selectedStore && (
            <div className="store-drawer-footer">
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
