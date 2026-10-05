# TASK-001 — Ruwaigon Product Transition Audit

## 1. Task identity

### Status

PLANNING — awaiting approval. No implementation is authorized by this artifact alone.

### Request summary

- Inspect the current FloodTrace product and produce an evidence-based, incremental transition plan to Ruwaigon.
- Treat Ruwaigon as a public environmental contamination monitoring and awareness platform whose core question is: “Should this area receive additional monitoring or verification?”
- Keep flooding as one transport and exposure factor, not the product identity or sole operating condition.
- Classify each meaningful surface or subsystem as exactly one of `KEEP`, `RENAME`, `REDESIGN`, `REMOVE`, or `DEFER`.
- Preserve truthful data, provenance, privacy, public/private separation, and non-accusatory communication.
- Planning scope is this file only. Product code, tests, scripts, dependencies, configuration, Git history, `implementation.md`, and `review.md` are unchanged.

### Planning scope

This audit covers the active public routes, supporting UI components, public and legacy API surfaces, GIS/model code, source adapters, citizen-report workflow, staff workflow, tests, data files, and governing documentation. Historical audit records are evidence, not automatically current truth.

## 2. Goal

Produce an implementation-ready transition contract that:

1. establishes Ruwaigon as the public product identity;
2. removes flood-only positioning while retaining flood, rainfall, and water-level context;
3. removes or fails closed on unsupported public facts and geometry;
4. makes `OFFICIAL`, `COMMUNITY`, and the `MODEL / DERIVED / FORECAST` family unmistakable, with a subtype when useful;
5. preserves working telemetry, citizen-report privacy, provenance, and the existing architecture;
6. divides work into reviewable phases instead of a rewrite.

### User-visible outcome after future implementation

A user can open Ruwaigon before, during, or after a flood and understand what is observed, officially published, community-reported, modeled, forecast, unavailable, or stale. Every area view answers whether additional monitoring or verification is warranted without claiming contamination, safety, causation, or a suspected polluter beyond available evidence.

## 3. Current-state evidence

### P-01 — Product identity

- The active shell still presents `FloodTrace` as the primary header and footer brand, with Ruwaigon as a badge; its subtitle remains “environmental quality and flood monitoring” (`apps/web/src/components/layout/AppLayout.tsx:133-150`, `apps/web/src/components/layout/AppLayout.tsx:416-425`).
- The API title, root metadata, workspace package, Docker service names, source IDs, report IDs, and many internal strings remain FloodTrace (`apps/api/app/main.py:199-203`, `apps/api/app/main.py:293-315`, `package.json:1-9`, `docker-compose.yml:1-53`).
- The repository contract explicitly makes Ruwaigon public-facing while allowing internal technical identifiers to remain unless a plan authorizes a rename (`AGENTS.md:3-10`). Therefore public branding and technical renaming are separate changes.

### P-02 — Navigation and information architecture

- The active public route set is `/overview`, `/map`, `/area-detail`, `/my-area`, `/report`, `/cases`, `/official-updates`, `/forecast`, `/knowledge`, `/data-methodology`, and `/about`; `/admin/reports` is separate (`apps/web/src/App.tsx:18-43`).
- Primary navigation is Home, Map, “Data,” “Reports,” and About; My Area, Forecast, Knowledge, and Methodology are secondary (`apps/web/src/components/layout/AppLayout.tsx:82-99`).
- The shared active layout fetches `/api/public/overview`, displays `system_updated_at_th` as “อัปเดตล่าสุด,” and otherwise shows a neutral instruction to check update time. Its notification bell nevertheless always shows an unread pulse and two literal notices: a monthly PCD/REO7 surface-water result and a lower-basin watch for Ban Sang/Si Maha Phot (`apps/web/src/components/layout/AppLayout.tsx:58-68`, `apps/web/src/components/layout/AppLayout.tsx:104-117`, `apps/web/src/components/layout/AppLayout.tsx:298-332`). Those literals are active public truth surfaces, not navigation decoration.
- The route inventory can support Ruwaigon incrementally, but generic labels such as “Data” and “Reports” do not explain evidence class or user intent.

### P-03 — Home page

- The hero already asks users to monitor environmental contamination and combines official, hydrological, environmental, community, and spatial-analysis inputs (`apps/web/src/pages/OverviewPage.tsx:151-160`).
- Quick access and a public map preview already provide useful entry points, but telemetry cards substitute unsupported fallback counts when fields are missing (`27`, `77`, and `3`) (`apps/web/src/pages/OverviewPage.tsx:368-393`).
- The page says it connects PCD and GISTDA data even though those sources are declared blocked (`apps/web/src/pages/OverviewPage.tsx:530-536`; `README.md:194-201`). It also renders the static official-update catalog as current agency reporting (`apps/web/src/pages/OverviewPage.tsx:409-469`).

### P-04 — Public map

- The active map requests monitoring priority, province boundary, waterways, water stations, rain stations, and generalized community observations (`apps/web/src/pages/MapPage.tsx:93-109`). Its legend correctly says priority colors are not contamination or toxicity confirmation (`apps/web/src/pages/MapPage.tsx:537-598`).
- The province boundary and outside mask load from repository GeoJSON (`apps/api/app/services/spatial_monitoring_service.py:37-40`, `apps/api/app/services/spatial_monitoring_service.py:173-185`).
- The monitoring cells are generated from code-defined centroids and waterways, with default water/rain scores, default thresholds, and freshness inferred from score rather than timestamps (`apps/api/app/services/spatial_monitoring_service.py:41-117`, `apps/api/app/services/spatial_monitoring_service.py:304-371`, `apps/api/app/services/spatial_monitoring_service.py:475-497`). This is code-authored geometry presented without sufficient provenance, not automatically invalid model geometry.
- The active MapLibre renderer contains code-authored district/tambon points labeled in comments as “Authentic” without a cited artifact, substitutes `ล่าสุด` when cell freshness is absent, substitutes “กำลังตรวจวัด” for missing water level, maps missing station status to “ปกติ,” and falls back to RID attribution (`apps/web/src/components/map/MapLibreMapView.tsx:57-128`, `apps/web/src/components/map/MapLibreMapView.tsx:511-528`, `apps/web/src/components/map/MapLibreMapView.tsx:690-728`). Its gray-area disclaimer correctly says out-of-scope does not mean safe or flood-free and should be preserved (`apps/web/src/components/map/MapLibreMapView.tsx:543-560`).
- Separate public endpoints return unsupported runtime watch-zone, flood-extent, forecast-zone, and waterway geometry while labeling it `MODEL` or `OFFICIAL` (`apps/api/app/api/public/router.py:174-350`, `apps/api/app/api/public/router.py:557-610`, `apps/api/app/api/public/router.py:616-727`, `apps/api/app/api/public/router.py:733-895`). Properly derived and labeled model geometry may remain when its inputs, method, version, and limitations are reproducible.
- The forecast map additionally creates hardcoded community receptor pins and assigns every third water station a laboratory icon without station-type evidence (`apps/web/src/components/map/ContinuousMapView.tsx:103-110`, `apps/web/src/components/map/ContinuousMapView.tsx:494-558`).

### P-05 — Area / overview experience

- Area detail combines area priority, official sampling, community observations, freshness, confidence, reasons, and forecast (`apps/web/src/pages/AreaDetailPage.tsx:220-283`, `apps/web/src/pages/AreaDetailPage.tsx:454-466`).
- The frontend inserts low priority, pending lab, “fresh today,” high quality, reasons, and stable 24-hour forecast text when the API omits fields (`apps/web/src/pages/AreaDetailPage.tsx:225-279`, `apps/web/src/pages/AreaDetailPage.tsx:454-466`).
- The overview and My Area APIs derive most narrative fields from `PRACHIN_SUB_BASINS`, count any report not marked `WITHHELD`, and use current time as freshness when no source timestamps exist (`apps/api/app/api/public/router.py:395-499`, `apps/api/app/api/public/router.py:1126-1185`).

### P-06 — Citizen reporting

- The active three-step UI uses Ruwaigon draft storage, a declaration against accusation, and `/api/public/reports` submission (`apps/web/src/pages/ReportPage.tsx:157-195`, `apps/web/src/pages/ReportPage.tsx:592-624`).
- Exact coordinates and generalized public coordinates are stored separately, and submitted reports begin as `UNVERIFIED` / `PENDING_REVIEW` (`apps/api/app/api/public/router.py:1515-1592`; `apps/api/app/models/entities.py:107-167`).
- The UI uploads to `/api/public/reports/upload-photo`, but the sanitizer exists at `/api/v1/reports/upload-photo`; the active upload therefore has no matching public route (`apps/web/src/pages/ReportPage.tsx:130-153`; `apps/api/app/api/v1/reports.py:195-218`).
- The moderation model and documentation define an explicit publication gate (`PRIVATE`, `PUBLIC_SAFE_SUMMARY`, `PUBLIC_VERIFIED`, `WITHHELD`) (`apps/api/app/models/entities.py:153-154`; `docs/CITIZEN_REPORT_WORKFLOW.md:114-119`).

### P-07 — Forecast

- The active forecast page presents current and future horizons and fetches `/zones`, `/flood-extent`, `/forecast-zones`, and `/waterways` (`apps/web/src/pages/ForecastPage.tsx:31-66`). It labels the display as a model and disclaims laboratory confirmation (`apps/web/src/pages/ForecastPage.tsx:166-188`).
- The displayed factor narratives and forecast geometry are static and do not vary from verified observations (`apps/web/src/pages/ForecastPage.tsx:202-236`; `apps/api/app/api/public/router.py:679-727`).
- The only forecast adapter is an Open-Meteo implementation governed under the blocked `tmd_forecast` source; production returns `FORECAST_UNAVAILABLE` when the gate applies (`apps/api/app/adapters/openmeteo.py:23-75`). The public legacy endpoint accepts a `test_mode` query that can bypass that production branch (`apps/api/app/api/v1/forecast.py:6-17`).
- `/api/v1/forecast/stations` publishes three code constants as stations, while the adapter silently maps an unknown key to Prachin Mueang and labels the query coordinates `OFFICIAL_COORDINATES` with verified-official forecast provenance (`apps/api/app/api/v1/forecast.py:19-23`; `apps/api/app/adapters/openmeteo.py:13-16`, `apps/api/app/adapters/openmeteo.py:31-33`, `apps/api/app/adapters/openmeteo.py:118-135`). Repository history and documentation provide no independent source record for these three coordinate selections. They are therefore application-defined forecast sampling points, not verified monitoring stations.

### P-08 — Official information

- The official-data page fetches water/rain stations and official updates, but its water-quality table hardcodes pH, DO, BOD, heavy-metal values, normal statuses, and PCD attribution (`apps/web/src/pages/OfficialUpdatesPage.tsx:40-50`, `apps/web/src/pages/OfficialUpdatesPage.tsx:123-230`).
- The backend returns a literal catalog of PCD laboratory claims, RID levels, and GISTDA flood extent as verified `OFFICIAL` content (`apps/api/app/api/public/router.py:352-390`, `apps/api/app/api/public/router.py:1254-1283`).
- PCD water-quality and GISTDA sources are not production-enabled (`README.md:194-200`; `apps/api/app/core/source_access.py:63-85`, `apps/api/app/core/source_access.py:287-310`).
- The active About page describes PCD, ThaiWater/สสน., RID, water-network/rain inputs, hydrological connectivity, and downstream receiving areas as the current workflow without qualifying which inputs are unavailable or unverified (`apps/web/src/pages/AboutPage.tsx:45-54`, `apps/web/src/pages/AboutPage.tsx:70-95`, `apps/web/src/pages/AboutPage.tsx:103-113`). This is an active current-source claim and must follow the same source-status contract as data pages.
- The active Data & Methodology page consumes `/api/public/provenance`, but its own fixed headings and methodology text state that external data refreshes every 15 minutes, local reference datasets are imported analysis inputs, and Sentinel-1 flood extent plus river-network geometry participate in the current model (`apps/web/src/pages/DataMethodologyPage.tsx:14-29`, `apps/web/src/pages/DataMethodologyPage.tsx:66-136`, `apps/web/src/pages/DataMethodologyPage.tsx:200-229`). These claims must render per-source status and fail closed when repository/runtime evidence is absent.

### P-09 — Data truth audit

- Confirmed active external integrations are ThaiWater water level and rainfall (`README.md:184-208`; `apps/api/app/adapters/thaiwater.py:20-49`, `apps/api/app/adapters/thaiwater.py:160-189`). The adapters make real requests and fail to empty lists on access or request failure.
- Repository artifacts are the Prachin Buri boundary, outside mask, and DIW May 2020 snapshot (`data/prachinburi_boundary.geojson`, `data/prachinburi_outside_mask.geojson`, `data/prachinburi_industrial_waste_diw.json`). The DIW JSON carries embedded source URL/method notes, but the repository does not contain its acquisition manifest, source checksum, license decision, or independent verification record; the boundary/mask likewise lack a repository provenance record. Presence and self-described metadata are insufficient for `LOCAL / VERIFIED REFERENCE`, so all three remain `LOCAL / UNVERIFIED` until reconciled. `apps/data/` contains only `uploads/.gitkeep`; no DWR waterway, DOPA village, MOPH hospital, GISTDA, TMD, or PCD dataset was found.
- The source registry distinguishes active, historical/reference, and blocked sources and requires `INSUFFICIENT_DATA` for missing assays (`apps/api/app/core/source_access.py:60-186`, `apps/api/app/core/source_access.py:212-310`). Some catalog claims must be reconciled with the artifacts actually present.
- The unauthenticated `/health/sources` response separately hardcodes DWR, DIW, DOPA, and MOPH as production references, assigns invented counts (`3`, `65`, `11`) to absent DWR/DOPA/MOPH data, assigns them a fixed `2026-01-01` timestamp, and reports availability/freshness booleans from membership in hardcoded sets rather than evidence (`apps/api/app/main.py:378-450`, `apps/api/app/main.py:459-533`). This public source-health surface must use the same fail-closed source matrix as `/api/public/provenance`.
- Citizen observations are internal database data; no synthetic substitute is acceptable when external sources are blocked (`README.md:202-224`).

### P-10 — Citizen publication and media boundary

