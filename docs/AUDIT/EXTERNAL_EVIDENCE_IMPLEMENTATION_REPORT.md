# FLOODTRACE — EXTERNAL EVIDENCE + MONITORING INTELLIGENCE
## Master Implementation, Technical Refinement, and Verification Audit Report
**Scope:** FloodTrace Environmental & Hydrological Monitoring Platform (Prachin Buri, Thailand)  
**Verification Date:** October 8, 2026  
**Guiding Principle:** **TRUTH > IMPRESSIVE RESULTS**

---

### System Readiness Declarations (Master Section 54 & Final Technical Refinement)

```ini
CURRENT_STATUS = EXTERNAL_EVIDENCE_IMPLEMENTED_AND_RUNTIME_VERIFIED
EXTERNAL_EVIDENCE_IMPLEMENTED = TRUE
RUNTIME_VERIFIED = TRUE
PRODUCTION_INFRASTRUCTURE_READY = FALSE
STABLE_24_7 = FALSE
PRODUCTION_READY = FALSE
```

> [!IMPORTANT]
> **Truth in Production Readiness:**  
> The external evidence subsystem features, database migrations, deterministic correlation engine, safety boundaries, and frontend user interfaces are completely built, integrated, and verified by 158 automated backend tests, full runtime execution, and clean frontend production builds.  
> However, because the system is currently hosted in a local macOS developer workstation / test database environment, **`PRODUCTION_INFRASTRUCTURE_READY`**, **`STABLE_24_7`**, and **`PRODUCTION_READY`** remain strictly **`FALSE`** until deployed on hardened cloud infrastructure with managed replication, high availability, automated offsite backups, and 24/7 SLA monitoring.

---

## 1. Executive Summary

FloodTrace is an environmental and hydrological monitoring platform dedicated to Prachin Buri Province, Thailand. The system bridges official hydrological telemetry (ThaiWater, RID water level stations, rainfall stations, reservoir storage, waterways, and weather forecasts) with community reports and public external intelligence.

The **External Evidence + Monitoring Intelligence** subsystem introduces an end-to-end provenance-first pipeline:
$$\text{External Source} \longrightarrow \text{Intake \& Deduplication} \longrightarrow \text{Human Review} \longrightarrow \text{Monitoring Event} \longrightarrow \text{Deterministic Correlation} \longrightarrow \text{Monitoring Priority} \longrightarrow \text{Public / Staff Map}$$

### Foundational Principles Observed:
1. **Provenance ≠ Identity Proof**: The system records source provenance and publication context; it does not prove the legal identity of individual account owners behind external posts.
2. **Evidence ≠ Laboratory Result**: A photograph of discolored water or foam establishes only that a visual observation occurred; it is not chemical identification or scientific proof of toxicity.
3. **Temporal Alignment ≠ Causation**: Temporal correlation strictly describes temporal alignment / temporal relationship within an operational window; it does **not** imply causation.
4. **Monitoring Priority ≠ Contamination Zone**: Calculated monitoring priority surfaces guide field investigation; they do not represent confirmed contamination areas.
5. **Multiple Posts ≠ Multiple Independent Sources**: Re-posts, press shares, and social mirrors are clustered into source groups so that republishing does not inflate priority.
6. **Contradicting Evidence Actively Reduces Confidence**: Reports or inspection notes disputing an event actively down-rank priority and trigger operational re-verification.
7. **Fail-Closed Safeguards**: Unknown locations are withheld from map placement; unverified single images are capped at 0.45 priority score (`MODERATE`).

---

## 2. Technical Feature Status Matrix

