"""
FloodTrace External Evidence Schemas
Pydantic schemas and validation for manual/operator-submitted external evidence,
monitoring events, correlation analysis, and public/internal views.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl, field_validator


class SourcePlatformEnum(str, Enum):
    ONLINE_NEWS = "ONLINE_NEWS"
    FACEBOOK = "FACEBOOK"
    X_TWITTER = "X_TWITTER"
    LOCAL_COMMUNITY = "LOCAL_COMMUNITY"
    OFFICIAL_PUBLIC = "OFFICIAL_PUBLIC"
    PUBLIC_DOCUMENT = "PUBLIC_DOCUMENT"
    CITIZEN_REPORTING = "CITIZEN_REPORTING"
    SECONDARY_PUBLIC_SOURCE = "SECONDARY_PUBLIC_SOURCE"
    OTHER = "OTHER"


class EventTypeEnum(str, Enum):
    ABNORMAL_WATER_COLOR = "ABNORMAL_WATER_COLOR"
    FOAM = "FOAM"
    ODOR_REPORT = "ODOR_REPORT"
    FISH_KILL = "FISH_KILL"
    OIL_LIKE_SURFACE = "OIL_LIKE_SURFACE"
    WASTE_OR_DEBRIS = "WASTE_OR_DEBRIS"
    FLOODING = "FLOODING"
    UNUSUAL_WATER_CONDITION = "UNUSUAL_WATER_CONDITION"
    OTHER_ENVIRONMENTAL_ANOMALY = "OTHER_ENVIRONMENTAL_ANOMALY"
    COMMUNITY_IMPACT = "COMMUNITY_IMPACT"
    PROPERTY_IMPACT = "PROPERTY_IMPACT"
    ROAD_ACCESS = "ROAD_ACCESS"
    ROAD_FLOODING = "ROAD_FLOODING"
    TRAVEL_IMPACT = "TRAVEL_IMPACT"
    WATER_APPEARANCE = "WATER_APPEARANCE"
    ENVIRONMENTAL_OBSERVATION = "ENVIRONMENTAL_OBSERVATION"
    COMMUNITY_RESPONSE = "COMMUNITY_RESPONSE"
    ASSISTANCE_REQUEST = "ASSISTANCE_REQUEST"
    EVACUATION = "EVACUATION"
    INFRASTRUCTURE_IMPACT = "INFRASTRUCTURE_IMPACT"


class EvidenceTypeEnum(str, Enum):
    PHOTO = "PHOTO"
    VIDEO = "VIDEO"
    NEWS_ARTICLE = "NEWS_ARTICLE"
    SOCIAL_POST = "SOCIAL_POST"
    OFFICIAL_POST = "OFFICIAL_POST"
    PUBLIC_DOCUMENT = "PUBLIC_DOCUMENT"
    OTHER = "OTHER"


class VerificationStatusEnum(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    CORROBORATED = "CORROBORATED"
    OFFICIAL_VERIFIED = "OFFICIAL_VERIFIED"
    LAB_CONFIRMED = "LAB_CONFIRMED"
    DISPUTED = "DISPUTED"
    REJECTED = "REJECTED"
    STALE = "STALE"


class PublicationStatusEnum(str, Enum):
    PUBLIC = "PUBLIC"
    PUBLIC_SAFE = "PUBLIC_SAFE"
    INTERNAL_ONLY = "INTERNAL_ONLY"
    WITHHELD = "WITHHELD"
    HIDDEN = "HIDDEN"
    REJECTED = "REJECTED"


class RelationTypeEnum(str, Enum):
    PRIMARY_EVIDENCE = "PRIMARY_EVIDENCE"
    SUPPORTING_EVIDENCE = "SUPPORTING_EVIDENCE"
    RELATED_REPORT = "RELATED_REPORT"
    CONTRADICTING_EVIDENCE = "CONTRADICTING_EVIDENCE"


class LocationPrecisionEnum(str, Enum):
    EXACT = "EXACT"
    NEARBY = "NEARBY"
    DISTRICT = "DISTRICT"
    PROVINCE = "PROVINCE"
    UNKNOWN = "UNKNOWN"


class MediaReferenceInput(BaseModel):
    media_type: str = Field("PHOTO", description="PHOTO, VIDEO, DOCUMENT")
    source_media_url: str = Field(..., description="Original URL where media is hosted")
    sha256: Optional[str] = Field(None, description="SHA256 of media payload if available")
    captured_at: Optional[datetime] = None
    storage_policy: str = Field("REFERENCE_ONLY", description="REFERENCE_ONLY, FAIR_USE_THUMBNAIL, LICENSED")
    license_or_permission_status: str = Field("VIEW_AT_SOURCE_ONLY", description="VIEW_AT_SOURCE_ONLY, FAIR_USE_THUMBNAIL, PERMISSION_GRANTED")


# ==============================================================================
# Internal Schemas
# ==============================================================================

class ExternalEvidenceCreate(BaseModel):
    source_platform: SourcePlatformEnum
    source_name: str = Field(..., min_length=2, max_length=200, description="Name of source, news outlet, or public page")
    source_url: str = Field(..., min_length=5, description="Canonical source URL")
    published_at: Optional[datetime] = None
    observed_at: Optional[datetime] = None
    title_or_summary: str = Field(..., min_length=3, max_length=500, description="Objective title or summary of observation")
    description: Optional[str] = Field(None, description="Detailed text extracted from the source")
    text_excerpt: Optional[str] = Field(None, description="Direct text excerpt without commentary")
    event_type: EventTypeEnum
    evidence_type: EvidenceTypeEnum
    location_text: Optional[str] = Field(None, description="Reported area text")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_precision: LocationPrecisionEnum = LocationPrecisionEnum.UNKNOWN
    district: Optional[str] = None
    subdistrict: Optional[str] = None
    media_references: Optional[List[MediaReferenceInput]] = None
    submitter_notes: Optional[str] = None
    monitoring_event_id: Optional[str] = None
    parent_evidence_id: Optional[str] = Field(None, description="Original source ID if this is a repost/mirror")
    source_group_id: Optional[str] = Field(None, description="Cluster ID for related reposts/mirrors")

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, v: str) -> str:
        import ipaddress
        import re
        import socket
        from urllib.parse import urlsplit

        s = v.strip()
        parsed = urlsplit(s)
        if parsed.scheme.lower() not in ("http", "https"):
            raise ValueError(f"Invalid URL scheme '{parsed.scheme}': only http and https are allowed")
        
        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid URL: missing hostname")
        
        if parsed.username or parsed.password:
            raise ValueError("Invalid URL: embedding user credentials in external URL is prohibited")

        # Port validation: block internal management and database ports
        if parsed.port:
            dangerous_ports = {
                21, 22, 23, 25, 53, 69, 110, 111, 135, 137, 138, 139, 143, 389, 445,
                636, 1433, 1521, 2049, 2375, 2376, 3306, 3389, 5000, 5432, 5984, 6379,
                8000, 8086, 8888, 9000, 9042, 9092, 9200, 9300, 11211, 27017, 28017
            }
            if parsed.port in dangerous_ports:
                raise ValueError(f"Invalid URL: connection to sensitive internal service port {parsed.port} is blocked")

        host_lower = hostname.lower().strip("[]")

        # Explicit named local/metadata hosts
        blocked_host_names = {
            "localhost", "0.0.0.0", "127.0.0.1", "::1", "169.254.169.254",
            "metadata.google.internal", "metadata", "instance-data",
            "kubernetes.default.svc", "internal"
        }
        if host_lower in blocked_host_names or host_lower.endswith((".localhost", ".local", ".internal", ".lan", ".home", ".corp")):
            raise ValueError(f"Invalid source URL: access to internal or reserved host '{hostname}' is prohibited")

        def check_ip_obj(ip_obj):
            if (
                ip_obj.is_private or
                ip_obj.is_loopback or
                ip_obj.is_link_local or
                ip_obj.is_reserved or
                ip_obj.is_multicast or
                ip_obj.is_unspecified
            ):
                raise ValueError(f"Invalid source URL: access to private/reserved IP {ip_obj} is prohibited")
            if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped:
                mapped = ip_obj.ipv4_mapped
                if mapped.is_private or mapped.is_loopback or mapped.is_link_local or mapped.is_reserved:
                    raise ValueError(f"Invalid source URL: access to mapped private IP {mapped} is prohibited")

        # Check standard IP parsing
        try:
            ip_obj = ipaddress.ip_address(host_lower)
            check_ip_obj(ip_obj)
            return s
        except ValueError:
            pass

        # Check alternate numeric integer representations (e.g. 2130706433 for 127.0.0.1)
        if host_lower.isdigit():
            try:
                ip_int = int(host_lower)
                if 0 <= ip_int <= 0xFFFFFFFF:
                    check_ip_obj(ipaddress.IPv4Address(ip_int))
            except Exception:
                pass

        # Regex check for RFC1918 / Cloud metadata subnets
        if re.search(r"^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)", host_lower):
            raise ValueError(f"Invalid source URL: private subnet access '{host_lower}' is prohibited")

        # DNS resolution check for domain names (prevents DNS rebinding to internal addresses)
        try:
            addr_info = socket.getaddrinfo(host_lower, None, proto=socket.IPPROTO_TCP)
            for _, _, _, _, sockaddr in addr_info:
                check_ip_obj(ipaddress.ip_address(sockaddr[0]))
        except (socket.gaierror, socket.herror):
            pass

        return s


class ExternalEvidenceUpdate(BaseModel):
    title_or_summary: Optional[str] = None
    description: Optional[str] = None
    text_excerpt: Optional[str] = None
    event_type: Optional[EventTypeEnum] = None
    evidence_type: Optional[EvidenceTypeEnum] = None
    location_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_precision: Optional[LocationPrecisionEnum] = None
    district: Optional[str] = None
    subdistrict: Optional[str] = None
    published_at: Optional[datetime] = None
    observed_at: Optional[datetime] = None
    submitter_notes: Optional[str] = None
    parent_evidence_id: Optional[str] = None
    source_group_id: Optional[str] = None
    is_duplicate: Optional[bool] = None
    duplicate_reason: Optional[str] = None


class ExternalEvidenceReviewRequest(BaseModel):
    action: str = Field(..., description="ACCEPT, REJECT, CORROBORATE, VERIFY_OFFICIAL, CONFIRM_LAB, DISPUTE, MARK_STALE, UPDATE_STATUS")
    verification_status: Optional[VerificationStatusEnum] = None
    publication_status: Optional[PublicationStatusEnum] = None
    reason: str = Field(..., min_length=3, description="Operational justification for review action")
    reviewer_notes: Optional[str] = None
    official_source_evidence: Optional[str] = Field(None, description="Mandatory official document citation if OFFICIAL_VERIFIED")
    lab_confirmation_data: Optional[Dict[str, Any]] = Field(None, description="Mandatory laboratory assay data if LAB_CONFIRMED")


class LinkMonitoringEventRequest(BaseModel):
    event_id: str
    link_type: str = Field("PRIMARY_OBSERVATION", description="PRIMARY_OBSERVATION, CORROBORATING_SIGNAL, HISTORICAL_CONTEXT, BACKGROUND")
    relation_type: Optional[RelationTypeEnum] = Field(RelationTypeEnum.PRIMARY_EVIDENCE, description="PRIMARY_EVIDENCE, SUPPORTING_EVIDENCE, RELATED_REPORT, CONTRADICTING_EVIDENCE")
    independence_group: Optional[str] = Field(None, description="Source family or independence cluster ID")
    relevance_score: float = Field(1.0, ge=0.0, le=1.0)
    notes: Optional[str] = None


class MonitoringEventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=250)
    description: Optional[str] = None
    event_type: EventTypeEnum
    district: Optional[str] = None
    subdistrict: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_precision: LocationPrecisionEnum = LocationPrecisionEnum.UNKNOWN
    monitoring_priority: str = Field("MODERATE", description="LOW, MODERATE, HIGH, VERY_HIGH")
    waterway_name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    source_summary: Optional[str] = None
    initial_evidence_ids: Optional[List[str]] = None


# ==============================================================================
# Public Schemas (Safe Scrubbed DTOs)
# ==============================================================================

class PublicMediaDTO(BaseModel):
    id: str
    media_type: str
    source_media_url: str
    captured_at: Optional[datetime] = None
    license_or_permission_status: str


class ExternalEvidencePublicDTO(BaseModel):
    id: str
    source_platform: str
    source_name: str
    source_url: str
    title_or_summary: str
    description: Optional[str] = None
    text_excerpt: Optional[str] = None
    event_type: str
    evidence_type: str
    verification_status: str
    publication_status: str
    location_text: Optional[str] = None
    public_latitude: Optional[float] = None
    public_longitude: Optional[float] = None
    location_precision: str
    district: Optional[str] = None
    subdistrict: Optional[str] = None
    published_at: Optional[datetime] = None
    observed_at: Optional[datetime] = None
    retrieved_at: Optional[datetime] = None
    media_references: List[PublicMediaDTO] = []
    monitoring_event_id: Optional[str] = None
    parent_evidence_id: Optional[str] = None
    source_group_id: Optional[str] = None
    is_duplicate: bool = False
    provenance: Dict[str, Any]


class MonitoringEventPublicDTO(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    event_type: str
    status: str
    monitoring_priority: str
    district: Optional[str] = None
    subdistrict: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_precision: str
    waterway_name: Optional[str] = None
    priority_factors: List[str] = []
    evidence_count: int = 0
    corroborated_evidence_count: int = 0
    citizen_report_count: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    source_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    evidence_packet: Optional[Dict[str, Any]] = None
    provenance: Dict[str, Any]

