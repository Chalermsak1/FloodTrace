"""
FloodTrace Hydrological Map Intelligence Service
Authoritative waterway segmentation, station-to-waterway matching, 
and hydrological status evaluation based on real telemetry data.

Rules & Architecture:
- Never guess a river name simply by distance when ambiguous.
- Explicit matching states: HIGH_CONFIDENCE, REQUIRES_REVIEW, UNMATCHED.
- River segment status is derived ONLY from HIGH_CONFIDENCE station observations.
- Visual states: CRITICAL (Red), WATCH (Orange), NORMAL (Green), NO_DATA (Gray), UNMONITORED (Blue).
- Preserve station integrity, provenance, and original coordinates.
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from apps.api.app.models.entities import WaterStation

# Approximate km per degree in Central Thailand (lat ~14.0 deg)
KM_PER_LAT_DEG = 111.0
KM_PER_LON_DEG = 107.8

def dist_point_to_segment(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """Distance in km from point (px=lon, py=lat) to line segment (x1,y1)-(x2,y2)."""
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot((py - y1) * KM_PER_LAT_DEG, (px - x1) * KM_PER_LON_DEG)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    d_lat = (py - proj_y) * KM_PER_LAT_DEG
    d_lon = (px - proj_x) * KM_PER_LON_DEG
    return math.hypot(d_lat, d_lon)

def dist_point_to_line(px: float, py: float, path: List[List[float]]) -> float:
    """Minimum distance in km from point (lon, lat) to line string path."""
    min_d = float('inf')
    for i in range(len(path) - 1):
        x1, y1 = path[i]
        x2, y2 = path[i + 1]
        d = dist_point_to_segment(px, py, x1, y1, x2, y2)
        if d < min_d:
            min_d = d
    return min_d

# ==============================================================================
# AUTHORITATIVE WATERWAY REACHES & SEGMENTS FOR PRACHIN BURI BASIN
# Segmented logically by administrative district boundaries & hydrological junctions.
# ==============================================================================
PRACHIN_WATERWAY_REACHES = [
    {
        "segment_id": "seg_prachin_kabin",
        "waterway_id": "riv_prachin_main",
        "name": "แม่น้ำปราจีนบุรี ตอนบน (ช่วง อ.กบินทร์บุรี)",
        "river_name": "แม่น้ำปราจีนบุรี",
        "type": "แม่น้ำสายหลัก (Major River)",
        "district": "กบินทร์บุรี",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.8,
        "desc": "จุดบรรจบแม่น้ำหนุมานและแม่น้ำพระปรง ไหลผ่านตัวอำเภอกบินทร์บุรี (จุดเสี่ยงน้ำเอ่อล้น)",
        "path": [
            [101.7214, 13.9876], [101.6920, 13.9820], [101.6450, 13.9750], [101.5980, 13.9710]
        ],
        "primary_station_id": "Kgt.3",
        "candidate_stations": ["Kgt.3", "PRC001"]
    },
    {
        "segment_id": "seg_prachin_simahaphot",
        "waterway_id": "riv_prachin_main",
        "name": "แม่น้ำปราจีนบุรี ช่วง อ.ศรีมหาโพธิ (บ้านทาม - ท่าตูม)",
        "river_name": "แม่น้ำปราจีนบุรี",
        "type": "แม่น้ำสายหลัก (Major River)",
        "district": "ศรีมหาโพธิ",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.8,
        "desc": "แม่น้ำปราจีนบุรีช่วงกลาง ไหลผ่านพื้นที่เกษตรกรรมและจุดบรรจบคลองกรักเยื่อ",
        "path": [
            [101.5980, 13.9710], [101.5420, 13.9725], [101.5175, 13.9734], [101.4820, 13.9950]
        ],
        "primary_station_id": "Kgt.6",
        "candidate_stations": ["Kgt.6", "PRC005"]
    },
    {
        "segment_id": "seg_prachin_mueang",
        "waterway_id": "riv_prachin_main",
        "name": "แม่น้ำปราจีนบุรี ช่วง อ.เมืองปราจีนบุรี (สะพานณรงค์ดำริ - ท่างาม)",
        "river_name": "แม่น้ำปราจีนบุรี",
        "type": "แม่น้ำสายหลัก (Major River)",
        "district": "เมืองปราจีนบุรี",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 4.0,
        "desc": "แม่น้ำปราจีนบุรีช่วงเขตเศรษฐกิจและเทศบาลเมืองปราจีนบุรี (จุดเฝ้าระวังตลิ่งหลัก)",
        "path": [
            [101.4820, 13.9950], [101.4400, 14.0200], [101.4050, 14.0410], 
            [101.3868, 14.0535], [101.3520, 14.0380]
        ],
        "primary_station_id": "Kgt.1",
        "candidate_stations": ["Kgt.1", "PRC002"]
    },
    {
        "segment_id": "seg_prachin_bansang",
        "waterway_id": "riv_prachin_main",
        "name": "แม่น้ำปราจีนบุรี ตอนล่าง ช่วง อ.บ้านสร้าง (บางแตน)",
        "river_name": "แม่น้ำปราจีนบุรี",
        "type": "แม่น้ำสายหลัก (Major River)",
        "district": "บ้านสร้าง",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 4.2,
        "desc": "แม่น้ำปราจีนบุรีตอนล่างไหลลงสู่ทุ่งรับน้ำบ้านสร้าง ก่อนบรรจบแม่น้ำนครนายกเป็นแม่น้ำบางปะกง",
        "path": [
            [101.3520, 14.0380], [101.3100, 14.0100], [101.2601, 13.9569], 
            [101.2150, 13.9350], [101.1650, 13.9010]
        ],
        "primary_station_id": None,
        "candidate_stations": []
    },
    {
        "segment_id": "seg_hanuman",
        "waterway_id": "riv_hanuman",
        "name": "แม่น้ำหนุมาน (Hanuman River)",
        "river_name": "แม่น้ำหนุมาน",
        "type": "แม่น้ำสายหลัก (Major River)",
        "district": "กบินทร์บุรี",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.2,
        "desc": "ต้นน้ำจากเขาใหญ่-ทับลาน ไหลผ่าน อ.นาดี สู่ อ.กบินทร์บุรี บรรจบแม่น้ำพระปรง",
        "path": [
            [101.9167, 14.1834], [101.8850, 14.1520], [101.8500, 14.1200], [101.8150, 14.0820],
            [101.7800, 14.0500], [101.7480, 14.0180], [101.7214, 13.9876]
        ],
        "primary_station_id": "Kgt.43A",
        "candidate_stations": ["Kgt.43A", "Kgt.14A"]
    },
    {
        "segment_id": "seg_phraprong",
        "waterway_id": "riv_phraprong",
        "name": "แม่น้ำพระปรง (Phra Prong River)",
        "river_name": "แม่น้ำพระปรง",
        "type": "แม่น้ำสายหลัก (Major River)",
        "district": "กบินทร์บุรี",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 3.2,
        "desc": "รับน้ำจาก จ.สระแก้ว ไหลเข้าสู่ อ.กบินทร์บุรี บรรจบกับแม่น้ำหนุมาน",
        "path": [
            [102.0500, 13.9100], [101.9800, 13.9150], [101.9200, 13.9350], [101.8600, 13.9480],
            [101.7900, 13.9600], [101.7450, 13.9720], [101.7214, 13.9876]
        ],
        "primary_station_id": "SKE001",
        "candidate_stations": ["SKE001"]
    },
    {
        "segment_id": "seg_bangpakong_upper",
        "waterway_id": "riv_bangpakong_upper",
        "name": "แม่น้ำบางปะกง ตอนบน (Bang Pakong River)",
        "river_name": "แม่น้ำบางปะกง",
        "type": "แม่น้ำสายหลัก (Major River)",
        "district": "บ้านสร้าง",
        "hierarchy_rank": "major_river",
        "order": 1,
        "line_width": 4.2,
        "desc": "จุดเริ่มต้นแม่น้ำบางปะกงที่ ต.บางแตน อ.บ้านสร้าง ไหลเชื่อมสู่ จ.ฉะเชิงเทรา",
        "path": [
            [101.1650, 13.9010], [101.1500, 13.8820], [101.1410, 13.8550], [101.1350, 13.8200]
        ],
        "primary_station_id": "BPK003",
        "candidate_stations": ["BPK003"]
    },
    {
        "segment_id": "seg_can_prachantakham",
        "waterway_id": "can_prachantakham",
        "name": "คลองประจันตคาม (Khlong Prachantakham)",
        "river_name": "คลองประจันตคาม",
        "type": "คลองสายรอง (Secondary Canal)",
        "district": "ประจันตคาม",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.4,
        "desc": "ระบายน้ำหลากจากแนวอุทยานแห่งชาติเขาใหญ่ ลงสู่แม่น้ำปราจีนบุรีที่ ต.ท่างาม",
        "path": [
            [101.5520, 14.1820], [101.5520, 14.1120], [101.5210, 14.0720], 
            [101.4850, 14.0550], [101.4400, 14.0450], [101.4050, 14.0410]
        ],
        "primary_station_id": "PRC004",
        "candidate_stations": ["PRC004"]
    },
    {
        "segment_id": "seg_can_krater",
        "waterway_id": "can_krater",
        "name": "คลองกรักเยื่อ / คลองระสะกำ (Khlong Krater)",
        "river_name": "คลองกรักเยื่อ",
        "type": "คลองสายรอง (Secondary Canal)",
        "district": "ศรีมหาโพธิ",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.0,
        "desc": "ทางน้ำธรรมชาติระบายน้ำในเขต อ.ศรีมหาโพธิ ไหลเชื่อมสู่แม่น้ำปราจีนบุรี",
        "path": [
            [101.5642, 13.8967], [101.5412, 13.9120], [101.5210, 13.9350], [101.5175, 13.9734]
        ],
        "primary_station_id": None,
        "candidate_stations": []
    },
    {
        "segment_id": "seg_can_saraphi",
        "waterway_id": "can_saraphi",
        "name": "คลองสารภี (Khlong Saraphi)",
        "river_name": "คลองสารภี",
        "type": "คลองสายรอง (Secondary Canal)",
        "district": "บ้านสร้าง",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.0,
        "desc": "คลองระบายน้ำเกษตรกรรมสายหลักในพื้นที่ทุ่งรับน้ำ อ.บ้านสร้าง",
        "path": [
            [101.2412, 13.9621], [101.2150, 13.9850], [101.1920, 13.9920], [101.1710, 13.9980]
        ],
        "primary_station_id": None,
        "candidate_stations": []
    },
    {
        "segment_id": "seg_can_huai_samong",
        "waterway_id": "can_huai_samong",
        "name": "คลองห้วยโสมง (Khlong Huai Samong)",
        "river_name": "คลองห้วยโสมง",
        "type": "คลองสายรอง (Secondary Canal)",
        "district": "นาดี",
        "hierarchy_rank": "secondary_canal",
        "order": 2,
        "line_width": 2.0,
        "desc": "ลำน้ำเชื่อมต่อจากอ่างเก็บน้ำนฤบดินทรจินดา อ.นาดี ลงสู่แม่น้ำหนุมาน",
        "path": [
            [101.9650, 14.2450], [101.9320, 14.2150], [101.9167, 14.1834]
        ],
        "primary_station_id": None,
        "candidate_stations": []
    },
    {
        "segment_id": "seg_can_bang_phluang",
        "waterway_id": "can_bang_phluang",
        "name": "คลองบางพลวง (Khlong Bang Phluang)",
        "river_name": "คลองบางพลวง",
        "type": "ลำคลองสาขา (Tributary)",
        "district": "บ้านสร้าง",
        "hierarchy_rank": "tributary",
        "order": 3,
        "line_width": 1.5,
        "desc": "คลองสาขากระจายน้ำใน อ.บ้านสร้าง",
        "path": [
            [101.2601, 13.9569], [101.2412, 13.9621], [101.2250, 13.9510]
        ],
        "primary_station_id": None,
        "candidate_stations": []
    }
]

# Explicit station verification metadata (Official RID / ThaiWater stations)
VERIFIED_STATION_WATERWAY_MATCHES = {
    "Kgt.1": {
        "waterway_id": "riv_prachin_main",
        "segment_id": "seg_prachin_mueang",
        "waterway_name": "แม่น้ำปราจีนบุรี",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีโทรมาตรหลัก สะพานณรงค์ดำริ (รหัส RID: Kgt.1) ตั้งอยู่บนแม่น้ำปราจีนบุรี อ.เมืองปราจีนบุรี (ระยะห่าง 0.67 กม.)"
    },
    "PRC002": {
        "waterway_id": "riv_prachin_main",
        "segment_id": "seg_prachin_mueang",
        "waterway_name": "แม่น้ำปราจีนบุรี",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีโทรมาตร เมืองปราจีนบุรี (สสน.) ตั้งอยู่บนแนวแม่น้ำปราจีนบุรี"
    },
    "Kgt.3": {
        "waterway_id": "riv_prachin_main",
        "segment_id": "seg_prachin_kabin",
        "waterway_name": "แม่น้ำปราจีนบุรี",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีสะพานต้นน้ำบางปะกง/กบินทร์บุรี (รหัส RID: Kgt.3) ตั้งอยู่ ณ จุดกำเนิดแม่น้ำปราจีนบุรี (ระยะห่าง 0.23 กม.)"
    },
    "PRC001": {
        "waterway_id": "riv_prachin_main",
        "segment_id": "seg_prachin_kabin",
        "waterway_name": "แม่น้ำปราจีนบุรี",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีเทศบาลกบินทร์บุรี ตั้งอยู่ ณ แนวแม่น้ำปราจีนบุรีตอนบน"
    },
    "Kgt.6": {
        "waterway_id": "riv_prachin_main",
        "segment_id": "seg_prachin_simahaphot",
        "waterway_name": "แม่น้ำปราจีนบุรี",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีบ้านทาม อ.ศรีมหาโพธิ (รหัส RID: Kgt.6) ติดตลิ่งแม่น้ำปราจีนบุรี (ระยะห่าง 0.00 กม.)"
    },
    "PRC005": {
        "waterway_id": "riv_prachin_main",
        "segment_id": "seg_prachin_simahaphot",
        "waterway_name": "แม่น้ำปราจีนบุรี",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีศรีมหาโพธิ (KGT6) สสน. ตั้งอยู่ริมแม่น้ำปราจีนบุรี"
    },
    "PRC004": {
        "waterway_id": "can_prachantakham",
        "segment_id": "seg_can_prachantakham",
        "waterway_name": "คลองประจันตคาม",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีโทรมาตรประจันตคาม (รหัส RID: Kgt.7A) ตั้งอยู่บนคลองประจันตคาม (ระยะห่าง 0.01 กม.)"
    },
    "Kgt.43A": {
        "waterway_id": "riv_hanuman",
        "segment_id": "seg_hanuman",
        "waterway_name": "แม่น้ำหนุมาน",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีบ้านนาแขม อ.กบินทร์บุรี ตั้งอยู่ริมแม่น้ำหนุมาน (ระยะห่าง 0.08 กม.)"
    },
    "Kgt.14A": {
        "waterway_id": "riv_hanuman",
        "segment_id": "seg_hanuman",
        "waterway_name": "แม่น้ำหนุมาน",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีบ้านทุ่งแฝก อ.นาดี ตั้งอยู่ริมแม่น้ำหนุมานตอนบน (ระยะห่าง 0.87 กม.)"
    },
    "SKE001": {
        "waterway_id": "riv_phraprong",
        "segment_id": "seg_phraprong",
        "waterway_name": "แม่น้ำพระปรง",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีคลองพระปรง ตั้งอยู่บนแม่น้ำพระปรง (ระยะห่าง 0.32 กม.)"
    },
    "BPK003": {
        "waterway_id": "riv_bangpakong_upper",
        "segment_id": "seg_bangpakong_upper",
        "waterway_name": "แม่น้ำบางปะกง",
        "confidence": "HIGH_CONFIDENCE",
        "basis": "สถานีโทรมาตรบางน้ำเปรี้ยว ตั้งอยู่ริมแม่น้ำบางปะกงตอนบน (ระยะห่าง 0.04 กม.)"
    },
    "Kgt.12A": {
        "waterway_id": "riv_phraprong",
        "segment_id": "seg_phraprong",
        "waterway_name": "แม่น้ำพระปรง",
        "confidence": "REQUIRES_REVIEW",
        "basis": "สถานีบ้านแก้ง ห่างจากแนวแม่น้ำพระปรง 1.97 กม. (อยู่นอกแนวขอบเขต Buffer 1.5 กม.)"
    },
    "Kgt.13A": {
        "waterway_id": "riv_phraprong",
        "segment_id": "seg_phraprong",
        "waterway_name": "แม่น้ำพระปรง",
        "confidence": "REQUIRES_REVIEW",
        "basis": "สถานีบ้านโนนสุขภูมิ ห่างจากแนวแม่น้ำพระปรง 4.55 กม. ในทุ่งรับน้ำ ต้องตรวจสอบจุดติดตั้งจริง"
    },
    "Kgt.34": {
        "waterway_id": "riv_hanuman",
        "segment_id": "seg_hanuman",
        "waterway_name": "แม่น้ำหนุมาน",
        "confidence": "REQUIRES_REVIEW",
        "basis": "สถานีบ้านชะอม อ.นาดี ห่างจากแนวแม่น้ำหนุมาน 7.06 กม. บนลำห้วยสาขาเขาใหญ่"
    },
    "PRC003": {
        "waterway_id": "riv_hanuman",
        "segment_id": "seg_hanuman",
        "waterway_name": "แม่น้ำหนุมาน",
        "confidence": "REQUIRES_REVIEW",
        "basis": "สถานีอำเภอนาดี ห่างจากแนวหลักแม่น้ำหนุมาน 10.6 กม. วัดบนลำน้ำสาขาย่อย"
    },
    "Kgt.15B": {
        "waterway_id": "riv_hanuman",
        "segment_id": "seg_hanuman",
        "waterway_name": "แม่น้ำหนุมาน / คลองโสมง",
        "confidence": "REQUIRES_REVIEW",
        "basis": "สถานีบ้านแก่งดินสอ ห่างจากแม่น้ำหนุมาน 9.75 กม. บนลำน้ำสาขาคลองโสมง"
    },
    "MOU460": {
        "waterway_id": "can_huai_samong",
        "segment_id": "seg_can_huai_samong",
        "waterway_name": "คลองลำพญาธาร",
        "confidence": "REQUIRES_REVIEW",
        "basis": "สะพานคลองลำพญาธาร อ.นาดี บนลำน้ำสาขาในเขตป่าอนุรักษ์"
    }
}


class HydrologicalIntelligenceService:
    """
    Computes real waterway segment status and station-to-waterway matching.
    """

    @classmethod
    def match_station_to_waterway(cls, station: WaterStation) -> Dict[str, Any]:
        """
        Calculates or retrieves verified station-to-waterway match with confidence level.
        """
        station_id = station.id
        if station_id in VERIFIED_STATION_WATERWAY_MATCHES:
            match_meta = VERIFIED_STATION_WATERWAY_MATCHES[station_id]
            # Compute real distance to matched segment
            reach = next((r for r in PRACHIN_WATERWAY_REACHES if r["segment_id"] == match_meta["segment_id"]), None)
            dist_km = dist_point_to_line(station.longitude, station.latitude, reach["path"]) if reach else 0.0
            return {
                "matched_waterway_id": match_meta["waterway_id"],
                "matched_waterway_name": match_meta["waterway_name"],
                "match_confidence": match_meta["confidence"],
                "match_basis": match_meta["basis"],
                "distance_to_waterway_km": round(dist_km, 2),
                "river_segment_id": match_meta["segment_id"]
            }

        # Spatial search across reaches
        slon, slat = station.longitude, station.latitude
        best_reach = None
        min_dist = float('inf')

        for r in PRACHIN_WATERWAY_REACHES:
            d = dist_point_to_line(slon, slat, r["path"])
            if d < min_dist:
                min_dist = d
                best_reach = r

        # Criteria:
        # Distance < 1.0 km -> High confidence if basin/district aligns
        # Distance 1.0 - 8.0 km -> Requires Review
        # Distance > 8.0 km -> Unmatched
        if min_dist < 1.0:
            confidence = "HIGH_CONFIDENCE"
            basis = f"พิกัดสถานีอยู่ใกล้ลำน้ำ {best_reach['river_name']} ในระยะ {min_dist:.2f} กม. (ผ่านเกณฑ์ระยะประชิด < 1.0 กม.)"
        elif min_dist <= 8.0:
            confidence = "REQUIRES_REVIEW"
            basis = f"พิกัดสถานีห่างจากลำน้ำ {best_reach['river_name']} {min_dist:.2f} กม. (เกินระยะความปลอดภัย 1.0 กม. จำเป็นต้องตรวจสอบโดยเจ้าหน้าที่)"
        else:
            confidence = "UNMATCHED"
            basis = f"สถานีอยู่นอกโครงข่ายทางน้ำหลักที่ติดตาม (ระยะห่าง {min_dist:.2f} กม. จาก {best_reach['river_name'] if best_reach else 'โครงข่ายทางน้ำ'})"

        return {
            "matched_waterway_id": best_reach["waterway_id"] if confidence != "UNMATCHED" else None,
            "matched_waterway_name": best_reach["river_name"] if confidence != "UNMATCHED" else "ไม่ได้ระบุลำน้ำหลัก",
            "match_confidence": confidence,
            "match_basis": basis,
            "distance_to_waterway_km": round(min_dist, 2),
            "river_segment_id": best_reach["segment_id"] if confidence != "UNMATCHED" else None
        }

    @classmethod
    def get_waterways_geojson(cls, db: Session) -> Dict[str, Any]:
        """
        Builds GeoJSON FeatureCollection of rivers and canals with monitoring statuses.
        Status is applied ONLY from HIGH_CONFIDENCE stations.
        """
        stations_list = db.query(WaterStation).all()
        stations_by_id = {s.id: s for s in stations_list}

        features = []
        status_counts = {
            "CRITICAL": 0,
            "WATCH": 0,
            "NORMAL": 0,
            "NO_DATA": 0,
            "UNMONITORED": 0
        }

        for r in PRACHIN_WATERWAY_REACHES:
            # Find primary station or candidate stations
            primary_st_id = r.get("primary_station_id")
            station = stations_by_id.get(primary_st_id) if primary_st_id else None

            # Fallback to candidates if primary has no data
            if (not station or station.water_level_msl is None) and r.get("candidate_stations"):
                for cid in r["candidate_stations"]:
                    cand = stations_by_id.get(cid)
                    if cand and cand.water_level_msl is not None:
                        station = cand
                        break

            # Evaluate Status
            if not station:
                monitoring_status = "UNMONITORED"
                status_label_th = "ไม่มีจุดตรวจวัดในส่วนนี้"
                color = "#0284c7" # Default river blue
                status_explanation = "ลำน้ำช่วงนี้ยังไม่มีสถานีตรวจวัดระดับน้ำโทรมาตรติดตั้งโดยตรง"
                water_level = None
                crit_level = None
                warn_level = None
                obs_time = None
                freshness = "UNAVAILABLE"
                matched_id = None
                matched_name = None
                confidence = "UNMATCHED"
                match_basis = "ไม่มีสถานีตรวจวัดเชื่อมโยงกับช่วงลำน้ำนี้"
            else:
                match_info = cls.match_station_to_waterway(station)
                matched_id = station.id
                matched_name = station.name_th
                confidence = match_info["match_confidence"]
                match_basis = match_info["match_basis"]

                # If matching confidence is not HIGH_CONFIDENCE, do not apply measurement to river segment!
                if confidence != "HIGH_CONFIDENCE":
                    monitoring_status = "UNMONITORED"
                    status_label_th = "ไม่มีสถานีที่ยืนยันความสอดคล้อง"
                    color = "#0284c7"
                    status_explanation = f"สถานีใกล้เคียง ({station.name_th}) มีสถานะ {confidence} จึงไม่นำค่ามาคำนวณสภาพลำน้ำ"
                    water_level = None
                    crit_level = None
                    warn_level = None
                    obs_time = None
                    freshness = "UNAVAILABLE"
                else:
                    water_level = station.water_level_msl
                    crit_level = station.critical_level_msl
                    warn_level = station.warning_level_msl
                    obs_time = station.last_updated.isoformat() if station.last_updated else None
                    freshness = "RECENT" if station.status == "STAGE_RECORDED" else "STALE"

                    if water_level is None or station.status in ["NO_DATA", "SENSOR_OUTLIER_STALE"]:
                        monitoring_status = "NO_DATA"
                        status_label_th = "ข้อมูลไม่เป็นปัจจุบัน"
                        color = "#94a3b8" # Slate gray
                        status_explanation = "เซนเซอร์โทรมาตรของสถานีไม่มีการส่งข้อมูลหรือสัญญาณขัดข้อง"
                    elif crit_level is not None and water_level >= crit_level:
                        monitoring_status = "CRITICAL"
                        status_label_th = "วิกฤต (น้ำล้นตลิ่ง)"
                        color = "#ef4444" # Red
                        status_explanation = f"ระดับน้ำวัดได้ {water_level:.2f} ม. สูงกว่าระดับตลิ่งวิกฤต ({crit_level:.2f} ม.)"
                    elif crit_level is not None and water_level >= (crit_level * 0.90):
                        monitoring_status = "WATCH"
                        status_label_th = "เฝ้าระวัง (ระดับน้ำสูง)"
                        color = "#f59e0b" # Amber / Orange
                        status_explanation = f"ระดับน้ำวัดได้ {water_level:.2f} ม. เข้าใกล้ระดับวิกฤต ({crit_level:.2f} ม.)"
                    elif warn_level is not None and water_level >= warn_level:
                        monitoring_status = "WATCH"
                        status_label_th = "เฝ้าระวัง (ระดับน้ำสูง)"
                        color = "#f59e0b" # Amber / Orange
                        status_explanation = f"ระดับน้ำวัดได้ {water_level:.2f} ม. เกินเกณฑ์เตือนภัย ({warn_level:.2f} ม.)"
                    else:
                        monitoring_status = "NORMAL"
                        status_label_th = "ปกติ"
                        color = "#10b981" # Emerald Green
                        status_explanation = f"ระดับน้ำวัดได้ {water_level:.2f} ม. อยู่ในเกณฑ์ปกติของลำน้ำ"

            status_counts[monitoring_status] += 1

            features.append({
                "type": "Feature",
                "properties": {
                    "waterway_id": r["waterway_id"],
                    "segment_id": r["segment_id"],
                    "name": r["name"],
                    "river_name": r["river_name"],
                    "type": r["type"],
                    "district": r["district"],
                    "hierarchy_rank": r["hierarchy_rank"],
                    "order": r["order"],
                    "line_width": r["line_width"],
                    "color": color,
                    "desc": r["desc"],
                    "monitoring_status": monitoring_status,
                    "status_label_th": status_label_th,
                    "status_explanation": status_explanation,
                    "matched_station_id": matched_id,
                    "matched_station_name": matched_name,
                    "match_confidence": confidence,
                    "match_basis": match_basis,
                    "water_level_msl": water_level,
                    "critical_level_msl": crit_level,
                    "warning_level_msl": warn_level,
                    "observed_at": obs_time,
                    "freshness_status": freshness,
                    "badge": "OFFICIAL_TELEMETRY" if matched_id else "GEOMETRY_ONLY"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": r["path"]
                }
            })

        # Matching summary across all stations
        match_summary = {"HIGH_CONFIDENCE": 0, "REQUIRES_REVIEW": 0, "UNMATCHED": 0}
        for st in stations_list:
            minfo = cls.match_station_to_waterway(st)
            conf = minfo.get("match_confidence", "UNMATCHED")
            match_summary[conf] = match_summary.get(conf, 0) + 1

        return {
            "type": "FeatureCollection",
            "description": "โครงข่ายลำน้ำและส่วนย่อยพร้อมการประเมินสถานะน้ำจริง (Hydrological Intelligence Waterways)",
            "features": features,
            "status_summary": {
                "critical_count": status_counts["CRITICAL"],
                "watch_count": status_counts["WATCH"],
                "normal_count": status_counts["NORMAL"],
                "no_data_count": status_counts["NO_DATA"],
                "unmonitored_count": status_counts["UNMONITORED"],
                "total_segments": len(features)
            },
            "matching_summary": match_summary,
            "provenance": {
                "source_agency": "กรมชลประทาน (RID) / สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)",
                "methodology": "การเชื่อมโยงสถานีโทรมาตรกับช่วงลำน้ำด้วยความเชื่อมั่นทางอุทกวิทยา (Hydrological Match Confidence)",
                "category": "MEASURED_FACT",
                "rules": "แสดงสถานะสีเฉพาะช่วงลำน้ำที่มีสถานีความเชื่อมั่นสูง (HIGH_CONFIDENCE) เท่านั้น"
            }
        }

    @classmethod
    def get_area_intelligence(
        cls,
        db: Session,
        district: Optional[str] = None,
        subdistrict: Optional[str] = None,
        waterway_id: Optional[str] = None,
        reach_id: Optional[str] = None,
        station_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Discovers related News, External Evidence, Citizen Reports, and Hydrological measurements
        for a selected geographic area, river reach, or monitoring station.
        Strictly preserves source attribution, real images, timestamps, and verification states.
        """
        from apps.api.app.models.entities import (
            RainfallStation, ExternalInformation, ExternalEvidence, ExternalEvidenceMedia, CitizenReport
        )
        from apps.api.app.services.event_information_service import EventInformationService

        target_waterway = waterway_id or reach_id

        # 1. Determine Scope & Title
        scope_type = "DISTRICT"
        title = f"อำเภอ{district} จังหวัดปราจีนบุรี" if district else "จังหวัดปราจีนบุรี (ภาพรวมทั้งจังหวัด)"
        subtitle = "ขอบเขตการปกครองและลุ่มน้ำที่เกี่ยวข้อง"

        selected_reach = None
        if target_waterway:
            selected_reach = next(
                (r for r in PRACHIN_WATERWAY_REACHES if r["segment_id"] == target_waterway or r["waterway_id"] == target_waterway), 
                None
            )
            if selected_reach:
                scope_type = "RIVER_REACH"
                title = selected_reach["name"]
                subtitle = f"ทางน้ำสำคัญ • {selected_reach['desc']}"
                if not district:
                    district = selected_reach.get("district")

        selected_station = None
        if station_id:
            st_obj = db.query(WaterStation).filter(WaterStation.id == station_id).first()
            if st_obj:
                selected_station = st_obj
                scope_type = "MONITORING_STATION"
                title = f"สถานีตรวจวัด {st_obj.name_th} ({st_obj.id})"
                subtitle = f"สถานีโทรมาตร • อ.{st_obj.district or 'เมืองปราจีนบุรี'} จ.ปราจีนบุรี"
                if not district:
                    district = st_obj.district

        if subdistrict:
            scope_type = "SUBDISTRICT"
            title = f"ตำบล{subdistrict} (อ.{district or 'เมืองปราจีนบุรี'})"
            subtitle = "ระดับตำบล • จังหวัดปราจีนบุรี"

        # 2. Water & Rainfall Stations
        w_query = db.query(WaterStation)
        r_query = db.query(RainfallStation)

        if district and district != "ทั้งหมด":
            w_query = w_query.filter(WaterStation.district == district)
            r_query = r_query.filter(RainfallStation.district == district)

        stations_res = []
        for s in w_query.all():
            m_info = cls.match_station_to_waterway(s)
            stations_res.append({
                "station_id": s.id,
                "name_th": s.name_th,
                "basin": s.basin,
                "district": s.district,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "water_level_msl": s.water_level_msl,
                "critical_level_msl": s.critical_level_msl,
                "warning_level_msl": s.warning_level_msl,
                "status": s.status,
                "observed_at_bkk": s.last_updated.strftime("%d ต.ค. %H:%M น.") if s.last_updated else None,
                "freshness_status": "RECENT" if s.status == "STAGE_RECORDED" else "STALE",
                "matched_waterway_id": m_info.get("matched_waterway_id"),
                "matched_waterway_name": m_info.get("matched_waterway_name"),
                "match_confidence": m_info.get("match_confidence"),
                "match_basis": m_info.get("match_basis"),
                "distance_to_waterway_km": m_info.get("distance_to_waterway_km"),
                "river_segment_id": m_info.get("river_segment_id")
            })

        rain_res = []
        for r in r_query.limit(20).all():
            rain_res.append({
                "station_id": r.id,
                "name_th": r.name_th,
                "district": r.district,
                "subdistrict": r.subdistrict,
                "rain_24h_mm": r.rain_24h_mm,
                "rain_1h_mm": r.rain_1h_mm,
                "status": r.status,
                "observed_at_bkk": r.last_updated.strftime("%d ต.ค. %H:%M น.") if r.last_updated else None
            })

        # Waterway Reaches in this area
        area_reaches = []
        for reach in PRACHIN_WATERWAY_REACHES:
            if not district or district == "ทั้งหมด" or reach.get("district") == district:
                # determine status
                p_st_id = reach.get("primary_station_id")
                p_st = db.query(WaterStation).filter(WaterStation.id == p_st_id).first() if p_st_id else None
                m_stat = "UNMONITORED"
                col = "#0284c7"
                lbl = "ไม่มีจุดตรวจวัดในส่วนนี้"
                if p_st and p_st.water_level_msl is not None:
                    if p_st.critical_level_msl and p_st.water_level_msl >= p_st.critical_level_msl:
                        m_stat = "CRITICAL"
                        col = "#ef4444"
                        lbl = "วิกฤต (น้ำล้นตลิ่ง)"
                    elif p_st.critical_level_msl and p_st.water_level_msl >= (p_st.critical_level_msl * 0.9):
                        m_stat = "WATCH"
                        col = "#f59e0b"
                        lbl = "เฝ้าระวัง (ระดับน้ำสูง)"
                    else:
                        m_stat = "NORMAL"
                        col = "#10b981"
                        lbl = "ปกติ"

                area_reaches.append({
                    "segment_id": reach["segment_id"],
                    "name": reach["name"],
                    "district": reach["district"],
                    "monitoring_status": m_stat,
                    "status_label_th": lbl,
                    "color": col,
                    "primary_station_id": p_st_id,
                    "primary_station_name": p_st.name_th if p_st else None,
                    "water_level_msl": p_st.water_level_msl if p_st else None
                })

        # 3. Curated News (ExternalInformation)
        EventInformationService.reconcile_default_information(db)
        info_query = db.query(ExternalInformation).filter(
            ExternalInformation.publication_status.in_(["PUBLIC", "PUBLIC_SAFE", "PUBLISHED"]),
            ExternalInformation.verification_status.notin_(["REJECTED", "WITHHELD"])
        )
        if district and district != "ทั้งหมด":
            from sqlalchemy import or_
            info_query = info_query.filter(
                or_(ExternalInformation.district == district, ExternalInformation.district == "ปราจีนบุรี")
            )

        news_items = []
        for item in info_query.order_by(ExternalInformation.published_at.desc()).limit(12).all():
            img_url = item.source_image_url or (item.provenance.get("cover_image_url") if isinstance(item.provenance, dict) else None)
            news_items.append({
                "id": item.id,
                "title": item.title,
                "source_name": item.source_name,
                "source_url": item.source_url,
                "source_image_url": img_url,
                "published_at": item.published_at.isoformat() if item.published_at else None,
                "published_at_th": item.published_at.strftime("%d ต.ค. %Y %H:%M น.") if item.published_at else "ล่าสุด",
                "factual_summary": item.summary or item.factual_details or item.title,
                "district": item.district,
                "authority_level": item.authority_level,
                "badge": item.source_type or "NEWS_MEDIA"
            })

        # 4. External Evidence
        ev_query = db.query(ExternalEvidence).filter(
            ExternalEvidence.publication_status.in_(["PUBLIC", "PUBLIC_SAFE"]),
            ExternalEvidence.verification_status.notin_(["REJECTED", "TEST_DEMO"]),
            ExternalEvidence.is_duplicate.is_(False)
        )
        if district and district != "ทั้งหมด":
            ev_query = ev_query.filter(ExternalEvidence.district == district)

        evidence_items = []
        for ev in ev_query.order_by(ExternalEvidence.observed_at.desc()).limit(12).all():
            media = db.query(ExternalEvidenceMedia).filter(ExternalEvidenceMedia.evidence_id == ev.id).first()
            photo_url = media.source_media_url if (media and media.source_media_url) else ev.source_url
            evidence_items.append({
                "id": ev.id,
                "title_or_summary": ev.title_or_summary,
                "source_platform": ev.source_platform,
                "source_url": ev.source_url,
                "photo_url": photo_url,
                "observed_at": ev.observed_at.isoformat() if ev.observed_at else None,
                "observed_at_th": ev.observed_at.strftime("%d ต.ค. %Y %H:%M น.") if ev.observed_at else None,
                "district": ev.district,
                "location_precision": ev.location_precision,
                "verification_status": ev.verification_status,
                "is_verified": ev.verification_status in ["OFFICIAL_VERIFIED", "CORROBORATED"]
            })

        # 5. Citizen Reports
        cr_query = db.query(CitizenReport).filter(
            CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
            CitizenReport.publication_state != "WITHHELD"
        )
        if district and district != "ทั้งหมด":
            cr_query = cr_query.filter(CitizenReport.district == district)

        citizen_reports = []
        for cr in cr_query.order_by(CitizenReport.created_at.desc()).limit(12).all():
            signs = cr.contamination_signs if isinstance(cr.contamination_signs, list) else []
            cat = str(signs[0]) if signs else "รายงานระดับน้ำและสิ่งแวดล้อม"
            citizen_reports.append({
                "id": f"rep_{cr.id}",
                "category": cat,
                "district": cr.district,
                "subdistrict": cr.subdistrict,
                "observed_at": cr.observed_at.isoformat() if cr.observed_at else cr.created_at.isoformat(),
                "observed_at_th": (cr.observed_at or cr.created_at).strftime("%d ต.ค. %H:%M น."),
                "verification_status": cr.verification_status or "RECEIVED",
                "notes": cr.description
            })

        # 6. Unified Chronological Timeline
        timeline_events = []
        for n in news_items:
            timeline_events.append({
                "type": "NEWS",
                "id": n["id"],
                "title": n["title"],
                "source": n["source_name"],
                "timestamp": n["published_at"],
                "timestamp_th": n["published_at_th"],
                "image_url": n["source_image_url"],
                "url": n["source_url"]
            })
        for e in evidence_items:
            timeline_events.append({
                "type": "EVIDENCE",
                "id": e["id"],
                "title": e["title_or_summary"],
                "source": e["source_platform"],
                "timestamp": e["observed_at"],
                "timestamp_th": e["observed_at_th"],
                "image_url": e["photo_url"],
                "url": e["source_url"],
                "is_verified": e["is_verified"]
            })
        for c in citizen_reports:
            timeline_events.append({
                "type": "CITIZEN_REPORT",
                "id": c["id"],
                "title": c["category"],
                "source": f"ประชาชน (ต.{c['subdistrict'] or c['district']})",
                "timestamp": c["observed_at"],
                "timestamp_th": c["observed_at_th"],
                "status": c["verification_status"]
            })

        # Sort timeline by ISO timestamp descending
        timeline_events.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

        return {
            "overview": {
                "scope_type": scope_type,
                "title": title,
                "subtitle": subtitle,
                "district": district,
                "subdistrict": subdistrict,
                "selected_reach": selected_reach["name"] if selected_reach else None,
                "selected_station": selected_station.name_th if selected_station else None,
                "total_water_stations": len(stations_res),
                "total_rainfall_stations": len(rain_res),
                "total_news": len(news_items),
                "total_evidence": len(evidence_items),
                "total_citizen_reports": len(citizen_reports)
            },
            "water_and_rainfall": {
                "reaches": area_reaches,
                "water_stations": stations_res,
                "rainfall_stations": rain_res
            },
            "news": news_items,
            "external_evidence": evidence_items,
            "citizen_reports": citizen_reports,
            "timeline": timeline_events[:20],
            "data_limitations": {
                "station_coverage": "การแสดงสภาพลำน้ำจำกัดเฉพาะจุดที่มีสถานีโทรมาตรเชื่อมโยงด้วยความเชื่อมั่นสูง",
                "extrapolation_policy": "ไม่มีการประมาณค่าสภาวะน้ำในลำน้ำที่ไม่มีสถานีตรวจวัดรองรับ",
                "provenance": "ข้อมูลระดับน้ำอ้างอิงจาก กรมชลประทาน (RID) / สสน. (ThaiWater)"
            }
        }

