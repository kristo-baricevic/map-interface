export interface Store {
  id: string;
  name: string;
  address: string;
  hours: string;
  deal: string;
  /** URL to PNG icon for the pindrop */
  iconUrl?: string;
  /** Tabler icon name (e.g. "Coffee") for map marker */
  iconTabler?: string;
  /** Longitude (e.g. -73.966) */
  lng: number;
  /** Latitude (e.g. 40.769) */
  lat: number;
}

export type StoresResponse = Store[];
