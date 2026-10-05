"""Internal research lifecycle. This module never writes observations or publication records."""
import asyncio
import hashlib
import re
from time import monotonic
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from apps.api.app.core.config import settings
from apps.api.app.models.entities import ResearchCandidate, ResearchCandidateAudit, WaterStation, RainfallStation
from apps.api.app.services.research_fetch import (
    FetchResult, ResearchFetchError, canonical_url, extract_document, fetch_public_text,
    parse_feed, resolve_public_destination, safe_text,
)
from apps.api.app.services.research_triage import classify_geography, get_triage_provider, triage_source


@dataclass
class ConnectorCapability:
    kind: str
    configured_capability: bool
    availability: str
    failure_reason: str | None


class ManualPublicURLConnector:
    capability = ConnectorCapability("MANUAL_PUBLIC_URL", True, "AVAILABLE", None)

    async def collect(self, reference):
        result = await fetch_public_text(reference)
        return result.url, extract_document(result)


class RSSConnector:
    async def collect(self, reference):
        result = await fetch_public_text(reference)
        return parse_feed(result)


def connector_status():
    rss_configured = bool(settings.RESEARCH_RSS_FEEDS)
    connectors = [ManualPublicURLConnector.capability,
                  ConnectorCapability("RSS", rss_configured, "AVAILABLE" if rss_configured else "UNAVAILABLE", None if rss_configured else "FEEDS_NOT_CONFIGURED")]
    connectors += [ConnectorCapability(kind, False, "UNAVAILABLE", "PROVIDER_NOT_IMPLEMENTED")
                   for kind in ("OFFICIAL_WEB", "NEWS_WEB", "PUBLIC_WEB_SEARCH", "SUPPORTED_SOCIAL_API")]
    provider = get_triage_provider()
    return {"connectors": [asdict(item) for item in connectors],
            "ai_provider": {"kind": provider.kind, "availability": "AVAILABLE" if provider.available else "UNAVAILABLE", "reason": provider.reason},
            "permitted_feeds": settings.RESEARCH_RSS_FEEDS[:10]}


def geography_hints(db):
    """Persisted source labels are hints, never geography or connectivity proof."""
    districts, subdistricts, waterways = set(), set(), set()
    for model in (WaterStation, RainfallStation):
        for station in db.query(model).all():
            if station.district:
                districts.add(station.district)
            if getattr(station, "subdistrict", None):
                subdistricts.add(station.subdistrict)
            if station.basin:
                waterways.add(station.basin)
    return {"districts": sorted(districts), "subdistricts": sorted(subdistricts), "waterways": sorted(waterways),
            "limitation": "Source labels are search hints only; no geometry or hydrological relationship is inferred."}


def record_audit(db, candidate, staff, action, details):
    db.add(ResearchCandidateAudit(id="rea_" + uuid4().hex, candidate_id=candidate.id,
                                actor_id=staff.user_id, actor_username=staff.username,
                                action=action, details=details))


def serialize(candidate):
    return {column.name: getattr(candidate, column.name) for column in candidate.__table__.columns}


def find_candidate(db, candidate_id, lock=False):
    query = db.query(ResearchCandidate).filter(ResearchCandidate.id == candidate_id)
    if lock:
        query = query.with_for_update().populate_existing()
    candidate = query.first()
    if not candidate:
        raise HTTPException(404, "Research candidate not found")
    return candidate


