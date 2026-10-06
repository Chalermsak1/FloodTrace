# RUWAIGON v2 MASTER TWO-MAP + API INTEGRATION PLAN — FINAL

Planning artifact only. Owner decisions recorded on 2026-10-06 approve scoped execution from the locked baseline, with Phase 1 Evidence limited to MANUAL_URL/LINK_ONLY and shadow-only adjustment. Task prerequisites, source-specific contracts and independent review gates still apply. No application, configuration, test, migration, or database changes were made during this planning pass.

Goal: prioritize additional environmental/water-quality monitoring in Prachinburi, with a separate, truthful Flood Situation Map.

Architecture: retain the existing core; add isolated Flood, External Evidence, and derived Monitoring domains. Flood/hydrology facts flow read-only through EnvironmentalContext into Monitoring. Evidence never feeds Flood.

Stack: existing FastAPI, SQLAlchemy, PostgreSQL/PostGIS, Shapely, React, TypeScript, MapLibre and current deployment tools. No new queue, database, authentication platform, or AI vendor is implicitly approved.

Spec: the user's v2 master-plan request, database/lifecycle and verification addenda, and the owner-decision attachment `d5903945-06c6-43bb-b26d-aad53730f27e` in this chat. The recorded owner decisions below resolve the prior global approval gates and govern Phase 1; unapproved numerical calibration, automated collection and external-media rights are not implicitly approved.

For future implementers: execute one approved task at a time through the repository Planner → Implementer → Reviewer workflow. Each task must receive its own approved file manifest and acceptance contract. Do not interpret this master inventory as permission to activate every source.

## 1. Repository baseline

Inspection date: 2026-10-06, Asia/Bangkok. Repository root: `/Users/tanawat/Desktop/Projects/FloodTrace-new`.

| Item | Actual current evidence |
| --- | --- |
| Branch | `feature/ruwaigon-redesign` |
| HEAD | `c794a03841a8aa853887d61dfda3d3cbfa2c2ee2` — original-system restoration and responsive map UI |
| Starting Git status | One modified file: `apps/web/src/pages/MapPage.tsx`; 6 additions / 6 deletions, mode-label text only |
| Approved map baseline | Committed two-mode MapLibre presentation: Monitoring default, Flood alternate, shared search/boundary/controls, distinct layer visibility and flood popup; legacy flood data presented as reference/unverified |
| Uncommitted difference | Labels changed to `บริเวณที่น้ำท่วม` and `เฝ้าระวังสารเคมี`; both compact labels now use the full text. Owner explicitly excludes these user edits from the locked baseline; preserve them untouched |
| Backend | Restored original backend, not the previously hardened P0/P1 implementation. Current `main.py` mounts telemetry, factories, risk, forecast, reports, alerts, governance, admin, realtime, public/internal aliases, and `/uploads` |
| Public namespace | `/api/public/*` and `/api/v1/public/*`; overview, map boundary/priority, zones, flood extent, forecast zones, waterways, stations/history, rainfall/history, My Area, observations, official updates, provenance, report submission/tracking |
| Internal namespace | `/api/internal/*` and `/api/v1/internal/*`, protected by existing admin-key dependency; separate admin routes under `/api/v1/admin` and `/api/admin` |
| Current frontend | `/overview`, `/map`, `/area-detail`, `/my-area`, `/report`, `/cases`, `/official-updates`, `/forecast`, `/knowledge`, `/data-methodology`, `/about`, `/admin/reports` |
| Current models | WaterStation, RainfallStation, Reservoir, IndustrialFacility, ExposureScreeningItem, CitizenReport, ClaimPublication, CorrectionRecord, TakedownRequest, SecurityAuditLog, WaterLevelObservation, RainfallObservation, citizen audit/verification/info-request/escalation, StaffUser |
| Geometry | Boundary/outside-mask GeoJSON files; Shapely-derived cells and inline waterway reference coordinates. No current Waterway ORM model or imported directed hydrology network was found |
| Scheduler | ThaiWater water/rain every 900 seconds. DWR waterways and DIW entries are non-polled static placeholders. RID startup/on-demand; Open-Meteo on-demand |
| Adapters | Only `thaiwater.py`, `rid.py`, `openmeteo.py`, `diw.py` |
| Monitoring model | `services/spatial_monitoring_service.py`; 45 anchors, clipped Voronoi cells; water .35 + rain .25 + waterway proximity .20 + citizen observations .20; cache 45 seconds |
| Flood implementation | `/api/public/flood-extent` returns two inline polygons, inline estimated depth ranges, an OFFICIAL badge and request-time timestamp. It is not a GISTDA fetch or a current inundation observation |
| External Evidence | No implemented evidence/event/schema/collector subsystem; event-mediated Phase 1 architecture is now owner-approved, not yet implemented |

Runtime inspection was read-only: PID 29982 uses this repository, port 8001 returns healthy liveness and the current OpenAPI routes. Public cached responses contain 41 water stations and 77 rain stations. `/health/sources` reports their last source timestamp as `2026-10-06T02:50:00+07:00`, but its request/received/freshness assertions are hardcoded. `/health/metrics` reports zero processed pipeline tasks and no source-health records; this does not prove scheduler inactivity, but does not establish current upstream request success either. Cached rows and hardcoded health assertions are not ACTIVE_RUNTIME proof.

Important current-code gaps are explicit prerequisites, not inherited P0/P1 passes: caller-selected staff identity/role and query credentials; exclude-only citizen publication filtering; manufactured source-health assertions; reference flood geometry labeled official by the legacy API; missing measurements/default thresholds in the base model. Do not silently redesign or repair them during planning.

`LOCKED_BASELINE_SHA = c794a03841a8aa853887d61dfda3d3cbfa2c2ee2` — explicitly approved by the owner. The existing uncommitted MapPage labels are not part of this baseline and must not be deleted, overwritten, copied into, or accidentally committed with future implementation. Future implementation starts in a clean branch/worktree created from this exact commit; do not implement in the current dirty checkout. No baseline commit or worktree is created during this planning turn.

### Owner decision register — 2026-10-06

| Decision | Approved execution contract |
| --- | --- |
| 1. Baseline | Lock the exact SHA above; preserve excluded MapPage edits; future work uses a clean baseline-derived branch/worktree |
| 2. Architecture | External Evidence → trusted Human Review → Monitoring Event → deterministic correlation → bounded adjustment alongside unchanged valid BasePriority; no post/image directly to heatmap; measurements/official/lab/Flood remain separate |
| 3. Reviewer identity | Individually issued opaque credential, secure server-side hash/digest only, active StaffUser binding and server-resolved permissions; revocable, expirable, auditable; no caller username/role or shared admin-key reviewer identity; module-scoped, not platform redesign |
| 4. Compatibility | Minimum allowlist/latest-state validity, missing-input/freshness, source-health/read-only-ingestion and unsupported/private-output containment approved; later invalid state overrides earlier valid state; preserve valid teammate features/weights |
| 5. Initial scoring | SHADOW MODE; public EvidenceAdjustment = 0 and FinalMonitoringPriority = evaluable BasePriority; private correlation/candidate adjustment permitted; all weights/caps/decay remain CALIBRATION PROPOSALS |
| 6. Policy owner | RUWAIGON PROJECT OWNER / AUTHORIZED ADMIN approves policy/version/categories/caps/decay/precision/publication/withdrawal and later activation; trusted actor ID audited, no personal name hard-coded |
| 7. Publication | Latest trusted review_status APPROVED AND publication_status PUBLIC_SAFE AND current approved revision AND valid rights/access AND privacy-safe geometry/data; otherwise non-public; approval is not scientific verification |
| 8. Phase 1 rights | External Evidence sources MANUAL_URL only; publisher/social content LINK_ONLY by default; no automatic images/videos/articles/thumbnails, restricted hotlinks, Facebook/X/private-group scraping or automated Evidence platform/API collection. Separate Flood provider gates remain unchanged |
| 9. Media storage | Metadata + URL + permitted hashes/provenance only; no external media bytes by default. Existing citizen submission rights/workflow preserved; any allowed citizen media is private and controlled, never unrestricted static delivery |
| 10. Retention | Existing proposed classes adopted as INITIAL OPERATIONAL POLICY, configurable and source-rights-aware, not legal guarantees; takedown/withdrawal/rights expiry/legal requirements shorten retention |
| 11. Domain separation | FLOOD_ONLY_CONTEXT_WEIGHT = 0; new flood/rain/hydrology display/correlation only; existing base input never gains a second numeric contribution; flood alone is not contamination evidence |
| 12. Measurement gap | No canonical implemented water-quality/lab pipeline; real future typed integrations remain separate and unavailable until validated |
| 13. Access | GISTDA/DWR/FloodCheck contract/access blockers are source-specific only; disabled integrations do not block unrelated approved execution; no guesses |
| 14. Finalization | Reconcile this plan only; retain valid architecture/database/API/task sections; no source edits, migrations, DB mutations or Git writes |

Evidence anchors: [main.py](/Users/tanawat/Desktop/Projects/FloodTrace-new/apps/api/app/main.py:260), [source registry](/Users/tanawat/Desktop/Projects/FloodTrace-new/apps/api/app/core/source_access.py:63), [scheduler](/Users/tanawat/Desktop/Projects/FloodTrace-new/apps/api/app/core/scheduler.py:63), [base priority](/Users/tanawat/Desktop/Projects/FloodTrace-new/apps/api/app/services/spatial_monitoring_service.py:251), [staff authentication](/Users/tanawat/Desktop/Projects/FloodTrace-new/apps/api/app/core/staff_rbac.py:91), [legacy flood output](/Users/tanawat/Desktop/Projects/FloodTrace-new/apps/api/app/api/public/router.py:616), [map consumers](/Users/tanawat/Desktop/Projects/FloodTrace-new/apps/web/src/pages/MapPage.tsx:130).

## 2. COMPLETE API INVENTORY

Searched actual API/web source, adapters, scheduler, settings, environment examples, all four Compose variants, deploy/scripts, verification tools, tests, README/docs, data provenance, source comments and hardcoded URLs. Dependency trees/build products were excluded. Registry assertions about licenses/cadence/official status are claims to verify, not independent provider evidence.

In this inventory, F = Flood, M = Monitoring, I = internal-only, P = presentation. Paths below are relative to the repository root. `None` means no implemented adapter/call/persistence/consumer, not a proven zero upstream dataset.

| ID / provider / product | Endpoint or service and authentication/config | Implementation, call site, database destination | API / frontend consumer and last known evidence |
| --- | --- | --- | --- |
| S01 HII/ThaiWater water level | `api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load`; `THAIWATER_API_URL`; optional `THAIWATER_API_KEY` | `adapters/thaiwater.py`; startup, scheduler, telemetry GET-on-empty, sync, governance mode; WaterStation/WaterLevelObservation | Public stations/history, overview, priority, My Area; MapPage, OfficialUpdates, staff health. Real upstream call implemented; current request ledger not verified |
| S02 HII/ThaiWater rainfall | Same host, `/api/v1/thaiwater30/public/rain_24h`; `THAIWATER_RAIN_API_URL`, optional `THAIWATER_API_KEY` | Same adapter; startup/scheduler; RainfallStation/RainfallObservation | Public rain/history, overview/priority; MapPage/OfficialUpdates/staff. Current cached rows, not current-request proof |
| S03 ThaiWater alternate station URL | `/api/v1/thaiwater30/public/waterlevel_station` appears in historical audit only; no effective config | No adapter/caller/destination | No consumer; conflicts with actual S01 endpoint |
| S04 RID reservoir telemetry | `app.rid.go.th/reservoir/api/reservoir/public`; `RID_RESERVOIR_API_URL`, `RID_PRIVATE_TOKEN` used by local access gate, not transmitted by adapter | `adapters/rid.py`; startup, telemetry GET-on-empty/sync, governance mode; Reservoir | `/api/v1/telemetry/reservoirs`, legacy analytics/telemetry drawer. Seven metadata entries returned even without usable telemetry; current upstream success not proved |
| S05 RID alternate dam URL | `/reservoir/api/dam/public`, historical audit only | No caller/destination | No consumer; not an approved replacement for S04 |
| S06 Open-Meteo weather forecast | `api.open-meteo.com/v1/forecast`; no credential attached. `OPEN_METEO_API_URL` exists but adapter hardcodes URL; incorrectly uses TMD access policy/key | `adapters/openmeteo.py`; `/api/v1/forecast/`; 300-second in-memory cache, no persisted forecast layer | ForecastModal/legacy forecast consumers. Implemented call; no fresh request proof. Weather forecast, not flood extent/depth |
| S07 TMD forecast | `data.tmd.go.th/api`, `www.tmd.go.th/service/servicePage`; `TMD_API_KEY` | Source registry/settings only; no TMD request adapter | Provenance/staff blocked-source presentation; no actual TMD measurements/forecasts |
| S08 TMD radar | Mentioned in methodology/audits/staff UI; exact feed absent; no separate credential contract | No adapter/scheduler/DB destination | Blocked/reference claims only; not integrated |
| S09 DWR Bang Pakong–Prachinburi regional telemetry JSON | Required by user; exact service URL, schema, auth and usage terms not present in repository | None | None. Historical DWR basin/station information does not establish a working regional JSON service |
| S10 DWR central StationInfo | Official DWR manual describes `/twsapi/v1.0/StationInfo`; API-key workflow. Proposed `DWR_CENTRAL_API_BASE_URL`, `DWR_CENTRAL_API_KEY` | None in repo | None. Provider documentation found; exact authenticated host/schema/coverage must be verified |
| S11 DWR central Runoff | Manual describes Runoff API; proposed central variables above | None | None. Must inspect returned variable/unit/datum; “Runoff” is not permission to equate level, discharge and storage |
| S12 DWR central Rainfall / water-resource metadata / RSS | Listed by official DWR manual, newly discovered in this pass; endpoint/terms/cadence not contracted | None | None. Optional coverage/metadata or duplicate transport, not automatically required |
| S13 Inline DWR/RID waterway reference | `services/spatial_monitoring_service.py` inline coordinate samples; public router inline lines | No network call/Waterway table; non-polled scheduler placeholder | Public `/waterways`, priority proximity; MapPage/ForecastPage. Provider provenance of exact inline geometry not demonstrated |
| S14 DWR WebGIS / portal | `webgis.dwr.go.th`, `www.dwr.go.th`; verifier fallback `service.dwr.go.th/waterway` | Attribution/registry/verifier strings only; no fetching adapter | Provenance UI; not a connected hydrology network service |
| S15 GISTDA Disaster flood product | Repository `disaster.gistda.or.th` / `/services/open-api`; existing `GISTDA_API_KEY`. Provider catalog points to API gateway/key registration | Registry/settings only; no adapter/scheduler/flood DB | Legacy flood API falsely attributes inline geometry; provenance/blocked-source UI. Not integrated |
| S15a GISTDA STAC/JSON flood assets | Provider catalog lists 1/3/7/30-day and historical catalogs; proposed `GISTDA_DISASTER_API_BASE_URL`, `GISTDA_DISASTER_API_KEY` | None | Preferred machine-readable ingestion candidate; gateway access and actual assets must be verified |
| S15b GISTDA WMS/WMTS/TMS | Generic WMS/WMTS mentioned in repo; official catalog confirms these representations of flood and repeat-flood products | None | Optional server-controlled display transport. Not three independent observations; capabilities/CRS/time and permission required |
| S16 Legacy GISTDA satellite URL | `flood.gistda.or.th/api/v2/satellite_flood`, historical audit claiming 403 | No caller/destination | None. Exact endpoint/auth validity not independently established |
| S17 GISTDA FloodCheck forecast | Required by user; no repository reference/adapter/config; no authoritative API contract established in this pass | None | None. Not interchangeable with Disaster catalog or Open-Meteo |
| S18 GISTDA FloodCheck risk | Same absence; exact product/coverage unverified | None | None. Risk must remain distinct from observed extent |
| S19 GISTDA FloodCheck road-water-level | Same absence; exact service, datum and Prachinburi coverage unverified | None | None. Road-point level cannot become flood polygons |
| S20 DIW historical local snapshot | `data/prachinburi_industrial_waste_diw.json`; data.go.th dataset `711b77d9-cc8e-449b-a5c0-cd4c617a9983`; May 2020; `DIW_AUTHORIZED_CREDENTIAL` gate | `adapters/diw.py`; local startup/governance load; IndustrialFacility; 112 current local/health records | Internal facilities and legacy factories/risk. No current upstream request. Never current inspection/lab evidence |
| S21 DIW configured CSV download | `DIW_WASTE_DATASET_URL` ending `101-105-106-1.csv` | Config only; local adapter never requests it | No consumer; possible snapshot-refresh tool, not live telemetry |
| S22 DIW all-factories live service | `www.diw.go.th`; registry `DIW_FACTORY_API_KEY` | No live adapter/scheduler | Blocked-source presentation; sensitive identity, not public v2 data |
| S23 PCD REO7 inspection | Registry `reo07.pcd.go.th/inspection`; `PCD_INSPECTION_MOU` | No adapter/schema/scheduler | Blocked-source presentation only; no current inspection records |
| S24 PCD IWIS/IWQS water quality | Public attribution `iwis.pcd.go.th`; registry `http://iwqs.pcd.go.th`; audit `pcd.go.th/api/waterquality`; `PCD_LAB_MOU` | No measurement/lab adapter or dedicated assay tables | Provenance/official-update claims only. Host/API disagreement unresolved; no active measured water quality established |
| S25 RTSD/GISTDA/DWR DEM | `www.rtsd.mi.th`; registry `DEM_AUTHORIZED_ACCESS`; README also names LDD/DWR | No DEM adapter/raster/flow-direction pipeline | Registry only. No actual elevation/flow-direction data established |
| S26 DGR groundwater | `gwmms.dgr.go.th/api`, `www.dgr.go.th`; `DGR_CREDENTIAL` | No adapter/scheduler/table | Registry/provenance only; optional receptor data |
| S27 DOPA directory | `stat.bora.dopa.go.th`, `www.dopa.go.th`; no credential specified | No directory adapter/table; inline location/reference presentation must not count as portal ingestion | Public provenance/static references; no real external use established |
| S28 MOPH directory | `gishealth.moph.go.th`, `catalog.moph.go.th`, `opendata.moph.go.th`; `MOPH_API_KEY` | No directory adapter/table | Public provenance/static landmarks; no runtime portal ingestion established |
| S29 LDD land use | `ecard.ldd.go.th/geoserver`, `www.ldd.go.th`; `LDD_GIS_TOKEN` | No layer adapter/table/scheduler | Registry only; optional, restricted parcel information |
| S30 Copernicus Sentinel-1 | `dataspace.copernicus.eu/api/catalogue`, historical audit only | No SAR download/processing worker | No consumer. Duplicate upstream imagery concept relative to GISTDA products; no calibrated flood classifier |
| S31 Citizen reports — internal source | Public/v1 report submission; possession-of-code tracking; no external API | CitizenReport and existing audit/verification tables | Public observations/counts/base priority/legacy outputs plus staff workflow. Publication eligibility currently exclude-only in several consumers |
| S32 Prachinburi boundary/mask | `data/prachinburi_boundary.geojson`, `data/prachinburi_outside_mask.geojson` | Local reads by spatial service, no network | Public boundary and MapLibre clipping. Actual local geometry exists; official acquisition/version/license not established by an API request |
| S33 Inline centroids/landmarks | Spatial service anchors and MapLibre district/tambon constants | No provider request/table | Search/analysis cells/static map references. Treat as existing reference/model inputs, not verified live DOPA/MOPH feeds |
| S34 Historical reference paths absent | Audit names `data/reference/industrial_facilities_prachinburi.geojson` and `data/reference/prachinburi_subbasins.geojson`; neither exists in this checkout | None | No consumer; docs cannot prove these datasets were loaded |
| S35 Esri World Imagery | `server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`; public browser tiles | MapLibreMapView/legacy map/AdminReports; no DB/scheduler | Basemap only. Browser upstream traffic was not re-verified in this planning pass |
| S36 CARTO/OSM Voyager | `a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png` plus Leaflet `{s}` variants; OSM/CARTO attribution | MapLibre/legacy maps; no DB/scheduler | Basemap only, not flood/chemistry evidence; runtime traffic unverified |
| S37 Public URL/RSS evidence intake | No configured publisher URL/feed in repo; Phase 1 MANUAL_URL/LINK_ONLY now approved, RSS separately deferred | No collector/parser/tables | Planned trusted staff inbox/review only; no current integration or automation |
| S38 Social-provider APIs | Meta/X/YouTube/TikTok discussed conceptually in prior evidence design; no provider adapter/credential/contract in repo | None | Public URL manual intake only is proposed; platform scraping/API automation deferred |
| S39 AI extraction provider | No selected/configured provider or AI call in repo | None | Future suggestions only; optional and disabled pending approved provider/privacy contract |

Auxiliary URL inventory: Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) and unpkg Leaflet icons are browser presentation dependencies: UNKNOWN runtime state, KEEP existing behavior, no environmental consumer/storage/polling. Docker/Cloudflare package repositories are bootstrap dependencies: DOCUMENTED_ONLY for this runtime inventory, KEEP outside data activation. Cloudflare quick-tunnel hostname in historical audit is DEPRECATED, DEFER as release evidence; current deployment availability not inferred. README badges, GitHub clone links, Python/FastAPI/React/TypeScript/PostGIS documentation and W3C SVG namespaces are not data APIs: DOCUMENTED_ONLY reference links, KEEP documentation only. Localhost URLs, service `api:8001`, CORS/domain placeholders and websocket/SSE endpoints are internal deployment/transport addresses, not upstream environmental sources.

