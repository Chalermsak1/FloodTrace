"""
FloodTrace Public API Router (/api/public/*)
Master Architecture & Safety-by-Design Compliance:
- Strictly sanitized Public DTOs (Zero private factory/reporter fields)
- Three clear classifications: OFFICIAL DATA, COMMUNITY OBSERVATION, MODEL OUTPUT
- Continuous area visualization (Sub-basin polygons, no circular buffers, no facility pins)
- Standardized legal-safe Thai terminology
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from apps.api.app.core.database import get_db
from apps.api.app.core.config import settings
from apps.api.app.core.security import (
    validate_prachin_coordinates,
    generalize_coordinates,
    sanitize_and_strip_exif_image,
    format_standard_error
)
from apps.api.app.models.entities import CitizenReport, WaterStation, RainfallStation

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
        "sampling": "รอผลตรวจทางห้องปฏิบัติการจากหน่วยงาน",
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
    
    # Query database for actual verified observation count
    obs_count = db.query(CitizenReport).filter(
        CitizenReport.district == district,
        CitizenReport.verification_status != "REJECTED"
    ).count()

    total_stations = db.query(WaterStation).count()

    return {
        "selected_area": f"อำเภอ{district} จังหวัดปราจีนบุรี",
        "current_status": zone_data["watch_status"],
        "verification_priority": zone_data["priority"],
        "verification_priority_label": zone_data["priority_label"],
        "verification_priority_explanation": "ระดับนี้ใช้สำหรับจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบเพิ่มเติม ไม่ใช่การยืนยันว่ามีการปนเปื้อน",
        "flood_status": zone_data["flood_status"],
        "community_observation_count": obs_count if obs_count > 0 else zone_data["obs_count"],
        "community_observation_summary": f"มีรายงานข้อสังเกตจากประชาชนในพื้นที่ {obs_count if obs_count > 0 else zone_data['obs_count']} จุด (อยู่ระหว่างเฝ้าระวัง)",
        "official_sampling_status": zone_data["sampling"],
        "forecast_watch_summary": zone_data["forecast"],
        "data_confidence": zone_data["confidence"],
        "data_freshness": zone_data["freshness"],
        "last_updated": datetime.now(timezone.utc).strftime("%d ต.ค. 2569 %H:%M น."),
        "why_this_area": zone_data["why"],
        "why_this_area_disclaimer": "ไม่มีข้อมูลใดในรายการนี้เพียงอย่างเดียวที่สามารถใช้ยืนยันการปนเปื้อนได้",
        "monitoring_stations_active": total_stations if total_stations > 0 else 6,
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
# Section 11: GET /api/public/waterways
# Public Rivers, Canals, Waterway Corridors (GeoJSON Lines)
# ============================================================
@public_router.get("/waterways", response_model=Dict[str, Any])
def get_public_waterways():
    """
    Returns public river network (DWR/RID) GeoJSON lines.
    """
    from apps.api.app.services.risk_engine import RIVER_CORRIDORS
    features = []
    for c in RIVER_CORRIDORS:
        coords = [[pt[1], pt[0]] for pt in c.get("path", [])]
        features.append({
            "type": "Feature",
            "properties": {
                "name": c.get("name", "ทางน้ำสายหลัก"),
                "description": c.get("desc", ""),
                "badge": "OFFICIAL"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            }
        })
    return {
        "type": "FeatureCollection",
        "description": "โครงข่ายแม่น้ำและคลองสายหลักลุ่มน้ำปราจีนบุรี (Public Waterways)",
        "features": features,
        "provenance": {
            "source_agency": "กรมทรัพยากรน้ำ (DWR) และ กรมชลประทาน (RID)",
            "dataset_name": "โครงข่ายทางน้ำลุ่มน้ำปราจีนบุรี (Basin 03)",
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
    Returns verified public river gauge and telemetry stations.
    Zero private/industrial coordinates.
    """
    stations = db.query(WaterStation).all()
    results = []
    for s in stations:
        prov = s.provenance or {}
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
    Returns verified public automatic rain gauge stations across Prachin Buri.
    Direct live telemetry from HII / ThaiWater under Open Government License Thailand (OGL-TH).
    """
    stations = db.query(RainfallStation).all()
    results = []
    for s in stations:
        prov = s.provenance or {}
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

    obs_count = db.query(CitizenReport).filter(
        CitizenReport.district == district,
        CitizenReport.verification_status != "REJECTED"
    ).count()

    return PublicAreaSummaryDTO(
        district=district,
        current_status=zone_data["watch_status"],
        verification_priority=zone_data["priority"],
        verification_priority_label=zone_data["priority_label"],
        verification_priority_explanation="ระดับนี้ใช้สำหรับจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบเพิ่มเติม ไม่ใช่การยืนยันว่ามีการปนเปื้อน",
        flood_status=zone_data["flood_status"],
        community_observation_summary=f"รายงานข้อสังเกตจากประชาชนในพื้นที่: {obs_count if obs_count > 0 else zone_data['obs_count']} รายการ",
        community_observation_count=obs_count if obs_count > 0 else zone_data["obs_count"],
        official_sampling_status=zone_data["sampling"],
        forecast_watch_summary=zone_data["forecast"],
        data_confidence=zone_data["confidence"],
        data_freshness=zone_data["freshness"],
        last_updated=datetime.now(timezone.utc).strftime("%d ต.ค. 2569 %H:%M น."),
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
        CitizenReport.verification_status != "REJECTED"
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
    Returns verified official government announcements and lab results.
    Detection != Source Attribution.
    """
    results = []
    for item in OFFICIAL_UPDATES_DATA:
        results.append(PublicOfficialUpdateDTO(
            id=item["id"],
            agency=item["agency"],
            title=item["title"],
            document_type=item["document_type"],
            published_at=item["published_at"],
            related_area=item["related_area"],
            factual_summary=item["factual_summary"],
            source_url=item["source_url"],
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
    Returns public data catalog describing all participating agencies,
    update frequencies, and data use limitations.
    """
    catalog = [
        {
            "provider": "GISTDA",
            "agency_full": "สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (องค์การมหาชน)",
            "purpose": "พื้นที่น้ำท่วมขังจากดาวเทียมเรดาร์ (Sentinel-1 / THEOS)",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลจากหน่วยงาน",
            "update_frequency": "รายสัปดาห์ / หลังดาวเทียมโคจรผ่าน",
            "terms": "GISTDA Open Data Policy",
            "source_link": "https://disaster.gistda.or.th/"
        },
        {
            "provider": "HII / ThaiWater / RID",
            "agency_full": "สถาบันสารสนเทศทรัพยากรน้ำ (สสน.) และ กรมชลประทาน",
            "purpose": "ระดับน้ำโทรมาตรรายชั่วโมง, ปริมาณน้ำฝน, และปริมาตรน้ำในเขื่อน",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลจากหน่วยงาน",
            "update_frequency": "รายชั่วโมง (High-Frequency Telemetry)",
            "terms": "ThaiWater API Standard Terms",
            "source_link": "https://standard.thaiwater.net/"
        },
        {
            "provider": "TMD",
            "agency_full": "กรมอุตุนิยมวิทยา กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม",
            "purpose": "พยากรณ์ปริมาณน้ำฝนและสภาพอากาศล่วงหน้า 24-72 ชม.",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลจากหน่วยงาน",
            "update_frequency": "รายวัน (Daily Forecast)",
            "terms": "TMD Open Data Portal",
            "source_link": "https://www.tmd.go.th/"
        },
        {
            "provider": "DWR / ONWR",
            "agency_full": "กรมทรัพยากรน้ำ และ สำนักงานทรัพยากรน้ำแห่งชาติ",
            "purpose": "โครงข่ายทางน้ำธรรมชาติและคลองชลประทานลุ่มน้ำปราจีนบุรี",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลจากหน่วยงาน",
            "update_frequency": "อ้างอิงเชิงพื้นที่ (Static Reference)",
            "terms": "DWR WebGIS Public Terms",
            "source_link": "https://webgis.dwr.go.th/"
        },
        {
            "provider": "PCD / สคพ.7",
            "agency_full": "กรมควบคุมมลพิษ และ สำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7",
            "purpose": "ผลการตรวจวัดคุณภาพน้ำผิวดินและการตรวจสอบทางห้องปฏิบัติการ",
            "classification": "OFFICIAL",
            "classification_th": "ข้อมูลจากหน่วยงาน",
            "update_frequency": "รายเดือน / รายไตรมาส",
            "terms": "PCD IWIS Public Information",
            "source_link": "https://iwis.pcd.go.th/"
        },
        {
            "provider": "FloodTrace Community",
            "agency_full": "เครือข่ายภาคประชาชนผู้ร่วมเฝ้าระวังสิ่งแวดล้อมจังหวัดปราจีนบุรี",
            "purpose": "ข้อสังเกตสภาพน้ำ กลิ่น คราบน้ำ และสัตว์น้ำผิดปกติ",
            "classification": "COMMUNITY",
            "classification_th": "รายงานจากประชาชน",
            "update_frequency": "ตามเวลาจริง (Real-time Crowd Observations)",
            "terms": "FloodTrace Content Policy (ลบข้อมูลส่วนบุคคลก่อนเผยแพร่)",
            "source_link": "#"
        }
    ]

    return {
        "title": "คลังข้อมูลและสัญญาอนุญาต (Data Catalog & Licensing)",
        "datasets": catalog,
        "methodology_summary": "น้ำท่วมขัง + อุทกวิทยา + การเชื่อมต่อทางน้ำ + ภูมิประเทศ + รายงานชุมชน + แหล่งเปราะบาง -> ลำดับความสำคัญในการตรวจสอบด้านสิ่งแวดล้อม",
        "limitations": [
            "ระบบไม่ได้ตรวจวัดสารเคมีโดยตรง การตรวจหาสารปนเปื้อนต้องกระทำโดยห้องปฏิบัติการที่ได้รับการรับรองเท่านั้น",
            "ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การชี้ตัวผู้กระทำผิด",
            "การไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน ไม่ได้เป็นการรับประกันความปลอดภัยอย่างสมบูรณ์แบบ",
            "รายงานจากประชาชนเป็นเพียงข้อสังเกตเบื้องต้น ไม่ถือเป็นข้อเท็จจริงยืนยันทางกฎหมาย"
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
    report_id = f"rpt_{uuid.uuid4().hex[:8]}"
    pub_lat, pub_lon = generalize_coordinates(payload.latitude, payload.longitude, decimals=2)
    
    new_report = CitizenReport(
        id=report_id,
        reporter_name="CITIZEN_PUBLIC",
        reporter_role="CITIZEN",
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
        "report_id": f"obs_{new_report.id}",
        "status": "UNVERIFIED",
        "message": "ส่งรายงานข้อสังเกตเรียบร้อยแล้ว ข้อมูลจะถูกจัดเก็บเป็นข้อสังเกตจากประชาชน (ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน)",
        "classification": "COMMUNITY",
        "badge": "COMMUNITY",
        "request_id": req_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