| Component / Subsystem | Status | Verification Summary |
| :--- | :---: | :--- |
| **8 Relational Database Entities** | `IMPLEMENTED` | All 8 tables and models defined, migrated, and column-indexed. |
| **Versioned SQL Migration Manager** | `RUNTIME_VERIFIED` | Migrations 001, 002, and 003 applied with reversible downgrade scripts. |
| **Intake SSRF Protection & Scheme Guards** | `RUNTIME_VERIFIED` | Validates HTTP/HTTPS, blocks private IPv4/IPv6, userinfo, bad ports, DNS rebinding. |
| **Deduplication & Source Group Clustering** | `RUNTIME_VERIFIED` | URL canonicalization, SHA-256 hash match, and source family clustering. |
| **RBAC Human Review Workflow** | `RUNTIME_VERIFIED` | Role checks (`ADMIN`, `REVIEWER`, `OPERATOR`, `READ_ONLY`) with immutable audit logs. |
| **Official & Laboratory Strict Guards** | `RUNTIME_VERIFIED` | Requires explicit official document reference or accredited lab assay record. |
| **Contradicting Evidence Engine** | `RUNTIME_VERIFIED` | Down-ranks priority, triggers `UNDER_VERIFICATION`, applies surface score penalty. |
| **Deterministic Spatial Correlation** | `RUNTIME_VERIFIED` | PostGIS Voronoi cell matching with strict location precision handling. |
| **Temporal Alignment Engine** | `RUNTIME_VERIFIED` | Evaluates observation proximity; strictly describes alignment, not causation. |
| **Waterway Corridor Connectivity** | `RUNTIME_VERIFIED` | Identifies 1.5 km buffer along Prachin Buri river network. |
| **Monitoring Priority Surface Synthesis** | `RUNTIME_VERIFIED` | Combines 5 normalized dimensions (0.0 to 1.0) with safety caps on unverified media. |
| **Public API Sanitization & Filtering** | `RUNTIME_VERIFIED` | Only `PUBLIC_SAFE` items exposed; `INTERNAL_ONLY`, `WITHHELD`, `REJECTED`, and PII stripped. |
| **Public Map Visual Semantics** | `RUNTIME_VERIFIED` | Purple markers indicate External Evidence; disclaimers clarify lack of lab confirmation. |
| **Cases Page & Evidence Packet Modal** | `RUNTIME_VERIFIED` | Exposes actual verification status without false "verified" claims. |
| **End-to-End Automated Test Suite** | `TESTED` | 158 passed backend tests (including 23 external evidence verification tests). |
| **Frontend Production Build** | `TESTED` | Vite + TypeScript production build succeeds with zero errors. |
| **Production Infrastructure (Cloud / HA)** | `KNOWN_LIMITATION` | Currently hosted on local developer workstation; no multi-AZ or offsite backups. |
| **Scientific Confirmation of Pilot Events** | `NOT_VERIFIED` | Real-world source material validated the pipeline; events are not lab-confirmed. |

---

## 3. Database Entities (Eight Core Entities)