- The intended boundary is a sanitized `/api/public/*` router and an authenticated `/api/internal/*` router (`README.md:305-329`; `apps/api/app/api/internal/router.py:20-59`).
- New reports default to `PRIVATE`, while public overview, My Area, and observation queries exclude only `WITHHELD` (`apps/api/app/models/entities.py:153-154`; `apps/api/app/api/public/router.py:413-423`, `apps/api/app/api/public/router.py:1152-1161`, `apps/api/app/api/public/router.py:1205-1217`). The legacy report list also excludes only `WITHHELD`, and its cluster query has no publication predicate (`apps/api/app/api/v1/reports.py:40-69`, `apps/api/app/api/v1/reports.py:221-241`).
- Risk and evidence queries count or aggregate reports using the same permissive exclusion logic (`apps/api/app/api/v1/risk.py:257-264`, `apps/api/app/api/v1/risk.py:434-439`, `apps/api/app/api/v1/risk.py:588-593`). Spatial monitoring checks a nonexistent `SUPPRESSED` state rather than the documented allowlist (`apps/api/app/services/spatial_monitoring_service.py:272-284`). These paths let `PRIVATE` or otherwise unpublished reports affect public lists, counts, clusters, area summaries, and modeled priority.
- Sanitized media is not publication-authorized media. The upload route returns `/uploads/{filename}`, `main.py` mounts an unauthenticated static `/uploads` directory, and public observations construct the same URL (`apps/api/app/api/v1/reports.py:195-218`; `apps/api/app/main.py:278-281`; `apps/api/app/api/public/router.py:1244-1246`). Random filenames do not provide authorization. Storage paths also disagree: the upload route resolves to `apps/data/uploads`, while the static mount resolves to `data/uploads`.
- Nginx proxies `/uploads/` directly to that API mount; current compose variants persist only PostgreSQL, and the API image merely copies repository `data/` into `/app/data`, so report media has no declared private persistent volume (`apps/web/nginx.conf:89-95`; `deploy/production/docker-compose.prod.yml:1-82`; `apps/api/Dockerfile:14-16`).
- Staff report detail returns the stored `photo_url`, and the staff UI renders it directly. An authenticated filename route `/api/v1/admin/evidence/{filename}` exists and uses `basename`, but does not bind the file to a report or an explicit `view_reports` permission (`apps/api/app/api/v1/admin_reports.py:468-536`, `apps/api/app/api/v1/admin_reports.py:1257-1273`; `apps/web/src/pages/AdminReportsPage.tsx:1469-1481`). Safe migration can preserve staff access through a report-bound authenticated endpoint rather than public static delivery.

### P-11 — Sensitive routes, runtime mutation, forecast, and staff access

- Unauthenticated legacy `/api/v1/factories/*` and `/api/v1/risk/*` routes are mounted alongside public routes and can return facility identity, address/coordinates, screening results, source estimation, connected-waterway facility lists, evidence packets, and area-risk analysis (`apps/api/app/main.py:259-276`; `apps/api/app/api/v1/factories.py:39-128`; `apps/api/app/api/v1/risk.py:13-196`, `apps/api/app/api/v1/risk.py:214-404`, `apps/api/app/api/v1/risk.py:412-642`). Public exposure must be removed; justified analysis may remain behind an authenticated internal boundary.
- `POST /api/v1/governance/mode` has no authentication dependency, mutates global governance settings, repopulates datasets in development mode, and deletes facility, station, and reservoir rows in production mode (`apps/api/app/api/v1/governance.py:226-335`). This is a confirmed P0 runtime and data-integrity control failure.
- `GET /api/v1/forecast/?test_mode=true` passes caller input into the adapter, and the production block applies only when `is_test_mode` is false (`apps/api/app/api/v1/forecast.py:6-17`; `apps/api/app/adapters/openmeteo.py:35-44`). A caller can bypass the intended production forecast gate.
- Staff authentication accepts `token` or `key` query parameters and lets the client choose `X-Staff-User` and `X-Staff-Role`; a valid shared key can therefore select authorization role (`apps/api/app/core/staff_rbac.py:91-159`; `apps/web/src/pages/AdminReportsPage.tsx:121-131`, `apps/web/src/pages/AdminReportsPage.tsx:277-302`). Short-term containment is implementation-ready; a full identity-provider design is not.
- Existing permissions split report triage/assignment/review/publication across `ADMIN`, `REVIEWER`, `OPERATOR`, and `READ_ONLY`; only `ADMIN` can preserve the current publication action while also performing the rest of the staff report workflow (`apps/api/app/core/staff_rbac.py:24-55`; `apps/api/app/api/v1/admin_reports.py:720-1188`). The existing fixed fallback identity is `staff_admin_01` / `admin_user` with role `ADMIN`, so containment can make that server-owned identity explicit without inventing a new role (`apps/api/app/core/staff_rbac.py:151-159`; `apps/api/app/core/database.py:89-95`).
- `POST /api/v1/telemetry/sync` fetches external data and writes station/reservoir rows without authentication (`apps/api/app/api/v1/telemetry.py:117-165`). Treat this as P1 because it is an operational mutation route; require authorization and negative tests before production exposure.
- `GET /api/v1/alerts` creates a current `NORMAL` monitoring advisory with request-time timestamp, fixed coordinates, and verified-official provenance when no alert records exist (`apps/api/app/api/v1/alerts.py:47-66`). No alerts must return an empty/unavailable state, not reassurance.

### P-12 — Audit calibration and corrected non-findings

- Production startup invokes `validate_production_settings(raise_on_error=True)`, and validation rejects the known default admin keys and weak credentials (`apps/api/app/main.py:44-48`; `apps/api/app/core/config.py:81-140`). A predictable default admin key is therefore not a confirmed production-reachable bypass under normal validated startup. Configuration hardening remains useful, but must not be described as a confirmed bypass.
- Reviewed public DTOs use generalized coordinates and omit reporter name, email, phone, exact coordinates, moderation notes, and raw original image bytes (`apps/api/app/api/public/router.py:86-101`, `apps/api/app/api/public/router.py:1192-1248`; `apps/api/app/api/v1/reports.py:40-90`). Exact GPS, reporter identity/contact, moderation notes, raw original bytes, and EXIF exposure were not confirmed in reviewed public responses.
- Authenticated `/api/internal/facilities` is protected by `verify_admin_key` and is not itself public exposure (`apps/api/app/api/internal/router.py:20-57`; `apps/api/app/core/security.py:19-38`). The finding concerns parallel unauthenticated legacy routes.
- No active routed public page calls factory or risk APIs. Calls exist only in currently unreferenced legacy components (`apps/web/src/components/MyAreaModal.tsx`, `EvidencePacketModal.tsx`, `ProvenanceAuditModal.tsx`); repository fetch inventory shows active pages use `/api/public/*`. Backend reachability remains P0 even without an active frontend caller.

### P-13 — Terminology audit

- Safe language already exists: monitoring/verification priority, community observation, missing-data states, and disclaimers that model output is not laboratory confirmation (`AGENTS.md:30-48`; `README.md:212-224`).
- Unsafe or unclear language includes “current,” “official,” “fresh,” “normal,” “high-quality,” and agency attribution on unsupported fixtures; generic navigation labels; flood-only positioning; and internal terms such as hotspots, source estimation, and factories on unauthenticated routes.
- Public classification should use the three required families and preserve a subtype (`DERIVED`, `MODEL`, or `FORECAST`) instead of collapsing forecast into observed reality.

### P-14 — Technical architecture

- React 18, TypeScript, Vite, React Router, MapLibre/Leaflet, FastAPI, Pydantic, SQLAlchemy, and PostGIS are already present (`apps/web/package.json:1-31`; `apps/api/requirements.txt`; `docker-compose.yml:1-67`).
- The existing SPA, public/internal router split, source adapters, scheduler, database entities, provenance model, and tests are sufficient for an incremental transition. No framework, database, or map-library replacement is justified.
- Duplicate active/legacy frontend components and mixed `/api/public` versus `/api/v1` contracts increase transition risk, but cleanup can follow the active-path fixes.
- **Architecture replacement is not recommended.** Defects concern boundary enforcement, data contracts, publication state, authentication/authorization, and truthful public output—not framework selection.

### P-15 — Test impact

- Backend suites cover public DTO sanitization, data-source gates, privacy, GIS, report workflow, provenance, failure handling, and staff operations (`apps/api/tests/`).
- Some tests validate shape or labels rather than truth: static zones only need to be polygons, static official updates only need an `OFFICIAL` badge, overview cells must be nonempty, and the “no static fallback” test checks only integer types (`apps/api/tests/test_public_api_sanitization.py:67-137`; `apps/api/tests/test_public_overview.py:17-56`; `apps/api/tests/test_automated_refresh_and_truth.py:255-267`).
- Source-health coverage does not prevent hardcoded reference membership, invented DWR/DOPA/MOPH counts, or fixed source timestamps; P0-1 needs response-contract tests that compare `/health/sources` with the repository/runtime evidence matrix (`apps/api/app/main.py:403-533`; `apps/api/tests/test_source_access_and_master.py`).
- The test named “visible only when public” creates only a `WITHHELD` report and never verifies exclusion of `PRIVATE` (`apps/api/tests/test_test_data_isolation_and_regression.py:149-178`).
- The frontend has build scripts but no declared test script (`apps/web/package.json:6-31`). Accessibility, route behavior, empty states, and evidence badges therefore need explicit browser validation or a separately approved frontend test harness.

### P-16 — Documentation impact

- `README.md`, home/map/methodology/data-source/provenance/privacy/security/citizen/system-health docs, and many audit reports use FloodTrace or flood-centered framing.
- Existing documents correctly state core real-data, missing-data, privacy, and architecture rules, but several readiness claims conflict with current source and should be corrected rather than copied (`README.md:184-250`; `docs/HOME_PAGE.md:44-55`, `docs/HOME_PAGE.md:68-74`; `docs/SYSTEM_HEALTH.md:17-21`, `docs/SYSTEM_HEALTH.md:42-44`; `docs/PRIVACY_AND_LEGAL.md:22-26`, `docs/PRIVACY_AND_LEGAL.md:66`; `docs/DATA_SOURCES.md:9-46`).
- Historical audits should remain historical evidence. Current operational docs should be revised after behavior changes land.

### P-17 — Final repository-coverage gaps

- The active staff verification client substitutes factual sentences when six evidence inputs are blank, including normal water/rain conditions and moderate modeled risk; the backend then stores the substituted assessment and maps every non-`OFFICIAL_CONFIRMED` submission to report status `VERIFIED_OBSERVATION` (`apps/web/src/pages/AdminReportsPage.tsx:665-686`; `apps/api/app/api/v1/admin_reports.py:953-1044`). Missing staff evidence can therefore become stronger factual state instead of remaining missing.
- Staff cross-check context labels a code-authored waterway table “Authentic” and invents a Prachin Buri basin reach when no district match exists (`apps/api/app/core/system_crosscheck.py:30-39`, `apps/api/app/core/system_crosscheck.py:103-112`). Repository evidence contains no verified DWR waterway artifact, so these values cannot be treated as verified geography.
- The routed staff system-health tab consumes `/health/sources`, `/health/metrics`, and scheduler status but renders healthy/active states, processed/failure/queue values, source freshness, station counts, timestamps, and reference-dataset counts from literals when responses are absent or degraded (`apps/web/src/App.tsx:23-25`; `apps/web/src/pages/AdminReportsPage.tsx:165-181`, `apps/web/src/pages/AdminReportsPage.tsx:1812-2059`). Staff-only false operational data remains a truth defect.
- The tracked systemd service starts Uvicorn with two workers, while every FastAPI lifespan starts the in-process ingestion worker and source scheduler (`deploy/systemd/floodtrace-api.service:12`; `apps/api/app/main.py:44-196`). That supported path can create duplicate polling and process-local health views.
- `scripts/verify_all_sources.py` hardcodes absent DOPA/MOPH artifacts, counts, timestamps, licenses, and availability as verified; `deploy/production/verify.sh` treats source-key presence and direct upstream reachability as proof of live application integration (`scripts/verify_all_sources.py:337-415`; `deploy/production/verify.sh:71-108`). Verification tooling must consume the application truth contract rather than manufacture an independent one.
- `docs/ADMIN_CONSOLE.md` claims production readiness, secure evidence viewing, and continuously connected SSE; `docs/CITIZEN_REPORT_VERIFICATION.md` describes mandatory evidence fields while the current client silently fills them (`docs/ADMIN_CONSOLE.md:1-56`; `docs/CITIZEN_REPORT_VERIFICATION.md:20-74`). These current operational documents require phase-owned reconciliation.

## 4. Product transition principles

1. **Question first:** every main journey should answer whether an area warrants more monitoring or verification.
2. **Flood is context:** preserve rainfall, water level, flood extent, and connectivity only as dated evidence or model inputs; Ruwaigon must also work in normal conditions.
3. **No substitute facts:** absent measurements, laboratory results, source documents, timestamps, or geometry render as explicit unavailable/missing states.
4. **Evidence families:** every public datum belongs to `OFFICIAL`, `COMMUNITY`, or `MODEL / DERIVED / FORECAST`; the third family carries a precise subtype.
5. **Observation is not confirmation:** community reports remain observations through collection, moderation, aggregation, and display.
6. **Connection is not causation:** no public facility identity, source-estimation result, suspected polluter, or legal attribution.
7. **Freshness is measured:** freshness derives from source timestamps and thresholds, never from scores, request time, or hardcoded text.
8. **Public by explicit publication:** only approved public states cross the public API boundary; everything else fails closed.
9. **Public rename, internal stability:** rename user-visible identity first. Keep internal identifiers until a concrete compatibility or maintenance benefit justifies migration.
10. **Incremental delivery:** preserve the architecture and working telemetry/report workflows while replacing unsupported content with honest empty states.
11. **Classify by use and lineage:** keep isolated test fixtures, development/demo data, static official reference data, derived real data, modeled geometry, and public runtime data distinct. Only public runtime output carries public-fact risk; legitimate test fixtures and reproducible labeled models are not public facts.

## 5. Repository areas inspected

### Relevant sources of truth

- `AGENTS.md` — non-negotiable truth, privacy, public/private, workflow, and Git rules.
- `README.md` — declared architecture, source status, data integrity, privacy, and project state; verified against source where material.
- `docs/HOME_PAGE.md`, `docs/MAP_VISUALIZATION.md`, `docs/METHODOLOGY.md` — intended public experience and analytical semantics.
- `docs/DATA_SOURCES.md`, `docs/DATA_PROVENANCE.md`, `apps/api/app/core/source_access.py`, `apps/api/app/core/provenance.py` — source eligibility, categories, lineage, and missing-data behavior.
- `docs/PRIVACY_AND_LEGAL.md`, `docs/SECURITY.md` — public/private, legal, privacy, authentication, and operational constraints.
- `docs/CITIZEN_REPORT_WORKFLOW.md`, `docs/CITIZEN_REPORT_VERIFICATION.md` — collection, moderation, publication, and verification states.
- `docs/SYSTEM_HEALTH.md` — source-health and refresh expectations.
- `apps/api/tests/` — executable assertions and identified coverage gaps.

### Inspected implementation areas

- Public route and navigation composition: `apps/web/src/App.tsx`, `apps/web/src/components/layout/AppLayout.tsx`.
- Active public pages: overview, map, area detail, My Area, report, cases, official updates, forecast, methodology, knowledge, about.
- Active and legacy map components: `MapLibreMapView`, `HomeMapPreview`, `ContinuousMapView`, `MapLayerPanel`, area/status panels.
- FastAPI composition and boundaries: `apps/api/app/main.py`, `api/public/`, `api/internal/`, and all `api/v1/` routers.
- Data and model services: spatial monitoring, risk/source estimation, provenance, safety policy, scheduler, pipeline, and source access.
- Adapters: ThaiWater, RID, Open-Meteo, and DIW.
- Data inventory: `apps/data/`, repository `data/`, upload storage, boundary/mask GeoJSON, and DIW snapshot.
- Database entities and staff/citizen workflows.
- Backend tests, root/web package manifests, Docker configuration, and verification-script references.

## 6. KEEP / RENAME / REDESIGN / REMOVE / DEFER matrix

Each row has one primary classification. `Risk changed` means risk during the proposed transition; `Risk unchanged` means risk of retaining current behavior.

