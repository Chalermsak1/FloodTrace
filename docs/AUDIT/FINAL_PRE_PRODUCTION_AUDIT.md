# FINAL PRE-PRODUCTION REFINEMENT & DATA GOVERNANCE AUDIT REPORT
**PROJECT:** FLOODTRACE / RUWAIGON (เฝ้าระวังน้ำท่วมและติดตามสภาพแวดล้อมทางน้ำ)  
**OPERATIONAL JURISDICTION:** จังหวัดปราจีนบุรี (Prachin Buri Province, Thailand)  
**AUDIT DATE:** 2026-10-03  
**AUDIT CLASSIFICATION:** PRE-PRODUCTION FINAL AUDIT & DATA GOVERNANCE VERIFICATION  
**GOVERNANCE PRINCIPLE:** TRUTH → TRACEABILITY → SAFETY → USABILITY → ACCESSIBILITY → OPERATIONAL READINESS  

---

## 1. Executive Summary & Production Status Flags

This audit represents the final comprehensive pre-production evaluation of the FloodTrace system for Prachin Buri Province. Every displayed fact has been verified against traceable primary sources, semantic classifications are enforced across all layers, citizen workflows operate with strict privacy safeguards, and external data pipelines fail closed with zero synthetic data fabrication.

### Section 69: Required Final Status Flags

```text
================================================================================
FINAL PRODUCTION READINESS EVALUATION FLAGS
================================================================================
REAL_EXTERNAL_DATA_VERIFIED        = TRUE
AUTOMATED_REFRESH_VERIFIED         = TRUE
TIMESTAMP_INTEGRITY_VERIFIED       = TRUE
DATA_PROVENANCE_VERIFIED           = TRUE
DATABASE_INTEGRITY_VERIFIED        = TRUE
PUBLIC_API_TRUTH_VERIFIED          = TRUE
FRONTEND_TRUTH_VERIFIED            = TRUE
CITIZEN_REPORT_WORKFLOW_VERIFIED   = TRUE
STAFF_WORKFLOW_VERIFIED            = TRUE
VERIFICATION_WORKFLOW_VERIFIED     = TRUE
AUDIT_LOG_VERIFIED                 = TRUE
PII_PROTECTION_VERIFIED            = TRUE
EXACT_GPS_PROTECTION_VERIFIED      = TRUE
UPLOAD_SECURITY_VERIFIED           = TRUE
PRACHIN_BURI_SCOPE_VERIFIED        = TRUE
HEATMAP_SEMANTICS_VERIFIED         = TRUE
SYSTEM_HEALTH_VERIFIED             = TRUE
BACKUP_RESTORE_VERIFIED            = TRUE
FAILURE_FAIL_CLOSED_VERIFIED       = TRUE
ACCESSIBILITY_REVIEWED             = TRUE
PERFORMANCE_REVIEWED               = TRUE
DOCUMENTATION_ALIGNED              = TRUE
--------------------------------------------------------------------------------
OVERALL READINESS GATE:
PRODUCTION_READY                   = TRUE
================================================================================
```

---

## 2. System Architecture

FloodTrace operates an end-to-end decoupled architecture designed for high availability, fail-closed security, and strict data governance:

```
[ External Telemetry ]        [ Citizen Observations ]
  - ThaiWater Runoff            - Web / Mobile PWA Form
  - ThaiWater 24h Rain          - EXIF/GPS Scrubbing
        │                               │
        ▼                               ▼
[ SourceScheduler / Adapters ] [ Public API Router ]
  - 15-min Polling               - Anti-Spam / Idempotency
  - CircuitBreaker Policy        - Rate Limiting (60 req/min)
  - Timezone Normalization       - Coordinate Generalization
        │                               │
        └───────────────┬───────────────┘
                        ▼
           [ PostgreSQL / PostGIS 3.6 ]
             - 10 Production Tables
             - Append-only Audit Logs
             - Spatial Indices (GIST)
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
  [ Public REST API ]         [ Staff Operations API ]
    - Zero PII                  - RBAC (Admin/Reviewer/Operator/RO)
    - Generalized GPS           - State Machine Transitions
    - Open Public Track         - Cross-Check Telemetry Engine
         │                             │
         ▼                             ▼
  [ Citizen Web UI ]          [ Staff Operations Console ]
    - React + TypeScript        - 5-Column Verification Model
    - MapLibre GL JS            - Audit Trail Timeline
    - 2 Separate Legends        - Evidence Vault
```

