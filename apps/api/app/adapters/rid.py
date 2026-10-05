import httpx
import logging
from typing import List, Dict, Any
from apps.api.app.core.config import settings
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature, FreshnessStatus, GeocodingPrecision, VerificationStatus
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction

logger = logging.getLogger(__name__)

RID_AUDIT_EXPLANATION = (
    "The RID public API supports storage/volume/inflow/outflow fields, but usable current telemetry "
    "for the selected Prachin Buri reservoirs was unavailable/empty at audit time."
)

PRACHIN_BASIN_RESERVOIR_METADATA = {
    "rsv354": {
        "name_th": "อ่างเก็บน้ำเขาอีโต้ 1",
        "district": "เมืองปราจีนบุรี",
        "latitude": 14.1534,
        "longitude": 101.4012,
        "capacity_mcm": 2.9,
        "source": "RID Medium Reservoir Registry"
    },
    "rsv355": {
        "name_th": "อ่างเก็บน้ำทับลาน",
        "district": "นาดี",
        "latitude": 14.2882,
        "longitude": 101.9321,
        "capacity_mcm": 2.725,
        "source": "RID Medium Reservoir Registry"
    },
    "rsv499": {
        "name_th": "อ่างเก็บน้ำคลองไม้ปล้อง",
        "district": "เมืองปราจีนบุรี",
        "latitude": 14.1952,
        "longitude": 101.3789,
        "capacity_mcm": 10.7,
        "source": "RID Medium Reservoir Registry"
    },
    "rsv365": {
        "name_th": "อ่างเก็บน้ำพระปรง (ต้นน้ำลำน้ำพระปรง/กบินทร์บุรี)",
        "district": "สระแก้ว (ต้นน้ำก่อนเข้ากบินทร์บุรี)",
        "latitude": 13.9123,
        "longitude": 102.3211,
        "capacity_mcm": 97.0,
        "source": "RID Medium Reservoir Registry"
    },
    "rsv496": {
        "name_th": "อ่างเก็บน้ำคลองพระสะทึง (ลำน้ำสาขา)",
        "district": "สระแก้ว (ลำน้ำสาขาสู่กบินทร์บุรี)",
        "latitude": 13.5120,
        "longitude": 102.1890,
        "capacity_mcm": 65.0,
        "source": "RID Medium Reservoir Registry"
    },
    "rsv384": {
        "name_th": "อ่างเก็บน้ำคลองวังบอน",
        "district": "ประจันตคาม",
        "latitude": 14.2625,
        "longitude": 101.3142,
        "capacity_mcm": 7.6,
        "source": "RID Medium Reservoir Registry"
    },
    "rsv_samong": {
        "name_th": "เขื่อนนฤบดินทรจินดา (โครงการห้วยโสมงอันเนื่องมาจากพระราชดำริ)",
        "district": "นาดี",
        "latitude": 14.1834,
        "longitude": 101.9167,
        "capacity_mcm": 295.0,
        "source": "RID Major Dam Project Official Documentation"
    }
}

async def fetch_rid_reservoirs() -> List[Dict[str, Any]]:
    """
    Fetches official live reservoir telemetry from Royal Irrigation Department (RID).
    Audited: Capacity is OFFICIAL_RECORD. Live volume is MEASURED_FACT if transmitted, otherwise explicitly NO_DATA.
    Evaluates source access authorization under Master Prompt Section 2 & 7.
    """
    access_eval = evaluate_source_access(
        "thaiwater_rid_runoff",
        credential_override=settings.RID_PRIVATE_TOKEN,
        enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION
    )
    if access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
        logger.warning(
            f"RID reservoir ingestion BLOCKED by Source Access Decision Engine: {access_eval.current_status}. "
            f"Private institutional token required for production pipeline."
        )
        return []

    api_data = {}
    api_date = None
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                settings.RID_RESERVOIR_API_URL,
                headers={"User-Agent": "FloodTracePlatform/1.0 (data-integrity-audit)"}
            )
            if resp.status_code == 200:
                payload = resp.json()
                api_date = payload.get("date")
                for reg in payload.get("data", []):
                    for rsv in reg.get("reservoir", []):
                        r_id = rsv.get("id")
                        if r_id:
                            api_data[r_id] = rsv
        except Exception as e:
            logger.warning(f"Could not reach live RID API: {e}")

    results = []
    for r_id, meta in PRACHIN_BASIN_RESERVOIR_METADATA.items():
        rsv_telemetry = api_data.get(r_id, {})
        
        storage_mcm = rsv_telemetry.get("volume")
        storage_pct = rsv_telemetry.get("percent_storage")
        inflow = rsv_telemetry.get("inflow")
        outflow = rsv_telemetry.get("outflow")
        cap = rsv_telemetry.get("storage") or meta["capacity_mcm"]
        
        has_live_volume = storage_mcm is not None
        status = "TELEMETRY_RECORDED" if has_live_volume else "NO_DATA"
        category = DataCategory.MEASURED_FACT if has_live_volume else DataCategory.OFFICIAL_RECORD
        measurement_status = "PHYSICAL_TELEMETRY_RECORDED" if has_live_volume else "UNAVAILABLE_AT_AUDIT_TIME"
        value_nature = ValueNature.OBSERVED if has_live_volume else ValueNature.RECORDED

        access_eval = evaluate_source_access("rid_reservoirs", credential_override=settings.RID_PRIVATE_TOKEN, enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION)
        prov = make_provenance(
            agency="Royal Irrigation Department (RID)",
            dataset="National Reservoir and Dam Telemetry Network",
            category=category,
            source_verification=SourceVerification.VERIFIED_OFFICIAL,
            url="https://app.rid.go.th/reservoir/api/reservoir/public",
            official_id=r_id,
            original_timestamp=api_date,
            unit="Million Cubic Meters (MCM)",
            crs="EPSG:4326 (WGS84)",
            geocoding_precision=GeocodingPrecision.OFFICIAL_COORDINATES,
            confidence=1.0,
            measurement_status=measurement_status,
            model_status="NOT_APPLICABLE",
            value_nature=value_nature,
            access_method=access_eval.access_method,
            authorization_status=access_eval.authorization_status.value,
            license=access_eval.license,
            license_url=access_eval.license_url,
            raw_storage_allowed=access_eval.raw_storage_allowed,
            derived_output_allowed=access_eval.derived_output_allowed,
            redistribution_allowed=access_eval.redistribution_allowed,
            transformation="Filter Prachin Buri catchment dams. Null telemetry preserved as NULL without synthetic defaults.",
            methodology="Design storage from RID official engineering specs. Telemetry from daily staff hydrologic gauge reporting.",
            audit_notes="The RID public API supports storage/volume/inflow/outflow fields, but usable current telemetry for the selected Prachin Buri reservoirs was unavailable/empty at audit time." if not has_live_volume else "Live telemetry verified from RID gateway."
        )
        
        results.append({
            "id": r_id,
            "name_th": meta["name_th"],
            "capacity_mcm": float(cap),
            "storage_mcm": float(storage_mcm) if storage_mcm is not None else None,
            "storage_percent": float(storage_pct) if storage_pct is not None else None,
            "inflow_mcm_day": float(inflow) if inflow is not None else None,
            "outflow_mcm_day": float(outflow) if outflow is not None else None,
            "latitude": meta["latitude"],
            "longitude": meta["longitude"],
            "district": meta["district"],
            "status": status,
            "provenance": prov.to_dict()
        })
        
    return results
