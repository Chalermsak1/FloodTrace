# FloodTrace Near-Real-Time Environmental Monitoring Pipeline

## 1. System Architecture & Core Philosophy

FloodTrace is upgraded from a periodic automatic refresh model into an event-driven, source-aware, freshness-aware, and failure-tolerant **near-real-time environmental monitoring pipeline**.

### Core Truthfulness Principle
> **FloodTrace is near-real-time only where upstream data is actually available at near-real-time frequency.**
> The system NEVER claims "real-time" when the upstream source itself does not provide real-time data.
> The terms **"near-real-time"** and **"อัปเดตอัตโนมัติ"** are used to accurately reflect upstream cadences and measured ingestion latencies.

```
Upstream Sources
 (ThaiWater API / RID / Open-Meteo)
       │
       ▼
Source-Aware Polling Scheduler (Backoff + Jitter + Circuit Breakers)
       │
       ▼
Validation & Idempotent Ingestion Engine
       │
       ▼
PostgreSQL / PostGIS (Atomic Upsert ON CONFLICT + Index-Backed)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
Spatial Monitoring Service        Real-Time Event Broadcaster
(Incremental Cache Invalidation)         │
                                         ▼
                                  Server-Sent Events (SSE)
                                  (/api/v1/realtime/events)
                                         │
                                         ▼
                                  React Web Dashboard
                                  (Auto Incremental Layer Updates)
```

---

## 2. Explicit Data Timing Model (UTC & Asia/Bangkok)

Every observation across the system tracks four explicit temporal milestones:

| Timing Field | Definition | Storage Timezone | Display Timezone |
| :--- | :--- | :--- | :--- |
| `observed_at` | When the upstream sensor recorded the observation | UTC (`TIMESTAMP WITH TIME ZONE`) | `Asia/Bangkok` (UTC+07:00) |
| `ingested_at` | When FloodTrace received and accepted the payload | UTC | `Asia/Bangkok` |
| `processed_at` | When normalization, validation, and upsert finished | UTC | `Asia/Bangkok` |
| `published_at` | When the record was dispatched to API/SSE consumers | UTC | `Asia/Bangkok` |

### Latency Measurement Model
- **Source Delay (`source_delay_seconds`):** `ingested_at - observed_at` (upstream latency)
- **Ingestion Latency (`ingestion_latency_ms`):** Network round-trip to upstream API
- **Processing Latency (`processing_latency_ms`):** Schema validation + DB upsert + cache invalidation
- **Publication Latency (`publication_latency_ms`):** SSE queue dispatch delay
- **End-to-End Latency (`end_to_end_latency_seconds`):** `published_at - observed_at`

---

## 3. Source-by-Source Cadence & Polling Strategy

| Source ID | Source Name | Data Type | Data Category | Nominal Upstream Interval | FloodTrace Poll Interval | Freshness Warning Threshold | Freshness Stale Threshold |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `thaiwater_rid_runoff` | ThaiWater Water Level | Water Level | `MEASURED_FACT` | 900s (15 min) | 180s (3 min) | 1800s (30 min) | 3600s (60 min) |
| `thaiwater_rainfall` | ThaiWater Rain Gauges | Rainfall | `MEASURED_FACT` | 900s (15 min) | 180s (3 min) | 1800s (30 min) | 3600s (60 min) |
| `openmeteo_forecast` | Open-Meteo Weather | Forecast | `FORECAST` | 3600s (1 hour) | 3600s (1 hour) | N/A (Forecast) | N/A (Forecast) |
| `rid_reservoirs` | RID Reservoir Volume | Reservoir | `OFFICIAL_RECORD` | 86400s (24 hours) | 3600s (1 hour) | 86400s (24 hours) | 172800s (48 hours) |
| `dwr_waterways` | DWR River Geometry | Reference GIS | `OFFICIAL_RECORD` | Static / Monthly | Static | N/A | N/A |
| `diw_industrial_waste`| DIW Facility Registry | Industrial GIS | `OFFICIAL_RECORD` | Static / Monthly | Static | N/A | N/A |

> [!IMPORTANT]
> **Open-Meteo is strictly a numerical weather model forecast.** It is labeled `FORECAST` and NEVER presented as a measured sensor observation.

---

## 4. Data Freshness Engine

The Data Freshness Engine computes source-aware status dynamically based on `now - observed_at` relative to the source's nominal cadence:

- **`LIVE`**: Observation age $\le \text{nominal\_interval} \times 1.2$ (fresh data)
- **`RECENT`**: Observation age $\le \text{nominal\_interval} \times 2.0$ (slightly delayed)
- **`DELAYED`**: Observation age between warning and stale thresholds
- **`STALE`**: Observation age $> \text{stale\_threshold}$ (e.g. $> 60\text{ min}$)
- **`OFFLINE`**: Source circuit breaker open or consecutive upstream failures
- **`UNKNOWN`**: Missing timestamp or unverified source

---

## 5. Resilience, Retries & Circuit Breakers

- **Bounded Retries:** Maximum 3 retries with exponential backoff and randomized jitter (`delay = base * (2^attempt) + jitter`).
- **Timeouts:** Bounded HTTP timeout (20.0 seconds) on all upstream calls.
- **Fail-Closed Policy:** Corrupted or invalid telemetry records are rejected; missing data is displayed as `"ไม่มีข้อมูล"` (NO DATA) rather than coerced to `0.0` or stale values.
- **Circuit Breakers:** Tripped upon 5 consecutive failures, backing off for 300 seconds before half-open probe.

---

## 6. Real-Time Delivery & Frontend UX

- **SSE Stream (`/api/v1/realtime/events`):** Dispatches `DATA_UPDATED` events immediately after successful database transaction commits.
- **Connection != Data Freshness:** The frontend independently indicates:
  - Connection Health: `● LIVE SSE` vs `● RECONNECTING` vs `● OFFLINE`
  - Telemetry Freshness: `อัปเดตอัตโนมัติ (ตรวจวัดล่าสุด HH:mm น.)`
- **Incremental Layer Updates:** Leaflet / MapLibre layers and marker popups update in-memory without refreshing the browser or resetting camera/filter state.
