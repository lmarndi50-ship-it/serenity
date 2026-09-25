# AirNode UI

Frontend for the Edge AI air-quality node (Problem Statement 1, Arduino UNO Q).

It is served **by the board itself** over its local Wi-Fi/hotspot, and must
work with no internet at all: no CDNs, no web fonts, no online map tiles.

## Run it

```bash
npm install
npm run dev:mock   # fake data, no hardware needed; this is where you'll spend most time
npm run dev        # real data; set the board's address in vite.config.js (server.proxy)
npm run lint
npm run build      # produces dist/, which gets copied onto the board
```

## How it fits together

```
Sensors → STM32 (MCU side) → Linux side: Python, models, SQLite
        → Socket.IO "reading" events → this app in a phone/laptop browser
```

- `DATA_CONTRACT.md`: the JSON the board sends. Agree it with the team first.
- `src/data/useNodeData.js`: the **only** file that knows mock vs real.
- `src/data/mockNode.js`: a fake board that replays a scripted morning.
- `src/lib/aqi.js`: CPCB AQI table and colours.
- `src/components/`: one file per screen piece.

## Your learning path

Every place marked `TODO(you)` is an exercise. Suggested order:

1. **Read the contract and the hook.** Understand why components never import socket.io.
2. **ActionCards**: cap at 3, sort by priority, add icons.
3. **SourceCard**: say "Unclear" when confidence < 0.5.
4. **PollutantGrid**: grey out dead sensors (`null`). Test it by setting a reading to `null` in the mock.
5. **AqiHero**: add a one-line health note per category.
6. **ForecastChart**: shade AQI category bands with Recharts `ReferenceArea`.
7. **NodeMap**: add a real campus image in `public/` and measure node positions.
8. **Connect to the board**: confirm event names, add `/api/history`, run `npm run dev` against it.
9. **Deploy**: `npm run build`, copy `dist/` to the board, and test with your laptop's internet **off**.

## Before the demo

- Test with the router unplugged: the "Internet: offline" light and the records-waiting count should update while everything else keeps working.
- `npm run build:mock` gives a build with the scripted mock. Use it as a fallback demo if the sensors misbehave, and keep the MOCK DATA badge visible. Don't pass mock data off as real.
- The JS bundle is ~190 KB gzipped, mostly Recharts. That's fine on local Wi-Fi. If it loads slowly on a weak hotspot, swap the chart for a hand-drawn SVG.
