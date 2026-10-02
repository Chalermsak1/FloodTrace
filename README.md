# FloodTrace

## Geospatial Flood & Environmental Monitoring Platform

**Prachin Buri, Thailand**

FloodTrace is a geospatial environmental monitoring platform designed
to help communities, researchers, and authorized organizations
understand flood conditions, hydrological connectivity, environmental
monitoring priorities, community observations, and official
environmental evidence in a structured and traceable way.

The platform is designed around one central principle:

> **Honest over Impressive — the system must remain useful when parts
> fail, and it must never create or fabricate information simply to
> make the interface appear complete.**

FloodTrace does not attempt to determine guilt, identify a "polluter",
or automatically establish that a specific facility caused
contamination.

Instead, it focuses on:

- evidence
- provenance
- spatial relationships
- water connectivity
- monitoring priority
- community observations
- official results
- data freshness
- uncertainty
- verification

---

# Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Why FloodTrace Exists](#2-why-floodtrace-exists)
- [3. Problem Statement](#3-problem-statement)
- [4. What FloodTrace Is Designed to Solve](#4-what-floodtrace-is-designed-to-solve)
- [5. What FloodTrace Does](#5-what-floodtrace-does)
- [6. What FloodTrace Does Not Do](#6-what-floodtrace-does-not-do)
- [7. Core Concept](#7-core-concept)
- [8. System Workflow](#8-system-workflow)
- [9. Evidence Model](#9-evidence-model)
- [10. Data Classification](#10-data-classification)
- [11. Data Integrity Principles](#11-data-integrity-principles)
- [12. External Data Policy](#12-external-data-policy)
- [13. Current Data Availability](#13-current-data-availability)
- [14. Candidate Data Sources](#14-candidate-data-sources)
- [15. Real Data Integration Architecture](#15-real-data-integration-architecture)
- [16. Automated Data Pipeline](#16-automated-data-pipeline)
- [17. Data Validation](#17-data-validation)
- [18. Data Provenance](#18-data-provenance)
- [19. Data Freshness](#19-data-freshness)
- [20. Deduplication](#20-deduplication)
- [21. Hydrological Connectivity](#21-hydrological-connectivity)
- [22. Flood Analysis](#22-flood-analysis)
- [23. Environmental Monitoring Priority](#23-environmental-monitoring-priority)
- [24. Forecasting](#24-forecasting)
- [25. Community Reporting](#25-community-reporting)
- [26. Citizen Privacy](#26-citizen-privacy)
- [27. Official Environmental Results](#27-official-environmental-results)
- [28. Evidence Packets](#28-evidence-packets)
- [29. Public Dashboard](#29-public-dashboard)
- [30. Facility Information Policy](#30-facility-information-policy)
- [31. Real-Time Event Architecture](#31-real-time-event-architecture)
- [32. Reliability Engineering](#32-reliability-engineering)
- [33. Graceful Degradation](#33-graceful-degradation)
- [34. Circuit Breaker](#34-circuit-breaker)
- [35. API Error Handling](#35-api-error-handling)
- [36. Request Tracing](#36-request-tracing)
- [37. Database Architecture](#37-database-architecture)
- [38. Database Performance](#38-database-performance)
- [39. Security Architecture](#39-security-architecture)
- [40. Authentication and Authorization](#40-authentication-and-authorization)
- [41. Upload Security](#41-upload-security)
- [42. Rate Limiting and Abuse Prevention](#42-rate-limiting-and-abuse-prevention)
- [43. Privacy Architecture](#43-privacy-architecture)
- [44. Backup and Disaster Recovery](#44-backup-and-disaster-recovery)
- [45. Health Monitoring](#45-health-monitoring)
- [46. Observability](#46-observability)
- [47. Load and Stress Testing](#47-load-and-stress-testing)
- [48. Failure Testing](#48-failure-testing)
- [49. Accessibility](#49-accessibility)
- [50. Mobile Experience](#50-mobile-experience)
- [51. Documentation](#51-documentation)
- [52. Technology Stack](#52-technology-stack)
- [53. Repository Structure](#53-repository-structure)
- [54. Local Development](#54-local-development)
- [55. Testing](#55-testing)
- [56. Security Testing](#56-security-testing)
- [57. Production Readiness](#57-production-readiness)
- [58. Known Limitations](#58-known-limitations)
- [59. Remaining Deployment Blockers](#59-remaining-deployment-blockers)
- [60. Roadmap](#60-roadmap)
- [61. Engineering Philosophy](#61-engineering-philosophy)
- [62. Documentation](#62-documentation)
- [63. Project Status](#63-project-status)

---

# 1. Project Overview

FloodTrace is designed as a geospatial environmental intelligence
platform for Prachin Buri, Thailand.

The system combines:

- geographic information systems
- flood information
- hydrological network analysis
- environmental monitoring information
- official records
- community observations
- forecasting
- data provenance
- privacy protection
- evidence review
- reliability engineering

The platform is designed to transform fragmented information into a
single structured interface where users can understand:

1. where an event is occurring
2. what the system actually knows
3. where the information came from
4. when the information was collected
5. whether the information is measured, modeled, forecast, or reported
6. what remains unknown
7. what may require further verification

The system architecture is intentionally designed so that unavailable
data remains unavailable instead of being replaced by fabricated
values.

---

# 2. Why FloodTrace Exists

Flood events can affect communities, agriculture, waterways,
infrastructure, and environmental conditions simultaneously.

However, relevant information is often distributed across different
organizations, formats, systems, and update cycles.

For example:

- flood information may come from one organization
- rainfall observations may come from another
- water-level telemetry may come from monitoring stations
- environmental measurements may come from environmental agencies
- waterway geometry may come from GIS datasets
- land-use information may come from agricultural or land-management
  agencies
- local observations may come from citizens

This creates a practical information problem:

> The data may exist, but the relationship between the data is not
> always easy for users to understand.

FloodTrace addresses this problem by providing a common spatial and
evidence-oriented interface.

---

# 3. Problem Statement

A conventional flood map can answer:

> "Where is the flood?"

But environmental monitoring often requires more context.

Users may also need to understand:

- how the water is connected
- what areas are downstream
- whether monitoring should be prioritized
- whether there are community observations
- whether official measurements exist
- whether the available information is current
- whether a result is observed or modeled
- what information is missing

FloodTrace therefore treats flood monitoring as a chain of evidence
rather than a single map layer.

---

# 4. What FloodTrace Is Designed to Solve

FloodTrace focuses on five major problems.

## 4.1 Fragmented information

Important environmental and flood-related information can be distributed
across different systems.

### Approach

FloodTrace provides an adapter-based architecture so multiple data
sources can be integrated under one provenance and validation model.

---

## 4.2 Difficult-to-understand geographic relationships

Users may know that a flood exists but may not understand how water
moves through connected waterways.

### Approach

FloodTrace uses GIS-based hydrological connectivity analysis to
represent upstream and downstream relationships.

---

## 4.3 Uncertainty

A model prediction is not the same as an observed measurement.

A citizen report is not the same as a laboratory result.

A historical dataset is not the same as current telemetry.

### Approach

FloodTrace explicitly labels information by evidence type.

---

## 4.4 Missing information

External APIs can fail.

Sensors can stop responding.

Data-sharing permissions may not exist.

A dataset may become stale.

### Approach

FloodTrace uses fail-closed behavior and graceful degradation.

When data is unavailable, the system reports that it is unavailable.

---

## 4.5 Public trust

A monitoring platform can become misleading if it fills missing
information with assumptions.

### Approach

FloodTrace follows:

> **Honest over Impressive**

The system prefers:

> "No data available"

over:

> "A believable but fabricated number."

---

# 5. What FloodTrace Does

FloodTrace provides the following major capabilities.

## Main Map

Displays spatial information such as:

- flood areas
- monitoring priority
- hydrological relationships
- community observations
- official environmental results
- forecast information when authorized and available

---

## My Area

Allows users to follow a location of interest and view relevant
information for that area.

---

## Community Reporting

Users can submit structured observations such as:

- unusual water color
- unusual odor
- surface residue
- foam
- sediment
- fish or animal observations
- waste/material movement
- flooding
- agricultural impacts

---

## Area Detail

Provides an evidence-oriented summary of a selected location.

The interface separates:

- what is known
- what was observed
- what the model suggests
- what is unknown
- what should be verified

---

## Forecast

Displays forecast information only when an authorized and verified
forecast source is available.

Forecasts are always distinguished from observations.

---

## Community

Displays community observations and observation clusters.

Citizen observations initially remain:

```text
CITIZEN_REPORTED
UNVERIFIED
```

---

## Official Results

Displays official environmental results when those results are
available and permitted for publication.

---

# 6. What FloodTrace Does Not Do

FloodTrace is not designed to:

- accuse organizations
- identify a "polluter"
- create a blacklist
- rank facilities by danger
- assign criminal responsibility
- automatically establish contamination
- automatically identify the source of contamination
- replace laboratory testing
- replace regulatory agencies
- replace environmental investigations
- generate health conclusions without authoritative evidence

A spatial relationship is not automatically a causal relationship.

For example:

```text
Flood Contact
+
Hydrological Connectivity
```

does not automatically mean:

```text
Contamination
```

Similarly:

```text
Facility Proximity
```

does not automatically mean:

```text
Facility Caused Contamination
```

---

# 7. Core Concept

FloodTrace uses a Source–Pathway–Receptor concept.

```text
SOURCE
   ↓
FLOOD CONTACT
   ↓
WATER / HYDROLOGICAL CONNECTIVITY
   ↓
POTENTIAL EXPOSURE
   ↓
MONITORING PRIORITY
   ↓
COMMUNITY OBSERVATION
   ↓
VERIFICATION
   ↓
OFFICIAL / LAB RESULT
   ↓
POST-FLOOD MONITORING
```

The system uses this chain to organize evidence and prioritize
verification.

It does not use the chain to automatically assign blame.

---

# 8. System Workflow

The high-level data flow is:

```text
External / Internal Source
            ↓
      Access Control
            ↓
        Data Fetch
            ↓
         Validation
            ↓
       Normalization
            ↓
        Provenance
            ↓
       Deduplication
            ↓
      PostgreSQL/PostGIS
            ↓
        GIS / Analysis
            ↓
     Publication Controls
            ↓
        FloodTrace API
            ↓
        Web Dashboard
```

For automated updates:

```text
Scheduler
    ↓
Queue
    ↓
Worker
    ↓
Source Adapter
    ↓
Validation
    ↓
Database
    ↓
DATA_UPDATED
    ↓
SSE
    ↓
Frontend
```

---

# 9. Evidence Model

FloodTrace separates information into evidence layers.

### What We Know
Facts and official records supported by the available data.

### What Was Observed
Observations submitted by users or collected through monitoring systems.

### What the Model Suggests
Derived or modeled results such as:
- spatial relationships
- connectivity
- modeled exposure
- forecast expansion

### What Is Unknown
Examples:
- missing water-quality measurements
- missing laboratory confirmation
- unavailable telemetry
- unavailable authorized source
- uncertain source attribution

### What Should Be Verified
Potential next steps such as:
- sampling
- environmental inspection
- data verification
- additional monitoring

The system does not automatically convert "should be verified" into
"confirmed."

---

# 10. Data Classification

FloodTrace uses explicit data classifications.

- `OFFICIAL_RECORD`: A record published or supplied by an official source.
- `MEASURED_FACT`: A measurement obtained from an actual monitoring source.
- `DERIVED`: A result generated by processing existing source information (e.g., geocoded locations, spatial joins, calculated distances).
- `MODELED`: A model or spatial-analysis result (e.g., hydrological connectivity, screening zones).
- `FORECAST`: A prediction for a future period.
- `CITIZEN_REPORTED`: An observation submitted by a user.
- `UNVERIFIED`: Information that has not yet been confirmed by an appropriate review process.
- `OFFICIAL_CONFIRMED`: Information supported by an authorized official result.
- `INSUFFICIENT_DATA`: A state used when the available evidence is not sufficient to support a conclusion.

---

# 11. Data Integrity Principles

FloodTrace follows strict data integrity requirements.

The system must never invent:

- flood values
- rainfall
- water level
- water quality
- laboratory measurements
- chemical concentrations
- facility information
- coordinates
- forecasts
- timestamps
- report counts
- confidence values

If a value is missing:
`null` or a corresponding unavailable state is returned.

If a source cannot be accessed:
`ACCESS_REQUIRED` or `SOURCE_UNAVAILABLE`

If evidence is not sufficient:
`INSUFFICIENT_DATA`

This principle prevents the frontend from looking more complete than
the available evidence actually is.

---

# 12. External Data Policy

FloodTrace currently enforces:

```python
REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True
```

This means external production data must have verified authorized
access.

Accepted production state:
- `PRIVATE_AUTHORIZED`

Blocked states include:
- `PUBLIC_ONLY`
- `PRIVATE_PENDING`
- `UNKNOWN_ACCESS`
- `UNAVAILABLE`
- `LICENSE_REVIEW_REQUIRED`

An official source does not automatically mean that FloodTrace has
permission to ingest its data into its production pipeline.

A public dataset may be real and useful while still being blocked by
the current project policy.

---

# 13. Current Data Availability

The current system state is:

```text
INTERNAL_SOURCE_AVAILABLE = 1
EXTERNAL_PRIVATE_AUTHORIZED = 0
EXTERNAL_PRODUCTION_SOURCES = 0
```

The latest engineering report confirms that all 14 external candidate
sources are currently classified as restricted or blocked for
production ingestion.

The internal source:
`floodtrace_citizen` is authorized within the system architecture.

However, citizen reports generated for testing have been explicitly
classified as `TEST_DEMO` so they are not presented as real public submissions.

This distinction is critical.

---

# 14. Candidate Data Sources

FloodTrace is architected to support 15 source entries, including
internal and external sources.

Major source groups include:

- GISTDA Disaster
- ThaiWater / HII
- RID
- TMD
- DWR
- DEM / terrain
- DIW
- PCD / REO7
- DGR
- DOPA
- MOPH
- LDD
- internal citizen reporting
- supporting official source integrations
- internal governance/provenance-related source records

The current source registry is designed around real organizations and
real service locations.

However:
A source being registered in the adapter architecture does not mean
that FloodTrace currently has production authorization to use that
source.

---

# 15. Real Data Integration Architecture

FloodTrace uses an adapter-based architecture.

The purpose of the adapter layer is to isolate external source-specific
logic from the rest of the application.

```text
GISTDA Adapter
ThaiWater Adapter
RID Adapter
TMD Adapter
PCD Adapter
DIW Adapter
DWR Adapter
LDD Adapter
        ↓
 Common Validation Layer
        ↓
 Common Provenance Layer
        ↓
 Common Storage Layer
```

This allows the system to add a verified source later without
rewriting the entire application architecture.

The latest engineering implementation includes source adapters and
registry logic for official sources.

---

# 16. Automated Data Pipeline

The data pipeline is asynchronous.

Implemented architecture:

```text
Source
  ↓
Scheduler
  ↓
Queue
  ↓
Worker
  ↓
Fetch
  ↓
Validate
  ↓
Normalize
  ↓
Provenance
  ↓
Deduplicate
  ↓
PostgreSQL/PostGIS
```

The pipeline is separated from ordinary public API requests so that
external data processing does not block normal user interactions.

The current implementation uses an internal asynchronous queue for
pipeline processing.

---

# 17. Data Validation

Before external data is stored, the pipeline validates it.

Validation includes:
- schema
- types
- coordinates
- geometry
- timestamp
- physical range
- required fields
- duplicates

The current implementation includes geographic validation and rejects
invalid timestamps and impossible spatial values.

Invalid data is rejected rather than silently corrected into something
that appears valid.

---

# 18. Data Provenance

Every important production data record should be traceable.

The provenance model captures concepts such as:
- source
- organization
- dataset
- record identifier
- source timestamp
- retrieval timestamp
- source version
- access status
- license status
- classification
- transformation
- freshness

This creates a chain:

```text
PUBLIC RESULT
      ↓
MODEL / GIS PROCESSING
      ↓
STORED RECORD
      ↓
AUTHORIZED SOURCE
```

The purpose is to allow a user or reviewer to understand where an
important result originated.

---

# 19. Data Freshness

Different data sources change at different speeds.

FloodTrace therefore uses source-specific freshness behavior.

The latest implementation documents categories such as:
- `LIVE / HIGH_FREQUENCY`
- `DAILY`
- `PERIODIC`
- `HISTORICAL`
- `STATIC_REFERENCE`
- `FORECAST`

Examples documented in the current implementation include:
- high-frequency telemetry: up to approximately 3 hours
- daily forecast information: approximately 24–48 hours
- periodic flood imagery/products: approximately 7 days
- historical environmental records: approximately 1 year
- static reference information: approximately 10 years

These values are engineering freshness policies for the current
implementation, not universal definitions for every external source.

The UI should always display:
- Last Updated
- Source
- Data Status

---

# 20. Deduplication

Repeated ingestion must not create duplicate records.

The pipeline uses source-aware identity logic.

Potential identifiers include:
- `source`
- `dataset`
- `station_id`
- `observation_time`
- `source_record_id`

The purpose is to preserve a clean historical record.

---

# 21. Hydrological Connectivity

One of FloodTrace's key analytical functions is hydrological
connectivity.

The system can answer:
> "Where is this water connected to?"

Potential outputs include:
- upstream waterways
- downstream waterways
- connected reaches
- nearby monitoring stations
- modeled water pathways

The result is explicitly classified as:
`MODELED` or `DERIVED` depending on the processing method.

Hydrological connectivity does not automatically establish contamination
or responsibility.

---

# 22. Flood Analysis

Flood analysis may use authorized spatial information to identify:
- flood extent
- flood contact
- affected areas
- potential downstream relationships

Flood products must retain their actual temporal meaning.

Historical or recent flood products must not automatically be labeled
as forecasts.

---

# 23. Environmental Monitoring Priority

FloodTrace focuses on:
> **Environmental Verification Priority**

rather than:
> **Toxicity Score**

The purpose is to identify areas that may deserve additional monitoring,
investigation, or verification.

Inputs may include:
- flood contact
- water connectivity
- sensitive receptors
- available environmental evidence
- citizen observations
- monitoring coverage

The system must not turn a monitoring priority into a statement that
contamination is confirmed.

---

# 24. Forecasting

Forecast information is separated from observations.

The system distinguishes:
- `OBSERVED`
- `MODELED`
- `FORECAST`

The current production source policy means a public forecast source that
is not privately authorized remains blocked from production.

When an authorized source becomes available, the forecast interface
should expose:
- source
- forecast timestamp
- validity period
- model
- horizon
- uncertainty
- limitations

The latest implementation specifically enforces a boundary between
public/test forecast use and production access.

---

# 25. Community Reporting

FloodTrace provides a structured citizen observation mechanism.

Supported observations can include:
- unusual water color
- unusual odor
- residue
- foam
- sediment
- fish deaths
- animal observations
- waste movement
- flooding
- agricultural impacts

A new report begins as:
```text
CITIZEN_REPORTED
UNVERIFIED
```

This does not mean the report is false.
It means the system has not yet independently verified the observation.

---

# 26. Citizen Privacy

Citizen privacy is treated as a separate security boundary.

Private data may include:
- name
- phone number
- email
- exact GPS
- original uploaded image
- moderation notes

Public data should use generalized location.

The current implementation generalizes public coordinates to approximately
1.1 km grid resolution and keeps exact coordinates in the private data
partition.

The system does not claim that this makes re-identification
mathematically impossible.

The intended purpose is to reduce location re-identification risk.

---

# 27. Official Environmental Results

Official results are treated separately from community observations.

Examples may include:
- water quality measurements
- environmental inspections
- official laboratory information
- regulatory records

If such information becomes available through an authorized channel,
it can be classified appropriately as:
- `OFFICIAL_RECORD`
- `MEASURED_FACT`
- `OFFICIAL_CONFIRMED`

depending on what the actual source supports.

The platform does not fabricate laboratory values or official
conclusions.

---

# 28. Evidence Packets

FloodTrace can structure a case into an evidence packet.

A packet contains:

- **What We Know**: Supported official and measured information.
- **What Was Observed**: Community or monitoring observations.
- **What the Model Suggests**: Modeled relationships.
- **What Is Unknown**: Missing evidence and uncertainty.
- **What Should Be Verified**: Potential next verification steps.

This structure prevents the interface from accidentally combining
observation, modeling, and official evidence into one misleading
statement.

---

# 29. Public Dashboard

The public dashboard is designed around eight primary Thai-first sections:

1. **Overview** (`/overview`): Area monitoring status and verification priority
2. **Main Map** (`/map`): Continuous sub-basin polygons and GIS layers
3. **My Area** (`/my-area`): District/subdistrict tracking stored locally
4. **Report** (`/report`): 3-step citizen observation wizard
5. **Cases** (`/cases`): Active community observations with generalized coordinates
6. **Official Updates** (`/official-updates`): Official announcements and sampling results
7. **Data & Methodology** (`/data-methodology`): Transparent data catalog and limitations
8. **About** (`/about`): Purpose, legal disclaimers, and emergency hotlines

The public Facility section has been removed from the dashboard.
Facility-related information is not presented as a public ranking or blacklist.

---

# 30. Facility Information Policy

FloodTrace does not use public facility information to create:
- danger rankings
- toxicity rankings
- pollution rankings
- public accusation lists

Industrial classifications such as:
`101`, `105`, `106` must remain industrial activity classifications.

They are not automatically interpreted as:
- toxicity
- danger
- contamination
- responsibility

This distinction is fundamental to the system's evidence policy.

---

# 31. Real-Time Event Architecture

FloodTrace provides a Server-Sent Events endpoint:
`GET /api/v1/realtime/events`

The SSE service supports:
- keepalive pings every 15 seconds
- event broadcasting
- metadata-only updates
- safe data-change notifications (e.g., `DATA_UPDATED`)

The latest implementation sends metadata without exposing PII or
credentials.

---

# 32. Reliability Engineering

FloodTrace is designed around graceful failure.

The objective is:
> One unavailable dependency should not bring down the entire platform.

Reliability controls include:
- asynchronous data ingestion
- timeouts
- retries
- circuit breakers
- health checks
- idempotency
- database connection pooling
- statement timeouts
- structured errors
- graceful degradation

---

# 33. Graceful Degradation

If an external data source fails, the interface should continue operating
where possible.

```text
Flood source unavailable
        ↓
Flood layer unavailable
        ↓
Citizen reporting remains available
Search remains available
Basic map remains available
```

The system should display:
`Data unavailable` rather than generating a substitute value.

---

# 34. Circuit Breaker

FloodTrace uses circuit breaker states:
- `CLOSED`
- `OPEN`
- `HALF_OPEN`

When a dependency repeatedly fails:
```text
CLOSED → (failure threshold reached) → OPEN → (cooldown) → HALF_OPEN → CLOSED
```

The system stops repeatedly calling failing dependencies, avoiding cascade failures.

---

# 35. API Error Handling

FloodTrace standardizes API errors:

```json
{
  "success": false,
  "error": {
    "code": "SOURCE_UNAVAILABLE",
    "message": "Unable to access the data source at this time.",
    "retryable": true,
    "timestamp": "2026-10-02T17:30:00Z",
    "request_id": "req_1a2b3c4d"
  }
}
```

Possible classifications include:
- `NETWORK_ERROR`
- `TIMEOUT`
- `AUTH_ERROR`
- `RATE_LIMITED`
- `SOURCE_UNAVAILABLE`
- `INVALID_RESPONSE`
- `SCHEMA_CHANGED`
- `LICENSE_BLOCKED`
- `ACCESS_REQUIRED`
- `STALE_DATA`
- `INSUFFICIENT_DATA`

Internal technical details are not exposed to public users.

---

# 36. Request Tracing

Every request is associated with `X-Request-ID`.

The backend generates a UUID-based request identifier to trace:
```text
User Request → Reverse Proxy → FastAPI → Service → Database → Log
```

---

# 37. Database Architecture

FloodTrace uses:
- **PostgreSQL 15+**
- **PostGIS Extension**

PostGIS provides spatial capabilities for:
- geographic geometry
- spatial queries
- spatial joins
- waterway relationships
- geographic filtering
- map data

The production database remains strictly inside a private network.

---

# 38. Database Performance

The database configuration includes connection pooling and query controls:
- `pool_size = 10`
- `max_overflow = 20`
- `pool_timeout = 15s`
- `statement_timeout = 10,000 ms`
- Spatial GiST indexes on geographic columns

---

# 39. Security Architecture

The target production architecture is:

```text
Internet
    ↓
CDN / DDoS Protection
    ↓
WAF / Reverse Proxy
    ↓
Frontend (Vite / React SPA)
    ↓
FastAPI Backend
    ↓
Private Network
    ↓
PostgreSQL / PostGIS Database
```

The database is never exposed directly to the public Internet.

---

# 40. Authentication and Authorization

Administrative functions are separated from public functionality.

Supported roles include:
- `PUBLIC`
- `REPORTER`
- `REVIEWER`
- `ADMIN`

Sensitive administrative operations (`/api/internal/*`) require `X-Admin-Key` authorization.

---

# 41. Upload Security

Citizen image uploads are protected by multiple controls:
- Magic Byte validation
- MIME type check (`image/jpeg`, `image/png`, `image/webp`)
- Maximum file size (5 MB)
- Pillow decoding
- EXIF and GPS metadata removal
- Image re-encoding
- Randomized filename generation

---

# 42. Rate Limiting and Abuse Prevention

FloodTrace separates rate limits by endpoint function:
- Public browsing: `60 requests/minute`
- Report submission: `10 requests/minute`
- Image upload: `5 requests/minute`
- Administrative operations: `5 requests/minute`

---

# 43. Privacy Architecture

Privacy controls separate:
- **PRIVATE DATA**: exact coordinates, reporter name, phone, email, original photos, moderation notes.
- **PUBLIC DATA**: generalized coordinates (~1.1 km), sanitized photo, observation categories, observation timestamp.

The public API never returns private fields.

---

# 44. Backup and Disaster Recovery

FloodTrace includes an automated backup and restore drill script:
`scripts/backup_restore_drill.py`

Tested performance:
- RTO target: `< 30 seconds` (observed restore time ~0.94s in benchmark)
- RPO target: `24 hours`

---

# 45. Health Monitoring

FloodTrace provides standardized health and observability endpoints:
- `GET /health/live`: Process liveness check
- `GET /health/ready`: Readiness check (verifies database connectivity)
- `GET /health/sources`: Source-level access and health status
- `GET /health/metrics`: Operational metrics (queue depth, circuit breaker states, deduplication stats)

---

# 46. Observability

FloodTrace tracks operational events:
- API response times
- Source failures
- Queue depth
- Circuit breaker transitions
- Deduplication counts
- Alert severity levels (`INFO`, `WARNING`, `CRITICAL`)

---

# 47. Load and Stress Testing

Documented benchmark results (`scripts/load_stress_test.py`):
- 10 concurrent workers
- 150 consecutive requests
- Throughput: `> 250 requests/second`
- p50: `26.2 ms`
- p95: `59.9 ms`
- p99: `82.1 ms`
- Error rate: `0.00%` (150/150 successful)

---

# 48. Failure Testing

Tested failure scenarios include:
- External source failure (Circuit breaker triggers OPEN)
- Database failure (Readiness returns 503, liveness returns 200)
- Duplicate submission (Idempotency prevents duplicate records)
- Invalid coordinates (Request rejected with 422 Unprocessable Entity)
- Missing external data (Returns empty/null, never fabricated defaults)

---

# 49. Accessibility

- Keyboard navigation and visible focus indicators
- Semantic ARIA attributes
- Icon + Text dual communication
- Touch targets $\ge 44 \times 44\text{ px}$
- WCAG 2.1 Level AA color contrast compliance

---

# 50. Mobile Experience

- Thai-first responsive design for Desktop, Tablet, and Mobile
- Thumb-friendly fixed Mobile Bottom Navigation bar
- 3-step structured reporting wizard
- Local report draft recovery using `localStorage` (`DRAFT`, `PENDING_UPLOAD`, `SUBMITTING`, `SUBMITTED`, `FAILED`)

---

# 51. Documentation

Compact, comprehensive documentation architecture in `docs/`:
- `README.md`: Master project guide
- `docs/DATA_SOURCES.md`: Data catalog, update intervals, licensing
- `docs/DATA_PROVENANCE.md`: Provenance model, classifications, and lineage
- `docs/METHODOLOGY.md`: Hydrological connectivity, Source-Pathway-Receptor, screening zones
- `docs/SECURITY.md`: Security controls, upload validation, RBAC
- `docs/PRIVACY_AND_LEGAL.md`: Public/private boundary, coordinate generalization, legal waivers
- `docs/AUDIT/PRODUCTION_READINESS.md`: Production readiness criteria and checklist

---

# 52. Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router v7
- Leaflet / GIS Mapping Components
- Lucide React

### Backend
- Python 3.11+
- FastAPI & Starlette
- SQLAlchemy & GeoAlchemy2
- Pydantic v2
- Pillow (Image Sanitization)
- Uvicorn

### Database & GIS
- PostgreSQL 15+
- PostGIS Extension

---

# 53. Repository Structure

```text
FloodTrace/
│
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── adapters/
│   │   │   ├── api/
│   │   │   │   ├── internal/
│   │   │   │   ├── public/
│   │   │   │   └── v1/
│   │   │   ├── core/
│   │   │   ├── models/
│   │   │   └── services/
│   │   └── tests/
│   │
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── types/
│       └── package.json
│
├── data/
│   └── prachinburi_industrial_waste_diw.json
│
├── docs/
│   ├── DATA_SOURCES.md
│   ├── DATA_PROVENANCE.md
│   ├── METHODOLOGY.md
│   ├── SECURITY.md
│   ├── PRIVACY_AND_LEGAL.md
│   └── AUDIT/
│       └── PRODUCTION_READINESS.md
│
├── scripts/
│   ├── backup_restore_drill.py
│   └── load_stress_test.py
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

# 54. Local Development

### Requirements
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 15+ with PostGIS

### Backend Setup
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd apps/web
npm install
npm run dev
```

---

# 55. Testing

Run the complete automated backend test suite:

```bash
PYTHONPATH=. .venv/bin/pytest apps/api/tests/ -v
```

**Results:**
- **76 / 76 tests passed (100%)**
- Including 16 dedicated public API sanitization tests recursively verifying zero confidential field leakage.

Run frontend build verification:

```bash
cd apps/web && npm run build
```

**Results:**
- TypeScript + Vite build: **0 Errors (Passed in 1.86s)**

---

# 56. Security Testing

Security tests verify:
- SQL injection immunity via SQLAlchemy parameterized queries
- Image magic-byte validation and EXIF GPS stripping
- Path traversal prevention
- Sensitive key scanning (No hardcoded keys or DB credentials in client assets)
- Access control verification (`/api/internal/*` returns 401 without key)
- Privacy leak verification (No exact GPS or PII in public responses)

---

# 57. Production Readiness

Current status:
```text
LOCAL_DEVELOPMENT / INTERNAL_TEST
```

FloodTrace is intentionally NOT marked as production-ready yet. External data authorization and formal legal reviews remain pending.

---

# 58. Known Limitations

- **External data authorization**: 14 external candidate sources remain blocked for production until formal institutional agreements are established.
- **Hydrological modeling**: Currently uses sub-basin topological hydrography; full 2D hydrodynamic real-time modeling is planned for future phases.
- **Citizen reports**: Test-generated records are strictly marked as `TEST_DEMO` to prevent accidental public publication.

---

# 59. Remaining Deployment Blockers

1. **External Private Data Authorization**: Formal data-sharing agreements with GISTDA, RID, HII, TMD, PCD, and DIW.
2. **Formal Legal and Privacy Review**: Qualified legal counsel review of platform disclaimers and citizen observation processing under Thai Computer Crime Act and PDPA.

---

# 60. Roadmap

### Phase 1 — Completed
- [x] Core backend architecture & database schema
- [x] Data provenance & source registry
- [x] Fail-closed access control
- [x] Citizen reporting pipeline & image sanitization
- [x] Rate limiting, circuit breakers & idempotency
- [x] Health checks & disaster recovery drill
- [x] Responsive Thai-first frontend with 8 dedicated pages
- [x] Continuous GeoJSON sub-basin GIS map
- [x] Public API sanitization & automated security tests

### Phase 2 — Current
- [x] Internal testing & load benchmark
- [x] Data integrity validation
- [x] Test data isolation
- [x] Thai documentation

### Phase 3 — External Data Onboarding
- [ ] Obtain authorized GISTDA access
- [ ] Obtain authorized water-resource access (RID / HII)
- [ ] Obtain authorized PCD / DIW access
- [ ] Verify licenses and derived-output rights

### Phase 4 — Production Infrastructure
- [ ] Production VPC & Private Subnet for DB
- [ ] Production secrets management & KMS
- [ ] Continuous monitoring & alerting

### Phase 5 — Review and Deployment
- [ ] Formal privacy and legal review
- [ ] Institutional approval & staging deployment
- [ ] Limited release & public deployment

---

# 61. Engineering Philosophy

1. **Principle 1 — Evidence Before Interpretation**: Do not transform incomplete evidence into a confident conclusion.
2. **Principle 2 — Source Before Result**: Every important result must be traceable to its source.
3. **Principle 3 — Uncertainty Must Be Visible**: When uncertainty exists, expose it.
4. **Principle 4 — Missing Data Is Valid State**: The absence of data is not permission to fabricate data.
5. **Principle 5 — Model Is Not Measurement**: A model can help explain or prioritize; it is not a measured fact.
6. **Principle 6 — Observation Is Not Confirmation**: A citizen report is not an official lab result.
7. **Principle 7 — Connectivity Is Not Causation**: Hydrological connectivity does not automatically establish contamination or blame.
8. **Principle 8 — Privacy Is Part of the Architecture**: Enforced in data models, APIs, and storage by design.
9. **Principle 9 — Fail Honestly**: If a dependency fails, do not fabricate or hide the failure.

---

# 62. Documentation

Detailed technical references are maintained in `docs/`:
- `docs/DATA_SOURCES.md`
- `docs/DATA_PROVENANCE.md`
- `docs/METHODOLOGY.md`
- `docs/SECURITY.md`
- `docs/PRIVACY_AND_LEGAL.md`
- `docs/AUDIT/PRODUCTION_READINESS.md`

---

# 63. Project Status

```text
┌─────────────────────────────────────────────┐
│ FLOODTRACE                                  │
├─────────────────────────────────────────────┤
│ System Status:        INTERNAL TEST         │
│ Production Status:    NOT READY             │
│                                             │
│ External Sources:     14 (Gated)            │
│ Private Authorized:   0                     │
│ Internal Source:      1 (Authorized)        │
│                                             │
│ Automated Tests:      76 / 76 PASS (100%)   │
│ Frontend Build:       PASS (0 errors)       │
│ Load Test:            150 / 150 PASS        │
│ Restore Drill:        PASS (0.94s)          │
│                                             │
│ Legal Review:         PENDING               │
│ External Authorization:PENDING              │
└─────────────────────────────────────────────┘
```

> **Honest over Impressive.**
