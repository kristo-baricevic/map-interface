# Map Interface – Upper East Side

Mobile-first React app with a map of the Upper East Side (Manhattan), custom pindrops (local SVG icons or PNG URLs), and tap-to-open tooltips.

## Two ways to run

### 1. Local only (no API, no Mapbox token)

Uses **MapLibre GL** with a free OSM-based style and **local assets** from your `mapbox-assets` folder (or the copies in this repo).

- **Map**: Free [OSM Bright](https://openmaptiles.github.io/osm-bright-gl-style/) style, no API key.
- **Icons**: SVGs in `client/public/assets/icons/` (cafe, shop, grocery, restaurant, etc.).
- **Stores**: Loaded from `client/public/stores.json` (or from the API if it’s running).

From the project root:

```bash
cd client && npm install && npm run dev
```

Open http://localhost:5173. No server or token required.

**Store data** in `client/public/stores.json` can use an `icon` field with a local asset name instead of `iconUrl`:

- `"icon": "cafe"` → uses `/assets/icons/cafe.svg`
- Available names: `arrow`, `bicycle`, `building`, `bus`, `cafe`, `car`, `circle`, `circle-stroked`, `cross`, `diamond`, `grocery`, `heart`, `home`, `jewelry-store`, `parking`, `restaurant`, `rocket`, `shop`, `square`, `star`, `suitcase`, `triangle`.

### 2. With API (optional)

Run the Node API for store data and (if you add Mapbox back) a token:

```bash
npm run dev
```

- API: http://localhost:3000  
- Client: http://localhost:5173 (proxies `/api` to the server)

If the API is up, the app loads stores from `GET /api/stores`; otherwise it falls back to `client/public/stores.json`.

## Using your mapbox-assets folder

The SVGs from `mapbox-assets/sprite_images/` are already copied into `client/public/assets/icons/`. To refresh from your Downloads folder:

```bash
cp -r /Users/kristo/Downloads/mapbox-assets/sprite_images/* client/public/assets/icons/
```

Your `style.json` in mapbox-assets uses Mapbox-hosted basemaps and sprites, so it still needs the Mapbox API. This app uses the **local SVGs only** as pindrop icons and a **free MapLibre style** for the base map so it can run without any API.

## Store schema

Each store (in `stores.json` or API) can have:

- `id`, `name`, `address`, `hours`, `deal` (text, e.g. `"10% off one drink"`)
- `lng`, `lat` (numbers)
- **Icon**: either `icon` (local name, e.g. `"cafe"`) or `iconUrl` (full URL to PNG/svg)

## Tech

- **Frontend**: React 18, Vite, TypeScript, react-map-gl (MapLibre), @tabler/icons-react
- **Optional backend**: Express, TypeScript, `server/data/stores.json`