| ID | Component / current purpose and evidence | Class / priority | Target Ruwaigon direction and reason | Dependencies | Risk changed | Risk unchanged |
| --- | --- | --- | --- | --- | --- | --- |
| A-01 | Active shell and public/API identity; FloodTrace remains primary (`AppLayout.tsx:133-150`; `main.py:199-203`) | **RENAME / P1** | Make Ruwaigon the public name; retain internal IDs initially to limit compatibility churn. | Copy inventory, metadata inventory | Mixed branding during rollout | Product remains flood-branded and ambiguous |
| A-02 | Navigation and routes organize current journeys (`App.tsx:18-43`; `AppLayout.tsx:82-99`) | **RENAME / P1** | Preserve route structure and behavior; rename labels by user intent and evidence type. Behavioral redesign needs separate evidence. | A-01, copy inventory | Learned labels change | “Data” and “Reports” remain unclear |
| A-03 | Home introduces monitoring and links to core journeys, but renders fallback counts and blocked-source claims (`OverviewPage.tsx:151-160`, `OverviewPage.tsx:368-393`, `OverviewPage.tsx:530-536`) | **REDESIGN / P0** | Retain mission/search/quick access; replace fallback facts with unavailable states and make the verification question primary. | A-11, A-12, A-18 | Empty states may look sparse | Unsupported values and false source confidence remain public |
| A-04 | Active public map combines boundary, priority, waterways, telemetry, and observations (`MapPage.tsx:93-109`) | **REDESIGN / P0** | Keep map interaction; show only verified geometry/data, explicit class/freshness, and conditional flood context. | A-15, A-16, A-18, A-19 | Fewer layers until verified | Unsupported geometry can imply real contamination or official status |
| A-05 | Area detail explains priority, sampling, reports, confidence, freshness, and forecast using fallback copy (`AreaDetailPage.tsx:220-283`, `AreaDetailPage.tsx:454-466`) | **REDESIGN / P0** | Build evidence cards from actual values, source time, missing state, and reason codes; no “normal,” “fresh,” or forecast defaults. | A-12, A-16, A-19 | Contract changes affect page states | False reassurance and false recency persist |
| A-06 | My Area stores followed districts locally but uses static timestamps and alerts (`MyAreaPage.tsx:39-89`, `MyAreaPage.tsx:251-287`) | **REDESIGN / P0** | Keep local follow list; replace static alerts with verified feeds or explicit no-data, and separate notification preference from actual alerts. | A-05, A-10, A-12 | Existing saved areas need migration handling | Users see invented official events and dates |
| A-07 | Citizen submission and tracking are useful, but active photo upload calls a nonexistent route (`ReportPage.tsx:130-195`; `reports.py:195-218`) | **KEEP / P1** | Preserve flow, declaration, tracking, and sanitizer; make only the narrow upload contract and response-shape repair needed after P0 media gating. | A-12, A-20 | Upload/API compatibility regression | Photos fail while text reports still work |
| A-08 | Cases/public observations are a valid community surface, but public queries admit any state except `WITHHELD` (`public/router.py:1192-1248`; `entities.py:153-154`) | **KEEP / P0** | Preserve the surface and `COMMUNITY` semantics; remediate visibility through the shared publication allowlist and gated media boundary. | A-12, A-20, migration reconciliation | Public items may be hidden if migration is wrong | Private/unmoderated reports influence public output |
| A-09 | Forecast page distinguishes a model visually but consumes static zones/flood/forecast and static factors (`ForecastPage.tsx:51-66`, `ForecastPage.tsx:140-236`) | **REDESIGN / P0** | Default to forecast unavailable until an approved source/model run exists; separate current observation from forecast horizon and show issue/valid times. | A-11, A-18, source approval | Reduced functionality until data exists | Placeholder output is presented as a working forecast |
| A-10 | Official-information hub combines telemetry and official claims; lab table and update catalog are literals (`OfficialUpdatesPage.tsx:123-230`; `public/router.py:352-390`) | **REDESIGN / P0** | Keep the hub shell, but render only ingested/cited official records; otherwise show source-specific unavailable states. | A-18, A-19, official publication process | Empty official sections until feeds exist | Unsupported official/laboratory claims create severe trust and safety risk |
| A-11 | Unsupported runtime zone, flood, forecast, official-update, alert, receptor, and laboratory-looking claims stand in for unavailable data (`public/router.py:174-390`, `public/router.py:616-727`; `alerts.py:47-66`; `MyAreaPage.tsx:251-287`) | **REMOVE / P0** | Remove from public runtime output; do not replace them with substitute facts. Isolated test fixtures and clearly labeled development/demo data may remain outside production paths. | Empty-state contracts, A-25 | Screens lose demo fullness | Unsupported public claims can cause public harm |
| A-12 | Sanitized public router is the intended public contract but mixes DB facts with fixtures/defaults and permissive publication filters (`public/router.py:395-499`, `public/router.py:1126-1283`) | **REDESIGN / P0** | Make `/api/public/*` the single fail-closed public contract, typed by evidence class, source status, timestamps, and explicit null/empty states. | A-18–A-21 | Contract migration across pages | Public truth and privacy boundaries remain inconsistent |
| A-13 | Unauthenticated legacy factory/risk routes expose facility identity and source-oriented analyses (`main.py:259-276`; `factories.py:39-128`; `risk.py:309-404`) | **REMOVE / P0** | Remove these capabilities from public reach; move any justified staff use behind authenticated internal routes. Do not expose source attribution publicly. | Consumer inventory, A-14, A-21 | Unknown legacy consumers may break | Facility attribution and source inference remain publicly reachable |
| A-14 | Staff authentication/authorization accepts query credentials and client-selected user/role (`staff_rbac.py:91-159`); report workflow, publication state machine, and audit log remain useful | **REDESIGN / P0** | Short term: reject query credentials and caller-selected roles, map accepted credentials to a server-authoritative principal, and fail closed. Keep workflow/state machine. Future identity-provider replacement is gated on an operational identity decision. | Existing secret distribution for containment; identity-provider decision for future work | Staff client header behavior changes | Caller-selected authority undermines RBAC claims |
| A-15 | Province boundary and outside mask are repository GeoJSON used by the active map (`spatial_monitoring_service.py:37-40`, `spatial_monitoring_service.py:173-185`) | **KEEP / P0** | Preserve only with provenance/license verification and integrity checks; do not reshape or invent replacements. | Artifact metadata/checksum | Accidental geometry or scope change | Removing it breaks geographic scope; unverified provenance remains a documentation gap |
| A-16 | Monitoring-priority engine combines telemetry/reports with code-defined centroids/waterways, nonzero defaults, and score-derived freshness (`spatial_monitoring_service.py:41-117`, `spatial_monitoring_service.py:304-497`) | **REDESIGN / P0** | Fail closed per factor, derive freshness from timestamps, distinguish missing from low priority, and use only verified geometry. | A-15, A-17–A-20 | Priority distribution changes materially | Missing data can produce reassuring scores and false freshness |
| A-17 | ThaiWater water-level/rain adapters and scheduler provide real external telemetry with access gates (`thaiwater.py:20-49`, `thaiwater.py:160-189`) | **KEEP / P1** | Preserve behavior and make source/freshness/degraded state visible in Ruwaigon. | Source-health endpoint | Branding-only regressions | Removing working telemetry weakens environmental context |
| A-18 | Source registry/catalog is the correct control point, but `/health/sources`, Data & Methodology, and current docs duplicate unsupported availability/count/time claims; some declared local references have no repository artifact; forecast wiring conflates TMD with Open-Meteo (`source_access.py:60-186`; `main.py:378-533`; `DataMethodologyPage.tsx:66-229`; repository `data/`; `openmeteo.py:23-75`) | **KEEP / P0** | Preserve architecture; make targeted catalog/status corrections and use one fail-closed evidence matrix across source health, public provenance, active UI, and current docs. Mark only implemented ThaiWater water/rain as active API; require provenance proof for `LOCAL / VERIFIED REFERENCE`; mark present unreconciled artifacts `LOCAL / UNVERIFIED`; keep citizen reports internal, access-gated integrations blocked, and absent DWR/DOPA/MOPH artifacts unavailable/unverified. | Artifact, license, and runtime verification | Corrected counts may invalidate docs/tests | Unsupported “available/official” claims propagate publicly |
| A-19 | Provenance model, classifications, and disclaimers encode useful truth boundaries (`README.md:212-224`; `core/provenance.py`) | **KEEP / P0** | Preserve and normalize for all public DTOs; expose family plus precise subtype and timestamps. | A-12, A-18 | Schema normalization may affect consumers | Removing it makes evidence classes indistinguishable |
| A-20 | Exact/public coordinate partition, EXIF sanitizer, declaration, and initial private/unverified state protect reporters (`entities.py:107-167`; `reports.py:123-166`, `reports.py:195-218`) | **KEEP / P0** | Preserve controls; add publication-gated delivery because sanitized does not mean public. Private report media must remain inaccessible; approved public report media may use the authorized route. | A-07, A-08, A-14 | Migration could hide or orphan media | Static mount bypasses publication state |
| A-21 | Security middleware and internal auth exist, but legacy sensitive routes, governance mutation, forecast test bypass, and telemetry sync are open (`main.py:247-281`; `governance.py:226-335`; `forecast.py:6-17`; `telemetry.py:117-165`) | **REDESIGN / P0** | Deny sensitive public reach, authenticate state changes, reject production bypasses, and add route-table negative tests. Production startup already rejects known default admin keys; do not misstate that default as a confirmed production bypass. | Deployment inventory, A-13, A-14 | Misconfiguration can lock out staff | Public analysis and mutable runtime state remain exposed |
| A-22 | React/Vite/MapLibre/Leaflet + FastAPI/SQLAlchemy/PostGIS architecture supports the target (`apps/web/package.json:1-31`; `README.md:305-329`) | **KEEP / P1** | Migrate in place; no framework, database, or map-engine replacement. | None | Normal incremental regression risk | Replacement would add cost without solving truth problems |
| A-23 | Public copy mixes strong safeguards with flood-only, overly certain, technical, or unsupported terms | **REDESIGN / P1** | Create a controlled Thai/English terminology map for area priority, evidence class, freshness, missing data, flood context, and non-causation; review copy in context. | A-01–A-12 | Nuance can be lost in translation | Users may infer safety, contamination, currency, or official confirmation |
| A-24 | Current docs contain valuable rules but FloodTrace identity, stale counts, and claims that diverge from source (`README.md:1-73`, `README.md:184-250`) | **REDESIGN / P1** | Update current docs after behavior lands; preserve historical audits as dated evidence and mark superseded claims. | All implementation units | Docs may drift if updated too early | Operators and agents follow incorrect product/data claims |
| A-25 | Backend tests are broad but allow unsupported runtime fixtures and miss private-public state, media, route-mutation, bypass, and frontend behavior gaps (`test_public_api_sanitization.py:67-137`; `test_test_data_isolation_and_regression.py:149-178`) | **REDESIGN / P0** | Keep strong privacy/source tests; add negative truth, publication, media, route-denial, governance, forecast-gate, staff-auth, and active UI/API contract checks. | Each unit | Brittle copy tests if assertions are too literal | Existing tests can pass while unsafe public behavior remains |
| A-26 | Parallel legacy components and alternate `/api/v1` consumers remain outside active routes (`apps/web/src/components/`, fetch inventory) | **DEFER / P2** | After active paths stabilize, remove or migrate unreachable duplicate surfaces in a separate cleanup review. | Usage/bundle analysis | Premature deletion may remove hidden consumers | Dead paths preserve unsafe contracts and maintenance confusion |
| A-27 | New agency datasets, APIs, broader geography, alert delivery, and advanced source analysis are not verified or required for the first transition | **DEFER / P3** | Add only through separate source-approval and product tasks after the core Ruwaigon truth boundary is stable. | Credentials, licenses, data agreements | Scope expansion delays safety work | No immediate harm; capability remains limited |
| A-28 | Active staff verification invents evidence for blank inputs and promotes non-official submissions too broadly (`AdminReportsPage.tsx:665-686`; `admin_reports.py:953-1044`; `system_crosscheck.py:30-39`, `103-112`) | **REDESIGN / P0** | Preserve staff verification, but normalize missing evidence to null/unavailable, enforce status-specific criteria server-side, and remove unverified waterway fallbacks. | P0-1 truth contract; P0-2 publication regression | Existing staff habits and stored records may differ | Invented evidence can enter verified/public workflows |
| A-29 | Active staff health UI substitutes healthy states, counts, freshness, and timestamps when health responses are absent (`AdminReportsPage.tsx:165-181`, `1812-2059`) | **REDESIGN / P0** | Derive every displayed fact from health/scheduler responses; otherwise render explicit unknown/unavailable/partial state. | P0-1 source-health contract | Staff dashboard becomes less reassuring during outages | Operators may act on fictitious health state |
| A-30 | The systemd path runs two API workers while scheduler ownership is process-local (`floodtrace-api.service:12`; `main.py:44-196`) | **REDESIGN / P0** | Standardize supported production execution on one Uvicorn worker owning the existing in-process scheduler; verify one owner and one poll per interval. | Deployment verification | Reduces API process concurrency on this supported path | Duplicate polling and split health state persist |
| A-31 | Source/deployment verification scripts can return PASS from invented metadata, key presence, or direct upstream access (`verify_all_sources.py:337-415`; `deploy/production/verify.sh:71-108`) | **REDESIGN / P0** | Use canonical application responses and fixed evidence-backed result states; direct upstream checks remain diagnostics only. | P0-1 source matrix | Existing audit output changes | False PASS can override runtime truth |
| A-32 | Staff console and verification docs claim readiness/connectivity/security beyond current behavior (`ADMIN_CONSOLE.md:1-56`; `CITIZEN_REPORT_VERIFICATION.md:20-74`) | **REDESIGN / P0** | Reconcile truth/verification text in P0-1, media text in P0-3, and auth/SSE text in P0-5. | A-28–A-31 and phase order | One document changes in multiple units | Operators follow claims that implementation does not support |

Classification count: **KEEP 8 · RENAME 2 · REDESIGN 18 · REMOVE 2 · DEFER 2** (32 rows).

## 7. P0–P3 priority findings

### P0 — Safety, truth, privacy

1. Remove unsupported public runtime environmental claims, flood extents, forecasts, waterways, laboratory-looking values, freshness/confidence labels, official updates, frontend fallbacks, invented source-health counts/timestamps, and the no-alert `NORMAL` advisory. Return truthful empty, unknown, or unavailable states.
2. Replace every scattered citizen-report exclusion with one shared explicit allowlist: `PUBLIC_SAFE_SUMMARY` and `PUBLIC_VERIFIED`. Apply it to `/api/public` overview, My Area, observations, counts, map/model inputs, legacy `/api/v1/reports`, clusters, risk/area/evidence queries, and spatial monitoring. `PRIVATE`, `WITHHELD`, null, unknown, and legacy suppressed states fail closed.
3. Remove the unauthenticated static-media bypass. A `PRIVATE` report's sanitized media is publicly inaccessible. Approved public report media becomes available only through a publication-aware route. Sanitization remains necessary but never grants publication.
4. Remove public reachability for legacy facility identity, coordinates/address, screening, source estimation, connected-facility/waterway, evidence-packet, and risk/source-analysis routes. Keep justified analytical capability only behind an authenticated internal boundary.
5. Protect `POST /api/v1/governance/mode` with fail-closed authentication/authorization. Unauthenticated callers must not mutate governance state, delete data, or repopulate datasets.
6. Reject or safely contain caller-controlled `test_mode=true` in production forecast paths. No query value or configuration combination may bypass source eligibility.
7. Contain staff authentication: reject query credentials and caller-selected roles/users; bind accepted credentials to a server-authoritative principal. Defer full identity-provider architecture until the operator selects it.
8. Correct source status without replacing architecture: ThaiWater water/rain are active where implemented; only provenance-reconciled artifacts are `LOCAL / VERIFIED REFERENCE`; present unreconciled artifacts are `LOCAL / UNVERIFIED`; citizen reports are internal; access-gated integrations are blocked; absent DWR/DOPA/MOPH artifacts are unavailable/unverified.
9. Strengthen tests so labels alone cannot make unsupported or private content pass. Include negative route, publication, media, governance, forecast-gate, and staff-auth assertions.

