# AIRSIGHT — Hyperlocal Air Intelligence

An immersive web interface demonstrating an Arduino UNO Q Edge AI air-quality
node: sense → understand → identify source → forecast → recommend action —
all running locally on-device.

This is a visualization and storytelling layer for a hackathon prototype. It
ships with a local **data simulation engine** so the full experience works
without connected hardware; every simulated value is labeled as such in the
UI. The architecture is built so real Arduino UNO Q telemetry can later
replace `src/hooks/useAirSightState.tsx`'s simulated stream via a
WebSocket/MQTT/local-network bridge without touching the rest of the app.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Three.js / React Three Fiber
· Framer Motion · Recharts · Lucide icons.

## Structure

```
src/
 ├── components/   ui/ (design-system primitives) + layout/ (nav, footer, background, demo controller)
 ├── sections/     one component per page section (Hero, LiveDashboard, Forecast, ...)
 ├── three/        the procedural Edge AI node 3D scene
 ├── data/         scenario profiles, source signatures, node/hardware definitions
 ├── hooks/        useAirSightState (simulation engine + demo controls), a11y hooks
 ├── utils/        AQI banding, formatting helpers
 └── types/        shared domain types
```

## Running locally

```bash
npm install
npm run dev       # start dev server
npm run build     # typecheck + production build
npm run lint      # oxlint
```

## Demo mode

The floating control panel (bottom right) lets you switch between simulated
pollution scenarios (Normal, Traffic, Construction, Cooking, Burning) and
toggle network/AI state — every section (dashboard, source detection,
forecast, advisory, map) reacts live.
