# Store click tracking

Clicks on store markers and drawer links are logged append-only to disk for marketing and post-campaign export.

## Log files

- **Location**: `logs/` under the server working directory (override with `CLICK_LOG_DIR`).
- **Naming**: `store_clicks_YYYY_MM.log` (one file per month).
- **Format**: One JSON object per line (NDJSON). Fields:
  - `storeId`, `storeName`, `button`, `t` (ms), `ip`, `visitorId`, `userAgent`

## Button values

| `button`         | Meaning                          |
|------------------|----------------------------------|
| `map_marker`     | Click on store pin on the map    |
| `drawer_instagram` | Instagram link in store drawer |
| `drawer_facebook`  | Facebook link in store drawer  |
| `drawer_vip`       | VIP Pass “here” link in drawer  |

## Export to CSV

From the **server** directory:

```bash
# All months to stdout
node scripts/export-clicks-to-csv.js

# One month (e.g. March 2026) to stdout
node scripts/export-clicks-to-csv.js 2026_03

# One month to a file
node scripts/export-clicks-to-csv.js 2026_03 store_clicks_2026_03.csv
```

CSV columns: `storeId`, `storeName`, `button`, `timestamp_ms`, `timestamp_iso`, `ip`, `visitorId`, `userAgent`.

## Visitor ID

The server sets a long-lived cookie `vid` (UUID) on first request. Same cookie = same visitor for repeat-session counts. IP is logged for geo and fraud checks.