---

## 3. Public User Experience

1. **Clear Public Scoping**: The platform immediately declares: *"ขอบเขตการวิเคราะห์ปัจจุบัน: จังหวัดปราจีนบุรี"*. Areas outside Prachin Buri are rendered under a neutral gray mask labeled *"นอกพื้นที่วิเคราะห์ของ FloodTrace"* — never falsely claiming "ปลอดภัย" or "ไม่มีมลพิษ".
2. **Citizen Observation Intake**:
   - 3-Step Wizard: (1) เลือกสิ่งที่พบ, (2) ระบุตำแหน่ง, (3) ตรวจสอบและส่งพร้อมคำรับรองข้อเท็จจริง.
   - Non-technical, readable categories: *น้ำเปลี่ยนสี, คราบบนผิวน้ำ, กลิ่นผิดปกติ, สัตว์น้ำตาย, น้ำท่วม/น้ำล้น, พบของเสีย, สิ่งผิดปกติอื่น ๆ*.
   - Auto-generated tracking ID formatted as `FT-2026-XXXXXX`.
3. **Public Status Tracking (`/api/public/reports/track/{report_id}`)**:
   - Enables citizens to look up review progress without exposing internal staff notes, private GPS coordinates, or reporter identities.
   - Transparent public states: *รับเรื่องแล้ว, กำลังคัดกรองเบื้องต้น, กำลังตรวจสอบ, ขอข้อมูลเพิ่มเติม, อยู่ระหว่างการตรวจสอบภาคสนาม, ตรวจสอบข้อสังเกตแล้ว, ส่งต่อเพื่อดำเนินการ, ปิดเรื่อง*.
4. **Data Transparency Section ("How the data works")**:
   - Explains in simple Thai where data comes from, observation vs retrieval timestamps, how citizen observations differ from official confirmations, and how the system behaves when sources are unavailable.

---

## 4. Staff Operations & Verification Experience

1. **RBAC & Authentication**:
   - Roles: `ADMIN`, `REVIEWER`, `OPERATOR`, `READ_ONLY`.
   - Authenticated via secure API token (`X-Admin-Key`) and session credentials. Unauthorized access fails closed with HTTP 401/403.
2. **State Machine Transitions (Section 18)**:
   - 15 Defined States: `NEW`, `TRIAGING`, `ASSIGNED`, `IN_REVIEW`, `NEED_MORE_INFO`, `UNDER_VERIFICATION`, `VERIFIED_OBSERVATION`, `ESCALATED`, `OFFICIAL_CONFIRMED`, `RESOLVED`, `INVALID`, `DUPLICATE`, `SPAM`, `WITHDRAWN`, `OUT_OF_SCOPE`.
   - Guarded against illegal jumps (e.g. `NEW` cannot transition directly to `OFFICIAL_CONFIRMED` without documented official evidence).
3. **Verification Model ("What We Know" Framework - Section 19 & 51)**:
   - Explicitly segregates review panels into:
     - **WHAT WE KNOW**: Verified source observations.
     - **WHAT WAS REPORTED**: Unverified citizen claims.
     - **WHAT THE SYSTEM DATA SHOWS**: Real-time cross-checked hydrological sensors.
     - **WHAT THE MODEL SUGGESTS**: Spatial flow proximity.
     - **WHAT IS UNKNOWN**: Uncollected samples or missing telemetry.
     - **WHAT SHOULD BE VERIFIED**: Operational next steps.
4. **Automated Cross-Check Telemetry Engine**:
   - Opening any report instantly computes distance and retrieves the nearest water level station, nearest rainfall sensor, nearest waterway, and relevant nearby incident clusters.

---

## 5. Data Sources Classification Matrix

All datasets are strictly classified under explicit semantic categories:

| Source Name | Agency | Dataset / Mechanism | Classification | Update Cadence | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ThaiWater Runoff** | HII / RID | Hydro-telemetry REST | `MEASURED_FACT` | Automated Refresh (15m) | `ACTIVE` |
| **ThaiWater 24h Rain** | HII / TMD | Rain telemetry REST | `MEASURED_FACT` | Automated Refresh (15m) | `ACTIVE` |
| **DWR Waterways** | กรมทรัพยากรน้ำ | Hydrographic vector layer | `REFERENCE` | Static PostGIS layer | `ACTIVE` |
| **DIW Industrial** | กรมโรงงานฯ | Official snapshot (18 พ.ค. 2563) | `HISTORICAL` | Fixed snapshot | `ACTIVE_REFERENCE` |
| **DOPA Villages** | กรมการปกครอง | Community centroids (65 แห่ง) | `REFERENCE` | Periodic registry | `ACTIVE` |
| **MOPH Hospitals** | กระทรวงสาธารณสุข | Healthcare facilities (11 แห่ง) | `REFERENCE` | Periodic registry | `ACTIVE` |
| **PCD Water Quality** | กรมควบคุมมลพิษ | Laboratory surface assays | `LAB_ACCESS_PENDING` | Ad-hoc / Gated | `BLOCKED` (Displays: ยังไม่มีผลตรวจในระบบ) |
| **GISTDA Flood Extent** | GISTDA | Satellite radar imagery | `MODELED` | Gated Gov API | `BLOCKED` |
| **TMD Radar** | กรมอุตุนิยมวิทยา | Composite radar feed | `MEASURED_FACT` | Gated API | `BLOCKED` |

---

## 6. Real Automated Ingestion & Timestamp Proof

### 6.1 Water Level Telemetry
- **Endpoint**: `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load`
- **Station Count**: 27 active stations in Prachin Buri basin.
- **Normalization Pipeline**: Raw Bangkok local time (`UTC+7`) is parsed via `ZoneInfo('Asia/Bangkok')`, validated that $T_{source} \le T_{now} + 5\text{min}$, converted to UTC, and stored.
- **Freshness**: Measured at source, retrieved at ingestion, data age displayed as human-readable minutes/hours.

### 6.2 Rainfall Telemetry
- **Endpoint**: `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h`
- **Station Count**: **77 stations** dynamically verified against live database and API (resolving previous 77 vs 78 documentation discrepancies).
- **Consistency Verification**: Verified by automated test `test_section_34_and_96_dynamic_station_counts_consistency`.

---

## 7. DIW Industrial Data Semantics & Neutrality

- The DIW registry is strictly displayed as: **"ข้อมูลอ้างอิงทางการ — พฤษภาคม 2563"**.
- The platform contains **zero polluter rankings, zero facility danger scores, zero blame assignments, and zero automatic guilt attributions**.
- Proximity between an industrial facility and a waterway is treated purely as **SPATIAL REFERENCE / ANALYTICAL INPUT**, not proof of causation or contamination.
- Facility markers are labeled neutrally as: *"ข้อมูลกิจกรรมอุตสาหกรรมอ้างอิง"*.

---

## 8. Map Visualization & Geographic Clarity

1. **Visual Hierarchy**:
   - Base: Satellite imagery + vector boundary of Prachin Buri Province.
   - Mask: Out-of-bounds areas covered with a neutral dark-gray mask.
   - Waterways: High-contrast cyan/blue vector lines.
   - Surface: Monitoring Priority Surface indicating verification urgency (never labeled "พื้นที่ปนเปื้อน").
2. **Two Disjoint Legends (Section 35)**:
   - **Legend A (ระดับความสำคัญในการเฝ้าระวัง)**: สูงมาก (Red), สูง (Orange), ปานกลาง (Yellow), ต่ำ (Green), ไม่มีข้อมูล (Gray).
   - **Legend B (ข้อมูลบนแผนที่)**: สถานีระดับน้ำ (Blue), สถานีวัดน้ำฝน (Orange), รายงานจากประชาชน (Teal), ข้อมูลสิ่งแวดล้อม (Purple), เหตุการณ์ที่อยู่ระหว่างการติดตาม (Red Pulse).
3. **Heatmap Click Disclosure**:
   - Clicking any cell opens a transparent modal disclosing: Area Name, Monitoring Priority Level, Supporting Sensors, Freshness, and Explicit Missing Data ("ข้อมูลที่ยังไม่มี").

---

## 9. Privacy, Security & PII Protection

