export interface Store {
  id: string;
  name: string;
  address: string;
  hours: string;
  deal: string;
  /** Local icon name from assets (e.g. "cafe" → /assets/icons/cafe.svg). Use this when using mapbox-assets. */
  icon?: string;
  /** URL to PNG/svg for the pindrop (used if icon is not set). */
  iconUrl?: string;
  lng: number;
  lat: number;
}

/** Icon names available under /assets/icons/ (from mapbox-assets sprite_images). */
export const LOCAL_ICON_NAMES = [
  'arrow', 'bicycle', 'building', 'bus', 'cafe', 'car', 'circle', 'circle-stroked',
  'cross', 'diamond', 'grocery', 'heart', 'home', 'jewelry-store', 'parking',
  'restaurant', 'rocket', 'shop', 'square', 'star', 'suitcase', 'triangle',
] as const;

export function getLocalIconUrl(name: string): string {
  return `/assets/icons/${name}.svg`;
}