def _apply_source(candidate, document):
    for key, value in document.items():
        setattr(candidate, key, value)
    candidate.geography, candidate.geography_supporting_text = classify_geography(candidate.safe_excerpt)
    if candidate.geography == "PRACHINBURI_LOCAL":
        for field, label in (("district", "district|อำเภอ"), ("subdistrict", "subdistrict|ตำบล"), ("area", "area|พื้นที่")):
            match = re.search(r"(?<![A-Za-z])(?:" + label + r")\s*[:：]\s*([^\n.;:：]{1,100})", candidate.safe_excerpt or "", re.I)
            setattr(candidate, field, safe_text(match.group(1), 100) if match else None)
    from datetime import date
    event = re.search(r"(?:event date|วันที่เกิดเหตุ)\s*[:：]\s*(\d{4}-\d{2}-\d{2})", candidate.safe_excerpt or "", re.I)
    candidate.event_date = None
    if event:
        try:
            candidate.event_date = date.fromisoformat(event.group(1)).isoformat()
        except ValueError:
            pass
    if candidate.geography == "OUT_OF_SCOPE":
        candidate.triage_status = "OUT_OF_SCOPE"
    if candidate.content_fingerprint:
        candidate.duplicate_group_id = "research_" + candidate.content_fingerprint


async def intake(db, url, staff):
    try:
        url = canonical_url(url)
    except ResearchFetchError as error:
        raise HTTPException(400, error.reason)
    existing = db.query(ResearchCandidate).filter(ResearchCandidate.source_url == url).first()
    if existing and (existing.review_decision or existing.source_status == "ACCESSIBLE"):
        return existing, False
    document, resolved, reason = {}, None, None
    try:
        resolved, document = await ManualPublicURLConnector().collect(url)
    except ResearchFetchError as error:
        if error.invalid_url:
            raise HTTPException(400, error.reason)
        reason = error.reason
    candidate = db.query(ResearchCandidate).filter(ResearchCandidate.source_url == url).with_for_update().populate_existing().first()
    if candidate and (candidate.review_decision or candidate.source_status == "ACCESSIBLE"):
        return candidate, False
    created = candidate is None
    if created:
        candidate = ResearchCandidate(id="research_" + uuid4().hex, source_url=url, connector_kind="MANUAL_PUBLIC_URL",
                                      platform=urlsplit_host(url), version=1)
        db.add(candidate)
    else:
        candidate.version += 1
    _apply_source(candidate, document)
    candidate.resolved_url = resolved
    candidate.source_status = "UNAVAILABLE" if reason else "ACCESSIBLE"
    candidate.source_reason = reason
    candidate.retrieved_at = datetime.now(timezone.utc) if not reason else None
    record_audit(db, candidate, staff, "RESEARCH_INTAKE", {"source_status": candidate.source_status, "version": candidate.version})
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        candidate = db.query(ResearchCandidate).filter(ResearchCandidate.source_url == url).first()
        if not candidate:
            raise HTTPException(500, "Research intake failed")
        return candidate, False
    return candidate, created


def urlsplit_host(url):
    from urllib.parse import urlsplit
    return urlsplit(url).hostname


