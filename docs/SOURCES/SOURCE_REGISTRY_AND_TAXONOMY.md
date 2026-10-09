# FloodTrace — Source Registry & Multi-Source Information Taxonomy
**Focus Area:** Prachin Buri, Thailand  
**Core Principle:** TRUTH > IMPRESSIVE RESULTS

---

## 1. Information Taxonomy (Sections 3 & 4)

The Event-Centric Information System distinguishes clearly between factual measurements, official government notices, journalistic media, public social channels, and citizen ground reports.

### 1.1 Source Types (`source_type`)
| Source Type | Description | Ingestion Method | Default Authority |
|---|---|---|---|
| `OFFICIAL_DATA` | Structured telemetry, rainfall, water level, river discharge | REST API / Telemetry Stream | `OFFICIAL` |
| `OFFICIAL_ANNOUNCEMENT` | Formal notices, warnings, and press releases from government agencies | HTML Metadata / OpenGraph | `OFFICIAL` |
| `GOVERNMENT_WEBSITE` | Public agency portal informational pages | HTML Metadata | `OFFICIAL` |
| `NEWS_MEDIA` | Accredited news outlets and journalistic reporting | RSS Feed / Public Search | `SECONDARY` |
| `PUBLIC_SOCIAL` | Public social media posts/pages (open public access only; no scraping) | Manual Operator Import / API | `PUBLIC` |
| `CITIZEN_OBSERVATION` | Ground observations submitted through FloodTrace citizen intake | Citizen Stream | `UNVERIFIED` |
| `OTHER_PUBLIC_SOURCE` | Miscellaneous verified public documentation | Manual Import | `UNVERIFIED` |

### 1.2 Authority Levels (`authority_level`)
- `OFFICIAL`: Government entities with formal statutory jurisdiction (e.g. PCD, RID, DWR, PRD, District Offices).
- `PRIMARY`: Direct first-party monitoring or research institutions.
- `SECONDARY`: Secondary news aggregators or journalistic media reporting on events.
- `PUBLIC`: Community groups and public social pages.
- `UNVERIFIED`: Sources whose authority or publisher identity has not yet been corroborated.

### 1.3 Operational Statuses (`operational_status`)
- `ACTIVE`: Fully operational, accessible, automated refresh.
- `LIMITED`: Operational with rate/scope constraints (e.g. PCD manual import, Facebook public pages).
- `DISABLED`: Ingestion administratively turned off.
- `ERROR`: Connector experienced an upstream error (fails closed).
- `MANUAL_ONLY`: Ingested exclusively via verified operator submission.
- `NOT_CONFIGURED`: Registered connector whose tokens/credentials are not yet configured.
- `DISCOVERY_ONLY`: Indexing and metadata inspection only; never ingested as factual data.

---

## 2. Configured Sources in Registry

| Source ID | Agency / Outlet | Platform | Domain | Type | Status | Scope |
|---|---|---|---|---|---|---|
| `thaiwater_telemetry` | สสน. / ThaiWater | THAIWATER_API | `thaiwater.net` | OFFICIAL_DATA | ACTIVE | Prachin Buri (26 water, 77 rain stations) |
| `rid_reservoir` | กรมชลประทาน | RID_PORTAL | `rid.go.th` | OFFICIAL_DATA | ACTIVE | Narubodindra Jinda Reservoir & Basin |
| `pcd_water_quality` | กรมควบคุมมลพิษ | GOV_PORTAL | `pcd.go.th` | OFFICIAL_ANNOUNCEMENT | ACTIVE | Prachin Buri River Surface Water Quality |
| `gistda_disaster` | GISTDA | GISTDA_DISASTER | `disaster.gistda.or.th` | OFFICIAL_ANNOUNCEMENT | ACTIVE | Satellite Flood Extent Monitoring |
| `prachinburi_provincial_office` | สนง.ประชาสัมพันธ์ จ.ปราจีนบุรี | PRD_PORTAL | `prachinburi.prd.go.th` | OFFICIAL_ANNOUNCEMENT | ACTIVE | Prachin Buri Provincial Notices |
| `kabinburi_district_office` | ที่ว่าการอำเภอกบินทร์บุรี | DOPA_PORTAL | `-(unconfigured)-` | OFFICIAL_ANNOUNCEMENT | NOT_CONFIGURED | Kabin Buri District Flood Bulletins |
| `thaipbs_news` | ไทยพีบีเอส (Thai PBS News) | NEWS_MEDIA | `thaipbs.or.th` | NEWS_MEDIA | ACTIVE | Disaster & Environmental News |
| `prachin_local_news` | ข่าวปราจีนบุรีท้องถิ่น | ONLINE_NEWS | `-(unconfigured)-` | NEWS_MEDIA | NOT_CONFIGURED | Local Basin & Community Coverage |
| `facebook_public_pages` | เพจและกลุ่มสาธารณะ | PUBLIC_SOCIAL | `facebook.com` | PUBLIC_SOCIAL | LIMITED | Public posts (Compliant with Section 13) |
| `citizen_observation` | ระบบรับแจ้งเหตุประชาชน | CITIZEN_PORTAL | `floodtrace.org` | CITIZEN_OBSERVATION | ACTIVE | Prachin Buri Citizen Observations |

---

## 3. Social Media & Public Social Policy (Section 13)

- **Strict Fail-Closed Integration**: Generic scraping of Facebook is strictly forbidden.
- **No Private Content**: No access to private profiles, private groups, or content requiring authentication.
- **Truthful Connector Status**: `PUBLIC_SOCIAL_CONNECTOR = LIMITED` or `NOT_CONFIGURED`.
- **Review Workflow**: All public social inputs default to `UNVERIFIED` and require operator corroboration before public display.
