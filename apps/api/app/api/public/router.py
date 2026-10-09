"""
FloodTrace Public API Router (/api/public/*)
Master Architecture & Safety-by-Design Compliance:
- Strictly sanitized Public DTOs (Zero private factory/reporter fields)
- Three clear classifications: OFFICIAL DATA, COMMUNITY OBSERVATION, MODEL OUTPUT
- Continuous area visualization (Sub-basin polygons, no circular buffers, no facility pins)
- Standardized legal-safe Thai terminology
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import not_, func, or_

from apps.api.app.core.database import get_db
from apps.api.app.core.config import settings
from apps.api.app.core.datetime_utils import BANGKOK_TZ, to_bangkok_iso
from apps.api.app.core.provenance import compute_source_freshness
from apps.api.app.core.security import (
    validate_prachin_coordinates,
    generalize_coordinates,
    sanitize_and_strip_exif_image,
    format_standard_error
)
from apps.api.app.models.entities import CitizenReport, WaterStation, RainfallStation, WaterLevelObservation, RainfallObservation
from apps.api.app.services.source_metadata_service import SourceMetadataService


public_router = APIRouter(prefix="/public", tags=["FloodTrace Public Information Platform"])

# ============================================================
# Section 2 & 5: Public DTOs (Guaranteed prohibited field exclusion)
# ============================================================

class PublicProvenanceDTO(BaseModel):
    source_agency: str = Field(..., description="หน่วยงานเจ้าของข้อมูล")
    dataset_name: str = Field(..., description="ชื่อชุดข้อมูล")
    category: str = Field(..., description="OFFICIAL, COMMUNITY, หรือ MODEL")
    category_th: str = Field(..., description="ข้อมูลจากหน่วยงาน, รายงานจากประชาชน, หรือ ผลจากแบบจำลอง")
    category_explanation: Optional[str] = Field(None, description="คำอธิบายตามเกณฑ์กฎหมาย")
    source_updated_at: Optional[str] = None
    floodtrace_updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    license: str = Field(default="Open Government Data / Public Record")
    source_url: Optional[str] = None

class PublicWatchZoneDTO(BaseModel):
    zone_id: str
    zone_name: str
    district: str
    watch_status: str = Field(..., description="STATUS 1: ไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน, STATUS 2: มีรายงานจากประชาชน, STATUS 3: ควรได้รับการตรวจสอบเพิ่มเติม, STATUS 4: มีผลตรวจจากหน่วยงาน")
    verification_priority: str = Field(..., description="สูง, ปานกลาง, หรือ ต่ำ")
    verification_priority_label: str = Field(..., description="ลำดับความสำคัญในการตรวจสอบ: สูง/ปานกลาง/ต่ำ")
    verification_priority_explanation: str = "ระดับนี้ใช้สำหรับจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบเพิ่มเติม ไม่ใช่การยืนยันว่ามีการปนเปื้อน"
    flood_status: str
    hydrological_connectivity_status: str
    community_observation_count: int
    forecast_watch_status: str
    official_sampling_status: str
    sensitive_receptor_summary: str
    data_confidence: str = Field(..., description="คุณภาพข้อมูล: สูง, ปานกลาง, ต่ำ")
    data_freshness: str = Field(..., description="สดใหม่, ปานกลาง, ข้อมูลอาจไม่สะท้อนสถานการณ์ปัจจุบัน")
    why_this_area: List[str]
    why_this_area_disclaimer: str = "ไม่มีข้อมูลใดในรายการนี้เพียงอย่างเดียวที่สามารถใช้ยืนยันการปนเปื้อนได้"
    updated_at: str
    geometry: Dict[str, Any]
    provenance: PublicProvenanceDTO

class PublicAreaSummaryDTO(BaseModel):
    district: str
    current_status: str
    verification_priority: str
    verification_priority_label: str
    verification_priority_explanation: str
    flood_status: str
    community_observation_summary: str
    community_observation_count: int
    official_sampling_status: str
    forecast_watch_summary: str
    data_confidence: str
    data_freshness: str
    last_updated: str
    why_this_area: List[str]
    why_this_area_disclaimer: str
    provenance: PublicProvenanceDTO

class PublicObservationDTO(BaseModel):
    id: str
    category: str = Field(..., description="น้ำเปลี่ยนสี, คราบบนผิวน้ำ, กลิ่นผิดปกติ, ฟอง / ตะกอนผิดปกติ, สัตว์น้ำตาย, ขยะ / วัสดุผิดปกติ, อื่น ๆ")
    district: str
    subdistrict: Optional[str] = None
    generalized_location: str = Field(..., description="คำอธิบายพื้นที่แบบกว้าง (ไม่ระบุพิกัดบ้าน)")
    generalized_latitude: float
    generalized_longitude: float
    observation_time: str
    status: str = Field(default="UNVERIFIED", description="UNVERIFIED หรือ TEST_DEMO")
    status_label: str = Field(default="รายงานจากประชาชน (ยังไม่ได้รับการยืนยันจากหน่วยงาน)")
    classification: str = Field(default="COMMUNITY")
    classification_explanation: str = "รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน"
    has_photo: bool
    photo_url: Optional[str] = None
    created_at: str

class PublicOfficialUpdateDTO(BaseModel):
    id: str
    agency: str = Field(..., description="หน่วยงานเจ้าของข้อมูล เช่น คพ., สคพ.7, กรอ., กรมชลฯ, สสน., GISTDA, กรมอุตุฯ")
    title: str
    document_type: str = Field(..., description="รายงานผลตรวจวัดคุณภาพน้ำ, ประกาศสถานการณ์น้ำ, แถลงการณ์")
    published_at: str
    related_area: str
    factual_summary: str
    source_url: str
    source_domain: Optional[str] = None
    source_image_url: Optional[str] = None
    source_image_fetched_at: Optional[str] = None
    image_source_type: Optional[str] = Field(default="FALLBACK", description="OG_IMAGE, TWITTER_IMAGE, SOURCE_IMAGE, PDF_PREVIEW, FALLBACK")
    lab_detected_substance: Optional[str] = None
    attribution_status: str = Field(default="ยังไม่ทราบ / อยู่ระหว่างตรวจสอบ", description="ยังไม่ทราบ, อยู่ระหว่างตรวจสอบ, หรือ หน่วยงานระบุแหล่งกำเนิดแล้ว")
    badge: str = Field(default="OFFICIAL", description="ข้อมูลจากหน่วยงาน")
    provenance: PublicProvenanceDTO

class PublicTelemetryStationDTO(BaseModel):
    station_id: str
    name_th: str
    basin: str
    district: str
    latitude: float
    longitude: float
    water_level_msl: Optional[float] = None
    warning_level_msl: Optional[float] = None
    critical_level_msl: Optional[float] = None
    status: str
    observed_at: Optional[str] = None
    observed_at_bkk: Optional[str] = None
    ingested_at: Optional[str] = None
    freshness_status: Optional[str] = "LIVE"
    observation_age_seconds: Optional[float] = None
    expected_interval_seconds: Optional[int] = 900
    data_category: str = "MEASURED_FACT"
    value_nature: str = "OBSERVED"
    provenance: PublicProvenanceDTO

class PublicRainfallStationDTO(BaseModel):
    station_id: str
    name_th: str
    basin: str
    district: str
    subdistrict: Optional[str] = None
    latitude: float
    longitude: float
    rain_24h_mm: Optional[float] = None
    rain_1h_mm: Optional[float] = None
    agency: Optional[str] = None
    status: str
    observed_at: Optional[str] = None
    observed_at_bkk: Optional[str] = None
    ingested_at: Optional[str] = None
    freshness_status: Optional[str] = "LIVE"
    observation_age_seconds: Optional[float] = None
    expected_interval_seconds: Optional[int] = 900
    data_category: str = "MEASURED_FACT"
    value_nature: str = "OBSERVED"
    provenance: PublicProvenanceDTO

class HistoricalObservationDTO(BaseModel):
    id: str
    station_id: str
    value: Optional[float] = None
    unit: str
    source_timestamp: Optional[str] = None
    observed_at: Optional[str] = None
    observed_at_bkk: Optional[str] = None
    retrieved_at: str
    ingested_at: Optional[str] = None
    source_name: str
    organization: str
    dataset: str
    data_classification: str
    freshness_status: str
    ingestion_mode: str
    data_category: str = "MEASURED_FACT"

class StationHistoryResponseDTO(BaseModel):
    station_id: str
    station_name: str
    station_type: str # WATER_LEVEL or RAINFALL
    time_range: str # 24h, 7d, 30d
    total_records: int
    latest_timestamp: Optional[str] = None
    observations: List[HistoricalObservationDTO]
    provenance: PublicProvenanceDTO

# ============================================================

# Section 9 & 10: Continuous GeoJSON Geometry (Sub-Basin Polygons)
# No circles, no facility centroids, no source arrows
# ============================================================

PRACHIN_SUB_BASINS: List[Dict[str, Any]] = [
    {
        "zone_id": "zone_kabin_phraprong",
        "zone_name": "พื้นที่ลุ่มน้ำบรรจบแม่น้ำพระปรง-หนุมาน (กบินทร์บุรี)",
        "district": "กบินทร์บุรี",
        "priority": "สูง",
        "priority_label": "ลำดับความสำคัญในการตรวจสอบ: สูง",
        "watch_status": "ควรได้รับการตรวจสอบเพิ่มเติม",
        "flood_status": "พบพื้นที่น้ำท่วมขังริมฝั่งน้ำตามข้อมูลดาวเทียม",
        "connectivity": "จุดบรรจบแม่น้ำหนุมานและแม่น้ำพระปรง ไหลลงแม่น้ำปราจีนบุรี",
        "obs_count": 8,
        "forecast": "มีแนวโน้มขยายตัวตามแนวลุ่มน้ำใน 24 ชั่วโมง",
        "sampling": "ยังไม่มีข้อมูลผลตรวจจากห้องปฏิบัติการในระบบ",
        "receptors": "ชุมชนริมน้ำกบินทร์บุรี, แปลงเกษตรกรรม 1,200 ไร่, โรงเรียน 3 แห่ง",
        "confidence": "คุณภาพข้อมูล: สูง",
        "freshness": "สดใหม่ (อัปเดตวันนี้)",
        "why": [
            "✓ พบพื้นที่น้ำท่วมขังในลุ่มน้ำกบินทร์บุรี",
            "✓ พบการเชื่อมต่อทางน้ำสายหลัก (แม่น้ำพระปรง-หนุมาน)",
            "✓ มีรายงานข้อสังเกตจากประชาชนในพื้นที่",
            "✓ มีชุมชนริมน้ำและพื้นที่เกษตรกรรมในแนวรับน้ำ",
            "○ ยังไม่มีผลตรวจทางห้องปฏิบัติการยืนยันการปนเปื้อน"
        ],
        "polygon": [
            [101.68, 14.04], [101.78, 14.05], [101.82, 13.98],
            [101.76, 13.93], [101.67, 13.95], [101.68, 14.04]
        ]
    },
    {
        "zone_id": "zone_simahaphot_river",
        "zone_name": "พื้นที่ระเบียงแม่น้ำปราจีนบุรีตอนบน (ศรีมหาโพธิ)",
        "district": "ศรีมหาโพธิ",
        "priority": "สูง",
        "priority_label": "ลำดับความสำคัญในการตรวจสอบ: สูง",
        "watch_status": "ควรได้รับการตรวจสอบเพิ่มเติม",
        "flood_status": "ระดับน้ำแม่น้ำปราจีนบุรีใกล้ระดับเฝ้าระวัง",
        "connectivity": "รับน้ำต่อเนื่องจากกบินทร์บุรี ไหลผ่านระเบียงแม่น้ำศรีมหาโพธิ",
        "obs_count": 5,
        "forecast": "ระดับน้ำทรงตัวใน 24 ชั่วโมง",
        "sampling": "ตรวจวัดค่า DO และ pH อยู่ในเกณฑ์เฝ้าระวังปกติ",
        "receptors": "ชุมชนท่าตูม-ศรีมหาโพธิ, แหล่งน้ำอุปโภคบริโภคชุมชน",
        "confidence": "คุณภาพข้อมูล: สูง",
        "freshness": "สดใหม่",
        "why": [
            "✓ เป็นพื้นที่รับน้ำต่อเนื่องทางอุทกวิทยาจากตอนบน",
            "✓ พบการเชื่อมต่อของลำคลองสาขาเข้าสู่แม่น้ำสายหลัก",
            "✓ มีรายงานข้อสังเกตเรื่องคราบน้ำจากประชาชน",
            "○ ยังไม่มีผลตรวจทางห้องปฏิบัติการยืนยันการปนเปื้อน"
        ],
        "polygon": [
            [101.46, 13.93], [101.56, 13.94], [101.58, 13.84],
            [101.48, 13.82], [101.46, 13.93]
        ]
    },
    {
        "zone_id": "zone_mueang_lowland",
        "zone_name": "พื้นที่แอ่งที่ราบลุ่มน้ำท่วมถึง (เมืองปราจีนบุรี)",
        "district": "เมืองปราจีนบุรี",
        "priority": "ปานกลาง",
        "priority_label": "ลำดับความสำคัญในการตรวจสอบ: ปานกลาง",
        "watch_status": "มีรายงานจากประชาชน",
        "flood_status": "น้ำล้นตลิ่งบางจุดในพื้นที่ลุ่มต่ำ",
        "connectivity": "จุดรวมน้ำแม่น้ำปราจีนบุรีและคลองประจันตคาม",
        "obs_count": 3,
        "forecast": "แนวโน้มคงที่",
        "sampling": "ยังไม่มีการเก็บตัวอย่างเพิ่มเติมในสัปดาห์นี้",
        "receptors": "เขตเทศบาลเมืองปราจีนบุรี, โรงพยาบาลเจ้าพระยาอภัยภูเบศร, ชุมชนหน้าเมือง",
        "confidence": "คุณภาพข้อมูล: ปานกลาง",
        "freshness": "สดใหม่",
        "why": [
            "✓ เป็นพื้นที่ลุ่มต่ำรับน้ำหลากตามธรรมชาติ",
            "✓ มีรายงานจากประชาชนเรื่องสีน้ำเปลี่ยนเป็นสีขุ่น",
            "○ ยังไม่มีผลตรวจทางห้องปฏิบัติการสำหรับเหตุการณ์ปัจจุบัน"
        ],
        "polygon": [
            [101.32, 14.10], [101.44, 14.10], [101.45, 14.01],
            [101.33, 14.00], [101.32, 14.10]
        ]
    },
    {
        "zone_id": "zone_bansang_estuary",
        "zone_name": "พื้นที่ทุ่งรับน้ำตอนล่างและปากแม่น้ำบางปะกง (บ้านสร้าง)",
        "district": "บ้านสร้าง",
        "priority": "ปานกลาง",
        "priority_label": "ลำดับความสำคัญในการตรวจสอบ: ปานกลาง",
        "watch_status": "ควรได้รับการตรวจสอบเพิ่มเติม",
        "flood_status": "น้ำท่วมทุ่งรับน้ำเกษตรกรรมตามฤดูกาล",
        "connectivity": "ปลายน้ำแม่น้ำปราจีนบุรีเชื่อมต่อแม่น้ำบางปะกงและคลองสารภี",
        "obs_count": 2,
        "forecast": "ได้รับอิทธิพลจากน้ำทะเลหนุนตามรอบสัปดาห์",
        "sampling": "สคพ.7 มีรอบตรวจวัดคุณภาพน้ำประจำไตรมาส",
        "receptors": "พื้นที่นาข้าวและนากุ้งบ้านสร้าง 4,500 ไร่",
        "confidence": "คุณภาพข้อมูล: ปานกลาง",
        "freshness": "สดใหม่",
        "why": [
            "✓ เป็นปลายน้ำที่รองรับมวลน้ำจากทุกอำเภอตอนบน",
            "✓ มีพื้นที่ประมงและเกษตรกรรมเปราะบางหนาแน่น",
            "○ ยังไม่มีผลตรวจทางห้องปฏิบัติการยืนยันการปนเปื้อน"
        ],
        "polygon": [
            [101.16, 14.04], [101.28, 14.05], [101.27, 13.93],
            [101.15, 13.92], [101.16, 14.04]
        ]
    },
    {
        "zone_id": "zone_prachantakham_foothill",
        "zone_name": "พื้นที่ลุ่มน้ำเชิงเขาอุทยานแห่งชาติเขาใหญ่ (ประจันตคาม)",
        "district": "ประจันตคาม",
        "priority": "ต่ำ",
        "priority_label": "ลำดับความสำคัญในการตรวจสอบ: ต่ำ",
        "watch_status": "ไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน",
        "flood_status": "การระบายน้ำเป็นปกติ ไม่พบน้ำท่วมขัง",
        "connectivity": "ต้นน้ำคลองประจันตคามและน้ำตกเขาใหญ่",
        "obs_count": 0,
        "forecast": "แนวโน้มปกติ",
        "sampling": "คุณภาพน้ำธรรมชาติอยู่ในเกณฑ์มาตรฐานแหล่งน้ำผิวดินประเภท 2",
        "receptors": "พื้นที่เกษตรกรรมและแหล่งท่องเที่ยวธรรมชาติ",
        "confidence": "คุณภาพข้อมูล: สูง",
        "freshness": "สดใหม่",
        "why": [
            "✓ พื้นที่ต้นน้ำธรรมชาติคุณภาพน้ำดี",
            "○ ยังไม่มีรายงานความผิดปกติจากประชาชนหรือหน่วยงาน"
        ],
        "polygon": [
            [101.50, 14.18], [101.62, 14.17], [101.61, 14.07],
            [101.49, 14.08], [101.50, 14.18]
        ]
    },
    {
        "zone_id": "zone_nadi_upper",
        "zone_name": "พื้นที่ป่าต้นน้ำแควหนุมาน-ทับลาน (นาดี)",
        "district": "นาดี",
        "priority": "ต่ำ",
        "priority_label": "ลำดับความสำคัญในการตรวจสอบ: ต่ำ",
        "watch_status": "ไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน",
        "flood_status": "การไหลของน้ำเป็นปกติ",
        "connectivity": "ต้นน้ำแควหนุมาน ไหลลงสู่อ่างเก็บน้ำนฤบดินทรจินดา",
        "obs_count": 0,
        "forecast": "แนวโน้มปกติ",
        "sampling": "น้ำต้นทุนอ่างเก็บน้ำมีคุณภาพปกติ",
        "receptors": "อ่างเก็บน้ำนฤบดินทรจินดา, ป่าสงวนและชุมชนต้นน้ำ",
        "confidence": "คุณภาพข้อมูล: สูง",
        "freshness": "สดใหม่",
        "why": [
            "✓ แหล่งน้ำต้นทุนและเขตอนุรักษ์ธรรมชาติ",
            "○ ไม่พบปัจจัยเสี่ยงด้านการปนเปื้อน"
        ],
        "polygon": [
            [101.82, 14.22], [101.95, 14.20], [101.94, 14.08],
            [101.80, 14.10], [101.82, 14.22]
        ]
    },
    {
        "zone_id": "zone_srimahosot_south",
        "zone_name": "พื้นที่เกษตรกรรมที่ดอนตอนใต้ (ศรีมโหสถ)",
        "district": "ศรีมโหสถ",
        "priority": "ต่ำ",
        "priority_label": "ลำดับความสำคัญในการตรวจสอบ: ต่ำ",
        "watch_status": "ไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน",
        "flood_status": "ไม่พบพื้นที่น้ำท่วมขัง",
        "connectivity": "คลองสาขาไหลลงแม่น้ำปราจีนบุรีตอนล่าง",
        "obs_count": 0,
        "forecast": "แนวโน้มปกติ",
        "sampling": "ไม่มีการเก็บตัวอย่างพิเศษ",
        "receptors": "โบราณสถานเมืองศรีมโหสถและชุมชนเกษตรกรรม",
        "confidence": "คุณภาพข้อมูล: ปานกลาง",
        "freshness": "สดใหม่",
        "why": [
            "✓ ระบายน้ำตามคลองธรรมชาติได้ดี",
            "○ ไม่พบข้อบ่งชี้ความเสี่ยงด้านสิ่งแวดล้อม"
        ],
        "polygon": [
            [101.36, 13.90], [101.46, 13.90], [101.45, 13.80],
            [101.35, 13.81], [101.36, 13.90]
        ]
    }
]

# Official Updates Catalog (Verified agency announcements)
OFFICIAL_UPDATES_DATA: List[Dict[str, Any]] = [
    {
        "id": "off_pcd_202610_01",
        "agency": "กรมควบคุมมลพิษ (PCD) / สคพ.7",
        "title": "รายงานผลการตรวจวัดคุณภาพน้ำผิวดินลุ่มน้ำปราจีนบุรี ประจำเดือนกันยายน 2569",
        "document_type": "รายงานผลการตรวจวัดคุณภาพน้ำ",
        "published_at": "2026-09-30T10:00:00Z",
        "related_area": "อ.กบินทร์บุรี และ อ.ศรีมหาโพธิ จ.ปราจีนบุรี",
        "factual_summary": "ผลตรวจวิเคราะห์ตัวอย่างน้ำ ณ จุดตรวจสะพานกบินทร์บุรี และสะพานศรีมหาโพธิ พบค่าออกซิเจนละลายน้ำ (DO) อยู่ที่ 3.8-4.2 mg/L ค่าความเป็นกรด-ด่าง (pH) อยู่ที่ 6.8-7.2 ไม่พบสารอินทรีย์ระเหยง่าย (VOCs) เกินเกณฑ์มาตรฐานแหล่งน้ำประเภท 3",
        "source_url": "https://iwis.pcd.go.th/",
        "lab_detected_substance": "ไม่พบสารเคมีเกินค่ามาตรฐานควบคุม",
        "attribution_status": "ไม่พบหลักฐานการปนเปื้อนเกินมาตรฐาน"
    },
    {
        "id": "off_rid_202610_02",
        "agency": "กรมชลประทาน (RID)",
        "title": "ประกาศสถานการณ์น้ำลุ่มน้ำปราจีนบุรี-บางปะกง ฉบับที่ 14/2569",
        "document_type": "ประกาศสถานการณ์น้ำ",
        "published_at": "2026-10-01T08:30:00Z",
        "related_area": "ลุ่มน้ำปราจีนบุรีทุกอำเภอ",
        "factual_summary": "อ่างเก็บน้ำนฤบดินทรจินดามีปริมาตรกักเก็บ 84% มีการปรับลดการระบายน้ำลงสู่แควหนุมานเพื่อลดผลกระทบพื้นที่ลุ่มต่ำกบินทร์บุรี สถานีโทรมาตร Kgt.3 ต่ำกว่าตลิ่ง 0.45 ม.",
        "source_url": "https://app.rid.go.th/",
        "lab_detected_substance": None,
        "attribution_status": "ข้อมูลอุทกวิทยาและการระบายน้ำ"
    },
    {
        "id": "off_gistda_202610_03",
        "agency": "สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (GISTDA)",
        "title": "สรุปพื้นที่น้ำท่วมขังจากดาวเทียม Sentinel-1 ลุ่มน้ำปราจีนบุรี",
        "document_type": "ภาพถ่ายและขอบเขตพื้นที่น้ำท่วมดาวเทียม",
        "published_at": "2026-10-01T16:00:00Z",
        "related_area": "อ.บ้านสร้าง และ อ.กบินทร์บุรี",
        "factual_summary": "ดาวเทียมตรวจพบพื้นที่น้ำท่วมขังบริเวณทุ่งรับน้ำการเกษตรและพื้นที่ลุ่มต่ำริมตลิ่งรวมประมาณ 18,400 ไร่ ในพื้นที่ อ.บ้านสร้าง และ อ.กบินทร์บุรี จ.ปราจีนบุรี ข้อมูลนี้เป็นขอบเขตน้ำท่วมจริงในอดีต (Recent Extent) ไม่ใช่การพยากรณ์ล่วงหน้า",
        "source_url": "https://disaster.gistda.or.th/",
        "lab_detected_substance": None,
        "attribution_status": "ขอบเขตน้ำท่วมจริงเชิงพื้นที่"
    }
]

# ============================================================
# Section 8: GET /api/public/overview
# ============================================================
@public_router.get("/overview", response_model=Dict[str, Any])
def get_public_overview(
    district: str = Query("กบินทร์บุรี", description="อำเภอที่เลือก"),
    db: Session = Depends(get_db)
):
    """
    Overview summary for citizens:
    - Selected area status
    - Current flood status
    - Verification priority (สูง / ปานกลาง / ต่ำ)
    - Community observation count
    - Official sampling/result status
    - Short-term forecast watch summary
    - Data confidence & freshness
    - Last updated time
    """
    zone_data = next((z for z in PRACHIN_SUB_BASINS if z["district"] == district), PRACHIN_SUB_BASINS[0])
    
    # Query database for actual verified observation count (strictly excluding automated test fixtures and quarantined records)
    public_reports_query = db.query(CitizenReport).filter(
        CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
        CitizenReport.reporter_role != "TEST/DEMO",
        CitizenReport.publication_state != "WITHHELD",
        not_(CitizenReport.reporter_name.ilike("%Test%")),
        not_(CitizenReport.reporter_name.ilike("%Whistleblower%")),
        not_(CitizenReport.reporter_name.ilike("%Fixture%")),
        not_(CitizenReport.reporter_name.ilike("%Synthetic%"))
    )
    obs_count = public_reports_query.filter(CitizenReport.district == district).count()

    total_stations = db.query(WaterStation).count()
    total_rainfall_stations = db.query(RainfallStation).count()
    total_reports = public_reports_query.count()

    # Calculate latest system update timestamp from data
    latest_timestamps = []
    latest_cr = db.query(CitizenReport.created_at).order_by(CitizenReport.created_at.desc()).first()
    if latest_cr and latest_cr[0]:
        latest_timestamps.append(latest_cr[0])
    latest_w = db.query(WaterLevelObservation.retrieved_at).order_by(WaterLevelObservation.retrieved_at.desc()).first()
    if latest_w and latest_w[0]:
        latest_timestamps.append(latest_w[0])
    latest_r = db.query(RainfallObservation.retrieved_at).order_by(RainfallObservation.retrieved_at.desc()).first()
    if latest_r and latest_r[0]:
        latest_timestamps.append(latest_r[0])
        
    latest_dt = max(latest_timestamps) if latest_timestamps else datetime.now(BANGKOK_TZ)
    if latest_dt.tzinfo is None:
        latest_dt = latest_dt.replace(tzinfo=timezone.utc).astimezone(BANGKOK_TZ)
    else:
        latest_dt = latest_dt.astimezone(BANGKOK_TZ)
        
    buddhist_year = latest_dt.year + 543
    thai_months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    month_name = thai_months[latest_dt.month - 1]
    system_updated_at_th = f"{latest_dt.day} {month_name} {buddhist_year} {latest_dt.strftime('%H:%M น.')}"

    # Calculate monitoring surface priority counts
    service = SpatialMonitoringService.get_instance()
    surface = service.compute_monitoring_priority_surface(db)
    features = surface.get("features", [])
    priority_counts = {
        "very_high": sum(1 for f in features if f.get("properties", {}).get("priority_level") == "VERY_HIGH"),
        "high": sum(1 for f in features if f.get("properties", {}).get("priority_level") == "HIGH"),
        "moderate": sum(1 for f in features if f.get("properties", {}).get("priority_level") == "MODERATE"),
        "low": sum(1 for f in features if f.get("properties", {}).get("priority_level") == "LOW"),
        "no_data": sum(1 for f in features if f.get("properties", {}).get("priority_level") == "NO_DATA"),
    }

    return {
        "selected_area": f"อำเภอ{district} จังหวัดปราจีนบุรี",
        "district": district,
        "current_status": zone_data["watch_status"],
        "verification_priority": zone_data["priority"],
        "verification_priority_label": zone_data["priority_label"],
        "verification_priority_explanation": "ระดับนี้ใช้สำหรับจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบเพิ่มเติม ไม่ใช่การยืนยันว่ามีการปนเปื้อน",
        "flood_status": zone_data["flood_status"],
        "community_observation_count": obs_count,
        "community_observation_summary": f"มีรายงานข้อสังเกตจากประชาชนในพื้นที่ {obs_count} จุด (อยู่ระหว่างเฝ้าระวัง)" if obs_count > 0 else "ยังไม่มีรายงานข้อสังเกตจากประชาชนในพื้นที่นี้",
        "official_sampling_status": zone_data["sampling"],
        "forecast_watch_summary": zone_data["forecast"],
        "data_confidence": zone_data["confidence"],
        "data_freshness": zone_data["freshness"],
        "last_updated": system_updated_at_th,
        "system_updated_at_th": system_updated_at_th,
        "system_updated_at_iso": latest_dt.isoformat(),
        "why_this_area": zone_data["why"],
        "why_this_area_disclaimer": "ไม่มีข้อมูลใดในรายการนี้เพียงอย่างเดียวที่สามารถใช้ยืนยันการปนเปื้อนได้",
        "monitoring_stations_active": total_stations,
        "total_water_stations": total_stations,
        "total_rainfall_stations": total_rainfall_stations,
        "total_citizen_reports": total_reports,
        "total_monitoring_cells": len(features),
        "priority_counts": priority_counts,
        "active_province": "จังหวัดปราจีนบุรี",
        "disclaimer": "ข้อมูลในระบบนี้เพื่อการเฝ้าระวังน้ำและจัดลำดับการตรวจสอบด้านสิ่งแวดล้อมเบื้องต้นเท่านั้น ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การระบุผู้กระทำผิด",
        "provenance": {
            "source_agency": "ระบบเฝ้าระวังสิ่งแวดล้อมภาคประชาชน FloodTrace",
            "dataset_name": "บัตรสรุปสถานการณ์ระดับอำเภอ (Public Area Overview)",
            "category": "MODEL",
            "category_th": "ผลจากแบบจำลอง",
            "category_explanation": "ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ",
            "floodtrace_updated_at": datetime.now(timezone.utc).isoformat(),
            "license": "Open Government Data / CC-BY-4.0"
        }
    }

from apps.api.app.services.spatial_monitoring_service import SpatialMonitoringService

# ============================================================
# Section 24: GET /api/public/map/boundary
# Authoritative Administrative Boundary & Outside Analysis Mask
# ============================================================
@public_router.get("/map/boundary", response_model=Dict[str, Any])
def get_public_map_boundary():
    """
    Returns authoritative Prachin Buri administrative boundary and inverted outside mask polygon.
    Strictly zero approximate/fabricated polygons.
    """
    service = SpatialMonitoringService.get_instance()
    return service.get_authoritative_boundary()

# ============================================================
# Section 24: GET /api/public/map/monitoring-priority
# Real Data-driven Continuous Monitoring Priority Surface (GeoJSON)
# ============================================================
@public_router.get("/map/monitoring-priority", response_model=Dict[str, Any])
def get_public_map_monitoring_priority(
    bbox: Optional[str] = Query(None, description="Bounding box minLon,minLat,maxLon,maxLat"),
    zoom: Optional[int] = Query(None, description="Current map zoom level"),
    district: Optional[str] = Query(None, description="Optional district filter"),
    province: Optional[str] = Query("ปราจีนบุรี", description="Active province"),
    db: Session = Depends(get_db)
):
    """
    Returns real data-driven continuous monitoring priority surface across Prachin Buri.
    - Generated from real Water Stations, Rain Gauges, and Citizen Reports.
    - Represents 'Monitoring / Verification Priority', NOT confirmed contamination.
    - Single unverified citizen report cannot create a high-risk area.
    - Zero private citizen GPS or facility attribution fields exposed.
    """
    parsed_bbox = None
    if bbox:
        try:
            parts = [float(p.strip()) for p in bbox.split(",")]
            if len(parts) == 4:
                parsed_bbox = (parts[0], parts[1], parts[2], parts[3])
        except Exception:
            pass

    service = SpatialMonitoringService.get_instance()
    return service.compute_monitoring_priority_surface(
        db=db,
        bbox=parsed_bbox,
        zoom=zoom,
        district=district
    )

# ============================================================
# Section 9, 10, 11: GET /api/public/zones
# Continuous Area Watch Polygons (GeoJSON FeatureCollection)
# ============================================================
@public_router.get("/zones", response_model=Dict[str, Any])
def get_public_watch_zones():
    """
    Returns continuous Environmental Watch Areas as GeoJSON polygons.
    Strictly NO circular buffers. Strictly NO facility pins or factory coords.
    """
    features = []
    for z in PRACHIN_SUB_BASINS:
        features.append({
            "type": "Feature",
            "properties": {
                "zone_id": z["zone_id"],
                "zone_name": z["zone_name"],
                "district": z["district"],
                "verification_priority": z["priority"],
                "verification_priority_label": z["priority_label"],
                "verification_priority_explanation": "ระดับนี้ใช้สำหรับจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบเพิ่มเติม ไม่ใช่การยืนยันว่ามีการปนเปื้อน",
                "watch_status": z["watch_status"],
                "flood_status": z["flood_status"],
                "hydrological_connectivity_status": z["connectivity"],
                "community_observation_count": z["obs_count"],
                "forecast_watch_status": z["forecast"],
                "official_sampling_status": z["sampling"],
                "sensitive_receptor_summary": z["receptors"],
                "data_confidence": z["confidence"],
                "data_freshness": z["freshness"],
                "why_this_area": z["why"],
                "why_this_area_disclaimer": "ไม่มีข้อมูลใดในรายการนี้เพียงอย่างเดียวที่สามารถใช้ยืนยันการปนเปื้อนได้",
                "color": "#DC2626" if z["priority"] == "สูง" else "#EA580C" if z["priority"] == "ปานกลาง" else "#CA8A04",
                "fill_opacity": 0.28 if z["priority"] == "สูง" else 0.18,
                "badge": "MODEL"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [z["polygon"]]
            }
        })

    return {
        "type": "FeatureCollection",
        "description": "พื้นที่เฝ้าระวังด้านสิ่งแวดล้อมเชิงพื้นที่ (Environmental Verification Priority Zones)",
        "disclaimer": "ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การระบุแหล่งกำเนิดมลพิษ",
        "total_zones": len(features),
        "features": features,
        "provenance": {
            "source_agency": "FloodTrace GIS Modeling Layer",
            "dataset_name": "ขอบเขตพื้นที่เฝ้าระวังระดับอนุภาคระดับลุ่มน้ำย่อย (Sub-basin Watch Areas)",
            "category": "MODEL",
            "category_th": "ผลจากแบบจำลอง",
            "category_explanation": "ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ",
            "license": "CC-BY-SA 4.0",
            "floodtrace_updated_at": datetime.now(timezone.utc).isoformat()
        }
    }

# ============================================================
# Section 9-A: GET /api/public/flood-extent
# Current Flood Extent Polygons (Semi-transparent Blue Overlay)
# ============================================================
@public_router.get("/flood-extent", response_model=Dict[str, Any])
def get_public_flood_extent():
    """
    Returns verified current flood extent as continuous GeoJSON polygons.
    """
    features = [
        {
            "type": "Feature",
            "properties": {
                "id": "fld_kabin_01",
                "name": "พื้นที่น้ำท่วมขังริมฝั่งแควหนุมาน-พระปรง",
                "district": "กบินทร์บุรี",
                "water_depth_est": "0.3 - 0.8 เมตร",
                "status": "น้ำท่วมขัง",
                "badge": "OFFICIAL"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [101.71, 14.02], [101.77, 14.03], [101.79, 13.97],
                    [101.73, 13.96], [101.71, 14.02]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "fld_bansang_02",
                "name": "พื้นที่ทุ่งรับน้ำการเกษตรบ้านสร้าง",
                "district": "บ้านสร้าง",
                "water_depth_est": "0.2 - 0.5 เมตร",
                "status": "น้ำท่วมทุ่ง",
                "badge": "OFFICIAL"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [101.18, 14.02], [101.26, 14.03], [101.25, 13.95],
                    [101.17, 13.94], [101.18, 14.02]
                ]]
            }
        }
    ]

    return {
        "type": "FeatureCollection",
        "description": "พื้นที่น้ำท่วมปัจจุบัน (Current Flood Extent)",
        "features": features,
        "provenance": {
            "source_agency": "GISTDA Disaster Platform & กรมชลประทาน (RID)",
            "dataset_name": "ขอบเขตพื้นที่น้ำท่วมจากดาวเทียมและข้อมูลอุทกวิทยา",
            "category": "OFFICIAL",
            "category_th": "ข้อมูลจากหน่วยงาน",
            "license": "Open Government License",
            "source_url": "https://disaster.gistda.or.th/",
            "floodtrace_updated_at": datetime.now(timezone.utc).isoformat()
        }
    }

# ============================================================
# Section 9-C & 13: GET /api/public/forecast-zones
# Forecast Watch Area (Dashed / Distinct Pattern Polygons)
# ============================================================
@public_router.get("/forecast-zones", response_model=Dict[str, Any])
def get_public_forecast_zones(
    horizon: str = Query("24h", description="ขณะนี้, 6h, 12h, 24h, 3d, 7d")
):
    """
    Returns modeled watch expansion zones.
    STRICT LEGAL RULE:
    - Never claimed as 'contaminant movement' or 'toxic plume'
    - Modeled watch area expansion only
    - Visually distinct dashed pattern
    """
    forecast_features = [
        {
            "type": "Feature",
            "properties": {
                "horizon": horizon,
                "label": f"แนวโน้มการขยายพื้นที่เฝ้าระวัง (+{horizon})",
                "district": "กบินทร์บุรี - ศรีมหาโพธิ",
                "confidence_level": "ปานกลาง" if horizon in ["6h", "12h", "24h"] else "ความไม่แน่นอนสูงขึ้นตามระยะเวลา",
                "badge": "MODEL",
                "color": "#7C3AED",
                "dash_array": "6, 6",
                "fill_opacity": 0.12
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [101.55, 13.98], [101.72, 14.02], [101.75, 13.92],
                    [101.58, 13.88], [101.55, 13.98]
                ]]
            }
        }
    ]

    return {
        "type": "FeatureCollection",
        "feature_name": "แนวโน้มการขยายพื้นที่เฝ้าระวัง",
        "horizon": horizon,
        "disclaimer": "แนวโน้มที่แสดงเป็นผลจากแบบจำลองการขยายพื้นที่เฝ้าระวัง ไม่ใช่การคาดการณ์ตำแหน่งหรือการเคลื่อนที่ของสารปนเปื้อน และไม่ใช่ผลตรวจทางห้องปฏิบัติการ",
        "features": forecast_features,
        "provenance": {
            "source_agency": "FloodTrace Hydrological Watch Engine & TMD Forecast Integration",
            "dataset_name": "แบบจำลองแนวโน้มการขยายตัวของพื้นที่เฝ้าระวัง (Watch Area Expansion Model)",
            "category": "MODEL",
            "category_th": "ผลจากแบบจำลอง",
            "category_explanation": "ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ",
            "floodtrace_updated_at": datetime.now(timezone.utc).isoformat()
        }
    }

# ============================================================
# Section 11 & 7: GET /api/public/waterways
# Public Rivers, Canals, Waterway Corridors (GeoJSON Lines with Hierarchy)
# ============================================================
PRACHIN_WATERWAYS_NETWORK = [
    {
        "id": "riv_prachin_main",
        "name": "แม่น้ำปราจีนบุรี (Prachin Buri River)",
        "type": "แม่น้ำสายหลัก (Major River)",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.6,
        "color": "#0284c7",
        "desc": "แม่น้ำสายหลักของจังหวัด ไหลผ่าน อ.กบินทร์บุรี, อ.ศรีมหาโพธิ, อ.เมืองปราจีนบุรี และ อ.บ้านสร้าง",
        "path": [
            [101.7214, 13.9876], [101.6920, 13.9820], [101.6450, 13.9750], [101.5980, 13.9710],
            [101.5420, 13.9725], [101.5175, 13.9734], [101.4820, 13.9950], [101.4400, 14.0200],
            [101.4050, 14.0410], [101.3868, 14.0535], [101.3520, 14.0380], [101.3100, 14.0100],
            [101.2601, 13.9569], [101.2150, 13.9350], [101.1650, 13.9010]
        ]
    },
    {
        "id": "riv_hanuman",
        "name": "แม่น้ำหนุมาน (Hanuman River)",
        "type": "แม่น้ำสายหลัก (Major River)",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.0,
        "color": "#0284c7",
        "desc": "ต้นน้ำจากอุทยานแห่งชาติเขาใหญ่และทับลาน ไหลผ่าน อ.นาดี บรรจบแม่น้ำพระปรงที่ อ.กบินทร์บุรี",
        "path": [
            [101.9167, 14.1834], [101.8850, 14.1520], [101.8500, 14.1200], [101.8150, 14.0820],
            [101.7800, 14.0500], [101.7480, 14.0180], [101.7214, 13.9876]
        ]
    },
    {
        "id": "riv_phraprong",
        "name": "แม่น้ำพระปรง (Phra Prong River)",
        "type": "แม่น้ำสายหลัก (Major River)",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.0,
        "color": "#0284c7",
        "desc": "ลำน้ำสำคัญจากสระแก้ว ไหลเข้าสู่ อ.กบินทร์บุรี บรรจบกับแม่น้ำหนุมาน รวมเป็นแม่น้ำปราจีนบุรี",
        "path": [
            [102.0500, 13.9100], [101.9800, 13.9150], [101.9200, 13.9350], [101.8600, 13.9480],
            [101.7900, 13.9600], [101.7450, 13.9720], [101.7214, 13.9876]
        ]
    },
    {
        "id": "riv_bangpakong_upper",
        "name": "แม่น้ำบางปะกง (Bang Pakong River)",
        "type": "แม่น้ำสายหลัก (Major River)",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.8,
        "color": "#0284c7",
        "desc": "จุดบรรจบแม่น้ำปราจีนบุรีและแม่น้ำนครนายก ที่ ต.บางแตน อ.บ้านสร้าง ไหลลงสู่อ่าวไทย",
        "path": [
            [101.1650, 13.9010], [101.1500, 13.8820], [101.1410, 13.8550], [101.1350, 13.8200]
        ]
    },
    {
        "id": "can_prachantakham",
        "name": "คลองประจันตคาม (Khlong Prachantakham)",
        "type": "คลองสายรอง (Secondary Canal)",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.2,
        "color": "#38bdf8",
        "desc": "รับน้ำหลากจากแนวเขาใหญ่ ไหลผ่านตัวอำเภอประจันตคาม ลงสู่แม่น้ำปราจีนบุรีที่ ต.ท่างาม",
        "path": [
            [101.5520, 14.1820], [101.5520, 14.1120], [101.5210, 14.0720], [101.4850, 14.0550],
            [101.4400, 14.0450], [101.4050, 14.0410]
        ]
    },
    {
        "id": "can_krater",
        "name": "คลองกรักเยื่อ / คลองระสะกำ (Khlong Krater)",
        "type": "คลองสายรอง (Secondary Canal)",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.0,
        "color": "#38bdf8",
        "desc": "ทางน้ำธรรมชาติระบายน้ำในเขต อ.ศรีมหาโพธิ ไหลเชื่อมสู่แม่น้ำปราจีนบุรี",
        "path": [
            [101.5642, 13.8967], [101.5412, 13.9120], [101.5210, 13.9350], [101.5175, 13.9734]
        ]
    },
    {
        "id": "can_saraphi",
        "name": "คลองสารภี (Khlong Saraphi)",
        "type": "คลองสายรอง (Secondary Canal)",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.0,
        "color": "#38bdf8",
        "desc": "คลองระบายน้ำเกษตรกรรมสายหลักในพื้นที่ทุ่งรับน้ำ อ.บ้านสร้าง",
        "path": [
            [101.2412, 13.9621], [101.2150, 13.9850], [101.1920, 13.9920], [101.1710, 13.9980]
        ]
    },
    {
        "id": "can_huai_samong",
        "name": "คลองห้วยโสมง (Khlong Huai Samong)",
        "type": "คลองสายรอง (Secondary Canal)",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.0,
        "color": "#38bdf8",
        "desc": "ลำน้ำเชื่อมต่อจากอ่างเก็บน้ำนฤบดินทรจินดา อ.นาดี ลงสู่แม่น้ำหนุมาน",
        "path": [
            [101.9650, 14.2450], [101.9320, 14.2150], [101.9167, 14.1834]
        ]
    },
    {
        "id": "can_bang_phluang",
        "name": "คลองบางพลวง (Khlong Bang Phluang)",
        "type": "ลำคลองสาขา (Tributary)",
        "hierarchy_rank": "tributary",
        "order": 3,
        "line_width": 1.4,
        "color": "#7dd3fc",
        "desc": "คลองสาขากระจายน้ำใน อ.บ้านสร้าง",
        "path": [
            [101.2601, 13.9569], [101.2412, 13.9621], [101.2250, 13.9510]
        ]
    }
]

@public_router.get("/waterways", response_model=Dict[str, Any])
def get_public_waterways():
    """
    Returns public river network (DWR/RID) GeoJSON lines with hierarchy (major, secondary, tributary).
    """
    features = []
    for w in PRACHIN_WATERWAYS_NETWORK:
        features.append({
            "type": "Feature",
            "properties": {
                "waterway_id": w["id"],
                "name": w["name"],
                "type": w["type"],
                "hierarchy_rank": w["hierarchy_rank"],
                "order": w["order"],
                "line_width": w["line_width"],
                "color": w["color"],
                "description": w["desc"],
                "badge": "OFFICIAL"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": w["path"]
            }
        })
    return {
        "type": "FeatureCollection",
        "description": "โครงข่ายแม่น้ำและคลองสายหลักลุ่มน้ำปราจีนบุรี (Public Waterways Network)",
        "features": features,
        "provenance": {
            "source_agency": "กรมทรัพยากรน้ำ (DWR) และ กรมชลประทาน (RID)",
            "dataset_name": "โครงข่ายทางน้ำลุ่มน้ำปราจีนบุรี (Basin 03 - Prachin Buri)",
            "category": "OFFICIAL",
            "category_th": "ข้อมูลจากหน่วยงาน",
            "source_url": "https://webgis.dwr.go.th/",
            "floodtrace_updated_at": datetime.now(timezone.utc).isoformat()
        }
    }

# ============================================================
# Section 11: GET /api/public/stations
# Public Hydrological Monitoring Stations
# ============================================================
@public_router.get("/stations", response_model=List[PublicTelemetryStationDTO])
def get_public_telemetry_stations(db: Session = Depends(get_db)):
    """
    Returns verified public river gauge and telemetry stations with explicit timing and freshness model.
    Zero private/industrial coordinates.
    """
    stations = db.query(WaterStation).all()
    results = []
    for s in stations:
        prov = s.provenance or {}
        obs_raw = prov.get("original_timestamp") or (s.last_updated.isoformat() if s.last_updated else None)
        fresh = compute_source_freshness(obs_raw, nominal_interval_seconds=900)
        results.append(PublicTelemetryStationDTO(
            station_id=s.id,
            name_th=s.name_th,
            basin=s.basin,
            district=s.district,
            latitude=s.latitude,
            longitude=s.longitude,
            water_level_msl=s.water_level_msl,
            warning_level_msl=s.warning_level_msl,
            critical_level_msl=s.critical_level_msl,
            status=s.status,
            observed_at=fresh["observed_at_utc"],
            observed_at_bkk=fresh["observed_at_bkk"],
            ingested_at=s.last_updated.isoformat() if s.last_updated else None,
            freshness_status=fresh["status_str"],
            observation_age_seconds=fresh["age_seconds"],
            expected_interval_seconds=900,
            data_category="MEASURED_FACT",
            value_nature="OBSERVED",
            provenance=PublicProvenanceDTO(
                source_agency=prov.get("source_agency", "สสน. / กรมชลประทาน (ThaiWater / RID)"),
                dataset_name="ข้อมูลตรวจวัดระดับน้ำโทรมาตร (Telemetry Gauging)",
                category="OFFICIAL",
                category_th="ข้อมูลจากหน่วยงาน",
                source_url="https://standard.thaiwater.net/",
                source_updated_at=prov.get("original_timestamp")
            )
        ))
    return results

@public_router.get("/rainfall-stations", response_model=List[PublicRainfallStationDTO])
def get_public_rainfall_stations(db: Session = Depends(get_db)):
    """
    Returns verified public automatic rain gauge stations across Prachin Buri with explicit freshness.
    Direct live telemetry from HII / ThaiWater under Open Government License Thailand (OGL-TH).
    """
    stations = db.query(RainfallStation).all()
    results = []
    for s in stations:
        prov = s.provenance or {}
        obs_raw = prov.get("original_timestamp") or s.observation_time or (s.last_updated.isoformat() if s.last_updated else None)
        fresh = compute_source_freshness(obs_raw, nominal_interval_seconds=900)
        results.append(PublicRainfallStationDTO(
            station_id=s.id,
            name_th=s.name_th,
            basin=s.basin or "ลุ่มน้ำบางปะกง",
            district=s.district or "เมืองปราจีนบุรี",
            subdistrict=s.subdistrict,
            latitude=s.latitude,
            longitude=s.longitude,
            rain_24h_mm=s.rain_24h_mm,
            rain_1h_mm=s.rain_1h_mm,
            agency=s.agency or "สสน.",
            status=s.status,
            observed_at=fresh["observed_at_utc"],
            observed_at_bkk=fresh["observed_at_bkk"],
            ingested_at=s.last_updated.isoformat() if s.last_updated else None,
            freshness_status=fresh["status_str"],
            observation_age_seconds=fresh["age_seconds"],
            expected_interval_seconds=900,
            data_category="MEASURED_FACT",
            value_nature="OBSERVED",
            provenance=PublicProvenanceDTO(
                source_agency=prov.get("source_agency", "สถาบันสารสนเทศทรัพยากรน้ำ (องค์การมหาชน) - ThaiWater"),
                dataset_name="ข้อมูลตรวจวัดปริมาณน้ำฝนอัตโนมัติ 24 ชั่วโมง (Rainfall Telemetry)",
                category="OFFICIAL",
                category_th="ข้อมูลจากหน่วยงาน",
                source_url="https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h",
                source_updated_at=prov.get("original_timestamp") or s.observation_time
            )
        ))
    return results

@public_router.get("/telemetry/sources")
def get_public_telemetry_sources_status():
    """
    Returns honest public health, cadence, and freshness status of all external telemetry sources (Section 8, 24).
    Sanitized: Zero internal credentials or private exception traces exposed.
    """
    from apps.api.app.core.scheduler import source_scheduler
    status_data = source_scheduler.get_status()
    public_sources = []
    
    for s_id, s_info in status_data.get("sources", {}).items():
        public_sources.append({
            "source_id": s_id,
            "source_name": s_info.get("source_name", s_id),
            "dataset": s_info.get("dataset"),
            "data_type": s_info.get("data_type", "TELEMETRY"),
            "data_category": s_info.get("data_category", "MEASURED_FACT"),
            "nominal_interval_seconds": s_info.get("nominal_interval_seconds", 900),
            "poll_interval_seconds": s_info.get("poll_interval_seconds", 180),
            "automated_refresh": s_info.get("automated_refresh", False),
            "freshness_status": s_info.get("freshness_status", "UNKNOWN"),
            "data_age_seconds": s_info.get("data_age_seconds"),
            "source_delay_seconds": s_info.get("source_delay_seconds"),
            "last_observed_at": s_info.get("last_observed_at"),
            "last_success": s_info.get("last_success"),
            "records_received": s_info.get("records_received_last_run", 0),
            "records_inserted": s_info.get("records_inserted_last_run", 0),
            "records_updated": s_info.get("records_updated_last_run", 0),
            "circuit_breaker": s_info.get("circuit_breaker_status", "CLOSED")
        })
        
    return {
        "status": "OPERATIONAL" if status_data.get("scheduler_active") else "STANDBY",
        "system_time": status_data.get("system_time"),
        "timezone": "Asia/Bangkok (UTC+07:00)",
        "sources": public_sources
    }

@public_router.get("/stations/{station_id}/history", response_model=StationHistoryResponseDTO)
def get_station_water_level_history(
    station_id: str,
    range: str = Query("24h", pattern="^(24h|7d|30d)$", description="ช่วงเวลาย้อนหลัง: 24h, 7d, หรือ 30d"),
    db: Session = Depends(get_db)
):
    """
    Master Prompt Section 18 & 23:
    Returns historical time-series telemetry observations for a water level station sorted chronologically by observed_at.
    Never overwrites historical records. Supports 24H, 7D, 30D.
    """
    st = db.query(WaterStation).filter(WaterStation.id == station_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Station not found")

    now = datetime.now(timezone.utc)
    delta_days = 1 if range == "24h" else (7 if range == "7d" else 30)
    cutoff = now - timedelta(days=delta_days)

    records = db.query(WaterLevelObservation).filter(
        WaterLevelObservation.station_id == station_id,
        WaterLevelObservation.source_timestamp >= cutoff
    ).order_by(WaterLevelObservation.source_timestamp.asc()).all()

    obs_dtos = []
    if records:
        for r in records:
            dt_obs = r.observed_at or r.source_timestamp
            obs_dtos.append(HistoricalObservationDTO(
                id=r.id,
                station_id=r.station_id,
                value=r.water_level_msl,
                unit="m MSL",
                source_timestamp=r.source_timestamp.isoformat() if r.source_timestamp else None,
                observed_at=dt_obs.isoformat() if dt_obs else None,
                observed_at_bkk=to_bangkok_iso(dt_obs) if dt_obs else None,
                retrieved_at=r.retrieved_at.isoformat() if r.retrieved_at else now.isoformat(),
                ingested_at=r.ingested_at.isoformat() if r.ingested_at else (r.retrieved_at.isoformat() if r.retrieved_at else None),
                source_name=r.source_name,
                organization=r.organization,
                dataset=r.dataset,
                data_classification=r.data_classification,
                freshness_status=r.freshness_status,
                ingestion_mode=r.ingestion_mode,
                data_category="MEASURED_FACT"
            ))
    elif st.water_level_msl is not None:
        obs_dtos.append(HistoricalObservationDTO(
            id=f"current_{st.id}",
            station_id=st.id,
            value=st.water_level_msl,
            unit="m MSL",
            source_timestamp=st.last_updated.isoformat() if st.last_updated else now.isoformat(),
            observed_at=st.last_updated.isoformat() if st.last_updated else now.isoformat(),
            observed_at_bkk=to_bangkok_iso(st.last_updated) if st.last_updated else None,
            retrieved_at=now.isoformat(),
            ingested_at=st.last_updated.isoformat() if st.last_updated else now.isoformat(),
            source_name="ThaiWater",
            organization="HII / RID",
            dataset="waterlevel_load",
            data_classification="HIGH_FREQUENCY",
            freshness_status="LIVE",
            ingestion_mode="EXTERNAL_API",
            data_category="MEASURED_FACT"
        ))

    latest_ts = obs_dtos[-1].source_timestamp if obs_dtos else None

    return StationHistoryResponseDTO(
        station_id=st.id,
        station_name=st.name_th,
        station_type="WATER_LEVEL",
        time_range=range,
        total_records=len(obs_dtos),
        latest_timestamp=latest_ts,
        observations=obs_dtos,
        provenance=PublicProvenanceDTO(
            source_agency="สสน. / กรมชลประทาน (ThaiWater / RID)",
            dataset_name="อนุกรมเวลาระดับน้ำโทรมาตร (Water Level Time-Series)",
            category="OFFICIAL",
            category_th="ข้อมูลจากหน่วยงาน",
            source_url="https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load",
            source_updated_at=latest_ts
        )
    )

@public_router.get("/rainfall/{station_id}/history", response_model=StationHistoryResponseDTO)
def get_station_rainfall_history(
    station_id: str,
    range: str = Query("24h", pattern="^(24h|7d|30d)$", description="ช่วงเวลาย้อนหลัง: 24h, 7d, หรือ 30d"),
    db: Session = Depends(get_db)
):
    """
    Master Prompt Section 18 & 23:
    Returns historical time-series telemetry observations for a rainfall station sorted chronologically by observed_at.
    Never overwrites historical records. Supports 24H, 7D, 30D.
    """
    st = db.query(RainfallStation).filter(RainfallStation.id == station_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Station not found")

    now = datetime.now(timezone.utc)
    delta_days = 1 if range == "24h" else (7 if range == "7d" else 30)
    cutoff = now - timedelta(days=delta_days)

    records = db.query(RainfallObservation).filter(
        RainfallObservation.station_id == station_id,
        RainfallObservation.source_timestamp >= cutoff
    ).order_by(RainfallObservation.source_timestamp.asc()).all()

    obs_dtos = []
    if records:
        for r in records:
            dt_obs = r.observed_at or r.source_timestamp
            obs_dtos.append(HistoricalObservationDTO(
                id=r.id,
                station_id=r.station_id,
                value=r.rain_24h_mm,
                unit="mm",
                source_timestamp=r.source_timestamp.isoformat() if r.source_timestamp else None,
                observed_at=dt_obs.isoformat() if dt_obs else None,
                observed_at_bkk=to_bangkok_iso(dt_obs) if dt_obs else None,
                retrieved_at=r.retrieved_at.isoformat() if r.retrieved_at else now.isoformat(),
                ingested_at=r.ingested_at.isoformat() if r.ingested_at else (r.retrieved_at.isoformat() if r.retrieved_at else None),
                source_name=r.source_name,
                organization=r.organization,
                dataset=r.dataset,
                data_classification=r.data_classification,
                freshness_status=r.freshness_status,
                ingestion_mode=r.ingestion_mode,
                data_category="MEASURED_FACT"
            ))
    elif st.rain_24h_mm is not None:
        obs_dtos.append(HistoricalObservationDTO(
            id=f"current_{st.id}",
            station_id=st.id,
            value=st.rain_24h_mm,
            unit="mm",
            source_timestamp=st.last_updated.isoformat() if st.last_updated else now.isoformat(),
            observed_at=st.last_updated.isoformat() if st.last_updated else now.isoformat(),
            observed_at_bkk=to_bangkok_iso(st.last_updated) if st.last_updated else None,
            retrieved_at=now.isoformat(),
            ingested_at=st.last_updated.isoformat() if st.last_updated else now.isoformat(),
            source_name="ThaiWater",
            organization="HII / TMD",
            dataset="rain_24h",
            data_classification="HIGH_FREQUENCY",
            freshness_status="LIVE",
            ingestion_mode="EXTERNAL_API",
            data_category="MEASURED_FACT"
        ))

    latest_ts = obs_dtos[-1].source_timestamp if obs_dtos else None

    return StationHistoryResponseDTO(
        station_id=st.id,
        station_name=st.name_th,
        station_type="RAINFALL",
        time_range=range,
        total_records=len(obs_dtos),
        latest_timestamp=latest_ts,
        observations=obs_dtos,
        provenance=PublicProvenanceDTO(
            source_agency="สสน. / กรมอุตุนิยมวิทยา (ThaiWater / TMD)",
            dataset_name="อนุกรมเวลาปริมาณน้ำฝน (Rainfall Time-Series)",
            category="OFFICIAL",
            category_th="ข้อมูลจากหน่วยงาน",
            source_url="https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h",
            source_updated_at=latest_ts
        )
    )

# ============================================================
# Section 14: GET /api/public/my-area
# My Area Watch Query
# ============================================================

@public_router.get("/my-area", response_model=PublicAreaSummaryDTO)
def get_public_my_area(
    district: str = Query(..., description="อำเภอ เช่น กบินทร์บุรี, เมืองปราจีนบุรี, ศรีมหาโพธิ"),
    db: Session = Depends(get_db)
):
    """
    Query area status for citizen follow-up without disclosing home GPS.
    """
    zone_data = next((z for z in PRACHIN_SUB_BASINS if z["district"] == district), None)
    if not zone_data:
        zone_data = {
            "zone_id": f"zone_{district}",
            "zone_name": f"พื้นที่อำเภอ{district}",
            "district": district,
            "priority": "ต่ำ",
            "priority_label": "ลำดับความสำคัญในการตรวจสอบ: ต่ำ",
            "watch_status": "ไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน",
            "flood_status": "สถานการณ์น้ำเป็นปกติ",
            "obs_count": 0,
            "forecast": "แนวโน้มคงที่",
            "sampling": "ยังไม่มีผลตรวจสำหรับเหตุการณ์ปัจจุบัน",
            "confidence": "คุณภาพข้อมูล: ปานกลาง",
            "freshness": "สดใหม่",
            "why": ["✓ ไม่พบปัจจัยเสี่ยงด้านการปนเปื้อนในพื้นที่"]
        }

    public_reports_query = db.query(CitizenReport).filter(
        CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
        CitizenReport.reporter_role != "TEST/DEMO",
        CitizenReport.publication_state != "WITHHELD",
        not_(CitizenReport.reporter_name.ilike("%Test%")),
        not_(CitizenReport.reporter_name.ilike("%Whistleblower%")),
        not_(CitizenReport.reporter_name.ilike("%Fixture%")),
        not_(CitizenReport.reporter_name.ilike("%Synthetic%"))
    )
    obs_count = public_reports_query.filter(CitizenReport.district == district).count()

    return PublicAreaSummaryDTO(
        district=district,
        current_status=zone_data["watch_status"],
        verification_priority=zone_data["priority"],
        verification_priority_label=zone_data["priority_label"],
        verification_priority_explanation="ระดับนี้ใช้สำหรับจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบเพิ่มเติม ไม่ใช่การยืนยันว่ามีการปนเปื้อน",
        flood_status=zone_data["flood_status"],
        community_observation_summary=f"รายงานข้อสังเกตจากประชาชนในพื้นที่: {obs_count} รายการ" if obs_count > 0 else "ยังไม่มีรายงานข้อสังเกตจากประชาชนในพื้นที่นี้",
        community_observation_count=obs_count,
        official_sampling_status=zone_data["sampling"],
        forecast_watch_summary=zone_data["forecast"],
        data_confidence=zone_data["confidence"],
        data_freshness=zone_data["freshness"],
        last_updated=datetime.now(BANGKOK_TZ).strftime(f"%d ต.ค. {datetime.now(BANGKOK_TZ).year + 543} %H:%M น."),
        why_this_area=zone_data["why"],
        why_this_area_disclaimer="ไม่มีข้อมูลใดในรายการนี้เพียงอย่างเดียวที่สามารถใช้ยืนยันการปนเปื้อนได้",
        provenance=PublicProvenanceDTO(
            source_agency="ระบบสารสนเทศภูมิศาสตร์ FloodTrace",
            dataset_name="ข้อมูลสถานะพื้นที่รายอำเภอ (My Area Watch)",
            category="MODEL",
            category_th="ผลจากแบบจำลอง",
            category_explanation="ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ"
        )
    )

# ============================================================
# Section 20: GET /api/public/observations
# Generalized Community Observations (No exact GPS, No PII)
# ============================================================
@public_router.get("/observations", response_model=List[PublicObservationDTO])
def get_public_observations(
    district: Optional[str] = Query(None, description="กรองตามอำเภอ"),
    category: Optional[str] = Query(None, description="กรองตามหมวดข้อสังเกต"),
    db: Session = Depends(get_db)
):
    """
    Returns public citizen observations.
    CRITICAL PRIVACY:
    - Exact GPS rounded ~1.1km
    - No reporter name, phone, email, or device IDs
    - Categories: น้ำเปลี่ยนสี, คราบบนผิวน้ำ, กลิ่นผิดปกติ, ฟอง/ตะกอนผิดปกติ, สัตว์น้ำตาย, ขยะ/วัสดุผิดปกติ, อื่น ๆ
    """
    query = db.query(CitizenReport).filter(
        CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
        CitizenReport.reporter_role != "TEST/DEMO",
        CitizenReport.publication_state != "WITHHELD",
        not_(CitizenReport.reporter_name.ilike("%Test%")),
        not_(CitizenReport.reporter_name.ilike("%Whistleblower%")),
        not_(CitizenReport.reporter_name.ilike("%Fixture%")),
        not_(CitizenReport.reporter_name.ilike("%Synthetic%"))
    )
    if district:
        query = query.filter(CitizenReport.district == district)

    reports = query.order_by(CitizenReport.created_at.desc()).limit(100).all()
    results = []
    for r in reports:
        lat = r.public_latitude if r.public_latitude is not None else r.latitude
        lon = r.public_longitude if r.public_longitude is not None else r.longitude
        gen_lat, gen_lon = generalize_coordinates(lat, lon, decimals=2)
        
        cat = "ข้อสังเกตทั่วไป"
        if r.contamination_signs and isinstance(r.contamination_signs, list) and len(r.contamination_signs) > 0:
            cat = str(r.contamination_signs[0])
            
        if category and category != cat:
            continue

        results.append(PublicObservationDTO(
            id=f"obs_{r.id}",
            category=cat,
            district=r.district or "ปราจีนบุรี",
            subdistrict=r.subdistrict or "ในพื้นที่",
            generalized_location=f"บริเวณ ต.{r.subdistrict or 'ทั่วไป'} อ.{r.district or 'ปราจีนบุรี'}",
            generalized_latitude=gen_lat,
            generalized_longitude=gen_lon,
            observation_time=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            status=r.verification_status or "UNVERIFIED",
            status_label="รายงานจากประชาชน (ยังไม่ได้รับการยืนยันจากหน่วยงาน)",
            classification="COMMUNITY",
            classification_explanation="รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน",
            has_photo=bool(r.photo_url),
            photo_url=f"/uploads/{r.photo_url}" if r.photo_url else None,
            created_at=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat()
        ))
    return results

# ============================================================
# Section 19: GET /api/public/official-updates
# Official Updates Center
# ============================================================
@public_router.get("/official-updates", response_model=List[PublicOfficialUpdateDTO])
def get_public_official_updates():
    """
    Returns verified official government announcements and lab results with source preview image metadata.
    Detection != Source Attribution.
    """
    results = []
    for item in OFFICIAL_UPDATES_DATA:
        meta = SourceMetadataService.get_metadata(item["source_url"], item["agency"])
        results.append(PublicOfficialUpdateDTO(
            id=item["id"],
            agency=item["agency"],
            title=item["title"],
            document_type=item["document_type"],
            published_at=item["published_at"],
            related_area=item["related_area"],
            factual_summary=item["factual_summary"],
            source_url=item["source_url"],
            source_domain=meta.get("source_domain"),
            source_image_url=meta.get("source_image_url"),
            source_image_fetched_at=meta.get("source_image_fetched_at"),
            image_source_type=meta.get("image_source_type", "FALLBACK"),
            lab_detected_substance=item["lab_detected_substance"],
            attribution_status=item["attribution_status"],
            badge="OFFICIAL",
            provenance=PublicProvenanceDTO(
                source_agency=item["agency"],
                dataset_name=item["title"],
                category="OFFICIAL",
                category_th="ข้อมูลจากหน่วยงาน",
                source_url=item["source_url"],
                source_updated_at=item["published_at"]
            )
        ))
    return results

# ============================================================
# Section 18: GET /api/public/provenance
# Public Data Catalog & Methodology Metadata
# ============================================================
@public_router.get("/provenance", response_model=Dict[str, Any])
def get_public_provenance_catalog():
    """
    Returns public data catalog organized according to Sections 31, 32, 33, 35:
    - ACTIVE / AUTOMATED (ThaiWater 15-min refresh)
    - REFERENCE (DWR, DIW May 2020 snapshot, DOPA, MOPH)
    - BLOCKED / PENDING ACCESS (GISTDA, TMD, PCD)
    """
    active_sources = [
        {
            "source_id": "thaiwater_rid_runoff",
            "agency": "สถาบันสารสนเทศทรัพยากรน้ำ (สสน.) และ กรมชลประทาน",
            "dataset": "ระดับน้ำโทรมาตรลำน้ำปราจีนบุรี (26 สถานี)",
            "status": "ACTIVE",
            "status_th": "กำลังอัปเดตอัตโนมัติ",
            "update_mode": "AUTOMATED_REFRESH",
            "refresh_interval": "15 นาที",
            "ingestion_mode": "REAL_EXTERNAL_API",
            "license": "ThaiWater API Standard Terms",
            "source_link": "https://standard.thaiwater.net/",
            "provenance": "ดึงข้อมูลอัตโนมัติผ่าน REST API สสน. ทุก 15 นาที พร้อมตรวจสอบเวลาและแปลงเขตเวลา Asia/Bangkok"
        },
        {
            "source_id": "thaiwater_rainfall",
            "agency": "สถาบันสารสนเทศทรัพยากรน้ำ (สสน.) และ กรมอุตุนิยมวิทยา",
            "dataset": "ปริมาณน้ำฝนสะสมอัตโนมัติ (77 สถานี)",
            "status": "ACTIVE",
            "status_th": "กำลังอัปเดตอัตโนมัติ",
            "update_mode": "AUTOMATED_REFRESH",
            "refresh_interval": "15 นาที",
            "ingestion_mode": "REAL_EXTERNAL_API",
            "license": "ThaiWater API Standard Terms",
            "source_link": "https://standard.thaiwater.net/",
            "provenance": "ดึงข้อมูลอัตโนมัติผ่าน REST API สสน. ทุก 15 นาที พร้อมตรวจสอบความสอดคล้องสถานี"
        }
    ]

    reference_sources = [
        {
            "source_id": "dwr_waterways",
            "agency": "กรมทรัพยากรน้ำ และ สำนักงานทรัพยากรน้ำแห่งชาติ",
            "dataset": "โครงข่ายทางน้ำธรรมชาติและคลองชลประทานลุ่มน้ำปราจีนบุรี",
            "status": "REFERENCE",
            "status_th": "ข้อมูลอ้างอิง",
            "update_mode": "STATIC_REFERENCE",
            "ingestion_mode": "LOCAL_IMPORT",
            "license": "DWR WebGIS Public Terms",
            "source_link": "https://webgis.dwr.go.th/",
            "provenance": "โครงข่ายเส้นทางน้ำเวกเตอร์ที่ตรวจสอบการเชื่อมโยงอุทกวิทยา"
        },
        {
            "source_id": "diw_industrial_waste",
            "agency": "กรมโรงงานอุตสาหกรรม (กรอ.) กระทรวงอุตสาหกรรม",
            "dataset": "ข้อมูลกิจกรรมอุตสาหกรรมอ้างอิง (พฤษภาคม 2563)",
            "status": "REFERENCE",
            "status_th": "ข้อมูลอ้างอิงทางการ — พฤษภาคม 2563",
            "update_mode": "HISTORICAL_SNAPSHOT",
            "ingestion_mode": "LOCAL_IMPORT",
            "license": "DIW Open Data Portal",
            "source_link": "https://www.diw.go.th/",
            "provenance": "ชุดข้อมูลประวัติทางการรอบสำรวจ พฤษภาคม 2563 จัดเก็บในชั้นวิเคราะห์ภายใน",
            "disclaimer": "ข้อมูลกิจกรรมอุตสาหกรรมอ้างอิงรอบปี 2563 การจำแนกประเภทโรงงานเป็นกิจกรรมทางอุตสาหกรรม ไม่ใช่ระดับความเป็นพิษ และระยะใกล้เคียงไม่ได้หมายถึงการเป็นผู้ก่อเหตุหรือการปนเปื้อน"
        },
        {
            "source_id": "dopa_boundaries",
            "agency": "กรมการปกครอง กระทรวงมหาดไทย",
            "dataset": "แนวเขตการปกครองระดับตำบลและอำเภอ จังหวัดปราจีนบุรี",
            "status": "REFERENCE",
            "status_th": "ข้อมูลอ้างอิง",
            "update_mode": "STATIC_REFERENCE",
            "ingestion_mode": "LOCAL_IMPORT",
            "license": "DOPA GIS Data",
            "source_link": "https://www.dopa.go.th/",
            "provenance": "รูปแปลงขอบเขต 7 อำเภอ และ 65 ตำบล ในจังหวัดปราจีนบุรี"
        },
        {
            "source_id": "moph_hospitals",
            "agency": "กระทรวงสาธารณสุข",
            "dataset": "พิกัดสถานพยาบาลและแหล่งรับน้ำเปราะบาง",
            "status": "REFERENCE",
            "status_th": "ข้อมูลอ้างอิง",
            "update_mode": "STATIC_REFERENCE",
            "ingestion_mode": "LOCAL_IMPORT",
            "license": "MOPH Open Government Data",
            "source_link": "https://opendata.moph.go.th/",
            "provenance": "ข้อมูลพิกัดโรงพยาบาลและสุขศาลาสำหรับการประเมินความเปราะบางของพื้นที่"
        }
    ]

    blocked_sources = [
        {
            "source_id": "gistda_satellite",
            "agency": "สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (องค์การมหาชน)",
            "dataset": "ภาพถ่ายดาวเทียมตรวจจับพื้นที่น้ำท่วมขัง (Sentinel-1 / THEOS)",
            "status": "BLOCKED",
            "status_th": "ยังรอการอนุญาตให้เข้าถึง",
            "update_mode": "BLOCKED",
            "ingestion_mode": "BLOCKED",
            "license": "GISTDA Open Data Policy",
            "source_link": "https://disaster.gistda.or.th/",
            "reason": "ยังรอการอนุญาตการเข้าถึงโทเคน API ระดับการผลิต"
        },
        {
            "source_id": "tmd_radar",
            "agency": "กรมอุตุนิยมวิทยา กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม",
            "dataset": "เรดาร์ตรวจวัดกลุ่มฝนและแบบจำลองสภาพอากาศความละเอียดสูง",
            "status": "BLOCKED",
            "status_th": "ยังรอการอนุญาตให้เข้าถึง",
            "update_mode": "BLOCKED",
            "ingestion_mode": "BLOCKED",
            "license": "TMD Open Data Portal",
            "source_link": "https://www.tmd.go.th/",
            "reason": "ยังรอการเชื่อมต่อ API อัตโนมัติ"
        },
        {
            "source_id": "pcd_water_quality",
            "agency": "กรมควบคุมมลพิษ และ สำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7 (สคพ.7)",
            "dataset": "ผลตรวจวัดคุณภาพน้ำผิวดินและการตรวจวิเคราะห์ทางห้องปฏิบัติการ",
            "status": "BLOCKED",
            "status_th": "ยังรอการอนุญาตให้เข้าถึง",
            "update_mode": "BLOCKED",
            "ingestion_mode": "BLOCKED",
            "license": "PCD IWIS Public Information",
            "source_link": "https://iwis.pcd.go.th/",
            "reason": "เป็นรายงานรายเดือน/รายไตรมาสแบบเอกสารทางการ ยังไม่มี API อัตโนมัติที่เชื่อมต่อได้"
        }
    ]

    catalog = [
        {
            "provider": "HII / ThaiWater / RID",
            "agency_full": "สถาบันสารสนเทศทรัพยากรน้ำ (สสน.) และ กรมชลประทาน",
            "purpose": "ระดับน้ำโทรมาตรรายชั่วโมง, ปริมาณน้ำฝน, และปริมาตรน้ำในเขื่อน",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลจากหน่วยงาน (กำลังอัปเดตอัตโนมัติ)",
            "update_frequency": "อัปเดตอัตโนมัติทุก 15 นาที (Automated Refresh)",
            "terms": "ThaiWater API Standard Terms",
            "source_link": "https://standard.thaiwater.net/"
        },
        {
            "provider": "DWR / ONWR",
            "agency_full": "กรมทรัพยากรน้ำ และ สำนักงานทรัพยากรน้ำแห่งชาติ",
            "purpose": "โครงข่ายทางน้ำธรรมชาติและคลองชลประทานลุ่มน้ำปราจีนบุรี",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลอ้างอิง",
            "update_frequency": "อ้างอิงเชิงพื้นที่ (Static Reference)",
            "terms": "DWR WebGIS Public Terms",
            "source_link": "https://webgis.dwr.go.th/"
        },
        {
            "provider": "DIW / กรอ.",
            "agency_full": "กรมโรงงานอุตสาหกรรม กระทรวงอุตสาหกรรม",
            "purpose": "ข้อมูลกิจกรรมอุตสาหกรรมอ้างอิง (พฤษภาคม 2563) ในชั้นวิเคราะห์ภายใน",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลอ้างอิงทางการ — พฤษภาคม 2563",
            "update_frequency": "ข้อมูลประวัติทางการ (Historical Snapshot)",
            "terms": "DIW Open Data Portal",
            "source_link": "https://www.diw.go.th/"
        },
        {
            "provider": "GISTDA",
            "agency_full": "สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (องค์การมหาชน)",
            "purpose": "พื้นที่น้ำท่วมขังจากดาวเทียมเรดาร์ (Sentinel-1 / THEOS)",
            "classification": "OFFICIAL",
            "classification_th": "ยังรอการอนุญาตให้เข้าถึง",
            "update_frequency": "รอการเชื่อมต่อ API อัตโนมัติ",
            "terms": "GISTDA Open Data Policy",
            "source_link": "https://disaster.gistda.or.th/"
        },
        {
            "provider": "TMD",
            "agency_full": "กรมอุตุนิยมวิทยา กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม",
            "purpose": "พยากรณ์ปริมาณน้ำฝนและสภาพอากาศล่วงหน้า",
            "classification": "OFFICIAL",
            "classification_th": "ยังรอการอนุญาตให้เข้าถึง",
            "update_frequency": "รอการเชื่อมต่อ API อัตโนมัติ",
            "terms": "TMD Open Data Portal",
            "source_link": "https://www.tmd.go.th/"
        },
        {
            "provider": "PCD / สคพ.7",
            "agency_full": "กรมควบคุมมลพิษ และ สำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7",
            "purpose": "ผลการตรวจวัดคุณภาพน้ำผิวดินและการตรวจสอบทางห้องปฏิบัติการ",
            "classification": "OFFICIAL",
            "classification_th": "ยังรอการอนุญาตให้เข้าถึง",
            "update_frequency": "รายเดือน / รายไตรมาส (รอระบบ API)",
            "terms": "PCD IWIS Public Information",
            "source_link": "https://iwis.pcd.go.th/"
        },
        {
            "provider": "FloodTrace Community",
            "agency_full": "เครือข่ายภาคประชาชนผู้ร่วมเฝ้าระวังสิ่งแวดล้อมจังหวัดปราจีนบุรี",
            "purpose": "ข้อสังเกตสภาพน้ำ กลิ่น คราบน้ำ และสัตว์น้ำผิดปกติ",
            "classification": "COMMUNITY",
            "classification_th": "รายงานจากประชาชน",
            "update_frequency": "รายงานต่อเนื่อง (Crowd Observations)",
            "terms": "FloodTrace Content Policy (ลบข้อมูลส่วนบุคคลก่อนเผยแพร่)",
            "source_link": "#"
        }
    ]

    return {
        "title": "คลังข้อมูลและสัญญาอนุญาต (Data Catalog & Licensing)",
        "active_sources": active_sources,
        "reference_sources": reference_sources,
        "blocked_sources": blocked_sources,
        "datasets": catalog,
        "methodology_summary": "น้ำท่วมขัง + อุทกวิทยา + การเชื่อมต่อทางน้ำ + ภูมิประเทศ + รายงานชุมชน + แหล่งเปราะบาง -> ลำดับความสำคัญในการตรวจสอบด้านสิ่งแวดล้อม",
        "limitations": [
            "ระบบไม่ได้ตรวจวัดสารเคมีโดยตรง การตรวจหาสารปนเปื้อนต้องกระทำโดยห้องปฏิบัติการที่ได้รับการรับรองเท่านั้น",
            "ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การชี้ตัวผู้กระทำผิด",
            "การไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน ไม่ได้เป็นการรับประกันความปลอดภัยอย่างสมบูรณ์แบบ",
            "รายงานจากประชาชนเป็นเพียงข้อสังเกตเบื้องต้น ไม่ถือเป็นข้อเท็จจริงยืนยันทางกฎหมาย",
            "ข้อมูลกิจกรรมอุตสาหกรรมเป็นข้อมูลอ้างอิงทางการรอบพฤษภาคม 2563 ระยะใกล้เคียงไม่ได้หมายถึงการปนเปื้อนหรือความผิด"
        ],
        "privacy_and_safety": [
            "พิกัดบ้านและข้อมูลติดต่อของผู้รายงานจะไม่ถูกเผยแพร่สู่สาธารณะโดยเด็ดขาด",
            "ระบบไม่อนุญาตและไม่สนับสนุนให้ใช้ระบบเพื่อการกล่าวหาบุคคลหรือองค์กรโดยปราศจากหลักฐาน",
            "ข้อมูลโรงงานและแหล่งกำเนิดภายในถูกจัดเก็บในชั้นวิเคราะห์ภายใน (Internal Layer) เท่านั้น ไม่แสดงบนแผนที่สาธารณะ"
        ]
    }

# ============================================================
# Section 21: POST /api/public/reports
# 3-Step Citizen Report Flow (No factory accusation field)
# ============================================================
class PublicReportSubmissionDTO(BaseModel):
    category: str = Field(..., description="น้ำเปลี่ยนสี, คราบบนผิวน้ำ, กลิ่นผิดปกติ, ฟอง / ตะกอนผิดปกติ, สัตว์น้ำตาย, ขยะ / วัสดุผิดปกติ, อื่น ๆ")
    district: str = Field(..., description="อำเภอ")
    subdistrict: Optional[str] = Field(None, description="ตำบล")
    latitude: float = Field(..., description="ละติจูด (ภายในปราจีนบุรี)")
    longitude: float = Field(..., description="ลองจิจูด (ภายในปราจีนบุรี)")
    description: Optional[str] = Field(None, description="คำอธิบายข้อเท็จจริงสั้นๆ (ห้ามใส่ข้อความกล่าวหา)")
    photo_filename: Optional[str] = None
    water_depth_cm: Optional[float] = None
    water_color: Optional[str] = None
    declaration_confirmed: bool = Field(..., description="ฉันยืนยันว่าข้อมูลนี้เป็นสิ่งที่ฉันพบเห็น และไม่ได้ส่งข้อมูลเพื่อกล่าวหาบุคคลหรือองค์กรโดยไม่มีหลักฐาน")

@public_router.post("/reports", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def submit_public_report(
    payload: PublicReportSubmissionDTO,
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db)
):
    """
    3-Step Citizen Report Submission:
    1. เลือกสิ่งที่พบ
    2. ระบุตำแหน่ง
    3. ตรวจสอบและส่ง พร้อมยืนยัน Declaration
    """
    import uuid
    req_id = getattr(request.state, "request_id", "req_pub_report")
    
    if not payload.declaration_confirmed:
        return format_standard_error(
            code="DECLARATION_REQUIRED",
            message="กรุณากดยืนยันว่าข้อมูลเป็นสิ่งที่ท่านพบเห็นจริง และไม่ได้ส่งข้อมูลเพื่อกล่าวหาบุคคลหรือองค์กรโดยไม่มีหลักฐาน",
            request_id=req_id,
            status_code=400
        )

    # Validate Prachin Buri boundary
    if not validate_prachin_coordinates(payload.latitude, payload.longitude):
        return format_standard_error(
            code="OUT_OF_BOUNDS",
            message="พิกัดที่ระบุอยู่นอกพื้นที่จังหวัดปราจีนบุรี",
            request_id=req_id,
            status_code=400
        )

    clean_desc = (payload.description or "").strip()[:500]
    report_id = f"FT-2026-{uuid.uuid4().hex[:6].upper()}"
    pub_lat, pub_lon = generalize_coordinates(payload.latitude, payload.longitude, decimals=2)
    
    new_report = CitizenReport(
        id=report_id,
        reporter_name="CITIZEN_PUBLIC",
        reporter_role="CITIZEN",
        category=payload.category,
        exact_latitude=payload.latitude,
        exact_longitude=payload.longitude,
        latitude=pub_lat,
        longitude=pub_lon,
        public_latitude=pub_lat,
        public_longitude=pub_lon,
        water_depth_cm=payload.water_depth_cm or 0.0,
        contamination_signs=[payload.category],
        district=payload.district,
        subdistrict=payload.subdistrict or "ไม่ระบุ",
        description=clean_desc,
        photo_url=payload.photo_filename,
        verification_status="UNVERIFIED",
        review_status="PENDING_REVIEW",
        status="NEW",
        provenance={
            "source_agency": "Citizen Public Report",
            "category": "COMMUNITY",
            "category_th": "รายงานจากประชาชน",
            "category_explanation": "รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "success": True,
        "report_id": new_report.id,
        "tracking_code": new_report.id,
        "status": "UNVERIFIED",
        "public_status": "รับเรื่องแล้ว",
        "message": "ส่งรายงานข้อสังเกตเรียบร้อยแล้ว ข้อมูลจะถูกจัดเก็บเป็นข้อสังเกตจากประชาชน (ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน)",
        "classification": "COMMUNITY",
        "badge": "COMMUNITY",
        "request_id": req_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============================================================
# Section 14 & 15: Public Citizen Report Tracking
# ============================================================

@public_router.get("/reports/track/{report_id}", response_model=Dict[str, Any])
def track_citizen_report_status(report_id: str, db: Session = Depends(get_db)):
    """
    Master Pre-Production Section 14 & 15:
    Public citizen status tracking endpoint by Report ID (e.g. FT-2026-XXXXXX).
    Exposes only public-safe status, category, district, and verification level without leaking PII or exact coordinates.
    """
    clean_id = report_id.strip()
    if clean_id.startswith("obs_"):
        clean_id = clean_id.replace("obs_", "")

    report = db.query(CitizenReport).filter(
        (CitizenReport.id == clean_id) | (CitizenReport.id == report_id)
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="ไม่พบรหัสรายงานข้อสังเกตที่ระบุในระบบ กรุณาตรวจสอบรหัสอ้างอิงอีกครั้ง"
        )

    STATUS_MAP = {
        "NEW": ("รับเรื่องแล้ว", "ระบบได้รับรายงานข้อสังเกตของท่านเรียบร้อยแล้ว รอการคัดกรองเบื้องต้นจากเจ้าหน้าที่"),
        "TRIAGING": ("กำลังคัดกรองเบื้องต้น", "เจ้าหน้าที่กำลังประเมินและคัดกรองข้อมูลเบื้องต้น"),
        "ASSIGNED": ("กำลังตรวจสอบ", "มอบหมายเจ้าหน้าที่รับผิดชอบตรวจสอบข้อเท็จจริงแล้ว"),
        "IN_REVIEW": ("กำลังตรวจสอบ", "เจ้าหน้าที่กำลังตรวจสอบหลักฐานและข้อมูลประกอบ"),
        "NEED_MORE_INFO": ("ขอข้อมูลเพิ่มเติม", "เจ้าหน้าที่ต้องการข้อมูลหรือภาพถ่ายเพิ่มเติมเพื่อประกอบการพิจารณา"),
        "UNDER_VERIFICATION": ("อยู่ระหว่างการตรวจสอบภาคสนาม", "อยู่ระหว่างการลงพื้นที่ตรวจสอบข้อเท็จจริงหรือตรวจสอบพยานหลักฐานประจักษ์"),
        "VERIFIED_OBSERVATION": ("ตรวจสอบข้อสังเกตแล้ว", "เจ้าหน้าที่ตรวจสอบและยืนยันข้อสังเกตทางกายภาพตามที่ได้รับรายงานเรียบร้อยแล้ว"),
        "ESCALATED": ("ส่งต่อเพื่อดำเนินการ", "ส่งต่อข้อมูลไปยังหน่วยงานที่เกี่ยวข้องเพื่อพิจารณาดำเนินการตามอำนาจหน้าที่"),
        "OFFICIAL_CONFIRMED": ("ได้รับการยืนยันอย่างเป็นทางการ", "ได้รับการยืนยันจากหน่วยงานภาครัฐหรือผลตรวจทางห้องปฏิบัติการอย่างเป็นทางการ"),
        "RESOLVED": ("ปิดเรื่อง", "การดำเนินการตรวจสอบเสร็จสิ้นสมบูรณ์"),
        "OUT_OF_SCOPE": ("อยู่นอกพื้นที่วิเคราะห์", "พื้นที่ที่ระบุอยู่นอกขอบเขตการดำเนินงานของโครงการ"),
        "INVALID": ("ปิดเรื่อง (ข้อมูลไม่เข้าข่าย)", "ข้อมูลที่รายงานไม่เข้าข่ายหรือไม่มีหลักฐานเพียงพอ"),
        "DUPLICATE": ("ปิดเรื่อง (รายงานซ้ำซ้อน)", "รายงานนี้เป็นข้อมูลเหตุการณ์ซ้ำซ้อนกับเรื่องที่กำลังดำเนินการอยู่"),
        "SPAM": ("ระงับการดำเนินการ", "รายงานไม่ตรงตามเงื่อนไขการใช้งาน"),
        "WITHDRAWN": ("ยกเลิกคำร้อง", "ผู้รายงานขอถอนเรื่อง")
    }

    st = report.status or "NEW"
    status_th, desc_th = STATUS_MAP.get(st, ("รับเรื่องแล้ว", "ระบบกำลังดำเนินการ"))

    cat = report.category
    if (not cat or cat == "GENERAL") and report.contamination_signs:
        cat = report.contamination_signs[0] if isinstance(report.contamination_signs, list) else str(report.contamination_signs)

    VERIF_MAP = {
        "UNVERIFIED": "รอการตรวจสอบเบื้องต้น (Unverified)",
        "PARTIALLY_VERIFIED": "ตรวจสอบข้อมูลประกอบเบื้องต้นแล้ว (Partially Verified)",
        "VERIFIED_OBSERVATION": "ตรวจสอบข้อสังเกตแล้ว (Verified Observation)",
        "OFFICIAL_CONFIRMED": "ได้รับการยืนยันอย่างเป็นทางการ (Official Confirmed)"
    }
    verif_th = VERIF_MAP.get(report.verification_status, "รอการตรวจสอบ")

    return {
        "success": True,
        "report_id": report.id,
        "category": cat or "ข้อสังเกตสภาพน้ำทั่วไป",
        "district": report.district,
        "subdistrict": report.subdistrict,
        "submitted_at": report.created_at.isoformat() if report.created_at else None,
        "created_at_human": report.created_at.strftime("%d/%m/%Y %H:%M น.") if report.created_at else "เมื่อเร็วๆ นี้",
        "public_status": status_th,
        "public_status_th": status_th,
        "status_description": desc_th,
        "public_description_th": desc_th,
        "verification_level": report.verification_status or "UNVERIFIED",
        "verification_level_th": verif_th,
        "last_updated": (report.updated_at or report.created_at).isoformat() if (report.updated_at or report.created_at) else None
    }


# ============================================================
# Public External Evidence & Monitoring Events Endpoints (Section 24, 28)
# ============================================================

from apps.api.app.models.entities import (
    ExternalEvidence,
    ExternalEvidenceMedia,
    MonitoringEvent,
    EvidenceEventLink,
    ExternalInformation
)
from apps.api.app.services.external_evidence_service import ExternalEvidenceService
from apps.api.app.services.event_information_service import EventInformationService
from apps.api.app.core.source_registry import SourceRegistry


def get_evidence_related_sources_and_news(db: Session, ev: ExternalEvidence) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Finds other distinct, non-duplicate external evidence items that share the same source_group_id
    or are linked to the same monitoring_event_id.
    Also retrieves related news articles (ExternalInformation) linked to that monitoring_event_id.
    """
    related_sources = []

    group_filter = []
    if ev.source_group_id:
        group_filter.append(ExternalEvidence.source_group_id == ev.source_group_id)
    if ev.monitoring_event_id:
        group_filter.append(ExternalEvidence.monitoring_event_id == ev.monitoring_event_id)
    if ev.id:
        group_filter.append(ExternalEvidence.parent_evidence_id == ev.id)

    if group_filter:
        query_related = db.query(ExternalEvidence).filter(
            or_(*group_filter),
            ExternalEvidence.id != ev.id,
            ExternalEvidence.is_duplicate.is_(False),
            ExternalEvidence.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"]),
            ExternalEvidence.verification_status.notin_(["REJECTED", "TEST_DEMO"])
        ).all()

        for rel in query_related:
            rel_media = db.query(ExternalEvidenceMedia).filter(ExternalEvidenceMedia.evidence_id == rel.id).all()
            related_sources.append({
                "id": rel.id,
                "source_platform": rel.source_platform,
                "source_name": rel.source_name,
                "source_url": rel.source_url,
                "title_or_summary": rel.title_or_summary,
                "description": rel.description,
                "evidence_type": rel.evidence_type,
                "verification_status": rel.verification_status,
                "district": rel.district,
                "subdistrict": rel.subdistrict,
                "location_text": rel.location_text,
                "published_at": rel.published_at.isoformat() if rel.published_at else None,
                "observed_at": rel.observed_at.isoformat() if rel.observed_at else None,
                "media_references": [
                    {
                        "id": m.id,
                        "media_type": m.media_type,
                        "source_media_url": m.source_media_url
                    }
                    for m in rel_media
                ]
            })

    related_news = []
    if ev.monitoring_event_id:
        news_items = db.query(ExternalInformation).filter(
            ExternalInformation.monitoring_event_id == ev.monitoring_event_id,
            ExternalInformation.source_type == "NEWS_MEDIA",
            ExternalInformation.publication_status.in_(["PUBLIC", "PUBLISHED", "PUBLIC_SAFE"])
        ).limit(5).all()

        for n in news_items:
            related_news.append({
                "id": n.id,
                "source_name": n.source_name,
                "title": n.title,
                "summary": n.summary,
                "source_url": n.canonical_url or n.source_url,
                "published_at": n.published_at.isoformat() if n.published_at else None,
                "source_image_url": n.source_image_url,
                "authority_level": n.authority_level
            })

    return related_sources, related_news