async def discover(db, requested_feed, staff):
    try:
        feeds = [canonical_url(url) for url in settings.RESEARCH_RSS_FEEDS[:10]]
        requested_feed = canonical_url(requested_feed) if requested_feed else None
    except ResearchFetchError:
        raise HTTPException(400, "Invalid feed configuration or reference")
    if requested_feed and requested_feed not in feeds:
        raise HTTPException(400, "Feed is not server-permitted")
    feeds = [requested_feed] if requested_feed else feeds
    if not feeds:
        return {"status": "UNAVAILABLE", "reason": "FEEDS_NOT_CONFIGURED", "feeds": []}
    results = []
    deadline = monotonic() + 30
    for feed in feeds:
        try:
            remaining = deadline - monotonic()
            if remaining <= 0:
                raise asyncio.TimeoutError()
            items = await asyncio.wait_for(RSSConnector().collect(feed), remaining)
        except (ResearchFetchError, asyncio.TimeoutError) as error:
            results.append({"feed": feed, "status": "UNAVAILABLE", "reason": getattr(error, "reason", "DISCOVERY_TIMEOUT"), "created": 0})
            continue
        created, duplicates, unsafe, timed_out = 0, 0, 0, False
        for item in items:
            remaining = deadline - monotonic()
            if remaining <= 0:
                timed_out = True
                break
            try:
                url, _ = await asyncio.wait_for(asyncio.to_thread(resolve_public_destination, item.pop("url")), min(3, remaining))
            except (ResearchFetchError, asyncio.TimeoutError):
                unsafe += 1
                continue
            if db.query(ResearchCandidate.id).filter(ResearchCandidate.source_url == url).first():
                duplicates += 1
                continue
            candidate = ResearchCandidate(id="research_" + uuid4().hex, source_url=url, connector_kind="RSS", platform=urlsplit_host(url),
                                          source_status="UNKNOWN", source_reason="ARTICLE_NOT_RETRIEVED", version=1)
            if item.get("safe_excerpt"):
                document = extract_document(FetchResult(url, "text/plain", item["safe_excerpt"].encode()))
                document.update(item)
            else:
                document = item
            _apply_source(candidate, document)
            if not candidate.content_fingerprint and candidate.safe_title:
                candidate.content_fingerprint = hashlib.sha256(candidate.safe_title.encode()).hexdigest()
                candidate.duplicate_group_id = "research_" + candidate.content_fingerprint
            db.add(candidate)
            record_audit(db, candidate, staff, "RESEARCH_DISCOVERED", {"connector_kind": "RSS", "version": 1})
            try:
                db.commit()
                created += 1
            except IntegrityError:
                db.rollback()
                duplicates += 1
        results.append({"feed": feed, "status": "PARTIAL" if timed_out or unsafe else "AVAILABLE", "reason": "DISCOVERY_TIMEOUT" if timed_out else "UNSAFE_OR_UNAVAILABLE_LINKS" if unsafe else None,
                        "created": created, "duplicates": duplicates, "unsafe_links_rejected": unsafe})
    statuses = {item["status"] for item in results}
    return {"status": "AVAILABLE" if statuses == {"AVAILABLE"} else "UNAVAILABLE" if statuses == {"UNAVAILABLE"} else "PARTIAL", "feeds": results}


async def triage(db, candidate_id, expected_version, staff):
    candidate = find_candidate(db, candidate_id)
    if candidate.version != expected_version or candidate.review_decision:
        raise HTTPException(409, "Candidate changed or was reviewed; reload before triage")
    status, reason, fields = await triage_source(get_triage_provider(), candidate)
    candidate = find_candidate(db, candidate_id, lock=True)
    if candidate.version != expected_version or candidate.review_decision:
        db.rollback()
        raise HTTPException(409, "Candidate changed or was reviewed; reload before triage")
    try:
        if fields:
            for key, value in fields.items():
                setattr(candidate, key, value)
        else:
            candidate.safe_summary = candidate.category = candidate.ai_relevance_score = None
            candidate.ai_relevance_reasons, candidate.ai_suggestions, candidate.attributed_claims = [], {}, []
        candidate.ai_status, candidate.ai_reason = status, reason
        candidate.triage_status = "AI_TRIAGED" if fields else "NEEDS_REVIEW"
        candidate.version += 1
        record_audit(db, candidate, staff, "RESEARCH_TRIAGED", {"ai_status": status, "version": candidate.version})
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Research triage could not be saved")
    return candidate


