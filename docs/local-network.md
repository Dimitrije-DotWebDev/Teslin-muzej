# Access from another computer on the LAN

Run the backend normally on the laptop (`http://localhost:5095`) and start the frontend with `npm run dev` from `client/`. Open the network URL printed by webpack, for example `http://192.168.1.42:8080`, on the other computer.

The frontend defaults to `/api`. The webpack development server listens on all interfaces and proxies `/api` and `/uploads` to `http://127.0.0.1:5095` on the laptop. This keeps catalog, GLBs and thumbnails on the same browser origin, so no additional backend LAN binding or CORS wildcard is necessary. Existing `?api=...` and `TESLA_MUSEUM_API_URL` overrides still take precedence; remove an old localhost override when using LAN access.

Restart `npm run dev` after changing webpack's server configuration. The terminal prints the actual port, which can differ from 8080 if that port is already occupied. The frontend must be reachable through the laptop's firewall on the private network; if the page already loads from another computer, this part is already working.

For a production/static deployment, configure the hosting server to reverse-proxy `/api` and `/uploads` to the backend as well, or supply an explicit externally reachable API URL with matching CORS settings.

Verification: `node client/tests/lan-access.test.cjs`.
