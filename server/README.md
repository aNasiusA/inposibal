# Inposibal relay

Cloudflare Worker + Durable Objects that relay WebSocket messages between two players
(room codes) and pair players for quick match.

```bash
cd server && npm install
npm run dev      # local relay on ws://localhost:8787 (the game uses it automatically on localhost)
npm run deploy   # needs `npx wrangler login` first; prints https://inposibal-relay.<you>.workers.dev
```

After deploying, set `RELAY_PROD` in `js/15-net.js` to `wss://inposibal-relay.<you>.workers.dev`.
