# SYSTEM HEALTH & AUTOMATED REFRESH ARCHITECTURE

> **Current runtime status:** `/health/sources` emits evidence-backed source status, counts, timestamps, and reconciled aggregates. Staff health consumes source, metrics, and authenticated scheduler responses; missing or malformed data is `UNKNOWN`, stopped scheduling is `INACTIVE`, and degraded evidence stays partial or degraded. The supported systemd deployment uses one Uvicorn worker and one in-process scheduler owner. Staff operations use the fixed active `staff_admin_01` / `admin_user` `ADMIN` record; the console refreshes data through authenticated requests and does not use query-token SSE.
**FLOODTRACE / RUWAIGON — PRACHIN BURI PROVINCE**

---

## 1. Overview
The FloodTrace operational system implements comprehensive, fail-closed observability across all telemetry pipelines, database operations, background schedulers, and public endpoints. It ensures that system operators have authentic runtime metrics rather than theoretical or inferred status.

---

## 2. External Source Telemetry & Monitoring

### 2.1 Monitored Sources Matrix

| Source ID | Agency | Ingestion Mechanism | Interval | Target Entities | Fail-Closed Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `thaiwater_rid_runoff` | HII / RID | Automated HTTP REST | 15 minutes | `WaterStation`, `WaterLevelObservation` | Circuit breaker trips after 3 failures; retains stale cache with explicit aging indicator; zero synthetic data |
| `thaiwater_rainfall` | HII / TMD | Automated HTTP REST | 15 minutes | `RainfallStation`, `RainfallObservation` | 3 retries with exponential backoff; logs failure; marks data `STALE` if age > 1 hour |
| `diw_industrial_waste` | DIW | Static Database Snapshot | Reference | `IndustrialFacility` | Static snapshot (May 2563); strictly blocked from live ingestion updates |
| `dwr_waterways` | DWR | Geospatial PostGIS | Reference | `Waterway` | Read-only spatial reference layer |
| `pcd_water_quality` | PCD | Manual / Lab Intake | Ad-hoc | Laboratory Analyses | Blocked from live ingestion until formal API authorization is finalized; displays "ยังไม่มีผลตรวจจากห้องปฏิบัติการในระบบ" |

---

## 3. Circuit Breaker & Fault Tolerance

```
[ Scheduled Poll ] ──> [ Circuit Breaker (CLOSED) ] ──> [ External API: ThaiWater ]
                               │                                │
                       3x Failures                      Success │
                               ▼                                ▼
                     [ State: OPEN ]                 [ Reset Failure Count ]
                               │                                │
                     Skip Outbound Requests          Parse & Normalize to UTC
                               │                                │
                     Emit Stale Status               Deduplicate by hash/time
                               │                                │
                     Fail-Closed to UI               Persist to PostgreSQL
```

- **States**: `CLOSED` (Normal operation), `OPEN` (Tripped after threshold), `HALF_OPEN` (Trial recovery probe).
- **Failure Threshold**: 3 consecutive HTTP/network timeouts or 5xx responses.
- **Cool-off Duration**: 300 seconds before testing `HALF_OPEN`.
- **UI Guarantee**: When tripped, the UI explicitly renders `"ไม่สามารถเชื่อมต่อข้อมูลตรวจวัดจากแหล่งข้อมูลภายนอกได้ในขณะนี้ ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน"` — never defaulting to `0` or `"ปกติ"`.

---

## 4. Endpoints & Operator Telemetry

1. **Public Sources Health**: `GET /health/sources`
   - Returns aggregated runtime status, record counts, circuit breaker states, and last successful fetch timestamps.
   - Publicly accessible with zero sensitive internal paths or credentials.

2. **Internal Scheduler Status**: `GET /api/v1/admin/scheduler/status`
   - Protected by accepted staff credentials and server-side permission checks for the fixed `ADMIN` principal.
   - Returns thread execution state, next scheduled invocation, execution duration, and recent error traces.

3. **Telemetry Read and Manual Sync**:
   - Telemetry GET routes read persisted rows only; empty tables return empty results without upstream requests or writes.
   - `POST /api/v1/telemetry/sync` requires the `modify_workflow` permission before upstream requests or database mutation.

4. **Governance Mode**:
   - `GET /api/v1/governance/mode` returns the mode only.
   - `POST /api/v1/governance/mode` requires the `modify_workflow` permission before changing settings, requesting sources, or changing datasets.

5. **System Readiness Gate**: `GET /health`
   - Validates PostgreSQL connection pool, PostGIS spatial extension availability, and disk write integrity.

---

## 5. Verification & Observability Metrics

- **Average API Ingestion Latency**: < 450 ms per cycle.
- **Deduplication Efficiency**: 100% duplicate observations skipped via composite primary keys `(station_id, observed_at_utc)`.
- **Timezone Guarantee**: Raw Bangkok (`UTC+7`) timestamps normalized to ISO 8601 UTC in database; converted to localized Thai formatting (`DD/MM/BBBB HH:MM น.`) at display layer.
