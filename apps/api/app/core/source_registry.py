"""
FloodTrace Event-Centric Source Registry & Connector Architecture
==================================================================
Adheres to Master Principle: TRUTH > IMPRESSIVE RESULTS
Sections: 3, 4, 5, 6, 7, 13, 28, 56, 57, 58

Taxonomies:
- SourceType: OFFICIAL_DATA, OFFICIAL_ANNOUNCEMENT, GOVERNMENT_WEBSITE,
              NEWS_MEDIA, PUBLIC_SOCIAL, CITIZEN_OBSERVATION, OTHER_PUBLIC_SOURCE
- AuthorityLevel: OFFICIAL, PRIMARY, SECONDARY, PUBLIC, UNVERIFIED
- OperationalStatus: ACTIVE, LIMITED, DISABLED, ERROR, MANUAL_ONLY, NOT_CONFIGURED, DISCOVERY_ONLY

Connectors provide failure isolation (Section 57):
A failure in any connector never cascades into system-wide failure.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import logging
from abc import ABC, abstractmethod
from pydantic import BaseModel, Field

from apps.api.app.services.source_metadata_service import SourceMetadataService

logger = logging.getLogger(__name__)


# ============================================================================
# Section 3: Target Information Source Taxonomy
# ============================================================================

class SourceType(str, Enum):
    OFFICIAL_DATA = "OFFICIAL_DATA"                   # Structured hydrological, rainfall, lab telemetry
    OFFICIAL_ANNOUNCEMENT = "OFFICIAL_ANNOUNCEMENT"   # Formal government agency notice or press release
    GOVERNMENT_WEBSITE = "GOVERNMENT_WEBSITE"         # Information page from official gov domain
    NEWS_MEDIA = "NEWS_MEDIA"                         # Professional news outlets and journalistic reporting
    PUBLIC_SOCIAL = "PUBLIC_SOCIAL"                   # Public social media posts/pages (open public model only)
    CITIZEN_OBSERVATION = "CITIZEN_OBSERVATION"       # Ground observations submitted by citizens
    OTHER_PUBLIC_SOURCE = "OTHER_PUBLIC_SOURCE"       # Miscellaneous verified public documentation


class AuthorityLevel(str, Enum):
    OFFICIAL = "OFFICIAL"       # Government agency with formal legal/statutory jurisdiction
    PRIMARY = "PRIMARY"         # First-party primary reporter or direct research institution
    SECONDARY = "SECONDARY"     # Secondary news aggregator or journalistic coverage
    PUBLIC = "PUBLIC"           # General public channel or community group
    UNVERIFIED = "UNVERIFIED"   # Source identity or authority has not yet been corroborated


class OperationalStatus(str, Enum):
    ACTIVE = "ACTIVE"                   # Operational, accessible, actively refreshes
    LIMITED = "LIMITED"                 # Operational with rate limits, partial coverage, or discovery-only
    DISABLED = "DISABLED"               # Explicitly turned off
    ERROR = "ERROR"                     # Upstream service failed (fails closed)
    MANUAL_ONLY = "MANUAL_ONLY"         # Ingested exclusively through verified operator submission
    NOT_CONFIGURED = "NOT_CONFIGURED"   # Defined in registry but required credentials/tokens absent
    DISCOVERY_ONLY = "DISCOVERY_ONLY"   # Schema discovery and metadata indexing only


class SourceDefinition(BaseModel):
    source_id: str
    source_name: str
    platform: str
    domain: Optional[str] = None
    source_type: SourceType
    authority_level: AuthorityLevel
    enabled: bool = True
    operational_status: OperationalStatus = OperationalStatus.ACTIVE
    ingestion_method: str  # REST_API, RSS_FEED, HTML_METADATA, MANUAL_IMPORT, CITIZEN_STREAM
    access_method: str     # PUBLIC_SAFE, API_KEY, RESTRICTED, OPERATOR_VERIFIED
    refresh_interval: str  # e.g., "15 นาที", "1 ชั่วโมง", "ตามเหตุการณ์"
    geographic_scope: str  # e.g., "ปราจีนบุรี", "ลุ่มน้ำปราจีนบุรี", "ระดับประเทศ"
    supported_content_types: List[str] = Field(default_factory=list)
    terms_constraints: str
    notes: Optional[str] = None
    last_checked_at: Optional[str] = None


# ============================================================================
# Section 4 & 5: Source Registry Store
# ============================================================================

REGISTERED_SOURCES: Dict[str, SourceDefinition] = {
    # 1. Official Hydrological Data
    "thaiwater_telemetry": SourceDefinition(
        source_id="thaiwater_telemetry",
        source_name="สถาบันสารสนเทศทรัพยากรน้ำ (สสน.) - คลังข้อมูลน้ำแห่งชาติ",
        platform="THAIWATER_API",
        domain="thaiwater.net",
        source_type=SourceType.OFFICIAL_DATA,
        authority_level=AuthorityLevel.OFFICIAL,
        enabled=True,
        operational_status=OperationalStatus.ACTIVE,
        ingestion_method="REST_API",
        access_method="PUBLIC_SAFE",
        refresh_interval="15 นาที",
        geographic_scope="ลุ่มน้ำปราจีนบุรี (26 สถานีโทรมาตรลำน้ำ, 77 สถานีน้ำฝน)",
        supported_content_types=["WATER_LEVEL", "DISCHARGE", "RAINFALL"],
        terms_constraints="ThaiWater Standard Public Data Terms. ใช้งานเพื่อสาธารณประโยชน์",
        notes="ข้อมูลระดับน้ำและฝนสะสมอัตโนมัติ 24 ชั่วโมง"
    ),

    # 2. RID Reservoir & Waterways
    "rid_reservoir": SourceDefinition(
        source_id="rid_reservoir",
        source_name="กรมชลประทาน (Royal Irrigation Department)",
        platform="RID_PORTAL",
        domain="rid.go.th",
        source_type=SourceType.OFFICIAL_DATA,
        authority_level=AuthorityLevel.OFFICIAL,
        enabled=True,
        operational_status=OperationalStatus.ACTIVE,
        ingestion_method="REST_API",
        access_method="PUBLIC_SAFE",
        refresh_interval="1 ชั่วโมง",
        geographic_scope="อ่างเก็บน้ำนฤบดินทรจินดา และคลองส่งน้ำปราจีนบุรี",
        supported_content_types=["STORAGE_VOLUME", "INFLOW_OUTFLOW", "CAPACITY_RATIO"],
        terms_constraints="RID Public Hydrology Portal",
        notes="ข้อมูลความจุและการระบายน้ำอ่างเก็บน้ำหลักในจังหวัดปราจีนบุรี"
    ),

    # 3. PCD Water Quality
    "pcd_water_quality": SourceDefinition(
        source_id="pcd_water_quality",
        source_name="กรมควบคุมมลพิษ (Pollution Control Department)",
        platform="GOV_PORTAL",
        domain="pcd.go.th",
        source_type=SourceType.OFFICIAL_ANNOUNCEMENT,
        authority_level=AuthorityLevel.OFFICIAL,
        enabled=True,
        operational_status=OperationalStatus.ACTIVE,
        ingestion_method="MANUAL_IMPORT",
        access_method="PUBLIC_SAFE",
        refresh_interval="ตามรอบการตรวจวัด",
        geographic_scope="แม่น้ำปราจีนบุรีและคลองสาขา",
        supported_content_types=["DO", "BOD", "AMMONIA", "WATER_QUALITY_INDEX"],
        terms_constraints="ประกาศผลตรวจวัดคุณภาพน้ำทางการ. ไม่สรุปการปนเปื้อนเกินหลักฐาน",
        notes="ข้อมูลผลการตรวจวัดคุณภาพน้ำผิวดินและการรายงานความผิดปกติ"
    ),

    # 4. GISTDA Disaster & Satellite Extent
    "gistda_disaster": SourceDefinition(
        source_id="gistda_disaster",
        source_name="สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (GISTDA)",
        platform="GISTDA_DISASTER",
        domain="disaster.gistda.or.th",
        source_type=SourceType.OFFICIAL_ANNOUNCEMENT,
        authority_level=AuthorityLevel.OFFICIAL,
        enabled=True,
        operational_status=OperationalStatus.ACTIVE,
        ingestion_method="REST_API",
        access_method="PUBLIC_SAFE",
        refresh_interval="รอบผ่านดาวเทียม (รายวัน)",
        geographic_scope="พื้นที่น้ำท่วมขังและพื้นที่เสี่ยงจังหวัดปราจีนบุรี",
        supported_content_types=["FLOOD_EXTENT_RASTER", "SATELLITE_OBSERVATION"],
        terms_constraints="GISTDA Disaster Portal Terms",
        notes="การวิเคราะห์ขอบเขตพื้นที่น้ำท่วมจากภาพถ่ายดาวเทียม Sentinel/Radarsat"
    ),

    # 5. Prachin Buri Provincial Public Relations
    "prachinburi_provincial_office": SourceDefinition(
        source_id="prachinburi_provincial_office",
        source_name="สำนักงานประชาสัมพันธ์จังหวัดปราจีนบุรี",
        platform="PRD_PORTAL",
        domain="prachinburi.prd.go.th",
        source_type=SourceType.OFFICIAL_ANNOUNCEMENT,
        authority_level=AuthorityLevel.OFFICIAL,
        enabled=True,
        operational_status=OperationalStatus.ACTIVE,
        ingestion_method="HTML_METADATA",
        access_method="PUBLIC_SAFE",
        refresh_interval="รายชั่วโมง",
        geographic_scope="จังหวัดปราจีนบุรี (ทุกอำเภอ)",
        supported_content_types=["DISASTER_WARNING", "PROVINCIAL_BULLETIN"],
        terms_constraints="ข้อมูลข่าวสารราชการเพื่อประชาชน",
        notes="ประกาศแจ้งเตือนสถานการณ์น้ำล้นตลิ่งและการบรรเทาสาธารณภัย"
    ),

    # 6. Kabin Buri District Office (Awaiting public API endpoint verification)
    "kabinburi_district_office": SourceDefinition(
        source_id="kabinburi_district_office",
        source_name="ที่ว่าการอำเภอกบินทร์บุรี",
        platform="DOPA_PORTAL",
        domain=None,
        source_type=SourceType.OFFICIAL_ANNOUNCEMENT,
        authority_level=AuthorityLevel.OFFICIAL,
        enabled=False,
        operational_status=OperationalStatus.NOT_CONFIGURED,
        ingestion_method="HTML_METADATA",
        access_method="PUBLIC_SAFE",
        refresh_interval="ตามเหตุการณ์",
        geographic_scope="อำเภอกบินทร์บุรี (ตลาดเก่า, เทศบาลกบินทร์, ชุมชนริมน้ำ)",
        supported_content_types=["LOCAL_ANNOUNCEMENT", "WARNING_NOTICE"],
        terms_constraints="ประกาศทางการระดับอำเภอ (อยู่ระหว่างจัดเตรียมช่องทางเชื่อมต่อ)",
        notes="รายงานระดับน้ำล้นตลิ่งแควหนุมานและแควพระปรง"
    ),

    # 7. Thai PBS Environmental & Disaster News
    "thaipbs_news": SourceDefinition(
        source_id="thaipbs_news",
        source_name="ไทยพีบีเอส (Thai PBS News)",
        platform="NEWS_MEDIA",
        domain="thaipbs.or.th",
        source_type=SourceType.NEWS_MEDIA,
        authority_level=AuthorityLevel.SECONDARY,
        enabled=True,
        operational_status=OperationalStatus.ACTIVE,
        ingestion_method="RSS_FEED",
        access_method="PUBLIC_SAFE",
        refresh_interval="30 นาที",
        geographic_scope="จังหวัดปราจีนบุรีและระดับภูมิภาค",
        supported_content_types=["ARTICLE", "PHOTO_REPORT", "VIDEO_REPORT"],
        terms_constraints="การอ้างอิงข่าวสาธารณะพร้อมระบุแหล่งที่มาและลิงก์ต้นฉบับอย่างชัดเจน",
        notes="รายงานข่าวสารเหตุการณ์อุทกภัยและผลกระทบต่อสิ่งแวดล้อม"
    ),

    # 8. Local Prachin Media (Quarantined: No verified live domain configured)
    "prachin_local_news": SourceDefinition(
        source_id="prachin_local_news",
        source_name="สื่อข่าวท้องถิ่นปราจีนบุรี (Prachin Local News)",
        platform="ONLINE_NEWS",
        domain=None,
        source_type=SourceType.NEWS_MEDIA,
        authority_level=AuthorityLevel.SECONDARY,
        enabled=False,
        operational_status=OperationalStatus.NOT_CONFIGURED,
        ingestion_method="RSS_FEED",
        access_method="PUBLIC_SAFE",
        refresh_interval="1 ชั่วโมง",
        geographic_scope="อำเภอกบินทร์บุรี, ศรีมหาโพธิ, เมืองปราจีนบุรี",
        supported_content_types=["ARTICLE", "LOCAL_REPORT"],
        terms_constraints="สื่อท้องถิ่นอิสระ ต้องตรวจสอบโดเมนสาธารณะจริงก่อนเปิดใช้งาน",
        notes="สถานะ NOT_CONFIGURED เพื่อป้องกัน URL หลอก (.local) ปรากฏในระบบสาธารณะ"
    ),

    # 9. Public Social Sources (Section 13 Compliance)
    "facebook_public_pages": SourceDefinition(
        source_id="facebook_public_pages",
        source_name="แหล่งข่าวและเพจสาธารณะ (Public Social Pages)",
        platform="PUBLIC_SOCIAL",
        domain="facebook.com",
        source_type=SourceType.PUBLIC_SOCIAL,
        authority_level=AuthorityLevel.PUBLIC,
        enabled=True,
        operational_status=OperationalStatus.LIMITED,
        ingestion_method="MANUAL_IMPORT",
        access_method="PUBLIC_SAFE",
        refresh_interval="ตามการส่งข้อมูลของเจ้าหน้าที่",
        geographic_scope="จังหวัดปราจีนบุรี",
        supported_content_types=["PUBLIC_POST", "CITIZEN_PHOTO"],
        terms_constraints=(
            "ห้ามขูดข้อมูลบัญชีส่วนตัว ห้ามดึงข้อมูลกลุ่มปิด เข้าถึงเฉพาะโพสต์สาธารณะตามข้อกำหนดของแพลตฟอร์ม "
            "สถานะการเชื่อมต่อ: LIMITED (ต้องผ่านการตรวจสอบโดยผู้ควบคุมก่อนเผยแพร่)"
        ),
        notes="แหล่งข้อมูลสาธารณะ ไม่นับเป็นข้อเท็จจริงทางการจนกว่าจะได้รับการสมทบหลักฐาน"
    ),

    # 10. Citizen Observation Stream
    "citizen_observation": SourceDefinition(
        source_id="citizen_observation",
        source_name="รายงานข้อสังเกตจากประชาชน (FloodTrace Citizen Portal)",
        platform="CITIZEN_PORTAL",
        domain="floodtrace.org",
        source_type=SourceType.CITIZEN_OBSERVATION,
        authority_level=AuthorityLevel.UNVERIFIED,
        enabled=True,
        operational_status=OperationalStatus.ACTIVE,
        ingestion_method="CITIZEN_STREAM",
        access_method="PUBLIC_SAFE",
        refresh_interval="ตามเวลาจริง",
        geographic_scope="จังหวัดปราจีนบุรี (7 อำเภอ)",
        supported_content_types=["FIELD_REPORT", "OBSERVATION"],
        terms_constraints="คุ้มครองข้อมูลส่วนบุคคล (PII) ไม่เปิดเผยชื่อผู้แจ้งหรือพิกัดบ้านเรือนส่วนบุคคล",
        notes="รายงานข้อสังเกตจากประชาชนเพื่อการเฝ้าระวังเบื้องต้น (ยังไม่ยืนยัน)"
    )
}


# ============================================================================
# Section 56 & 57: Source Connector Interface & Isolation
# ============================================================================

class BaseSourceConnector(ABC):
    """
    Abstract Connector Interface per Section 56.
    Responsibilities:
    - discover()
    - fetch()
    - parse()
    - normalize()
    - validate()
    - extract_media()
    
    Guarantees Failure Isolation (Section 57):
    A failure in any connector must never break the entire platform.
    """
    def __init__(self, definition: SourceDefinition):
        self.definition = definition

    @abstractmethod
    def discover(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Finds candidate information items relevant to monitoring event context."""
        pass

    @abstractmethod
    def fetch(self, url: str) -> Optional[Dict[str, Any]]:
        """Retrieves raw content or metadata from the given URL."""
        pass

    @abstractmethod
    def parse(self, raw_data: Any) -> Dict[str, Any]:
        """Parses raw content into structured fields."""
        pass

    @abstractmethod
    def normalize(self, parsed_item: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes source data into canonical ExternalInformation format."""
        pass

    def validate(self, item: Dict[str, Any]) -> bool:
        """Validates that candidate item has mandatory canonical provenance."""
        if not item.get("title") or not item.get("source_url"):
            return False
        return True

    def extract_media(self, url: str) -> Dict[str, Any]:
        """
        Extracts preview image metadata using SSRF-hardened SourceMetadataService.
        Never throws unhandled exceptions; returns fallback gracefully.
        """
        try:
            return SourceMetadataService.get_metadata(url, agency=self.definition.source_name)
        except Exception as e:
            logger.warning(f"Media extraction failed safely for {url}: {e}")
            return {
                "source_domain": self.definition.domain,
                "source_image_url": None,
                "source_image_fetched_at": None,
                "image_source_type": "NONE"
            }


class OfficialAnnouncementConnector(BaseSourceConnector):
    """Connector for official government notices and announcements."""

    def discover(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        # Returns candidate announcements matching event district/keywords
        return []

    def fetch(self, url: str) -> Optional[Dict[str, Any]]:
        try:
            return self.extract_media(url)
        except Exception as e:
            logger.warning(f"OfficialAnnouncement fetch failed safely: {e}")
            return None

    def parse(self, raw_data: Any) -> Dict[str, Any]:
        return raw_data if isinstance(raw_data, dict) else {}

    def normalize(self, parsed_item: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        return {
            "source_id": self.definition.source_id,
            "source_name": self.definition.source_name,
            "source_type": self.definition.source_type.value,
            "authority_level": self.definition.authority_level.value,
            "source_platform": self.definition.platform,
            "source_domain": parsed_item.get("source_domain") or self.definition.domain,
            "source_url": parsed_item.get("source_url", ""),
            "canonical_url": parsed_item.get("canonical_url") or parsed_item.get("source_url", ""),
            "title": parsed_item.get("title", ""),
            "summary": parsed_item.get("summary", ""),
            "factual_details": parsed_item.get("factual_details", ""),
            "published_at": parsed_item.get("published_at", now_iso),
            "retrieved_at": now_iso,
            "verification_status": "OFFICIAL_VERIFIED",
            "publication_status": "PUBLIC_SAFE"
        }


class NewsMediaConnector(BaseSourceConnector):
    """Connector for accredited news media and journalistic feeds."""

    def discover(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        return []

    def fetch(self, url: str) -> Optional[Dict[str, Any]]:
        try:
            return self.extract_media(url)
        except Exception as e:
            logger.warning(f"NewsMedia fetch failed safely: {e}")
            return None

    def parse(self, raw_data: Any) -> Dict[str, Any]:
        return raw_data if isinstance(raw_data, dict) else {}

    def normalize(self, parsed_item: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        return {
            "source_id": self.definition.source_id,
            "source_name": self.definition.source_name,
            "source_type": self.definition.source_type.value,
            "authority_level": self.definition.authority_level.value,
            "source_platform": self.definition.platform,
            "source_domain": parsed_item.get("source_domain") or self.definition.domain,
            "source_url": parsed_item.get("source_url", ""),
            "canonical_url": parsed_item.get("canonical_url") or parsed_item.get("source_url", ""),
            "title": parsed_item.get("title", ""),
            "summary": parsed_item.get("summary", ""),
            "published_at": parsed_item.get("published_at", now_iso),
            "retrieved_at": now_iso,
            "verification_status": "CORROBORATED",
            "publication_status": "PUBLIC_SAFE"
        }


class PublicSocialConnector(BaseSourceConnector):
    """
    Connector for public social channels per Section 13.
    Strictly forbids private scraping or auth bypass.
    Operational status is LIMITED or NOT_CONFIGURED.
    """

    def discover(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        # Fails closed if direct public API access is not configured
        if self.definition.operational_status == OperationalStatus.NOT_CONFIGURED:
            logger.info("Public social connector is NOT_CONFIGURED; discovery returns empty safely.")
            return []
        return []

    def fetch(self, url: str) -> Optional[Dict[str, Any]]:
        return self.extract_media(url)

    def parse(self, raw_data: Any) -> Dict[str, Any]:
        return raw_data if isinstance(raw_data, dict) else {}

    def normalize(self, parsed_item: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        return {
            "source_id": self.definition.source_id,
            "source_name": self.definition.source_name,
            "source_type": self.definition.source_type.value,
            "authority_level": self.definition.authority_level.value,
            "source_platform": self.definition.platform,
            "source_domain": "facebook.com",
            "source_url": parsed_item.get("source_url", ""),
            "canonical_url": parsed_item.get("canonical_url") or parsed_item.get("source_url", ""),
            "title": parsed_item.get("title", ""),
            "summary": parsed_item.get("summary", ""),
            "published_at": parsed_item.get("published_at", now_iso),
            "retrieved_at": now_iso,
            "verification_status": "UNVERIFIED",
            "publication_status": "PUBLIC_SAFE"
        }


# Registry of instantiated connectors
CONNECTOR_INSTANCES: Dict[str, BaseSourceConnector] = {
    "prachinburi_provincial_office": OfficialAnnouncementConnector(REGISTERED_SOURCES["prachinburi_provincial_office"]),
    "kabinburi_district_office": OfficialAnnouncementConnector(REGISTERED_SOURCES["kabinburi_district_office"]),
    "pcd_water_quality": OfficialAnnouncementConnector(REGISTERED_SOURCES["pcd_water_quality"]),
    "thaipbs_news": NewsMediaConnector(REGISTERED_SOURCES["thaipbs_news"]),
    "prachin_local_news": NewsMediaConnector(REGISTERED_SOURCES["prachin_local_news"]),
    "facebook_public_pages": PublicSocialConnector(REGISTERED_SOURCES["facebook_public_pages"]),
}


class SourceRegistry:
    """Public interface for inspecting registered sources and operational connectors."""

    @classmethod
    def list_sources(cls, enabled_only: bool = True) -> List[Dict[str, Any]]:
        """Returns public metadata of all sources in the registry."""
        sources = []
        for src in REGISTERED_SOURCES.values():
            if enabled_only and not src.enabled:
                continue
            sources.append(src.model_dump())
        return sources

    @classmethod
    def get_source(cls, source_id: str) -> Optional[SourceDefinition]:
        return REGISTERED_SOURCES.get(source_id)

    @classmethod
    def get_connector(cls, source_id: str) -> Optional[BaseSourceConnector]:
        return CONNECTOR_INSTANCES.get(source_id)

    @classmethod
    def get_operational_summary(cls) -> Dict[str, Any]:
        """Provides operational health summary of all connectors."""
        counts = {status.value: 0 for status in OperationalStatus}
        for src in REGISTERED_SOURCES.values():
            counts[src.operational_status.value] += 1
        return {
            "total_sources": len(REGISTERED_SOURCES),
            "status_breakdown": counts,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