Provider verification: [GISTDA's official flood catalog](https://opendata.gistda.or.th/dataset/flood-disaster-data) documents STAC, WMS, WMTS and TMS resources and API-key registration. Its resource pages say license not specified; listing a public catalog is not permission for unrestricted storage/redistribution. [DWR's official platform manual](https://mekhala.dwr.go.th/imgbackend/doc_file/document_20231017-133901.pdf) is indexed with StationInfo/Runoff/API-key references, but the direct document fetch returned 404; endpoint implementation readiness remains unverified. No borrowed dashboard API key, guessed service URL or third-party FloodCheck contract is approved.

## 3. API usage-status matrix

Each row has exactly one primary state. UNKNOWN is intentional where fresh upstream application evidence or provenance is insufficient. Source implementation and source access are separate facts.

| Source | Product | Purpose | Current state | Called by | Runtime verified | Data used by | Needed in v2 | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 ThaiWater water | F/M | Observed level | UNKNOWN | Startup/scheduler/legacy sync | Cached only | Stations/base priority | Yes | FIX |
| S02 ThaiWater rain | F/M | Observed rain | UNKNOWN | Startup/scheduler | Cached only | Rain/base priority | Yes | FIX |
| S03 alternate ThaiWater URL | F | Station metadata | DOCUMENTED_ONLY | None | No | None | No separate feed | REMOVE_FROM_PLAN |
| S04 RID reservoirs | F | Storage/inflow/outflow | UNKNOWN | Startup/legacy telemetry | No current request proof | Reservoir views | Conditional context | FIX |
| S05 alternate RID dam URL | F | Same concept | DOCUMENTED_ONLY | None | No | None | No separate feed | REMOVE_FROM_PLAN |
| S06 Open-Meteo | F | MODEL weather context | UNKNOWN | Forecast route | No current request proof | Forecast consumers | Yes, weather only | FIX |
| S07 TMD forecast | F | Alternative weather model | CONFIGURED_BUT_UNUSED | None | No | Blocked-source UI | Not required beside S06 | DEFER |
| S08 TMD radar | F | Rain radar | DOCUMENTED_ONLY | None | No | Documentation | Optional | DEFER |
| S09 DWR regional JSON | F | Unique basin telemetry | DOCUMENTED_ONLY | None | RUNTIME_NOT_VERIFIED | None | Required coverage investigation/adapter | VERIFY_ACCESS |
| S10 DWR StationInfo | F | Station metadata | DOCUMENTED_ONLY | None | No | None | Yes if central telemetry used | IMPLEMENT |
| S11 DWR Runoff | F | Station observations | DOCUMENTED_ONLY | None | No | None | Required unique coverage | IMPLEMENT |
| S12 other DWR products/RSS | F | Extra rain/metadata/transport | DOCUMENTED_ONLY | None | No | None | Only unique proven need | DEFER |
| S13 inline waterways | F/M | Reference proximity | UNKNOWN | Local router/spatial service | Code/local only | Map/base proximity | Preserve as qualified reference | KEEP |
| S14 DWR WebGIS portal | F/M | Future official network | DOCUMENTED_ONLY | None | No | Attribution | Optional; directed flow unavailable | DEFER |
| S15 GISTDA Disaster candidate | F | Satellite flood | CONFIGURED_BUT_UNUSED | None | No | Blocked UI/legacy attribution | Yes | IMPLEMENT |
| S15a STAC/JSON assets | F | Ingest flood evidence | ACCESS_REQUIRED | None | No | None | Preferred verified transport | VERIFY_ACCESS |
| S15b WMS/WMTS/TMS | F | Render same product | DUPLICATE_SOURCE | None | No | None | One transport only if needed | DEFER |
| S16 legacy satellite API | F | Claimed flood feed | DOCUMENTED_ONLY | None | Historical claim only | None | Not without authoritative contract | REMOVE_FROM_PLAN |
| S17 FloodCheck forecast | F | Flood forecast | UNKNOWN | None | No | None | Required verification/conditional activation | VERIFY_ACCESS |
| S18 FloodCheck risk | F | Flood risk layer | UNKNOWN | None | No | None | Required verification/conditional activation | VERIFY_ACCESS |
| S19 FloodCheck road levels | F | Road observations | UNKNOWN | None | No | None | Only verified Prachinburi coverage | VERIFY_ACCESS |
| S20 DIW local snapshot | I | Historical facility reference | UNKNOWN | Local loader | Local only | Internal/legacy facilities | Retain internal only | KEEP |
| S21 DIW CSV setting | I | Snapshot update | CONFIGURED_BUT_UNUSED | None | No | None | Not live v2 requirement | DEFER |
| S22 DIW live registry | I | Facility directory | DOCUMENTED_ONLY | None | No | None | Not public v2 requirement | DEFER |
| S23 PCD inspection | M/I | Official confirmation | DOCUMENTED_ONLY | None | No | None | Optional genuine confirmation | VERIFY_ACCESS |
| S24 PCD water quality | M | Measurements/lab records | DOCUMENTED_ONLY | None | No | None | Optional genuine records | VERIFY_ACCESS |
| S25 official DEM | F/M | Directed hydrology/terrain | DOCUMENTED_ONLY | None | No | None | Not first-wave prerequisite | DEFER |
| S26 DGR wells | M/I | Receptors | DOCUMENTED_ONLY | None | No | None | Optional | DEFER |
| S27 DOPA directory | P/M | Administrative reference | DOCUMENTED_ONLY | None | No | Static claims only | No additional API needed initially | DEFER |
| S28 MOPH directory | P/I | Healthcare landmarks | DOCUMENTED_ONLY | None | No | Static claims only | Optional | DEFER |
| S29 LDD land use | I | Land-use context | DOCUMENTED_ONLY | None | No | None | Optional, sensitive | DEFER |
| S30 Copernicus SAR | F | Raw imagery | DOCUMENTED_ONLY | None | No | None | Duplicates processed-source objective | DEFER |
| S31 citizen ingestion | M | Community observations | UNKNOWN | Current report APIs | Paths confirmed; no submission made | Base/public/staff | Yes, eligibility gate required | FIX |
| S32 boundary/mask | P/F/M | Analysis boundary | UNKNOWN | Local service | Local asset exists | Both maps | Yes, hash/reference provenance | KEEP |
| S33 inline centroids | P/M | Search/model anchors | UNKNOWN | Map/spatial service | Local code only | Search/base cells | Yes, reference status | KEEP |
| S34 absent reference files | I | Claimed datasets | DOCUMENTED_ONLY | None | No | None | No | REMOVE_FROM_PLAN |
| S35 Esri imagery | P | Basemap | UNKNOWN | Browser map | Not rechecked | Both maps | Yes | KEEP |
| S36 CARTO/OSM | P | Basemap | UNKNOWN | Browser map | Not rechecked | Both maps | Yes | KEEP |
| S37 manual URL/RSS | M | External evidence | DOCUMENTED_ONLY | None | No | None | MANUAL_URL/LINK_ONLY Phase 1; RSS deferred | IMPLEMENT |
| S38 social APIs | M | Automated collection | DOCUMENTED_ONLY | None | No | None | No first-wave requirement | DEFER |
| S39 AI provider | M/I | Suggestions | DOCUMENTED_ONLY | None | No | None | Optional later wave | DEFER |

### Evidence stages — code path is not runtime proof

The evidence pointers for every ID are in section 2. Abbreviations below apply only to this table: Y = implemented/observed at the stated boundary, N = absent, NV = **RUNTIME_NOT_VERIFIED**. Registered means configured to run, not proof that the current process invoked it. C/D require an attributable current real upstream application request/response, not a probe made separately by a planner. G distinguishes actual current public API reads from frontend code references; no browser QA was performed here.

| Source | A Code exists | B Scheduler invokes it | C Verified upstream request | D Real upstream response | E Source timestamp | F Persisted / consumed | G Current public/frontend result use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | Y `thaiwater.py` | Registered 900s; actual invocation NV | NV | NV | Cached health reports time; request linkage NV | 41 cached station API records | Public API Y; MapPage/OfficialUpdates code Y, browser NV |
| S02 | Y `thaiwater.py` | Registered 900s; actual invocation NV | NV | NV | Cached health reports time; request linkage NV | 77 cached rain API records | Public API Y; MapPage/OfficialUpdates code Y, browser NV |
| S03 | N | N | NV | NV | None | None | None |
| S04 | Y `rid.py` | No periodic job; startup/on-demand code | NV | NV | Nullable API date; current result NV | Reservoir model/call path; current rows not audited | Legacy API/UI references; runtime NV |
| S05 | N | N | NV | NV | None | None | None |
| S06 | Y `openmeteo.py` | No job; forecast call/cache code | NV | NV | Current adapter substitutes retrieval time; issue time not established | In-memory cache path, no DB layer | ForecastModal code; runtime NV |
| S07 | N provider adapter; settings/catalog only | N | NV | NV | None | None | Blocked-source metadata, not TMD result |
| S08 | N | N | NV | NV | None | None | Documentation/staff text only |
| S09 | NOT_IMPLEMENTED; user-required source | N | NV | NV | None | None | None |
| S10 | NOT_IMPLEMENTED; DWR manual only | N | NV | NV | None | None | None |
| S11 | NOT_IMPLEMENTED; DWR manual only | N | NV | NV | None | None | None |
| S12 | N | N | NV | NV | None | None | None |
| S13 | Y local inline geometry | Non-polled placeholder, no upstream | NV | NV | No proven acquisition timestamp | Local model/reference code | Public router + map references, not external feed |
| S14 | N fetching adapter | N | NV | NV | None | None | Attribution strings only |
| S15 | N adapter; registry/settings Y | N | NV | NV | None | None | Blocked metadata/false legacy attribution, not GISTDA data |
| S15a | N | N | NV | NV | Provider catalog windows only, no actual asset time | None | None |
| S15b | N | N | NV | NV | No capabilities/time response | None | None |
| S16 | N | N | NV | NV | None | None | Historical audit claim only |
| S17 | NOT_IMPLEMENTED | N | NV | NV | None | None | None |
| S18 | NOT_IMPLEMENTED | N | NV | NV | None | None | None |
| S19 | NOT_IMPLEMENTED | N | NV | NV | None | None | None |
| S20 | Y local DIW loader | Non-polled placeholder; startup local load | NV; no network request implemented | NV | Historical snapshot date, not live | Local file and health reports 112 rows | Internal/legacy consumers; not current upstream API |
| S21 | N downloader; setting Y | N | NV | NV | None | None | None |
| S22 | N | N | NV | NV | None | None | Blocked metadata only |
| S23 | N | N | NV | NV | None | None | Blocked metadata/claims only |
| S24 | N | N | NV | NV | None | No canonical water-quality/lab table | Public claims only, not measurement result |
| S25 | N | N | NV | NV | None | No DEM assets/pipeline | Metadata only |
| S26 | N | N | NV | NV | None | None | Metadata only |
| S27 | N provider loader | N | NV | NV | Hardcoded health date is not source proof | No imported directory model | Inline/reference claims only |
| S28 | N provider loader | N | NV | NV | Hardcoded health date is not source proof | No imported directory model | Inline/reference claims only |
| S29 | N | N | NV | NV | None | None | Metadata only |
| S30 | N | N | NV | NV | None | No SAR worker/assets | Historical docs only |
| S31 | Y internal report workflow | Event-driven, not upstream scheduler | N/A internal | N/A internal | Report timestamps in model; no QA submission | Report model; no private data audited/submission made | Mounted public/staff consumers confirmed in OpenAPI; browser NV |
| S32 | Y local geometry loader | No upstream job | N/A local | N/A local | Acquisition/version provenance not established | Actual boundary/mask files exist | Boundary API code and map code; browser NV |
| S33 | Y inline constants | No upstream job | N/A local | N/A local | None | Inline anchors/search code | Current code consumers, browser NV |
| S34 | N actual assets | N | NV | NV | None | Absent files | None |
| S35 | Y browser tile code | N/A browser requests | NV | NV | No acquisition-time contract | No DB; browser cache not audited | MapLibre/admin references; browser NV |
| S36 | Y browser tile code | N/A browser requests | NV | NV | No observation timestamp | No DB; browser cache not audited | MapLibre/Leaflet references; browser NV |
| S37 | NOT_IMPLEMENTED | N | NV | NV | None | None | None |
| S38 | NOT_IMPLEMENTED | N | NV | NV | None | None | None |
| S39 | NOT_IMPLEMENTED | N | NV | NV | None | None | None |

Auxiliary dependencies inherit explicit NV runtime status: Google Fonts/unpkg have code references and browser call paths but no verified current request/response/cache evidence; Docker/Cloudflare package feeds have script call paths only, not scheduler/database/product consumers; historical tunnel and documentation URLs have no verified current data consumer. None may be classified ACTIVE_RUNTIME from these references.

### Required provider splits

| Provider/product | Repository mechanism / adapter / scheduler | Access and classification | Required task |
| --- | --- | --- | --- |
| GISTDA Disaster | Catalog/settings only; no adapter/job/runtime proof. Official catalog provides STAC/JSON and WMS/WMTS/TMS mechanisms | Candidate CONFIGURED_BUT_UNUSED; machine-readable gateway ACCESS_REQUIRED; runtime RUNTIME_NOT_VERIFIED. Satellite interpretation is not measured water depth | FLOOD-004, using independent Disaster contract |
| GISTDA FloodCheck | No repo adapter/config/job/runtime use; forecast, risk and road-level contracts remain independently UNKNOWN | Credential/endpoint/coverage unverified; RUNTIME_NOT_VERIFIED. Forecast/risk/road observations must have separate classifications | FLOOD-005; no reliance on Disaster key/contract |
| DWR Bang Pakong–Prachinburi telemetry | NOT_IMPLEMENTED; no regional endpoint/config/adapter/job in repo | DOCUMENTED_ONLY from user spec; exact JSON service/access UNKNOWN; RUNTIME_NOT_VERIFIED | FLOOD-003 regional adapter/contract gate |
| DWR Central API | NOT_IMPLEMENTED; provider manual describes StationInfo/Runoff, not existing repo code | DOCUMENTED_ONLY; project API access/host/schema verification required; RUNTIME_NOT_VERIFIED | FLOOD-003 central adapter/contract gate |

## 4. APIs currently active

Confirmed current application runtime: liveness, OpenAPI and cached public station/rain endpoints. **No external source receives ACTIVE_RUNTIME in this pass**: authenticated scheduler/request evidence was not available and existing public health uses hardcoded assertions. This is not a claim that ThaiWater is offline.

Historically reported ThaiWater/Open-Meteo success must be re-established against the locked build with actual upstream request/result/source-time evidence. Persisted counts, recent cached timestamps, a CLOSED circuit breaker, and mocked tests do not satisfy that gate.

## 5. APIs implemented but unused

No orphan HTTP adapter with zero call sites was found: ThaiWater, RID and Open-Meteo all have callers. The DIW adapter is a local loader, not a network API.

Ineffective configuration exists: `OPEN_METEO_API_URL` is bypassed by a hardcoded URL; `DIW_WASTE_DATASET_URL` is not fetched; GISTDA/TMD settings have no provider adapters. DWR/DIW scheduler placeholders are deliberately non-polled and must not be described as integrations.

## 6. APIs documented but absent

S03/S05 alternate endpoints, TMD radar, central DWR services, DWR WebGIS fetching, live DIW, PCD inspection/lab, official DEM, DGR, DOPA/MOPH fetching, LDD, Copernicus and evidence collection lack real adapters. FloodCheck is additionally unverified as an exact provider/product API contract.

No existing ExternalEvidence, ResearchCandidate, MonitoringEvent, laboratory-measurement or flood-observation schema was found. Historical documentation naming those capabilities or absent reference paths is not implementation evidence.

## 7. APIs broken/access-required

No live external request failure was reproduced during this non-mutating pass; do not invent BROKEN classifications. Concrete implementation defects are known: ThaiWater fetch failures collapse to `[]`; scheduler can record that as successful HTTP 200; RID access is conflated with ThaiWater aliases; Open-Meteo is gated as TMD and ignores its URL setting; legacy source health fabricates proof.

GISTDA gateway access requires a project key, and usage/redistribution terms remain unresolved. DWR central access requires confirmation of project key and actual endpoint contract. FloodCheck endpoint/auth/coverage remain UNKNOWN. Registry PCD/DEM/DIW/DGR/LDD permissions are candidate requirements, not proven usable integrations.

## 8. APIs required for v2

Required: truthful existing ThaiWater water/rain; verified GISTDA observed/interpreted flood products; DWR regional/central coverage investigation and unique usable telemetry; verified FloodCheck forecast/risk products if available for Prachinburi; current core citizen-report publication/privacy boundary; Phase 1 MANUAL_URL/LINK_ONLY intake; isolated trusted Human Review/Monitoring Events and shadow correlation; source health and read-only EnvironmentalContext. RSS remains inventoried but deferred pending a separate source-specific collection contract.

Preserve Open-Meteo as weather MODEL context, not a flood forecast substitute. RID is optional if genuine usable basin telemetry is established. Road-level products require actual local coverage. Official/lab confirmation can be entered through approved, traceable records without falsely promising a live PCD API. Other catalog sources remain explicitly deferred.

## 9. API activation plan

For each required source: approve provider contract → implement typed fetch result → validate and normalize → isolated database rehearsal → authenticated scheduler ownership → current real upstream proof → public safe consumer → browser verification → source-specific activation flag.

Missing credentials/contract/coverage stop activation, not unrelated product operation. Adapters may land disabled only after their exact contract is approved. An unverified FloodCheck or regional DWR URL must not be guessed, scraped from private endpoints, or replaced with fabricated measurements.

Source-by-source execution manifests are in section 35; no required inactive source is left as an unnamed future integration.

## 10. Canonical source ownership

| Concept | Primary policy | Fallback / coexistence |
| --- | --- | --- |
| Satellite flood footprint | Verified GISTDA Disaster product, preserving observation/acquisition window and interpretation method | Last valid layer STALE or unavailable; never inline legacy geometry as live data |
| Flood forecast | Verified FloodCheck forecast product | UNAVAILABLE; Open-Meteo weather remains a separate MODEL layer |
| Flood risk / recurrence | Explicit verified risk product; historical repeat-flood maps classified RISK/REFERENCE | No promotion to current extent |
| Water-level observations | Existing ThaiWater continues to own legacy base input. New station identity records identify originating operator; direct DWR owns its distinct stations/variables | For proven shared instruments prefer direct originating feed for v2 display; HII relay is explicit fallback. Preserve both provenance; no averaging or double count |
| Rain observations | ThaiWater existing feed | Add DWR only for unique verified coverage; deduplicate proven same instrument/window. No silent source switch in base model |
| Reservoir storage/flows | RID under its own source ID and units | Null/unavailable, not design capacity as actual storage |
| Weather forecast | Open-Meteo explicitly MODEL | TMD deferred unless unique approved need; no TMD attribution for Open-Meteo |
| Road water level | Verified product/operator and vertical reference | Points only; no interpolation into flood extents without an independently approved model |
| Waterway connectivity | Existing inline geometry is qualified REFERENCE/proximity heuristic | Verified directed-network claims require an actual authorized network/DEM; otherwise UNKNOWN |
| Boundary/search | Existing hashed local geometry/anchors, with provenance limitations recorded | No invented boundary/centroid replacement |
| Citizen observations | Existing report system with explicit eligible-public contract | No raw/private report leakage or report re-ingestion as independent external evidence |
| External evidence | Human-approved evidence attached to versioned Monitoring Events | Collector/AI confidence is not verification or publication |
| Official/lab confirmation | Real issuing authority/laboratory, traceable document/sample/time/units/method | Missing explicitly missing; separate tables from posts and model results |

### Source-to-product ownership and numeric permissions

| Product function | Primary source | Secondary/fallback | Flood Map | Monitoring context | Numeric contribution | Display/context only |
| --- | --- | --- | --- | --- | --- | --- |
| Observed/interpreted extent | Verified GISTDA Disaster asset | Last valid same-product STALE; otherwise unavailable | Yes, classified OBSERVED/INTERPRETED per contract | CORRELATION_CONTEXT | Flood-only weight 0 | Yes; no contamination inference |
| Flood forecast | Verified FloodCheck forecast | No substitute; unavailable | Yes, FORECAST | DISPLAY_CONTEXT | None in current base/adjustment | Yes |
| Flood risk | Verified FloodCheck risk or explicitly identified GISTDA recurrence product | Last valid own product with stale/reference label | Yes, RISK | DISPLAY_CONTEXT | None | Yes; not observed extent |
| Road water level | Verified FloodCheck/operator road-point product | No synthetic/nearest-gauge depth substitution | Yes, point/unit/datum | DISPLAY_CONTEXT | None | Yes |
| General telemetry | Originating operator per station/variable; direct DWR for its stations | Proven equivalent ThaiWater relay, explicitly attributed | Yes | CORRELATION_CONTEXT for new DWR variables | New context numeric use forbidden by default | Yes outside existing base inputs |
| Rainfall | Existing ThaiWater S02 | DWR only unique/proven same-instrument fallback, no silent averaging | Yes, observed station/window | BASE_MODEL_INPUT for existing feed; new DWR context CORRELATION_CONTEXT | Existing base .25 only; no second adjustment | Context permitted |
| Water level | Existing ThaiWater S01 for base; DWR owns its separate observations | Explicit same-instrument relay if identity/datum/time compatible | Yes | BASE_MODEL_INPUT for existing feed; new DWR context CORRELATION_CONTEXT | Existing base .35 only | Context permitted |
| Runoff/discharge | Verified DWR Runoff variable/units contract | RID release flow remains different variable/product | Yes as telemetry; never polygon/depth | CORRELATION_CONTEXT | None unless future separate model approval | Yes; no assumption that API name implies discharge |
| Weather/model context | Open-Meteo MODEL | TMD deferred; no observed-rain substitution | Optional weather layer, not inundation forecast | DISPLAY_CONTEXT | None in existing base or adjustment | Yes |
| Citizen reports | Core publication-valid citizen workflow | No substitute; withheld/private excluded | No severity/extent input in v2 Flood | Existing eligible core input and event lineage only | Existing base .20 once | COMMUNITY; generalized public data |
| External Evidence | Human-reviewed, eligible Monitoring Events | Manual review remains if collector/AI fails | No | Not in Flood-derived context; separate Monitoring path | Public 0 in Phase 1; internal candidates only; live contribution requires separately approved/activated policy | Fail-closed public-safe event summary separately |
| Water-quality/lab data | Future validated measurement/artifact with issuing lab/authority | UNAVAILABLE until actual integration | No | Dedicated Monitoring measurement/confirmation contract, not flood facts | Future explicit approved policy only | Actual sample/method/time; never invented |

### Source-wide fallback rule

Every source row resolves as: retain a permitted last valid result explicitly STALE, or return its own UNAVAILABLE/ACCESS_REQUIRED/UNCONFIGURED envelope; no silent semantic substitution. Static/local references stay REFERENCE with unknown acquisition date if necessary. Deferred sources have no automated fallback/job. Provider overlap can use an explicitly proven same-instrument fallback preserving provider provenance, units/datum/window, never averaging. Presentation-tile failure changes basemap availability only, not analytical data. GISTDA observed cannot fail over to forecast; DWR/ThaiWater missing values cannot fail over to zero. Historical inline flood geometry may not be relabeled CURRENT; it is usable as REFERENCE only if actual geometry provenance/permission is established, otherwise unavailable.

## 11. Product architecture

Monitoring is primary; Flood is secondary. Prefer additive modules inside the current API/web app over microservices or a wholesale core refactor. Shared storage/transport does not imply shared data authority.

Two rejected alternatives: one mixed map/store encourages interpretation and state leakage; independent duplicated hydrology ingestion causes duplicated ownership/counting. The chosen design uses separate domain loaders/state and one read-only context boundary.

## 12. Flood bounded context

Owns provider contracts, official observations, satellite interpretation, forecasts, risk/reference layers, telemetry, sync runs and source health. Public categories are OBSERVED, INTERPRETED, FORECAST, RISK and REFERENCE; provider authority is a separate field.

Satellite-derived footprint is normally INTERPRETED unless the verified product contract supports another classification. Flood depth is nullable and exists only when that product actually supplies valid depth/unit/datum. Telemetry never invents polygon extent. No citizen/social/evidence input affects Flood severity.

## 13. Monitoring bounded context

Owns approved evidence, human decisions, independence groups, Monitoring Events, correlation, versioned bounded adjustment and explanation. Existing base weights/valid-input behavior remain identifiable as the legacy base model.

Public outputs describe monitoring/verification priority, not chemical toxicity or legal causation. Evidence verification, event review and public publication are independent states. Exact private GPS, reporter identity, restricted facilities, moderation details and private media remain internal.

## 14. Dependency direction

```text
Verified flood/hydrology facts → EnvironmentalContextSnapshot → Monitoring correlation
Phase 1 MANUAL_URL/LINK_ONLY → trusted Human Review → Approved Evidence
                                                    ↓
                                              Monitoring Event
                                                    ↓
Existing BasePriority + public adjustment 0 → FinalMonitoringPriority
```

Optional approved AI remains a suggestion-only future branch; automated collection is deferred. The retained bounded-adjustment architecture records private shadow candidates initially. Public numeric activation is not authorized by this master approval.

Forbidden imports/data flow: evidence → flood; monitoring score → flood; social content → flood; raw post/media → heatmap; either domain synchronously waiting for the other's collector. Context is read-only; Monitoring cannot mutate flood observation tables or trigger upstream fetches.

## 15. Anti-double-count design

Current numeric base: water .35, rainfall .25, proximity .20, citizen factor .20. Level thresholds come from stations, with current unsafe defaults 8.5/7.0; rain bands 90/50/25/10 mm; proximity bands 1/2.5/5 km measured to inline sample points, not directed river distance. Citizen verification is checked by status strings, not latest-record validity. Missing level/rain values currently default to zero and summaries/freshness can be inferred from scores. These limitations cannot be represented as current measurements in new v2 contracts.

| Input | Used by base | Correlation allowed | Evidence adjustment allowed | Public explanation |
| --- | --- | --- | --- | --- |
| Water level | Yes, .35, nearest station ≤12 km | Read-only event timing/context | No second numeric contribution | Station, observed time, datum/unit; no contamination inference |
| Rainfall | Yes, .25, nearest station ≤10 km | Read-only event timing/context | No second numeric contribution | Observed rain/window; forecasts separate |
| Citizen reports | Yes, .20 | Link/reuse same report without new independence | No second weight for the same report or copied post | COMMUNITY, generalized location, publication-valid only |
| Waterways | Yes, .20 reference proximity | Qualify proximity only; directed flow UNKNOWN | No second proximity multiplier | Reference/model relation, never source causation |
| Spatial proximity | Yes, station selection/cell matching | Event location matching, not a new score | No duplicate proximity score | Precision and scope disclosed |
| Flood context | Not currently a base numeric input | Only with separate relevant reviewed abnormal-water event | Flood-only contribution exactly 0; no independent additive/multiplicative flood weight | Context, not contamination evidence |
| Future real water-quality observations | No | Link actual sample/time/method | Only under approved policy; once per sample lineage | Real measured result, not social/AI confirmation |
| External evidence | No | Human-reviewed event-mediated only | Once per independent eligible event under policy | Attributed claim/observation, verification and publication separate |

Lock `FLOOD_ONLY_CONTEXT_WEIGHT = 0`. A relevant event may use context as an eligibility/correlation check, not a second numeric bonus for level/rain/proximity. Record lineage IDs for both base inputs and events; shared report/sample/provider origin prevents multiple weights. Missing or unapproved policy yields adjustment 0 with an explicit disabled reason.

MON-000 implements the owner-approved narrow input/publication truth guards before new public Monitoring results. Preserve fully valid base weights/threshold behavior; do not silently recalibrate. Incomplete base inputs are NOT_EVALUABLE in v2 rather than converted into zero measurements or rescaled weights. Phase 1 public adjustment is exactly 0, including when shadow candidates exist; an unavailable base remains unavailable/null.

## 16. External Evidence prerequisite

**OWNER-APPROVED FOR PHASE 1 EXECUTION** — event-mediated architecture, individually attributable reviewer mechanism, narrow compatibility scope, accountable policy role, fail-closed publication, MANUAL_URL/LINK_ONLY rights and initial operational retention are now recorded in this master. No separate missing v1.1 artifact is a continuing approval blocker. Approval is a planning decision, not implementation/runtime proof.

The former global MON/INT approval block is resolved. Tasks follow their existing technical dependencies; MON-009 live adjustment, automated RSS/platform collection, AI provider activation and external-media bytes remain deferred behind their separate policy/source contracts. These deferred capabilities are not prerequisites of the approved Phase 1 manual/shadow workflow.

The mandatory prerequisite is **MON-000 TRUSTED REVIEWER IDENTITY**. No evidence can become PUBLIC_SAFE, publicly published, or priority-influencing through the existing caller-selected staff attribution. Future Human Review tests must exercise the real approved authentication boundary, not dependency overrides alone.

MON-000 precedes production Human Review. No shared query credential, caller-selected username/role, or shared admin identity may establish a reviewer. The module resolves an individually issued credential to active StaffUser and server-side permissions, checks expiry/revocation and audits the actor. Legacy shared admin capability is not repurposed as reviewer identity; unrelated authentication is not redesigned. AI remains suggestions only and disabled pending its own contract. Phase 1 MANUAL_URL intake passes security/geography/rights checks and retains links/metadata only; RSS and platform automation remain disabled.

## 17. Database domains

Keep current core tables intact in the existing schema. Existing waterways/boundaries are file/inline references, not invented core tables.

| New schema | Tables |
| --- | --- |
| `flood` | flood_source, flood_product, flood_sync_run, flood_raw_record, flood_extent_observation, flood_forecast_layer, flood_risk_observation, telemetry_station, telemetry_observation, road_water_level_observation, source_health_snapshot, core_observation_lineage |
| `evidence` | evidence_source, collector_job, collector_run, external_evidence, external_evidence_media, external_evidence_analysis, evidence_location, independence_group, evidence_group_member, monitoring_event, event_evidence, event_citizen_report, event_measurement_link, confirmation_record, evidence_review_log, event_status_history, media_operation |
| `monitoring` | input_reference, context_input_reference, environmental_context_snapshot, evidence_policy, priority_snapshot, priority_input_reference, event_signal_component, priority_cell_result |
| `publication` | event_publication, visibility_epoch and controlled public read views; no raw public tables |
| `core_private` | reviewer_credential for the approved module-scoped MON-000 identity mechanism; current StaffUser remains core-owned |

Use a separate SQLAlchemy v2 metadata registry, never registered in current core `Base.metadata.create_all`. Separate measurements from evidence and separate official/document confirmations from typed laboratory sample records. Geometry is nullable with precision/scope, not fabricated from AI guesses. Dedup keys include source/product/provider-record/timestamp/variable; observation windows and forecast issue/valid times are distinct.

Store authorized raw payload hashes/provenance, not unrestricted copies of every publisher's content. Phase 1 external Evidence stores metadata/URL/permitted hashes only, with no external-media bytes. Reserved external-media tables/interfaces do not authorize downloading or storing assets; a future byte-storage contract must approve its private API-only root/rights. Existing allowed citizen media remains report-bound/private outside unrestricted static delivery under the narrow approved compatibility scope. No new external-media production path is needed to begin metadata-only execution. No migration promotes publication.

### DATABASE ARCHITECTURE

Additive domain schemas use the existing PostgreSQL/PostGIS stack and a separate v2 ORM registry. Current core measurements stay canonical; typed foreign-key references, not duplicated measurement copies, connect new domains. Publication owns safe projections, never upstream facts. Proposed schemas and tables above are not deployed database claims.

### DATA LIFECYCLE

Four layers are mandatory and independent of domain ownership:

1. **RAW/SOURCE INGESTION:** exact permitted response bytes/minimally transformed source record, private object reference and hash, request/run/schema audit. Never public. If storage rights are absent, retain only permitted hash/status/minimal source identity, not body/media.
2. **VALIDATED/NORMALIZED:** typed measurements, source geometry/product records and evidence metadata. Source quality and system validation are distinct; schema-invalid data stays in private run/raw audit and never enters public eligible normalized rows.
3. **DERIVED/CORRELATED:** context, event aggregation, display selection, correlation and separate base/adjustment/final snapshots. These are not measurements. Event links reference existing measurements instead of copying their values into events.
4. **PUBLIC-SAFE:** explicit publication state plus controlled views/DTOs over approved current revisions, rights and freshness. This is not a raw-table dump or “all sanitized rows are public” rule.

The detailed schema remains the additive master contract under the recorded owner-approved event-mediated Phase 1 scope. Reserved media/AI/RSS and live-adjustment structures do not authorize those deferred capabilities. Additional entities implement requested lifecycle/lineage guarantees; no table is created now.

### TABLE INVENTORY — actual existing core

Evidence: `apps/api/app/models/entities.py`; physical deployment schema beyond those ORM declarations was not introspected. Current ORM has no declared ForeignKey/UniqueConstraint for measurement/report relations; only staff username is explicitly unique. An indexed string station_id is not an enforced station FK. New v2 constraints must be explicit additive DDL, not falsely assumed existing constraints.

| Concept / current table / PK | Source ID / station ID / provider | Observed / retrieved time | Unit / quality | Geometry / consumers |
| --- | --- | --- | --- | --- |
| Level latest cache: `water_stations`, `id:String` | No source_id column; provider/product in provenance JSON; station = id | No dedicated observed_at; source time may be provenance.original_timestamp; `last_updated` defaults to system now, not reliable observed time | Nullable level/ground/warning/critical Floats, metres MSL by field convention; `status` and provenance, no separate validation column | Float latitude/longitude, no PostGIS column; stations API, overview, priority, My Area, risk/internal context |
| Level history: `water_level_observations`, `id:String` | `source_name` default ThaiWater, organization HII/RID, dataset waterlevel_load, record_id; station_id String | `source_timestamp:TIMESTAMPTZ?`, `retrieved_at:TIMESTAMPTZ` system fetch | `water_level_msl:Float?`, metres MSL; freshness/access/license/classification/provenance fields are not independent system validation | No geometry; joins station logically; history API and provenance/scheduler |
| Rain latest cache: `rainfall_stations`, `id:String` | `agency:String?`, provenance; station = id; no canonical source_id column | `observation_time:String?`; last_updated system time | Nullable rain_24h_mm/rain_1h_mm; mm/window implied; status/provenance | Float coordinates; rain API, overview/priority/official updates |
| Rain history: `rainfall_observations`, `id:String` | source_name ThaiWater, organization HII/TMD, dataset rain_24h, record_id; station_id String | `source_timestamp:TIMESTAMPTZ?`, `retrieved_at:TIMESTAMPTZ` | Nullable 24h/1h rain Floats, mm; freshness/access/license/classification/provenance, no separate validation status | No geometry; logical station join; rain history/scheduler |
| Reservoir cache: `reservoirs`, `id:String` | RID attribution in provenance; reservoir ID serves record/station identity; no source/product FK | Source date only in provenance; last_updated system time, no observed/retrieved columns | design capacity MCM separate from nullable storage MCM/percent/inflow/outflow MCM/day; status/provenance | Float coordinates; reservoir/legacy risk/internal consumers; no time-series discharge model |
| Runoff/discharge observation: **NO canonical implemented table** | RID inflow/outflow cache is not an independent river-discharge series; ThaiWater source name does not create discharge data | No canonical observation-time series | Units/quality absent for a generic discharge model | Future validated DWR variable in flood.telemetry_observation only |
| Citizen observations: `citizen_reports`, `id:String` | Internal source; no station; provenance/verification/workflow status | nullable observed_at, created_at and updated_at system times; no source-retrieved_at column | Reported water_depth_cm and contamination_signs are citizen claims, not assays; verification/review/publication/triage fields | Exact private floats + generalized public floats; public eligibility currently unsafe in several consumers; staff/tracking/public aggregate paths |
| Waterways: **NO current canonical ORM table** | Inline DWR/RID attribution; exact origin unverified | No acquisition/retrieval columns | Reference proximity, not flow/discharge | Inline lines/sample points; waterways API/map/priority |
| Administrative boundary: **NO current canonical ORM table** | Two local GeoJSON assets; provider/license/version provenance incomplete | No canonical acquisition/retrieval row | REFERENCE geometry, not a measurement | Polygon/mask in files; clipping/search/map API |
| Water-quality/laboratory observations: **NO implemented model/table/adapter** | PCD/IWIS/IWQS names are references only | None | No actual analyte/unit/method/result rows | No real measured water-quality consumer |
| Other core records: industrial_facilities/exposure_screening; claim_publications/correction_records/takedown_requests; citizen audit/verification/info/escalation; staff_users/security_audit_logs | Historical reference, derived analysis or workflow; not additional measured environmental sources | Timestamp semantics follow their workflow, not observation time | No promotion from registry/claim to lab measurement | Restricted identity/PII and derived analytics remain private; individual ownership listed below |

### TABLE-BY-TABLE DESIGN — conventions

Types: U = UUID, T = TEXT, B = BOOLEAN, I = INTEGER, BI = BIGINT, N = DOUBLE PRECISION (finite values only), J = JSONB, TS = TIMESTAMPTZ UTC, H = 64-character SHA-256 hash, G = PostGIS geometry with SRID 4326. `?` = nullable; other columns NOT NULL unless explicitly stated. A shorthand FK inherits its target PK type. Core foreign-key identifiers stay TEXT to match existing String PKs. New row PKs are UUID except explicit composite/journal keys. No generated centroid is treated as a measured location.

Common **R** columns, physically present on every normalized Flood product/observation except subtype rows explicitly joined to their parent: id U PK; source_id T FK flood_source; product_id U FK flood_product; run_id U FK flood_sync_run; raw_record_id U? FK flood_raw_record; source_record_id T; source_timestamp TS?; valid_from TS?; valid_to TS?; retrieved_at TS; created_at TS; classification T CHECK one allowed category; source_quality_flag T?; validation_status T CHECK VALID/PARTIAL/INVALID; validation_error J; missing_fields J; schema_version T; provenance J; content_hash H; revision I CHECK >0; supersedes_id U? self FK. Cross-source/product/run consistency uses composite FKs with matching source_id/product_id, not three independently valid but mismatched IDs. Valid observation rows require source_timestamp/observed_at; metadata/reference may keep unknown source time explicit. `valid_to >= valid_from` when both exist. Measurement/correction values immutable; append a revision to correct them. `updated_at` is reserved for mutable configuration/head metadata, never an observed timestamp.

Geometry bundle **GEO**: source_geometry `G(Geometry,4326)?` restricted by per-table type CHECK, source_crs T?, source_geometry_hash H?, display_geometry `G(Geometry,4326)?`, display_geometry_hash H?, boundary_version H?, transformation_version T?. Original provider geometry/asset is retained internally where permitted; display geometry is separately clipped to Prachinburi. GiST indexes only where known viewport/intersection queries require them. No geometry when source lacks it; raster-only products use asset references, not invented vector shapes. Raster bytes preserve original CRS with a validated transform reference.

| Flood table / purpose | Columns, PK/FK/uniqueness | Index/query plan | Time / update / provenance / retention |
| --- | --- | --- | --- |
| `flood_source` — provider/service policy | source_id T PK (canonical S-ID mapping); provider_code/name T; service_type T; endpoint_reference T (no inline secret); source_type T; access_class T; authentication_type T; enabled B default false; contract_version T; expected_cadence_seconds I?; freshness_policy J; terms_review_status T; rights J; rights_valid_until TS?; last_schema_version T?; created_at/updated_at TS | PK lookup. No broad extra indexes initially; source_id used by every FK | UPDATE_METADATA_ONLY with config revisions captured in each run; no observed_at. Rights/cadence unknown explicit. R-CONFIG |
| `flood_product` — one classified provider product | id U PK; source_id FK; provider_product_id T; product_version T; product_kind T CHECK WATER_LEVEL/RAINFALL/DISCHARGE/ROAD_LEVEL/FLOOD_EXTENT/FLOOD_FORECAST/FLOOD_RISK/WEATHER_FORECAST/STATION_METADATA; classification T CHECK; variable T?; unit T?; datum T?; coverage G?; schema_version T; freshness_policy J; rights J; enabled B false; created_at/updated_at TS; UNIQUE(source_id,provider_product_id,product_version); UNIQUE(id,source_id) for composite FKs | source/product ID lookup; GiST coverage only if coverage selection query enabled | APPEND_NEW_VERSION when semantics/schema/classification change; enable/status metadata mutable only. No generic observation timestamp. R-CONFIG |
| `flood_sync_run` — every fetch/attempt | id U PK; source_id FK; product_id FK; contract_version T; request_fingerprint H; idempotency_key T UNIQUE; started_at TS; finished_at TS?; status T CHECK STARTED/SUCCESS/ZERO_RECORDS/PARTIAL/FETCH_FAILED/AUTH_FAILED/SCHEMA_INVALID/STORAGE_FAILED; http_status I?; schema_version T?; received/accepted/rejected/duplicated I nonnegative; response_hash H?; error_code T?; sanitized_error J; committed_at TS?; parent_run_id U? self FK; UNIQUE(id,source_id,product_id) | (source_id,started_at DESC) for diagnostics/latest attempts; (status,started_at) for abandoned-run reconciliation | Mutable STARTED → terminal once, terminal immutable. SUCCESS only within successful normalized-write commit; every retry gets own attempt/run. Run linkage, not current DB count, proves a request. R-RUN |
| `flood_raw_record` — bounded private replay/quarantine | id U PK; run_id FK; source_id/product_id matching run; source_record_id T?; record_identity T NOT NULL (documented upstream ID or response-hash/record-index key); source_timestamp TS?; retrieved_at/created_at TS; schema_version T?; payload_hash H; hash_method T ORIGINAL_BYTES/CANONICAL_JSON; byte_size BI CHECK ≥0; storage_mode T CHECK PRIVATE_OBJECT/JSON/HASH_ONLY; payload J?; private_object_key T?; content_type T; validation_status T; validation_error/missing_fields J; rights_policy_version T; expires_at TS?; deleted_at TS?; UNIQUE(run_id,record_identity,payload_hash); CHECK storage fields agree with storage_mode | run_id + payload_hash for reconciliation; expires_at partial index for bounded cleanup | Exact permitted body or documented minimally transformed JSON; original response byte hash remains on run. Do not claim JSONB retains byte-identical formatting. IMMUTABLE content, deletion tombstone metadata only. R-RAW |
| `flood_extent_observation` — footprint, never forecast | R + GEO; observed_at TS?; acquisition_start/end TS?; asset_reference T?; area_measurement N? with unit/source; CHECK classification OBSERVED/INTERPRETED/REFERENCE; UNIQUE(source_id,product_id,source_record_id,content_hash); logical record/time/revision unique | (product_id,source_timestamp DESC), GiST display_geometry for viewport; source_record_id/hash uniqueness for dedup | APPEND_NEW_VERSION, source time/acquisition window preserved; absence of depth means no depth field. R-GEOMETRY |
| `flood_forecast_layer` — classified forecast product | R + GEO; issued_at TS?; issue_time_state T KNOWN/UNKNOWN; forecast_for TS?; horizon_seconds I?; asset_reference T?; model_name/version T?; uncertainty J; CHECK classification FORECAST; valid_from/to required and ordered; UNIQUE(source_id,product_id,source_record_id,content_hash); logical issue/window/revision key | (product_id,issued_at DESC,valid_from,valid_to); GiST display_geometry where viewport needed | APPEND_NEW_VERSION; WEATHER_FORECAST and FLOOD_FORECAST products never interchangeable. FloodCheck requires a genuine issued_at; weather provider with no issue time keeps UNKNOWN, not fetched time. Flood forecast view filters FLOOD_FORECAST only. R-FORECAST |
| `flood_risk_observation` — risk/recurrence/reference | R + GEO; reference_period_start/end TS?; risk_kind T; risk_class T?; risk_value N?; risk_unit T?; method/version T?; CHECK classification RISK/REFERENCE; UNIQUE(source_id,product_id,source_record_id,content_hash) | (product_id,source_timestamp DESC); GiST display_geometry for risk layer | APPEND_NEW_VERSION; not current flooded extent. Unknown product-validity time explicit. R-GEOMETRY |
| `telemetry_station` — station metadata revision | id U PK; source_id FK; provider_station_id T; revision I; name T?; operator T; variables J; unit/datum metadata J; source_geometry G(Point,4326)?; geometry_hash H?; metadata_source_time TS?; retrieved_at/created_at TS; run_id/raw_record_id FK; schema_version T; source_quality/validation fields; provenance J; content_hash H; supersedes_id U? self FK; UNIQUE(source_id,provider_station_id,revision); UNIQUE(source_id,provider_station_id,content_hash) | (source_id,provider_station_id,revision DESC) for latest metadata; GiST point for station viewport/nearby query | APPEND_NEW_VERSION, observations point to exact station revision. Do not silently move old observations when metadata changes. R-STATION |
| `telemetry_observation` — append/versioned measurements | R; station_id U FK exact station revision from same source; provider_station_id T; variable T; value N?; unit T; vertical_datum T?; observed_at TS; window_start/end TS?; measurement_geometry G(Point,4326)?; geometry_hash H?; CHECK classification OBSERVED; UNIQUE(source_id,product_id,provider_station_id,variable,observed_at,source_record_id,content_hash); UNIQUE(source_id,product_id,provider_station_id,variable,observed_at,source_record_id,revision) | (station_id,variable,observed_at DESC) history/latest; (source_id,observed_at); optional GiST measurement_geometry only for point queries | APPEND_NEW_VERSION for corrections; deterministic highest valid revision per logical key, not retrieved_at alone. Same timestamp/new hash is new revision; different provider identities retained. Missing value is null, genuine 0 preserved. R-MEASURE |
| `road_water_level_observation` — road-specific subtype | observation_id U PK/FK telemetry_observation; road_reference T? (safe public only); sensor_reference T; road_level_reference T?; method T; source-specific quality J; created_at TS; UNIQUE(observation_id); observation FK must reference road-level product/variable via validated trigger/service check | Parent station/time/geometry indexes reused; sensor_reference only if actual lookup requires it | Immutable subtype; measured value/time/unit/datum/run/provenance inherited by join from parent, never duplicated as independent measurement. R-MEASURE |
| `source_health_snapshot` — actual attempt/freshness history | id U PK; source_id/product_id FK; run_id U? FK; evaluated_at TS; last_attempt_at/last_success_at/source_timestamp TS?; health_state T CHECK six health states; reason T; accepted_record_count I?; http_status I?; schema_validation T; scheduler_state T; valid_until TS?; policy_version T; diagnostic J sanitized; UNIQUE(product_id,evaluated_at,policy_version) | (product_id,evaluated_at DESC) current health; (health_state,evaluated_at) operational filtering | IMMUTABLE derived evaluation; no invented acquisition time/license/front-end proof. Re-evaluation records new snapshot. R-HEALTH |
| `core_observation_lineage` — no duplicate core measurements | id U PK; water_observation_id T? FK core water_level_observations; rain_observation_id T? FK core rainfall_observations; CHECK exactly one; variable T; source_id/product_id FK; run_id/raw_record_id nullable matching FK; core_record_hash H; lineage_state T VALIDATED/LEGACY_UNLINKED; created_at TS; UNIQUE each core observation+variable+hash | core observation/variable lookups for context/replay | IMMUTABLE links for new real runs; legacy records without request provenance remain LEGACY_UNLINKED, no manufactured historical run. R-LINEAGE |

`source_health` in earlier task shorthand means the canonical `flood.source_health_snapshot` plus latest-health read view, not a second mutable truth table. Runoff/discharge uses typed telemetry_observation only after real variable/unit validation. Road level reuses its telemetry parent; no second count.

### TABLE-BY-TABLE DESIGN — Evidence, Events, Derived and Publication

All new tables use UTC timestamps and explicit ownership below. Every content revision is a new UUID row with a stable logical key + revision; supersedes links preserve history. Decision/publication heads may be mutable with an optimistic revision counter, but factual content and previous decisions are never rewritten. New cross-domain FKs use RESTRICT, not automatic cascade deletion of auditable source facts.

| Table / canonical owner | Columns / key / link constraints | Query indexes / time / update policy |
| --- | --- | --- |
| `evidence.evidence_source` / External Evidence | source_id T PK; provider/publisher T; allowed_hosts J; source_type T; endpoint_reference T?; access/auth classes T; enabled B false; expected_cadence I?; rights/retention J; terms_review/version T; schema_version T?; created_at/updated_at TS | PK; UPDATE_METADATA_ONLY with contract version retained in runs; no claim of measured time |
| `evidence.collector_job` / External Evidence | id U PK; source_id FK; workflow T MANUAL_URL/RSS; job_identity T; schedule J?; next_run_at TS?; enabled B false; lease_until TS?; revision I; created_at/updated_at TS; UNIQUE(source_id,workflow,job_identity); UNIQUE(id,source_id) | (enabled,next_run_at) when scheduled; Phase 1 MANUAL_URL only, no scheduled RSS; mutable job metadata, no evidence/flood score |
| `evidence.collector_run` / External Evidence | id U PK; job_id/source_id matching composite FK; request_fingerprint H; idempotency_key T UNIQUE; started_at TS; finished_at TS?; status T; actual HTTP I?; schema_version T?; received/accepted/rejected/duplicates I; payload_hash H?; private_raw_ref T?; byte_size BI?; raw_expires_at TS?; sanitized_error J; committed_at TS?; UNIQUE(id,source_id) | (source_id,started_at DESC), (status,started_at); terminal immutable; every fetch/retry linked, no success before accepted rows committed |
| `evidence.external_evidence` / External Evidence | id U PK revision; evidence_key U; revision I; source_id FK; collector_run_id FK; original_identifier T; normalized_url T; content_hash H; schema_version T; published_at/observed_at TS?; retrieved_at/created_at TS; source_quality T?; validation_status/errors/missing J; permitted_content_ref T?; safe_candidate_summary T?; rights_version T; supersedes_id U? self FK; UNIQUE(evidence_key,revision); UNIQUE(source_id,original_identifier,content_hash) | URL-hash/source-original-ID lookup; (source_id,published_at DESC); APPEND_NEW_VERSION; no submitted AI/reviewer status makes it public |
| `evidence.external_evidence_media` / External Evidence | id U PK; evidence_id FK exact revision; private_object_key T; content_hash H; content_type T; byte_size BI; sanitization_status T; rights_version T; created_at TS; expires_at/deleted_at TS?; UNIQUE(evidence_id,content_hash) | evidence_id and pending expiry; IMMUTABLE content with tombstone metadata. Private locator/EXIF/identity never public; sanitized is not publication |
| `evidence.external_evidence_analysis` / External Evidence | id U PK; evidence_id FK; provider/model/version/prompt_schema T; input_hash H; structured_suggestions J; analysis_status T; created_at TS; UNIQUE(evidence_id,input_hash,model_version,prompt_schema) | evidence_id latest analysis; IMMUTABLE optional suggestions, retention expiry allowed; created_at is analysis time, not observation time |
| `evidence.evidence_location` / External Evidence | id U PK; evidence_id FK; revision I; geometry G(Geometry,4326)? restricted Point/Polygon/MultiPolygon; scope_code T?; precision_class T; method T; reviewed_decision_id U? FK review_log; created_at TS; content_hash H; supersedes_id U? self FK; UNIQUE(evidence_id,revision) | GiST reviewed geometry only for correlation; APPEND_NEW_VERSION; uncertain administrative scope uses actual polygon/ref or null, never invented point |
| `evidence.independence_group` / External Evidence | id U PK; canonical_origin_key T; revision I; independence_basis T; review_decision_id U? FK; created_at TS; supersedes_group_id U? self FK; UNIQUE(canonical_origin_key,revision) | origin key/revision lookup; APPEND_NEW_VERSION for regrouping; no merging unrelated providers based on similar values |
| `evidence.evidence_group_member` / External Evidence | group_id U FK, evidence_id U FK, origin_role T; PK(group_id,evidence_id); created_at TS; withdrawal_at TS? | evidence_id reverse lookup; versioned membership; one active canonical group per evidence revision enforced by partial unique index |
| `evidence.monitoring_event` / External Evidence event aggregation | id U PK revision; event_key U; revision I; phenomenon T; observed_from/to TS?; scope_code T?; generalized_geometry G(Polygon/MultiPolygon,4326)?; precision T; safe_summary T; content_hash H; review_decision_id FK; created_at TS; supersedes_id U? self FK; UNIQUE(event_key,revision) | (event_key,revision DESC), GiST generalized geometry; APPEND_NEW_VERSION. No copied rainfall/level measurement or inferred facility causation |
| `evidence.event_evidence` / External Evidence | event_id FK exact event revision, evidence_id FK exact evidence revision; relationship T; created_at TS; PK(event_id,evidence_id) | evidence_id reverse withdrawal lookup; IMMUTABLE revision membership |
| `evidence.event_citizen_report` / External Evidence | event_id U FK, report_id T FK core citizen_reports, report_revision_hash H; created_at TS; PK(event_id,report_id,report_revision_hash) | report_id reverse eligibility invalidation; IMMUTABLE link; private report remains restricted and never becomes public via event |
| `evidence.event_measurement_link` / External Evidence | event_id U FK, input_reference_id U FK monitoring.input_reference; usage_class T CHECK CORRELATION_CONTEXT/DISPLAY_CONTEXT; created_at TS; PK(event_id,input_reference_id); trigger validates origin_kind is actual core water/rain or observed flood telemetry only | input_reference_id reverse correction lookup; IMMUTABLE typed measurement link; forecast/evidence/derived scores cannot masquerade as measurements |
| `evidence.confirmation_record` / External Evidence | id U PK; event_id FK; confirmation_type T OFFICIAL_DOCUMENT/LAB_ARTIFACT; issuer T; original_record_id T; artifact_ref/hash T/H; issued_at TS?; sample_id T?; sampled_at TS?; analyte/unit/method T?; validated_result J?; review_decision_id FK; created_at TS; validation_status T; supersedes_id U?; UNIQUE(issuer,original_record_id,artifact_hash) | event/type for safe status. APPEND_NEW_VERSION; no numeric water-quality record until an actual validated lab artifact exists; not an active PCD feed |
| `evidence.evidence_review_log` / External Evidence | id U PK; evidence_id U? FK; event_id U? FK; target_kind T and CHECK correct target; target_revision I; trusted_staff_id T FK core staff_users; decision T; verification_status T; reason T; decision_payload_hash H; reviewed_at/created_at TS; expected_revision I; idempotency_key T UNIQUE | (target_kind,target ID,reviewed_at DESC,id DESC) deterministic latest decision; staff/time for audit; IMMUTABLE decisions; actor not caller text. Cyclic FK creation deferred until all tables exist |
| `evidence.event_status_history` / External Evidence | id U PK; event_id FK; prior/new_status T; decision_id FK; actor_staff_id FK; reason T; created_at TS | (event_id,created_at DESC,id DESC); IMMUTABLE audit; verification change is not publication |
| `evidence.media_operation` / External Evidence | id U PK; media_id FK; operation T STORE/DELETE/RESTORE; idempotency_key T UNIQUE; state T; expected_hash H; private_staging_ref T?; created_at/finished_at TS?; error J | (state,created_at) bounded worker queue; mutable operation state, terminal audit immutable; recoverable file operation without public access while pending |
| `monitoring.input_reference` / Derived Monitoring | id U PK; origin_kind T; typed nullable FKs for core water/rain observation TEXT, core report TEXT, flood telemetry/extent/forecast/risk UUID; optional evidence_revision_id UUID FK added only in DB-006; reference_asset_kind/path/hash T?; variable T; record_revision_hash H; physical_origin_key T; canonical_identity T UNIQUE; frozen_metadata J; captured_at TS; CHECK exactly one typed row origin OR qualified asset origin, consistent with origin_kind; canonical_identity hashes kind/record-or-asset/variable/revision | Each typed FK lookup. IMMUTABLE exact record; actual boundary/waterway refs have validated asset hash/path, not fictional tables. Context excludes evidence origins; DB-004 works without Evidence tables |
| `monitoring.environmental_context_snapshot` / Derived Monitoring | id U PK; contract_version T; scope_geometry G(Polygon/MultiPolygon,4326)?; scope_code T?; precision T; boundary_hash H; generated_at TS; valid_until TS; field_states J; input_hash H; generation_version T; UNIQUE(scope_code,input_hash,generation_version) with geometry hash identity when scope_code null | (scope_code,generated_at DESC), valid_until; GiST only for viewport/context query. IMMUTABLE four-state snapshot, provider/time/units/missing states frozen |
| `monitoring.context_input_reference` / Derived Monitoring | context_id FK, input_reference_id FK, field_name T, usage_class T CHECK five approved classes; frozen_state/metadata J; PK(context_id,field_name,input_reference_id); trigger rejects evidence origins and EVIDENCE_ADJUSTMENT_INPUT in current context contract | context PK/reverse input lookup; IMMUTABLE; rainfall/level/flood/waterway refs and source IDs retained; one-way bridge enforced |
| `monitoring.evidence_policy` / Derived Monitoring | id U PK; version T UNIQUE; parameters J; policy_hash H UNIQUE; approver_staff_id T? FK; approved_at TS?; effective_from/to TS?; publication_precision T; status T DRAFT/APPROVED/RETIRED; created_at TS | version/effective window; approved content immutable; DRAFT numerical parameters labeled CALIBRATION PROPOSALS; accountable approver role RUWAIGON PROJECT OWNER / AUTHORIZED ADMIN, actual trusted actor ID recorded; Phase 1 public adjustment 0 |
| `monitoring.priority_snapshot` / Derived Monitoring | id U PK; mode T SHADOW/ACTIVE; base_model_version T; computation_version T; context_id FK; policy_id U? FK; input_hash H; input_snapshot J (private frozen typed-reference manifest); boundary_hash H; event_revision_ids J; publication_epoch BI; computed_at/valid_until TS; status T; scope T; explanation/exclusion_summary J; idempotency_key T UNIQUE | (scope,computed_at DESC), valid_until; IMMUTABLE complete frozen run; Phase 1 SHADOW only, no score overwritten on base service; ACTIVE requires separately approved/activated policy |
| `monitoring.priority_input_reference` / Derived Monitoring | snapshot_id FK, cell_id T; input_reference_id FK; role T BASE_MODEL_INPUT/CORRELATION_CONTEXT/EVIDENCE_ADJUSTMENT_INPUT; canonical_origin_key T; numeric_participation B; captured_hash H; exclusion_reason T?; PK(snapshot_id,cell_id,input_reference_id,role); deferred FK(snapshot_id,cell_id) to priority_cell_result | UNIQUE(snapshot_id,cell_id,canonical_origin_key) WHERE numeric_participation; same physical origin cannot add numerical weight twice within a cell; one real observation may legitimately inform multiple cells |
| `monitoring.event_signal_component` / Derived Monitoring | id U PK; snapshot_id FK; event_id FK exact revision; independence_group_id FK; cell_id T; signal_value N?; admitted B; exclusion_reason T?; lineage_hash H; policy_id FK; created_at TS; UNIQUE(snapshot_id,cell_id,event_id,independence_group_id); deferred FK(snapshot_id,cell_id) to priority_cell_result | snapshot/cell and event reverse lookup; immutable. Group contribution cap checked in transaction; same group cannot amplify through copied membership |
| `monitoring.priority_cell_result` / Derived Monitoring | snapshot_id FK, cell_id T; base_priority N?; base_components J (frozen weights/states/contributions); shadow_candidate_adjustment N? (private calibration only); evidence_adjustment N NOT NULL default 0; final_monitoring_priority N?; state T; geometry G(Polygon/MultiPolygon,4326); explanation/exclusion_reasons J; PK(snapshot_id,cell_id); finite/range CHECK; equation/NOT_EVALUABLE null CHECK | (snapshot_id,cell_id), GiST geometry; IMMUTABLE; SHADOW requires evidence_adjustment 0 and final = base, never candidate. Candidate null if no calibration proposal; private replay only, not public DTO |
| `publication.event_publication` / Publication/View | event_key U PK; current_event_revision_id U FK; publication_state T PRIVATE/PUBLIC_SAFE/WITHHELD/WITHDRAWN; permitted_evidence_ids J; rights_version T; approved_staff_id T FK; published_at/withdrawn_at TS?; revision I; updated_at TS | (publication_state,published_at DESC); mutable optimistic head; only trusted explicit publication and current eligible member rights/review can select a revision |
| `publication.visibility_epoch` / Publication/View | scope_key T PK; epoch BI; updated_at TS | PK; mutable atomic invalidation counter; snapshots must match current epoch or are not served as current final results |
| `core_private.reviewer_credential` / Core identity | id U PK; staff_id TEXT FK core staff_users; token_digest T UNIQUE; credential_kind T; permissions J? server-managed only; issued_at/expires_at TS; revoked_at TS?; created_at TS | digest exact lookup, staff/revocation; secure digest only, expiry/revocation enforced; active StaffUser/server-side permission rechecked; immutable credential digest, audited revocation metadata mutable; never raw token/actor-selected role in DB/log |

Typed origin FKs/asset alternatives are enforced with exactly-one and kind-consistency CHECKs; JSON lists are descriptive snapshots, not substitutes for relational integrity. Source/product/run, station/source and evidence/run/source consistency use explicit composite keys or validated database triggers. Every logical correction chain enforces a unique logical key + revision and `UNIQUE(supersedes_id) WHERE supersedes_id IS NOT NULL`, with same-logical-key trigger, to prevent forks; deterministic selection never relies on arrival order alone. The actual supersedes column name is used where tables name it differently. If the provider supplies no record ID, the approved adapter contract records an internal canonical key and identity_method, never claims it is a provider-issued identifier.

For run counts, received = accepted new revisions + rejected + duplicates, with terminal state/time and committed-row reconciliation; valid zero is explicitly ZERO_RECORDS. `confirmation_record` is a validated artifact record, not a fabricated generic chemistry measurement table. Public views have no measured facts of their own. Any future canonical water-quality series needs a separate approved source/model/migration task.

### RAW DATA STRATEGY

Size limits below remain proposed implementation bounds, not provider-rights grants or legal retention. Retention classes below are owner-approved INITIAL OPERATIONAL POLICY; narrower source rights still win. Phase 1 external Evidence is MANUAL_URL/LINK_ONLY and cannot retain publisher bodies or external media merely because a size cap permits them.

| Source family | Raw policy / proposed hard size cap | Validation / privacy / replay rule |
| --- | --- | --- |
| ThaiWater water/rain, DWR regional/central, RID | Permitted exact JSON private; 8 MiB per HTTP response, 1 MiB per source record; hash-only when rights absent | Run/schema/hash/source-time; split validated typed records. Preserve real 0 vs null, units/datum/windows. Do not store request auth headers/query secrets |
| Open-Meteo | Permitted JSON up to 8 MiB; otherwise hash/ref | Preserve weather model/product/forecast validity; do not record generationtime_ms/retrieved_at as observed/issued_at |
| GISTDA Disaster | Catalog JSON 8 MiB; approved immutable assets up to 256 MiB streaming cap, source-specific contract may lower; unauthorized assets hash/ref only | Original CRS/geometry/asset hash retained privately; validated display clipping separate. No arbitrary raster polygonization or invented depth |
| FloodCheck forecast/risk/road | Each product's permitted JSON/assets under same bounded caps after official contract | Separate schemas/classifications; quarantine bad data, do not merge products or fabricate missing local coverage |
| DIW/local boundary/reference assets | Existing files unchanged; version/hash/reference, not new unapproved external ingestion | Preserve historical/local classification; no guessed acquisition date. Refer to actual existing file, not absent audit path |
| Manual URLs | Phase 1 metadata/URL/permitted hash only, no publisher article/body/media archive. Any permitted metadata resolution is bounded by 2 MiB document/response cap and discards fetched body after processing | Staff-triggered approved HTTP(S) metadata only; no complete article copies/thumbnails/media downloads. Unknown source times stay unknown; staff-authored attributed summary reviewed separately; URLs checked for credentials/PII/restricted metadata before public linking |
| RSS | DEFERRED; no fetch/scheduled collection in Phase 1 | Future source-specific approved contract must define feed fields, caps/rights/freshness before enabling |
| Evidence media | External bytes disabled in Phase 1; reserved future supported-image bound 10 MiB / 20 megapixels is not storage authorization | No automatic images/videos/thumbnails/restricted hotlinks; allowed existing direct citizen uploads remain private/controlled under submission rights. A future external-media contract must approve rights/private root/sanitization before use |
| AI | Request/result max 1 MiB under approved provider contract; permitted redacted inputs only | Persist model/input hash/version and suggestions, not credentials/raw PII; no authority to verify/publish/invent location |
| Optional deferred providers | No raw ingest until separate approved adapter contract | No scheduler/job merely because URL/key/catalog exists |

Raw streaming enforces caps before buffering; too-large results produce a logged rejected run, not partial fake success. A full source response can be encrypted/private where permitted; quarantine carries validation error/missing fields. No claim that current deployment encryption is verified. Without approved secure storage, keep only permitted minimal reference/hash. Replay is possible only while necessary inputs are retained and rights permit it; record REPLAY_UNAVAILABLE if purged, not regenerate a fictional original response.

### NORMALIZATION STRATEGY

Each adapter validates the approved provider/product schema, finite typed values, units/datum/window, timestamp meaning, geometry/CRS, scope and provider quality before accepted-row writes. Source quality is preserved separately from system VALID/PARTIAL/INVALID status and rejection details. Failed/missing fields remain null with explicit state; only genuine measured zero remains 0. Unsupported transformations or uncertain identity stay quarantined/audited, not coerced into usable public observations. Normalization, dedup/correction selection, terminal run counts and commit reconciliation share the ingestion contract; Evidence metadata never becomes a measurement.

### PROVENANCE / LINEAGE

Canonical source/product registration → actual attempt/run → raw hash/reference → normalized row/revision → typed context/event/input links → derived snapshot → current publication/view forms the auditable chain. Hash method, schema/contract version and transformation/boundary hashes travel with it. Legacy core rows without actual run proof retain LEGACY_UNLINKED; no backfilled fictional request. The final source-to-map matrix below specifies each important producer and consumer.

### TIMESTAMP SEMANTICS

`observed_at` = instrument/citizen phenomenon time; `published_at` = publisher/publication release time; `source_timestamp` = provider record's actual time with documented meaning; `valid_from/to` = product validity/window; `forecast_for` = target future time; `issued_at` = model issue; `retrieved_at` = completed external retrieval; `created_at` = row creation; `updated_at` = mutable administrative metadata only. Store UTC plus original timestamp/zone representation in provenance where necessary. Unknown source time stays null/UNKNOWN; a new fetch never makes old data fresh.

### SPATIAL MODEL

Station/road observations use Point when actual coordinates exist; footprint uses Polygon/MultiPolygon; admin/event scope uses real Polygon/MultiPolygon; waterways use actual LineString/MultiLineString or referenced existing qualified asset, not a new inferred river network. Store source geometry/CRS/hash and display clip/hash/boundary version separately. Exact uncertain evidence uses null or validated administrative polygon; generalized geometry is derived and labeled, never an invented observation point.

### VERSIONING

IMMUTABLE applies to terminal runs, raw content, decisions, links and derived snapshots. APPEND_NEW_VERSION applies to corrected observations/product semantics/evidence/event/location content; supersedes pointers and previous hashes remain. UPDATE_METADATA_ONLY applies to registry/job/credential-revocation/publication heads. SUPERSEDE means a new valid revision is selected; previous factual rows remain intact. No old measurement row is rewritten because newer data arrived.

### DEDUPLICATION

Flood identity: source/provider + product + source_record_id + source time/window + content/geometry hash. Telemetry identity: provider + station + variable + observed time/window + record ID + content hash/revision; same provider identity changed payload is correction, different provider is separate unless independently proven common physical origin. Evidence identity: source + original ID or canonical normalized-URL hash + content hash; content edits become revisions, reposts become same independence group only with evidence of common origin. Similar numbers/photos/text alone do not establish equivalent measurements or independent witnesses.

Double-count guard: snapshot input journal uniquely admits numeric participation by canonical physical-origin key **per snapshot and cell**. Rainfall X used by that cell's base can link to events/context as nonnumeric CORRELATION_CONTEXT only; its legitimate influence on another cell is not prohibited. Event component admission atomically checks every underlying origin, current publication and independence group; it cannot bypass the journal by presenting a copied citizen report as a new URL. Failed lineage/identity resolution excludes the adjustment, not double counts it. Group cap/one-contribution rules are policy plus transactional invariants, not a claim that a UNIQUE index alone proves scientific independence.

### RETENTION / DELETION / WITHDRAWAL

All existing classes/periods are now owner-approved **INITIAL OPERATIONAL POLICY**, not legal guarantees or legally mandated durations. Keep them configurable and source-rights-aware: bounded temporary intake/AI, longer approved Evidence/Events, minimal audit/policy history, bounded reproducibility/debug snapshots. Takedown, citizen withdrawal, rights expiry or legal requirements may shorten any period. Reserved external-media/raw-content classes do not override Phase 1 LINK_ONLY; no external bytes are retained by default.

| Retention class | Data | Initial operational bound / action |
| --- | --- | --- |
| R-RAW | Raw API JSON/quarantine | 7 days payload; minimal permitted hash/run stub 1 year; no payload if rights/storage approval absent |
| R-MEASURE | Normalized level/rain/discharge/road history | 5 years if rights permit; append/version, export/archive before approved purge |
| R-GEOMETRY | Observed/risk/reference original+display geometry | 5 years or shorter rights period; immutable version/transform hashes |
| R-FORECAST | Forecast layers/assets | 90 days; source validity expires display earlier; no current claim after valid_to |
| R-STATION / R-CONFIG | Station/product/contract revisions | While referenced + 5 years after last use, configurable/rights-aware; retain minimal tombstone for FK integrity |
| R-RUN | Ingestion/collector run history | 1 year minimal sanitized ledger; payload follows R-RAW, not ledger lifetime |
| R-AI | Suggestions/raw model response | 30 days; selected reviewed assessment preserved separately only where permitted |
| R-EVIDENCE-PENDING | Unapproved/rejected evidence content | 90 days; review/audit minimal stub retained per rights; no public influence |
| R-EVIDENCE-APPROVED | Approved evidence/event metadata | 1 year after last eligible use, subject to withdrawal/rights; keep minimal allowed lineage afterward |
| R-MEDIA | Private evidence media | Pending 90 days; approved at most 1 year after last eligible use; immediate eligibility revocation on withdrawal, bounded deletion job |
| R-AUDIT | Human/security review and publication audit | 3 years minimal permitted records; private identity protected; legal hold only by approved process |
| R-DERIVED | Context/priority/component/cell snapshots | 1 year replay window; source references protected from purge until dependencies released or explicit replay-unavailable tombstones recorded |
| R-HEALTH | Source-health evaluation history | 90 days, then permitted aggregate metrics; no false reconstruction |
| R-LINEAGE | Typed refs/provenance stubs | At least dependent snapshot/audit lifetime, bounded by rights; no original PII retained solely to satisfy a hash link |

Withdrawal/source deletion/rights expiry/rejection first atomically revokes eligibility/publication, advances visibility epoch and invalidates cache. External post deletion is not proof a claim was false, but stops unsupported ongoing publication until rights/review policy revalidates it. Citizen withdrawal removes public/evidence influence without deleting legitimate staff history indiscriminately. Incorrect source record creates a superseding revision; dependent current results invalidated/recomputed. No public snapshot survives withdrawal merely because it is cached.

Use logical tombstone/minimal permitted identity to preserve referential integrity, then purge private body/media according to rights and retention. If even a link/hash cannot lawfully remain, redact the reference and mark affected historical snapshot REPLAY_UNAVAILABLE; do not break FKs or pretend replay works. Private file deletion is a recoverable media_operation/outbox workflow; publication revocation commits before physical cleanup. Failed cleanup never grants access or silently erases DB/manifest integrity.

### DOMAIN OWNERSHIP MATRIX

PDA below = public direct table access. It is **NO for every domain table**; public APIs use Publication-owned controlled views/DTOs, not raw rows. Retention codes refer to the owner-approved initial operational table above. Each listed entity has exactly one owner, even when another domain reads it.

| Table/entity | Owner | Written by | Read by | PDA | Layer / lifecycle | Retention | Primary provenance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| water_stations | Core measurements | Existing authorized ingestion | Core/public projection/context | NO | Normalized latest cache / mutable | Existing core policy, unchanged | Station provenance; history/lineage required for replay |
| rainfall_stations | Core measurements | Existing authorized ingestion | Core/public projection/context | NO | Normalized latest cache / mutable | Existing core policy | Rain provenance/history |
| water_level_observations | Core measurements | Existing scheduler | History/context/typed links | NO | Normalized / append history | Existing core policy; proposed new R-MEASURE only after approval | Provider record/source timestamp |
| rainfall_observations | Core measurements | Existing scheduler | History/context/typed links | NO | Normalized / append history | Same core-policy caveat | Provider record/source timestamp |
| reservoirs | Core measurements/reference | Authorized RID ingestion | Core/Flood read-only context | NO | Latest normalized/reference cache / mutable | Existing core policy | RID provenance, null telemetry separate |
| citizen_reports | Core citizen workflow | Citizen/staff workflow | Eligible core/public projection/events | NO | Normalized community/workflow / version-audited | Existing privacy policy | Internal report/audit/verification |
| industrial_facilities | Core restricted reference | DIW local loader | Legitimate internal only | NO | Normalized historical / metadata updates | Existing rights | May 2020 snapshot |
| exposure_screening | Core internal derived | Existing internal analysis | Legitimate internal only | NO | Derived / recomputed | Existing policy | Input/method/provenance |
| claim_publications | Core governance | Trusted existing governance workflow | Controlled claim DTO/staff | NO | Public-safe candidate/workflow / versioned | Existing policy | Evidence bundle/review |
| correction_records | Core governance | Governance correction transaction | Staff/audit/controlled history | NO | Audit / immutable | Existing policy | Original/corrected claim versions |
| takedown_requests | Core governance/privacy | Request + staff decision | Authorized staff | NO | Private workflow / audited mutable | Existing policy | Request/decision, private contact |
| security_audit_logs | Core identity/security | Auth/admin actions | Authorized audit | NO | Audit / immutable | Existing policy | Principal/action/time |
| citizen_report_audit_logs | Core citizen workflow | Report transactions | Authorized staff/audit | NO | Audit / immutable | Existing policy | Report/principal/action |
| citizen_report_verifications | Core citizen workflow | Trusted verification workflow | Latest validator/staff | NO | Normalized verification / append | Existing policy | Evidence/method/reviewer/time |
| citizen_report_info_requests | Core citizen workflow | Staff/reporter response | Authorized staff/tracking DTO | NO | Private workflow / audited mutable | Existing policy | Report/request/response |
| citizen_report_escalations | Core citizen workflow | Authorized staff | Authorized staff | NO | Private workflow / audited mutable | Existing policy | Report/destination/decision |
| staff_users | Core identity | Server-side staff administration | Trusted principal lookup | NO | Private identity / audited mutable | Existing identity policy | Authorized identity provision |
| reviewer_credential | Core identity | Approved credential administrator | Trusted identity resolver only | NO | Private credential / revoke metadata | Approved identity policy | Issued credential bound to StaffUser |
| Local boundary/mask and waterway/anchor references | Core reference assets | Existing approved asset maintenance | Both maps/base/context | NO raw API dumping | Normalized/reference + model anchors | Existing rights, no false acquisition date | File/code hash and actual documented origin |
| flood_source | Flood | Contract administrator | Adapters/health/validation | NO | Registry / metadata-versioned | R-CONFIG | Approved source contract |
| flood_product | Flood | Contract administrator | Adapters/normalizer/views | NO | Registry / versioned | R-CONFIG | Provider product contract |
| flood_sync_run | Flood | Flood fetch/ingestion worker | Staff/health/replay | NO | Raw audit / terminal immutable | R-RUN | Actual request/result |
| flood_raw_record | Flood | Flood ingest worker | Validator/authorized debug/replay | NO | Raw / immutable + purge stub | R-RAW | Run + byte hash |
| flood_extent_observation | Flood | Flood normalizer | Context/public Flood view | NO | Normalized / append revision | R-GEOMETRY | Product/run/raw/acquisition geometry |
| flood_forecast_layer | Flood | Flood normalizer | Display/public forecast view | NO | Normalized FORECAST / append revision | R-FORECAST | Product/issue/validity/asset |
| flood_risk_observation | Flood | Flood normalizer | Display/public risk view | NO | Normalized RISK/REFERENCE / append revision | R-GEOMETRY | Risk product/method/run |
| telemetry_station | Flood | Flood normalizer | Telemetry/view/context | NO | Normalized / station revisions | R-STATION | Metadata product/run |
| telemetry_observation | Flood | Flood normalizer | Telemetry/history/context | NO | Normalized measurement / append revision | R-MEASURE | Station/product/run/observed time |
| road_water_level_observation | Flood | Road normalizer | Road display view | NO | Normalized subtype / immutable | R-MEASURE | Parent measurement, no duplicate value |
| source_health_snapshot | Flood | Health evaluator | Diagnostics/public health view | NO | Derived / immutable evaluations | R-HEALTH | Actual runs/freshness policy |
| core_observation_lineage | Flood | Approved core-ingest bridge | Context/replay | NO | Lineage / immutable | R-LINEAGE | Existing core record + real run or LEGACY_UNLINKED |
| evidence_source | External Evidence | Approved source administrator | Collector/review | NO | Registry / versioned metadata | R-CONFIG | Publisher/rights contract |
| collector_job | External Evidence | Approved job administrator | Collector worker | NO | Operational config / mutable lease | R-CONFIG | Approved workflow/source |
| collector_run | External Evidence | Staff-triggered manual intake | Staff/debug/replay | NO | Raw/run audit / terminal immutable | R-RUN/R-RAW | Trusted metadata/link receipt; actual request only if permitted metadata resolution occurred |
| external_evidence | External Evidence | Validating collector/manual intake | Trusted review/event aggregation | NO | Normalized / append revision | Pending/approved evidence classes | Publisher/source/run/content hash |
| external_evidence_media | External Evidence | Private media worker | Authorized evidence delivery | NO | Private raw/sanitized asset / immutable content | R-MEDIA | Evidence/run/content hash |
| external_evidence_analysis | External Evidence | Approved AI/manual analysis | Staff suggestions | NO | Derived suggestions / immutable | R-AI | Input hash/model/version |
| evidence_location | External Evidence | Trusted location review | Event/correlation | NO | Normalized reviewed scope / revisions | Evidence policy | Source text/artifact + reviewer decision |
| independence_group | External Evidence | Trusted dedup/review | Event/adjustment guard | NO | Derived independence / versions | R-LINEAGE | Proven common origin |
| evidence_group_member | External Evidence | Dedup transaction | Event/lineage guard | NO | Derived link / versioned membership | R-LINEAGE | Group/evidence revision |
| monitoring_event | External Evidence event aggregation | Trusted event review | Correlation/public event view | NO | Derived event / immutable revisions | R-EVIDENCE-APPROVED | Reviewed members + decision |
| event_evidence | External Evidence | Event transaction | Correlation/review/withdrawal | NO | Typed link / immutable | R-LINEAGE | Exact event/evidence revisions |
| event_citizen_report | External Evidence | Event transaction | Correlation/eligibility invalidation | NO | Typed link / immutable | R-LINEAGE | Core report revision hash |
| event_measurement_link | External Evidence | Event transaction | Correlation only | NO | Typed nonnumeric link / immutable | R-LINEAGE | Canonical input_reference |
| confirmation_record | External Evidence confirmations | Trusted artifact review | Event/status DTO | NO | Validated official/lab artifact / revisions | Approved evidence rights | Actual issuer/sample/artifact, not fabricated assay |
| evidence_review_log | External Evidence | Trusted review transaction | Staff/audit/latest validator | NO | Audit / immutable | R-AUDIT | Server-side principal/decision |
| event_status_history | External Evidence | Event transaction | Staff/audit | NO | Audit / immutable | R-AUDIT | Event/decision/principal |
| media_operation | External Evidence | Evidence file transaction/worker | Recovery/cleanup worker | NO | Operational outbox / audited mutable | R-RUN/minimal audit | Media hash/operation manifest |
| input_reference | Derived Monitoring | Snapshot/lineage builder | Context/events/priority | NO | Typed lineage / immutable | R-LINEAGE | Exact owned source/core record |
| context_input_reference | Derived Monitoring | Context transaction | Replay/correlation | NO | Derived link / immutable | R-DERIVED | Context/input hash/usage class |
| environmental_context_snapshot | Derived Monitoring | Read-only fact snapshot producer | Correlation/explanation | NO | Derived / immutable | R-DERIVED | Frozen fact refs/states/hash |
| evidence_policy | Derived Monitoring | Accountable policy approver | Shadow/live scorer | NO | Policy / immutable approved versions | R-CONFIG | Trusted approval/version/hash |
| priority_snapshot | Derived Monitoring | Deterministic calculator | Public priority view/replay | NO | Derived / immutable | R-DERIVED | Base/context/policy/event revisions |
| priority_input_reference | Derived Monitoring | Priority transaction | Replay/double-count audit | NO | Derived numeric participation / immutable | R-DERIVED | Canonical input/origin/role |
| event_signal_component | Derived Monitoring | Priority transaction | Explanation/replay | NO | Derived component / immutable | R-DERIVED | Event/group/policy/input lineage |
| priority_cell_result | Derived Monitoring | Priority transaction | Public priority view | NO | Derived result / immutable | R-DERIVED | Snapshot/model/input/policy |
| event_publication | Publication/View | Trusted explicit publication transaction | Public event view/visibility guard | NO | Public-safe head / optimistic metadata | R-AUDIT/minimal head | Current approved event/rights/decision |
| visibility_epoch | Publication/View | Eligibility/publication invalidation | Public current-result gate | NO | Visibility head / mutable atomic counter | Current head + audit | Withdrawal/rights/publication revision |
| Controlled public views | Publication/View | No direct writes; evaluated SELECT | Public DTO reader role/API | Views only | Public-safe projection / current-eligibility read model | Not retained independent facts | Eligible current normalized/derived records |

### PUBLIC/PRIVATE BOUNDARY / PUBLIC READ MODELS

Use ordinary controlled SQL views plus explicit DTO serialization, not materialized copies that leak after withdrawal. Proposed views under `publication`: `public_flood_current_view`, `public_flood_forecast_view`, `public_flood_risk_view`, `public_telemetry_current_view`, `public_source_health_view`, `public_evidence_event_view`, `public_monitoring_priority_view`. Public reader role has SELECT on approved views only, not raw tables/private schemas. Internal workers use scoped write permissions; Monitoring context reader cannot write Flood/core. Feature-off core route avoids optional-table/view queries entirely.

View rules: validated eligible current revision, permitted rights, correct source classification and explicit freshness/validity. Public Evidence/Event requires **review_status = APPROVED AND publication_status = PUBLIC_SAFE AND current approved revision AND currently valid rights/access AND privacy-safe public geometry/data**, plus eligible members. Here publication_status is the contract/DTO name for the existing proposed event_publication.publication_state column; latest trusted review comes from review_log, and a later invalid/rejected decision cannot revive an earlier approval. Verification remains a separate factual label. Priority views check current epoch and expose Phase 1 adjustment 0/final = evaluable base, never private shadow candidates. A DB view cannot enforce HTTP permission alone; handlers recheck permission/publication. On stale epoch return valid base-only/degraded output or unavailable, never withdrawn influence.

| Entity | Internal-only fields | Explicit public-safe allowlist |
| --- | --- | --- |
| Flood/telemetry | Raw body, auth/endpoint secrets, internal object path, rejected geometry/schema payload, restricted operator metadata | Public source/product/operator where permitted, station public ID/name/actual point, variable/value/unit/datum, source/valid times, classification, freshness, safe health reason, provenance link; no unsupported depth |
| Evidence/event | Raw text/media metadata, exact private GPS, identities/contact, AI raw response, reviewer ID/notes, allegations identifying restricted source, private paths | Published event public ID, generalized scope/geometry and precision, phenomenon, approved safe attributed summary/source link, reviewed time, truthful verification/publication label and validity; no raw evidence dump |
| Priority | Private report/evidence IDs, exact GPS/facility links, shadow candidate adjustments/components/calibration parameters, source attribution, staff notes | Cell geometry/scope, MODEL label, base/adjustment/final, safe model/policy/status/explanation and times; Phase 1 adjustment 0/final = base only; no candidate values/causation/confirmed contamination |
| Health | Secrets, full URLs with keys, raw exceptions, internal queue payload | Safe source/product availability, last valid source time, last attempt/success where safe, freshness and aggregate counts derived from actual accepted records |

### INDEXING

Indexes are tied to query patterns in the table designs: station-variable-time history, source-run latest diagnostics, product-source time/validity, publisher original identity/URL hash, event reverse withdrawal links, review target/time queue, snapshot scope/time/expiry and GiST viewport/correlation geometry. Review queue is a controlled query over evidence revisions/latest decisions, with `(review target, reviewed_at DESC, id DESC)` and source/time indexes; add a status partial index only if a measured execution plan needs it. No blind indexes on every JSON field/freshness enum.

### TRANSACTION / CONCURRENCY

- Fetch attempt STARTED committed before network call; no long DB transaction held across HTTP. Raw/hash audit recorded privately. Validation outside the final publication transaction. Accepted normalized rows, dedup/revision changes and terminal SUCCESS/counts commit atomically; failures record terminal error separately. A source health evaluator cannot report committed success before that transaction commits.
- Human Review locks the target revision/head, validates expected_revision/current eligibility/principal, appends immutable decision/audit, updates allowed head and invalidates visibility as one transaction. Two concurrent decisions with the same revision yield one success, one 409 conflict.
- Event linking/revision/membership and status history commit together; typed refs/rights/privacy checked. Same request idempotency key cannot create a second event. Event grouping is deterministic hash/approved review, not random duplicate aggregation.
- Publication updates eligible current head, trusted decision, timestamp and visibility epoch together; public reads immediately reject stale visibility. Media store/delete uses a private staging/outbox manifest and hash checks; failed reconciliation preserves DB references/manifest and leaves delivery fail-closed.
- Priority calculation uses a repeatable-read frozen input set and advisory/idempotency lock by scope/input/model/policy hash; inserts context/snapshot/input journal/components/cells atomically. If publication epoch changed before commit/current serving, result is not eligible current output. Duplicate calc returns the existing identical snapshot.
- Two schedulers: DB advisory lock by source/product plus leased job and unique run/request IDs; unique normalized keys remain the final collision guard. Raw network retries cannot create duplicate committed measurements. Local mutex alone is insufficient with multiple API replicas.

### PARTITIONING / SCALE

No partition needed yet. Current source counts observed: 41 water + 77 rain; at 900-second polling the upper-bound polling model is 118×96 = 11,328 station responses/day, not a measured number of distinct insertions. Dedup and actual provider update cadence reduce inserts; future DWR/road counts unknown. Forty-five cells ×96 changed-input snapshots/day gives at most 4,320 results/day under that illustrative trigger policy, not proof actual throughput. Runs/raw/telemetry/snapshots/review logs are PARTITION CANDIDATE only after measured retained volume/query plans justify it. Start with bounded retention, batching and listed indexes; no premature partition framework. Compute snapshots on input/version change, not every public request.

### BACKUP / RECOVERY

Backup new schemas, current core references, migration/checksum journal, approved policy/identity mappings and permitted private media as a consistent versioned set; encrypt/protect private backups and rehearse isolated restore. Do not assert existing deployment backup/encryption is verified. Human review/audit/source lineage/original permitted observations are non-rebuildable from later upstream pages; their backup is essential. Derived display/context/priority can rebuild only while exact input/event/policy/model/boundary versions survive; record REPLAY_UNAVAILABLE otherwise. Public views/health evaluations can rebuild from valid retained records; raw deletion cannot be reversed from a checksum alone.

### FEATURE-OFF BEHAVIOR

Flood flags off: new tables may remain or be absent; legacy valid core path must not query them. Evidence master off: normal Monitoring request makes no Evidence-table queries, collector/AI jobs stop, public evidence route disabled. Priority flag off: for evaluable base, final = base and adjustment = 0; no policy/event/context optional-table dependency. When a feature is enabled with missing migration/version, that subsystem readiness fails closed, core remains operational. No create_all to fix it. Rights withdrawal/privacy guards remain applicable irrespective of optional flags.

### SOURCE → DATABASE → API → MAP LINEAGE

| Source | Explicit lineage |
| --- | --- |
| ThaiWater water/rain | Existing adapter → flood_sync_run/private permitted raw audit → core WaterLevelObservation/RainfallObservation + core_observation_lineage → legacy public stations/history and new telemetry view/API → Flood detail; frozen input_reference → base snapshot/EnvironmentalContext → Monitoring correlation/priority |
| DWR regional | Regional adapter → regional run/raw → exact telemetry_station revision + typed telemetry_observation → public telemetry view/API → Flood points; input refs/context → Monitoring correlation only |
| DWR central | StationInfo run/raw → station metadata; Runoff run/raw → variable/unit/time-validated observations joined to station revision → telemetry API/Flood detail; context refs → Monitoring correlation; regional/ThaiWater equivalence never inferred from similar values |
| GISTDA Disaster | Disaster adapter → catalog/asset run + permitted raw refs → flood_extent_observation original+display geometry/asset hashes → public_flood_current_view → `/flood/observed` + compatibility wrapper → Flood Map; footprint refs/context → Monitoring nonnumeric correlation |
| FloodCheck forecast | Own product adapter/run/raw → flood_forecast_layer issue/validity/window → public forecast view/API → Flood FORECAST layer; Monitoring display only |
| FloodCheck risk | Own product adapter/run/raw → flood_risk_observation → public risk view/API → Flood RISK layer; Monitoring display only |
| FloodCheck road | Own sensor/product run/raw → telemetry_observation + road subtype → telemetry public point view/API → Flood road detail; Monitoring display only, no polygon/inferred chemical score |
| RID | RID-specific adapter/run/provenance → existing Reservoir cache + permitted lineage/context reference → preserved read-only reservoir detail; Monitoring context only, not new base input or measured flood depth |
| Open-Meteo | Own adapter/run/permitted raw → flood_forecast_layer with product_kind WEATHER_FORECAST, MODEL display label, actual target validity and UNKNOWN issued_at if not supplied → existing compatible weather cache/forecast consumer; excluded from public Flood forecast view and numeric context; no base-rain overwrite |
| Citizen report | Core report + trusted latest verification/publication boundary → typed event_citizen_report/input_reference, not copied external measurement → base contribution once and/or nonnumeric event context → priority snapshot/public safe view → Monitoring Map only |
| Manual URL | Phase 1 evidence_source → staff-triggered MANUAL_URL job/run → LINK_ONLY metadata/URL/permitted hash + reviewed location → trusted review_log → independence groups → Monitoring Event/typed links → private correlation/shadow snapshot/candidates; public priority remains BasePriority. Explicit fail-closed event_publication → safe event view/API; no external-media bytes |
| RSS | Same reserved Evidence lineage after a separately approved source collection contract; disabled/deferred in Phase 1, no current automatic fetch/public influence |
| Optional AI | Approved redacted evidence input hash → actual AI request/analysis record → suggestions → Human Review only; no direct map/publication/score |
| Future actual official/lab artifact | Approved intake/rights + actual issuer/sample/method/unit/result/artifact hash → confirmation_record + trusted decision + event link → truthful event confirmation label/policy only when approved; currently UNAVAILABLE, not a live PCD pipeline |
| Local boundary/waterway/reference | Actual file/code version + qualified provenance hash → preserved reference geometry/model anchors + separate display/context links → both maps/search; no invented imported Waterway/admin table or source acquisition time |

### DATABASE DEFINITION OF DONE

Every entity has one owner; raw/normalized/derived/public layers distinguishable; measurement/evidence separate; typed FK/unique identities and numeric participation guard; explicit timestamps/units/quality/missing states; original geometry and derived clipping separate; source/product/run/revision provenance traceable; no historical observation overwrite; reproducible base/adjustment/final; approved private/public view and media boundary; bounded owner-approved retention/withdrawal; migration/rollback/concurrency/restore rehearsal; feature-off no optional-table dependency. Mandatory unverified schema/rights/auth/policy gates cannot receive PASS. No database change is performed by this addendum.

## 18. Migration plan

No established migration framework was found. Use explicit ordered SQL migrations plus a small reviewed runner/journal; do not install a new platform merely to create these tables.

### MIGRATION ORDER — exact proposed dependency contract

Files below are proposed under `apps/api/migrations/v2/`; runner `scripts/migrate_ruwaigon_v2.py` and migration journal belong to the serialized DB-MIGRATE set, established by Team DB for DB-000/001 in Wave 1, then reused by later tasks. No migration file is created during planning. The runner supports a dependency-closed target, not blindly all filename prefixes; optional Evidence schema cannot be required by an independent Flood rollout.

| ID / proposed filename | Tables/effects / owning task | Required predecessors |
| --- | --- | --- |
| DB-000 `000_reviewer_identity.sql` | core_private reviewer credential for the approved isolated digest mechanism; MON-000A / M-AUTH; no core auto-seed or table rewrite | Locked baseline, existing core staff_users, reviewed migration runner contract; owner identity decision already approved |
| DB-001 `001_source_contracts.sql` | flood_source/product/sync_run/raw_record/source_health_snapshot; FLOOD-002 / F-CONTRACT | Locked baseline, source schema contract; independent of DB-000/Evidence |
| DB-002 `002_flood_observations.sql` | extent/forecast/risk, station/observation/road subtype, core_observation_lineage and explicit core FK links; FLOOD-006 / F-STORAGE | DB-001; actual core observation PKs verified |
| DB-003 `003_external_evidence.sql` | evidence_source/job/run/evidence/media/analysis/review_log/location/independence/group membership/media_operation; MON-001 / M-SCHEMA. Review log initially allows EVIDENCE targets only | Approved External Evidence/MON-000 contract, trusted identity; no Flood dependency |
| DB-004 `004_environmental_context.sql` | monitoring.input_reference (core/Flood/assets only), environmental_context_snapshot/context_input_reference; INT-001 / I-CONTEXT | DB-002; independent of DB-003 and reviewer identity |
| DB-005 `005_monitoring_events.sql` | monitoring_event, typed event links, confirmations, status history; add event-target review FK/CHECK and deferred review/event cyclic FKs; publication.event_publication/visibility_epoch; MON-006 / M-EVENT | DB-003 + DB-004; trusted identity; schema-only Event transaction rehearsal |
| DB-006 `006_priority_snapshots.sql` | evidence_policy/priority_snapshot/input journal/signal components/cell results; optional evidence origin extension to input_reference with updated CHECK/FK; INT-004 + MON-007/008 / M-SCORE + I-CONTEXT serialized ownership | DB-005; frozen base/context/policy interfaces; deferred cell/journal FKs installed within migration |
| DB-007 `007_public_flood_views.sql` | Flood/telemetry/source-health controlled views and least-privilege grants; FLOOD-008 / F-API with DEPLOY grants | DB-002 only; no Evidence tables/views required |
| DB-008 `008_public_monitoring_views.sql` | Evidence event/Monitoring priority controlled views and least-privilege grants; MON-010 / M-PUBLIC with DEPLOY grants | DB-006; current publication/rights/epoch checks required |

Dependency order: Flood DB-001 → DB-002 → DB-004; Evidence identity as approved → DB-003; DB-003 + DB-004 → DB-005 → DB-006 → DB-008. DB-007 can land immediately after DB-002. The dependency runner need not install every numerically earlier optional file. Construct all cyclic tables before deferred constraints; review/event decisions share a transaction with DEFERRABLE FKs, not disabled integrity. Each migration has named up/down, checksum, prerequisite/schema version and before/after reconciliation definitions. Exact implemented constraint/index names are fixed in its approved task manifest.

Requirements: verified backup/restore; explicit target DB confirmation; dry-run; version/checksum journal; transactional apply; lock and before/after reconciliation; isolated real PostgreSQL/PostGIS rehearsal; abort/rollback on reconciliation failure; manifest/checksums for any file move. Deployment performs migrations before enabling flags; startup only checks schema version and fails new subsystem readiness closed. Startup never creates v2 tables.

Rollback order: flags off → stop new jobs → restore compatibility readers → revoke affected view grants → reverse only dependency-leaf v2 migration effects after export/backup. DB-006 evidence-origin extension rolls back before DB-005/003; DB-004 before DB-002; identity persistence only after all referencing consumers stop. Never drop or rewrite core tables; never erase unrelated/newly-created evidence as an automatic rollback. For populated non-rebuildable tables, stop at safe compatibility/flags-off rollback until an approved export/data-recovery plan exists. Core ID links and v2 schema foreign keys are explicit migration DDL, not accidental cross-registry create_all. Test core startup with a DB role lacking DDL privilege for v2.

## 19. EnvironmentalContext contract

`EnvironmentalContextSnapshot` is immutable, read-only, versioned. Required envelope: context_id, contract_version, scope/geometry/precision, generated_at, valid_until, input references and boundary hash; database id maps to context_id. Observation times remain per input, not one misleading envelope observed_at. No raw evidence or staff fields.

Each rainfall, water_level, flood_status/classification and waterway_context item has: `state: VALUE | UNKNOWN | UNAVAILABLE | STALE`, nullable value, unit, vertical datum where relevant, provider, source_product, source_timestamp, retrieved_at, freshness, quality/reason and provenance references. Envelope times do not replace field-level source times. VALUE requires a valid typed value; STALE may carry last valid value but is ineligible for current numeric influence.

Forecast fields additionally retain issued_at, valid_from/to and horizon and cannot fill observed fields. Unknown units/datum/geography/timestamp invalidate that field. Out-of-province upstream gauges may appear only as explicitly identified catchment context, never as in-province observations. No unavailable-to-zero conversion; no provider mixing/averaging. `read_context(scope, as_of)` performs no upstream fetch/write.

Each field has exactly one `usage_class`: DISPLAY_CONTEXT, CORRELATION_CONTEXT, BASE_MODEL_INPUT, EVIDENCE_ADJUSTMENT_INPUT or NOT_ALLOWED. Classification describes permission to use the field, not source freshness. Default newly shared Flood/hydrology fields to CORRELATION_CONTEXT, never numeric adjustment.

| Shared field | Usage class | Rule |
| --- | --- | --- |
| Existing ThaiWater observed rain/level references | BASE_MODEL_INPUT | Existing base contribution only; context may annotate/correlate the same lineage, never add a second numeric weight |
| New DWR observed level/rain/discharge | CORRELATION_CONTEXT | Event time/location consistency only; no automatic base replacement/recalibration |
| Observed/interpreted footprint and time window | CORRELATION_CONTEXT | Relevant independently reviewed environmental event required; flood-only numeric weight 0 |
| Forecast, risk/recurrence and road-point layer | DISPLAY_CONTEXT | Distinct classifications; not observed event severity or contamination evidence |
| Waterway reference relation | CORRELATION_CONTEXT | Qualify proximity; current base's proximity is already counted; directed flow remains UNKNOWN without real data |
| Provider, timestamps, freshness, units/datum, provenance | DISPLAY_CONTEXT | Explain/validate facts; not independent score features |
| Raw social/AI content, private GPS, PII, facility identity, source-attribution guesses | NOT_ALLOWED | Excluded from shared/public context |
| Future real water-quality/lab record | NOT_ALLOWED in the current Flood context contract | Introduce a separate approved measurement contract; only then may a policy classify a new event component EVIDENCE_ADJUSTMENT_INPUT |

No currently shared Flood field is EVIDENCE_ADJUSTMENT_INPUT. Numeric adjustment inputs come from approved independent Monitoring Events under policy, not the context transport.

## 20. Flood data pipeline

S01/S02 → existing adapters corrected at boundary → source-specific typed results → validated legacy-compatible core observations plus v2 lineage references.

S09/S10/S11 → DWR adapters → station identity, unit/datum/time validation and dedup → `flood.telemetry_*`.

S15/S15a → approved GISTDA product/asset adapter → time window, CRS, nodata and Prachinburi clipping validation → `flood.flood_extent_observation` plus permitted immutable asset references. Raster/WMS-only data stays raster; no fake polygonization or depth inference.

S17/S18/S19 → individually verified FloodCheck product contracts → distinct forecast/risk/road-point normalization → forecast_layer/risk_observation/telemetry_observation. No product substitution if unavailable.

S04/S06 → corrected source-specific adapters → reservoir facts or weather MODEL context, never satellite extent.

Every path: request/run ledger → validate → normalize → idempotent transaction → actual source health/freshness → safe public read API → Flood Map. A malformed batch cannot be published as a current successful empty batch. No public GET performs ingestion.

```text
FLOOD MAP PIPELINE
ThaiWater / verified DWR / GISTDA Disaster / verified FloodCheck / optional RID
  → source-specific adapters
  → schema, authority, units/datum, time, CRS and coverage validation
  → source-specific normalization + physical-origin dedup
  → Flood/core observation storage + permitted immutable asset/cache references
  → actual source health + freshness/window evaluation
  → Flood observed / forecast / risk / telemetry read APIs
  → Flood Map loaders → classified layers / legend / popup / unavailable state
```

## 21. Monitoring data pipeline

Existing measurements + eligible citizen reports → frozen base input snapshot → BasePriority. Phase 1 MANUAL_URL/LINK_ONLY metadata → trusted Human Review → approved evidence → versioned Monitoring Event → deterministic correlation against read-only context → private shadow candidates. Public EvidenceAdjustment = 0 and FinalMonitoringPriority = evaluable BasePriority. RSS/AI/active adjustment remain reserved future branches, disabled pending their separate contracts; they are not required for manual review/events.

Only eligible event revisions may ever influence public output; approval does not imply scientific verification or public publication. Phase 1 public priority uses eligible base inputs only, including its freshness/counts/explanation, regardless of shadow candidates. Authorized internal review/correlation can examine non-public records under their own rights/permission/privacy boundary, but cannot promote them through a public DTO. Duplicated external copies of citizen reports are linked, not counted again. Withdrawal/unpublication invalidates public eligibility immediately, never after a cache timer expires.

Manual intake validates public HTTP(S) URLs, redirects and any metadata-resolution DNS against private/loopback/link-local/metadata destinations, enforces host/size/time limits and prevents credentialed fetches. Phase 1 retains metadata/link/permitted hashes only; no images/videos/article copies/thumbnails/restricted hotlinks or Facebook/X/private-group scraping. Source content is untrusted data, never agent instructions. Geography conflict fails closed; no invented GPS. Allegations remain attributed claims. No automatic publication or platform/API automation. Mere receipt of a URL is not evidence of an upstream request or source verification.

```text
MONITORING MAP PIPELINE
Existing valid base measurements + publication-valid citizen reports ──────────┐
MANUAL_URL/LINK_ONLY metadata → trusted Human Review                         |
  → approved evidence → deduplicated/versioned Monitoring Events ─────────────┤
Read-only EnvironmentalContextSnapshot ───────────────────────────────────────┘
  → deterministic event correlation
  → anti-double-count / independence / current-publication / policy gate
  → frozen BasePriority + private shadow candidate snapshot
  → public adjustment 0 / reproducible FinalMonitoringPriority = BasePriority
  → canonical Monitoring API
  → Monitoring Map explanation, layers, timestamps and unavailable states

ONLY ALLOWED CROSS-DOMAIN BRIDGE
Flood/Hydrology → read-only EnvironmentalContext → Monitoring correlation
```

Current available signal implementations are water level, rainfall, reference proximity, and citizen observations. Their per-field freshness/eligibility still requires the approved truth guards. There is **no canonical implemented water-quality observation/laboratory model**. A claim that an API route is an “official update” is not a validated laboratory artifact. Future PCD/lab records require actual issuer/sample/time/method/unit/artifact validation and dedicated schema before measured/confirmed status; until then laboratory confirmation is UNAVAILABLE.

## 22. Reproducibility

Every priority snapshot retains: base model/version, eligible core input IDs and content hashes, base component/lineage references, boundary/cell version, EnvironmentalContext snapshot ID, evidence policy version/hash, Monitoring Event revisions and independence groups, computation version, computed_at and valid_until.

Expose separately `base_priority`, `evidence_adjustment`, `final_monitoring_priority`, `status`, and safe explanation. **Phase 1 public contract: adjustment = 0; final = evaluable base**. Private `shadow_candidate_adjustment`/signal components carry mode, calibration proposal version/hash and exclusions; never expose them via public priority DTO/view or heatmap. No proposal means no invented candidate value. Later active-mode equation is clamp(base + separately approved/activated adjustment, 0, 1), with deterministic rounding; its numerical policy is deferred. Missing base is null/NOT_EVALUABLE, not base 0. A draft proposal, event publication or feature flag alone cannot authorize live adjustment.

Store event_signal_component rows identifying included/excluded lineage and reasons. Replay from frozen inputs must reproduce results. Source revisions, re-review, policy updates and takedowns invalidate current eligibility but do not silently rewrite historical audit snapshots. Public reads must re-check current publication visibility, not trust a historical snapshot's publication flag.

## 23. Health/failure semantics

Do not confuse inventory state with runtime health.

Runtime health: AVAILABLE, DEGRADED, STALE, UNAVAILABLE, UNCONFIGURED, ACCESS_REQUIRED. Outcome reason: SUCCESS, ZERO_RECORDS, FETCH_FAILED, AUTH_FAILED, SCHEMA_INVALID, INVALID_TIMESTAMP, INVALID_GEOGRAPHY, FEATURE_DISABLED, CONTRACT_UNVERIFIED, STORAGE_FAILED.

AVAILABLE requires a successful, schema-valid, current source response. ZERO_RECORDS means a valid authoritative query found no matching records; it is not fetch failure or proof of a province-wide flood-free condition. SCHEMA_INVALID/malformed runtime evidence is an actual verification failure, never expected unavailable. Missing required credential is ACCESS_REQUIRED; missing endpoint/feature configuration is UNCONFIGURED. Historical valid layers may remain visible as STALE, never CURRENT.

A typed fetch result carries request_started/finished, actual HTTP status, schema outcome, records, coverage/window, source timestamp and error reason. Scheduler must not synthesize HTTP 200/success after an adapter catches an exception. Last attempt and last success remain distinct. Public APIs return valid envelopes with unavailable/unknown fields; internal diagnostics retain sanitized detail.

Preserve the verifier exit contract for future v2 tooling: 0 valid/no expected limitations; 1 expected limitations only; 2 actual contract/reconciliation/current-evidence failure. Failure precedence: BLOCKED plus PARTIAL → 2. Do not run the current `verify_all_sources.py` as a read-only audit: it invokes ingestion and writes the database.

## 24. API namespace

| Boundary | Planned routes / behavior |
| --- | --- |
| Flood public | GET `/api/public/flood/observed`, `/forecast`, `/risk`, `/source-health` |
| Telemetry public | GET `/api/public/telemetry/stations`, `/api/public/telemetry/latest`; source/variable/time filters and pagination |
| Monitoring public | Existing GET `/api/public/map/monitoring-priority`; additive safe fields/controlled wrapper |
| Evidence public | GET `/api/public/evidence-events`, `/api/public/evidence-events/{id}`; publication-valid generalized events only; non-enumerating 404 for private/missing |
| Evidence internal | `/api/internal/external-evidence`, `/{id}`, `/{id}/review`; staff authentication and separate read/intake/review permissions |
| Events internal | `/api/internal/monitoring-events`, `/{id}/review`; authenticated permission-controlled mutations |
| Source operations internal | Read-only source diagnostics and protected scheduler trigger; no public ingestion mutation |

Public DTOs are allowlists: provider/product/category/time/unit/geometry precision/health and safe explanation only. Exclude facility/company identity, facility IDs/exact coordinates, suspected-source attribution, analytical facility relationships, PII, private GPS, EXIF, moderation notes, credentials and filesystem paths. Legacy factory/risk/media exposure must not become a substitute v2 public surface.

New review endpoints: missing/invalid credential 401; authenticated insufficient permission 403; caller identity/role headers or query credentials 400; private/missing public resources 404. Principal comes from the approved server-side mapping, never a submitted reviewer name. Request audit stores that principal and immutable decision revision.

## 25. Backward compatibility

| Existing consumer/path | Action | Contract |
| --- | --- | --- |
| `/map` | REDIRECT | `/map/monitoring`, preserving recognized district/query state |
| MapPage flood loader | WRAP | New flood loader; independent failure from Monitoring |
| `/api/public/flood-extent` | WRAP | Shape-compatible FeatureCollection from verified product, or explicit unavailable; never retain fabricated current polygons/depth/official timestamp |
| `/api/v1/public/flood-extent` | WRAP | Same handler semantics, not a bypass |
| `/api/public/map/monitoring-priority` and v1 alias | KEEP/WRAP | Fully valid legacy base behavior preserved; additional components only under approved flag/policy; mandatory publication/truth guards apply |
| Public stations/rain/history | KEEP | Existing shapes and consumers; add provenance/health compatibly rather than deleting fields |
| ForecastPage `/flood-extent` and `/forecast-zones` | WRAP | Preserve route; observed/forecast distinction and truthful unavailable states; no current-map dependency on fabricated forecast geometry |
| Overview, My Area, Cases, OfficialUpdates, HomeMapPreview | KEEP | Required safe functionality preserved; no fabricated availability/official claims |
| Legacy internal facility/admin capabilities | KEEP | Legitimate authenticated operations preserved; no public restricted identity |
| Old provider URLs/absent reference paths | DEPRECATE | Documentation correction, not a guessed replacement or breaking API deletion |

Explicit current-to-target mapping: `/api/public/flood-extent` becomes a **COMPATIBILITY WRAPPER** for `/api/public/flood/observed` only, preserving GeoJSON envelope/compatible fields. It never combines forecast/risk into observed results. `/api/public/forecast-zones` wraps `/api/public/flood/forecast` only when an actual compatible verified forecast product exists, otherwise an explicit unavailable envelope. `/api/public/flood/risk` is a new distinct product; no current route is assumed to implement it. `/api/public/stations` and rainfall/history routes KEEP existing shapes and share validated storage with new `/api/public/telemetry/stations` and `/latest`. No endpoint is deleted; later deprecation requires separately approved consumer evidence. `/api/public/map/monitoring-priority` remains the canonical Monitoring endpoint, including consistent v1 alias behavior; no new alternative Monitoring scoring endpoint is proposed.

Compatibility means preserving valid features and endpoint shapes, not preserving privacy leaks or unsupported official claims. The owner has approved narrowly scoped legacy truth/publication/auth/private-output containment in MON-000; this does not authorize unrelated redesign or valid-weight recalibration. No unrelated branding/auth platform refactor is authorized.

## 26. Frontend map separation

Target `/map/monitoring` and `/map/flood`; `/map` redirects to Monitoring. Shared: BaseMapShell, existing basemap controls, verified/qualified boundary, search and basic controls. Separate: API loaders, request cancellation, layers, selection/popups, legends, timestamps and domain state. Switching maps must not retain another domain's selected feature or silently fetch/mutate the other domain.

Preserve MapLibre camera behavior, district/tambon search, mobile search down to 320 px, fullscreen/zoom/reset controls and keyboard accessibility. Keep existing Forecast and public page routes. Provider keys never enter browser bundle/tile URLs; authorized server proxy/cached assets only where terms allow. Do not invent screenshot polygons when the provider only offers raster data.

## 27. Feature flags

All new subsystem flags default false:

`ENABLE_REAL_FLOOD_DATA`, `ENABLE_GISTDA_DISASTER`, `ENABLE_GISTDA_FLOODCHECK`, `ENABLE_DWR_TELEMETRY`, `ENABLE_EXTERNAL_EVIDENCE`, `ENABLE_EXTERNAL_EVIDENCE_AI`, `ENABLE_EXTERNAL_EVIDENCE_PUBLIC`, `ENABLE_EXTERNAL_EVIDENCE_PRIORITY`.

Provider flags require master flood flag plus approved contract/access/schema. AI/public/priority flags require evidence master plus their own gates. Phase 1 may enable manual Evidence/review and fail-closed public event summaries after their acceptance gates, but keeps AI, RSS/platform automation and `ENABLE_EXTERNAL_EVIDENCE_PRIORITY` disabled. Shadow calculation is internal under Evidence permission and does not require enabling the public-priority flag. A mistaken priority flag cannot activate draft/unapproved policy: public adjustment stays 0, with explicit inactive-policy reason. Live activation requires the accountable owner/admin's separately approved policy version, explicit activation and lineage/review gates. Flags never bypass privacy/auth/rights validation; approved narrow truth/security corrections remain mandatory even with flags off. No startup auto-migration or default-on source.

## 28. Scheduler/polling

Provider update cadence and application polling policy are different. Registry frequencies are unverified. Where unknown, record **UPDATE CADENCE REQUIRES VERIFICATION**; do not invent “hourly live” status.

| Source | Current / proposed ownership | Cadence, polling, cache and freshness contract |
| --- | --- | --- |
| ThaiWater S01/S02 | Existing scheduler, one writer per source | Keep 900-second operational polling initially; actual provider cadence/rate limit unverified. Existing registry freshness 3 hours is local policy, not provider SLA; source contract must confirm/review it |
| DWR regional/central | Flood scheduler; per-source distributed/DB lock | No production polling until cadence/rate limits verified. Contract task fixes interval/stale policy before activation; station metadata separately cached/versioned |
| GISTDA Disaster | Flood scheduler; conditional asset/catalog fetch | Product acquisition/window drives freshness. 1/3/7/30-day windows are product coverage windows, not polling promises. Conditional requests and product IDs prevent repeated ingest |
| FloodCheck products | Flood scheduler per independent product | Forecast issue/valid window, risk update and road sensor cadence verified separately; no shared assumed timer |
| RID | Explicit Flood job only if enabled/usable | Replace public GET-triggered ingestion with controlled job/read-only view as an approved compatibility correction; cadence verified before scheduled activation |
| Open-Meteo | Weather-specific on-demand cache or Flood job | Keep 300-second request cache as operational policy; do not equate cache age/generation milliseconds with model issue time; provider usage limits/terms verified |
| DIW/DWR reference/boundary/centroids | Explicit versioned local imports only | No network polling; no fake `2026-01-01` observation date. Data/version date nullable |
| PCD/TMD/DEM/DGR/LDD/DOPA/MOPH/Copernicus | Deferred | No jobs until a separate approved source contract/task |
| Manual URLs | Phase 1 staff-triggered metadata/link intake only | No repeated scraping, publisher-body/media archive or automatic external-media requests; permitted metadata/hash processing under rights/size/time limits |
| Approved RSS | Deferred; no Phase 1 job | Separate source-specific contract/approval needed before feed-specific cadence/conditional fetch; configured URL alone does not activate |
| AI | Evidence worker, not Flood scheduler | Explicit queued approved jobs; optional, finite cost/rate limits; failure leaves review/manual flow operational |
| Basemaps/fonts/icons | Browser presentation only | Respect terms/cache headers; never environmental source freshness |

Source tasks must freeze numerical interval/stale thresholds in their approved source contract before execution/activation. Operational defaults for a new HTTP adapter may be 10-second total timeout and at most 3 retry attempts with 1/2/4-second jittered backoff; these are proposed client settings, not provider cadence. Honor Retry-After, avoid retries on auth/schema errors, use circuit breakers and concurrency locks, and cap response/asset sizes. No startup-plus-scheduler duplicate ingestion ownership in v2.

## 29. Secrets/access

Presence check found all current provider credential names MISSING in the planner's shell; no real `.env` file was found in this checkout. This does not attest to the separate running process/deployment secret store. Do not print secret values or copy an embedded third-party key.

| Future adapter / exact variables | Credential classification / gate |
| --- | --- |
| ThaiWater `THAIWATER_API_URL`, `THAIWATER_RAIN_API_URL`, optional `THAIWATER_API_KEY` | NOT_REQUIRED for verified permitted public endpoint; optional key MISSING in planner shell. Access terms still require verification |
| DWR regional `DWR_BANGPAKONG_API_URL`, `DWR_BANGPAKONG_API_KEY` | ACCESS_REQUEST_REQUIRED until official endpoint/auth contract; key required only if contract says so |
| DWR central `DWR_CENTRAL_API_BASE_URL`, `DWR_CENTRAL_API_KEY` | ACCESS_REQUEST_REQUIRED; project key/rights verification before activation |
| GISTDA `GISTDA_DISASTER_API_BASE_URL`, `GISTDA_DISASTER_API_KEY` | ACCESS_REQUEST_REQUIRED. Existing `GISTDA_API_KEY` MISSING; explicit compatibility mapping only after contract approval |
| FloodCheck `GISTDA_FLOODCHECK_API_BASE_URL`, `GISTDA_FLOODCHECK_API_KEY` | ACCESS_REQUEST_REQUIRED; provider/service itself still unverified, variables are proposed not existing |
| RID `RID_RESERVOIR_API_URL`, `RID_PRIVATE_TOKEN` | Token MISSING; NOT_REQUIRED only if verified public terms/endpoint permit intended use. Do not claim it is sent when it is not |
| Open-Meteo `OPEN_METEO_API_URL`, optional `OPEN_METEO_API_KEY` if approved paid service | NOT_REQUIRED for applicable permitted free endpoint; paid/non-free service contract separate. Stop using unrelated `TMD_API_KEY` |
| PCD `PCD_LAB_MOU`, `PCD_INSPECTION_MOU` | ACCESS_REQUEST_REQUIRED; an MOU flag is not necessarily an API credential. Exact API auth belongs to future approved contract |
| Deferred candidates `TMD_API_KEY`, `DIW_AUTHORIZED_CREDENTIAL`, `DIW_FACTORY_API_KEY`, `DEM_AUTHORIZED_ACCESS`, `DGR_CREDENTIAL`, `MOPH_API_KEY`, `LDD_GIS_TOKEN` | MISSING in planner context; no automatic source activation |
| Evidence `EXTERNAL_EVIDENCE_ALLOWED_HOSTS`, reserved `EXTERNAL_EVIDENCE_RSS_URLS`, `PRIVATE_EVIDENCE_MEDIA_ROOT` | Phase 1 MANUAL_URL/LINK_ONLY metadata needs no external-media root or RSS credential. Publisher metadata/link rights still validated; reserved RSS/root config cannot enable collection/storage without a later source-specific approved contract |
| Optional AI `EXTERNAL_EVIDENCE_AI_PROVIDER`, `EXTERNAL_EVIDENCE_AI_MODEL`, `EXTERNAL_EVIDENCE_AI_API_KEY` | MISSING; remain disabled until provider, privacy terms and budget approved |
| Trusted reviewer | Owner-approved module-scoped individual opaque credentials; secure server-side digest, active StaffUser/server permissions, expiry/revocation/audit. No shared admin-key reviewer identity, `X-Staff-User`/`X-Staff-Role` or query credential trust |

Retain current `ENVIRONMENT`, `DATA_ENV`, `REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION`, `ALLOW_OFFICIAL_PUBLIC_PRODUCTION`, `ENABLE_SCHEDULER`, database/pool settings, timeouts, server secret/admin key and CORS behavior unless a task explicitly authorizes a correction. All four Compose variants need intentional variable forwarding when their owning task enables a source; settings declarations alone are ineffective deployment evidence.

## 30. Observability

Per source/product track last_attempt, last_success, upstream/source timestamp, source window, retrieved_at, actual HTTP status, record count and accepted/rejected/duplicate counts, schema validation, latency, freshness/reason, scheduler enabled/running/next run, and source contract version. Sync-run evidence contains response/payload hash and provenance under permitted retention.

Public health exposes safe aggregate status/time/reason, not secrets, raw exception content, internal URLs/tokens or exact restricted geometry. Staff diagnostics expose sanitized detail under permission. Actual failed/latest run takes precedence over stale persisted success. No hardcoded active list, counts, timestamps, license verification or frontend-verification booleans.

Evidence metrics separately track fetch/AI failures, review backlog, eligible event revisions, dedup groups, correlation exclusions, policy version and public withdrawal invalidation. Trace IDs connect source run → normalized record → context → priority snapshot without publishing private linkage.

## 31. Code ownership

New directories are proposed exact ownership boundaries, not existing integrations:

| Set | Allowed files/subsystems |
| --- | --- |
| DB-MIGRATE | `scripts/migrate_ruwaigon_v2.py`; `apps/api/tests/test_v2_migrations.py`; migration journal/bootstrap DDL included in the first approved migration; shared serialized runner, never startup DDL |
| F-CONTRACT | `apps/api/app/services/flood/contracts.py`, `source_registry.py`, `models.py`, `scheduler.py`; `apps/api/app/core/config.py`; `apps/api/migrations/v2/001_source_contracts.sql`; `apps/api/tests/test_v2_source_contracts.py` |
| F-DWR | `apps/api/app/adapters/dwr_bangpakong.py`, `dwr_central.py`; `services/flood/dwr.py`; `apps/api/tests/test_v2_dwr_sources.py` |
| F-GISTDA | `apps/api/app/adapters/gistda_disaster.py`; `services/flood/gistda.py`; `apps/api/tests/test_v2_gistda_disaster.py` |
| F-FLOODCHECK | `apps/api/app/adapters/gistda_floodcheck.py`; `services/flood/floodcheck.py`; `apps/api/tests/test_v2_floodcheck.py` |
| F-STORAGE | `services/flood/normalize.py`, `repository.py`, `models.py`; `apps/api/migrations/v2/002_flood_observations.sql`; `apps/api/tests/test_v2_flood_storage.py` |
| F-TRUTH | Existing `adapters/thaiwater.py`, `rid.py`, `openmeteo.py`; `core/source_access.py`, `scheduler.py`, `provenance.py`; `main.py` source health/startup portions; `api/v1/telemetry.py`, `forecast.py`; `services/flood/health.py`; `scripts/verify_v2_sources.py`; source-truth tests; only approved source/auth/read-only compatibility changes |
| F-API | `api/public/flood.py`, `telemetry_v2.py`; relevant legacy handler wrappers in `api/public/router.py`; router registration in `main.py`; `apps/api/migrations/v2/007_public_flood_views.sql`; `apps/api/tests/test_v2_flood_public_api.py` |
| M-AUTH | New `core/reviewer_identity.py` using separate v2 metadata; `core/staff_rbac.py`/`security.py` helper reuse only; `scripts/manage_reviewer_credentials.py` trusted operator issue/revoke/rotate tooling; `apps/api/migrations/v2/000_reviewer_identity.sql`; reviewer-specific internal dependencies and `apps/api/tests/test_v2_reviewer_auth.py`; existing admin/frontend auth consumers only where demonstrably necessary, not a global auth rewrite |
| M-BOUNDARY | New `core/publication_boundary.py`; existing public/legacy report/risk/cluster/priority consumers and route protection only as approved in MON-000; `services/spatial_monitoring_service.py` input guards/freshness only; `apps/api/tests/test_v2_publication_boundary.py`, `test_v2_base_input_truth.py` |
| M-SCHEMA | `services/evidence/models.py`, `schemas.py`; `apps/api/migrations/v2/003_external_evidence.sql`; `apps/api/tests/test_v2_evidence_schema.py` |
| M-INTAKE | `services/evidence/intake.py`, `collector.py`; `api/internal/external_evidence.py`; `apps/api/tests/test_v2_evidence_intake.py` |
| M-REVIEW | `services/evidence/review.py`; internal evidence review handler; `apps/api/tests/test_v2_evidence_review.py` |
| M-AI | `services/evidence/analysis.py`, approved `adapters/evidence_ai.py`; `apps/api/tests/test_v2_evidence_ai.py` |
| M-DEDUP | `services/evidence/dedup.py`; `apps/api/tests/test_v2_evidence_dedup.py` |
| M-EVENT | `services/evidence/events.py`, `confirmations.py`; Event/review-target additions to `services/evidence/models.py`; publication model module `services/evidence/publication.py`; `apps/api/migrations/v2/005_monitoring_events.sql`; `api/internal/monitoring_events.py`; `apps/api/tests/test_v2_monitoring_events.py` |
| M-SCORE | `services/monitoring/correlation.py`, `policy.py`, `priority.py`; scoring portions of `services/monitoring/models.py`; `apps/api/migrations/v2/006_priority_snapshots.sql` serialized with I-CONTEXT; existing priority handler delegation only; `apps/api/tests/test_v2_correlation.py`, `test_v2_evidence_adjustment.py` |
| M-PUBLIC | `api/public/evidence_events.py`; safe schemas; `apps/api/migrations/v2/008_public_monitoring_views.sql`; `apps/api/tests/test_v2_evidence_public_api.py` |
| I-CONTEXT | `services/monitoring/context.py`, `models.py`, `snapshots.py`, `lineage.py`; `apps/api/migrations/v2/004_environmental_context.sql`; snapshot portions of `006_priority_snapshots.sql` serialized with M-SCORE; `apps/api/tests/test_v2_context.py`, `test_v2_lineage.py`, `test_v2_replay.py` |
| UI-SHARED | `apps/web/src/components/map/shared/BaseMapShell.tsx`, `MapSearch.tsx`; extraction from current MapLibre controls/boundary only; `apps/web/src/App.tsx` route wiring |
| UI-FLOOD | `apps/web/src/features/flood/FloodMapPage.tsx`, `api.ts`, `types.ts`, `layers.ts`, `FloodLegend.tsx`, `FloodPopup.tsx`; approved MapPage/ForecastPage compatibility calls only |
| UI-MON | `apps/web/src/features/monitoring/MonitoringMapPage.tsx`, `api.ts`, `types.ts`, `layers.ts`, `MonitoringLegend.tsx`, `MonitoringPopup.tsx`; staff evidence inbox under `features/evidence/`; priority display only |
| DEPLOY | The four actual variants: `docker-compose.yml`, `docker-compose.prod.ssl.yml`, `deploy/production/docker-compose.prod.yml`, `deploy/production/docker-compose.prod.ssl.yml`; both `.env.production.example` files; API/web nginx/Dockerfiles only approved env forwarding/private mount/proxy behavior |
| DOCS | Source task records plus `docs/DATA_SOURCES.md`, `DATA_PROVENANCE.md`, `METHODOLOGY.md`, `SYSTEM_HEALTH.md`, `MAP_VISUALIZATION.md`, `SECURITY.md`, `PRIVACY_AND_LEGAL.md`, README and public methodology source claims only as affected |

All abbreviated backend paths in this table start at `apps/api/app/`. Each task may edit only its listed sets, narrowed to its approved manifest. Every task forbids all other sets, unrelated docs/UI, real secret files, core table deletion/data promotion, unrelated user edits and other task-role artifacts. Planner owns plan only; Implementer implementation record only; Reviewer review record only. Shared files/config/deploy are serialized integration points, not parallel editing permission.

## 32. FLOOD task list

Each implementation task follows: [ ] write focused failing contract tests; [ ] implement only approved files; [ ] run focused tests; [ ] record real runtime evidence if activating; [ ] hand off for independent review. No commit without explicit user authorization.

| Task | Deliverable / allowed sets | Dependencies / acceptance |
| --- | --- | --- |
| FLOOD-001 Complete API/source audit | This planning inventory; future audit record only | Completed for current checkout. Refresh only changed source/locked-runtime evidence, not another broad discovery pass |
| FLOOD-002 Source contracts | F-CONTRACT + DB-MIGRATE + DOCS | Locked baseline; typed fetch/status/lineage, per-source contracts, separate v2 metadata and DB-001; reuse reviewed runner or establish it if not already present; no startup DDL |
| FLOOD-003 DWR integrations | F-DWR + source-specific config/deploy forwarding | FLOOD-002/006 + verified regional/central contracts; implement S09/S10/S11 only where real usable/unique; schema, units/datum/time, duplicate and coverage tests; source gates remain closed until live proof |
| FLOOD-004 GISTDA Disaster | F-GISTDA + source-specific config/deploy forwarding | FLOOD-002/006 + authorized S15/S15a contract; observed/interpreted assets, CRS/time/window/nodata/coverage tests; no manufactured polygons/depth |
| FLOOD-005 FloodCheck | F-FLOODCHECK + source-specific config/deploy forwarding | FLOOD-002/006 + each product's verified contract; separate forecast/risk/road-level tests; no Open-Meteo-as-FloodCheck fallback |
| FLOOD-006 Normalize/store | F-STORAGE + DB-MIGRATE | FLOOD-002; DB-002, timestamp/geometry/unit validation, idempotency, atomic reconciliation and isolated rollback; core history stays canonical, no copied ThaiWater measurements |
| FLOOD-007 Source truth/health | F-TRUTH + affected DOCS/DEPLOY | FLOOD-002/006; correct existing ThaiWater errors/scheduler health and persist real core/run lineage; own RID/Open-Meteo identity/weather-only storage; no upstream writes from public GET; hardcoded health replaced by evidence. Narrow compatibility scope is now owner-approved |
| FLOOD-008 Public APIs/wrappers | F-API + DB-MIGRATE + DEPLOY grants only | FLOOD-006/007 + usable source adapters; DB-007, safe classification/status/time/DTOs, aliases consistent, old false-current geometry removed, no public ingestion; no Evidence-schema prerequisite |
| FLOOD-009 Flood Map | UI-SHARED + UI-FLOOD + map-specific styles | FLOOD-008; independent loader/layers/state, timestamp/status/legend, Prachinburi clipping and preserved controls/routes |
| FLOOD-010 QA | Flood tests, read-only verifier, task evidence and affected docs only | FLOOD-009; real request+source time+provenance, unavailable/schema/auth tests, frontend build/browser/responsive evidence |

FLOOD-003/004/005 can be reviewed disabled before global activation, but cannot be called complete active integrations while access/contracts/runtime data remain unverified. Additional source adapter files require approved task manifests, not opportunistic edits.

## 33. MONITORING task list

The Phase 1 Monitoring track is owner-approved under section 16 and its technical dependencies. MANUAL_URL/LINK_ONLY and public zero-adjustment shadow mode are the approved initial policy. Deferred tasks require their own explicit approval; they are not Phase 1 blockers.

| Task | Deliverable / allowed sets | Dependencies / acceptance |
| --- | --- | --- |
| MON-000 Prerequisites/auth/policy | M-AUTH + DB-MIGRATE + M-BOUNDARY + affected DOCS/DEPLOY; 000A identity, 000B narrow compatibility truth, 000C initial policy enforcement | Owner decisions recorded; implement trusted individual principal/DB-000, query/spoof rejection and public allowlist/latest-state validity. Enforce MANUAL_URL/LINK_ONLY, public adjustment 0, accountable owner/admin, fail-closed publication and operational retention; 000C implements approved rules, not an unresolved numeric gate. Preserve valid base weights |
| MON-001 Evidence schema | M-SCHEMA + DB-MIGRATE | MON-000; DB-003, private default, separate review/verification/publication, authorized storage, no promotion; event FKs deferred to DB-005 rather than invented missing tables |
| MON-002 Manual URL intake | M-INTAKE + source config | MON-001; Phase 1 MANUAL_URL/LINK_ONLY metadata/URL/permitted hash, SSRF/redirect/size/host/rights limits, attributed summaries, GPS redaction/conflicting-geography rejection; no external bytes/article archive or auto publication. RSS/platform collection disabled and deferred |
| MON-003 Human Review | M-REVIEW + staff-only evidence inbox | MON-000/002; trusted permission, audit principal, concurrency/revision guard, approval distinct from verification/publication, withdrawal invalidation |
| MON-004 Optional AI — deferred | M-AI | MON-002 + separate provider/rights/privacy/budget approval; disabled in Phase 1. Suggestions only; prompt injection treated as data, no auto geometry/review action; manual workflow independent |
| MON-005 Dedup/independence | M-DEDUP | MON-001/002; canonical URL/hash/reposts/provider lineage and citizen origin linking; multiple copies never multiple independent signals |
| MON-006 Monitoring Events | M-EVENT + DB-MIGRATE | MON-003/005 + INT-001; DB-005, human-reviewed event revisions/typed links and publication heads, actual official/lab confirmations separate; no causation-style claims |
| MON-007 Deterministic correlation | M-SCORE correlation only | MON-006 + INT-001/002; time/geography/phenomenon consistency, no unsupported directed hydrology, no flood-only increase |
| MON-008 Shadow adjustment | M-SCORE + I-CONTEXT snapshot hooks | MON-007 + INT-003/004; private candidates/calibration proposals, mode/hash/exclusions recorded; public adjustment 0/final = evaluable base, no candidate leakage; null candidate when no proposal; negative/dedup tests |
| MON-009 Active bounded adjustment — deferred | M-SCORE + priority handler delegation | MON-008 + separately approved frozen Evidence Policy version and explicit owner/admin activation; not authorized for initial production/public rollout. Caps/decay/precision/independence/current-publication enforced, no duplicate base input |
| MON-010 Public Evidence API | M-PUBLIC + DB-MIGRATE + DEPLOY grants only | MON-003/006 + INT-004; DB-008; separate public publication decision and sanitized generalized DTOs; private/missing 404; current revision/rights/epoch enforced; no restricted identities/media/EXIF |
| MON-011 Monitoring Map | UI-MON + shared shell wiring | Phase 1 MON-008/010, not deferred MON-009; display base/public adjustment 0/final = base, no private candidate; COMMUNITY/OFFICIAL/MODEL separation, truthful unavailable states, primary navigation. Future live adjustment has a separate policy gate |
| MON-012 QA | Monitoring tests, read-only verification, task evidence/docs only | MON-011; negative auth/privacy, all flags off, withdrawals/replay, shadow-to-public invariance, candidate/media non-exposure, RSS/AI/priority disabled, browser/build/responsive tests; no production live activation |

Initial public adjustment is fixed at 0 by owner approval. Numerical weights/caps/decay/precision proposals may be versioned internally as CALIBRATION PROPOSALS, not scientific facts or production defaults. MON-009 remains deferred until RUWAIGON PROJECT OWNER / AUTHORIZED ADMIN approves a specific Evidence Policy version and explicitly activates it; no other Phase 1 task waits for that decision.

## 34. INTEGRATION task list

| Task | Deliverable / allowed sets | Dependencies / acceptance |
| --- | --- | --- |
| INT-001 EnvironmentalContext | I-CONTEXT contract/models + DB-MIGRATE | FLOOD-002/006; DB-004, field-level VALUE/UNKNOWN/UNAVAILABLE/STALE, immutable scope/units/time/lineage; no Evidence-schema dependency or startup DDL |
| INT-002 Read-only context producer | I-CONTEXT context producer + Flood repository read interface | INT-001 + FLOOD-007/008; existing core and normalized facts only, no fetch/write triggered by reads, source-specific status and valid windows |
| INT-003 Double-count guard | I-CONTEXT lineage + M-SCORE guard | MON-005/006 + INT-001; same base observation/report/sample/repost cannot produce additional numeric signal; flood-only weight 0 |
| INT-004 Reproducibility | I-CONTEXT snapshots/models + M-SCORE integration + DB-MIGRATE | INT-001/003 + MON-007; DB-006, full input/model/policy/event/boundary hashes; per-cell numeric-origin uniqueness and cross-cell valid reuse; deterministic replay and withdrawal-aware public reads |
| INT-005 Cross-domain QA | Integration tests and task evidence; DEPLOY only approved flags/private mount | FLOOD-010 + MON-012; one-way imports, failure matrix, flags/deployment readiness, core compatibility, no new public leakage |

## 35. API activation task list

Current call paths: S01/S02 ThaiWater, S04 RID and S06 Open-Meteo; local DIW is not an API. ACTIVE_RUNTIME proof remains outstanding. Implemented but uncalled network adapters: none. Configured-unused: S07/S15/S21 and Open-Meteo override. Documented-absent: section 6. Reproduced live BROKEN APIs: none; definite truth/access-policy defects: FLOOD-007. Access prerequisites: GISTDA gateway, DWR central/regional verification, all FloodCheck products, optional PCD.

Branches listed below all originate at `LOCKED_BASELINE_SHA = c794a03841a8aa853887d61dfda3d3cbfa2c2ee2` in clean branches/worktrees, excluding the current label edits. An adapter can land disabled once its actual contract is known; production activation additionally requires its consumer, migration and live gate. Unverified source-specific contracts cannot block unrelated approved tasks.

| APIs to activate/fix | Task / branch | Adapter / DB destination | Scheduler / consumers | Tests / activation gate |
| --- | --- | --- | --- | --- |
| ThaiWater S01/S02 | FLOOD-007 / `codex/v2-source-truth` | Existing `thaiwater.py`; core Water/Rain observations + flood sync ledger | Existing single-owner scheduler; legacy stations/history/base and v2 telemetry/context | `test_v2_source_truth.py`, existing refresh/time tests; current real request/data/time, malformed/empty/failure distinction, no DB-only VERIFIED |
| RID S04 | FLOOD-007 / same source-truth branch | Existing `rid.py`; Reservoir + source-specific lineage | Explicit controlled job if usable; read-only reservoir/context | `test_v2_rid_contract.py`; own source ID, actual auth/units/current telemetry; missing data stays null; optional activation only |
| Open-Meteo S06 | FLOOD-007 / same source-truth branch | Existing `openmeteo.py`; distinct weather MODEL context/cache | Weather-only caller/cache; existing forecast consumer | `test_v2_openmeteo_contract.py`; effective URL, truthful model/issue-time status, no TMD identity/test-mode production bypass |
| DWR regional S09 | FLOOD-003 / `codex/v2-dwr-telemetry` | `dwr_bangpakong.py`; flood.telemetry_station/observation | Flood job; v2 telemetry/latest/context | `test_v2_dwr_sources.py`; official URL/schema/permission, real local coverage/units/datum/time, no duplicates |
| DWR central S10/S11 | FLOOD-003 / same DWR branch | `dwr_central.py`; same source-specific telemetry tables | Separate metadata/observation jobs; telemetry APIs/context | Same tests; authenticated real request, StationInfo↔Runoff join integrity, source-specific timestamps/variables; no duplicate regional observations |
| GISTDA Disaster S15/S15a | FLOOD-004 / `codex/v2-gistda-disaster` | `gistda_disaster.py`; flood_extent_observation + permitted asset refs | Flood catalog/asset job; observed endpoint/Flood Map/context | `test_v2_gistda_disaster.py`; project access/rights, real product/CRS/window/provenance; no synthetic geometry/depth |
| Optional GISTDA tile transport S15b | FLOOD-004 only if needed / same branch | Same adapter/proxy; same product/asset identity, no second observation | Cached authenticated server delivery; Flood renderer only | Capabilities/CRS/time/axis/tile scheme/security tests; rights and server-side credential gate; choose one necessary transport |
| FloodCheck S17/S18/S19 | FLOOD-005 / `codex/v2-floodcheck` | `gistda_floodcheck.py`; forecast_layer/risk_observation/telemetry_observation | Product-specific Flood jobs; forecast/risk/road-point APIs/Map | `test_v2_floodcheck.py`; authoritative service/auth, actual Prachinburi coverage and each product's schema/issue/valid time; unavailable products not faked |
| Manual URLs S37 | MON-002 / `codex/v2-evidence-intake` | `services/evidence/collector.py`; metadata/link/permitted hash only | Phase 1 staff-triggered MANUAL_URL; no RSS/platform polling/external-media bytes; trusted review only | `test_v2_evidence_intake.py`; owner-approved LINK_ONLY, host/rights/SSRF/privacy/geography checks, real permitted metadata request proof only when a request occurred; no public numeric influence |
| RSS S37 — deferred | Future approved MON-002 extension, not Phase 1 | Reserved Evidence parser/schema; no active destination writes now | Disabled pending approved feed-specific contract | RSS URL alone cannot trigger a fetch, archive or publication; no Phase 1 completion dependency |
| Optional AI S39 | MON-004 / `codex/v2-evidence-ai` | Approved `adapters/evidence_ai.py`; external_evidence_analysis | Evidence worker; suggestions staff-only | `test_v2_evidence_ai.py`; approved vendor/data handling/budget; actual API proof, malformed response/failure, zero auto review/publication |

S12/S14/S22–S30/S38 are explicitly deferred, not forgotten: no demonstrated first-wave unique requirement or approved rights/contract. S03/S05/S16/S34 are removed from the activation plan as unsupported alternate URLs/absent artifacts; retain their audit history. PCD optional activation needs a separately approved measurement/confirmation adapter task, not accidental addition to MON-006.

### Absent-but-required API activation gates

Each row supplies the full implementation contract requested by the additional verification requirements. New interval/maximum-age settings have no invented production defaults: FLOOD-002 freezes them from the verified provider/product contract. Until the required numerical policy/validity window is configured, the job is disabled with UNCONFIGURED/CONTRACT_UNVERIFIED; an implementer must not pick a cadence by guesswork. Provider issue/valid times always take precedence over retrieval/cache time.

| Source / task / adapter | Feature flag / credential requirement | Normalized destination / scheduler owner / freshness rule | Failure state / focused test / real-runtime verification / downstream consumer |
| --- | --- | --- | --- |
| S09 regional DWR — FLOOD-003 — `adapters/dwr_bangpakong.py` | `ENABLE_REAL_FLOOD_DATA` + `ENABLE_DWR_TELEMETRY`; `DWR_BANGPAKONG_API_URL`, key only according to verified regional contract; rights approved | `flood.telemetry_station/telemetry_observation`; Flood scheduler; contract-required `DWR_BANGPAKONG_POLL_INTERVAL_SECONDS` and `DWR_BANGPAKONG_MAX_AGE_SECONDS`, evaluated against actual observation time | UNCONFIGURED before contract/URL, ACCESS_REQUIRED if required key absent, UNAVAILABLE/SCHEMA_INVALID on invalid data, STALE beyond approved age; `test_v2_dwr_sources.py`; real regional HTTP request, validated response, station/variable/unit/datum/source-time/run-ID and stored checksum; public telemetry/Flood Map/read-only context |
| S10 central StationInfo — FLOOD-003 — `adapters/dwr_central.py` | Same DWR flags; verified `DWR_CENTRAL_API_BASE_URL` + project `DWR_CENTRAL_API_KEY` | `flood.telemetry_station` with provider IDs/operator/canonical-equivalence mapping; Flood metadata job; `DWR_CENTRAL_STATION_CACHE_SECONDS` frozen by contract; absent provider revision time remains unknown, never fabricated measurement time | ACCESS_REQUIRED/malformed metadata rejected; `test_v2_dwr_sources.py`; authenticated real StationInfo response, metadata schema/coordinates/datum/provider IDs and consumed normalized row; telemetry metadata and station join |
| S11 central Runoff — FLOOD-003 — `adapters/dwr_central.py` | Same DWR flags and independently verified Runoff access scope | `flood.telemetry_observation`; Flood observation job; `DWR_CENTRAL_POLL_INTERVAL_SECONDS`, `DWR_CENTRAL_MAX_AGE_SECONDS` frozen by contract; actual variable/time/window, not StationInfo retrieval time | ACCESS_REQUIRED/UNAVAILABLE/STALE, invalid unit/time/schema fails closed; `test_v2_dwr_sources.py`; real request/data/time, StationInfo join and regional/ThaiWater-origin dedup reconciliation; telemetry/latest/Flood Map/context |
| S15/S15a Disaster — FLOOD-004 — `adapters/gistda_disaster.py` | `ENABLE_REAL_FLOOD_DATA` + `ENABLE_GISTDA_DISASTER`; `GISTDA_DISASTER_API_BASE_URL`, `GISTDA_DISASTER_API_KEY`, approved asset storage/redistribution | `flood.flood_extent_observation`, permitted asset hashes/refs, sync/health; Flood catalog/asset job; `GISTDA_DISASTER_POLL_INTERVAL_SECONDS` and `GISTDA_DISASTER_MAX_AGE_SECONDS` approved per product/acquisition window | ACCESS_REQUIRED/UNAVAILABLE/STALE; no forecast/reference substitution; `test_v2_gistda_disaster.py`; current permitted gateway request + actual asset/schema/CRS/coverage/window/source timestamp and stored hash; observed API/Flood layer/context |
| S15b optional Disaster tile transport — FLOOD-004 — same adapter/server proxy | Same Disaster flags/key; separately permitted tile/proxy usage | Same product ID/asset refs, no independent signal; Flood-owned cache; capabilities time dimension and permitted cache lifetime validated | Tile layer unavailable only, never synthesize a polygon; GISTDA capabilities/tile tests; real permitted response, axis/tile/time scheme and no client key leak; Flood renderer only |
| S17 FloodCheck forecast — FLOOD-005 — `adapters/gistda_floodcheck.py` | `ENABLE_REAL_FLOOD_DATA` + `ENABLE_GISTDA_FLOODCHECK`; verified `GISTDA_FLOODCHECK_API_BASE_URL`, key/access scope for forecast | `flood.flood_forecast_layer`; Flood forecast job; product-specific polling setting frozen by contract, issued_at and valid_from/to/horizon required; expired validity is STALE | CONTRACT_UNVERIFIED/ACCESS_REQUIRED/UNAVAILABLE/STALE; `test_v2_floodcheck.py`; actual provider request/forecast response/issue time/valid window/local coverage and stored lineage; forecast API/Flood forecast layer only |
| S18 FloodCheck risk — FLOOD-005 — same adapter, separate product parser | Same flags; risk-product access independently verified | `flood.flood_risk_observation`; Flood risk job; product update/validity policy frozen separately, no inherited forecast cadence | Own risk layer unavailable/stale, never observed extent; `test_v2_floodcheck.py`; real risk-product response/time/version/coverage/classification and stored lineage; risk API/Flood risk layer, display-only context |
| S19 FloodCheck road levels — FLOOD-005 — same adapter, separate point parser | Same flags; road-sensor access and actual Prachinburi coverage independently verified | `flood.telemetry_observation` typed road-level with datum/unit/operator/station; Flood road-level job; contract-specific observation-age/poll policy required | No coverage → valid ZERO_RECORDS with explicit coverage, not province flood-free; auth/schema/stale fail closed; `test_v2_floodcheck.py`; actual local point/time/unit/datum request/result or explicit no-coverage evidence; telemetry/Flood points, display-only Monitoring context |
| S37 manual public URL — MON-002 — `services/evidence/collector.py` | `ENABLE_EXTERNAL_EVIDENCE`; Phase 1 MANUAL_URL/LINK_ONLY; host/metadata rights review; no borrowed platform key; NOT_REQUIRED auth for permitted public URL | evidence.external_evidence metadata/URL/permitted hash + reviewed location, no external-media bytes/body archive; staff-triggered intake only. Publisher published_at remains genuine or UNKNOWN; retrieval distinct | SSRF/geography/rights failures private/non-contributing; `test_v2_evidence_intake.py`; real manual metadata/link receipt with actor/hash, actual request proof only if permitted metadata fetched; no manufactured upstream success; trusted staff inbox/review → events/shadow only |
| S37 approved RSS — DEFERRED — reserved collector/feed parser | Disabled in Phase 1 even if master Evidence flag/URL exists; later source-specific approved feed/rights contract and credential scope required | No scheduled fetch or writes now; reserved Evidence schema retained, not active | FEATURE_DISABLED; tests ensure URL/config cannot auto-enable fetching/publication. Feed cadence/freshness/runtime request gate applies only to a later approved extension |
| S39 optional AI — MON-004 — approved `adapters/evidence_ai.py` | `ENABLE_EXTERNAL_EVIDENCE` + `ENABLE_EXTERNAL_EVIDENCE_AI`; approved provider/model/key/privacy terms/budget | `evidence.external_evidence_analysis`; Evidence worker; analysis_at/provider/model/version recorded, never source observation time; no automatic score freshness | Missing provider/key UNCONFIGURED/ACCESS_REQUIRED; malformed/failed response gives no suggestion, manual flow intact; `test_v2_evidence_ai.py`; actual permitted model request and structured result with privacy audit; staff suggestions only |

These source jobs do not implement public route registration themselves; FLOOD-008/MON-010 own public DTOs and consumers. Activation requires those downstream gates too. Source contracts, runtime fixtures and a source-specific credential/permission declaration must be approved before an absent adapter is implemented; no vague future URL is an executable specification.

## 36. Dependency DAG

```text
Owner-approved locked SHA + recorded Phase 1 decisions
                         |
                  FLOOD-002 contracts / DB-001
                         |
                  FLOOD-006 storage / DB-002
                    /           \
   FLOOD-003/004/005 adapters   FLOOD-007 existing truth/read-only health
      [each separately gated by provider contract/access/coverage]
                         |
          FLOOD-008 API / Flood views → FLOOD-009 Map → FLOOD-010 QA
                  DB-002 → INT-001 / DB-004 → INT-002 context

Approved event-mediated Phase 1 contract → MON-000 prerequisites
                         |
                 MON-001 / DB-003 → MON-002 intake
                         /             \
                MON-003 review       MON-005 dedup
                         \             /
              INT-001 → MON-006 events / DB-005
                              |
INT-002 context + events → MON-007 correlation
                |
       INT-003 lineage → INT-004 snapshots / DB-006 → MON-008 shadow
                                             |
                      Separately approved/activated policy → MON-009 [DEFERRED]
MON-006 + INT-004 + publication approval → MON-010 public API / Monitoring views
                        MON-008 + MON-010 → MON-011 → MON-012 [PHASE 1]
                              FLOOD-010 + MON-012 → INT-005

MON-002 → MON-004 AI [DEFERRED; not a manual-workflow dependency]
MON-002 → approved RSS/platform collection [DEFERRED; separate source contract]
```

No circular dependency: INT context consumes Flood/core facts, not Monitoring correlation. Correlation consumes the context contract after it exists. Source-adapter branches plug into available contracts independently; FLOOD-008 can serve validated existing sources and explicit unavailable states without waiting for every GISTDA/DWR/FloodCheck activation. A source with unverified access does not block another source or manual Evidence/shadow work; its own live product DoD cannot be marked verified. MON-009 is not a Phase 1 path dependency.

## 37. Branch/merge strategy

The owner has locked `c794a03841a8aa853887d61dfda3d3cbfa2c2ee2`; every implementation branch/worktree starts clean from it and excludes the preserved MapPage label edits. The seven concurrent worktree branches are `codex/v2-database`, `codex/v2-flood-sources`, `codex/v2-evidence`, `codex/v2-monitoring-engine`, `codex/v2-frontend-maps`, `codex/v2-platform-release`, and `codex/v2-integration`. Section 46 is the controlling branch/ownership/lock and wave blueprint; the earlier task IDs remain backlog units, not a requirement to serialize every implementation unit.

Every branch initially starts from the same locked SHA. Freeze interfaces before parallel coding; implement against frozen contract fixtures in tests while other teams finish their modules. Bring required already-reviewed prerequisite commits into a branch through an explicit merge or reviewed cherry-pick; do not pretend a branch from the untouched baseline already has those interfaces. Integration branch also starts at the locked SHA and merges reviewed feature bundles in dependency order at the three wave gates. Do not rewrite published history or force-push.

The owner's latest execution request explicitly authorizes the parallel-team plan: one writer per worktree, disjoint file manifests, and serialized main/router/config/deploy/migration integration. This planning turn creates no worktree or branch and performs no commit/push/merge. The separate existing MapPage edits remain untouched in the current checkout.

## 38. Codex workflow

Chat 1: Planner + independent Reviewer in distinct turns/ownership. Seven separate future implementation chats/worktrees execute the seven Section 46 team handoffs; Team Integration is an Implementer, not the Reviewer. Each chat owns only its manifest. No new chat or cross-chat message was created/sent in this planning pass.

Every handoff contains task ID, goal, source ID/status, allowed and forbidden files, exact interfaces, DB/API/scheduler impact, flags, tests, runtime evidence, failure behavior, acceptance criteria, Git rules and review handoff. Implementer cannot edit plan/review or redefine gates. Reviewer cannot fix source or accept NOT_VERIFIED mandatory criteria. Role records use `docs/EXEC_PLANS/active/<task-id>/plan.md`, `implementation.md`, `review.md`; empty templates in this checkout cannot supply an approved policy.

Wave-level batch review replaces waits after each small task, but preserves the three-role boundary: only Planner updates `plan.md`, Implementers record changes/verification in `implementation.md`, and the independent Reviewer records wave verdicts in `review.md`. Stop and return PLAN_REVISION_REQUIRED for an actual policy/architecture conflict; FAIL for a concrete implementation defect against an approved task; PASS only after required fresh verification. Access limitation may permit a disabled adapter review, but never an ACTIVE source or completed required live integration claim.

## 39. Review gates

Source activation must prove REAL_EXTERNAL_REQUEST, REAL_DATA_RECEIVED, actual SOURCE_TIMESTAMP or explicit UNKNOWN where product contract lacks one, provenance, schema validation and fail-closed behavior. If current freshness is mandatory and no source time is available, activation as current data is blocked. Proof is tied to source/product, locked build/commit, environment, run ID and reviewed sanitized result; not a row count or mocked fixture.

Required source tests: valid current response; genuine zero records; transport timeout; auth denial/missing key; schema type/shape change; missing/invalid/stale/future timestamps; wrong units/datum; out-of-scope/conflicting geography; duplicates/revisions; partial batch failure; disabled flag; storage/reconciliation failure; malformed scheduler state; verifier failure precedence.

Required Monitoring tests: spoofed identity/role/query credentials; valid identity/no permission; private/null/blank/unknown publication; invalid latest verification overriding earlier valid evidence; private media/EXIF/GPS/PII; same report through external repost; event withdrawal; flood-only input; missing base/policy; AI unavailable; deterministic replay; context read performs no fetch/write.

Owner-decision regression gates: expired/revoked credentials and inactive StaffUser → 401, server-side permission denial → 403, spoof/query credential → 400; issuance/revocation/review audit actor server-bound. MANUAL_URL/LINK_ONLY stores no publisher body/media bytes and never starts RSS/platform/AI jobs; unsafe URLs/geography fail closed. Publication tests independently break each required AND condition, including later rejected revision and expired rights. SHADOW candidate presence/change never changes public priority values, base freshness/source counts or explanation; public adjustment 0/final = evaluable base, private candidates absent from DTOs. Missing calibration yields no invented candidate; draft policy/mistaken priority flag cannot activate public scoring. No numeric policy approval is needed to PASS this zero-adjustment Phase 1 contract.

Required database tests and owning gates:

| Owner / test file | Mandatory assertions |
| --- | --- |
| DB-MIGRATE / `test_v2_migrations.py` | Dependency-closed dry-run; isolated apply/rollback and checksum reconciliation; no core data promotion/deletion; failure aborts DB/file/manifest changes; Flood-only schema installs without Evidence; no startup DDL; isolated backup/restore rehearsal preserves private references/audit |
| F-STORAGE / `test_v2_flood_storage.py` | Same payload idempotent; correction appends rather than overwrites; logical revision selection deterministic; product/source/run/station mismatch rejected; raw caps/storage-mode checks; missing/zero distinct; original/display geometry hashes/CRS preserved; forecast/risk/observed classification cannot cross views |
| M-SCHEMA + M-REVIEW / `test_v2_evidence_schema.py`, `test_v2_evidence_review.py` | Private defaults; typed FK integrity; duplicate intake/group membership constraints; immutable decisions; two reviews with expected revision yield one success/one 409; review actor server-bound; review/verification/publication remain separate |
| M-EVENT / `test_v2_monitoring_events.py` | Idempotent event creation; actual typed measurements only, no forecast-as-measurement; deferred review/event FK transaction; withdrawal of a member revokes public influence; confirmations require real validated artifacts; publication/rights/epoch update atomic |
| I-CONTEXT + M-SCORE / `test_v2_lineage.py`, `test_v2_replay.py`, `test_v2_evidence_adjustment.py` | Same physical origin can affect multiple cells but cannot count twice within one cell; base rainfall/report reappears as nonnumeric context only; replay uses frozen records, not latest queries; priority writes atomic; wrong epoch fails closed; missing retained input gives REPLAY_UNAVAILABLE; Evidence-off makes zero Evidence-table queries |
| F-API + M-PUBLIC / `test_v2_flood_public_api.py`, `test_v2_evidence_public_api.py` | Public role denied raw/private tables; DTO fields allowlisted; expired rights/withdrawn/current-revision mismatch cannot leak through view/cache; controlled views retain freshness/classification; all flags off works on core-only schema |

Retention cleanup tests exercise configurable operational expiry, source-rights/takedown shortening, referenced-row tombstones, private file hash/reconciliation failure and no public delivery during pending cleanup, using synthetic isolated test data only. Initial operational bounds cannot be represented as statutory requirements; Phase 1 external-media rows/bytes remain absent by default.

Review Focus: (1) legitimate zero level/rain versus missing values, (2) stale good data followed by failed latest request, (3) same physical instrument via two providers, (4) withdrawal after a public snapshot is cached, (5) WMS axis/time metadata and forecast issue/valid time mistaken for current observation. Owning task tests above must pin each behavior.

Use fresh targeted tests first and isolated test databases only. The current `tests/conftest.py` creates/reconciles tables, deletes fixture-targeted tables and performs teardown fetches; inspect/explicitly isolate before running it. Suggested future gates: `pytest -q apps/api/tests/test_v2_source_contracts.py`, corresponding source/Monitoring tests, existing map/time/privacy/refresh regressions, then full backend suite on dedicated test DB; frontend `npm run build` from `apps/web`; read-only runtime verification; Git whitespace/scope/secret checks. No suites were run or pass counts invented in this planning pass.

## 40. Flood Map DoD

- Real authorized source data, traceable product/run/provenance and source timestamps/window.
- OBSERVED/INTERPRETED/FORECAST/RISK/REFERENCE remain distinguishable; depth/units/datum only where supplied.
- Actual source health/freshness; unknown/unavailable/stale clearly visible, not empty/current or flood-free claims.
- Prachinburi scope and qualified upstream catchment context; no fabricated polygons, geometry, measurements or forced product substitution.
- Independent loader/layers/popups/legend; preserved map/search/route behavior and responsive 320/359/390/768/1366/1440-pixel checks.
- Runtime upstream + safe API + browser evidence for enabled products; optional disabled source listed truthfully.
- Required FloodCheck product remains not verified if its service/coverage/access cannot be established; owner must explicitly change scope to waive it, not implementer silently omit it.

## 41. Monitoring Map DoD

- Fully valid BasePriority behavior/version preserved; approved publication/input truth corrections documented, no silent model recalibration.
- Trusted Human Review, event mediation and independent-publication contract; AI/social evidence never directly drives map.
- No double counting; flood-only weight 0; Phase 1 public adjustment 0/final = evaluable base; private shadow candidates/calibration proposals isolated. Approved caps/decay/precision and live adjustment are later MON-009 criteria, not an initial rollout requirement.
- Immutable input/context/policy/event/model snapshots and deterministic replay.
- Privacy-safe DTO/media, generalized coordinates, attributed allegations and no unsupported contamination/source-causation claims.
- Failure isolation and all disabled flags preserve valid core behavior; no source error becomes fake zero/current evidence.
- Real runtime validation, targeted/full isolated backend tests, build/browser/responsive checks; mandatory unverified policy/auth criteria cannot PASS.

## 42. Failure-isolation matrix

| Failure | Flood Map behavior | Monitoring behavior | Public status / calculation | Fallback |
| --- | --- | --- | --- | --- |
| GISTDA Disaster unavailable | No current footprint; optional last valid layer labeled STALE | Existing valid base independent; flood context unavailable | UNAVAILABLE/STALE; no flood-only adjustment | Last valid permitted asset, not legacy polygons |
| FloodCheck unavailable | Forecast/risk/road layer separately unavailable | No effect on existing observed/core input | UNAVAILABLE; no weather-as-flood substitution | Separate Open-Meteo weather MODEL only |
| DWR unavailable | Its stations missing/stale, other providers independent | Context field unavailable; no synthetic values | UNAVAILABLE/STALE; no double-provider replacement weight | Explicit proven-equivalent fresh ThaiWater relay only |
| ThaiWater unavailable | Its observations stale/unavailable; DWR retains own identity | Base factor non-evaluable under approved policy; no fake normal rain/zero water | STALE/UNAVAILABLE; final null if base not evaluable | Last valid qualified observations, not zero |
| Required credential missing | No source job/ingest | Related context/evidence unavailable | ACCESS_REQUIRED; no actual current claim | Other independent authorized sources |
| API schema changed | Reject/quarantine batch, retain last valid as stale | No new correlated facts/adjustment | UNAVAILABLE or DEGRADED + SCHEMA_INVALID; verifier 2 | Last valid typed contract, no guessed coercion |
| Source stale | Clearly stale layer/time | Not current eligible influence | STALE; no timestamp refreshed to now | Historical/reference view only |
| Evidence disabled | Unchanged | Valid base only, adjustment 0 | FEATURE_DISABLED, no public evidence | Existing safe report/base functions |
| Collector failed | Unchanged | Manual review of already valid records continues | Evidence fetch failure, no new signal | Manual approved intake/retry |
| AI failed | Unchanged | Manual review continues; no suggested data invented | AI unavailable; no score/review change | Human extraction |
| Human Review backlog | Unchanged | Pending evidence private/non-contributing | Pending, not verified/published | Existing base only |
| Correlation failed | Unchanged | Adjustment disabled/0 with reason; valid base remains | DEGRADED; no fallback causal match | Valid base only |
| Evidence policy missing | Unchanged | No public adjustment | UNCONFIGURED; adjustment 0 | Shadow/manual evidence only |
| PostGIS unavailable | Geometry-dependent new reads unavailable, non-spatial valid telemetry may remain | No new spatial correlation/result; do not fabricate geometry | UNAVAILABLE/STORAGE_FAILED | Existing prevalidated local boundary/reference if usable; existing cached base only with honest status |
| Core/database unavailable | Safe errors/status, no default empty-current response | No new base/snapshot/review | UNAVAILABLE | Liveness separate from readiness; no manufactured output |
| Publication withdrawn | Flood unaffected | Exclude immediately; invalidate/recompute visibility | Private/missing public event 404 | Valid base/other eligible events only |

## 43. First 10 implementation tasks

These are backlog priorities/dependency hints under the recorded Phase 1 owner approvals, **not** a serial execution queue. Section 46 supplies the parallel waves. FLOOD-001 inventory is already completed; no implementation occurs during this planning turn. Skip source-specific blocked adapter activation while independent approved tasks proceed.

1. **MON-000A trusted reviewer identity** — highest-priority production Human Review prerequisite, using the owner-approved individual server-side identity mechanism; no full auth-platform redesign.
2. **MON-000B publication/base truth compatibility** — explicit allowlist/latest verification and missing-input/freshness guards; preserve valid base weights/DTO shapes and legitimate staff access.
3. **FLOOD-002 source contracts/ledger** — typed outcomes, source-specific identity and separate migration-managed metadata.
4. **FLOOD-006 normalized storage** — DB-002 additive flood tables/core lineage, isolated migration/apply/rollback/reconciliation; establishes storage needed by source-truth persistence.
5. **FLOOD-007 existing source truth** — ThaiWater/scheduler health and RID/Open-Meteo attribution/access/read-only-call corrections; current real runtime proof.
6. **FLOOD-004 GISTDA Disaster** — highest-value new flood capability: genuine footprint rather than another overlapping gauge, gated by access/rights.
7. **FLOOD-003 DWR telemetry** — verified StationInfo/Runoff and regional unique coverage, gated by actual contracts/dedup; no assumed DWR-first priority.
8. **MON-001 External Evidence schema** — after MON-000 initial rule enforcement; private defaults/explicit migration, metadata-only Phase 1; reserved structures do not activate media/AI/RSS.
9. **MON-002 MANUAL_URL/LINK_ONLY intake** — traceable metadata/link/permitted hashes, no external bytes/article archive, RSS/platform automation or auto publication.
10. **MON-003 Human Review** — trusted auditable decisions, separate verification/publication, manual path operational without AI.

Blocked provider tasks may be held while independent approved tasks proceed; never call a required provider complete or choose a substitute silently. FLOOD-005 follows its verified contract; API/map/context/event tasks follow the DAG. MON-004/009, RSS/platform automation and external-media byte storage are deferred, not Phase 1 prerequisites. Existing architecture/task numbers remain intact.

## 44. Explicit blockers

### HARD BLOCKERS — prevent implementation

**NONE for the approved Phase 1 execution scope.** The baseline is locked; event-mediated architecture, module-scoped individual reviewer mechanism, narrow compatibility fixes, policy owner, zero-adjustment shadow mode, fail-closed publication, MANUAL_URL/LINK_ONLY and configurable operational retention are approved. MON-000 must still be implemented/tested before trusted review is operational; that is a technical task dependency, not an unresolved owner decision. No missing standalone v1.1 artifact is a gate now.

### POLICY BLOCKERS — require user/team approval

**NONE remaining for initial manual/shadow execution.** Separately approved/activated Evidence Policy is required only for deferred MON-009 live adjustment. Automated RSS/platform/API collection, AI vendor activation and external-media byte storage need their own future source/rights/privacy contracts; none is a Phase 1 dependency. No personal policy-owner name, numerical production weight or new external-media root must be invented to begin the approved work.

### ACCESS BLOCKERS — source-specific keys/permissions

GISTDA Disaster gateway project key/rights and actual product/schema/CRS/window; DWR central authenticated host/StationInfo/Runoff contracts plus regional service URL/auth/units/datum/time/coverage; independently confirmed FloodCheck forecast/risk/road endpoints/access/schema/local coverage. Unknown contracts prevent guessing/implementing an invented adapter; verified adapters may remain disabled pending actual access/runtime proof. These block only the corresponding source work/activation, never unrelated approved tasks. Optional PCD/TMD/DEM/DIW/DGR/LDD access does not block Phase 1. Manual-link publication still checks actual source metadata/link rights and privacy case by case; owner LINK_ONLY approval is not a blanket publisher license.

### NON-BLOCKING FOLLOW-UPS

Deferred MON-009 calibration/active-policy approval, automated RSS/platform collection, optional AI provider/privacy/budget, external-media byte rights/private root, extra DWR products, directed hydrology/DEM, live facility/receptor catalogs, Copernicus processing and future typed laboratory/water-quality integrations. They remain inventoried/disabled. Task-local tests, actual provider request proof, cadence/rate limits and isolated migration rehearsal remain mandatory acceptance gates for the relevant task, not reasons to block unrelated execution or claim a source ACTIVE without evidence. No required live product DoD is silently waived.

## 45. First implementation handoff recommendation

**First prerequisite: MON-000A — Trusted Reviewer Identity. READY FOR IMPLEMENTATION HANDOFF.** Under the newer Section 46 parallel blueprint, this is a Wave 1 dependency, not a separate serial worktree. Planning-only in this turn; no chat message, worktree creation or implementation is performed.

Team DB owns the DB-MIGRATE bootstrap/DB-000; Team Evidence owns the M-AUTH resolver/operator tooling in their separate Section 46 branches from `LOCKED_BASELINE_SHA = c794a03841a8aa853887d61dfda3d3cbfa2c2ee2`. Team Integration alone wires shared security helpers and the affected security runbook. Preserve/exclude the current MapPage edits. No collectors/events/scoring/Flood/UI redesign, broad P0/P1/auth rewrite or unrelated user changes under this prerequisite.

Module contract: `resolve_reviewer_principal(credential, db) -> ReviewerPrincipal` returns server-derived staff_id/credential_id/role/permissions only after digest lookup, active-user, expiry/revocation validation; `require_reviewer_permission(permission)` is the reusable internal dependency. Cryptographically strong individually issued opaque credentials persist only secure digests. Trusted server-operator tooling binds issuance to an existing active StaffUser with an explicit expiry and supports revoke/rotate; API callers cannot select their actor/role. Audit issue/revoke and reviewer actions without raw credential logging. Existing legitimate admin functions stay operational, but a shared admin key never authenticates a reviewer.

Acceptance: absent/invalid/expired/revoked/inactive → 401; spoofed username/role or query credentials → 400; authenticated insufficient permission → 403; valid permitted principal works and audit uses its trusted staff ID. No new production default staff/auto-seed, raw-token storage, startup v2 DDL or shared-key fallback. Focused `test_v2_reviewer_auth.py` uses the real resolver/dependency, not authentication overrides; isolated DB-000 dry-run/apply/rollback/checksum tests and compatibility checks pass. Future implementation records fresh commands/results and returns to independent review. Commit/push/merge require later explicit user authorization; this owner-decision turn grants none.

### Planning artifact safety

The only file created/modified by this planning task is:

`/Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md`

It is docs/planning-only. Production/source/runtime/config/test/database/migration modifications by this task: **NONE**. The pre-existing `apps/web/src/pages/MapPage.tsx` label diff was preserved, not edited or reverted. No stage/commit/push/merge/branch change occurred. No temporary QA service/file or secret artifact was created.

The original approval covered Sections 1–45; Section 46 adds the parallel execution gates. The status is planning execution readiness, not implementation/migration/runtime PASS. No backend/frontend suite or database operation is executed by this planning pass.

The architecture/planning skills informed the domain separation, explicit interfaces, dependency gates and self-review. Empty repository planning templates were inspected; no implementation/review record was created.

MASTER PLAN STATUS:
APPROVED FOR EXECUTION

## 46. RUWAIGON v2 — multi-worktree 72-hour execution blueprint

This appendix is the controlling **execution topology**, not a new product/policy approval. The 48–72-hour window is a target, never permission to skip verification. The locked baseline is `c794a03841a8aa853887d61dfda3d3cbfa2c2ee2`. The only currently dirty source file, `apps/web/src/pages/MapPage.tsx`, is a pre-existing user edit outside that commit: do not copy, reset or lose it. This planning turn does not create branches/worktrees or implement code. Sections 17–30 and 39–42 remain the product/data/security contract; this section supersedes only the earlier **sequential** task and file-ownership scheduling in Sections 31, 37, 38 and 43.

The approved plan is presently an **untracked file** at `/Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md`, so a clean worktree at the locked SHA will not contain it. Every future team must read that exact path read-only (or an owner-approved immutable copy with matching checksum) before editing; no team may assume `plan.md` is present inside its worktree. Publication/commit of the plan into the integration history is a separate owner-authorized Git step, not a reason to change the locked source baseline or copy an untracked plan into seven branches.

### 46.1 Contract Freeze checklist — CF-1, first 2–3 hours

The following is the **CF-1 freeze specification**. At H0–H3, Team Integration checks it against the locked checkout, creates contract-only fixtures/tests in its worktree, and records the schema/DTO/flag version and checksum in `implementation.md`. This is confirmation, not permission to redesign. Any change to a frozen field, public meaning, migration prerequisite, privacy rule or numerical scoring rule goes to Planner/owner before affected teams continue. Independent teams can start as soon as CF-1 is recorded, without waiting for full DB/provider/API implementations.

| Freeze item | Exact CF-1 boundary and completion check |
| --- | --- |
| Schemas/IDs | `flood`, `evidence`, `monitoring`, `publication`, and isolated `core_private.reviewer_credential`; table inventory, UUID/text PK/FK types, UTC timestamps, geometry/CRS/nullability, status enums and revisions from Sections 17–18. Source IDs S01–S19 (including S15a/b) and product distinctions from source inventory; no substitute provider IDs. DB-000 through DB-008 filenames/prerequisites exactly as Section 18. Core tables stay canonical. |
| DB/API wire version | `CF-1` fixture manifest shared with all teams; frozen field names/types/nullability, status and error examples are checked by contract tests. Schema revisions are additive only. `null`/UNAVAILABLE is not zero/empty current data; a verified ZERO_RECORDS query is distinct. |
| Flood DTOs | GET `/api/public/flood/observed`, `/forecast`, `/risk`: product-specific envelope `{status, reason?, classification, source_id?, product_id?, source_timestamp?, retrieved_at?, issued_at?, valid_from?, valid_to?, freshness, coverage?, data?}`. `data` is a public-safe GeoJSON FeatureCollection or approved controlled asset descriptor; no geometry/asset when unavailable. Classification is OBSERVED/INTERPRETED for observed, FORECAST for forecast, RISK for risk; no weather-as-flood or raster-as-invented-polygon. Compatibility `/flood-extent` stays FeatureCollection-shaped as Section 25. |
| Telemetry DTOs | GET `/api/public/telemetry/stations`, `/latest`: `{status, reason?, items, next_cursor?, source_timestamp?, retrieved_at?, freshness}` with each item `{station_id, source_id, product_id, variable, value?, unit?, datum?, observed_at?, geometry?, quality?, provenance?}`. Filters/pagination are validated server-side. `items: []` is current-zero only after a valid actual query; otherwise status distinguishes unavailable. Existing public station/history shapes remain compatible. |
| Source-health DTO | GET `/api/public/flood/source-health`: per-source/product `{source_id, product_id, runtime_status, outcome_reason, last_attempt?, last_success?, source_timestamp?, retrieved_at?, record_count?, contract_version?}` in a safe envelope. Separate runtime health from contract/inventory status; no guessed counts/verification or secrets. Existing `/health/sources` truth remains compatible. |
| Monitoring DTO | Existing `/api/public/map/monitoring-priority` and v1 alias remain a GeoJSON FeatureCollection. Add safe top-level/feature fields `base_priority?`, `evidence_adjustment` (exactly 0 in Phase 1), `final_monitoring_priority?`, `level?`, `explanation?`, `source_timestamps?`, `freshness`, `cell_id`, `policy_version?`, `input_snapshot_id?`; do not remove existing valid properties/geometry. For evaluable base, final=base; missing base yields null/NOT_EVALUABLE. Private shadow candidate and restricted lineage never appear in public DTO. Stable cell identity and geometry derive from validated existing map cells/boundary; no fabricated GIS. |
| Evidence DTOs | Public GET `/api/public/evidence-events[/{id}]` exposes only current publication-valid event ID/revision, generalized scope/geometry, attributed safe summary, status/time and permitted provenance; private/missing is non-enumerating 404. Internal `/api/internal/external-evidence[/{id}/review]` and monitoring-event review routes use authenticated server-bound principal, expected revision/idempotency key, typed decision, and audit result; missing/invalid auth 401, insufficient permission 403, spoof/query credentials 400, stale revision 409. No arbitrary reviewer name or raw private/media fields in public response. |
| EnvironmentalContextSnapshot | Exact Section 19 envelope/field states: `context_id`, `contract_version`, scope/validated geometry/precision, `generated_at`, `valid_until`, `boundary_hash`, typed `input_references`; each field has VALUE/UNKNOWN/UNAVAILABLE/STALE, nullable value/unit/datum, source product/time/retrieval/provenance and one usage class. `read_context(scope, as_of)` is read-only and cannot fetch. No Flood input enters Evidence adjustment by default. |
| Source adapter result | A typed result carries source/product ID, request start/finish, real HTTP status, schema outcome, source time/window, retrieved time, coverage, accepted/rejected/duplicate counts, provenance/hash and sanitized reason. Outcomes include SUCCESS, ZERO_RECORDS, ACCESS_REQUIRED, UNAVAILABLE, STALE, SCHEMA_INVALID, CONTRACT_UNVERIFIED; runtime health remains the separate Section 23 enum. Failure cannot be mislabeled expected limitation or success. |
| Flags/auth | Default false: `ENABLE_REAL_FLOOD_DATA`, `ENABLE_GISTDA_DISASTER`, `ENABLE_GISTDA_FLOODCHECK`, `ENABLE_DWR_TELEMETRY`, `ENABLE_EXTERNAL_EVIDENCE`, `ENABLE_EXTERNAL_EVIDENCE_AI`, `ENABLE_EXTERNAL_EVIDENCE_PUBLIC`, `ENABLE_EXTERNAL_EVIDENCE_PRIORITY`, with dependencies from Section 27. No novel production flag without review. Reviewer identity is individual opaque credential digest tied to active StaffUser/server permission; no shared admin-key reviewer, user-supplied role/identity or query credential. CF-1 test fixture is fake test input only, never production fallback. |

CF-1 signoff artifact: one typed OpenAPI/TypeScript/DB fixture mapping and negative examples (missing, stale, invalid, private), a single version/checksum, locked SHA, and team acknowledgement in the integration implementation record. This can be checked from code/fixtures without a live external provider. **Do not start parallel source edits before the freeze record exists.** The record is not a second plan and cannot silently revise CF-1.

### 46.2 Worktree matrix, responsibilities and merge prerequisites

All seven are separate clean worktrees from the locked SHA. Within each team, optional subworkers use disjoint files; never two writers in one worktree. Only Team Integration updates its integration branch during wave merges. Below paths are repository-relative; `apps/api/app/` prefixes apply where shown. Tests follow their owning module. Anything not explicitly allowed is forbidden without a lock transfer or Planner revision.

| Team / branch | Exclusive allowed implementation manifest | Input → output; merge prerequisite |
| --- | --- | --- |
| DB / `codex/v2-database` | `apps/api/migrations/v2/{000..008}_*.sql`, `scripts/migrate_ruwaigon_v2.py`, `apps/api/app/services/{flood,evidence,monitoring}/models.py`, `apps/api/app/services/flood/{repository,source_registry}.py`, DB-specific new repository modules, `apps/api/tests/test_v2_{migrations,flood_storage,evidence_schema}*.py` | CF-1 schema/core IDs → additive migrations, registry/run ledger, typed repositories, public view DDL, rollback/reconciliation. Wave 1 DB-000/001+runner; Wave 2 dependency-closed DB-002..008. No provider HTTP, UI, shared router/config or live DB mutation. |
| Flood / `codex/v2-flood-sources` | `apps/api/app/adapters/{thaiwater,rid,openmeteo,dwr_bangpakong,dwr_central,gistda_disaster,gistda_floodcheck}.py`, `apps/api/app/services/flood/{contracts,scheduler,normalize,health,dwr,gistda,floodcheck}.py`, `apps/api/app/core/{source_access,provenance}.py` for narrow truth corrections, `apps/api/app/api/public/{flood,telemetry_v2}.py`, source-specific new tests `test_v2_{source_contracts,dwr_sources,gistda_disaster,floodcheck,flood_public_api}*.py`, narrow existing adapter regression tests | CF-1 + repository protocol fixture → independent adapters, normalized calls, safe router objects, health. Never write DB models/repository/DDL or mount routes; activation needs real contract/access/rights/request proof. |
| Evidence / `codex/v2-evidence` | `apps/api/app/core/reviewer_identity.py`, `scripts/manage_reviewer_credentials.py`, `apps/api/app/services/evidence/{schemas,intake,collector,review,dedup,analysis,publication}.py`, `apps/api/app/adapters/evidence_ai.py` (disabled interface only), `apps/api/app/api/{internal/external_evidence,public/evidence_events}.py`, `apps/api/tests/test_v2_{reviewer_auth,evidence_intake,evidence_review,evidence_dedup,evidence_public_api,evidence_ai}*.py` | CF-1 + reviewer/DB protocol fixture → MANUAL_URL/LINK_ONLY metadata, individual trusted review, dedup and publication-safe event presentation. No schema/DDL or Monitoring event writer; RSS/API/AI/external byte collection disabled. |
| Monitoring / `codex/v2-monitoring-engine` | `apps/api/app/services/monitoring/{context,snapshots,lineage,correlation,policy,priority,heatmap}.py`, `apps/api/app/services/evidence/{events,confirmations}.py`, `apps/api/app/api/internal/monitoring_events.py`, new monitoring-specific router/service modules, `apps/api/tests/test_v2_{monitoring_events,context,lineage,replay,correlation,evidence_adjustment,heatmap}*.py` | CF-1 + base/context/event repository fixtures → events, context, lineage, deterministic cell/snapshot engine, internal shadow candidate, public zero adjustment and safe explanation. No DB models/migrations, current base-weight edits or central priority route edits. |
| Frontend / `codex/v2-frontend-maps` | `apps/web/src/features/{flood,monitoring,evidence}/**`, `apps/web/src/components/map/shared/{BaseMapShell,MapSearch}.tsx`, feature-local style/test/fixture files under those directories | CF-1 DTO fixtures → two map components, heatmap layers, safe legends/popups, timestamps/unavailable states, staff Evidence UI. No `App.tsx`, existing `MapPage.tsx`, global CSS or backend/production fixture data. |
| Platform-QA / `codex/v2-platform-release` | root `docker-compose.yml`, `docker-compose.prod.ssl.yml`, `deploy/production/docker-compose.prod.yml`, `deploy/production/docker-compose.prod.ssl.yml`, both `.env.production.example` files, deployment-only nginx/Dockerfiles, new `scripts/v2_*` QA/deploy verification files, deployment-specific tests | CF-1 flags/schema targets → default-off production-like boot, least-privilege DB roles, migration rehearsal/test DB, health/readiness, build/browser/security/secret smoke harness. No central app settings/router, business schema/provider parser/UI. Exclusive Compose/env writer until explicit Wave 3 lock handoff. |
| Integration / `codex/v2-integration` | `apps/api/app/{main.py,api/public/router.py,core/config.py,core/scheduler.py,core/staff_rbac.py,core/security.py,core/publication_boundary.py,services/spatial_monitoring_service.py}`, narrow legacy API handler compatibility files, `apps/web/src/{App.tsx,index.css,pages/MapPage.tsx}`, integration contract fixtures/tests, affected README and `docs/{DATA_SOURCES,DATA_PROVENANCE,METHODOLOGY,SYSTEM_HEALTH,MAP_VISUALIZATION,SECURITY,PRIVACY_AND_LEGAL}.md`, `docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/implementation.md` | CF-1 and branch-ready modules → serialized mounts, flags, compatibility, shared public/private boundary, route/UI glue, docs and wave merges. No provider algorithm/schema rewrite; return domain defects to owner. `review.md` belongs only to independent Reviewer. |

The earlier Section 31 task-set table is a *subtask inventory*, not concurrent write permission where it names central files or crosses the manifests above. In particular DB exclusively owns all v2 DDL/model/repository files, Flood owns new provider/service/router objects, Evidence owns its review/intake modules, Monitoring owns event/priority logic, Frontend owns feature components, Platform owns Compose, and Integration owns existing central shared files. Existing `core/source_access.py` and `core/provenance.py` are Flood-owned for narrow truth fixes; Integration may only read them. Existing `api/v1/telemetry.py`/`forecast.py` are Integration-owned compatibility wrappers; Flood exposes services they call. `services/evidence/models.py` is DB-owned even when Evidence needs its types. No team edits `plan.md` or `review.md` as Implementer.

### 46.3 Shared file lock matrix

| Lock set | Exclusive writer | Transfer/coordination rule |
| --- | --- | --- |
| `main.py`, `api/public/router.py`, existing v1 handlers, `core/config.py`, `core/scheduler.py`, `core/staff_rbac.py`, `core/security.py`, `core/publication_boundary.py`, `services/spatial_monitoring_service.py` | Integration | Domain teams publish router/service/dependency objects and contract tests; Integration mounts/delegates at Wave 1/2/3. No concurrent edits. |
| `scripts/migrate_ruwaigon_v2.py`, v2 migration journal, `apps/api/migrations/v2/*.sql`, v2 `models.py`/repositories | DB | One DB writer/serialized internal queue for 000..008; Integration invokes/rehears but does not edit runner/DDL. Migration ID/CK/FK change requires CF-1 revision. |
| `apps/web/src/App.tsx`, `pages/MapPage.tsx`, `index.css`, existing global map/router files | Integration | Frontend supplies feature components/local CSS; Integration alone wires routes and adapts old page. Pre-existing dirty MapPage edit stays outside baseline and is never silently reset/copied. |
| `components/map/shared/BaseMapShell.tsx`, `MapSearch.tsx` | Frontend | Only one Frontend writer; Integration imports, no parallel tweak. Transfer lock explicitly if a late compatibility fix is truly shared. |
| Four Compose variants, production `.env.production.example`, deployment-only nginx/Dockerfiles | Platform-QA | Platform writes until Wave 3 and signals release; Integration verifies/merges. If final wiring needs a change, Platform makes it or explicitly hands lock to Integration after committing/releasing its worktree version. |
| `docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/{plan,implementation,review}.md` | Planner / Integration Implementer / independent Reviewer respectively | No cross-role editing; wave evidence appended to the corresponding owned artifact, never used as a substitute for code/tests. |

### 46.4 Database parallelization plan

DB-A (H3 onward): dependency-closed runner/journal and DB-000/001, source/product registry, sync/raw/health with checksums and real status semantics. DB-B (after CF-1 keys, in parallel with DB-C): DB-002 Flood normalized observations/telemetry/forecast/risk, existing-core FK verification; DB-007 safe Flood views after DB-002. DB-C: DB-003 private Evidence/review/location/dedup schema, including reserved media/AI tables with **no byte collection**; independent of Flood DB-002. DB-D: DB-004 context after DB-002; DB-005 events/publication after DB-003+004; DB-006 priority after DB-005; DB-008 safe views after DB-006. DB team may parallelize design/tests internally but one owner serializes migration files/runner and merges dependency-closed bundles. No startup DDL, core rewrite/promotion, or production/shared DB apply. Dry-run, isolated Postgres/PostGIS apply/rollback, checksum/backup/restore and least-privilege view grants are gates, not assumptions.

### 46.5 Provider, Evidence, Monitoring, Frontend and Platform parallel tracks

| Track | Independent work immediately after CF-1 | Blocked activation versus work that continues |
| --- | --- | --- |
| Flood A/B/C/D | A: ThaiWater S01/S02, RID S04, Open-Meteo S06 truth/read-only corrections. B: DWR S09–S11 contracts/adapters. C: GISTDA Disaster S15/S15a (S15b same product transport only). D: FloodCheck S17/S18/S19 distinct products. Shared typed adapter result/repository fixture; Flood API uses normalized repository interface before all providers finish. | Missing credential → ACCESS_REQUIRED; unknown URL/schema/rights → CONTRACT_UNVERIFIED and only extension/interface/tests, **not guessed parser**. Each product activates only with real request/schema/time/coverage/rights proof; other tracks continue. |
| Evidence A/B/C/D/E | A: manual URL metadata/link intake; reserved approved RSS/API source-type contract only. B: external image **references** and existing report-bound authorized citizen media link, no external bytes. C: trusted human review. D: dedup/independence. E: AI suggestion interface disabled. Use private-default DB/reviewer fixtures. | RSS polling, platform collection/scraping, external-media storage and AI vendor calls stay OFF pending separate approvals. `APPROVED_RSS`/`APPROVED_PUBLIC_API` may be enum/registry values but not active collectors. `CITIZEN_UPLOAD` remains under signed-off report media/publication rules; no bypass or auto publication. |
| Monitoring / heatmap | Day 1 cell IDs/validated geometry, base-priority compatibility, missing-input state and snapshot interfaces from fixtures; then typed event links, read-only context, anti-double-count, lineage, correlation, deterministic replay, private candidate calculation, public FeatureCollection explanation. | No Evidence/Flood fixture in production; numeric policy absent means no invented candidate. Phase 1 public adjustment is 0; final=evaluable existing base; no MON-009 live activation. |
| Frontend | Day 1 separate Flood/Monitoring feature loaders and contract fixtures; heatmap renderer, legend/popup/source status/freshness and two-map switch. Preserve MapLibre camera, district/tambon search to 320 px, existing valid UI/routes and OFFICIAL/COMMUNITY/MODEL distinction. | Do not wait for backend; swap fixture transport for real APIs in Wave 2; failed/missing source renders unavailable, not fabricated polygons. New routes wired only by Integration. |
| Platform-QA | Day 1 all four Compose variants boot with v2 flags OFF; isolated test DB/PostGIS, explicit migration rehearsal scripts, health/readiness, env forwarding, no startup DDL, API/web builds and browser/security smoke harness. | Source keys absent is expected but must not appear ACTIVE; no secrets or fixture data in image. Platform owns Compose until Wave 3 handoff. |

### 46.6 Dependency graph and critical path

```text
locked SHA → CF-1 (H0–H3) ─┬─ DB-A runner/000/001 ─ DB-B 002 ─ DB-D 004 ─┐
                            │                     └─ DB-007/Flood views      │
                            ├─ DB-C 003 ─────────────────────────────────────┤
                            ├─ Flood A/B/C/D adapters + API objects          │
                            ├─ Evidence A/B/C/D/E + reviewer objects         │
                            ├─ Monitoring cell/base/shadow engine fixtures   │
                            ├─ Frontend two-map/heatmap DTO fixtures          │
                            └─ Platform default-off boot/test environment    │
                                                                          DB-005 events
                                                                               ↓
                                                            DB-006 priority → DB-008 views
                                                                               ↓
                               Integration Wave 1 → Wave 2 real wiring → Wave 3 release gate
```

DB-A and the frozen interface, not all schemas, are the early critical path. DB-B and DB-C can advance concurrently; Flood/Evidence/Monitoring/Frontend/Platform do not wait for their migrations to be merged to build tests against CF-1 fixtures. A team may report branch-ready only when its fixture-backed contract tests pass; the **integration** gate additionally proves real repository/service wiring with production fixtures absent. Missing provider access is source-specific, never a manufactured ACTIVE source or a silent full-product waiver.

### 46.7 Three exact integration waves

| Wave / target | Merge order and ownership | Evidence required before next wave |
| --- | --- | --- |
| 1 Foundation / Day 2 AM | Integration merges DB runner+DB-000/001, reviewer resolver, source adapter contract, CF-1 DTO/flag fixtures and Platform default-off boot bundle. Integration alone mounts first protected dependencies and config. DB-002/003 can continue on their branches. | Schema/runner checksum and isolated dry-run/apply/rollback; trusted-auth 400/401/403; contract tests and all-flags-off boot; no live provider or browser-wide claim. Independent Reviewer checks this batch, records defects/gate in `review.md`. |
| 2 Domain / Day 3 AM | Merge DB dependency-closed 002/003/004/005/006/007/008 bundles as ready, then Flood adapters/API objects, Evidence intake/review/public object, Monitoring event/context/shadow/priority service, Frontend two-map features. Integration alone wires legacy/public routes and frontend route switch. | Domain/API/DB integration tests on isolated DB; public/private view grants, publication/withdrawal, anti-double-count/replay, current-source truth; frontend build and focused two-map/browser checks. No test fixtures wired as production data. Independent Reviewer checks batch; feature owners fix their defects. |
| 3 Release / Day 3 PM | Integration takes only remaining reviewed feature/UI bundles, shared route/health/doc wiring, and Platform-reviewed Compose/env/default-off deployment bundle. Platform retains Compose write lock or explicitly transfers it. Deploy rehearsal follows migration-first/flags-last order. | Full isolated backend suite, production frontend build, migration/restore rehearsal, API/source-health/security/privacy checks, desktop/mobile browser QA, map separation/heatmap, four Compose variants, secret/scope/whitespace scan and rollback readiness. Independent Reviewer gives final PASS only if mandatory criteria are verified; otherwise FAIL/PLAN_REVISION_REQUIRED under Section 38. |

Each wave is a *batch gate*, not permission to defer local tests or hide failing work. Partial wave acceptance means only safe merged scope is accepted; it does not declare TASK-002 complete. Any provider with ACCESS_REQUIRED/CONTRACT_UNVERIFIED is kept disabled, independent peers proceed, and its live-product DoD remains unverified. The required FloodCheck live product cannot be called complete or silently waived; full-product/release PASS needs actual required proof or a separate owner-approved scope decision. Code-complete is not ACTIVE_RUNTIME and is not automatically release-ready.

### 46.8 Batch review gates and communication contract

Each team continuously runs focused tests and reports only `STATUS | FILES CHANGED | CONTRACTS IMPLEMENTED | TEST RESULT | BLOCKERS | INTEGRATION NOTES`. The Integration Implementer consolidates commands/results/commit IDs/deviations in its `implementation.md`; the independent Reviewer owns wave findings in `review.md`. Mandatory `NOT_VERIFIED` cannot become PASS. Send immediate escalation only for architecture/frozen contract changes, destructive migration/data policy, privacy/publication/scoring semantics, source truth reclassification, or a provider contract conflicting with the master plan. Routine bounded implementation choices stay inside the team manifest and are recorded, not sent for owner approval. Security-sensitive negative tests and migration reconciliation are mandatory regardless of schedule pressure.

### 46.9 Day 1 schedule — H0 to H24

H0–H3: verify clean locked SHA per worktree (preserve current dirty checkout), establish one writer/lock table, confirm CF-1 DTO/schema/flags/auth/dependency fixtures and test DB, record version/checksum; only then parallel implementation starts. H3–H12: DB runner/000/001 and independent 002/003 contracts; Flood four provider tracks; Evidence manual/review/dedup and disabled interfaces; Monitoring cell/base/heatmap fixture path; Frontend two-map/heatmap fixture path; Platform all-flags-off Compose boot. H12–H24: focused test hardening and branch-ready Wave 1 bundles, integration preflight. End-of-day target: DB foundation runnable; adapters as far as verified; Evidence private schema/intake; Monitoring heatmap skeleton with preserved base; frontend fixture views; production-like default-off boot. These are targets, not fabricated completion evidence.

### 46.10 Day 2 schedule — H24 to H48

AM: Integration Wave 1 merges dependency-safe bundles; independent Reviewer checks migration/auth/contract/default-off evidence. Correct actual gate defects on owning branches without stopping unrelated tracks. PM/night: DB 002/003/004/005/006/007/008 in dependency order; Flood real-source adapters and public-safe API; Evidence review/rights/publication; Monitoring event/context/correlation/shadow/replay; Frontend replacement of test fixture transport with real API modules; Platform migration/deployment rehearsal. Real provider proof is collected only where access/rights/schema allow. End-of-day target: Wave 2 bundles tested against an isolated integrated DB and interfaces, with unavailable sources accurately labeled.

### 46.11 Day 3 schedule — H48 to H72

AM: Wave 2 domain merge and independent batch review; owning teams fix integration defects in parallel, Integration controls shared routing/MapPage/legacy wrappers and validates fixture removal. PM: Wave 3 release bundle, migration-first/default-off production rehearsal, full backend/frontend/API/browser/responsive/security/privacy/source-health and secret/scope checks; Reviewer final gate and deployment decision. If gate evidence is missing, time target slips and release remains blocked; no forced PASS or fake provider availability.

### 46.12 Integration branch strategy and conflict resolution

All worktrees/branches fork the locked SHA. Team Integration maintains `codex/v2-integration` as the only aggregation branch, consuming coherent reviewed feature commits/bundles at Waves 1–3 in dependency order (DB/auth/contracts → domain modules → shared mounts/UI/deploy). No merge into `main`, push, or deployment is performed by this planning turn. Later execution may create coherent commits under an explicitly authorized implementation handoff; never force-push/rewrite history. Keep per-wave merge commits/IDs and the contract checksum in the integration record; do not cherry-pick dozens of experimental commits. A team continuing after an earlier partial merge makes new commits on its same feature branch and Integration merges the later delta normally.

On conflict: stop that merge; compare both sides to CF-1, approved scope and current user edits; the **lock owner** resolves its file in its branch or formally hands the lock to Integration after its last bundle. DB resolves DDL/runner, Platform resolves Compose/env, Frontend resolves BaseMapShell, Integration resolves central backend/web routing. Never use automatic “ours/theirs” for policy, auth, migrations, source classification, MapPage user edits, privacy fields or scoring. Re-run affected contract/negative tests and `git diff --check` after resolution; send a contract-breaking change to Planner/owner, not silent implementation drift. Reversing a wave uses feature flags off, compatibility readers, DB dependency-aware rollback/export rules in Section 18; never reset/clean user work.

### 46.13 Completion and external-provider policy

For a provider with verified schema but absent credentials, adapter/config/health/tests may be **code-complete, ACCESS_REQUIRED**, not ACTIVE. For an unknowable endpoint/schema/rights contract, only the extension/interface/test scaffold and truthful `CONTRACT_UNVERIFIED` state are code-complete; do **not** claim a parser or required live integration is done. `RUNTIME_NOT_VERIFIED` cannot be rendered AVAILABLE. DWR access cannot block GISTDA; FloodCheck cannot block ThaiWater; Evidence manual review/Monitoring shadow/frontend/default-off deployment do not depend on any unavailable provider. No borrowed keys, invented HTTP status, fabricated geometry, simulated production fixtures, unsupported active source, or unreviewed publisher body/media. Phase 1 Evidence remains MANUAL_URL/LINK_ONLY; APPROVED_RSS/APPROVED_PUBLIC_API are inactive registry/interface variants pending contracts; optional AI interface is disabled; sanitized external media is not public. Public heatmap remains existing valid BasePriority with adjustment zero until separately approved MON-009.

### 46.14 Independently pasteable Codex implementation handoffs

The following seven prompts are separate. Paste **one prompt per dedicated chat/worktree** after H0–H3 CF-1 confirmation. Each prompt's `TASK-002 plan` means the currently untracked, read-only `/Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md`, not a file assumed present in the clean worktree. They explicitly authorize only their own stated changes; the current planning turn itself authorizes no edit/commit. All paths are repository-relative and must be checked against the actual locked checkout. Each team records focused results and reports in the six-field format above. Do not claim shared/main/deployment merge authority merely from holding a feature branch.

#### DB TEAM — `codex/v2-database`

```text
Read the approved plan read-only at /Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md; it is untracked and absent from a clean baseline worktree.
IMPLEMENTER — RUWAIGON v2 / DB TEAM. Use the approved TASK-002 master plan Section 46 CF-1 and a separate clean worktree/branch codex/v2-database from c794a03841a8aa853887d61dfda3d3cbfa2c2ee2. Wait for recorded CF-1 checksum, then work independently; preserve the existing dirty MapPage edit outside this worktree. Own only apps/api/migrations/v2/000..008 SQL, scripts/migrate_ruwaigon_v2.py, new v2 services/{flood,evidence,monitoring}/models.py and DB repositories including services/flood/{repository,source_registry}.py, and DB-specific test_v2_migrations/flood_storage/evidence_schema tests. Forbidden: provider HTTP adapters, frontend, shared main/router/config/scheduler/Compose, plan.md, review.md, real/shared DB writes. Implement additive separate-registry schemas/PK/FK/indexes/revisions/publication views, source/run ledger, normalized flood, private evidence, context/events/priority snapshots, and dependency-closed runner. Sequence DB-000/001 runner first; DB-002 and DB-003 independent; DB-004 after 002; DB-005 after 003+004; DB-006 after 005; DB-007 after 002; DB-008 after 006. No core rewrite, publication promotion, startup DDL, external-media byte collection or live-policy activation. Tests: focused schema/constraint/FK/view grant tests; dry-run; isolated PostgreSQL/PostGIS apply/rollback/checksum/reconciliation/backup-restore; failure aborts. Publish typed repository protocols for Flood/Evidence/Monitoring fixture consumers. Deliver coherent Wave 1 and Wave 2 branch-ready bundles with migration dependencies/commands/results, not invented PASS. Report STATUS | FILES CHANGED | CONTRACTS IMPLEMENTED | TEST RESULT | BLOCKERS | INTEGRATION NOTES. Do not push/merge main; branch commits only when execution owner explicitly authorizes. No force-push/reset/clean or unrelated edit.
```

#### FLOOD TEAM — `codex/v2-flood-sources`

```text
Read the approved plan read-only at /Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md; it is untracked and absent from a clean baseline worktree.
IMPLEMENTER — RUWAIGON v2 / FLOOD TEAM. Start clean separate worktree codex/v2-flood-sources at c794a03841a8aa853887d61dfda3d3cbfa2c2ee2 after recorded TASK-002 Section 46 CF-1 checksum. Own only apps/api/app/adapters/{thaiwater,rid,openmeteo,dwr_bangpakong,dwr_central,gistda_disaster,gistda_floodcheck}.py; services/flood/{contracts,scheduler,normalize,health,dwr,gistda,floodcheck}.py; narrow core/source_access.py and core/provenance.py truth corrections; new api/public/{flood,telemetry_v2}.py router objects; matching focused source/API tests. Forbidden: DB models/repository/migrations/runner, main.py, central config/scheduler, existing public router/v1 handlers, Compose/frontend, plan/review records. Build ThaiWater/RID/Open-Meteo truth/read-only fixes; separate DWR, GISTDA Disaster and FloodCheck product contracts/adapters; typed actual-request outcome, normalized/provenance/health, independent source scheduler and safe observed/forecast/risk/telemetry router objects against DB repository fixtures. No guessed provider schema, borrowed key, fabricated polygon/depth/time, forecast-as-observed, or GET-triggered mutation. Missing credential => ACCESS_REQUIRED; unknowable contract => CONTRACT_UNVERIFIED disabled interface only, not fake parser; activation requires source-specific real request/schema/time/coverage/rights proof. Tests cover current/zero/timeout/auth/schema/stale/units/geography/duplicate/failed-latest/flag-off and API privacy. Do not mount routes yourself. Deliver branch-ready Wave 1 contract and Wave 2 domain bundles; report six fields STATUS | FILES CHANGED | CONTRACTS IMPLEMENTED | TEST RESULT | BLOCKERS | INTEGRATION NOTES. No push/main merge/force push/reset/clean; branch commits require explicit execution authorization. Preserve unrelated user work.
```

#### EVIDENCE TEAM — `codex/v2-evidence`

```text
Read the approved plan read-only at /Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md; it is untracked and absent from a clean baseline worktree.
IMPLEMENTER — RUWAIGON v2 / EVIDENCE TEAM. Use separate clean codex/v2-evidence worktree from c794a03841a8aa853887d61dfda3d3cbfa2c2ee2 after recorded TASK-002 Section 46 CF-1. Own only new core/reviewer_identity.py, scripts/manage_reviewer_credentials.py, services/evidence/{schemas,intake,collector,review,dedup,analysis,publication}.py, disabled adapters/evidence_ai.py interface, api/internal/external_evidence.py and api/public/evidence_events.py router objects, and matching evidence/auth/public tests. Forbidden: v2 DB models/DDL/repository, Monitoring event writer, existing central staff_rbac/security/main/router/config, Compose/frontend, plan.md/review.md. Build module-scoped individual server-derived reviewer identity against DB-000 protocol (active StaffUser, digest, expiry/revoke, permission/audit; 400 spoof/query, 401 invalid, 403 insufficient), MANUAL_URL/LINK_ONLY metadata/rights/hash/provenance intake, human review, revisioned publication/withdrawal, independence/dedup, generalized public event DTO. Reserved APPROVED_RSS/APPROVED_PUBLIC_API/CITIZEN_UPLOAD interfaces are not automated collectors or media bypasses; no publisher body, external media bytes, RSS job, platform scraping, AI provider call or automatic publication. Existing citizen media remains report-bound/authorized. Tests cover SSRF/host/geography/rights, private defaults, concurrency 409, actor trust, invalid latest decision, duplicate origins, withdrawal and public 404/sanitization. Human review must work without AI. Provide router/service objects and fixtures for Integration; do not mount centrally. Deliver coherent Wave 1 auth and Wave 2 Evidence bundles, report six fields, no push/main merge/force push/reset/clean; branch commits require explicit execution authorization.
```

#### MONITORING/HEATMAP TEAM — `codex/v2-monitoring-engine`

```text
Read the approved plan read-only at /Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md; it is untracked and absent from a clean baseline worktree.
IMPLEMENTER — RUWAIGON v2 / MONITORING/HEATMAP TEAM. Start separate clean codex/v2-monitoring-engine worktree at c794a03841a8aa853887d61dfda3d3cbfa2c2ee2 after recorded TASK-002 Section 46 CF-1. Own only new services/monitoring/{context,snapshots,lineage,correlation,policy,priority,heatmap}.py, services/evidence/{events,confirmations}.py, api/internal/monitoring_events.py, new monitoring-specific service/router objects and matching event/context/lineage/replay/correlation/evidence_adjustment/heatmap tests. Forbidden: DB DDL/models/repositories, existing spatial_monitoring_service.py and public router, base model weights, central config/main/scheduler, Frontend/Compose, plan.md/review.md. Begin Day 1 from CF-1 fixtures: reuse validated existing cell geometry/IDs and fully valid BasePriority behavior; implement missing-input status, typed Monitoring Event links, read-only EnvironmentalContext consumer, origin/independence anti-double-count, deterministic lineage/replay, transactional snapshots and safe explanation. Candidate EvidenceAdjustment is private shadow only and may be null absent calibration; Phase 1 public evidence_adjustment is 0 and final_monitoring_priority equals evaluable base (else null/NOT_EVALUABLE). No Flood-only numeric weight, policy invention, exposure of candidate/PII/facility identity, or MON-009 active mode. Tests cover report publication/latest verification, withdrawn event, copied URL/report origin, same physical observation in one cell, stale/missing base, fixture-removal integration, context no-fetch/no-write, replay and public DTO exclusion. Deliver service/router objects for Integration, coherent Wave 2 bundle and six-field report. No push/main merge/force push/reset/clean; branch commits require explicit execution authorization.
```

#### FRONTEND TEAM — `codex/v2-frontend-maps`

```text
Read the approved plan read-only at /Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md; it is untracked and absent from a clean baseline worktree.
IMPLEMENTER — RUWAIGON v2 / FRONTEND TEAM. Start separate clean codex/v2-frontend-maps worktree at c794a03841a8aa853887d61dfda3d3cbfa2c2ee2 after recorded TASK-002 Section 46 CF-1. Own only apps/web/src/features/{flood,monitoring,evidence}/** and apps/web/src/components/map/shared/{BaseMapShell,MapSearch}.tsx plus feature-local styles/tests/fixtures. Forbidden: existing App.tsx, pages/MapPage.tsx (current checkout has unrelated user edit), index.css/global routing/map files, backend, Compose, plan.md/review.md. Reuse current MapLibre controls/camera/search and product styling; build separate Flood and Monitoring loaders/layers, heatmap renderer, legends/popups/source time/health/unavailable states and staff-only Evidence presentation against CF-1 DTO fixtures immediately. Preserve all current valid routes/features, Prachinburi scope, OFFICIAL/COMMUNITY/MODEL distinctions, district/tambon search and 320px accessibility; no fake current polygons, external key in bundle, or public shadow candidate. When real backend lands, replace fixture transport and run build plus focused browser/mobile 320/359/390/768/1366/1440 tests including map switch/cancellation and no cross-domain stale selection. Export components for Integration to wire; do not edit shared routing yourself. Deliver Wave 2 feature bundle and six-field report. No push/main merge/force push/reset/clean; branch commits require explicit execution authorization.
```

#### PLATFORM/QA TEAM — `codex/v2-platform-release`

```text
Read the approved plan read-only at /Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md; it is untracked and absent from a clean baseline worktree.
IMPLEMENTER — RUWAIGON v2 / PLATFORM-QA TEAM. Start separate clean codex/v2-platform-release worktree at c794a03841a8aa853887d61dfda3d3cbfa2c2ee2 after recorded TASK-002 Section 46 CF-1. Own only root docker-compose.yml, docker-compose.prod.ssl.yml, deploy/production/docker-compose.prod.yml, deploy/production/docker-compose.prod.ssl.yml, both .env.production.example files, deployment-only nginx/Dockerfiles, new scripts/v2_* verification/rehearsal tools and deployment-specific tests. Forbidden: app main/router/config/scheduler, domain schema/provider/priority/UI, plan.md/review.md, real secrets/shared DB writes. Start Day 1: verify production-like boot with all new flags OFF, safe env forwarding, API-only private media, least-privilege DB roles, v2 schema readiness without startup DDL, isolated test PostGIS DB and migration dry-run/apply/rollback/checksum/backup-restore rehearsal. Prepare backend/frontend builds, focused API/source-health/security/privacy/secret scan, browser desktop/mobile smoke and all-four-Compose checks for Wave 3. Do not claim a source ACTIVE from configured key alone, put fixture data into production, log secrets or enable RSS/AI/external media/live evidence scoring. You own Compose until explicit release/lock handoff; Integration may inspect but not overwrite it. Deliver Wave 1 default-off boot and Wave 3 deployment bundles with exact commands/results, six-field report. No push/main merge/force push/reset/clean; branch commits require explicit execution authorization.
```

#### INTEGRATION TEAM — `codex/v2-integration`

```text
Read the approved plan read-only at /Users/tanawat/Desktop/Projects/FloodTrace-new/docs/EXEC_PLANS/active/TASK-002-ruwaigon-v2/plan.md; it is untracked and absent from a clean baseline worktree.
IMPLEMENTER — RUWAIGON v2 / INTEGRATION TEAM. Start separate clean codex/v2-integration worktree at c794a03841a8aa853887d61dfda3d3cbfa2c2ee2. Preserve the current checkout's unrelated MapPage edit outside this baseline. You own shared integration only: apps/api/app/{main.py,api/public/router.py,core/config.py,core/scheduler.py,core/staff_rbac.py,core/security.py,core/publication_boundary.py,services/spatial_monitoring_service.py}, narrow existing v1 compatibility handlers, apps/web/src/{App.tsx,index.css,pages/MapPage.tsx}, integration contract fixtures/tests, affected README and listed source/security/map docs, and TASK-002 implementation.md. Forbidden: feature-team adapters/algorithms/DB models/migrations/runner/Frontend feature components/Platform Compose without explicit lock transfer, plan.md, review.md. At H0–H3 confirm TASK-002 Section 46 CF-1 typed schema/API/context/heatmap/source/flag/auth fixtures and checksum; record team acknowledgements and shared locks before parallel source edits. Merge coherent reviewed branches in exact Wave 1 foundation, Wave 2 domain, Wave 3 release order. Only you mount backend router objects, adapt public/legacy handlers truthfully, wire staff permissions/flags/scheduler, connect map routes and replace test fixture transport with real services; never turn private/unknown into public/current. Preserve existing MapLibre/search/base weights, P0/P1 privacy/auth/publication/media, and original current valid APIs. Coordinate Platform Compose changes with its lock owner. For each wave run specified focused gates, record merged commits/commands/results/deviations in implementation.md, hand off to independent Reviewer for review.md. Final gate: full isolated backend tests, web production build, migration/rollback rehearsal, active route/browser/responsive/security/privacy/source truth/secret/whitespace/scope checks, truthful optional-source states. No final PASS if any mandatory live integration lacks proof/approved waiver; code-complete is not ACTIVE. Six-field team report. Do not push/merge main/deploy/force push/reset/clean merely from this prompt; branch commits and later release actions need explicit execution/owner authorization.
```

### 46.15 Final release verification checklist

- [ ] CF-1 checksum/version, locked SHA and seven branch/file locks recorded; only reviewed deviations and real source contract approvals entered.
- [ ] Additive DB-000..008 installed only as dependency-closed targets on isolated/rehearsal DB; before/after reconciliation, backup/restore, apply/rollback/checksum, grants and no startup DDL verified. No real/shared DB changed in testing.
- [ ] Existing valid ThaiWater/RID/Open-Meteo functions remain truthful; DWR/GISTDA/FloodCheck each show their actual contract/access/runtime state, separate products/time/coverage, and real proof before ACTIVE. Missing provider never yields fake measurements, health counts, polygons, depth or dates. Required live FloodCheck status unresolved → full product/release not signed off without owner-approved waiver.
- [ ] Flood observed/forecast/risk, telemetry and source-health routes show typed current/zero/stale/unavailable results; legacy flood-extent/forecast/public station shapes and privacy remain compatible; Flood Map uses only authorized real products.
- [ ] Individual trusted reviewer auth and 400/401/403/409 negatives pass; MANUAL_URL/LINK_ONLY rights/SSRF/geography/private defaults, dedup, publication current-revision AND-gates, withdrawal/public 404 and safe DTO/media tests pass. No RSS/platform/AI/external bytes activated absent later contract.
- [ ] Monitoring Event links, read-only EnvironmentalContext, origin guards, base truth/freshness, deterministic replay and atomic snapshots pass. Public heatmap remains valid BasePriority with adjustment 0, final=base or null/NOT_EVALUABLE; candidate private, no unsupported causal/source/lab claim.
- [ ] Two maps and heatmap render correctly using real APIs with honest unavailable states; current pages/routes, MapLibre camera, district/tambon/mobile search and controls preserved. Desktop/mobile widths 320/359/390/768/1366/1440 checked; no horizontal overflow or cross-map state bleed.
- [ ] All four Compose variants default new flags OFF, private media/API-only and least-privilege DB; migration-first then flags-last deployment rehearsal, health/readiness, rollback and no secrets/fixtures in shipped assets.
- [ ] Focused domain/negative tests, full isolated backend suite, frontend production build, API smoke/source verifier (inspect scripts before running mutating ones), browser QA, `git diff --check`, scope/status/secret scans and independent Wave 3 Reviewer verdict recorded. Docs match implemented status, not planned or merely configured sources.
- [ ] Git branch/diff contains only approved work plus preserved unrelated user changes; no forced history rewrite. Main merge/push/production deployment require separate owner authorization and are not performed by this blueprint.

MULTI-WORKTREE EXECUTION STATUS:
READY FOR PARALLEL IMPLEMENTATION