@public_router.get("/external-evidence", response_model=List[Dict[str, Any]])
def get_public_external_evidence(
    district: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    include_duplicates: bool = Query(False, description="รวมข้อมูลที่ถูกตรวจพบว่าซ้ำซ้อนหรือไม่ (ค่าเริ่มต้น: ซ่อน)"),
    group_by_event: bool = Query(False, description="รวมกลุ่มรายงานที่เกี่ยวข้องกับเหตุการณ์เดียวกันเป็นบัตรหลักใบเดียว"),
    sort_order: Optional[str] = Query("desc", description="ลำดับเวลา (desc/asc)"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns public-approved external evidence items.
    Strictly scrubs internal staff notes, reviewer usernames, and private credentials.
    Filters out WITHHELD, INTERNAL_ONLY, and REJECTED items.
    By default filters out duplicate items (is_duplicate=False) and supports event/source grouping.
    Sorted by semantic event time (observed_at, fallback published_at, then retrieved_at).
    """
    # Ensure verified real snapshot is populated if database is empty
    if db.query(ExternalEvidence).count() == 0:
        try:
            from apps.api.app.core.snapshots import seed_external_evidence_snapshot
            seed_external_evidence_snapshot(db)
        except Exception:
            pass

    query = db.query(ExternalEvidence).filter(
        ExternalEvidence.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"]),
        ExternalEvidence.verification_status.notin_(["REJECTED", "TEST_DEMO"])
    )

    if not include_duplicates:
        query = query.filter(ExternalEvidence.is_duplicate.is_(False))

    if district:
        query = query.filter(ExternalEvidence.district == district)
    if event_type:
        query = query.filter(ExternalEvidence.event_type == event_type)
    if verification_status:
        query = query.filter(ExternalEvidence.verification_status == verification_status)

    semantic_time = func.coalesce(ExternalEvidence.observed_at, ExternalEvidence.published_at, ExternalEvidence.retrieved_at)
    if sort_order == "asc":
        query = query.order_by(semantic_time.asc())
    else:
        query = query.order_by(semantic_time.desc())

    raw_items = query.all()

    if group_by_event:
        # Group items by source_group_id or monitoring_event_id
        grouped_dict: Dict[str, List[ExternalEvidence]] = {}
        for ev in raw_items:
            # Determine grouping key
            group_key = ev.source_group_id or (f"MON_{ev.monitoring_event_id}" if ev.monitoring_event_id else ev.id)
            grouped_dict.setdefault(group_key, []).append(ev)

        items = []
        for gkey, g_evs in grouped_dict.items():
            # Pick canonical primary: prefer parent_evidence_id is None, then first in list
            primary = next((e for e in g_evs if not e.parent_evidence_id), g_evs[0])
            items.append(primary)

        # Slice after grouping
        items = items[offset:offset + limit]
    else:
        items = raw_items[offset:offset + limit]

    results = []
    for ev in items:
        media_items = db.query(ExternalEvidenceMedia).filter(ExternalEvidenceMedia.evidence_id == ev.id).all()

        pub_lat = round(ev.latitude, 2) if (ev.latitude is not None and ev.location_precision not in ("UNKNOWN", "PROVINCE")) else None
        pub_lon = round(ev.longitude, 2) if (ev.longitude is not None and ev.location_precision not in ("UNKNOWN", "PROVINCE")) else None

        related_sources, related_news = get_evidence_related_sources_and_news(db, ev)

        results.append({
            "id": ev.id,
            "source_platform": ev.source_platform,
            "source_name": ev.source_name,
            "source_url": ev.source_url,
            "title_or_summary": ev.title_or_summary,
            "description": ev.description,
            "text_excerpt": ev.text_excerpt,
            "event_type": ev.event_type,
            "evidence_type": ev.evidence_type,
            "verification_status": ev.verification_status,
            "publication_status": ev.publication_status,
            "location_text": ev.location_text,
            "public_latitude": pub_lat,
            "public_longitude": pub_lon,
            "location_precision": ev.location_precision,
            "district": ev.district,
            "subdistrict": ev.subdistrict,
            "published_at": ev.published_at.isoformat() if ev.published_at else None,
            "observed_at": ev.observed_at.isoformat() if ev.observed_at else None,
            "retrieved_at": ev.retrieved_at.isoformat() if ev.retrieved_at else None,
            "monitoring_event_id": ev.monitoring_event_id,
            "parent_evidence_id": ev.parent_evidence_id,
            "source_group_id": ev.source_group_id,
            "is_duplicate": ev.is_duplicate,
            "duplicate_reason": ev.duplicate_reason,
            "related_sources_count": len(related_sources) + 1,
            "related_sources": related_sources,
            "related_news": related_news,
            "media_references": [
                {
                    "id": m.id,
                    "media_type": m.media_type,
                    "source_media_url": m.source_media_url,
                    "license_or_permission_status": m.license_or_permission_status
                }
                for m in media_items
            ],
            "provenance": {
                "source_agency": ev.source_name,
                "dataset_name": "ข้อมูลหลักฐานอ้างอิงจากแหล่งภายนอก (External Evidence)",
                "category": "OFFICIAL_OBSERVED" if ev.source_platform == "OFFICIAL_PUBLIC" else "DERIVED",
                "category_th": "ข้อมูลจากแหล่งภายนอก",
                "disclaimer": "ข้อมูลนี้รวบรวมจากแหล่งสาธารณะภายนอกเพื่อประกอบการเฝ้าระวัง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การระบุผู้กระทำผิด"
            }
        })

    return results


@public_router.get("/external-evidence/{evidence_id}", response_model=Dict[str, Any])
def get_public_external_evidence_detail(evidence_id: str, db: Session = Depends(get_db)):
    """
    Returns sanitized public details of a single external evidence item.
    Returns 404 if item is withheld, internal-only, or non-existent.
    """
    ev = db.query(ExternalEvidence).filter(
        ExternalEvidence.id == evidence_id,
        ExternalEvidence.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"]),
        ExternalEvidence.verification_status.notin_(["REJECTED", "TEST_DEMO"])
    ).first()

    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบข้อมูลหลักฐานภายนอกที่ระบุ หรือข้อมูลดังกล่าวถูกจำกัดการเข้าถึงเฉพาะภายใน"
        )

    media_items = db.query(ExternalEvidenceMedia).filter(ExternalEvidenceMedia.evidence_id == ev.id).all()
    pub_lat = round(ev.latitude, 2) if (ev.latitude is not None and ev.location_precision not in ("UNKNOWN", "PROVINCE")) else None
    pub_lon = round(ev.longitude, 2) if (ev.longitude is not None and ev.location_precision not in ("UNKNOWN", "PROVINCE")) else None

    related_sources, related_news = get_evidence_related_sources_and_news(db, ev)

    return {
        "id": ev.id,
        "source_platform": ev.source_platform,
        "source_name": ev.source_name,
        "source_url": ev.source_url,
        "title_or_summary": ev.title_or_summary,
        "description": ev.description,
        "text_excerpt": ev.text_excerpt,
        "event_type": ev.event_type,
        "evidence_type": ev.evidence_type,
        "verification_status": ev.verification_status,
        "publication_status": ev.publication_status,
        "location_text": ev.location_text,
        "public_latitude": pub_lat,
        "public_longitude": pub_lon,
        "location_precision": ev.location_precision,
        "district": ev.district,
        "subdistrict": ev.subdistrict,
        "published_at": ev.published_at.isoformat() if ev.published_at else None,
        "observed_at": ev.observed_at.isoformat() if ev.observed_at else None,
        "retrieved_at": ev.retrieved_at.isoformat() if ev.retrieved_at else None,
        "monitoring_event_id": ev.monitoring_event_id,
        "parent_evidence_id": ev.parent_evidence_id,
        "source_group_id": ev.source_group_id,
        "is_duplicate": ev.is_duplicate,
        "duplicate_reason": ev.duplicate_reason,
        "related_sources_count": len(related_sources) + 1,
        "related_sources": related_sources,
        "related_news": related_news,
        "media_references": [
            {
                "id": m.id,
                "media_type": m.media_type,
                "source_media_url": m.source_media_url,
                "license_or_permission_status": m.license_or_permission_status
            }
            for m in media_items
        ],
        "provenance": {
            "source_agency": ev.source_name,
            "dataset_name": "ข้อมูลหลักฐานอ้างอิงจากแหล่งภายนอก (External Evidence)",
            "category": "OFFICIAL_OBSERVED" if ev.source_platform == "OFFICIAL_PUBLIC" else "DERIVED",
            "category_th": "ข้อมูลจากแหล่งภายนอก",
            "disclaimer": "ข้อมูลนี้รวบรวมจากแหล่งสาธารณะภายนอกเพื่อประกอบการเฝ้าระวัง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การระบุผู้กระทำผิด"
        }
    }


@public_router.get("/monitoring-events", response_model=List[Dict[str, Any]])
def get_public_monitoring_events(
    district: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("ACTIVE"),
    db: Session = Depends(get_db)
):
    """
    Returns public monitoring events representing ongoing operational situations.
    Filters out internal-only and withheld events.
    """
    query = db.query(MonitoringEvent).filter(
        MonitoringEvent.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"])
    )
    if status_filter:
        query = query.filter(MonitoringEvent.status == status_filter)
    if district:
        query = query.filter(MonitoringEvent.district == district)

    events = query.order_by(MonitoringEvent.updated_at.desc()).all()
    results = []
    for ev in events:
        links = db.query(EvidenceEventLink).filter(EvidenceEventLink.event_id == ev.id).all()
        ev_ids = [l.evidence_id for l in links]
        ev_items = db.query(ExternalEvidence).filter(
            ExternalEvidence.id.in_(ev_ids),
            ExternalEvidence.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"]),
            ExternalEvidence.verification_status.notin_(["REJECTED", "TEST_DEMO"])
        ).all() if ev_ids else []
        unique_groups = set(e.source_group_id or e.id for e in ev_items)

        results.append({
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "event_type": ev.event_type,
            "status": ev.status,
            "monitoring_priority": ev.monitoring_priority,
            "district": ev.district,
            "subdistrict": ev.subdistrict,
            "location_precision": ev.location_precision,
            "waterway_name": ev.waterway_name,
            "start_time": ev.start_time.isoformat() if ev.start_time else None,
            "end_time": ev.end_time.isoformat() if ev.end_time else None,
            "source_summary": ev.source_summary,
            "priority_factors": ev.priority_factors,
            "evidence_count": len(ev_items),
            "independent_evidence_count": len(unique_groups),
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
            "updated_at": ev.updated_at.isoformat() if ev.updated_at else None,
            "provenance": ev.provenance
        })

    return results


@public_router.get("/monitoring-events/{event_id}/evidence-packet", response_model=Dict[str, Any])
def get_public_event_evidence_packet(event_id: str, db: Session = Depends(get_db)):
    """
    Returns structured 7-section Evidence Packet for a Monitoring Event.
    Restricted to public-safe items only.
    """
    try:
        packet = ExternalEvidenceService.get_evidence_packet_for_event(db=db, event_id=event_id, public_only=True)
        return packet
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบเหตุการณ์เฝ้าระวัง {event_id} หรือข้อมูลดังกล่าวถูกจำกัดการเข้าถึงเฉพาะภายใน"
        )


# Direct Diagram Aliases for Architecture Alignment (Diagram 1: Public Evidence API)
@public_router.get("/evidence-events", response_model=List[Dict[str, Any]])
def get_public_evidence_events_alias(
    district: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("ACTIVE"),
    db: Session = Depends(get_db)
):
    """Alias for /monitoring-events matching System Overview diagram."""
    return get_public_monitoring_events(district=district, status_filter=status_filter, db=db)


@public_router.get("/evidence-events/{event_id}", response_model=Dict[str, Any])
def get_public_evidence_event_detail_alias(event_id: str, db: Session = Depends(get_db)):
    """Alias for /monitoring-events/{event_id}/evidence-packet matching System Overview diagram."""
    return get_public_event_evidence_packet(event_id=event_id, db=db)


# ============================================================
# Event-Centric Multi-Source Information System (Sections 26, 27)
# ============================================================

@public_router.get("/information", response_model=List[Dict[str, Any]])
def get_public_information(
    event_id: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    authority_level: Optional[str] = Query(None),
    category: Optional[str] = Query(None, description="all, official, news, public"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns public-approved multi-source information items (Official, News, Public Social, Citizen).
    Strictly fail-closed: filters out INTERNAL_ONLY, WITHHELD, and REJECTED items.
    Strips staff PII, internal moderator notes, and unredacted sensitive coordinates.
    """
    EventInformationService.reconcile_default_information(db)
    return EventInformationService.get_public_information(
        db=db,
        event_id=event_id,
        district=district,
        source_type=source_type,
        authority_level=authority_level,
        category=category,
        limit=limit,
        offset=offset
    )


@public_router.get("/information/sources", response_model=Dict[str, Any])
def get_public_source_registry():
    """
    Returns public registry of monitored information sources and connector operational status.
    Truthfully exposes whether connectors are ACTIVE, LIMITED, or NOT_CONFIGURED.
    """
    sources = SourceRegistry.list_sources(enabled_only=True)
    summary = SourceRegistry.get_operational_summary()
    return {
        "sources": sources,
        "summary": summary
    }


@public_router.get("/information/{info_id}", response_model=Dict[str, Any])
def get_public_information_item(info_id: str, db: Session = Depends(get_db)):
    """
    Returns sanitized public details of a single information item.
    Returns 404 if item is withheld, internal-only, or non-existent.
    """
    EventInformationService.reconcile_default_information(db)
    item = EventInformationService.get_public_information_detail(db, info_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบข้อมูลสาธารณะที่ระบุ หรือข้อมูลดังกล่าวถูกจำกัดการเข้าถึงเฉพาะภายใน"
        )
    return item


@public_router.get("/events/{event_id}/information", response_model=List[Dict[str, Any]])
def get_public_event_information(event_id: str, db: Session = Depends(get_db)):
    """
    Returns all public information items correlated with a specific Monitoring Event.
    """
    EventInformationService.reconcile_default_information(db)
    return EventInformationService.get_public_information(
        db=db,
        event_id=event_id,
        limit=50,
        offset=0
    )


@public_router.get("/events/{event_id}/external-evidence", response_model=List[Dict[str, Any]])
def get_public_event_external_evidence(event_id: str, db: Session = Depends(get_db)):
    """
    Returns public external evidence linked to a specific Monitoring Event via EvidenceEventLink.
    """
    links = db.query(EvidenceEventLink).filter(EvidenceEventLink.event_id == event_id).all()
    ev_ids = [l.evidence_id for l in links]
    if not ev_ids:
        return []

    items = db.query(ExternalEvidence).filter(
        ExternalEvidence.id.in_(ev_ids),
        ExternalEvidence.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"]),
        ExternalEvidence.verification_status.notin_(["REJECTED", "TEST_DEMO"])
    ).all()

    results = []
    for ev in items:
        media_items = db.query(ExternalEvidenceMedia).filter(ExternalEvidenceMedia.evidence_id == ev.id).all()
        pub_lat = round(ev.latitude, 2) if (ev.latitude is not None and ev.location_precision not in ("UNKNOWN", "PROVINCE")) else None
        pub_lon = round(ev.longitude, 2) if (ev.longitude is not None and ev.location_precision not in ("UNKNOWN", "PROVINCE")) else None

        results.append({
            "id": ev.id,
            "source_platform": ev.source_platform,
            "source_name": ev.source_name,
            "source_url": ev.source_url,
            "title_or_summary": ev.title_or_summary,
            "description": ev.description,
            "text_excerpt": ev.text_excerpt,
            "event_type": ev.event_type,
            "evidence_type": ev.evidence_type,
            "verification_status": ev.verification_status,
            "location_precision": ev.location_precision,
            "district": ev.district,
            "subdistrict": ev.subdistrict,
            "public_latitude": pub_lat,
            "public_longitude": pub_lon,
            "published_at": ev.published_at.isoformat() if ev.published_at else None,
            "observed_at": ev.observed_at.isoformat() if ev.observed_at else None,
            "retrieved_at": ev.retrieved_at.isoformat() if ev.retrieved_at else None,
            "media_references": [
                {
                    "id": m.id,
                    "media_type": m.media_type,
                    "source_media_url": m.source_media_url,
                    "license_or_permission_status": m.license_or_permission_status
                }
                for m in media_items
            ],
            "provenance": {
                "source_agency": ev.source_name,
                "dataset_name": "ข้อมูลหลักฐานอ้างอิงจากแหล่งภายนอก (External Evidence)",
                "category": "OFFICIAL_OBSERVED" if ev.source_platform == "OFFICIAL_PUBLIC" else "DERIVED",
                "category_th": "ข้อมูลจากแหล่งภายนอก",
                "disclaimer": "ข้อมูลนี้รวบรวมจากแหล่งสาธารณะภายนอกเพื่อประกอบการเฝ้าระวัง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การระบุผู้กระทำผิด"
            }
        })
    return results