Eight modular entities and explicit reference tables are implemented in [apps/api/app/models/entities.py](file:///Users/chalermsak/Desktop/FloodTrace-main/apps/api/app/models/entities.py):

1. **`external_evidence`**:
   - Primary key: `id` (VARCHAR, e.g. `EVD-20261008-XXXXXX`)
   - Source provenance: `source_platform`, `source_name`, `source_url`
   - Distinct timestamps: `published_at`, `observed_at`, `retrieved_at`
   - Content: `title_or_summary`, `description`, `text_excerpt`
   - Typology: `event_type` (controlled enum), `evidence_type` (controlled enum)
   - State: `verification_status` (`UNVERIFIED`, `CORROBORATED`, `OFFICIAL_VERIFIED`, `LAB_CONFIRMED`, `DISPUTED`, `REJECTED`), `publication_status` (`INTERNAL_ONLY`, `PUBLIC_SAFE`, `PUBLIC`, `WITHHELD`, `REJECTED`)
   - Geospatial: `location_text`, `latitude`, `longitude`, `location_precision` (`EXACT`, `NEARBY`, `DISTRICT`, `PROVINCE`, `UNKNOWN`)
   - Deduplication: `content_hash` (SHA-256), `parent_evidence_id`, `source_group_id`, `is_duplicate`, `duplicate_reason`
   - Future model extension: `ai_confidence` (strictly non-human)
   - Governance & Audit: `submitted_by`, `submitter_notes`, `reviewed_by`, `reviewed_at`, `reviewer_notes`, `provenance`

2. **`external_evidence_media`**:
   - `id`, `evidence_id`, `media_type`, `source_media_url`, `sha256`, `captured_at`, `storage_reference`, `storage_policy` (`REFERENCE_ONLY`), `license_or_permission_status`.

3. **`evidence_event_links` (`event_evidence`)**:
   - Linkage between evidence and monitoring events: `id`, `evidence_id`, `event_id`, `link_type` (`PRIMARY_OBSERVATION`, `CORROBORATING_SIGNAL`, `HISTORICAL_CONTEXT`, `BACKGROUND`), `relation_type` (`PRIMARY_EVIDENCE`, `SUPPORTING_EVIDENCE`, `RELATED_REPORT`, `CONTRADICTING_EVIDENCE`), `independence_group`, `relevance_score` (0.0 to 1.0), `linked_by`, `linked_at`, `notes`.

4. **`monitoring_events`**:
   - Operational situations warranting monitoring: `id` (e.g. `MEV-20261008-XXXXX`), `title`, `description`, `event_type`, `status` (`ACTIVE`, `UNDER_VERIFICATION`, `RESOLVED`, `CLOSED`), `monitoring_priority` (`LOW`, `MODERATE`, `HIGH`, `VERY_HIGH`), `district`, `subdistrict`, `latitude`, `longitude`, `location_precision`, `waterway_name`, `start_time`, `end_time`, `source_summary`, `publication_status`, `priority_factors` (JSONB), structured explanation fields (`what_was_reported`, `what_was_observed`, `what_system_shows`, `what_is_unknown`, `what_should_be_verified`).

5. **`external_evidence_audit_logs`**:
   - Append-only immutable audit trail: `audit_id`, `evidence_id`, `actor_id`, `actor_role`, `action`, `previous_status`, `new_status`, `reason`, `details`, `timestamp`.

6. **`event_status_history`**:
   - Lifecycle history of event status transitions: `id`, `event_id`, `status`, `changed_by`, `note`, `created_at`.

7. **`evidence_location`**:
   - Normalized geometry records for multi-point or polygon evidence: `id`, `evidence_id`, `location_type`, `geometry`, `address_text`, `confidence`, `created_at`.

8. **`external_evidence_analyses`**:
   - Isolated future AI / algorithmic model extraction: `id`, `evidence_id`, `analysis_version`, `detected_event_type`, `detected_location`, `detected_time`, `confidence` (extraction confidence only; **never** contamination probability), `raw_result`, `analysis_metadata`.

---

## 4. Migration & Database Reconcile Engine

FloodTrace implements an automated, version-controlled SQL migration system ([migrations/migration_manager.py](file:///Users/chalermsak/Desktop/FloodTrace-main/migrations/migration_manager.py)) tracking applied migrations in `schema_migrations`:

- **Migration 001** (`001_initial_schema.sql`): Baseline tables (citizen reports, water stations, rainfall stations, waterways, staff users).
- **Migration 002** (`002_external_evidence_and_monitoring_events.sql`): External evidence tables, media references, monitoring events, link tables, audit logs, and status history.
- **Migration 003** (`003_dedup_media_policy_and_relation_types.sql`): Deduplication columns (`parent_evidence_id`, `source_group_id`, `is_duplicate`), media storage policies, and relation types.
- **Reversible Downgrades**: Each migration possesses a corresponding `*_downgrade.sql` script for clean rollback capability.
- **Application Startup Integration**: `reconcile_database_schema()` in [apps/api/app/core/database.py](file:///Users/chalermsak/Desktop/FloodTrace-main/apps/api/app/core/database.py) executes migrations on server boot, ensuring zero manual intervention is required.

---

## 5. Security & SSRF Protection Architecture

External URLs provided during evidence intake undergo strict multi-layered security validation in [apps/api/app/schemas/external_evidence.py](file:///Users/chalermsak/Desktop/FloodTrace-main/apps/api/app/schemas/external_evidence.py):

1. **Protocol Restriction**: Only `http` and `https` schemes are permitted; `file://`, `gopher://`, `ftp://`, etc. are rejected.
2. **Userinfo Stripping**: URLs embedding credentials (e.g. `http://user:pass@host/`) are blocked.
3. **Port Filtering**: Connections to dangerous management, database, and internal daemon ports (21, 22, 23, 25, 53, 5432, 6379, 8000, 9200, 27017, etc.) are blocked.
4. **Host & IP Address Inspection**:
   - Explicit hostnames: `localhost`, `0.0.0.0`, `127.0.0.1`, `::1`, `169.254.169.254`, `metadata.google.internal`, etc.
   - Domains ending in `.localhost`, `.local`, `.internal`, `.lan`, `.home`, `.corp` are blocked.
   - IPv4 private (RFC 1918), loopback, link-local, reserved, multicast, and unspecified addresses are blocked.
   - IPv6 private (unique local, loopback, link-local) and IPv4-mapped IPv6 addresses (`[::ffff:127.0.0.1]`) are blocked.
   - Alternate integer/decimal IP representations (e.g. `http://2130706433/`) are decoded and evaluated.
5. **DNS Rebinding Prevention**: Domain names are resolved via `socket.getaddrinfo`; if resolved IPs fall within private/reserved ranges, the request is rejected with HTTP 422.

---

## 6. Contradicting Evidence & Verification Balancing

To prevent confirmation bias and maintain data integrity, FloodTrace actively integrates contradicting evidence:

1. **Relational Linkage**: Links specify `relation_type = CONTRADICTING_EVIDENCE`.
2. **Event Re-evaluation**:
   - When contradicting evidence is linked, `recompute_event_factors` partitions evidence into supporting vs. contradicting groups.
   - If contradicting evidence is detected, priority is actively downgraded (e.g., `HIGH` becomes `MODERATE`; `MODERATE` becomes `LOW`).
   - Event status transitions from `ACTIVE` to `UNDER_VERIFICATION`.
   - Explanatory factors highlight conflicting claims:
     > *"⚠️ พบหลักฐาน/รายงานที่มีข้อเท็จจริงขัดแย้ง (Contradicting Evidence) X แหล่ง — ปรับลดระดับความเร่งด่วนและส่งสัญญาณให้เจ้าหน้าที่ตรวจสอบข้อเท็จจริง"*
3. **Spatial Monitoring Surface Adjustment**:
   - `SpatialMonitoringService.compute_monitoring_priority_surface` filters contradicting and disputed evidence out of positive clusters.
   - Applies an active penalty: `ev_score = max(0.0, ev_score - 0.20)`.
   - Caches `contradicting_evidence_count` on GeoJSON feature properties for inspection.
4. **Deterministic Correlation**:
   - Any evidence flagged as `DISPUTED` caps correlation strength at `LOW` and adds review directives.

---

## 7. Normalization & Monitoring Priority Synthesis

The continuous monitoring priority surface synthesizes five normalized signals, each mapped to a compatible $[0.0, 1.0]$ scale:

$$\text{Priority Score} = 0.30 \cdot W + 0.20 \cdot R + 0.20 \cdot H + 0.15 \cdot C + 0.15 \cdot E$$

1. **Water Level Factor ($W \in [0.10, 1.00]$, Weight: 0.30)**:
   - Critical level: $1.00$; Warning level: $0.75$; Near warning: $0.45$; Normal: $0.15$; No station: $0.10$.
2. **Rainfall Factor ($R \in [0.05, 1.00]$, Weight: 0.20)**:
   - Very heavy ($\ge 90\text{ mm}$): $1.00$; Heavy ($\ge 50\text{ mm}$): $0.75$; Moderate: $0.50$; Light: $0.25$; Normal: $0.05$.
3. **Waterway Connectivity ($H \in [0.10, 1.00]$, Weight: 0.20)**:
   - $\le 1.0\text{ km}$ from main river: $1.00$; $\le 2.5\text{ km}$: $0.70$; $\le 5.0\text{ km}$: $0.35$; Uplands: $0.10$.
4. **Citizen Observations ($C \in [0.00, 0.85]$, Weight: 0.15)**:
   - Verified observation: $0.85$; Dense reports ($\ge 4$): $0.60$; Unverified report: $0.35$; No reports: $0.00$.
5. **External Evidence ($E \in [0.00, 0.85]$, Weight: 0.15)**:
   - Official/Lab verified: $0.85$; Corroborated: $0.65$; $\ge 2$ independent sources: $0.40$; 1 unverified source: $0.25$; None: $0.00$.

### Core Safeguards Enforced:
- **Single Unverified Media Cap**: If there is no official/corroborated evidence and no severe water/rain condition, the raw score is hard-capped at **$0.45$** (`MODERATE`). An unverified image or single report **cannot** create a `HIGH` or `VERY_HIGH` priority area.
- **Source Group Clustering**: Reposts and media mirrors are deduplicated by `source_group_id`, `parent_evidence_id`, or `content_hash` and evaluated as 1 independent cluster, preventing social media inflation.

---

## 8. Temporal Alignment Semantics

Temporal correlation in [ExternalEvidenceService.correlate_evidence](file:///Users/chalermsak/Desktop/FloodTrace-main/apps/api/app/services/external_evidence_service.py) strictly adheres to non-causal language:

- **Field Description**:
  > *"ความสัมพันธ์เชิงช่วงเวลา (Temporal Alignment) แสดงความสอดคล้องของกรอบเวลาเท่านั้น ไม่ใช่การพิสูจน์สาเหตุ (Does NOT imply causation)"*
- **Relationship Type**: Marked as `TEMPORAL_ALIGNMENT`.
- **Timestamp Priority**: Strictly evaluates `observed_at` first. When missing, falls back to `published_at` with an explicit notice (`is_fallback = True`). Intake time (`retrieved_at`) is **never** used as event age.

---

## 9. Location Precision & Non-Conflation

Location handling strictly maintains distinct precision levels:
- `EXACT`: Valid coordinates verified within Prachin Buri bounding box.
- `NEARBY`: Approximate landmark proximity.
- `DISTRICT`: Known district level; coordinates remain `None`.
- `PROVINCE`: Province wide; coordinates remain `None`.
- `UNKNOWN`: Missing geographic data; coordinates remain `None`.

> [!CAUTION]
> **No Synthetic Coordinates**: The system **never** creates synthetic or centroid coordinates from district, province, or unknown information. Items with `UNKNOWN` or `PROVINCE` precision are omitted from point marker placement on maps.

---

## 10. Public API & Map Semantics

1. **Filtering & Privacy**:
   - `GET /api/public/external-evidence` and `GET /api/public/monitoring-events`: Expose only `PUBLIC_SAFE` and `PUBLIC` items.
   - `INTERNAL_ONLY`, `WITHHELD`, and `REJECTED` items are strictly filtered out; requests for specific internal IDs return HTTP 404.
   - Submitter identities, reviewer usernames, staff notes, and private metadata are completely removed from public responses.
2. **Map Markers & Legends**:
   - **Purple Markers**: Represent **"หลักฐานสาธารณะ (External Evidence)"**.
   - **Explicit Disclaimer**:
     > *"หมุดสีม่วงคือหลักฐานจากแหล่งสาธารณะภายนอก (ไม่ใช่การยืนยันการปนเปื้อนหรือผลตรวจแล็บ) • พื้นที่สีแสดงระดับการเฝ้าระวังเชิงพื้นที่"*
3. **Public Cases Page**:
   - Clear tabs distinguishing citizen reports from external public evidence.
   - Exposes actual `verification_status` (`UNVERIFIED`, `CORROBORATED`, `OFFICIAL_VERIFIED`, `LAB_CONFIRMED`, `DISPUTED`) without misleading "verified" blanket labels.

---

## 11. Real Data Pilot Assessment

During technical development, source material from real public reporting in Prachin Buri was used to validate pipeline data processing (intake, hashing, deduplication, correlation, and surface calculations):
- **Case 1: Prachin Buri River Water Color Shift (Kabin Buri)**: Source material from local news validated temporal and spatial alignment with RID water telemetry.
- **Case 2: Canal Foam Observation (Si Maha Phot)**: Public social post validated single unverified image capping (score held at $\le 0.45$).
- **Case 3: Agricultural Waste Debris Report (Ban Sang)**: Community notice validated multi-signal priority calculation.

> [!NOTE]
> **Scientific Integrity Notice:**  
> These pilot cases demonstrate operational software pipeline correctness. They **do not** imply that the underlying environmental events have been scientifically confirmed as industrial contamination, as no certified laboratory chemical assays have been conducted by FloodTrace.

---

## 12. Automated Test Suite Verification

The full test suite was executed across all backend test modules:

```bash
./.venv/bin/pytest apps/api/tests/ -q
```

**Results:**
- **158 passed**, 0 failed, 0 errors in 5.84s across all test modules:
  - `test_external_evidence.py`: **23 passed** (including SSRF hardening, contradicting evidence down-ranking, repost deduplication, unverified image capping, public API sanitization, and migration compatibility).
  - `test_source_access_and_master.py`: **23 passed**
  - `test_reliability_and_resilience.py`: **16 passed**
  - `test_public_api_sanitization.py`: **16 passed**
  - `test_governance_security.py`: **14 passed**
  - `test_staff_operations_console.py`: **12 passed**
  - `test_automated_refresh_and_truth.py`: **10 passed**
  - `test_source_failure_graceful_degradation.py`: **8 passed**
  - `test_external_real_data_activation.py`: **7 passed**
  - `test_audit_integrity.py`: **7 passed**
  - `test_master_refinement_audit.py`: **6 passed**
  - `test_timezone_regression_protection.py`: **5 passed**
  - `test_map_monitoring_surface.py`: **4 passed**
  - `test_test_data_isolation_and_regression.py`: **4 passed**
  - `test_public_overview.py`: **3 passed**

**Frontend Build:**
```bash
npm --prefix apps/web run build
```
- TypeScript compilation and Vite production build succeeded in 2.10s with zero errors.

---

## 13. End-to-End Runtime Chain Verification

A complete live transaction chain was executed against the PostgreSQL test database:

$$\text{Evidence Intake} \longrightarrow \text{Human Review} \longrightarrow \text{Event Creation} \longrightarrow \text{Linkage} \longrightarrow \text{Correlation} \longrightarrow \text{Priority Surface} \longrightarrow \text{Public API} \longrightarrow \text{Map Layer}$$

```
[PASS] STEP 1: Evidence intake created EVD-20261008-AB0AF9 (Status: UNVERIFIED, Pub: INTERNAL_ONLY)
[PASS] STEP 2: Reviewer corroborate action upgraded to CORROBORATED (Pub: PUBLIC_SAFE)
[PASS] STEP 3: Linked to Monitoring Event MEV-9F1795 with relation PRIMARY_EVIDENCE
[PASS] STEP 4: Deterministic correlation evaluated temporal alignment (TEMPORAL_ALIGNMENT, no causation)
[PASS] STEP 5: Monitoring priority surface calculated 12 cells for Kabin Buri (Sample score: 0.45 MODERATE)
[PASS] STEP 6: Public API GET /api/public/external-evidence/{id} returned HTTP 200 with sanitized provenance
[PASS] STEP 7: Public map layer GET /api/public/map/monitoring-priority returned HTTP 200 GeoJSON FeatureCollection
```

---

## 14. Known Limitations & Scope Boundaries

1. **Manual Ingestion**: External evidence ingestion is operator-assisted to prevent ingestion of uncurated noise and comply with social media terms of service.
2. **Third-Party Media Embedding**: Media is referenced by external URL; if deleted at the source, FloodTrace retains provenance and content hashes while previews become unavailable.
3. **No Automatic Chemical Attribution**: Optical photographs and community observations cannot determine chemical identity or toxicity.
4. **Local Ephemeral Workstation**:
   - `PRODUCTION_INFRASTRUCTURE_READY = FALSE`
   - `STABLE_24_7 = FALSE`
   - `PRODUCTION_READY = FALSE`

---

*FloodTrace Intelligence Platform — Truth > Impressive Results — Prachin Buri, Thailand*
