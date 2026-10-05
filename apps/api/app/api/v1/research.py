"""Staff-only Prachinburi research inbox. Approval is relevance, never publication."""
from datetime import date, datetime, time, timezone
from typing import Literal
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field, StrictInt
from sqlalchemy import or_
from sqlalchemy.orm import Session
from apps.api.app.core.database import get_db
from apps.api.app.core.staff_rbac import StaffPrincipal, require_permission
from apps.api.app.models.entities import ResearchCandidate, ResearchCandidateAudit
from apps.api.app.services import research


class ResearchRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()
        async def checked(request):
            allowed_query = {field.alias for field in self.dependant.query_params}
            if any(key not in allowed_query for key in request.query_params):
                raise HTTPException(400, "Unknown research query fields are prohibited")
            try:
                return await handler(request)
            except RequestValidationError:
                raise HTTPException(400, "Invalid research request; extra authority/publication fields are prohibited")
        return checked


router = APIRouter(prefix="/admin/research", tags=["Internal Research"], route_class=ResearchRoute)
Geography = Literal["PRACHINBURI_LOCAL", "EXTERNAL_CONTEXT", "LOCATION_UNCONFIRMED", "OUT_OF_SCOPE"]


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IntakeRequest(StrictRequest):
    url: str = Field(min_length=1, max_length=2048)


class DiscoverRequest(StrictRequest):
    feed_url: str | None = Field(None, max_length=2048)


class TriageRequest(StrictRequest):
    expected_version: StrictInt = Field(ge=1)


class ReviewRequest(TriageRequest):
    decision: Literal["APPROVE_SOURCE", "NEEDS_VERIFICATION", "REJECT"]
    note: str = Field(min_length=1, max_length=2000, pattern=r"\S")
    geography: Geography | None = None
    supporting_text: str | None = Field(None, max_length=1000)
    relationship_rationale: str | None = Field(None, max_length=2000)
    privacy_resolution_note: str | None = Field(None, max_length=2000)
    district: str | None = Field(None, max_length=200)
    subdistrict: str | None = Field(None, max_length=200)
    area: str | None = Field(None, max_length=200)


@router.get("/connectors")
def connectors(staff: StaffPrincipal = Depends(require_permission("view_reports")), db: Session = Depends(get_db)):
    return {**research.connector_status(), "geography_hints": research.geography_hints(db)}


@router.get("/candidates")
def candidates(
    staff: StaffPrincipal = Depends(require_permission("view_reports")), db: Session = Depends(get_db),
    keyword: str | None = Query(None, max_length=200), area: str | None = Query(None, max_length=200),
    date_from: date | None = None, date_to: date | None = None, geography: Geography | None = None,
    source_type: Literal["MANUAL_PUBLIC_URL", "RSS"] | None = None,
    review_status: Literal["DISCOVERED", "AI_TRIAGED", "NEEDS_REVIEW", "APPROVED_SOURCE", "NEEDS_VERIFICATION", "REJECTED", "OUT_OF_SCOPE", "LOCATION_UNCONFIRMED"] | None = None,
    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
):
    query = db.query(ResearchCandidate)
    if keyword:
        query = query.filter(or_(ResearchCandidate.safe_title.ilike(f"%{keyword}%"), ResearchCandidate.safe_excerpt.ilike(f"%{keyword}%")))
    if area:
        query = query.filter(or_(ResearchCandidate.district == area, ResearchCandidate.subdistrict == area, ResearchCandidate.area == area))
    if date_from:
        query = query.filter(ResearchCandidate.discovered_at >= datetime.combine(date_from, time.min, timezone.utc))
    if date_to:
        query = query.filter(ResearchCandidate.discovered_at <= datetime.combine(date_to, time.max, timezone.utc))
    if geography:
        query = query.filter(ResearchCandidate.geography == geography)
    if source_type:
        query = query.filter(ResearchCandidate.connector_kind == source_type)
    if review_status:
        query = query.filter(ResearchCandidate.triage_status == review_status)
    return {"total": query.count(), "items": [research.serialize(item) for item in query.order_by(ResearchCandidate.discovered_at.desc(), ResearchCandidate.id).offset(offset).limit(limit).all()]}


@router.get("/candidates/{candidate_id}")
def detail(candidate_id: str, staff: StaffPrincipal = Depends(require_permission("view_reports")), db: Session = Depends(get_db)):
    candidate = research.find_candidate(db, candidate_id)
    audit = db.query(ResearchCandidateAudit).filter(ResearchCandidateAudit.candidate_id == candidate.id).order_by(ResearchCandidateAudit.created_at, ResearchCandidateAudit.id).all()
    return {**research.serialize(candidate), "audit": [{"id": item.id, "actor_id": item.actor_id, "actor_username": item.actor_username,
                                                       "action": item.action, "details": item.details, "created_at": item.created_at} for item in audit]}


@router.post("/intake")
async def intake(payload: IntakeRequest, staff: StaffPrincipal = Depends(require_permission("triage")), db: Session = Depends(get_db)):
    candidate, created = await research.intake(db, payload.url, staff)
    return {"created": created, "candidate": research.serialize(candidate)}


@router.post("/discover")
async def discover(payload: DiscoverRequest, staff: StaffPrincipal = Depends(require_permission("triage")), db: Session = Depends(get_db)):
    return await research.discover(db, payload.feed_url, staff)


@router.post("/candidates/{candidate_id}/triage")
async def triage(candidate_id: str, payload: TriageRequest, staff: StaffPrincipal = Depends(require_permission("triage")), db: Session = Depends(get_db)):
    return research.serialize(await research.triage(db, candidate_id, payload.expected_version, staff))


@router.post("/candidates/{candidate_id}/review")
def review(candidate_id: str, payload: ReviewRequest, staff: StaffPrincipal = Depends(require_permission("verify_observation")), db: Session = Depends(get_db)):
    return research.serialize(research.review(db, candidate_id, payload, staff))