### P1 — Required Ruwaigon transition

1. Authenticate and authorize `POST /api/v1/telemetry/sync`; add unauthenticated and underprivileged negative tests before production exposure.
2. Make Ruwaigon the public identity while retaining internal FloodTrace identifiers where compatibility has value.
3. Repair the narrow active citizen-photo upload contract after the P0 media boundary exists.
4. Rename navigation labels without redesigning route behavior unless later evidence requires it.
5. Refocus home, map, and area pages on monitoring/verification across normal and flood conditions.
6. Preserve working ThaiWater telemetry, citizen collection/moderation, provenance, and the current technical stack.
7. Establish a consistent evidence/freshness/missing-data component and Thai terminology map.
8. Update current documentation after each behavior change and remove unsupported readiness statements.

### P2 — Important after core transition

1. Consolidate duplicate active/legacy frontend components and endpoint consumers after route telemetry or static usage analysis.
2. Improve area comparison, historical trends, accessible map alternatives, and non-map summaries using only verified data.
3. Add a frontend test harness only through a separately reviewed dependency decision if the existing build/browser tooling cannot provide sufficient regression coverage.

### P3 — Optional/future

1. Activate additional official, laboratory, satellite, forecast, receptor, or land-use sources only after access, license, freshness, publication, and artifact provenance are verified.
2. Expand beyond Prachin Buri or add outbound alerts only under separate product, privacy, and operations plans.

## 8. Ordered implementation units

Each unit is one reviewable, revertible change set with its own Implementer record and Reviewer gate. Do not combine units. Missing data yields unavailable output, never substitute content.

### UNIT P0-1 — Public and Operational Truth Containment

- **Objective:** remove unsupported public and active-staff runtime environmental/source-health claims and code-authored geography lacking sufficient provenance; missing evidence remains null, empty, unknown, or unavailable.
- **Why / priority:** P0 safety and data-truth defects currently present laboratory-looking claims, official updates, flood extents, forecasts, waterways, freshness, confidence, reassurance, verification evidence, and operational health as current facts.
- **Known files/subsystems:** `apps/api/app/main.py`, `apps/api/app/api/public/router.py`, `apps/api/app/api/v1/alerts.py`, `apps/api/app/api/v1/forecast.py`, `apps/api/app/api/v1/admin_reports.py`, `apps/api/app/adapters/openmeteo.py`, `apps/api/app/services/spatial_monitoring_service.py`, `apps/api/app/core/source_access.py`, `apps/api/app/core/system_crosscheck.py`; `apps/web/src/App.tsx`, `apps/web/src/components/layout/AppLayout.tsx`; active pages `OverviewPage.tsx`, `MapPage.tsx`, `AreaDetailPage.tsx`, `MyAreaPage.tsx`, `ForecastPage.tsx`, `OfficialUpdatesPage.tsx`, `AboutPage.tsx`, `DataMethodologyPage.tsx`, and the truth/health/verification portions of `AdminReportsPage.tsx`; active map files `MapLibreMapView.tsx`, `HomeMapPreview.tsx`, and `ContinuousMapView.tsx`; scheduler deployment `deploy/systemd/floodtrace-api.service`; verification tools `scripts/verify_all_sources.py` and `deploy/production/verify.sh`; `apps/api/tests/test_public_api_sanitization.py`, `apps/api/tests/test_public_overview.py`, `apps/api/tests/test_automated_refresh_and_truth.py`, `apps/api/tests/test_source_access_and_master.py`, `apps/api/tests/test_staff_operations_console.py`, focused forecast tests, create `apps/api/tests/test_public_truth_containment.py`, `apps/api/tests/test_staff_truth_containment.py`, and `apps/api/tests/test_scheduler_ownership.py`; browser/build checks for staff health states; `README.md`, `docs/HOME_PAGE.md`, `docs/SYSTEM_HEALTH.md`, `docs/PRIVACY_AND_LEGAL.md`, `docs/DATA_SOURCES.md`, `docs/DATA_PROVENANCE.md`, `docs/MAP_VISUALIZATION.md`, `docs/METHODOLOGY.md`, `docs/ADMIN_CONSOLE.md`, and `docs/CITIZEN_REPORT_VERIFICATION.md`.
- **Dependencies:** none for technical containment. Eligible ThaiWater records may remain. Local artifacts may remain stored, but missing provenance evidence fails closed and prevents their use as verified facts. P0-2 consumes the verification-validity result when deciding whether a report may appear as `PUBLIC_VERIFIED`; P0-1 does not broaden the P0-2 publication allowlist.
- **Allowed changes:** remove runtime constants from factual output; preserve isolated test fixtures; return empty lists/FeatureCollections or explicit `UNKNOWN`/`UNAVAILABLE` reason codes; make freshness depend on source timestamps; remove no-alert `NORMAL` synthesis; remove literal layout notifications and current-source claims not backed by an eligible record; remove MapLibre fallbacks `ล่าสุด`, `กำลังตรวจวัด`, and `ปกติ` when their facts are absent; remove staff verification and health fallbacks; enforce verification-status criteria at the backend; remove unverified waterway/basin assertions from staff cross-check; correct source statuses narrowly to `ACTIVE API`, `LOCAL / VERIFIED REFERENCE`, `LOCAL / UNVERIFIED`, `INTERNAL`, `BLOCKED`, or `UNAVAILABLE / UNVERIFIED`; make `/health/sources`, `/api/public/provenance`, Data & Methodology, staff health, verification tools, and the named current documents consume the same truth decisions; set the tracked systemd deployment to the fixed scheduler-ownership contract below.
- **Source-status contract:** `ACTIVE API` is limited to implemented ThaiWater water-level/rainfall paths. `LOCAL / VERIFIED REFERENCE` requires a present artifact plus documented origin, license/publication authority, acquisition record, integrity checksum, and verified transformation chain. The present DIW snapshot and boundary/mask do not yet meet that proof threshold and are `LOCAL / UNVERIFIED`; they may remain stored but may not be presented as verified factual reference geometry/content until reconciled. Citizen reports are `INTERNAL`. GISTDA, TMD, PCD, DEM, broader DIW, groundwater, land-use, and other access-gated integrations remain `BLOCKED`; claimed but absent DWR/DOPA/MOPH artifacts are `UNAVAILABLE / UNVERIFIED`. RID reservoir status requires separate runtime/license proof before promotion.
- **Source-health contract:** keep `/health/sources` and its top-level response shape, but derive each source record from the P0-1 source-status contract instead of hardcoded active/reference sets. Add canonical `source_status` using the six statuses above; retain `production_status` only as a compatibility field mapped exactly as follows: `ACTIVE API` → `PRODUCTION_ACTIVE`, `LOCAL / VERIFIED REFERENCE` → `PRODUCTION_REFERENCE`, `LOCAL / UNVERIFIED` → `LOCAL_UNVERIFIED`, `INTERNAL` → `INTERNAL`, `BLOCKED` → `PRODUCTION_BLOCKED`, and `UNAVAILABLE / UNVERIFIED` → `UNAVAILABLE_UNVERIFIED`. `production_status` is never an independent truth source. `SOURCE_EXISTS` means an implemented endpoint or a present local artifact, not merely a registry row. `database_records` is an integer only when counted from a real applicable table or verified artifact inventory; otherwise it is `null`. `latest_source_timestamp` is an actual upstream/DB timestamp or a documented artifact acquisition timestamp; otherwise it is `null`. Any unavailable/null fact includes one applicable reason code: `LOCAL_ARTIFACT_ABSENT`, `LOCAL_PROVENANCE_UNVERIFIED`, `ACCESS_BLOCKED`, `COUNT_NOT_APPLICABLE`, `TIMESTAMP_UNAVAILABLE`, or `EVIDENCE_UNKNOWN`. ThaiWater may be `ACTIVE API` with zero current records, but zero records must not create freshness or data-availability claims. The present DIW artifact reports `LOCAL / UNVERIFIED`; absent DWR/DOPA/MOPH artifacts report `UNAVAILABLE / UNVERIFIED`; blocked sources remain `BLOCKED`. Availability, license, freshness, public-display, and production booleans fail closed when their evidence is absent. Aggregate counts are calculated from emitted source records and must reconcile exactly; remove fixed DWR/DOPA/MOPH counts and the fixed `2026-01-01` timestamp.
- **Staff-verification contract:** normalize absent, null, and whitespace-only assessment inputs to missing values; never replace them with sentences about normal water/rain, moderate risk, laboratory work, observation, or planned sampling. The backend, not the client, owns status transitions. `UNVERIFIED` preserves `UNVERIFIED` and does not mark the report human-verified; `PARTIALLY_VERIFIED` may move only to `UNDER_VERIFICATION`; `VERIFIED_OBSERVATION` requires an explicit non-empty observed-evidence statement plus a permitted verification method; `OFFICIAL_CONFIRMED` additionally requires the existing valid official citation/evidence rule. Optional system/model dimensions remain null/unavailable when no eligible record exists. Reject a requested stronger status with `400 INVALID_REQUEST` when its criteria are absent; never silently substitute content or promote it. Existing legacy verification rows that do not meet these criteria are labeled `LEGACY_UNVALIDATED` for staff display and are ineligible for `PUBLIC_VERIFIED` projection until explicitly re-reviewed; this is a read-time eligibility rule, not a destructive history rewrite.
- **Staff cross-check contract:** water and rainfall context comes only from actual queried records with their timestamps and provenance. Remove the code-authored “Authentic” waterway table and basin fallback from factual output. Until a `LOCAL / VERIFIED REFERENCE` waterway artifact exists, emit `correlated_waterways: []`, `waterway_status: UNAVAILABLE / UNVERIFIED`, and `waterway_reason: LOCAL_ARTIFACT_ABSENT`. Spatial proximity is context, never verification or causation.
- **Staff system-health contract:** the active `/admin/reports` health tab consumes `/health/sources`, `/health/metrics`, and authenticated scheduler status without factual fallbacks. `HEALTHY` is shown only when all three responses are present, structurally valid, scheduler-active, metrics-healthy, and source records reconcile with the source-health contract. A missing/malformed response is `UNKNOWN`; a stopped scheduler is `INACTIVE`; any degraded component is `PARTIAL` or `DEGRADED` with the backend reason. Counts and timestamps render only when supplied as evidence-backed values; `0` is displayed only when the backend actually returns zero. Remove literal active/closed/fresh/source-count/reference-count assertions and green indicators when the applicable fact is unknown.
- **Scheduler-ownership contract:** the supported production model is exactly one Uvicorn API worker with the existing in-process ingestion worker and `SourceScheduler`; no distributed scheduler is introduced. Change `deploy/systemd/floodtrace-api.service` from `--workers 2` to `--workers 1`. Existing Docker entrypoints remain one process. `ENABLE_SCHEDULER=true` is valid only on that sole supported worker. Any future API horizontal scaling requires a separately approved scheduler separation/leader-election plan; it is not implemented here. Verification must prove one scheduler start, one owner, and at most one scheduled upstream run per source interval, and staff/source health must be read from that same process.
- **Verification-tool contract:** `scripts/verify_all_sources.py` and `deploy/production/verify.sh` use the running application’s `/health/sources`, `/api/public/provenance`, `/health/metrics`, and authenticated scheduler status as applicable. Their only result states are `VERIFIED`, `UNAVAILABLE`, `BLOCKED`, `UNVERIFIED`, and `PARTIAL`. `VERIFIED` requires the application contract to report eligible status plus reconciled evidence; a source key, configured URL, registry row, direct upstream HTTP success, invented count/timestamp/license, or successful DNS/network request is insufficient. Direct reachability may be printed only as a non-gating diagnostic. DOPA/MOPH and other absent artifacts remain `UNAVAILABLE` or `UNVERIFIED`; Open-Meteo reachability cannot certify forecast integration; ThaiWater/RID cannot be declared live from key presence.
- **Data & Methodology contract:** preserve `/data-methodology`, but render every source from the API status rather than assigning a page-wide active/reference claim. Show refresh cadence only for a source whose implemented runtime record supplies it. Present local-but-unreconciled artifacts as `LOCAL / UNVERIFIED`, absent DWR/DOPA/MOPH artifacts as `UNAVAILABLE / UNVERIFIED`, and access-gated sources as `BLOCKED`. The fixed methodology formula and narrative must not state that Sentinel-1 flood extent, DWR waterways, receptors, or other unavailable/unverified inputs currently participate; remove the input, qualify it as unavailable/unverified, or render an established neutral missing state. Loading failure, malformed/empty response, and unavailable sources must not fall back to active, official, imported, measured, or current claims.
- **Current-document reconciliation:** in the same unit, align `README.md`, `docs/HOME_PAGE.md`, `docs/SYSTEM_HEALTH.md`, `docs/PRIVACY_AND_LEGAL.md`, `docs/DATA_SOURCES.md`, `docs/DATA_PROVENANCE.md`, `docs/MAP_VISUALIZATION.md`, `docs/METHODOLOGY.md`, `docs/ADMIN_CONSOLE.md`, and `docs/CITIZEN_REPORT_VERIFICATION.md` with implemented truth/status and verification behavior. Remove or qualify claims that PCD/RID/GISTDA notices are current, DWR/DOPA/MOPH artifacts are present, DIW/boundary artifacts are verified, unavailable sources are measured/official/available, staff verification fields synthesize evidence, system health is always healthy, or production readiness already exists. P0-1 owns environmental verification, staff-health, scheduler, and readiness wording; P0-3 later owns the secure staff/public media-delivery paragraphs; P0-5 later owns authentication and SSE-connectivity paragraphs. Each document must describe the currently implemented phase and must not pre-claim a later unit. Preserve historical audits unchanged.
- **Forecast selection-coordinate contract:** choose **B — `MODELED / APPLICATION SELECTOR`**. The three constants are application-defined point selections for a forecast-model query, not official or observed monitoring stations. Public label: `จุดเลือกพื้นที่สำหรับแบบจำลองพยากรณ์` (`Forecast model selection point`). API output uses `selector_key`, `selector_label`, `latitude`, `longitude`, `coordinate_role: APPLICATION_SELECTOR`, and provenance with family `MODEL`, method `application-defined representative point`, source status `LOCAL / UNVERIFIED`, and an explicit limitation that the point is neither a monitoring station nor an official coordinate. Preserve the three existing keys for one compatibility transition; the `station` query name and `/forecast/stations` path may remain temporarily but are documented deprecated, return selector semantics, and must not emit `station_name`, `OFFICIAL_COORDINATES`, or verified-official coordinate provenance. Unknown keys return `400 INVALID_REQUEST`, not the Prachin Mueang default. When forecast data is blocked or unavailable, return an empty forecast/unavailable reason while keeping selector metadata separate from source/model provenance; never attribute the point to TMD, Open-Meteo, or an observed station. Contract tests cover all keys, unknown-key rejection, blocked-source output, labels/provenance, absence of official-station semantics, and compatibility aliases.
- **Thai wording gate:** technical containment may remove unsupported copy and reuse the established neutral terms `ไม่มีข้อมูล`, `ไม่สามารถยืนยันได้`, `ควรตรวจสอบเพิ่มเติม`, and `ระดับเฝ้าระวัง` without waiting for newly assigned reviewers. It must not add a new safety, contamination, official-confirmation, or accusation claim. Any new or materially changed Thai wording whose interpretation could imply safety reassurance, contamination certainty, official attribution, or legal accusation has a separate gate: **BLOCKED — reviewer assignment required**. One environmental-domain Thai reviewer and one Thai plain-language reviewer must be named and record pass/fail before that copy can ship; no names are assumed by this plan. If implementation reaches such copy, omit it or use an already established neutral missing-state term and continue the technical containment.
- **Out of scope:** publication filters, media authorization, route authentication, branding, navigation, framework changes, new data, and deletion of legitimate test fixtures or reproducible labeled model methods.
- **Migration / compatibility:** no destructive database migration. Keep endpoint paths and stable container shapes where possible; fields without evidence become null/unavailable. Legacy verification history remains stored but cannot satisfy stronger/public verification eligibility unless it passes the new criteria. Frontend empty states change with the API in the same unit. The supported systemd worker count changes from two to one; capacity impact is explicit and reversible only to a scheduler-disabled multi-worker deployment under a future approved plan.
- **Rollback:** revert endpoint/UI/document/tool changes together only to the last truthful state. Rollback must not restore unsupported public/staff claims, verification substitutions, unverified waterways, false PASS results, or duplicate scheduler ownership. Safe fallbacks are empty/unavailable verification context, `UNKNOWN` staff health, verification-tool `UNVERIFIED`, and one scheduler-owning worker with ingestion disabled if ownership cannot be proved.
- **Validation:** add no-record alert tests; empty/blocked/stale-source tests; forecast-selector contract and unknown-key tests; source-matrix comparison against artifact provenance records; `/health/sources` tests for empty DB, populated ThaiWater tables, present-unverified DIW, absent DWR/DOPA/MOPH, blocked sources, malformed/missing evidence, null unsupported counts/timestamps, fail-closed booleans, and reconciled aggregate counts. In `test_staff_truth_containment.py`, cover omitted/null/whitespace assessment fields, every verification status, rejected stronger-status requests, legacy-unvalidated rows, absence of invented normal/model/lab/action text, empty waterway output, and the P0-2 rule that invalid verification cannot qualify for `PUBLIC_VERIFIED`. In staff/browser checks, fixture healthy, zero, stopped, partial, unavailable, malformed, and request-error responses and assert no green/active/fresh/count/timestamp fallback appears. In `test_scheduler_ownership.py`, assert the tracked systemd unit uses one worker, one lifespan creates one scheduler owner, and two source intervals cannot produce duplicate scheduled runs. Exercise both verification scripts against fixture application responses for all five result states; assert absent DOPA/MOPH, key-only ThaiWater/RID, and direct-only Open-Meteo never pass. Run focused scans for unsupported numeric/text/geometry literals and `ล่าสุด`/`ปกติ`/official-agency/staff-health fallbacks; targeted API tests; frontend build; rendered checks of every named public surface plus the staff verification and health views. Compare the ten named current documents with runtime behavior and the assigned phase ownership. Verify legitimate verified references, explicit human evidence, reproducible derived/model geometry, and isolated test fixtures remain allowed but cannot be mistaken for current observation.
- **Acceptance:** no active public or staff API response/rendered surface presents unsupported code-authored environmental, verification, geography, or source-health content as measured, observed, normal, healthy, fresh, modeled, official, or laboratory-confirmed fact. All previously accepted public requirements remain: shared-layout/map/About/official/overview/area/My Area/forecast/Data & Methodology/alerts/source-health behavior fails closed; evidence families remain distinct; legitimate verified references and reproducible labeled models remain allowed. Additionally: blank/missing verification fields stay null/unavailable and cannot strengthen status or publication eligibility; status-specific verification criteria are server-enforced; cross-check waterways remain empty/unavailable without verified geometry; staff health has no literal state/count/time fallback and distinguishes real zero from unavailable; the supported deployment has exactly one in-process scheduler owner and no duplicate poll per interval; verification scripts use canonical application evidence and cannot certify absent/unverified sources or direct-only upstream reachability; the ten P0-1 documents match implemented behavior, while P0-3 media and P0-5 auth/SSE sections remain explicitly phase-owned and unclaimed until those units land.
- **Readiness:** **READY for REVIEW MODE after Revision 5**. G1–G5 now have fixed ownership, files, behavior, validation, compatibility, and rollback decisions. No Implementer choice remains for verification promotion, missing cross-check data, health-state rendering, scheduler ownership, verification result states, or documentation phase ownership. The separate new safety-copy approval gate remains **BLOCKED — reviewer assignment required**, but it is not a prerequisite to remove unsupported claims.