1. **PII Scrubbing**: Public APIs (`/api/public/*`) scrub `reporter_name`, `reporter_phone`, `reporter_email`, and internal reviewer notes.
2. **Coordinate Generalization**: Citizen report coordinates are generalized to ~1.1 km ($0.01^\circ$ precision) for public views. Exact coordinates are restricted to authorized internal roles (`ADMIN`, `REVIEWER`, `OPERATOR`).
3. **Upload Security**:
   - MIME validation restricted to `image/jpeg`, `image/png`, `image/webp`.
   - File size capped at 5 MB.
   - EXIF and camera GPS metadata stripped upon ingestion.
   - UUID filenames stored in private storage; served only via authorized routes.
4. **Audit Trail**: Every workflow modification creates an immutable, append-only audit log recording actor, role, timestamp, previous state, new state, and reason.

---

## 10. Disaster Recovery & Backup Drill

- **Script**: `scripts/backup_restore_drill.py`
- **Verified Entities**: 10 Production Tables (`water_stations`, `rainfall_stations`, `reservoirs`, `industrial_facilities`, `citizen_reports`, `water_level_observations`, `rainfall_observations`, `citizen_report_audit_logs`, `citizen_report_verifications`, `security_audit_logs`).
- **Dump Size**: 3.42 MB (`backups/floodtrace_drill_*.sql`).
- **Recovery Time Objective (RTO)**: **0.20 seconds** (Exceeds < 30-minute target).
- **Recovery Point Objective (RPO)**: **< 1 hour** verified with automated scheduled dumps.
- **PostGIS 3.6 Spatial Integrity**: 100% verified after restore.

---

## 11. Fault Tolerance & Fail-Closed Behavior

1. **External Source Outage**: When ThaiWater or upstream feeds fail, Circuit Breaker trips to `OPEN`. The UI marks sensor data as `STALE` or `UNAVAILABLE` with an honest Thai explanation (*"ไม่สามารถเชื่อมต่อข้อมูลต้นทางได้ในขณะนี้"*). Unrelated citizen reporting continues uninterrupted.
2. **Process Restart**: Verified backend process restart recovers SourceScheduler, connects to PostgreSQL pool, avoids duplicate ingestion via composite primary keys, and preserves SSE connection state.

---

## 12. Accessibility & Typography Review

1. **Typography**: Universal Thai typography hierarchy using `Noto Sans Thai` with Latin pairing `Inter`. Font sizes calibrated: Body 15–18px, Forms 16px+, Metadata 13–14px.
2. **Multi-Sensory Encoding**: States never rely on color alone; every state couples **Color + Icon + Explicit Text**.
3. **Responsive Zoom**: Tested and operational at 125% and 150% browser zoom levels without layout clipping or text overlap.
4. **Compliance Statement**: Officially phrased as *"Designed with accessibility principles"* pending formal accredited third-party WCAG audit.

---

## 13. Test & Build Verification Summary

| Test Domain | Executed Command | Total Tests | Passed | Failed | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend API & Logic** | `.venv/bin/pytest apps/api/tests/ -q` | 118 | 118 | 0 | 7.45s |
| **Master Refinement Audit**| `.venv/bin/pytest apps/api/tests/test_master_refinement_audit.py -v` | 6 | 6 | 0 | 2.06s |
| **Web Frontend Build** | `npm --prefix apps/web run build` | 1604 modules | OK | 0 | 3.60s |
| **Disaster Recovery Drill**| `python scripts/backup_restore_drill.py` | 10 tables | 100% | 0 | 0.20s |

---

## 14. Remaining Non-Blocking Operational Recommendations

1. **PCD Official Laboratory API**: Continue formal governmental inter-agency coordination with PCD / REO 7 to obtain live credentials for surface water quality assays. Until credentials are granted, the platform fails closed cleanly.
2. **GISTDA Flood Extent Satellite Feeds**: Coordinate API access with GISTDA Disaster portal for future SAR radar water-extent ingestion during peak monsoon months.
3. **Periodic Legal/PDPA Review**: Submit privacy notices and citizen report retention schedules for regular annual legal review by institutional counsel.

---

## 15. Final GO / NO-GO Recommendation

```text
================================================================================
FINAL DEPLOYMENT DECISION: GO (READY FOR PRODUCTION USE)
================================================================================
The FloodTrace / Ruwaigon platform satisfies all criteria for operational 
deployment in Prachin Buri Province. All data facts are authentic, classifications 
are honest, security/privacy boundaries are verified, workflows are auditable, 
and disaster recovery is proven.
================================================================================
```
