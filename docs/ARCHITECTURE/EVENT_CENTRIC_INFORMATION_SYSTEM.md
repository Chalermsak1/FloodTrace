# FloodTrace — Event-Centric Information System Architecture
**Focus Area:** Prachin Buri, Thailand  
**Core Principle:** TRUTH > IMPRESSIVE RESULTS

---

## 1. System Overview

The Event-Centric Multi-Source Information System evolves FloodTrace from a static news feed into a correlated intelligence pipeline that links real public announcements, news, and social reports directly to **Monitoring Events** (`MonitoringEvent`).

```
              Monitoring Event (e.g. Kabin Buri Water Overflow)
                                   │
                                   ▼
                       Event Discovery Context
               (District, Waterways, Keywords, Start/End Window)
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
    Official Sources          News Media             Public Social
  (PCD, RID, GISTDA)       (Thai PBS, Local)       (Verified Public)
           │                       │                       │
           └───────────────────────┼───────────────────────┘
                                   │
                                   ▼
                         Validation & SSRF Guard
                     (Reuses SourceMetadataService)
                                   │
                                   ▼
                         Canonical Normalization
                                   │
                                   ▼
                        Deduplication Engine
                  (Content Hash & Canonical URL)
                                   │
                                   ▼
                    Spatial / Temporal Correlation
               (EXACT / NEARBY / DISTRICT / PROVINCE / UNKNOWN)
                     (TEMPORAL_ALIGNMENT ≠ Causation)
                                   │
                                   ▼
                       Deterministic Relevance
                     (HIGH / MEDIUM / LOW / UNRELATED)
                                   │
                                   ▼
                       Public-Safe Serialization
                   (Fail-closed, Stripped Staff PII)
                                   │
           ┌───────────────────────┴───────────────────────┐
           ▼                       ▼                       ▼
   News & Updates UI         Event Detail           Interactive Map
  (Cards with 16:9 Image)    (Evidence Packet)       (Area Context)
```

---

## 2. Key Architecture Pillars

### 2.1 Deduplication & Repost Clustering (Section 24)
- Duplicate items are computed via SHA-256 hash of:
  `{source_name}|{canonical_url}|{title}|{summary[:200]}`
- Reposts and mirror articles share a `source_group_id`.
- The system prevents priority inflation: 10 reposts remain counted as 1 independent source cluster.

### 2.2 Deterministic Spatial Correlation (Section 10)
Hierarchy:
1. `EXACT`: Real coordinates within ~2 km of event epicenter.
2. `NEARBY`: Coordinates within ~15 km or matching Tambon.
3. `DISTRICT`: Article explicitly references the event Amphoe (e.g., กบินทร์บุรี).
4. `PROVINCE`: Article references Prachin Buri as a whole.
5. `UNKNOWN`: No location referenced.
**Rule:** `UNKNOWN` coordinates are NEVER synthesized or randomly jittered.

### 2.3 Deterministic Temporal Correlation (Section 9)
- Compares `published_at` and `observed_at` against `event.start_time` and `event.end_time`.
- Outputs: `TEMPORAL_ALIGNMENT`, `OUTSIDE_WINDOW`, `UNKNOWN`.
- **Explicit Semantic Boundary:** "Temporal Alignment indicates that observations occurred within related operational time windows. It does NOT imply causation."

### 2.4 Separation of Information from Raw Evidence (Section 23 & 44)
- `ExternalInformation`: Normalized public announcements, news articles, and multi-source bulletins.
- `ExternalEvidence`: Raw operator-logged physical observations, photographic evidence, and field submissions.
- `MonitoringEvent`: The central incident or monitoring anomaly to which both entities link.

### 2.5 Security & SSRF Protection (Section 17 & 41)
- All external preview images and web links are validated through `SourceMetadataService.validate_safe_url`.
- Blocks RFC 1918 private IPs, loopbacks (127.0.0.1, ::1), cloud metadata (169.254.169.254), IPv4-mapped IPv6, and sensitive internal ports (22, 23, 3306, 5432, 6379, 8000, 27017, etc.).
