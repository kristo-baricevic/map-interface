# Store data

Replace `stores.json` with your own data. Each store must have:

- `id` (string, unique)
- `name` (string)
- `address` (string)
- `hours` (string, e.g. "Mon–Fri 9am–6pm")
- `deal` (string, e.g. "10% off one drink")
- `iconUrl` (string, URL to PNG for the pindrop; can be relative or absolute)
- `lng` (number, longitude)
- `lat` (number, latitude)

You can have up to 30 (or more) stores. The API serves this file as-is.