### UNIT P0-2 — Citizen Publication Boundary

- **Objective:** enforce one shared explicit public publication allowlist across every citizen-report consumer.
- **Why / priority:** P0 privacy and data-integrity failure. `PRIVATE` records currently affect public results despite field sanitization.
- **Known files/subsystems:** create `apps/api/app/core/publication.py`; modify `apps/api/app/api/public/router.py`, `apps/api/app/api/v1/reports.py`, `apps/api/app/api/v1/risk.py`, `apps/api/app/services/spatial_monitoring_service.py`, `apps/api/app/models/entities.py` only if a state constraint is needed, `apps/api/app/core/database.py` only for the approved backfill hook, create `scripts/migrate_citizen_publication_boundary.py`, update `apps/api/tests/test_test_data_isolation_and_regression.py`, `apps/api/tests/test_public_overview.py`, `apps/api/tests/test_public_api_sanitization.py`, and create `apps/api/tests/test_publication_boundary.py`.
- **Consumer inventory:** `/api/public/overview` district and total counts plus latest-report freshness; `/api/public/my-area`; `/api/public/observations`; legacy `/api/v1/reports/`; `/api/v1/reports/clusters`; `/api/v1/risk/area-card/{area_id}`; `/api/v1/risk/evidence-packet/{case_id}`; `/api/v1/risk/my-area`; spatial monitoring priority and its map/overview counts; active Overview, My Area, Cases, Area Detail, and Map consumers. Direct tracking remains a possession-of-code workflow and must not enter aggregates or expose media/PII.
- **Dependencies:** P0-1 empty-state and verification-validity contracts. Public state decision is resolved: only `PUBLIC_SAFE_SUMMARY` and `PUBLIC_VERIFIED` are public, and `PUBLIC_VERIFIED` additionally requires a P0-1-valid verification record; blank, substituted, or `LEGACY_UNVALIDATED` evidence cannot qualify.
- **Allowed changes:** shared SQLAlchemy predicate and shared constant; replace scattered exclusions; public-safe projection only; add state constraint/normalization if compatible; reconcile all counts and modeled inputs.
- **Out of scope:** moderation workflow redesign, reporter PII fields, tracking authorization redesign, media delivery, identity provider, and new citizen categories.
- **Migration / backfill:** run dry-run grouped counts by raw state first. Preserve `PUBLIC_SAFE_SUMMARY` and `PUBLIC_VERIFIED` as already public-eligible after safe-projection checks. Preserve `PRIVATE` and `WITHHELD`. Map legacy `SUPPRESSED` to `WITHHELD`. Map null, blank, or unknown values to `PRIVATE`. Never promote a record. Record before/after totals, per-state counts, public-eligible counts, changed IDs, and checksum in a rollback manifest. Abort on count mismatch or failed safe-projection validation.
- **Backward compatibility:** keep paths and public DTO shapes. Counts may decrease by design. Existing explicitly public records remain visible; ambiguous records disappear until staff review.
- **Rollback:** migration script restores original states from the manifest in one transaction. Code rollback may temporarily hide all citizen data, but must not restore permissive “not withheld” logic.
- **Validation:** state matrix tests for `PRIVATE`, `WITHHELD`, `PUBLIC_SAFE_SUMMARY`, `PUBLIC_VERIFIED`, null, unknown, and `SUPPRESSED`; for `PUBLIC_VERIFIED`, include valid explicit evidence, blank evidence, prior client-substituted evidence, and `LEGACY_UNVALIDATED` rows; run every listed consumer; compare before/after totals and IDs; assert no private or verification-ineligible record changes a count, cluster, risk result, map cell, priority, or freshness.
- **Acceptance:** every inventoried public consumer imports the same allowlist/predicate; only approved public states influence public output, and `PUBLIC_VERIFIED` is projected only when the P0-1 verification-validity rule passes; migration totals reconcile exactly; no existing record is silently republished.
- **Readiness:** **READY**, with implementation gated on a successful read-only migration dry run against the target database.

### UNIT P0-3 — Citizen Media Boundary

- **Objective:** replace unauthenticated static media exposure with publication-gated sanitized-media delivery.
- **Why / priority:** P0 privacy defect. Sanitization removes metadata but does not authorize publication.
- **Known files/subsystems:** `apps/api/app/main.py`, `apps/api/app/core/config.py`, `apps/api/app/api/v1/reports.py`, `apps/api/app/api/v1/admin_reports.py`, `apps/api/app/api/public/router.py`, `apps/api/app/core/staff_rbac.py`, `apps/api/app/models/entities.py` if media metadata must be added; `apps/web/nginx.conf`; `apps/api/Dockerfile`; `docker-compose.yml`, `docker-compose.prod.ssl.yml`, `deploy/production/docker-compose.prod.yml`, and `deploy/production/docker-compose.prod.ssl.yml`; create `scripts/migrate_citizen_media_boundary.py`; legacy roots `data/uploads/` and `apps/data/uploads/`; update `apps/api/tests/test_source_access_and_master.py`, create `apps/api/tests/test_public_media_boundary.py`, update `apps/web/src/pages/ReportPage.tsx`, `CasesPage.tsx`, `AreaDetailPage.tsx`, and `AdminReportsPage.tsx` only where they render media, and reconcile the media-delivery claims in `docs/ADMIN_CONSOLE.md`.
- **Dependencies:** P0-2 shared publication predicate.
- **Canonical private-storage contract:** add one setting, `Settings.PRIVATE_MEDIA_ROOT`. Local/non-container default resolves to repository `data/private-media`; every production compose sets it to `/app/data/private-media` and mounts one API-only named volume `ruwaigon_private_media:/app/data/private-media`. The API service alone receives the volume read/write; web/nginx and edge proxy receive no mount. The path is outside every public static directory. The API runtime UID/GID owns the directory and files; expected modes are directory `0700` and files `0600`. Startup/readiness fails closed for upload/media delivery if the root is absent, not writable by that runtime identity, symlinked outside the root, or permissive beyond the declared boundary. `main.py` no longer mounts `/uploads`, and nginx no longer proxies `/uploads/`.
- **Public delivery contract:** upload/sanitization writes only to `settings.PRIVATE_MEDIA_ROOT` and stores an opaque basename on `CitizenReport.photo_url`; upload responses return that opaque reference, never a public URL. `GET /api/public/reports/{report_id}/media` resolves the report first, requires the shared P0-2 allowlist (`PUBLIC_SAFE_SUMMARY` or `PUBLIC_VERIFIED`), reads only the DB-associated basename under the private root, and returns `404` for private, withheld, unknown, absent, mismatched, orphaned, or missing media. It returns `Cache-Control: no-store`; unpublishing revokes the route immediately. Direct `/uploads/*` requests return `404`.
- **Staff delivery contract:** preserve staff evidence viewing through `GET /api/v1/admin/reports/{report_id}/media`, owned by `admin_reports.py`. Require `get_current_staff_user` and `view_reports`; publication state does not limit an authorized staff review. Resolve the report by ID, take only its DB-associated opaque basename, require `basename == stored value`, resolve/canonicalize under `settings.PRIVATE_MEDIA_ROOT`, and reject traversal, separators, symlinks escaping the root, mismatches, or missing files. Missing/invalid auth returns `401`, an authenticated principal without `view_reports` returns `403`, and missing report/reference/file or forbidden path resolution returns non-enumerating `404`. On success, record `EVIDENCE_MEDIA_VIEWED` with report ID and server-resolved actor through the existing citizen-report audit log. Replace the filename-based `/api/v1/admin/evidence/{filename}` route and direct staff `photo_url` rendering; the UI fetches the report-bound endpoint with its accepted auth header and renders a short-lived object URL, never a public/static URL.
- **Allowed changes:** implement the two delivery contracts; remove public `StaticFiles` mount and nginx proxy; use only the configured root; preserve the current EXIF/magic-byte sanitizer; return an opaque filename/reference from uploads; add configuration, Docker persistence, and startup/readiness checks required by this contract.
- **Out of scope:** raw-original image publication, CDN design, image transformations beyond current sanitizer, new object storage, and full evidence-attachment redesign.
- **Migration / copy-first cutover:** freeze media writes or dual-write to the new root during cutover; dry-run both legacy roots; normalize stored `/uploads/{filename}` and bare filenames; associate each file with exactly one report; calculate SHA-256; and quarantine collisions, path anomalies, duplicates with differing bytes, and orphans. Copy—never move—the verified sanitized file to the private root and record source, destination, hash, report ID, publication state, and outcome in a rollback manifest. Before cutover, verify destination hash, DB association, and both new delivery policies on a recoverable/staged target. Then atomically switch references and remove the static mount/proxy in one deployment; immediately verify the public-state matrix, authenticated staff retrieval, unpublish revocation, and `/uploads/*` denial. Keep legacy roots unmounted and read-only through acceptance; retire or delete them only in a later explicitly approved cleanup after reconciliation. `PRIVATE` and `WITHHELD` media are never exposed during migration.
- **Backward compatibility:** old `/uploads/*` public URLs stop working. Public DTOs return the gated report-media URL only for allowlisted reports. Staff UI changes to authenticated delivery. No filename is an authorization token.
- **Rollback:** use the manifest and retained private/legacy copies to restore DB references or re-copy bytes into the private root. Never remount either legacy directory publicly. If verification fails, disable upload and both delivery routes until reconciled; an emergency rollback may restore authenticated report-bound staff delivery from a verified private copy, but its safe public fallback remains media unavailable.
- **Validation:** configuration/path/ownership/mode/readiness tests; compose inspection for API-only persistent volume in every active variant; migration dry-run and apply on a recoverable copy; hash/association/collision/orphan reconciliation; private, withheld, unknown, orphan, wrong-report, traversal, symlink, and direct-filename negatives; public safe/verified success and immediate unpublish revocation; staff `401`/`403`/`404` matrix plus successful audited access regardless of publication state; EXIF/magic-byte sanitizer regression; `Cache-Control: no-store`; nginx and FastAPI route-table proof that `/uploads/*` is absent; compare `docs/ADMIN_CONSOLE.md` media wording with the implemented routes and authorization.
- **Acceptance:** one configured non-public persistent root owns all sanitized report media; no web/static service mounts it; `PRIVATE report -> media inaccessible publicly`; `PUBLIC approved report -> sanitized media available only through the publication-aware report route`; authorized staff retain audited report-bound access; direct filename/path requests never bypass DB association, publication, authentication, or path containment; copy/hash verification completes before old exposure is retired; `docs/ADMIN_CONSOLE.md` claims secure evidence viewing only after these routes and controls are proven.
- **Readiness:** **READY**. Storage, persistence, delivery, migration, and rollback decisions are fixed. Target-environment inventory and sufficient copy capacity are external operational preflight checks, not unresolved design decisions; mutation starts only after they pass.

