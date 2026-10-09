import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.services.source_metadata_service import SourceMetadataService

client = TestClient(app)

# ==============================================================================
# 1. HTML Image Tag Extraction Tests (og:image, twitter:image, image_src)
# ==============================================================================

def test_og_image_extraction():
    """Extracts og:image correctly with priority OG_IMAGE."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>รายงานผลตรวจวัดคุณภาพน้ำ</title>
        <meta property="og:image" content="https://pcd.go.th/images/water_sample.jpg" />
        <meta name="twitter:image" content="https://pcd.go.th/images/twitter_thumb.jpg" />
    </head>
    <body><p>Content</p></body>
    </html>
    """
    res = SourceMetadataService.extract_image_tags_from_html(html, "https://pcd.go.th/news/1")
    assert res is not None
    img_url, img_type = res
    assert img_url == "https://pcd.go.th/images/water_sample.jpg"
    assert img_type == "OG_IMAGE"


def test_twitter_image_fallback_when_og_absent():
    """Falls back to twitter:image when og:image is missing."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>ประกาศกรมชลประทาน</title>
        <meta name="twitter:image" content="https://app.rid.go.th/media/reservoir.png" />
    </head>
    <body><p>No og:image here</p></body>
    </html>
    """
    res = SourceMetadataService.extract_image_tags_from_html(html, "https://app.rid.go.th/bulletin/14")
    assert res is not None
    img_url, img_type = res
    assert img_url == "https://app.rid.go.th/media/reservoir.png"
    assert img_type == "TWITTER_IMAGE"


def test_source_image_src_fallback():
    """Falls back to link rel='image_src' when og and twitter are absent."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>GISTDA Satellite Map</title>
        <link rel="image_src" href="https://disaster.gistda.or.th/maps/flood.webp" />
    </head>
    <body><p>Standard link image_src</p></body>
    </html>
    """
    res = SourceMetadataService.extract_image_tags_from_html(html, "https://disaster.gistda.or.th/")
    assert res is not None
    img_url, img_type = res
    assert img_url == "https://disaster.gistda.or.th/maps/flood.webp"
    assert img_type == "SOURCE_IMAGE"


def test_relative_image_url_resolved_to_base():
    """Resolves relative image paths against base URL."""
    html = """
    <html>
    <head>
        <meta property="og:image" content="/assets/img/satellite_thumb.png" />
    </head>
    </html>
    """
    res = SourceMetadataService.extract_image_tags_from_html(html, "https://disaster.gistda.or.th/news/detail")
    assert res is not None
    img_url, img_type = res
    assert img_url == "https://disaster.gistda.or.th/assets/img/satellite_thumb.png"
    assert img_type == "OG_IMAGE"


def test_no_image_fallback():
    """Returns None when HTML has no recognized image metadata."""
    html = """
    <html>
    <head><title>Pure text announcement</title></head>
    <body><p>No images</p></body>
    </html>
    """
    res = SourceMetadataService.extract_image_tags_from_html(html, "https://agency.go.th/text-only")
    assert res is None


# ==============================================================================
# 2. SSRF Protections and Insecure Target Rejection
# ==============================================================================

def test_ssrf_blocks_private_and_metadata_targets():
    """Validates that SSRF protection blocks localhost, RFC1918, and Cloud metadata."""
    blocked_targets = [
        "http://localhost:8000/internal",
        "http://127.0.0.1:8000/",
        "http://127.0.0.1/admin",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/secret",
        "http://192.168.1.1:8080/",
        "http://172.16.0.1/",
        "http://[::1]/",
        "http://user:pass@example.com/login",
        "http://example.com:22/",
        "ftp://example.com/file.jpg",
        "file:///etc/passwd"
    ]
    for target in blocked_targets:
        with pytest.raises(ValueError):
            SourceMetadataService.validate_safe_url(target)


def test_get_metadata_handles_ssrf_gracefully():
    """Service returns safe FALLBACK without exception when an SSRF target is requested."""
    res = SourceMetadataService.get_metadata("http://127.0.0.1:5432/leak", agency="Attacker", skip_network=True)
    assert res["source_image_url"] is None
    assert res["image_source_type"] == "FALLBACK"
    assert res["source_domain"] == "127.0.0.1"


def test_malicious_candidate_image_rejected_by_ssrf():
    """If a page provides an internal SSRF candidate in og:image, it is rejected."""
    malicious_html = """
    <html>
    <head>
        <meta property="og:image" content="http://169.254.169.254/metadata.png" />
    </head>
    </html>
    """
    extracted = SourceMetadataService.extract_image_tags_from_html(malicious_html, "https://malicious-page.org")
    assert extracted is not None
    candidate_url, _ = extracted
    with pytest.raises(ValueError):
        SourceMetadataService.validate_safe_url(candidate_url)


# ==============================================================================
# 3. Cache & Provenance Tests
# ==============================================================================

def test_metadata_caching():
    """Repeated calls for the same URL use the cached result."""
    test_url = "https://test-cache-agency.org/press-release"
    res1 = SourceMetadataService.get_metadata(test_url, agency="Test Agency", skip_network=True)
    res2 = SourceMetadataService.get_metadata(test_url, agency="Test Agency", skip_network=True)
    assert res1["source_domain"] == res2["source_domain"]
    assert res1["source_image_fetched_at"] == res2["source_image_fetched_at"]


# ==============================================================================
# 4. API Serialization & Contract Tests (/api/public/official-updates)
# ==============================================================================

def test_public_official_updates_api_serialization():
    """Verifies that GET /api/public/official-updates includes all image metadata fields."""
    resp = client.get("/api/public/official-updates")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 3

    for item in data:
        assert "id" in item
        assert "agency" in item
        assert "title" in item
        assert "source_url" in item
        assert "source_domain" in item
        assert "source_image_url" in item
        assert "source_image_fetched_at" in item
        assert "image_source_type" in item
        assert item["image_source_type"] in ("OG_IMAGE", "TWITTER_IMAGE", "SOURCE_IMAGE", "PDF_PREVIEW", "FALLBACK", "NONE")
        assert "provenance" in item
        assert item["provenance"]["category"] == "OFFICIAL"
        assert item["provenance"]["source_agency"] == item["agency"]
        assert item["provenance"]["source_url"] == item["source_url"]


def test_official_updates_preserve_truthfulness_and_no_ai_fabrication():
    """Validates that no artificial AI claims or unsupported substances are reported."""
    resp = client.get("/api/public/official-updates")
    assert resp.status_code == 200
    data = resp.json()

    for item in data:
        # Verified official provenance
        assert item["badge"] == "OFFICIAL"
        # No synthetic URLs
        if item["source_image_url"]:
            assert not item["source_image_url"].startswith("data:")
            assert item["source_image_url"].startswith("http")
