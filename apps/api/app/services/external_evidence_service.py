"""
FloodTrace External Evidence & Correlation Service
Handles external evidence ingestion, human review workflows, spatial/temporal/hydrological correlation,
monitoring event linkage, and structured Evidence Packet compilation.

Adheres strictly to core principles:
- TRUTH > IMPRESSIVE RESULTS
- External Evidence ≠ Measured Fact ≠ Citizen Report ≠ Laboratory Result ≠ Pollution Confirmation
- Fail-closed: INSUFFICIENT_DATA when evidence is incomplete
- Explainable priority factors, never arbitrary opaque scores
"""

import hashlib
import logging
import uuid
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func, not_

from apps.api.app.models.entities import (
    ExternalEvidence,
    ExternalEvidenceMedia,
    EvidenceEventLink,
    ExternalEvidenceAuditLog,
    MonitoringEvent,
    EventStatusHistory,
    EvidenceLocation,
    CitizenReport,
    WaterStation,
    RainfallStation,
    IndustrialFacility
)
from apps.api.app.schemas.external_evidence import (
    ExternalEvidenceCreate,
    ExternalEvidenceUpdate,
    ExternalEvidenceReviewRequest,
    LinkMonitoringEventRequest,
    MonitoringEventCreate,
    LocationPrecisionEnum,
    VerificationStatusEnum,
    PublicationStatusEnum,
    RelationTypeEnum
)
from apps.api.app.core.staff_rbac import StaffPrincipal, StaffRole
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature, FreshnessStatus
from apps.api.app.services.spatial_monitoring_service import (
    SpatialMonitoringService,
    haversine_distance_km,
    distance_to_waterways_km,
    MAJOR_WATERWAY_LINES,
    AUTHENTIC_CELL_ANCHORS
)

logger = logging.getLogger(__name__)

# Bounding box for Prachin Buri Province
PRACHINBURI_BBOX = {
    "min_lat": 13.58,
    "max_lat": 14.46,
    "min_lon": 101.13,
    "max_lon": 102.13
}


from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import re

TRACKING_QUERY_PARAMS = {
    "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term",
    "utm_content", "_rdr", "ref", "__tn__", "extid", "mibextid", "fref",
    "paipv", "eav", "_ft_", "notif_id", "notif_t"
}

def normalize_source_url(raw_url: str) -> str:
    """
    Safely normalizes source URLs by removing ephemeral tracking parameters
    while preserving original route, identifiers, and canonical format.
    """
    if not raw_url or not isinstance(raw_url, str):
        return ""
    u = urlparse(raw_url.strip())
    netloc = u.netloc.lower()
    # Normalize Facebook host variations (m.facebook.com, web.facebook.com, facebook.com -> www.facebook.com)
    if netloc in ("m.facebook.com", "web.facebook.com", "facebook.com"):
        netloc = "www.facebook.com"
    elif netloc.startswith("www."):
        pass

    # Filter tracking query parameters
    qs = parse_qs(u.query, keep_blank_values=False)
    filtered_qs = {k: v for k, v in qs.items() if k.lower() not in TRACKING_QUERY_PARAMS}
    sorted_query = urlencode(sorted([(k, v_item) for k, v_list in filtered_qs.items() for v_item in v_list]))

    path = u.path
    if path.endswith("/") and len(path) > 1:
        path = path.rstrip("/")

    scheme = u.scheme.lower() or "https"
    return urlunparse((scheme, netloc, path, "", sorted_query, ""))

def extract_platform_post_id(url: str) -> Optional[str]:
    """
    Extracts deterministic platform content identifier (e.g., Facebook story FBID, video ID, post ID, Thai PBS ID)
    to detect duplicate underlying posts across different URL formats.
    """
    if not url:
        return None
    u = urlparse(url.strip())
    qs = parse_qs(u.query)

    # 1. Facebook story_fbid
    if "story_fbid" in qs and qs["story_fbid"]:
        return f"fb:story_fbid:{qs['story_fbid'][0]}"

    # 2. Facebook path components /posts/<id>, /videos/<id>, /reel/<id>
    parts = [p for p in u.path.split("/") if p]
    if len(parts) >= 2 and parts[-2] in ("posts", "videos", "reel", "stories"):
        return f"fb:{parts[-2]}:{parts[-1]}"
    if len(parts) >= 3 and parts[-3] in ("posts", "videos"):
        return f"fb:{parts[-3]}:{parts[-2]}"
    if "permalink" in parts and len(parts) >= 2:
        return f"fb:permalink:{parts[-1]}"
    if "share" in parts and len(parts) >= 3:
        return f"fb:share:{parts[-2]}/{parts[-1]}"

    # 3. Thai PBS C-Site news ID: /newsdetail/0000057638
    if "csite.thaipbs.or.th" in u.netloc and "newsdetail" in parts:
        idx = parts.index("newsdetail")
        if idx + 1 < len(parts):
            return f"csite:{parts[idx + 1]}"

    # 4. General Thai PBS news content: /news/content/563025
    if "thaipbs.or.th" in u.netloc and "content" in parts:
        idx = parts.index("content")
        if idx + 1 < len(parts):
            return f"thaipbs:{parts[idx + 1]}"

    return None


