# Data contract: board → UI

Agree this with the backend / ML team **before** anyone writes more code.
The mock (`src/data/mockNode.js`) produces exactly this shape, so the UI can
be finished before the hardware works.

## Live reading

Pushed by the board over Socket.IO, event name `reading`, every few seconds.

```json
{
  "node_id": "node-01",
  "ts": "2026-09-25T08:30:00+05:30",
  "readings": {
    "pm25": 82, "pm10": 140, "co": 1.2, "co2": 610, "no2": 38,
    "voc_index": 180, "temp": 31.2, "humidity": 64
  },
  "aqi": { "value": 168, "category": "Moderate", "dominant": "pm25" },
  "forecast": [ { "ts": "2026-09-25T09:30:00+05:30", "aqi": 175 } ],
  "source": {
    "label": "traffic",
    "confidence": 0.72,
    "alternatives": [ { "label": "construction_dust", "confidence": 0.18 } ]
  },
  "advice": [ { "text": "Keep windows closed until 11:00", "priority": "high", "type": "window" } ],
  "status": {
    "online": false,
    "last_sync": "2026-09-25T06:00:00+05:30",
    "power": "battery",
    "buffered_records": 1420
  }
}
```

| Field | Rules |
|---|---|
| `readings.*` | Units: PM in µg/m³, CO and CO₂ in ppm, NO₂ in ppb, VOC as the sensor's index, temp in °C, humidity in %. **`null` if a sensor is dead**, never the last good value. |
| `aqi` | Computed **on the board** using India's CPCB National AQI. Categories: Good, Satisfactory, Moderate, Poor, Very Poor, Severe. |
| `forecast` | 3–6 points, hourly, from the on-device time-series model. |
| `source.label` | One of `traffic`, `garbage_burning`, `construction_dust`, `cooking_smoke`, `crop_burning`, `clean`. New labels need a UI label in `src/lib/labels.js`. |
| `source.confidence` | 0–1, the classifier's own probability. Don't round it up. |
| `advice.priority` | `high` (do now), `medium` (today), `low` (tip). |
| `advice.type` | One of `window`, `fan`, `route`, `indoor`. Picks the icon shown in `ActionCards`. New types need an entry in `ACTION_ICON` there. Don't infer it from `text` on the UI side — if a new action doesn't fit these, add a type rather than matching keywords. |
| `status.online` | Whether the **board** has internet. Not the same as whether the page can reach the board. |

## Other endpoints (to agree)

- Socket.IO event `nodes`: an array of `{ node_id, name, x, y, aqi, source, online }` for the campus map. `x`/`y` are percentages on the map image.
- `GET /api/history?hours=6`: an array of past readings, **one averaged point per 10 minutes**, so a page refresh doesn't start with an empty chart.
