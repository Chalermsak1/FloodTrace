# FloodTrace

> **Geospatial flood and environmental monitoring platform designed to help communities, researchers, and authorities understand flood conditions, hydrological connectivity, environmental monitoring priorities, community observations, and official environmental information in a structured, traceable, and evidence-driven way.**

[![System Status](https://img.shields.io/badge/Status-Internal%20Test-blue.svg)](#17-current-project-status)
[![Production Readiness](https://img.shields.io/badge/Production-Not%20Ready%20(Gated)-orange.svg)](#17-current-project-status)
[![Tests](https://img.shields.io/badge/Tests-76%2F76%20Passed-brightgreen.svg)](#16-testing)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.3+-0064a5?logo=postgresql&logoColor=white)](https://postgis.net)

---

## Table of Contents

- [1. One-line Project Description](#1-one-line-project-description)
- [2. Why FloodTrace?](#2-why-floodtrace)
- [3. What Problem Does It Solve?](#3-what-problem-does-it-solve)
- [4. How FloodTrace Works](#4-how-floodtrace-works)
- [5. Key Features](#5-key-features)
- [6. Evidence and Data Classification](#6-evidence-and-data-classification)
- [7. Data Sources](#7-data-sources)
- [8. Data Integrity](#8-data-integrity)
- [9. Privacy and Security](#9-privacy-and-security)
- [10. Reliability](#10-reliability)
- [11. Real-Time Architecture](#11-real-time-architecture)
- [12. Technology Stack](#12-technology-stack)
- [13. System Architecture](#13-system-architecture)
- [14. Project Structure](#14-project-structure)
- [15. Local Development](#15-local-development)
- [16. Testing](#16-testing)
- [17. Current Project Status](#17-current-project-status)
- [18. Roadmap](#18-roadmap)
- [19. Documentation Links](#19-documentation-links)
- [20. Engineering Philosophy](#20-engineering-philosophy)

---

## 1. One-line Project Description

**FloodTrace** is an open-source geospatial flood and environmental monitoring platform focused on Prachin Buri, Thailand, built to provide evidence-backed spatial screening, hydrological connectivity tracing, and community observation tracking without jumping to premature conclusions.

---

## 2. Why FloodTrace?

During seasonal flooding in industrial and agricultural river basins like Prachin Buri, critical environmental information becomes severely fragmented across separate systems and agencies:

- **Dispersed Information**: Water levels, satellite radar flood extents, rainfall telemetry, and water quality data exist in different portals, formats, and refresh cycles.
- **Hidden Spatial Relationships**: Citizens and first responders see local inundation but lack the tools to trace upstream waterways or understand downstream exposure paths.
- **Unclear Information Boundaries**: Model forecasts, raw citizen alerts, historical records, and verified laboratory tests are frequently conflated, causing unnecessary panic or dangerous complacency.
- **The Fabrication Trap**: Many digital dashboards fill missing data with arbitrary defaults or synthetic numbers to look visually complete.

FloodTrace was built to bridge these gaps with absolute transparency, treating environmental monitoring as a **chain of verifiable evidence** rather than a speculative blame engine.

---

## 3. What Problem Does It Solve?

FloodTrace structures complex environmental and flood data into an intuitive interface that answers critical practical questions:

| Question | What FloodTrace Delivers |
|---|---|
| **Where is flooding occurring?** | Continuous satellite-derived flood extent overlays and telemetry station gauges. |
| **What is happening in my area?** | Sub-district level status cards indicating monitoring priorities and active advisories. |
| **How is water spatially connected?** | Hydrographic network routing indicating upstream channels and downstream reaches. |
| **What community observations exist?** | Anonymized, cluster-grouped citizen reports (color, odor, foam, dead fish). |
| **What official information exists?** | Published regulatory notices, official water sampling results, and agency statements. |
| **What information is missing?** | Explicit `INSUFFICIENT_DATA` and `NO_DATA` states instead of fabricated assumptions. |
| **Which areas need close verification?** | Objective verification priority rankings (High / Medium / Low) to guide field inspection. |

---

## 4. How FloodTrace Works

FloodTrace operates across two interconnected workflows: data pipeline processing and the environmental **Source–Pathway–Receptor** assessment framework.

### 4.1 End-to-End Data Lifecycle

```text
External / Internal Sources
          ↓
   Access Controller (Fail-Closed)
          ↓
  Validation & Schema Normalization
          ↓
   Provenance & Cryptographic Hash
          ↓
    PostgreSQL / PostGIS Storage
          ↓
 Spatial Analysis & Screening Engine
          ↓
  Public API Sanitization Layer
          ↓
   Responsive Web Dashboard (SSE)
```

### 4.2 Source–Pathway–Receptor Framework

```text
[Potential Source / Factor]
            ↓
    [Flood Contact] (Inundation intersects area)
            ↓
[Hydrological Connectivity] (Waterway topology & drainage flow)
            ↓
  [Potential Exposure] (Downstream communities & agricultural zones)
            ↓
[Monitoring Priority] (Screening to determine where to inspect first)
            ↓
[Citizen Observation] (Ground-truth signals: odor, color change, residue)
            ↓
[Official Lab Verification] (Authoritative sampling by regulatory agencies)
```

> **Important**: Physical proximity or hydrological connection **does not equal contamination or guilt**. FloodTrace uses this chain exclusively to prioritize field monitoring—never to accuse facilities or declare legal liability.

---

## 5. Key Features

The public interface is designed around seven dedicated, accessible, Thai-first modules:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FloodTrace Public Dashboard                     │
├─────────────┬───────────┬──────────────┬─────────────┬─────────────────┤
│ 1. Main Map │ 2. MyArea │ 3. Reporting │ 4. Forecast │ 5. Official Hub │
└─────────────┴───────────┴──────────────┴─────────────┴─────────────────┘
```

1. **Main Map (`/map`)**:
   - Continuous sub-basin polygons colored by **Verification Priority** (Yellow = Low, Orange = Medium, Red = High). *Red indicates high monitoring priority, never confirmed toxic concentration.*
   - Semi-transparent flood extents, river waterways, active telemetry markers, and generalized citizen observation points.
   - Zero circular buffer rings, zero factory markers, and zero blame arrows.
2. **My Area (`/my-area`)**:
   - Location-specific environmental cards allowing residents to track their district or sub-district.
   - Saved locally in the user's browser (`localStorage`) without collecting home GPS coordinates.
3. **Citizen Reporting (`/report`)**:
   - Guided 3-step reporting wizard for water abnormalities (color, odor, dead fish, foam, chemical sheen).
   - Offline draft persistence and automatic image stripping (EXIF/GPS metadata removed upon upload).
4. **Area Detail (`/overview`)**:
   - Comprehensive evidence summaries explaining *"Why is this area prioritized?"*, listing active monitoring stations, confidence scores, and data freshness timestamps.
5. **Forecast (`/forecast`)**:
   - Weather and hydrological outlooks clearly labeled with forecast horizons (`+6h`, `+12h`, `+24h`, `3d`, `7d`), confidence margins, and model caveats.
6. **Community Observations (`/cases`)**:
   - Moderated citizen observation feed aggregated by 1.1 km grid clusters with generalized locations to safeguard resident privacy.
7. **Official Results (`/official-updates`)**:
   - Direct repository of verified regulatory bulletins, emergency flood relief updates, and published laboratory test results from government agencies.

*(Note: In accordance with safety and legal governance, industrial facility listings, blacklist rankings, and factory dossiers have been permanently removed from the public dashboard).*

---

## 6. Evidence and Data Classification

To eliminate ambiguity, FloodTrace classifies every piece of information into explicit, auditable tiers:

| Data Classification | Description | Public Disclaimer / Rule |
|---|---|---|
| `OFFICIAL_RECORD` | Formally released regulatory notices and inspection logs. | Verified source attribution attached. |
| `MEASURED_FACT` | Direct physical telemetry from calibrated sensor stations. | Sensor station ID and timestamp included. |
| `DERIVED` | Spatial calculations (e.g., river distance, geometric intersections). | Deterministic algorithmic calculation. |
| `MODELED` | Hydrological routing and spatial exposure screening. | *"Model output is not a laboratory measurement."* |
| `FORECAST` | Projected future weather or flood inundation spreads. | Projected horizon and model uncertainty stated. |
| `CITIZEN_REPORTED` | Field observations submitted by community members. | *"Community observation — not an official confirmation."* |
| `UNVERIFIED` | Raw incoming reports pending moderator review. | Held in staging; hidden from public aggregates. |
| `OFFICIAL_CONFIRMED` | Community reports verified by laboratory or agency inspection. | Linked to official regulatory case IDs. |
| `INSUFFICIENT_DATA` | State displayed when facts are insufficient to reach conclusions. | Displayed openly; never replaced by guesses. |

### Why This Matters

- A **citizen observation** indicates that something was smelled or seen; it does **not** identify chemical toxicity.
- A **modeled connection** demonstrates where water flows down a gradient; it is **not** evidence of an illegal discharge.
- A **forecast** projects potential conditions; it must never be displayed as current reality.

---

## 7. Data Sources

FloodTrace is architected with modular adapters to ingest and normalize data across official organizations:

| Source Category | Organizations Architected For | Status in Current Build |
|---|---|---|
| **Satellite Flood Extent** | GISTDA (Disaster Portal) | Planned Integration / Gated |
| **Water Telemetry & Reservoirs** | ThaiWater / HII, Royal Irrigation Department (RID) | Planned Integration / Gated |
| **Weather & Rainfall Forecasts** | Thai Meteorological Department (TMD) | Planned Integration / Gated |
| **Environmental Quality & Samples** | Pollution Control Department (PCD), REO7 | Planned Integration / Gated |
| **Topography & Elevation** | Department of Water Resources (DWR), LDD | Planned Integration / Gated |
| **Industrial Classifications** | Department of Industrial Works (DIW) | Planned Integration / Gated |
| **Citizen Field Reports** | FloodTrace Community Observation Network | **Active (Internal Source)** |

> ### ⚠️ Critical Status Notice
> Under current project policy (`REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True`):
> - **External private-authorized production sources = 0**
> - **Internal active source = 1 (`floodtrace_citizen`)**
> 
> All 14 external candidate sources remain gated until official inter-agency data sharing agreements and API credentials are provided. Synthetic or unverified data is strictly blocked from the production pipeline.

---

## 8. Data Integrity

FloodTrace adheres to the core engineering tenet: **Real Data Only**.

The system strictly refuses to manufacture believable numbers to make user interfaces appear complete. If a sensor goes offline, an API token expires, or sampling has not taken place:

- Missing fields return `null` or explicit fallback states:
  - `NO_DATA`
  - `ACCESS_REQUIRED`
  - `SOURCE_UNAVAILABLE`
  - `STALE_DATA`
  - `INSUFFICIENT_DATA`
- The system will **never** display the word *"Safe"* (ปลอดภัย) as an absolute guarantee, using *"No active watch zones"* instead.

---

## 9. Privacy and Security

Public environmental platforms must protect vulnerable communities and respect legal frameworks.

```text
[Citizen Input] ──► [Private Data Partition] (Encrypted, Strict RBAC)
                          │ (PII, Exact GPS, Raw Images, Admin Notes)
                          ▼
                    [Sanitization Engine]
                          │ • Coordinate Generalization (~1.1 km)
                          │ • EXIF / GPS Metadata Stripping
                          │ • PII & Confidential Key Filtering
                          ▼
                    [Public Data Partition] ──► [Public Web App]
```

- **Location Generalization**: Public observation coordinates are truncated to a coarse ~1.1 km grid resolution. Exact GPS coordinates are never accessible via public APIs.
- **Zero EXIF Image Pipeline**: Uploaded photos are inspected with Pillow, sanitized of all EXIF/GPS tags, re-encoded, and assigned randomized hashes.
- **Public API Sanitization**: All public DTOs explicitly exclude facility IDs, company names, reporter names, telephone numbers, and email addresses.
- **Application Hardening**:
  - Multi-tier rate limiting (60 req/min browsing, 10 req/min reporting, 5 req/min uploads).
  - Parameterized database queries via SQLAlchemy (SQL-injection immune).
  - Administrative endpoints isolated under `/api/internal/*` protected by `X-Admin-Key`.

*For comprehensive security and privacy specifications, see [docs/SECURITY.md](docs/SECURITY.md) and [docs/PRIVACY_AND_LEGAL.md](docs/PRIVACY_AND_LEGAL.md).*

---

## 10. Reliability

Environmental monitoring platforms must remain operational when extreme weather impacts infrastructure.

- **Graceful Degradation**: If an external radar API fails, satellite flood layers display a *Data Unavailable* badge, while citizen reporting, station telemetry, and navigation continue to function normally.
- **Circuit Breakers**: External HTTP adapters use three-state circuit breakers (`CLOSED` → `OPEN` → `HALF_OPEN`) to prevent cascade timeouts during agency outages.
- **Idempotent Pipelines**: Citizen reports and external ingestion batches leverage SHA-256 idempotency keys to prevent duplicate records on intermittent network retries.
- **Automated Disaster Recovery**: Integrated backup verification scripts test full database restorations. Benchmark recovery targets:
  - **RTO (Recovery Time Objective)**: `< 30 seconds` (observed ~0.94s in benchmark).
  - **RPO (Recovery Point Objective)**: `24 hours` (daily snapshot cycle).

---

## 11. Real-Time Architecture

FloodTrace provides a real-time event broadcasting endpoint:
```http
GET /api/v1/realtime/events
```

- **Protocol**: Server-Sent Events (SSE) with automatic reconnection and 15-second keepalive pulses.
- **Privacy-Preserving**: Dispatches lightweight metadata events (e.g., `DATA_UPDATED`, `STATION_ALERT`) without transmitting raw records or personal details over public streams.
- **Transparency Distinction**: Real-time event broadcasting refers to *dashboard notification latency*; it does **not** imply that all external government sensors update in real time. Each source displays its own factual freshness timestamp.

---

## 12. Technology Stack

```text
┌────────────────────────────────────────────────────────┐
│                   Frontend (Client)                    │
│   React 18  •  TypeScript  •  Vite  •  Tailwind CSS    │
│    React Router v7  •  Leaflet GIS  •  Lucide Icons    │
└───────────────────────────┬────────────────────────────┘
                            │ REST / SSE
┌───────────────────────────▼────────────────────────────┐
│                    Backend (API)                       │
│     Python 3.11+  •  FastAPI  •  Pydantic v2           │
│         SQLAlchemy Core  •  Uvicorn  •  Pillow         │
└───────────────────────────┬────────────────────────────┘
                            │ Connection Pool (GiST Index)
┌───────────────────────────▼────────────────────────────┐
│                 Database & Spatial GIS                 │
│             PostgreSQL 15+  •  PostGIS 3.3+            │
└────────────────────────────────────────────────────────┘
```

---

## 13. System Architecture

```text
                  PUBLIC INTERNET
                         │
                         ▼
        [ Edge CDN / WAF / Reverse Proxy ]
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
 [ Frontend SPA (Vite) ]       [ FastAPI REST / SSE ]
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
                 [ Public Router ]              [ Internal Router ]
             (/api/public/* - Sanitized)     (/api/internal/* - X-Admin-Key)
                         │                               │
                         └───────────────┬───────────────┘
                                         ▼
                            [ Private Subnet / VPC ]
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
             [ PostGIS Spatial DB ]            [ Asynchronous Queue ]
```

---

## 14. Project Structure

```text
FloodTrace/
├── apps/
│   ├── api/                     # Python / FastAPI Backend
│   │   ├── app/
│   │   │   ├── adapters/        # External agency data adapters (PCD, RID, TMD, etc.)
│   │   │   ├── api/
│   │   │   │   ├── internal/    # Authenticated administrative endpoints
│   │   │   │   ├── public/      # Sanitized, evidence-oriented citizen endpoints
│   │   │   │   └── v1/          # Core operational telemetry & risk routes
│   │   │   ├── core/            # Config, circuit breakers, provenance, safety policies
│   │   │   ├── models/          # SQLAlchemy and Pydantic entities
│   │   │   └── services/        # Hydrological routing & verification engines
│   │   └── tests/               # Pytest suite (Sanitization, Resilience, Security)
│   │
│   └── web/                     # React / TypeScript / Vite Frontend
│       ├── src/
│       │   ├── components/      # UI, continuous GIS maps, layout shells
│       │   ├── pages/           # Dedicated route views (Map, Overview, Report, etc.)
│       │   └── types/           # Strict TypeScript DTO definitions
│       └── package.json
│
├── docs/                        # Formal architecture & audit documentation
│   ├── DATA_SOURCES.md          # Data catalog, custodian details & licenses
│   ├── DATA_PROVENANCE.md       # Lineage models, audit trails & hash verification
│   ├── METHODOLOGY.md           # Hydrological connectivity & screening formulas
│   ├── SECURITY.md              # Threat models, upload safety & authentication
│   ├── PRIVACY_AND_LEGAL.md     # Coordinate generalization & legal waivers
│   └── AUDIT/                   # Production readiness verification checklists
│
├── scripts/                     # Disaster recovery drills & stress testing tools
├── docker-compose.yml           # Local multi-container development configuration
├── .gitignore                   # Production repository ignore rules
└── README.md                    # Project documentation
```

---

## 15. Local Development

### Prerequisites

- **Python**: Version 3.11 or higher
- **Node.js**: Version 18.x or higher with `npm`
- **PostgreSQL**: Version 15+ with `postgis` extension enabled

### 1. Backend Setup

```bash
# Clone repository
git clone https://github.com/Chalermsak1/FloodTrace.git
cd FloodTrace

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -r apps/api/requirements.txt

# Start backend server with live reload
python3 -m uvicorn apps.api.app.main:app --reload --port 8000
```
Backend will be available at `http://localhost:8000` (Interactive Swagger docs: `http://localhost:8000/docs`).

### 2. Frontend Setup

```bash
# In a new terminal window
cd apps/web

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend dashboard will be running at `http://localhost:5173`.

---

## 16. Testing

The repository maintains an automated testing suite verifying data integrity, spatial routing, rate limiting, and security boundaries.

### Run Backend Tests

```bash
PYTHONPATH=. .venv/bin/pytest apps/api/tests/ -v
```

**Verified Test Results**:
```text
======================== 76 passed, 3 warnings in 2.10s ========================
```
- **Public API Sanitization Tests**: 16 dedicated test cases recursively verifying zero exposure of factory IDs, exact GPS, or reporter identities.
- **Reliability & Resilience Tests**: Circuit breaker trips, request ID tracing, idempotency deduplication, and rate limiting enforcement.
- **Fail-Closed Security Tests**: Rejection of unauthorized production data and unreviewed claims.

### Run Frontend Verification Build

```bash
cd apps/web && npm run build
```

**Verified Build Output**:
```text
✓ 1593 modules transformed.
✓ built in 1.86s (0 TypeScript errors)
```

---

## 17. Current Project Status

```text
┌─────────────────────────────────────────────────────────────┐
│                     FLOODTRACE PLATFORM                     │
├──────────────────────────┬──────────────────────────────────┤
│ System Environment:      │ LOCAL_DEVELOPMENT / INTERNAL_TEST│
│ Production Status:       │ NOT READY (Intentionally Gated)  │
├──────────────────────────┼──────────────────────────────────┤
│ External Candidate Sources: 14                              │
│ Private-Authorized Sources: 0 (Pending Agency Agreements)   │
│ Active Internal Sources:  │ 1 (Citizen Observation Network)  │
├──────────────────────────┼──────────────────────────────────┤
│ Automated Test Coverage: │ 76 / 76 PASSED (100%)            │
│ Frontend Production Build:│ PASSED (0 Errors)               │
│ Load Benchmark (Stress): │ 150 / 150 Successful (>250 rps)  │
│ Database Restore Drill:  │ PASSED (0.94s observed)          │
└──────────────────────────┴──────────────────────────────────┘
```

> **Why is production gated?**
> FloodTrace strictly distinguishes code quality from operational authorization. While the codebase is thoroughly tested and resilient, production deployment remains paused until inter-agency data agreements and formal legal reviews are finalized.

---

## 18. Roadmap

### Phase 1: Core Platform Engineering (Completed)
- [x] PostGIS spatial database schema and hydrological topology routing.
- [x] Data provenance tracking and immutable cryptographic records.
- [x] Fail-closed access policy engine and circuit breaker integration.
- [x] Citizen reporting pipeline with automated EXIF stripping and ~1.1 km coordinate generalization.
- [x] 8 dedicated Thai-first responsive pages with WCAG 2.1 AA accessibility standards.
- [x] Continuous GeoJSON sub-basin GIS mapping (eliminated all circular buffers).
- [x] 100% automated test suite passing (76/76 unit and integration tests).

### Phase 2: Inter-Agency Onboarding (Current Milestone)
- [ ] Establish formal data-sharing agreements with GISTDA, RID, and PCD.
- [ ] Secure official production API credentials and verify redistribution licensing.
- [ ] Validate live telemetry sync under production bandwidth.

### Phase 3: Production Infrastructure & Hardening
- [ ] Provision isolated Virtual Private Cloud (VPC) with database in private subnets.
- [ ] Configure KMS-backed production secrets management.
- [ ] Conduct external penetration testing and independent code audits.

### Phase 4: Formal Governance & Public Launch
- [ ] Legal counsel review under Thai PDPA and the Computer Crime Act.
- [ ] Publish standard operating procedures (SOP) for community observation moderators.
- [ ] Community pilot rollout in high-priority Prachin Buri sub-basins.

---

## 19. Documentation Links

Comprehensive technical documentation is maintained in the [`docs/`](docs/) directory:

- [**Data Sources Catalog** (`docs/DATA_SOURCES.md`)](docs/DATA_SOURCES.md): Full breakdown of 15 candidate sources, update cadences, custodians, and licensing constraints.
- [**Data Provenance Model** (`docs/DATA_PROVENANCE.md`)](docs/DATA_PROVENANCE.md): Specifications for audit trails, metadata headers, and verification lineage.
- [**Hydrological Methodology** (`docs/METHODOLOGY.md`)](docs/METHODOLOGY.md): Scientific overview of Source–Pathway–Receptor modeling and screening criteria.
- [**Security Architecture** (`docs/SECURITY.md`)](docs/SECURITY.md): Threat vectors, network isolation, cryptographic controls, and upload validation.
- [**Privacy and Legal Policies** (`docs/PRIVACY_AND_LEGAL.md`)](docs/PRIVACY_AND_LEGAL.md): Coordinate protection rules, legal disclaimers, and data takedown workflows.
- [**Production Readiness Audit** (`docs/AUDIT/PRODUCTION_READINESS.md`)](docs/AUDIT/PRODUCTION_READINESS.md): Complete engineering audit logs, stress benchmarks, and blocker tracking.

---

## 20. Engineering Philosophy

> ### *"Honest over Impressive."*

A digital monitoring system must remain useful when external systems fail, and it must never invent or extrapolate information simply to make an interface look complete.

- Prefer **`NO DATA`** over a fabricated or estimated value.
- Prefer **`ACCESS REQUIRED`** over an unauthorized or unverified scrape.
- Prefer **`INSUFFICIENT DATA`** over an unsupported conclusion.
- Prefer **`UNVERIFIED`** over presenting an observation as a laboratory fact.
- Maintain that **spatial connectivity is not legal causation**.

FloodTrace is engineered to earn public and institutional trust through transparency, scientific restraint, and relentless data integrity.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
