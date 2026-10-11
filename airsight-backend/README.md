# AIRSIGHT Backend

REST + WebSocket API for AIRSIGHT. It serves the same scenario-based
simulator the frontend used to run client-side — readings, a 4-hour PM2.5
forecast, AI source classification, contextual advisories, and per-node map
data — over HTTP and a live WebSocket feed.

It is architected so a real Arduino UNO Q (or any gateway relaying its
serial/MQTT output) can take over at any time: `POST /api/ingest/reading`
with a real sensor payload switches the server from `dataSource: "simulated"`
to `dataSource: "hardware"` immediately, and every derived value (forecast,
source detection, advisories) is recomputed from the real data. If hardware
goes quiet for `HARDWARE_STALE_MS` (default 30s), the server falls back to
the simulator automatically instead of freezing or serving stale data.

## Run it

```bash
npm install
cp .env.example .env   # then set a real INGEST_API_KEY before exposing this publicly
npm run dev             # ts-node/tsx dev server with reload
# or
npm run build && npm start
```

Default port is `4000` (see `.env`).

## REST API

| Method | Path                     | Description                                                   |
| ------ | ------------------------ | --------------------------------------------------------------|
| GET    | `/api/health`            | Liveness + current data source                                |
| GET    | `/api/readings/current`  | Latest `Reading`                                               |
| GET    | `/api/readings/history`  | `?range=1H\|6H\|12H\|24H` (default `6H`) history array         |
| GET    | `/api/forecast`          | `NOW` + 4 hourly `ForecastPoint`s                              |
| GET    | `/api/source`            | Probable pollution source + ranked confidence                 |
| GET    | `/api/advisory`          | Contextual recommendation cards for the current reading        |
| GET    | `/api/nodes`             | All 5 map nodes with derived PM2.5/band                        |
| GET    | `/api/demo/state`        | Current scenario/network/AI/data-source flags                  |
| POST   | `/api/demo/scenario`     | Body `{ "scenario": "normal\|traffic\|construction\|cooking\|burning" }` |
| POST   | `/api/demo/network`      | Body `{ "online": boolean }`                                   |
| POST   | `/api/demo/ai`           | Body `{ "enabled": boolean }`                                  |
| POST   | `/api/ingest/reading`    | Real hardware ingestion. Requires header `x-ingest-key: <INGEST_API_KEY>`. Body: `{ pm25, pm10, co, co2, no2, voc, temp, humidity }` (all numbers). |

Invalid input returns `400` with a Zod issue list. The ingest route returns
`401` for a missing/wrong key and `503` if `INGEST_API_KEY` isn't set at all
— ingestion is refused by default rather than left open.

## WebSocket feed

Connect to `ws://localhost:4000/ws`.

- On connect you get one `{"type":"snapshot", history, forecast, source, advisories, mapNodes, demoState}` message with full current state.
- After that, every tick (simulated or hardware-driven) sends `{"type":"tick", reading, demoState, forecast, source, advisories, mapNodes}`.

This is enough for a client to render the whole dashboard from the WebSocket
feed alone, with the REST endpoints available for anything that wants a
one-off read (e.g. first paint before the socket connects).

## Wiring this into the AIRSIGHT frontend

The frontend's `src/hooks/useAirSightState.tsx` currently runs the simulator
in-browser. To point it at this backend instead: replace its local
`setInterval` tick with a WebSocket subscription to `/ws`, replace the
initial `seedHistory(...)` call with a fetch to `/api/readings/history`, and
forward the `DemoController`'s scenario/network/AI toggles to the three
`POST /api/demo/*` endpoints instead of calling the context setters directly.
Nothing about the frontend's component tree needs to change — only this one
hook.

## Project layout

```
src/
 ├── server.ts         entry point: HTTP server + WebSocket + ticking loop
 ├── app.ts             Express app: CORS, JSON body parsing, routes
 ├── config.ts           env-driven config
 ├── types/              shared domain types
 ├── data/                scenario profiles, source signatures, map nodes,
 │                        the simulator, and the advisory builder
 ├── engine/
 │   └── stateStore.ts    single in-process source of truth (history,
 │                        scenario, demo flags, simulated/hardware mode)
 ├── routes/              one file per REST resource
 ├── ws/
 │   └── broadcaster.ts   WebSocket server wired to the state store
 └── middleware/          error handling, 404s
```