def review(db, candidate_id, payload, staff):
    candidate = find_candidate(db, candidate_id, lock=True)
    if candidate.version != payload.expected_version:
        db.rollback()
        raise HTTPException(409, "Candidate version changed; reload before review")
    source_geography, source_location_quote = classify_geography(candidate.safe_excerpt or "")
    geography = payload.geography or candidate.geography
    quote = safe_text(payload.supporting_text, 1000) or candidate.geography_supporting_text
    text = candidate.safe_excerpt or ""
    if quote and quote not in text:
        raise HTTPException(400, "Supporting text must be an exact source excerpt")
    if geography == "PRACHINBURI_LOCAL":
        if source_geography != "PRACHINBURI_LOCAL" or not quote or not source_location_quote or source_location_quote not in quote:
            raise HTTPException(400, "Explicit source-backed Prachinburi location is required")
    if geography == "OUT_OF_SCOPE" and source_geography != "OUT_OF_SCOPE":
        raise HTTPException(400, "Outside-province classification requires source evidence")
    if geography == "EXTERNAL_CONTEXT":
        relationship = re.search(r"(?i)(?:related to|affects|เกี่ยวข้องกับ|ส่งผลต่อ).{0,60}(?:Prachin\s*Buri|ปราจีนบุรี)", quote or "")
        if source_geography != "OUT_OF_SCOPE" or not quote or quote not in text or not relationship or not payload.relationship_rationale or len(payload.relationship_rationale.strip()) < 10:
            raise HTTPException(400, "Source-backed relationship and rationale are required for external context")
    if payload.decision == "APPROVE_SOURCE":
        if candidate.source_status != "ACCESSIBLE":
            raise HTTPException(400, "Source access remains unresolved")
        if source_geography == "LOCATION_UNCONFIRMED":
            raise HTTPException(400, "Conflicting or unresolved source geography cannot be approved")
        if geography not in {"PRACHINBURI_LOCAL", "EXTERNAL_CONTEXT"}:
            raise HTTPException(400, "Unresolved or out-of-scope location cannot be approved")
        if candidate.privacy_legal_flags and (not payload.privacy_resolution_note or len(payload.privacy_resolution_note.strip()) < 10):
            raise HTTPException(400, "Privacy/legal issues require explicit resolution")
    sanitized_review = {
        "note": safe_text(payload.note, 2000),
        "relationship_rationale": safe_text(payload.relationship_rationale, 2000),
        "privacy_resolution_note": safe_text(payload.privacy_resolution_note, 2000),
        "supporting_text": safe_text(payload.supporting_text, 1000),
    }
    if any("[PRIVATE_LOCATION_REDACTED]" in (value or "") for value in sanitized_review.values()):
        if payload.decision == "APPROVE_SOURCE" and (not sanitized_review["privacy_resolution_note"] or len(sanitized_review["privacy_resolution_note"]) < 10):
            raise HTTPException(400, "Private location content requires explicit redaction resolution")
    for field in ("district", "subdistrict", "area"):
        value = getattr(payload, field)
        if value and value not in text:
            raise HTTPException(400, "Locality must be supported by source text")
    before = {"decision": candidate.review_decision, "geography": candidate.geography, "version": candidate.version}
    decision = {"APPROVE_SOURCE": "APPROVED_SOURCE", "NEEDS_VERIFICATION": "NEEDS_VERIFICATION", "REJECT": "REJECTED"}[payload.decision]
    try:
        candidate.geography, candidate.geography_supporting_text = geography, quote
        candidate.relationship_rationale = sanitized_review["relationship_rationale"]
        for field in ("district", "subdistrict", "area"):
            value = getattr(payload, field)
            if value:
                setattr(candidate, field, safe_text(value, 200))
        candidate.review_decision = candidate.triage_status = decision
        candidate.review_note = sanitized_review["note"]
        candidate.privacy_resolution_note = sanitized_review["privacy_resolution_note"]
        if any("[PRIVATE_LOCATION_REDACTED]" in (value or "") for value in sanitized_review.values()):
            candidate.privacy_legal_flags = sorted(set(candidate.privacy_legal_flags or []) | {"PRIVATE_LOCATION_REVIEW_REQUIRED"})
        candidate.reviewer_id, candidate.reviewer_username = staff.user_id, staff.username
        candidate.reviewed_at = datetime.now(timezone.utc)
        candidate.version += 1
        record_audit(db, candidate, staff, "RESEARCH_REVIEWED", {"before": before, "after": {"decision": decision, "geography": geography, "version": candidate.version}, "note": candidate.review_note})
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Research review could not be saved")
    return candidate
