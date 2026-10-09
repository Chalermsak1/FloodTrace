"""
Tests for Event-Centric Multi-Source Information & External Evidence System
=============================================================================
Tests compliance with Specification:
- Sections 3 & 4: Taxonomy and Source Registry
- Sections 9, 10, 11: Spatial, Temporal (no causation), and Event Correlation
- Section 13: Public Social compliance (no scraping, truth in connectivity)
- Section 17: SSRF Hardening
- Section 24: Deduplication and repost clustering
- Sections 26 & 27: Fail-closed Public API and PII stripping
- Section 39: Contradicting information handling
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from apps.api.app.main import app
from apps.api.app.core.database import SessionLocal
from apps.api.app.models.entities import (
    MonitoringEvent,
    ExternalInformation,
    ExternalEvidence,
    EvidenceEventLink
)
from apps.api.app.core.source_registry import (
    SourceRegistry,
    SourceType,
    AuthorityLevel,
    OperationalStatus
)
from apps.api.app.services.event_information_service import EventInformationService
from apps.api.app.services.source_metadata_service import SourceMetadataService


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_source_registry_and_taxonomy():
    """Verifies that the Source Registry complies with Section 3, 4, 13, and 28."""
    sources = SourceRegistry.list_sources()
    assert len(sources) >= 6

    source_ids = {s["source_id"] for s in sources}
    assert "thaiwater_telemetry" in source_ids
    assert "rid_reservoir" in source_ids
    assert "pcd_water_quality" in source_ids
    assert "thaipbs_news" in source_ids
    assert "facebook_public_pages" in source_ids

    # Section 13: Verify Facebook is marked LIMITED or NOT_CONFIGURED (never falsely claimed as live scraper)
    fb_source = SourceRegistry.get_source("facebook_public_pages")
    assert fb_source is not None
    assert fb_source.operational_status in (OperationalStatus.LIMITED, OperationalStatus.NOT_CONFIGURED)
    assert fb_source.authority_level == AuthorityLevel.PUBLIC
    assert "ห้ามขูดข้อมูล" in fb_source.terms_constraints


def test_ssrf_safety_protection():
    """Verifies that SSRF protection remains strict across dangerous schemes, IPs, and ports."""
    # Localhost and private IPs must be rejected
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://localhost:8000/internal")

    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://127.0.0.1/admin")

    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://192.168.1.1/router")

    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://169.254.169.254/latest/meta-data/")

    # Disallowed ports
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://news.thaipbs.or.th:22/leak")

    # Allowed public URL
    safe = SourceMetadataService.validate_safe_url("https://news.thaipbs.or.th/content/12345")
    assert safe == "https://news.thaipbs.or.th/content/12345"


def test_content_hash_and_deduplication(db_session: Session):
    """Verifies Section 24: 10 reposts must share a source_group_id and not inflate independent evidence."""
    url = f"https://localnews.example.com/flood-report-{datetime.now().timestamp()}"
    title = "ระดับน้ำล้นตลิ่งชุมชนกบินทร์บุรี"
    summary = "ชาวบ้านรายงานน้ำเอ่อเข้าท่วมทางเดินริมน้ำ"

    # Ingest original item
    item1 = EventInformationService.ingest_candidate(
        db_session,
        {
            "source_id": "prachin_local_news",
            "source_name": "ข่าวปราจีนบุรี",
            "source_url": url,
            "canonical_url": url,
            "title": title,
            "summary": summary,
            "district": "กบินทร์บุรี",
            "authority_level": "SECONDARY"
        }
    )
    assert item1.is_duplicate is False
    assert item1.content_hash is not None

    # Ingest duplicate/repost with same canonical URL
    item2 = EventInformationService.ingest_candidate(
        db_session,
        {
            "source_id": "facebook_public_pages",
            "source_name": "เพจแชร์ข่าว",
            "source_url": f"{url}?ref=share",
            "canonical_url": url,
            "title": title,
            "summary": summary,
            "district": "กบินทร์บุรี",
            "authority_level": "PUBLIC"
        }
    )
    assert item2.is_duplicate is True
    assert item2.duplicate_reason in ("CANONICAL_URL_MATCH", "CONTENT_HASH_MATCH")
    assert item2.source_group_id == (item1.source_group_id or item1.id)


def test_spatial_correlation_hierarchy():
    """Verifies Section 10: EXACT -> NEARBY -> DISTRICT -> PROVINCE -> UNKNOWN."""
    mock_event = MonitoringEvent(
        id="TEST-EV-01",
        title="น้ำท่วมกบินทร์บุรี",
        event_type="FLOODING",
        district="กบินทร์บุรี",
        latitude=13.98,
        longitude=101.71,
        start_time=datetime.now(timezone.utc) - timedelta(days=1),
        created_by="tester",
        provenance={"test": True}
    )

    # 1. Coordinate within 1 km -> EXACT
    spatial, prec, dist = EventInformationService.correlate_spatial(
        "รายงานน้ำท่วม", "กบินทร์บุรี", 13.985, 101.715, mock_event
    )
    assert spatial == "EXACT"

    # 2. Coordinate ~8 km -> NEARBY
    spatial, prec, dist = EventInformationService.correlate_spatial(
        "รายงานน้ำท่วม", "กบินทร์บุรี", 14.03, 101.71, mock_event
    )
    assert spatial == "NEARBY"

    # 3. Only district text -> DISTRICT
    spatial, prec, dist = EventInformationService.correlate_spatial(
        "พบระดับน้ำขึ้นสูงในอำเภอกบินทร์บุรี", None, None, None, mock_event
    )
    assert spatial == "DISTRICT"
    assert dist == "กบินทร์บุรี"

    # 4. Only province text -> PROVINCE
    spatial, prec, dist = EventInformationService.correlate_spatial(
        "สถานการณ์ภาพรวมจังหวัดปราจีนบุรี", None, None, None, mock_event
    )
    assert spatial == "PROVINCE"

    # 5. Unknown -> UNKNOWN (never synthetic coordinates!)
    spatial, prec, dist = EventInformationService.correlate_spatial(
        "รายงานสภาพอากาศภาคตะวันออก", None, None, None, mock_event
    )
    assert spatial == "UNKNOWN"


def test_temporal_correlation_no_causation():
    """Verifies Section 9: Temporal alignment indicates shared operational time window; does NOT imply causation."""
    event_start = datetime.now(timezone.utc) - timedelta(days=2)
    event_end = datetime.now(timezone.utc) + timedelta(days=1)

    # During event
    during_pub = datetime.now(timezone.utc) - timedelta(hours=12)
    rel = EventInformationService.correlate_temporal(during_pub, None, event_start, event_end)
    assert rel == "TEMPORAL_ALIGNMENT"

    # Way in the past
    old_pub = datetime.now(timezone.utc) - timedelta(days=30)
    rel_old = EventInformationService.correlate_temporal(old_pub, None, event_start, event_end)
    assert rel_old == "OUTSIDE_WINDOW"


def test_public_information_api_fail_closed(client: TestClient, db_session: Session):
    """Verifies Sections 26 & 27: Public API excludes non-public items and strips internal staff PII."""
    # Create internal-only item
    internal_item = ExternalInformation(
        id=f"INF-INTERNAL-{datetime.now().timestamp()}",
        source_id="internal_source",
        source_name="หน่วยงานภายใน",
        source_type="GOVERNMENT_WEBSITE",
        authority_level="OFFICIAL",
        source_platform="PORTAL",
        source_url="https://internal.example.com",
        title="ข้อมูลภายในห้ามเปิดเผย",
        summary="สรุปภายใน",
        content_hash="internalhash123",
        publication_status="INTERNAL_ONLY",
        verification_status="UNVERIFIED",
        provenance={"confidential": True}
    )
    db_session.add(internal_item)
    db_session.commit()

    # Query public API
    res = client.get("/api/public/information")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

    # Internal item must NOT appear in public list
    ids = [d["id"] for d in data]
    assert internal_item.id not in ids

    # Single item query on internal item must return 404 (Fail-closed)
    single_res = client.get(f"/api/public/information/{internal_item.id}")
    assert single_res.status_code == 404

    # Ensure public items do NOT contain staff PII
    for item in data:
        assert "submitted_by" not in item
        assert "reviewer_notes" not in item
        assert "actor_id" not in item


def test_public_event_linked_information(client: TestClient):
    """Verifies Section 22: GET /api/public/events/{event_id}/information returns correlated info."""
    res = client.get("/api/public/events/MEV-20261008-001/information")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    # The default reconciliation seeds items linked to MEV-20261008-001
    assert len(data) >= 1
    for item in data:
        assert item["monitoring_event_id"] == "MEV-20261008-001"
        assert item["title"] is not None
        assert item["source_name"] is not None
        assert item["authority_level"] in ("OFFICIAL", "PRIMARY", "SECONDARY", "PUBLIC", "UNVERIFIED")


def test_contradicting_information_handling(db_session: Session):
    """Verifies Section 39: Contradicting information is preserved with contradiction notes, not merged blindly."""
    contra_item = EventInformationService.ingest_candidate(
        db_session,
        {
            "source_id": "prachin_local_news",
            "source_name": "ข่าวท้องถิ่น",
            "source_url": "https://news.example.com/report-normal",
            "canonical_url": "https://news.example.com/report-normal",
            "title": "ระดับน้ำในจุดตรวจวัดยังอยู่ในเกณฑ์ปกติ ไม่พบภาวะวิกฤต",
            "summary": "ผลสำรวจระดับน้ำช่วงเช้าพบว่ายังไม่ล้นตลิ่ง",
            "district": "กบินทร์บุรี",
            "contradiction_note": "มีข้อมูลจากแหล่งที่มีข้อเท็จจริงขัดแย้ง: รายงานว่าระดับน้ำปกติ",
            "verification_status": "DISPUTED"
        }
    )
    assert contra_item.contradiction_note is not None
    assert "ขัดแย้ง" in contra_item.contradiction_note


# ==============================================================================
# SECTION 33: REGRESSION TEST SUITE FOR REAL SOURCE INTEGRITY
# ==============================================================================

def test_regression_01_local_source_rejected():
    """1. .local source rejected (SSRF & DNS validation)."""
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://prachinnews.local/article/1", require_resolvable=True)
    assert SourceMetadataService.check_dns_resolvable("http://prachinnews.local") is False


def test_regression_02_localhost_source_rejected():
    """2. localhost source rejected."""
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://localhost:8000/api")
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("http://127.0.0.1:8000/api")


def test_regression_03_fake_domain_source_rejected():
    """3. fake domain source rejected (NXDOMAIN)."""
    assert SourceMetadataService.check_dns_resolvable("https://non-existent-fake-domain-1234567.invalid") is False
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url("https://non-existent-fake-domain-1234567.invalid/news", require_resolvable=True)


def test_regression_04_unreachable_source_handled_gracefully(db_session: Session):
    """4. unreachable source handled gracefully (SOURCE_UNAVAILABLE / DNS_ERROR)."""
    item = EventInformationService.ingest_candidate(
        db_session,
        {
            "source_id": "pcd_water_quality",
            "source_name": "กรมควบคุมมลพิษ",
            "source_url": "https://unreachable-pcd-mirror-999.invalid/bulletin",
            "title": "รายงานคุณภาพน้ำ",
            "summary": "สรุปข้อมูลน้ำ",
            "authority_level": "OFFICIAL",
            "source_status": "DNS_ERROR"
        }
    )
    assert item.source_status == "DNS_ERROR"
    # Must NOT be marked PUBLIC_SAFE if source is in error state
    assert item.publication_status != "PUBLIC_SAFE"


def test_regression_05_valid_real_source_accepted():
    """5. valid real source accepted."""
    assert SourceMetadataService.check_dns_resolvable("https://disaster.gistda.or.th") is True
    validated = SourceMetadataService.validate_safe_url("https://disaster.gistda.or.th", require_resolvable=True)
    assert validated == "https://disaster.gistda.or.th"


def test_regression_06_source_metadata_extraction():
    """6. source metadata extraction (title, description from HTML)."""
    html = """
    <html>
      <head>
        <meta property="og:title" content="สถานการณ์น้ำท่วมกบินทร์บุรีล่าสุด" />
        <meta property="og:description" content="กรมชลประทานรายงานสถานการณ์น้ำล้นตลิ่ง" />
      </head>
      <body><p>Content</p></body>
    </html>
    """
    title, desc = SourceMetadataService.extract_text_metadata(html)
    assert title == "สถานการณ์น้ำท่วมกบินทร์บุรีล่าสุด"
    assert desc == "กรมชลประทานรายงานสถานการณ์น้ำล้นตลิ่ง"


def test_regression_07_og_image_extraction():
    """7. og:image extraction from real source markup."""
    html = """
    <html>
      <head>
        <meta property="og:image" content="https://disaster.gistda.or.th/img/flood_map.png" />
      </head>
    </html>
    """
    res = SourceMetadataService.extract_image_tags_from_html(html, "https://disaster.gistda.or.th")
    assert res is not None
    assert res[0] == "https://disaster.gistda.or.th/img/flood_map.png"
    assert res[1] == "OG_IMAGE"


def test_regression_08_missing_image_returns_none_and_none_type():
    """8. missing image truthfully returns None (no fake placeholders)."""
    html = "<html><head><title>No image page</title></head><body>No pictures</body></html>"
    res = SourceMetadataService.extract_image_tags_from_html(html, "https://example.com")
    assert res is None


def test_regression_09_broken_image_handled_gracefully():
    """9. broken / SSRF image rejected gracefully."""
    bad_html = '<html><head><meta property="og:image" content="http://127.0.0.1/hack.png" /></head></html>'
    img = SourceMetadataService.extract_image_tags_from_html(bad_html, "https://valid.com")
    assert img is not None
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url(img[0])


def test_regression_10_canonical_url_preservation(db_session: Session):
    """10. canonical URL preserved and distinguished from query tracking URL."""
    item = EventInformationService.ingest_candidate(
        db_session,
        {
            "source_id": "thaipbs_news",
            "source_name": "Thai PBS",
            "source_url": "https://www.thaipbs.or.th/news/content/558067?fbclid=tracking123",
            "canonical_url": "https://www.thaipbs.or.th/news/content/558067",
            "title": "ข่าวน้ำท่วม",
            "summary": "สรุปข่าว",
            "authority_level": "SECONDARY"
        }
    )
    assert item.canonical_url == "https://www.thaipbs.or.th/news/content/558067"
    assert item.source_url == "https://www.thaipbs.or.th/news/content/558067?fbclid=tracking123"


def test_regression_11_demo_record_excluded_from_public_api(client: TestClient, db_session: Session):
    """11. demo record excluded from public API."""
    demo_item = ExternalInformation(
        id=f"INF-DEMO-{datetime.now().timestamp()}",
        source_id="demo_source",
        source_name="Demo News",
        source_type="NEWS_MEDIA",
        authority_level="SECONDARY",
        source_platform="ONLINE_NEWS",
        source_url="https://valid.example.com/demo-news",
        canonical_url="https://valid.example.com/demo-news",
        title="Demo Flood Data Test",
        summary="This is demo data",
        content_hash=f"demohash-{datetime.now().timestamp()}",
        publication_status="PUBLIC_SAFE",
        verification_status="UNVERIFIED",
        is_demo=True,
        source_status="DEMO",
        provenance={"test": True}
    )
    db_session.add(demo_item)
    db_session.commit()

    resp = client.get("/api/public/information")
    assert resp.status_code == 200
    ids = [x["id"] for x in resp.json()]
    assert demo_item.id not in ids


def test_regression_12_source_attribution_integrity(client: TestClient):
    """12. source attribution (agency, authority level, verification status) preserved."""
    resp = client.get("/api/public/information")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) > 0
    for item in items:
        assert item["source_name"] is not None
        assert item["source_type"] in ("OFFICIAL_DATA", "OFFICIAL_ANNOUNCEMENT", "GOVERNMENT_WEBSITE", "NEWS_MEDIA", "PUBLIC_SOCIAL", "CITIZEN_OBSERVATION", "OTHER_PUBLIC_SOURCE")
        assert item["authority_level"] in ("OFFICIAL", "PRIMARY", "SECONDARY", "PUBLIC", "UNVERIFIED")
        assert item["source_status"] == "AVAILABLE"
        assert item["is_demo"] is False


def test_regression_13_timestamp_separation(db_session: Session):
    """13. timestamp separation (published_at vs observed_at vs retrieved_at)."""
    t_pub = datetime(2026, 10, 8, 10, 0, tzinfo=timezone.utc)
    t_obs = datetime(2026, 10, 8, 9, 30, tzinfo=timezone.utc)
    t_ret = datetime(2026, 10, 8, 10, 15, tzinfo=timezone.utc)

    item = EventInformationService.ingest_candidate(
        db_session,
        {
            "source_id": "rid_reservoir",
            "source_name": "กรมชลประทาน",
            "source_url": "https://www.rid.go.th/sample-ts",
            "title": "การตรวจวัดอ่างเก็บน้ำ",
            "summary": "ระดับน้ำ",
            "published_at": t_pub,
            "observed_at": t_obs,
            "retrieved_at": t_ret,
            "authority_level": "OFFICIAL"
        }
    )
    assert item.published_at == t_pub
    assert item.observed_at == t_obs
    assert item.retrieved_at is not None
    assert item.published_at != item.retrieved_at


def test_regression_14_deduplication(db_session: Session):
    """14. deduplication detects same content hash and canonical URL."""
    base_url = f"https://www.rid.go.th/dedup-test-{datetime.now().timestamp()}"
    i1 = EventInformationService.ingest_candidate(
        db_session,
        {"source_id": "rid_reservoir", "source_name": "RID", "source_url": base_url, "canonical_url": base_url, "title": "รายงาน", "summary": "สรุป"}
    )
    assert i1.is_duplicate is False

    i2 = EventInformationService.ingest_candidate(
        db_session,
        {"source_id": "rid_reservoir", "source_name": "RID Repost", "source_url": f"{base_url}?share=1", "canonical_url": base_url, "title": "รายงาน", "summary": "สรุป"}
    )
    assert i2.is_duplicate is True
    assert i2.source_group_id == (i1.source_group_id or i1.id)


def test_regression_15_event_linkage(db_session: Session):
    """15. event linkage separates spatial_relevance, temporal_relevance, and event_relevance."""
    item = EventInformationService.ingest_candidate(
        db_session,
        {
            "source_id": "gistda_flood_map",
            "source_name": "GISTDA",
            "source_url": f"https://disaster.gistda.or.th/link-test-{datetime.now().timestamp()}",
            "title": "แผนที่ดาวเทียม",
            "summary": "พื้นที่น้ำท่วม",
            "monitoring_event_id": "MEV-20261008-001",
            "spatial_relevance": "DISTRICT",
            "temporal_relevance": "TEMPORAL_ALIGNMENT",
            "event_relevance": "STRONGLY_RELEVANT",
            "authority_level": "OFFICIAL"
        }
    )
    assert item.spatial_relevance == "DISTRICT"
    assert item.temporal_relevance == "TEMPORAL_ALIGNMENT"
    assert item.event_relevance == "STRONGLY_RELEVANT"


def test_regression_16_public_api_filtering(client: TestClient):
    """16. public API filtering blocks non-AVAILABLE, demo, or invalid URLs."""
    resp = client.get("/api/public/information")
    assert resp.status_code == 200
    for card in resp.json():
        assert card["is_demo"] is False
        assert card["source_status"] == "AVAILABLE"
        assert card["publication_status"] == "PUBLIC_SAFE"
        assert not card["source_url"].startswith("http://localhost")
        assert ".local" not in card["source_url"]


def test_regression_17_pii_sanitization(client: TestClient):
    """17. PII sanitization verifies no employee/internal secrets are exposed."""
    resp = client.get("/api/public/information")
    assert resp.status_code == 200
    for card in resp.json():
        for forbidden_key in ("staff_email", "author_phone", "reviewer_id", "submitted_by", "actor_id"):
            assert forbidden_key not in card