### UNIT P0-4A — Sensitive Public Route Containment

- **Objective:** remove facility/source-analysis capability from unauthenticated public reach.
- **Why / priority:** P0 access-control and legal-safety defect.
- **Known files/subsystems:** `apps/api/app/main.py`, `apps/api/app/api/v1/factories.py`, `apps/api/app/api/v1/risk.py`, `apps/api/app/api/internal/router.py`, create `apps/api/tests/test_sensitive_route_boundary.py`, and inactive legacy components `apps/web/src/components/MyAreaModal.tsx`, `EvidencePacketModal.tsx`, and `ProvenanceAuditModal.tsx` only if build references require removal.
- **Dependencies:** repository consumer inventory is complete; deployment/external-client inventory remains an operational check, not a reason to retain public exposure.
- **Allowed changes:** stop mounting legacy factory/risk routers publicly; retain modules unreachable for rollback; preserve existing authenticated `/api/internal/facilities`; migrate a specific analytical route internally only after a named staff consumer and permission are proved.
- **Out of scope:** deletion of DIW data, removal of justified internal analysis, new risk algorithms, public facility redaction DTOs, or frontend redesign.
- **Migration / compatibility:** no data migration. Public legacy routes become `404`; authenticated internal capability remains `401` without credentials and usable with valid credentials. No active routed frontend page currently needs compatibility work.
- **Rollback:** restore code modules but not unauthenticated mounts. Emergency rollback keeps routes disabled and restores only authenticated internal wiring.
- **Validation:** generated route-table assertion; unauthenticated requests to factories, screening/hotspots, explain, source-estimation, connected-waterway, evidence-packet, risk My Area, and area-card return `404`; internal facility route returns `401` without credentials and succeeds with valid authorization.
- **Acceptance:** no unauthenticated route returns facility identity, coordinates/address, screening, source estimation, connected facility/waterway analysis, or risk/source output; protected internal APIs remain intact.
- **Readiness:** **READY**.

### UNIT P0-4B — Runtime Mutation and Forecast Gate Containment

- **Objective:** protect governance mode mutation and remove caller-controlled production forecast bypass.
- **Why / priority:** P0 callers can mutate runtime governance/data and bypass forecast source gating.
- **Known files/subsystems:** `apps/api/app/api/v1/governance.py`, `apps/api/app/api/v1/forecast.py`, `apps/api/app/adapters/openmeteo.py`, `apps/api/app/core/security.py`, `apps/api/tests/test_governance_security.py`, `apps/api/tests/test_source_access_and_master.py`, and focused forecast tests.
- **Dependencies:** existing `verify_admin_key` provides temporary fail-closed protection; P0-5 later improves staff identity semantics.
- **Allowed changes:** require authentication and server-side authorization for `POST /api/v1/governance/mode`; keep `GET /mode` read-only if its response remains non-sensitive; prevent HTTP callers from setting adapter test mode; keep test-mode injection available only to isolated tests/non-HTTP code.
- **Out of scope:** redesign of governance data lifecycle, full staff identity provider, forecast source activation, or replacement forecast provider.
- **Migration / compatibility:** no data migration. Authorized operators retain mode change; unauthenticated clients receive `401`. `test_mode=true` no longer changes production result.
- **Rollback:** restore handler implementation only behind authentication. Never restore unauthenticated mutation or caller-controlled production bypass.
- **Validation:** unauthenticated and invalid-key governance POST tests; authorized transition tests with row-count assertions; production `test_mode=true` test returns rejection or same gated unavailable result; route/config matrix covers both `DATA_ENV` and `REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION`.
- **Acceptance:** unauthenticated governance POST cannot change settings or row counts; production forecast gate cannot be bypassed by query input or configuration combination.
- **Readiness:** **READY**.

### UNIT P0-5 — Staff Authentication Containment

- **Objective:** make short-term staff identity and role server-authoritative while preserving workflow.
- **Why / priority:** P0 authorization defect. Query credentials and caller-selected roles defeat role enforcement.
- **Known files/subsystems:** `apps/api/app/core/config.py`, `apps/api/app/core/staff_rbac.py`, `apps/api/app/core/security.py`, `apps/api/app/api/v1/admin_reports.py`, `apps/api/app/core/database.py` only to verify the fixed record, `apps/web/src/pages/AdminReportsPage.tsx`, `apps/api/tests/test_staff_operations_console.py`, create `apps/api/tests/test_staff_auth_containment.py`, and reconcile the authentication/SSE claims in `docs/ADMIN_CONSOLE.md`.
- **Dependencies:** production secret distribution must provide the already-required validated non-default `ADMIN_API_KEY`, and the existing `staff_admin_01` record must be active. Full multi-user identity waits for an operator-selected identity provider but is not required for this containment.
- **Fixed containment principal:** add trusted server-side setting `STAFF_CONTAINMENT_PRINCIPAL_ID` with the containment value `staff_admin_01`; resolve it to the existing active `StaffUser` record `staff_admin_01` / `admin_user`, require its stored role to be exactly `ADMIN`, and fail closed if missing, inactive, duplicated, or role-mismatched. `ADMIN` is the least-privileged existing role that can preserve the required end-to-end report workflow because `manage_publication` is ADMIN-only; no new role is created. Identity representation and every audit actor are the resolved record's immutable ID/username, never a request value. This is a shared operational principal, not human identity assurance.
- **Permission contract:** allowed permissions are exactly the current ADMIN entries in `ROLE_PERMISSIONS`: `triage`, `assign`, `change_priority`, `request_info`, `verify_observation`, `confirm_official`, `escalate`, `resolve`, `manage_publication`, `manage_staff`, `view_audit_logs`, `view_exact_gps`, `view_reporter_contact`, `view_internal_notes`, `view_reports`, and `modify_workflow`. Denied: impersonating `SYSTEM` or another staff identity/role, every permission absent from the registry, and any endpoint whose separate authorization does not admit this principal. The containment adds no implicit permission and does not infer one from a header.
- **Deterministic input policy:** accept the validated secret only from `X-Admin-Key` or `Authorization: Bearer`. If `token` or `key` is present in the query, reject the request with `400 INVALID_REQUEST`, even if a valid header is also present. If `X-Staff-User` or `X-Staff-Role` is present, reject with `400 INVALID_REQUEST`; do not ignore it and do not look up the supplied value. Missing or invalid accepted credentials return `401 AUTH_ERROR`; a valid resolved principal lacking a required permission returns `403 ACCESS_DENIED`. Caller-selected identity and role are prohibited without exception.
- **Allowed changes:** enforce the fixed principal and deterministic rejection policy; keep existing permission checks, report state machine, publication workflow, and audit logs; remove staff UI role/user selectors and spoofable headers. Native `EventSource` cannot send the accepted header, so disable the query-token SSE subscription during containment and retain explicit refresh/current request-driven workflow rather than adding another credential transport.
- **Out of scope:** SSO/OIDC/MFA, user provisioning, token issuance, enterprise session management, or role-model redesign.
- **Migration / compatibility:** no report-state migration. Existing staff UI loses role/user selectors and uses header/bearer credentials only; query-authenticated SSE is unavailable during containment. All accepted actions audit as `staff_admin_01` / `admin_user`; multi-user attribution and multi-role operation are explicitly deferred.
- **Rollback:** retain fail-closed fixed-principal mode. Do not restore query credentials or client-selected authority.
- **Validation:** query-token/query-key requests return `400` and do not authenticate; `X-Staff-User`/`X-Staff-Role` requests return `400` and do not select a record; missing/invalid credential returns `401`; permission denial returns `403`; fixed config resolves only the active ADMIN record; missing/inactive/wrong-role configuration fails closed; capability snapshot matches the explicit permission list; all audit writes use `staff_admin_01` / `admin_user`; publication and workflow regression tests pass; browser check confirms no role/user controls or query credential/SSE request remain; compare `docs/ADMIN_CONSOLE.md` auth/connectivity wording with the implemented containment behavior.
- **Acceptance:** accepted credentials resolve only to the configured `staff_admin_01` ADMIN principal; no request input can select identity or role; statuses follow the deterministic `400`/`401`/`403` contract; every protected action records the fixed server-resolved identity; report triage-through-publication behavior remains available, while real per-human attribution is not claimed; `docs/ADMIN_CONSOLE.md` does not claim continuous SSE connectivity or stronger identity assurance than implemented.
- **Readiness:** **READY for short-term containment**. The trusted principal, permissions, transport, rejection behavior, compatibility loss, and audit identity are fixed. Production deployment still requires its normal validated key and active seeded principal preflight. Future identity-provider redesign remains **BLOCKED** on the operational identity decision.

### UNIT P1-1 — Telemetry Sync Authorization

- **Objective:** authenticate and authorize `POST /api/v1/telemetry/sync`.
- **Why / priority:** P1 operational mutation and upstream-load risk.
- **Known files/subsystems:** `apps/api/app/api/v1/telemetry.py`, `apps/api/app/core/security.py` or `apps/api/app/core/staff_rbac.py`, create `apps/api/tests/test_telemetry_sync_authorization.py`, and update `docs/SECURITY.md` plus `docs/SYSTEM_HEALTH.md`.
- **Dependencies:** P0-5 containment principal.
- **Allowed changes:** require explicit sync permission; preserve scheduler and read-only telemetry endpoints; add audit event if existing audit infrastructure supports it without expansion.
- **Out of scope:** scheduler redesign, source adapter changes, or telemetry schema changes.
- **Migration / compatibility:** unauthenticated manual sync clients must add valid credentials; scheduled internal sync remains unchanged.
- **Rollback:** disable manual sync rather than expose it unauthenticated.
- **Validation:** missing/invalid/underprivileged credentials fail before upstream calls or DB writes; authorized sync retains current behavior.
- **Acceptance:** no unauthenticated request can trigger upstream fetches or DB mutation.
- **Readiness:** **READY after P0-5**.

### UNIT P1-2 — Citizen Upload Contract Repair

- **Objective:** make the active three-step report UI use the gated media pipeline.
- **Why / priority:** P1 functional defect; active UI calls a nonexistent upload route.
- **Known files/subsystems:** `apps/web/src/pages/ReportPage.tsx`, `apps/api/app/api/public/router.py`, `apps/api/app/api/v1/reports.py`, `apps/api/tests/test_source_access_and_master.py`, create `apps/api/tests/test_public_upload_contract.py`, and report browser checks.
- **Dependencies:** P0-3 media boundary.
- **Allowed changes:** add the narrow `/api/public/reports/upload-photo` contract or update the active client to the approved equivalent; reuse existing sanitizer; return only opaque media reference; keep report submission association explicit.
- **Out of scope:** report-flow redesign, extra attachment types, resumable upload, or public static URLs.
- **Migration / compatibility:** legacy upload route may delegate to the same sanitizer during transition; no data migration.
- **Rollback:** disable photo upload while keeping text report submission available.
- **Validation:** active UI upload/submit/track flow; invalid magic bytes, oversize files, EXIF stripping, rate limits, orphan cleanup, and no public URL before publication.
- **Acceptance:** active UI can attach sanitized media; upload never bypasses publication state.
- **Readiness:** **READY after P0-3**.

### UNIT P1-3 — Ruwaigon Identity and Terminology

- **Objective:** make Ruwaigon the public product name and establish controlled Thai/English evidence terminology.
- **Why / priority:** P1 product clarity after P0 boundaries stabilize.
- **Known files/subsystems:** `apps/web/src/components/layout/AppLayout.tsx`, public API metadata in `apps/api/app/main.py`, active public pages, and current product/methodology/privacy docs.
- **Dependencies:** P0 units complete; approved Thai tagline/short description and named copy reviewers.
- **Allowed changes:** public labels, metadata, headings, and terminology map. Retain internal FloodTrace package, DB, environment, source, storage, and historical identifiers.
- **Out of scope:** route behavior, internal bulk rename, architecture, and historical audit rewriting.
- **Migration / compatibility:** preserve URLs, localStorage keys, report IDs, API paths, and internal identifiers.
- **Rollback:** revert public copy independently without touching P0 controls.
- **Validation:** public-string inventory, focused browser review, API metadata checks, and recorded Thai review against the P0-1 wording criteria.
- **Acceptance:** active public surfaces use Ruwaigon; remaining FloodTrace strings are documented internal or historical uses; evidence terms do not imply safety or confirmation.
- **Readiness:** **BLOCKED** on approved Thai tagline/short description and reviewer assignment.

### UNIT P1-4 — Navigation Label Transition

- **Objective:** rename navigation labels by user intent while preserving route structure.
- **Why / priority:** P1 clarity; evidence supports rename, not behavioral redesign.
- **Known files/subsystems:** `apps/web/src/App.tsx`, `apps/web/src/components/layout/AppLayout.tsx`, route links in active pages, and browser checks.
- **Dependencies:** P1-3 terminology.
- **Allowed changes:** labels, ordering only where copy hierarchy requires it, and accessible names. Keep route URLs and page behavior.
- **Out of scope:** new routes, deleted routes, information-architecture rewrite, analytics system, or page redesign.
- **Migration / compatibility:** all bookmarks and deep links remain valid.
- **Rollback:** copy-only revert.
- **Validation:** route traversal, active-link state, keyboard navigation, mobile menu, and no broken links.
- **Acceptance:** labels describe user intent/evidence class; every current route remains reachable at the same URL.
- **Readiness:** **BLOCKED** on P1-3.

### UNIT P1-5 — Evidence-Led UX

- **Objective:** align home, map, area detail, My Area, official, and forecast views on one evidence/missingness contract.
- **Why / priority:** P1 usability after truth and access boundaries are stable.
- **Known files/subsystems:** public DTOs in `apps/api/app/api/public/router.py`, provenance models, active pages and map components listed in Section 9, and frontend build/browser checks.
- **Dependencies:** all P0 units, P1-3 terminology, and validated public DTO contract.
- **Allowed changes:** evidence family/subtype, source status, observed/issued/valid/retrieved times, freshness, limitations, missing reason, non-map summary, and accessible legend behavior.
- **Out of scope:** new data source, framework/map-engine replacement, advanced prediction, geography expansion, or alert delivery.
- **Migration / compatibility:** additive DTO fields first; migrate active consumers; remove obsolete fields only after consumer proof.
- **Rollback:** retain additive DTO compatibility and revert one active surface at a time.
- **Validation:** same-area cross-surface snapshots; success/empty/stale/unavailable/error browser states; keyboard/focus/contrast/labels; OFFICIAL/COMMUNITY/MODEL and observation/forecast separation.
- **Acceptance:** same evidence has consistent classification, time, provenance, and missingness across active surfaces; no screen invents content when data is missing.
- **Readiness:** **BLOCKED** until P0 contracts and P1-3 terminology pass review.