class ExternalEvidenceService:
    """Service layer managing external evidence intake, review, and intelligence correlation."""

    @staticmethod
    def calculate_content_hash(source_platform: str, source_url: str, title: str, event_type: str) -> str:
        """Computes deterministic SHA256 content hash for provenance tracking and deduplication."""
        canonical_url = normalize_source_url(source_url)
        payload = f"{source_platform}|{canonical_url}|{title.strip()}|{event_type}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    @classmethod
    def create_evidence(
        cls,
        db: Session,
        data: ExternalEvidenceCreate,
        staff: StaffPrincipal
    ) -> ExternalEvidence:
        """
        Operator submits manual external evidence item.
        Initial state is UNVERIFIED and INTERNAL_ONLY.
        Applies deterministic duplicate detection and source group clustering (Sections 6, 7 & 14).
        """
        now = datetime.now(timezone.utc)
        evidence_id = f"EVD-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # Coordinate & Location Precision Validation (Section 5 & 9)
        lat = data.latitude
        lon = data.longitude
        precision = data.location_precision.value

        if lat is not None and lon is not None:
            # Check bounding box
            if not (PRACHINBURI_BBOX["min_lat"] <= lat <= PRACHINBURI_BBOX["max_lat"] and
                    PRACHINBURI_BBOX["min_lon"] <= lon <= PRACHINBURI_BBOX["max_lon"]):
                # If outside Prachin Buri, mark as UNKNOWN or keep without map placement
                precision = LocationPrecisionEnum.UNKNOWN.value
                lat = None
                lon = None
        elif precision == LocationPrecisionEnum.EXACT.value:
            # If marked EXACT but no coordinates provided, downgrade to UNKNOWN
            precision = LocationPrecisionEnum.UNKNOWN.value

        content_hash = cls.calculate_content_hash(
            data.source_platform.value,
            data.source_url,
            data.title_or_summary,
            data.event_type.value
        )

        # ----------------------------------------------------------------------
        # Deterministic Multi-Tier Duplicate Detection (Master Spec Sections 2, 6, 7 & 14)
        # Priority order:
        # 1. Exact canonical URL or raw source URL
        # 2. Original platform post/video identifier
        # 3. Content hash match
        # 4. Media SHA256 or matching source media URL
        # 5. Matching source identity, timestamps, and identical narrative excerpt
        # ----------------------------------------------------------------------
        is_duplicate = False
        duplicate_reason = None
        parent_evidence_id = data.parent_evidence_id
        source_group_id = data.source_group_id

        norm_url = normalize_source_url(data.source_url)
        platform_id = extract_platform_post_id(data.source_url)

        # 1. Exact raw source URL match
        existing_url = db.query(ExternalEvidence).filter(
            func.lower(ExternalEvidence.source_url) == data.source_url.strip().lower()
        ).first()

        # 2. Normalized canonical URL match
        existing_norm_url = None
        if not existing_url:
            all_existing = db.query(ExternalEvidence).all()
            for ev in all_existing:
                if normalize_source_url(ev.source_url) == norm_url:
                    existing_norm_url = ev
                    break
        else:
            all_existing = []

        # 3. Platform post ID match
        existing_platform_id = None
        if not existing_url and not existing_norm_url and platform_id:
            if not all_existing:
                all_existing = db.query(ExternalEvidence).all()
            for ev in all_existing:
                if extract_platform_post_id(ev.source_url) == platform_id:
                    existing_platform_id = ev
                    break

        # 4. Content hash match
        existing_hash = None
        if not (existing_url or existing_norm_url or existing_platform_id):
            existing_hash = db.query(ExternalEvidence).filter(
                ExternalEvidence.content_hash == content_hash
            ).first()

        # 5. Media match (SHA256 or identical source media URL)
        existing_media = None
        if not (existing_url or existing_norm_url or existing_platform_id or existing_hash) and data.media_references:
            for m in data.media_references:
                if m.sha256:
                    match_m = db.query(ExternalEvidenceMedia).filter(
                        ExternalEvidenceMedia.sha256 == m.sha256
                    ).first()
                    if match_m:
                        existing_media = db.query(ExternalEvidence).filter(
                            ExternalEvidence.id == match_m.evidence_id
                        ).first()
                        break
                if m.source_media_url:
                    match_m = db.query(ExternalEvidenceMedia).filter(
                        ExternalEvidenceMedia.source_media_url == m.source_media_url
                    ).first()
                    if match_m:
                        existing_media = db.query(ExternalEvidence).filter(
                            ExternalEvidence.id == match_m.evidence_id
                        ).first()
                        break

        # 6. Matching social author + substantial identical content excerpt (underlying repost / share link)
        existing_content_match = None
        if not (existing_url or existing_norm_url or existing_platform_id or existing_hash or existing_media):
            clean_text = (data.description or data.text_excerpt or "").strip()
            # Only match if narrative text is substantial (>= 80 chars) to prevent false positives on brief descriptions
            if len(clean_text) >= 80:
                if not all_existing:
                    all_existing = db.query(ExternalEvidence).all()
                for ev in all_existing:
                    ev_text = (ev.description or ev.text_excerpt or "").strip()
                    if (
                        ev.source_name.strip().lower() == data.source_name.strip().lower() and
                        clean_text == ev_text and
                        ev.source_platform == data.source_platform.value
                    ):
                        existing_content_match = ev
                        break

        matched_existing = (
            existing_url or existing_norm_url or existing_platform_id
            or existing_hash or existing_media or existing_content_match
        )

        if matched_existing:
            is_duplicate = True
            parent_evidence_id = matched_existing.id
            source_group_id = matched_existing.source_group_id or matched_existing.id
            if existing_url:
                duplicate_reason = f"IDENTICAL_SOURCE_URL: matches existing evidence {matched_existing.id}"
            elif existing_norm_url:
                duplicate_reason = f"IDENTICAL_CANONICAL_URL: matches existing evidence {matched_existing.id}"
            elif existing_platform_id:
                duplicate_reason = f"IDENTICAL_PLATFORM_POST_ID: matches platform id '{platform_id}' of {matched_existing.id}"
            elif existing_hash:
                duplicate_reason = f"IDENTICAL_CONTENT_HASH: matches existing evidence {matched_existing.id}"
            elif existing_media:
                duplicate_reason = f"IDENTICAL_MEDIA: matches media reference of {matched_existing.id}"
            else:
                duplicate_reason = f"IDENTICAL_UNDERLYING_POST: matching author and narrative text with {matched_existing.id}"
        else:
            if not source_group_id:
                source_group_id = evidence_id

        provenance = make_provenance(
            agency=f"{data.source_name} ({data.source_platform.value})",
            dataset="FloodTrace Manual External Evidence Intake",
            category=DataCategory.OFFICIAL_RECORD if data.source_platform.value == "OFFICIAL_PUBLIC" else DataCategory.UNVERIFIED,
            url=data.source_url,
            original_timestamp=data.published_at.isoformat() if data.published_at else now.isoformat(),
            freshness_status=FreshnessStatus.CURRENT,
            source_verification=SourceVerification.UNVERIFIED,
            value_nature=ValueNature.OBSERVED,
            transformation="Operator submitted public external reference. Preserves provenance without unauthorized content duplication.",
            methodology="Manual operator curation with structured geospatial & temporal metadata tagging",
            audit_notes="External Evidence ≠ Citizen Report ≠ Laboratory Result ≠ Pollution Confirmation"
        ).to_dict()

        evidence = ExternalEvidence(
            id=evidence_id,
            source_platform=data.source_platform.value,
            source_name=data.source_name,
            source_url=data.source_url,
            published_at=data.published_at,
            observed_at=data.observed_at,
            retrieved_at=now,
            title_or_summary=data.title_or_summary,
            description=data.description,
            text_excerpt=data.text_excerpt,
            event_type=data.event_type.value,
            evidence_type=data.evidence_type.value,
            verification_status=VerificationStatusEnum.UNVERIFIED.value,
            publication_status=PublicationStatusEnum.INTERNAL_ONLY.value,
            location_text=data.location_text,
            latitude=lat,
            longitude=lon,
            location_precision=precision,
            district=data.district,
            subdistrict=data.subdistrict,
            content_hash=content_hash,
            parent_evidence_id=parent_evidence_id,
            source_group_id=source_group_id,
            is_duplicate=is_duplicate,
            duplicate_reason=duplicate_reason,
            submitted_by=staff.username,
            submitter_notes=data.submitter_notes,
            monitoring_event_id=data.monitoring_event_id,
            created_at=now,
            updated_at=now,
            provenance=provenance
        )
        db.add(evidence)

        # Store media references if provided (preserving copyright & license status)
        if data.media_references:
            for m in data.media_references:
                media_item = ExternalEvidenceMedia(
                    id=f"MED-{uuid.uuid4().hex[:8].upper()}",
                    evidence_id=evidence_id,
                    media_type=m.media_type,
                    source_media_url=m.source_media_url,
                    sha256=m.sha256,
                    captured_at=m.captured_at,
                    storage_policy=m.storage_policy,
                    license_or_permission_status=m.license_or_permission_status,
                    created_at=now
                )
                db.add(media_item)

        # Log audit entry
        audit_details = {
            "source_url": data.source_url,
            "event_type": data.event_type.value,
            "is_duplicate": is_duplicate,
            "source_group_id": source_group_id
        }
        if duplicate_reason:
            audit_details["duplicate_reason"] = duplicate_reason

        cls.log_audit(
            db=db,
            evidence_id=evidence_id,
            staff=staff,
            action="CREATED",
            new_status="UNVERIFIED",
            reason=f"Operator '{staff.username}' logged external evidence from {data.source_name}" + (f" (Duplicate flagged: {duplicate_reason})" if is_duplicate else ""),
            details=audit_details
        )

        db.commit()
        db.refresh(evidence)
        return evidence

    @classmethod
    def review_evidence(
        cls,
        db: Session,
        evidence_id: str,
        review_data: ExternalEvidenceReviewRequest,
        staff: StaffPrincipal
    ) -> ExternalEvidence:
        """
        Executes human reviewer workflow (Section 11, 9, 10, 21).
        Enforces RBAC and strict requirements for OFFICIAL_VERIFIED and LAB_CONFIRMED.
        """
        evidence = db.query(ExternalEvidence).filter(ExternalEvidence.id == evidence_id).first()
        if not evidence:
            raise ValueError(f"Evidence {evidence_id} not found")

        prev_verification = evidence.verification_status
        prev_publication = evidence.publication_status
        now = datetime.now(timezone.utc)

        action = review_data.action.upper()
        target_verification = prev_verification
        target_publication = prev_publication

        if action == "ACCEPT":
            target_verification = VerificationStatusEnum.UNVERIFIED.value if prev_verification == "UNVERIFIED" else prev_verification
            target_publication = review_data.publication_status.value if review_data.publication_status else PublicationStatusEnum.PUBLIC.value
        elif action == "REJECT":
            target_verification = VerificationStatusEnum.REJECTED.value
            target_publication = PublicationStatusEnum.REJECTED.value
        elif action == "CORROBORATE":
            target_verification = VerificationStatusEnum.CORROBORATED.value
            if review_data.publication_status:
                target_publication = review_data.publication_status.value
        elif action == "VERIFY_OFFICIAL":
            # Strict Rule: Requires ADMIN or REVIEWER role and official documentation citation
            if staff.role not in (StaffRole.ADMIN, StaffRole.REVIEWER):
                raise PermissionError("มีเพียงบทบาท ADMIN หรือ REVIEWER เท่านั้นที่สามารถกำหนดสถานะ OFFICIAL_VERIFIED ได้")
            if not review_data.official_source_evidence or len(review_data.official_source_evidence.strip()) < 5:
                raise ValueError("การกำหนดสถานะ 'OFFICIAL_VERIFIED' ต้องระบุหนังสือหรือหลักฐานจากหน่วยงานราชการที่ตรวจสอบแล้ว")
            target_verification = VerificationStatusEnum.OFFICIAL_VERIFIED.value
            evidence.official_source_evidence = review_data.official_source_evidence.strip()
            if review_data.publication_status:
                target_publication = review_data.publication_status.value
        elif action == "CONFIRM_LAB":
            # Strict Rule: Requires certified physical laboratory test payload (Section 21)
            if staff.role not in (StaffRole.ADMIN, StaffRole.REVIEWER):
                raise PermissionError("มีเพียงบทบาท ADMIN หรือ REVIEWER เท่านั้นที่สามารถกำหนดสถานะ LAB_CONFIRMED ได้")
            lab_data = review_data.lab_confirmation_data
            if not lab_data or not isinstance(lab_data, dict):
                raise ValueError("การกำหนดสถานะ 'LAB_CONFIRMED' ต้องมีข้อมูลผลวิเคราะห์จากห้องปฏิบัติการที่ตรวจสอบได้จริง")
            required_keys = ["laboratory", "sample_id", "parameter", "result", "unit"]
            missing_keys = [k for k in required_keys if not lab_data.get(k)]
            if missing_keys:
                raise ValueError(f"ข้อมูลผลห้องปฏิบัติการไม่ครบถ้วน ขาดฟิลด์: {', '.join(missing_keys)}")
            target_verification = VerificationStatusEnum.LAB_CONFIRMED.value
            evidence.official_source_evidence = f"Lab Assays ({lab_data['laboratory']} Sample {lab_data['sample_id']}): {lab_data['parameter']} = {lab_data['result']} {lab_data['unit']}"
            if review_data.publication_status:
                target_publication = review_data.publication_status.value
        elif action == "DISPUTE":
            target_verification = VerificationStatusEnum.DISPUTED.value
            if review_data.publication_status:
                target_publication = review_data.publication_status.value
        elif action == "MARK_STALE":
            target_verification = VerificationStatusEnum.STALE.value
        elif action == "UPDATE_STATUS":
            if review_data.verification_status:
                target_verification = review_data.verification_status.value
            if review_data.publication_status:
                target_publication = review_data.publication_status.value

        evidence.verification_status = target_verification
        evidence.publication_status = target_publication
        evidence.reviewed_by = staff.username
        evidence.reviewed_at = now
        if review_data.reviewer_notes:
            evidence.reviewer_notes = review_data.reviewer_notes
        evidence.updated_at = now

        # Record audit log
        cls.log_audit(
            db=db,
            evidence_id=evidence_id,
            staff=staff,
            action=action,
            previous_status=f"{prev_verification}/{prev_publication}",
            new_status=f"{target_verification}/{target_publication}",
            reason=review_data.reason,
            details={
                "action": action,
                "verification_status": target_verification,
                "publication_status": target_publication,
                "reviewer_notes": review_data.reviewer_notes
            }
        )

        db.commit()
        db.refresh(evidence)
        return evidence

    @classmethod
    def link_to_monitoring_event(
        cls,
        db: Session,
        evidence_id: str,
        link_data: LinkMonitoringEventRequest,
        staff: StaffPrincipal
    ) -> MonitoringEvent:
        """Links external evidence to a Monitoring Event and recalculates event metrics."""
        evidence = db.query(ExternalEvidence).filter(ExternalEvidence.id == evidence_id).first()
        if not evidence:
            raise ValueError(f"Evidence {evidence_id} not found")

        event = db.query(MonitoringEvent).filter(MonitoringEvent.id == link_data.event_id).first()
        if not event:
            raise ValueError(f"Monitoring Event {link_data.event_id} not found")

        now = datetime.now(timezone.utc)
        link = db.query(EvidenceEventLink).filter(
            EvidenceEventLink.evidence_id == evidence_id,
            EvidenceEventLink.event_id == event.id
        ).first()

        relation_type_val = "PRIMARY_EVIDENCE"
        if hasattr(link_data, "relation_type") and link_data.relation_type:
            relation_type_val = link_data.relation_type.value if hasattr(link_data.relation_type, "value") else str(link_data.relation_type)

        indep_grp = getattr(link_data, "independence_group", None) or evidence.source_group_id

        if not link:
            link = EvidenceEventLink(
                id=f"LNK-{uuid.uuid4().hex[:8].upper()}",
                evidence_id=evidence_id,
                event_id=event.id,
                link_type=link_data.link_type,
                relation_type=relation_type_val,
                independence_group=indep_grp,
                relevance_score=link_data.relevance_score,
                linked_by=staff.username,
                linked_at=now,
                notes=link_data.notes
            )
            db.add(link)
        else:
            link.link_type = link_data.link_type
            link.relation_type = relation_type_val
            link.independence_group = indep_grp
            link.relevance_score = link_data.relevance_score
            link.notes = link_data.notes

        evidence.monitoring_event_id = event.id
        evidence.updated_at = now

        db.flush()

        # Update event's geographic and explainable factors
        cls.recompute_event_factors(db, event)

        cls.log_audit(
            db=db,
            evidence_id=evidence_id,
            staff=staff,
            action="LINKED_TO_EVENT",
            new_status=evidence.verification_status,
            reason=f"Linked to Monitoring Event {event.id}",
            details={"event_id": event.id, "link_type": link_data.link_type, "relation_type": relation_type_val}
        )

        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def create_monitoring_event(
        cls,
        db: Session,
        event_data: MonitoringEventCreate,
        staff: StaffPrincipal
    ) -> MonitoringEvent:
        """Creates an operational Monitoring Event."""
        now = datetime.now(timezone.utc)
        event_id = f"MEV-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"

        prov = make_provenance(
            agency="FloodTrace Intelligence Platform",
            dataset="Operational Monitoring Events",
            category=DataCategory.MODELED,
            url="https://floodtrace.internal/events",
            original_timestamp=now.isoformat(),
            freshness_status=FreshnessStatus.CURRENT,
            source_verification=SourceVerification.VERIFIED_OFFICIAL,
            value_nature=ValueNature.MODELED,
            transformation="Multi-signal aggregation of external evidence, citizen notices, and telemetry.",
            methodology="Deterministic Spatial and Hydrological Priority Assessment",
            audit_notes="Represents an area/situation warranting verification. NOT confirmed contamination."
        ).to_dict()

        event = MonitoringEvent(
            id=event_id,
            title=event_data.title,
            description=event_data.description,
            event_type=event_data.event_type.value,
            status="ACTIVE",
            monitoring_priority=event_data.monitoring_priority,
            district=event_data.district,
            subdistrict=event_data.subdistrict,
            latitude=event_data.latitude,
            longitude=event_data.longitude,
            location_precision=event_data.location_precision.value,
            waterway_name=event_data.waterway_name,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            source_summary=event_data.source_summary,
            publication_status="PUBLIC_SAFE",
            priority_factors=["○ สร้างเหตุการณ์เพื่อติดตามการเฝ้าระวังทางอุทกวิทยา"],
            created_by=staff.username,
            created_at=now,
            updated_at=now,
            provenance=prov
        )
        db.add(event)

        if event_data.initial_evidence_ids:
            for eid in event_data.initial_evidence_ids:
                ev_rec = db.query(ExternalEvidence).filter(ExternalEvidence.id == eid).first()
                if ev_rec:
                    ev_rec.monitoring_event_id = event_id
                    lnk = EvidenceEventLink(
                        id=f"LNK-{uuid.uuid4().hex[:8].upper()}",
                        evidence_id=eid,
                        event_id=event_id,
                        link_type="PRIMARY_OBSERVATION",
                        relation_type="PRIMARY_EVIDENCE",
                        independence_group=ev_rec.source_group_id or ev_rec.id,
                        relevance_score=1.0,
                        linked_by=staff.username,
                        linked_at=now
                    )
                    db.add(lnk)

        db.commit()
        cls.recompute_event_factors(db, event)
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def recompute_event_factors(cls, db: Session, event: MonitoringEvent) -> None:
        """
        Recomputes explainable factors and evidence packet for a monitoring event.
        Guarantees duplicate and mirror suppression (Sections 6, 7, 12, 14, 15).
        """
        # Find linked evidence
        links = db.query(EvidenceEventLink).filter(EvidenceEventLink.event_id == event.id).all()
        supporting_links = [l for l in links if l.relation_type != "CONTRADICTING_EVIDENCE"]
        contradicting_links = [l for l in links if l.relation_type == "CONTRADICTING_EVIDENCE"]

        supporting_ids = [l.evidence_id for l in supporting_links]
        contradicting_ids = [l.evidence_id for l in contradicting_links]

        ev_items = db.query(ExternalEvidence).filter(ExternalEvidence.id.in_(supporting_ids)).all() if supporting_ids else []
        contra_items = db.query(ExternalEvidence).filter(ExternalEvidence.id.in_(contradicting_ids)).all() if contradicting_ids else []

        # Deduplicate supporting evidence by source_group_id to prevent mirror/repost inflation
        unique_groups: Dict[str, List[ExternalEvidence]] = {}
        for e in ev_items:
            gid = e.source_group_id or e.parent_evidence_id or e.content_hash or e.id
            if gid not in unique_groups:
                unique_groups[gid] = []
            unique_groups[gid].append(e)

        independent_ev_count = len(unique_groups)
        total_records = len(ev_items)
        repost_count = max(0, total_records - independent_ev_count)

        # Deduplicate contradicting evidence
        contra_groups: Dict[str, List[ExternalEvidence]] = {}
        for e in contra_items:
            gid = e.source_group_id or e.parent_evidence_id or e.content_hash or e.id
            if gid not in contra_groups:
                contra_groups[gid] = []
            contra_groups[gid].append(e)
        contra_independent_count = len(contra_groups)

        corroborated_groups = 0
        unverified_groups = 0
        official_groups = 0
        lab_groups = 0

        for gid, grp_items in unique_groups.items():
            statuses = {it.verification_status for it in grp_items}
            if "LAB_CONFIRMED" in statuses:
                lab_groups += 1
                corroborated_groups += 1
            elif "OFFICIAL_VERIFIED" in statuses:
                official_groups += 1
                corroborated_groups += 1
            elif "CORROBORATED" in statuses:
                corroborated_groups += 1
            elif "DISPUTED" in statuses or "REJECTED" in statuses:
                pass
            else:
                unverified_groups += 1

        # Find citizen reports in same district
        citizen_query = db.query(CitizenReport).filter(
            CitizenReport.status.notin_(["REJECTED", "SPAM", "DISMISSED"]),
            CitizenReport.publication_state != "SUPPRESSED"
        )
        if event.district:
            citizen_query = citizen_query.filter(CitizenReport.district == event.district)
        citizen_count = citizen_query.count()

        factors = []
        if independent_ev_count > 0:
            if repost_count > 0:
                factors.append(
                    f"✓ บันทึกหลักฐานจากภายนอก {independent_ev_count} แหล่งข้อมูลอิสระ "
                    f"(รวม {total_records} รายการ ตรวจพบการเผยแพร่ต่อ {repost_count} รายการ — ตรวจสอบแล้ว {corroborated_groups} แหล่ง, รอตรวจสอบ {unverified_groups} แหล่ง)"
                )
            else:
                factors.append(
                    f"✓ บันทึกหลักฐานจากภายนอก {independent_ev_count} แหล่ง "
                    f"(ตรวจสอบแล้ว {corroborated_groups} แหล่ง, รอตรวจสอบ {unverified_groups} แหล่ง)"
                )

        if contra_independent_count > 0:
            factors.append(
                f"⚠️ พบหลักฐาน/รายงานที่มีข้อเท็จจริงขัดแย้ง (Contradicting Evidence) {contra_independent_count} แหล่ง "
                f"(รวม {len(contra_items)} รายการ) — ปรับลดระดับความเร่งด่วนและส่งสัญญาณให้เจ้าหน้าที่ตรวจสอบข้อเท็จจริง"
            )

        if citizen_count > 0:
            factors.append(f"✓ พบข้อสังเกตจากประชาชนในพื้นที่ใกล้เคียง {citizen_count} รายการ")
        if event.waterway_name:
            factors.append(f"✓ เชื่อมโยงกับทางน้ำ {event.waterway_name}")
        factors.append("○ ระดับการเฝ้าระวังนี้มีไว้เพื่อจัดลำดับการตรวจสอบภาคสนาม ไม่ใช่ข้อสรุปเรื่องการปนเปื้อนหรือการระบุผู้กระทำผิด")

        event.priority_factors = factors

        # Determine suggested priority based on independent groups
        if lab_groups >= 1 or official_groups >= 1:
            base_priority = "HIGH"
        elif corroborated_groups >= 2 or (corroborated_groups >= 1 and citizen_count >= 2):
            base_priority = "HIGH"
        elif independent_ev_count >= 1 or citizen_count >= 1:
            base_priority = "MODERATE"
        else:
            base_priority = "LOW"

        # Contradicting evidence actively reduces confidence / priority or triggers review
        if contra_independent_count > 0:
            if base_priority == "HIGH":
                event.monitoring_priority = "MODERATE"
            else:
                event.monitoring_priority = "LOW"
            if event.status == "ACTIVE":
                event.status = "UNDER_VERIFICATION"
        else:
            event.monitoring_priority = base_priority

        # Structured findings with truthful language (Sections 15, 27, 28)
        event.what_was_reported = f"รายงานเหตุการณ์ประเภท {event.event_type} ในพื้นที่ {event.district or 'จังหวัดปราจีนบุรี'}"
        event.what_was_observed = (
            f"ระบบบันทึกหลักฐานอ้างอิงจากภายนอก {independent_ev_count} แหล่งอิสระ (รวม {total_records} รายการ)"
            if independent_ev_count > 0 else "ยังไม่มีหลักฐานสังเกตการณ์ที่ยืนยันแน่ชัด"
        )
        event.what_system_shows = f"การเชื่อมต่อทางอุทกวิทยาในพื้นที่ลุ่มน้ำปราจีนบุรี และสถานะโทรมาตรสถานีตรวจวัด"
        event.what_is_unknown = (
            "ยังไม่มีผลตรวจวิเคราะห์ตัวอย่างน้ำทางเคมีจากห้องปฏิบัติการที่ได้รับการรับรอง"
            if lab_groups == 0 else f"มีผลตรวจวิเคราะห์ทางห้องปฏิบัติการ {lab_groups} รายการ"
        )
        event.what_should_be_verified = (
            f"เนื่องจากพบข้อมูลที่ขัดแย้งกัน {contra_independent_count} แหล่ง แนะนำให้เจ้าหน้าที่ลงพื้นที่ตรวจสอบสภาพน้ำจริงและรวบรวมพยานหลักฐานเพื่อคลี่คลายข้อขัดแย้ง"
            if contra_independent_count > 0
            else "แนะนำให้เจ้าหน้าที่ลงพื้นที่เก็บตัวอย่างน้ำเพื่อตรวจวัดค่าทางกายภาพและเคมี (DO, pH, โลหะหนัก)"
        )

    @classmethod
    def correlate_evidence(
        cls,
        db: Session,
        evidence_id: str
    ) -> Dict[str, Any]:
        """
        Executes deterministic multi-dimensional correlation (Phases 9, 10, 11).
        Spatial + Temporal + Waterway Connectivity + Citizen Reports + Stations.
        Prioritizes observed_at over published_at and distinguishes source recording from verification.
        """
        evidence = db.query(ExternalEvidence).filter(ExternalEvidence.id == evidence_id).first()
        if not evidence:
            raise ValueError(f"Evidence {evidence_id} not found")

        lat = evidence.latitude
        lon = evidence.longitude
        precision = evidence.location_precision

        # Determine temporal basis strictly prioritizing observed_at over published_at (Section 8)
        now = datetime.now(timezone.utc)
        time_basis = "UNKNOWN"
        obs_time = None
        limitation_note = None

        is_fallback = False
        if evidence.observed_at:
            obs_time = evidence.observed_at
            time_basis = "OBSERVED_AT"
            is_fallback = False
        elif evidence.published_at:
            obs_time = evidence.published_at
            time_basis = "PUBLICATION_TIME_FALLBACK"
            is_fallback = True
            limitation_note = "วันเวลาที่วิเคราะห์อ้างอิงจากเวลาเผยแพร่ของแหล่งข่าว (published_at) เนื่องจากแหล่งที่มาไม่ได้ระบุเวลาที่เกิดเหตุหรือสังเกตการณ์จริง (observed_at)"
        else:
            time_basis = "TIME_UNKNOWN"
            is_fallback = False
            limitation_note = "ไม่ระบุวันเวลาสังเกตการณ์หรือวันเวลาเผยแพร่จากแหล่งที่มา ระบบบันทึกเฉพาะเวลาที่รับเข้า (retrieved_at)"

        age_hours = None
        temporal_category = "UNKNOWN"
        temporal_score = 0.15

        if obs_time:
            ref_now = now if obs_time.tzinfo else datetime.utcnow()
            age_hours = round(max(0.0, (ref_now - obs_time).total_seconds() / 3600.0), 1)
            if age_hours <= 24.0:
                temporal_category = "CURRENT"
                temporal_score = 1.0
            elif age_hours <= 72.0:
                temporal_category = "RECENT"
                temporal_score = 0.75
            elif age_hours <= 168.0:
                temporal_category = "MODERATE"
                temporal_score = 0.50
            elif age_hours <= 720.0:
                temporal_category = "STALE"
                temporal_score = 0.25
            else:
                temporal_category = "HISTORICAL"
                temporal_score = 0.05

        correlation_report: Dict[str, Any] = {
            "evidence_id": evidence.id,
            "title": evidence.title_or_summary,
            "event_type": evidence.event_type,
            "verification_status": evidence.verification_status,
            "location_precision": precision,
            "source_group_id": evidence.source_group_id,
            "is_duplicate": evidence.is_duplicate,
            "spatial_correlation": {},
            "temporal_correlation": {
                "status": "EVALUATED" if obs_time else "INSUFFICIENT_DATA",
                "relationship_type": "TEMPORAL_ALIGNMENT",
                "description": "ความสัมพันธ์เชิงช่วงเวลา (Temporal Alignment) แสดงความสอดคล้องของกรอบเวลาเท่านั้น ไม่ใช่การพิสูจน์สาเหตุ (Does NOT imply causation)",
                "time_basis": time_basis,
                "is_fallback": is_fallback,
                "observed_at": evidence.observed_at.isoformat() if evidence.observed_at else None,
                "published_at": evidence.published_at.isoformat() if evidence.published_at else None,
                "retrieved_at": evidence.retrieved_at.isoformat() if evidence.retrieved_at else None,
                "age_hours": age_hours,
                "temporal_category": temporal_category,
                "temporal_score": temporal_score,
                "limitation_note": limitation_note or "ความสอดคล้องเชิงกรอบเวลา (Temporal Alignment) แสดงความเกี่ยวเนื่องด้านเวลาเท่านั้น ไม่ใช่การพิสูจน์สาเหตุ (Does NOT imply causation)"
            },
            "hydrological_correlation": {},
            "citizen_reports_correlation": [],
            "suggested_actions": [],
            "correlation_strength": "LOW"
        }

        # 1. Spatial Correlation (Section 9 & 15)
        if lat is None or lon is None or precision == "UNKNOWN":
            correlation_report["spatial_correlation"] = {
                "status": "INSUFFICIENT_DATA",
                "notice": "พิกัดไม่ระบุแน่ชัด ระบบจะไม่ทำการวางจุดบนแผนที่โดยพลการ (Fail-Closed)",
                "matched_cell": None
            }
        else:
            # Match Voronoi cell
            service = SpatialMonitoringService.get_instance()
            matched_cell = None
            min_dist = float("inf")
            for c in service.cells:
                d = haversine_distance_km(lat, lon, c["center_lat"], c["center_lon"])
                if d < min_dist:
                    min_dist = d
                    matched_cell = c

            correlation_report["spatial_correlation"] = {
                "status": "LOCATED",
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "precision": precision,
                "closest_tambon": matched_cell["name"] if matched_cell else None,
                "district": matched_cell["district"] if matched_cell else evidence.district,
                "distance_to_tambon_center_km": round(min_dist, 2) if min_dist != float("inf") else None
            }

        # 2. Waterway Connectivity (Section 16.3 & 17)
        if lat is not None and lon is not None:
            dist_river, river_name = distance_to_waterways_km(lat, lon)
            correlation_report["hydrological_correlation"] = {
                "nearest_waterway": river_name,
                "distance_km": dist_river,
                "in_river_corridor": dist_river <= 2.0,
                "hydrological_notice": "ความเชื่อมโยงทางอุทกวิทยาเป็นข้อมูลสนับสนุนบริบทเชิงพื้นที่ ไม่ใช่ข้อพิสูจน์การปนเปื้อนหรือการระบุผู้กระทำผิด"
            }
        else:
            correlation_report["hydrological_correlation"] = {
                "status": "INSUFFICIENT_DATA",
                "nearest_waterway": None
            }

        # 3. Temporal Correlation with Citizen Reports (Section 16.2)
        matched_reports = []
        candidate_reports = db.query(CitizenReport).filter(
            CitizenReport.status.notin_(["REJECTED", "SPAM", "DISMISSED"]),
            CitizenReport.publication_state != "SUPPRESSED"
        )
        if evidence.district:
            candidate_reports = candidate_reports.filter(CitizenReport.district == evidence.district)

        reports_list = candidate_reports.limit(10).all()
        for cr in reports_list:
            cr_time = cr.observed_at or cr.created_at
            time_diff_hours = abs((obs_time - cr_time).total_seconds()) / 3600.0 if (obs_time and cr_time) else 999.0
            
            geo_dist_km = None
            if lat is not None and lon is not None and cr.public_latitude and cr.public_longitude:
                geo_dist_km = haversine_distance_km(lat, lon, cr.public_latitude, cr.public_longitude)

            is_spatially_close = (geo_dist_km is not None and geo_dist_km <= 5.0) or (cr.subdistrict == evidence.subdistrict)
            is_temporally_close = time_diff_hours <= 48.0

            if is_spatially_close or is_temporally_close:
                matched_reports.append({
                    "report_id": cr.id,
                    "district": cr.district,
                    "subdistrict": cr.subdistrict,
                    "category": cr.category,
                    "verification_status": cr.verification_status,
                    "time_diff_hours": round(time_diff_hours, 1),
                    "distance_km": round(geo_dist_km, 2) if geo_dist_km is not None else None,
                    "temporal_match": is_temporally_close,
                    "spatial_match": is_spatially_close
                })

        correlation_report["citizen_reports_correlation"] = matched_reports

        # 4. Strength Evaluation (Deduplication aware)
        corroborated_factors = 0
        if correlation_report["hydrological_correlation"].get("in_river_corridor"):
            corroborated_factors += 1
        if len(matched_reports) >= 1:
            corroborated_factors += 1
        if any(r["temporal_match"] and r["spatial_match"] for r in matched_reports):
            corroborated_factors += 2

        if temporal_score >= 0.75:
            corroborated_factors += 1

        # 4. Strength Evaluation (Deduplication aware & Contradicting check)
        contra_link = db.query(EvidenceEventLink).filter(
            EvidenceEventLink.evidence_id == evidence.id,
            EvidenceEventLink.relation_type == "CONTRADICTING_EVIDENCE"
        ).first()

        is_contradicting = contra_link is not None or evidence.verification_status == "DISPUTED"

        if is_contradicting:
            correlation_report["relation_type"] = "CONTRADICTING_EVIDENCE"
            correlation_report["correlation_strength"] = "LOW"
            correlation_report["suggested_actions"].append(
                "⚠️ รายการนี้มีสถานะขัดแย้ง (Contradicting Evidence) — แนะนำให้เจ้าหน้าที่ตรวจสอบความถูกต้องและข้อเท็จจริงอย่างละเอียด"
            )
        elif corroborated_factors >= 4:
            correlation_report["correlation_strength"] = "HIGH"
            correlation_report["suggested_actions"].append("สร้างหรือเชื่อมโยงเข้าสู่ Monitoring Event เพื่อยกระดับการเฝ้าระวัง")
            correlation_report["suggested_actions"].append("จัดชุดปฏิบัติการตรวจสอบข้อเท็จจริงในพื้นที่")
        elif corroborated_factors >= 2:
            correlation_report["correlation_strength"] = "MODERATE"
            correlation_report["suggested_actions"].append("ติดตามข้อสังเกตและข้อมูลเซนเซอร์โทรมาตรเพิ่มเติม")
        else:
            correlation_report["correlation_strength"] = "LOW"
            correlation_report["suggested_actions"].append("บันทึกเป็นหลักฐานอ้างอิง รอข้อมูลสนับสนุนอื่นเพิ่มเติม")

        return correlation_report

    @classmethod
    def get_evidence_packet_for_event(cls, db: Session, event_id: str, public_only: bool = False) -> Dict[str, Any]:
        """Compiles a complete 7-section Evidence Packet (Section 21 & 28) for a Monitoring Event."""
        event = db.query(MonitoringEvent).filter(MonitoringEvent.id == event_id).first()
        if not event:
            raise ValueError(f"Monitoring Event {event_id} not found")

        if public_only and event.publication_status not in ("PUBLIC", "PUBLIC_SAFE"):
            raise ValueError(f"Monitoring Event {event_id} is restricted or not public-safe")

        # Fetch linked evidence
        links = db.query(EvidenceEventLink).filter(EvidenceEventLink.event_id == event.id).all()
        evidence_ids = [l.evidence_id for l in links]

        ev_query = db.query(ExternalEvidence).filter(ExternalEvidence.id.in_(evidence_ids))
        if public_only:
            ev_query = ev_query.filter(
                ExternalEvidence.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"]),
                ExternalEvidence.verification_status.notin_(["REJECTED", "TEST_DEMO"])
            )
        ev_items = ev_query.all() if evidence_ids else []

        # Stations in area
        stations = db.query(WaterStation)
        if event.district:
            stations = stations.filter(WaterStation.district == event.district)
        st_list = stations.limit(5).all()

        rainfall = db.query(RainfallStation)
        if event.district:
            rainfall = rainfall.filter(RainfallStation.district == event.district)
        rf_list = rainfall.limit(5).all()

        # Deduplicate source groups
        unique_groups = set(e.source_group_id or e.id for e in ev_items)

        return {
            "event_id": event.id,
            "title": event.title,
            "event_type": event.event_type,
            "monitoring_priority": event.monitoring_priority,
            "district": event.district,
            "waterway_name": event.waterway_name,
            "what_was_reported": {
                "summary": event.what_was_reported or "มีรายงานข้อสังเกตความผิดปกติในสิ่งแวดล้อม",
                "independent_source_count": len(unique_groups),
                "total_records_count": len(ev_items),
                "external_sources": [
                    {
                        "source_name": e.source_name,
                        "source_platform": e.source_platform,
                        "title": e.title_or_summary,
                        "published_at": e.published_at.isoformat() if e.published_at else None,
                        "observed_at": e.observed_at.isoformat() if e.observed_at else None,
                        "location_precision": e.location_precision,
                        "is_duplicate": e.is_duplicate,
                        "source_group_id": e.source_group_id
                    }
                    for e in ev_items
                ]
            },
            "what_was_observed": {
                "summary": event.what_was_observed or "ตรวจพบข้อมูลจากแหล่งข้อมูลภายนอก",
                "verified_observations_count": sum(1 for e in ev_items if e.verification_status in ["CORROBORATED", "OFFICIAL_VERIFIED", "LAB_CONFIRMED"]),
                "observations": [
                    {
                        "id": e.id,
                        "type": e.evidence_type,
                        "verification_status": e.verification_status,
                        "description": e.description or e.title_or_summary,
                        "source_group_id": e.source_group_id
                    }
                    for e in ev_items
                ]
            },
            "external_evidence": {
                "count": len(ev_items),
                "independent_count": len(unique_groups),
                "total_records": len(ev_items),
                "items": [
                    {
                        "id": e.id,
                        "source_name": e.source_name,
                        "source_url": e.source_url,
                        "verification_status": e.verification_status,
                        "publication_status": e.publication_status,
                        "observed_at": e.observed_at.isoformat() if e.observed_at else None,
                        "is_duplicate": e.is_duplicate,
                        "source_group_id": e.source_group_id
                    }
                    for e in ev_items
                ]
            },
            "measured_data": {
                "water_stations": [
                    {
                        "station_id": s.id,
                        "name_th": s.name_th,
                        "water_level_msl": s.water_level_msl,
                        "status": s.status
                    }
                    for s in st_list
                ],
                "rainfall_stations": [
                    {
                        "station_id": r.id,
                        "name_th": r.name_th,
                        "rain_24h_mm": r.rain_24h_mm,
                        "status": r.status
                    }
                    for r in rf_list
                ]
            },
            "what_the_system_suggests": {
                "recommendation": f"พื้นที่นี้มีระดับการเฝ้าระวัง: {event.monitoring_priority}",
                "priority_factors": event.priority_factors or []
            },
            "what_is_unknown": {
                "summary": "ข้อจำกัดของข้อมูลและสิ่งที่ยังไม่ทราบแน่ชัด (Fail-Closed)",
                "data_gaps": [
                    "ยังไม่มีผลตรวจวิเคราะห์ตัวอย่างน้ำทางห้องปฏิบัติการ (DO, BOD, COD, โลหะหนัก) จากห้องปฏิบัติการที่รับรอง",
                    "ยังไม่มีการตรวจวัดอัตราการระบายน้ำทิ้งแบบต่อเนื่องจากโรงงานหรืออาคารในพื้นที่",
                    "ภาพถ่ายหรือโพสต์จากสื่อภายนอกบันทึกเฉพาะหลักฐานเชิงประจักษ์ ไม่สามารถยืนยันความเป็นพิษหรือสารเคมีได้"
                ]
            },
            "what_should_be_verified": {
                "summary": "ขั้นตอนและมาตรการที่แนะนำในการตรวจสอบข้อเท็จจริง",
                "actions": [
                    "ส่งเจ้าหน้าที่สิ่งแวดล้อมลงพื้นที่เก็บตัวอย่างน้ำเพื่อตรวจวิเคราะห์",
                    "ประสานงานหน่วยงานราชการที่เกี่ยวข้อง (สสภ.7 / กรมควบคุมมลพิษ / อุตสาหกรรมจังหวัด)",
                    "ตรวจสอบสภาพลำน้ำและพิกัดต้นน้ำ-ท้ายน้ำที่มีความเชื่อมโยงทางอุทกวิทยา"
                ]
            },
            "disclaimer": "ข้อมูลชุดนี้จัดทำขึ้นเพื่อการเฝ้าระวังและการตัดสินใจเชิงปฏิบัติการ ไม่ใช่ข้อสรุปเรื่องการปนเปื้อนหรือการระบุผู้กระทำผิด"
        }

    @staticmethod
    def log_audit(
        db: Session,
        evidence_id: str,
        staff: StaffPrincipal,
        action: str,
        new_status: str,
        reason: str,
        previous_status: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> ExternalEvidenceAuditLog:
        """Appends an immutable audit log entry."""
        log = ExternalEvidenceAuditLog(
            audit_id=f"AUD-{uuid.uuid4().hex[:10].upper()}",
            evidence_id=evidence_id,
            actor_id=staff.username,
            actor_role=staff.role.value,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            reason=reason,
            details=details or {},
            timestamp=datetime.now(timezone.utc)
        )
        db.add(log)
        return log
