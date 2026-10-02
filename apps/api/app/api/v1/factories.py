from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import IndustrialFacility
from apps.api.app.adapters.diw import load_diw_facilities

router = APIRouter(prefix="/factories", tags=["Industrial Waste Sources (DIW)"])

def seed_diw_facilities_if_needed(db: Session):
    raw_items = load_diw_facilities()
    for item in raw_items:
        f = IndustrialFacility(
            id=item["id"],
            fid=item.get("fid"),
            name=item["name"],
            business_type=item["business_type"],
            facility_type=item["facility_type"],
            official_activity_category=item.get("official_activity_category"),
            address=item["address"],
            subdistrict=item["subdistrict"],
            district=item["district"],
            province=item["province"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            horsepower=item["horsepower"],
            workers=item["workers"],
            capital=item["capital"],
            official_licensed_capacity=item.get("official_licensed_capacity"),
            hazard_evidence_status=item.get("hazard_evidence_status", "INSUFFICIENT_DATA"),
            hazard_classification=item.get("hazard_classification", "NOT_AVAILABLE_IN_REGISTRY"),
            chemical_assay_evidence=item.get("chemical_assay_evidence"),
            environmental_inspection_evidence=item.get("environmental_inspection_evidence"),
            provenance=item["provenance"]
        )
        db.merge(f)
    db.commit()

@router.get("/")
def get_industrial_facilities(
    district: Optional[str] = Query(None, description="Filter by district e.g. กบินทร์บุรี, ศรีมหาโพธิ"),
    facility_type: Optional[str] = Query(None, description="101, 105, or 106"),
    search: Optional[str] = Query(None, description="Search company name or activity"),
    limit: Optional[int] = Query(None, description="Maximum records to return"),
    db: Session = Depends(get_db)
):
    """
    Returns official DIW registered industrial waste facilities in Prachin Buri.
    Category: OFFICIAL_RECORD (Ministry of Industry).
    No fabricated toxicity scores. Hazard evidence is explicitly INSUFFICIENT_DATA.
    """
    from apps.api.app.core.config import settings
    if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION:
        return []

    query = db.query(IndustrialFacility)
    if query.count() == 0:
        seed_diw_facilities_if_needed(db)
        query = db.query(IndustrialFacility)

    if district:
        query = query.filter(IndustrialFacility.district.contains(district))
    if facility_type:
        query = query.filter(IndustrialFacility.facility_type == facility_type)
    if search:
        query = query.filter(
            (IndustrialFacility.name.ilike(f"%{search}%")) | 
            (IndustrialFacility.business_type.ilike(f"%{search}%"))
        )
        
    if limit is not None and limit > 0:
        query = query.limit(limit)

    facilities = query.all()
    return [
        {
            "id": f.id,
            "fid": f.fid,
            "name": f.name,
            "business_type": f.business_type,
            "facility_type": f.facility_type,
            "official_activity_category": f.official_activity_category,
            "address": f.address,
            "subdistrict": f.subdistrict,
            "district": f.district,
            "province": f.province,
            "latitude": f.latitude,
            "longitude": f.longitude,
            "horsepower": f.horsepower,
            "workers": f.workers,
            "capital": f.capital,
            "official_licensed_capacity": f.official_licensed_capacity,
            "hazard_evidence_status": f.hazard_evidence_status,
            "hazard_classification": f.hazard_classification,
            "chemical_assay_evidence": f.chemical_assay_evidence,
            "environmental_inspection_evidence": f.environmental_inspection_evidence,
            "provenance": f.provenance
        }
        for f in facilities
    ]

@router.get("/{facility_id}")
def get_single_facility(facility_id: str, db: Session = Depends(get_db)):
    f = db.query(IndustrialFacility).filter(IndustrialFacility.id == facility_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Facility registration not found")
    return {
        "id": f.id,
        "fid": f.fid,
        "name": f.name,
        "business_type": f.business_type,
        "facility_type": f.facility_type,
        "official_activity_category": f.official_activity_category,
        "address": f.address,
        "subdistrict": f.subdistrict,
        "district": f.district,
        "province": f.province,
        "latitude": f.latitude,
        "longitude": f.longitude,
        "horsepower": f.horsepower,
        "workers": f.workers,
        "capital": f.capital,
        "official_licensed_capacity": f.official_licensed_capacity,
        "hazard_evidence_status": f.hazard_evidence_status,
        "hazard_classification": f.hazard_classification,
        "chemical_assay_evidence": f.chemical_assay_evidence,
        "environmental_inspection_evidence": f.environmental_inspection_evidence,
        "provenance": f.provenance
    }