### UNIT P2-1 — Legacy Cleanup, Documentation, and Release Gate

- **Objective:** remove proven-dead duplicate consumers, reconcile current docs, and prepare independent release review.
- **Why / priority:** P2 maintenance and release assurance; cleanup must not obscure P0 changes.
- **Known files/subsystems:** unreferenced frontend components, superseded `/api/v1` modules after route telemetry, `README.md`, current docs listed in Section 9, and release validation records.
- **Dependencies:** P0 and chosen P1 units pass; deployed-client/route usage evidence exists.
- **Allowed changes:** delete or migrate proven-dead code, update current docs, mark historical audits as dated evidence, and run full release matrix.
- **Out of scope:** new capability, source activation, historical audit rewriting, or architecture replacement.
- **Migration / compatibility:** remove a legacy contract only after repository and deployed-client inventory show no required consumer; provide authenticated replacement first when needed.
- **Rollback:** revert each cleanup patch independently; documentation rollback follows runtime version.
- **Validation:** full backend suite, frontend build, active-route browser matrix, route inventory, docs/runtime/source reconciliation, and independent Reviewer verdict.
- **Acceptance:** current docs match runtime; no required consumer uses removed contracts; all mandatory criteria have fresh evidence and Reviewer `PASS`.
- **Readiness:** **BLOCKED** until preceding units and deployed-client inventory complete.

## 9. Files and subsystems likely affected

These are expected future implementation areas, not edits made by this planning task.

- Public shell/routes: `apps/web/src/App.tsx`, `apps/web/src/components/layout/AppLayout.tsx`.
- Core pages: `apps/web/src/pages/OverviewPage.tsx`, `MapPage.tsx`, `AreaDetailPage.tsx`, `MyAreaPage.tsx`, `ReportPage.tsx`, `CasesPage.tsx`, `ForecastPage.tsx`, `OfficialUpdatesPage.tsx`, `DataMethodologyPage.tsx`, `KnowledgePage.tsx`, `AboutPage.tsx`; `AdminReportsPage.tsx` is an active staff truth, verification, media, health, and authentication surface with ownership split by unit.
- Active map components: `apps/web/src/components/map/MapLibreMapView.tsx`, `HomeMapPreview.tsx`, `ContinuousMapView.tsx`; legacy map/section components only after usage proof.
- Public/API composition: `apps/api/app/main.py`, `apps/api/app/api/public/router.py`, `apps/api/app/api/v1/{alerts,factories,forecast,governance,reports,risk,telemetry}.py`, and `apps/api/app/api/internal/router.py`.
- Truth/privacy/security services: create `apps/api/app/core/publication.py`; modify `apps/api/app/services/spatial_monitoring_service.py`, `apps/api/app/core/{source_access,provenance,system_crosscheck,security,staff_rbac,database}.py` only in their assigned units, plus citizen-report entities where a constraint is required.
- Existing adapters: ThaiWater, RID, Open-Meteo, DIW. No new integration is implied.
- Tests: focused files under `apps/api/tests/` for public sanitization, overview, map, source access/failure, governance/security, report isolation/workflow, and staff console; create `test_public_truth_containment.py`, `test_staff_truth_containment.py`, and `test_scheduler_ownership.py`; frontend build/browser/accessibility checks.
- Current docs: `README.md`, `docs/HOME_PAGE.md`, `MAP_VISUALIZATION.md`, `METHODOLOGY.md`, `DATA_SOURCES.md`, `DATA_PROVENANCE.md`, `PRIVACY_AND_LEGAL.md`, `SECURITY.md`, `CITIZEN_REPORT_WORKFLOW.md`, `CITIZEN_REPORT_VERIFICATION.md`, `SYSTEM_HEALTH.md`, and `ADMIN_CONSOLE.md`.
- Verification and deployment: `scripts/verify_all_sources.py`, `deploy/production/verify.sh`, and `deploy/systemd/floodtrace-api.service` under P0-1; production compose files only under their named units.
- Migration tools: create `scripts/migrate_citizen_publication_boundary.py` and `scripts/migrate_citizen_media_boundary.py` only in their assigned units, both with dry-run, apply, reconciliation, and rollback-manifest modes.
- Data artifacts: existing repository boundary/mask/DIW files are inputs to verify, not content to rewrite. Both `data/uploads/` and `apps/data/uploads/` require inventory before copy into the canonical `PRIVATE_MEDIA_ROOT`; repository presence does not make an artifact verified.
- Deployment/configuration changes are authorized only where an implementation unit explicitly names them (P0-1 scheduler ownership, P0-3 private media, and P0-5 containment identity). They must never introduce real secrets into Git.

### Existing architecture to preserve

- SPA and route structure where a label/content change is sufficient.
- FastAPI public/internal separation, strengthened rather than replaced.
- SQLAlchemy data model and PostgreSQL/PostGIS deployment.
- ThaiWater ingestion, scheduler/failure handling, provenance model, report state machine, audit logging, coordinate generalization, and EXIF sanitation.
- Province scope and boundary until a separate geographic-expansion task is approved.
- React, TypeScript, Vite, Leaflet/MapLibre, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, and PostGIS. Current defects are boundary, contract, publication-state, authentication/authorization, and truthful-output defects, not framework defects.

## 10. Explicit out-of-scope boundaries

For this planning task:

- No application, test, script, dependency, configuration, deployment, data, or documentation file other than this plan is changed.
- No CSS or UI implementation, file/directory rename, database migration, API contract change, dataset addition, integration, branch change, commit, push, `implementation.md`, or `review.md`.

For all listed implementation units unless a unit explicitly authorizes the change:

- No framework, map engine, database, or infrastructure replacement.
- No bulk internal rename of packages, tables, environment variables, source IDs, storage keys, report IDs, containers, or historical records.
- No new measurement, laboratory, GIS, official notice, forecast, or alert data.
- No public facility/source identity, source estimation, suspected polluter, or causal attribution.
- No expansion outside Prachin Buri and no notification-delivery system.
- No rewrite of historical audit documents.

## 11. Risks and rollback boundary

### Security and privacy considerations

- Highest risk: `PRIVATE` citizen records can be selected by public queries. Mitigation is an explicit publication-state allowlist shared by all public consumers plus negative tests.
- Facility/source-oriented legacy routes are public by mount, not by route name. Mitigation is authentication/route removal verified against the generated route table and unauthenticated requests.
- Query credentials and client-selected role/user require immediate containment. Production startup already rejects known default keys; do not describe the default as a confirmed normal-startup bypass. Do not claim MFA or identity assurance until implemented and verified.
- Sanitized media is eligible for publication only after the report enters an allowlisted state. Sanitization and randomized filenames are not authorization.
- Unauthenticated governance mutation can change runtime policy and delete/repopulate data. Forecast `test_mode` can bypass production source gating. Both require fail-closed negative tests.
- Reviewed public DTOs did not confirm exact GPS, reporter contact, moderation notes, raw original bytes, or EXIF leakage. Preserve existing exclusions and test them without overstating current findings.

### Data-integrity considerations

- Removing unsupported runtime fixtures will make some screens empty. That is correct until verified data exists. Isolated test fixtures remain legitimate.
- Low priority must never mean safe; missing inputs must not contribute reassuring defaults.
- `observed_at`, `issued_at`, `valid_at`, `retrieved_at`, and UI render time are distinct.
- A source URL and agency name do not prove a record was ingested or verified.
- Static official reference geometry, derived real geometry, and reproducible modeled geometry require distinct labels and provenance. Code-authored geometry without sufficient provenance cannot appear as a public fact.
- A community cluster increases monitoring interest, not evidentiary certainty.
- Blank staff assessment fields and absent cross-check artifacts must remain missing; client substitutions, legacy labels, and code-authored geography cannot create stronger verification or publication eligibility.
- Process-local scheduler ownership is safe only under the declared one-worker production model; a second scheduler owner risks duplicate polling and divergent health state.
- Verification tooling is evidence only when it reads canonical application contracts; key presence, direct upstream reachability, or hardcoded metadata cannot produce a passing result.

### Regression risks

- Public contract tightening can break current pages — migrate endpoint and active consumer in the same phase, with explicit empty-state fixtures in tests.
- Publication allowlisting can temporarily hide legitimate records — backfill/migrate states deliberately and compare counts before/after.
- Removing legacy routes can break hidden clients — inventory repository and deployed consumers; prefer deny-by-default before deletion when uncertainty remains.
- Priority-engine changes can recolor the entire map — snapshot inputs and compare reason codes, missingness, and classification, not the old unsafe scores.
- Public rebrand can break localStorage/report links if internal IDs are renamed — keep internal identifiers and add aliases only where needed.
- Documentation can overtake behavior — update only in the phase where the behavior changes.

### Rollback boundary

- Each implementation unit is one reviewable change set and independently revertible.
- Rollback may restore copy or compatibility behavior only if it does not restore an unsupported runtime claim, private publication, media bypass, unsafe route, mutation exposure, or forecast bypass.
- Data/API migrations must be additive or reversible until all active consumers move; never discard citizen reports or audit history.
- Source activation is controlled by fail-closed configuration and can be disabled without substituting data.

## 12. Validation strategy for future implementation

### T-01 — Scope and diff integrity

- Command/action: `git status --short`, `git diff --stat`, `git diff --check`, and path-by-path diff review.
- Proves: only unit-authorized files changed; no generated data, secret, or unrelated rename entered the change.

### T-02 — Public route and attribution denial

- Command/action: enumerate FastAPI routes; request every `/api/v1/factories/*` and `/api/v1/risk/*` route without credentials; verify protected `/api/internal/*` equivalents with and without credentials.
- Proves: facility/source-analysis capabilities are absent from public reach; justified internal routes remain authenticated.

### T-03 — Publication boundary

- Command/action: targeted pytest cases create `PRIVATE`, `WITHHELD`, `PUBLIC_SAFE_SUMMARY`, `PUBLIC_VERIFIED`, null, unknown, and legacy `SUPPRESSED` reports; query public overview, My Area, observations, legacy reports, clusters, risk area-card/evidence-packet/My Area, spatial monitoring, map priority, and all counts/aggregates.
- Proves: every citizen-report public consumer uses the shared allowlist; only explicitly public safe representations influence output.

### T-04 — Real-data and fail-closed behavior

- Command/action: targeted source-access/failure tests with empty DB, no alert records, stale data, blocked credentials, malformed upstream responses, unavailable sources, present-but-unverified local artifacts, and absent local artifacts. Exercise `/health/sources` and `/api/public/provenance` against the same matrix.
- Proves: outputs are null/empty with reason codes; `/alerts` does not create a normal advisory; `/health/sources` contains no invented availability, counts, timestamps, freshness, or verification; no default measurement, geometry, priority, official claim, reassurance, or freshness appears.

### T-05 — Evidence classification and time semantics

- Command/action: contract tests for every public DTO and representative API snapshots, including forecast selection-point keys, labels, coordinate role, provenance, blocked-source output, unknown-key rejection, deprecated aliases, `/health/sources` canonical `source_status`, compatibility `production_status`, evidence-derived counts/timestamps, and aggregate reconciliation.
- Proves: every item has the correct family/subtype, source status, timestamps, freshness, limitations, and no observed/forecast conflation; application selectors are never represented as official or observed stations; source health cannot diverge from the source matrix.

### T-06 — GIS integrity

- Command/action: existing map tests plus artifact checksum/provenance checks, geometry validity, bounds checks, and empty-layer behavior.
- Proves: displayed factual geometry comes from a `LOCAL / VERIFIED REFERENCE` artifact; present but unreconciled artifacts remain `LOCAL / UNVERIFIED`; model geometry is reproducible and labeled; missing geometry stays missing.

### T-07 — Citizen workflow and media

- Command/action: submit → sanitized private-root upload → track → moderate → publish → unpublish tests, including root ownership/mode/readiness, private/withheld/public states, direct filename requests, wrong report IDs, traversal/symlink attempts, orphan files, malicious bytes, EXIF/GPS, accusation text, duplicate/idempotency, out-of-bounds, cache headers, rate limits, staff `401`/`403`/`404`/success, and audit event.
- Proves: private media is inaccessible; public media appears only after valid publication; unpublishing revokes access; authenticated staff retain report-bound audited access; no static path or filesystem escape bypasses policy.

### T-08 — Backend regression suite

- Command/action: targeted suites first, then `pytest -q apps/api/tests` before release.
- Proves: source, privacy, security, GIS, reliability, staff workflow, and public API behavior remain coherent.

### T-09 — Frontend build and active-route browser review

- Command/action: `npm --prefix apps/web run build`; inspect any browser script before use; test every active route at desktop and mobile widths with success, empty, stale, blocked, unavailable, malformed, and error states. For `/data-methodology`, compare rendered source sections and methodology inputs with `/api/public/provenance` and `/health/sources` fixtures.
- Proves: type/build integrity, route viability, truthful rendered copy, Data & Methodology fail-closed behavior, responsive layout, keyboard flow, focus, contrast, labels, and non-map access.

### T-10 — Terminology and unsupported-claim scan

- Command/action: focused `rg` scans for legacy public branding, fallback values, `OFFICIAL`, “normal/safe/fresh/current,” fixed source counts/timestamps, facility/source attribution, and flood-only copy; manually review each remaining occurrence in runtime code, Data & Methodology, and current docs. For P0-1 technical containment, verify only established neutral missing-state terms were reused and no new safety-critical assertion was introduced. If a unit proposes new or materially changed wording that could imply safety, contamination certainty, official attribution, or accusation, require recorded pass/fail from one named environmental-domain Thai reviewer and one named Thai plain-language reviewer; otherwise that copy remains `BLOCKED — reviewer assignment required`.
- Proves: no blind mass replacement occurred; every sensitive term is justified; technical removal is not blocked by nonexistent reviewers, while new safety-critical Thai wording cannot ship without the explicit gate.

### T-11 — Documentation/runtime reconciliation

- Command/action: compare the source matrix, `/api/public/provenance`, `/health/sources`, repository data inventory, rendered `/data-methodology`, staff verification/cross-check/health responses, verification-tool results, and the P0-1 current documents: `README.md`, `docs/HOME_PAGE.md`, `docs/SYSTEM_HEALTH.md`, `docs/PRIVACY_AND_LEGAL.md`, `docs/DATA_SOURCES.md`, `docs/DATA_PROVENANCE.md`, `docs/MAP_VISUALIZATION.md`, `docs/METHODOLOGY.md`, `docs/ADMIN_CONSOLE.md`, and `docs/CITIZEN_REPORT_VERIFICATION.md`.
- Proves: active, local verified/unverified, internal, blocked, and unavailable/unverified statuses; per-source counts/timestamps; aggregate counts; methodology, staff verification, health, scheduler, and verification-tool claims; and current documentation all match implemented evidence and phase ownership. Historical audit records remain unchanged.

### T-12 — Independent review

- Command/action: Implementer records evidence in `implementation.md`; Reviewer compares request, approved plan, diff, commands, API/browser results, and writes `review.md`.
- Proves: no role self-approves and every mandatory criterion is independently verified.

### T-13 — Mutation and authentication negatives

