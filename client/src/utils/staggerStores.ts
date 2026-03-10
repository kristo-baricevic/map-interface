import type { Store } from "../types";

/** Distance in degrees under which two positions are considered overlapping (~15m at 40°N). */
const OVERLAP_THRESHOLD = 0.00015;

/** Step between staggered markers along the "horizontal" axis (~20m at 40°N). */
const STAGGER_STEP = 0.00025;

/** Map uses bearing 29° (Manhattan grid). Perpendicular to grid = left/right on screen. */
const GRID_BEARING_DEG = 29;
const RAD = Math.PI / 180;
const GRID_EAST_PER_NORTH = Math.tan(GRID_BEARING_DEG * RAD);
/** Unit vector (lat, lng) for "right" on screen: perpendicular to grid direction (1, GRID_EAST_PER_NORTH). */
const RIGHT_LAT = GRID_EAST_PER_NORTH / Math.hypot(1, GRID_EAST_PER_NORTH);
const RIGHT_LNG = -1 / Math.hypot(1, GRID_EAST_PER_NORTH);

function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = lat2 - lat1;
  const dlng = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/**
 * Groups store indices by cluster: stores within OVERLAP_THRESHOLD of each other
 * (or transitively linked) end up in the same cluster (connected components).
 */
function buildClusters(stores: Store[]): number[][] {
  const n = stores.length;
  const adjacent: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = stores[i]!;
      const b = stores[j]!;
      if (distance(a.lat, a.lng, b.lat, b.lng) <= OVERLAP_THRESHOLD) {
        adjacent[i].push(j);
        adjacent[j].push(i);
      }
    }
  }

  const visited = new Set<number>();
  const clusters: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;
    const cluster: number[] = [];
    const stack = [i];
    visited.add(i);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      cluster.push(cur);
      for (const j of adjacent[cur]) {
        if (!visited.has(j)) {
          visited.add(j);
          stack.push(j);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/**
 * Returns a copy of stores with lng/lat adjusted so that stores at the same
 * or nearly the same position are staggered left/right on the same vertical axis
 * (perpendicular to the map's 29° grid) instead of stacked or diagonally.
 */
export function staggerOverlappingStores(stores: Store[]): Store[] {
  if (stores.length === 0) return [];

  const clusters = buildClusters(stores);
  const result = stores.map((s) => ({ ...s }));

  for (const indices of clusters) {
    if (indices.length <= 1) continue;

    const group = indices.map((i) => stores[i]!);
    const avgLat = group.reduce((s, st) => s + st.lat, 0) / group.length;
    const avgLng = group.reduce((s, st) => s + st.lng, 0) / group.length;

    indices.sort((a, b) => stores[a]!.lng - stores[b]!.lng || stores[a]!.id.localeCompare(stores[b]!.id));

    indices.forEach((storeIndex, i) => {
      const step = (i - (indices.length - 1) / 2) * STAGGER_STEP;
      result[storeIndex]!.lat = avgLat + step * RIGHT_LAT;
      result[storeIndex]!.lng = avgLng + step * RIGHT_LNG;
    });
  }

  return result;
}