- Command/action: unauthenticated and invalid-key `POST /api/v1/governance/mode`; production forecast request with `test_mode=true`; staff query-token/query-key, spoofed-user, and spoofed-role requests with exact status assertions; missing/invalid fixed-principal configuration; unauthenticated and underprivileged `POST /api/v1/telemetry/sync`.
- Proves: governance state and row counts do not change without authorization; production forecast remains gated; query credentials and caller-selected identity/role return `400 INVALID_REQUEST`, missing/invalid accepted credentials return `401 AUTH_ERROR`, insufficient permission returns `403 ACCESS_DENIED`, and telemetry sync makes no upstream call or DB write without permission.

### T-14 — Publication and media migration reconciliation

- Command/action: run both migration tools in dry-run; capture before/after per-state counts, public-eligible IDs, file/report associations, hashes, orphans, collisions, and rollback manifests; copy media first on a recoverable target; verify destination hashes and both delivery policies before static-route retirement; run rollback rehearsal without a public remount.
- Proves: no report is silently promoted, totals reconcile, existing media is accounted for, copy verification precedes cutover/retirement, and rollback restores private availability without reopening static public access.

### T-15 — Staff truth, scheduler ownership, and verification evidence

- Command/action: run `test_staff_truth_containment.py`, `test_scheduler_ownership.py`, and updated staff-operations tests; exercise `/admin/reports` verification, cross-check, and health views with omitted/null/whitespace, healthy, real-zero, stopped, partial, unavailable, malformed, and request-error fixtures; inspect the systemd command and process startup; run both verification tools against fixture application responses for `VERIFIED`, `UNAVAILABLE`, `BLOCKED`, `UNVERIFIED`, and `PARTIAL`; compare `docs/ADMIN_CONSOLE.md` and `docs/CITIZEN_REPORT_VERIFICATION.md` with the implemented phase.
- Proves: missing staff evidence is never invented or promoted; unverified waterway context stays unavailable; operational health has no optimistic fallback; exactly one supported scheduler owner produces at most one poll per source interval; verification tools cannot pass from hardcoded metadata, key presence, or direct reachability; staff documents claim only behavior already implemented by their owning unit.

## 13. Acceptance criteria

### AC-01 — Ruwaigon identity

All active public surfaces and public API metadata use Ruwaigon as the product name; retained FloodTrace strings are documented internal identifiers or historical references. Validated by T-09 and T-10.

### AC-02 — Product positioning

Home, navigation, map, and area pages work in normal monitoring conditions and describe flooding only as conditional hydrological context. Validated by T-09 and T-10.

### AC-03 — No unsupported public or active-staff claims

No runtime public response or rendered active public/staff route—including `/health/sources`, shared layout notices, MapLibre popups/statuses, About source descriptions, official updates, Overview, Area Detail/current status, My Area, Data & Methodology, alerts, forecast selectors, and `/admin/reports` verification/cross-check/health views—presents unsupported measurements, laboratory results, official notices, flood extents, alerts, availability, counts, freshness, confidence, source timestamps, agency attribution, verification evidence, health state, selector coordinates, or code-authored geometry as current measured, observed, official, or laboratory-confirmed fact. Legitimate verified references, explicit human evidence, reproducible labeled derived/model geometry, and isolated non-runtime test fixtures remain allowed. Validated by T-04 through T-06, T-09, T-10, and T-15.

### AC-04 — Honest missing and stale states

Absent, blocked, failed, unknown, or stale public or staff inputs produce explicit reasoned states and never default to zero, an invented count or timestamp, low priority, normal, safe, healthy, active, fresh, high confidence, current time, verification evidence, or waterway context. A real query result of zero remains distinguishable from an unavailable count. Validated by T-04, T-05, and T-15.

### AC-05 — Evidence categories

Every public datum is `OFFICIAL`, `COMMUNITY`, or in the `MODEL / DERIVED / FORECAST` family with precise subtype; forecast is never rendered as observed reality and model output is never laboratory confirmation. Validated by T-05 and T-09.

### AC-06 — No public attribution

Unauthenticated users cannot retrieve facility identity/coordinates, source-estimation outputs, suspected-polluter fields, source-to-area paths, or other attribution behavior from any route. Validated by T-02 and T-08.

### AC-07 — Publication gate

`PRIVATE`, `WITHHELD`, null, unknown, and legacy suppressed reports are absent from every public listing, count, map/model input, cluster, risk query, and area summary; only `PUBLIC_SAFE_SUMMARY` and verification-valid `PUBLIC_VERIFIED` use the shared predicate. Blank, substituted, or `LEGACY_UNVALIDATED` evidence cannot satisfy `PUBLIC_VERIFIED`. Validated by T-03, T-14, and T-15.

### AC-08 — Reporter privacy

Public outputs preserve the reviewed DTO exclusions for reporter identity/contact, exact coordinates, moderation notes, raw original bytes, EXIF, device data, and private evidence. This criterion protects the boundary without claiming those fields were already exposed. Validated by T-03, T-07, and T-08.

### AC-09 — Citizen workflow

The active Ruwaigon report flow can safely upload, submit, track, moderate, publish, and unpublish an observation; every new report begins private and unverified. All sanitized media lives under the API-only persistent `PRIVATE_MEDIA_ROOT`; `PRIVATE` media is inaccessible publicly, approved sanitized media uses only the publication-aware report route, and authorized staff use the authenticated report-bound route with an audit event. Validated by T-07, T-09, and T-14.

### AC-10 — GIS and priority integrity

Every displayed geometry has approved provenance or an explicit reproducible model method; missing factors stay missing, and priority explains inputs without implying contamination, safety, or causation. Validated by T-04 through T-06.

### AC-11 — Official and forecast gating

Official/laboratory content and forecast content display only when their source record is eligible, cited, dated, and available; otherwise the UI is explicitly unavailable. Forecast selection coordinates are labeled/provenanced as application selectors, never official or observed stations; unknown selectors fail with `400`. `test_mode=true` cannot change production gating. Validated by T-04, T-05, T-09, and T-13.

### AC-12 — Architecture preservation

The transition uses the existing React/Vite/map, FastAPI/SQLAlchemy, and PostgreSQL/PostGIS architecture; any exception requires a revised approved plan with evidence. Validated by T-01 and architecture diff review.

### AC-13 — Verification quality

All targeted tests, full backend suite, frontend build, active-route browser checks, privacy/security negatives, scheduler-ownership checks, verification-tool fixtures, and `git diff --check` pass with fresh evidence. Validated by T-01 through T-15 as applicable to the unit.

### AC-14 — Documentation accuracy

Current P0-1 docs—`README.md`, `docs/HOME_PAGE.md`, `docs/SYSTEM_HEALTH.md`, `docs/PRIVACY_AND_LEGAL.md`, `docs/DATA_SOURCES.md`, `docs/DATA_PROVENANCE.md`, `docs/MAP_VISUALIZATION.md`, `docs/METHODOLOGY.md`, `docs/ADMIN_CONSOLE.md`, and `docs/CITIZEN_REPORT_VERIFICATION.md`—match the source matrix, public provenance, `/health/sources`, Data & Methodology, staff verification/cross-check/health behavior, scheduler ownership, and verification results. They do not claim unsupported active, verified, measured, official, available, healthy, production-ready, secure-media, or continuous-connectivity behavior. Media claims remain owned by P0-3 and auth/SSE claims by P0-5. Historical audits remain dated and unchanged. Validated by T-10, T-11, and T-15.

### AC-15 — Runtime mutation controls

Unauthenticated `POST /api/v1/governance/mode` cannot mutate settings or datasets. Unauthenticated or underprivileged `POST /api/v1/telemetry/sync` cannot fetch upstream data or write records. Validated by T-13.

### AC-16 — Staff authentication containment

Staff query credentials and client-selected identity/role headers are rejected with `400`; missing/invalid accepted credentials return `401`; permission denial returns `403`. Accepted header/bearer credentials resolve only to configured `staff_admin_01` / `admin_user` with stored role `ADMIN` and the explicit existing permission set; every action audits that identity. Full identity-provider or human-attribution claims remain out of scope. Validated by T-13 and staff workflow tests.

### AC-17 — Source status accuracy

Only implemented ThaiWater water-level/rainfall paths are active APIs. `LOCAL / VERIFIED REFERENCE` requires documented origin, license/publication authority, acquisition record, checksum, and verified transformation; present artifacts lacking that proof are `LOCAL / UNVERIFIED`. Citizen reports are internal; access-gated integrations remain blocked; absent DWR/DOPA/MOPH artifacts remain unavailable/unverified. `/health/sources` and `/api/public/provenance` use these same statuses; unsupported source counts and timestamps are `null` with reason codes, all truth booleans fail closed, and aggregate counts reconcile with emitted source records. Validated by T-04 through T-06 and T-11.

### AC-18 — Migration reconciliation

Publication and media migrations produce exact before/after counts, changed IDs, file hashes, orphan/collision reports, and tested rollback manifests. No record becomes public without an existing approved public state or later explicit staff action. Validated by T-14.

### AC-19 — Staff verification and operational truth

Omitted, null, and whitespace-only assessment fields remain missing; no client or server layer substitutes observation, normal-condition, model-risk, laboratory, or sampling claims. Status-specific criteria are server-enforced, invalid stronger statuses fail with `400`, and `LEGACY_UNVALIDATED` evidence cannot qualify for `PUBLIC_VERIFIED`. Without verified waterway artifacts, cross-check output is empty/unavailable. Staff health shows `HEALTHY` only from three valid reconciled backend responses and otherwise shows the defined unknown/inactive/partial/degraded state without invented values. Validated by T-03 and T-15.

### AC-20 — Scheduler and verification-tool truth

The supported systemd production path runs one Uvicorn worker and exactly one in-process scheduler owner, with at most one scheduled poll per source interval. Source/deployment verification emits only the five fixed result states from canonical application evidence; absent artifacts, configured keys, registry rows, or direct upstream reachability cannot produce `VERIFIED`. Validated by T-04, T-11, and T-15.

## 14. Open questions, known limitations, and revision history

### Implementation readiness summary

`READY` means implementation decisions are resolved; dependency order and listed operational preflights still apply. “Independent” means the unit can begin without another task unit completing, not that deployment preflight may be skipped.

| P0 unit | Status | Unresolved blocker | External dependency | Can implementation begin independently? |
| --- | --- | --- | --- | --- |
| P0-1 Public Truth Containment | **READY** | None for technical containment. New safety-critical Thai copy remains outside the unit at **BLOCKED — reviewer assignment required**. | None | **Yes — first unit.** |
| P0-2 Citizen Publication Boundary | **READY** | None in the plan. | Read-only access to the target DB and a successful dry run before mutation. | **No — execute after P0-1 empty-state contracts.** |
| P0-3 Citizen Media Boundary | **READY** | None in the storage/delivery design. | Inventory both legacy roots and confirm reversible-copy capacity before mutation. | **No — execute after P0-2 shared publication predicate.** |
| P0-4A Sensitive Public Route Containment | **READY** | None for public denial. | Deployed-client inventory informs later internal migration, not denial of unauthenticated access. | **Yes.** |
| P0-4B Runtime Mutation and Forecast Gate | **READY** | None. | Valid existing admin credential for authorized regression tests. | **Yes.** |
| P0-5 Staff Authentication Containment | **READY** | None for fixed-principal containment. Full IdP remains separate. | Validated non-default key distribution and active `staff_admin_01` ADMIN record at deployment preflight. | **Yes.** |

Safety-first execution starts with **P0-1 Public Truth Containment**. It can begin without reviewer assignment because it removes unsupported claims, applies the fixed forecast-selector contract, and reuses established neutral missing-state terms; it cannot introduce or ship new safety-critical Thai copy. P0-4A, P0-4B, and P0-5 are independently executable but do not displace P0-1 as the first unit. P0-2 follows P0-1; P0-3 follows P0-2.

| Later unit | Readiness | Blocking dependency |
| --- | --- | --- |
| P1-1 Telemetry Sync Authorization | **READY after P0-5** | P0-5 containment principal |
| P1-2 Citizen Upload Contract Repair | **READY after P0-3** | Gated media contract |
| P1-3 Ruwaigon Identity and Terminology | **BLOCKED** | Approved Thai tagline/description and named reviewers |
| P1-4 Navigation Label Transition | **BLOCKED** | P1-3 terminology |
| P1-5 Evidence-Led UX | **BLOCKED** | P0 contracts and P1-3 terminology |
| P2-1 Cleanup, Documentation, Release | **BLOCKED** | Preceding units and deployed-client usage evidence |

No previous combined Phase 1 is implementation-ready. Readiness applies only to the units above; blocked copy must not be bundled into P0-1.

### Genuine open questions

1. What approved Thai public tagline and short product description should accompany the Ruwaigon name, and who are the named environmental-domain and plain-language Thai reviewers? This blocks P1-3 and any new safety-critical copy, not P0-1 technical containment.
2. Is there an authoritative DWR/RID waterway artifact, DOPA village artifact, or MOPH facility artifact outside the repository that may legally be stored and published? Until supplied and verified, related geometry/data remains unavailable.
3. Which official notice and laboratory document feeds, if any, have approved access and redistribution rights? A provider homepage alone is insufficient evidence.
4. After public legacy factory/risk mounts are disabled, which named authenticated staff clients require selected capabilities migrated under `/api/internal`? Public exposure is not an option.
5. What production identity provider and secret-management mechanism will replace short-term fixed-principal containment? P0-5 does not claim production-grade multi-user identity.
6. Is Prachin Buri the approved Ruwaigon launch scope? The plan preserves it because all current boundary, telemetry filtering, copy, and tests assume it.
7. What deployments or external clients consume the current APIs? Repository inspection cannot prove external usage, so route removal needs deployment/client inventory.

### Known limitations

- This is a static repository audit. It does not prove current external API availability, production environment values, deployed client usage, data licenses, or agency authorization.
- No runtime server, network source, database content, or rendered browser session was needed to establish the planning findings; future implementation must collect fresh runtime evidence.
- Frontend automated test infrastructure is not currently declared. The plan uses build and browser verification now and leaves dependency changes to a separate decision.
- The plan authorizes no implementation until approved. Readiness is unit-specific; blocked units must not be bundled into ready P0 containment.

### Plan revision history

| Revision | Summary | Reason |
| --- | --- | --- |
| 1 | Initial evidence-based transition audit and phased plan | Initial approved planning scope |
| 2 | Split P0 containment into reversible units; added publication/media, sensitive-route, governance, forecast, staff-auth, telemetry, migration, source-status, and audit-calibration requirements | Independent pre-implementation audit returned `PLAN_REVISION_REQUIRED` |
| 3 | Added all active P0-1 truth surfaces; fixed forecast-selector, Thai gate, private-media, staff-media, fixed-principal, source-status, readiness, and first-unit contracts | Second independent pre-implementation audit returned `PLAN_REVISION_REQUIRED` |
| 4 | Added `/health/sources`, Data & Methodology, source-health regression contracts, and reconciliation of HOME_PAGE, SYSTEM_HEALTH, and PRIVACY_AND_LEGAL within P0-1 | Final pre-implementation readiness review found three remaining P0-1 scope and acceptance gaps |
| 5 | Closed G1–G5 with staff verification/cross-check truth, staff health, single-worker scheduler ownership, canonical verification-tool results, and phase-owned staff documentation | Repository-wide coverage audit found five remaining material P0-1 gaps |
