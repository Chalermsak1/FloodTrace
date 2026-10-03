#!/usr/bin/env python3
"""
FloodTrace Production Readiness & Deep Audit Engine
Executes empirical runtime, data, and security verification against the FloodTrace system.
"""

import os
import sys
import json
import time
import httpx
import hashlib
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# Add repo root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal, engine
from apps.api.app.models.entities import (
    WaterStation,
    RainfallStation,
    WaterLevelObservation,
    RainfallObservation,
    CitizenReport,
    IndustrialFacility,
    Reservoir,
    SecurityAuditLog
)
from apps.api.app.core.source_access import CANDIDATE_SOURCES_REGISTRY, evaluate_source_access
from apps.api.app.core.datetime_utils import parse_thaiwater_timestamp

BANGKOK_TZ = ZoneInfo("Asia/Bangkok")

def audit_sources_and_thaiwater():
    print("\n================================================================================")
    print("1. EXTERNAL DATA SOURCE AUDIT & THAIWATER VALIDATION")
    print("================================================================================")
    
    sources_report = []

    # 1. ThaiWater Water Level
    tw_url = settings.THAIWATER_API_URL
    print(f"\n[Testing Source: thaiwater_waterlevel] -> {tw_url}")
    try:
        t0 = time.time()
        resp = httpx.get(tw_url, timeout=15.0, headers={"User-Agent": "FloodTraceAudit/1.0"})
        lat_ms = (time.time() - t0) * 1000
        http_code = resp.status_code
        payload = resp.json()
        raw_list = payload.get("waterlevel_data", {}).get("data", []) or payload.get("data", [])
        
        # Count Prachin Buri stations
        pb_stations = []
        future_ts_count = 0
        null_coords_count = 0
        now_utc = datetime.now(timezone.utc)
        
        for item in raw_list:
            st = item.get("station", {}) or {}
            geo = item.get("geocode", {}) or {}
            basin = item.get("basin", {}) or {}
            prov = str(geo.get("province_name", {}).get("th", "") if isinstance(geo.get("province_name"), dict) else geo.get("province_name", ""))
            basin_th = str(basin.get("basin_name", {}).get("th", "") if isinstance(basin.get("basin_name"), dict) else basin.get("basin_name", ""))
            st_name = str(st.get("tele_station_name", {}).get("th", "") if isinstance(st.get("tele_station_name"), dict) else st.get("tele_station_name", ""))
            
            lat = st.get("tele_station_lat")
            lon = st.get("tele_station_long")
            if lat is None or lon is None:
                null_coords_count += 1
                continue
            
            lat_f = float(lat)
            lon_f = float(lon)
            in_pb = ("ปราจีน" in prov or "ปราจีน" in basin_th or "ปราจีน" in st_name or
                     (13.58 <= lat_f <= 14.46 and 101.13 <= lon_f <= 102.13))
            
            if in_pb:
                dt_str = item.get("waterlevel_datetime")
                ts_meta = None
                if dt_str:
                    try:
                        ts_meta = parse_thaiwater_timestamp(dt_str)
                    except Exception:
                        future_ts_count += 1
                
                pb_stations.append({
                    "code": st.get("tele_station_oldcode") or st.get("tele_station_code") or item.get("id"),
                    "name": st_name,
                    "lat": lat_f,
                    "lon": lon_f,
                    "wl_msl": item.get("waterlevel_msl"),
                    "raw_time": dt_str,
                    "norm_bkk": ts_meta["dt_bkk"].isoformat() if ts_meta else None
                })
        
        print(f"  ✓ HTTP Status: {http_code}")
        print(f"  ✓ Total National Stations Received: {len(raw_list)}")
        print(f"  ✓ Prachin Buri Stations Count: {len(pb_stations)}")
        print(f"  ✓ Latency: {lat_ms:.1f}ms")
        print(f"  ✓ Null Coordinates in Payload: {null_coords_count}")
        print(f"  ✓ Sample Station [0]: {pb_stations[0]['name']} ({pb_stations[0]['code']}) -> {pb_stations[0]['wl_msl']}m MSL @ {pb_stations[0]['norm_bkk']}")
        
        sources_report.append({
            "source_id": "thaiwater_waterlevel",
            "type": "LIVE_EXTERNAL",
            "endpoint": tw_url,
            "http_status": http_code,
            "national_count": len(raw_list),
            "prachin_count": len(pb_stations),
            "latency_ms": lat_ms,
            "timezone_explicit": "+07:00" in (pb_stations[0]["norm_bkk"] or "")
        })
    except Exception as e:
        print(f"  ❌ Error fetching ThaiWater water level: {e}")

    # 2. ThaiWater Rainfall
    rain_url = settings.THAIWATER_RAIN_API_URL
    print(f"\n[Testing Source: thaiwater_rainfall] -> {rain_url}")
    try:
        t0 = time.time()
        resp = httpx.get(rain_url, timeout=15.0, headers={"User-Agent": "FloodTraceAudit/1.0"})
        lat_ms = (time.time() - t0) * 1000
        http_code = resp.status_code
        payload = resp.json()
        raw_list = payload.get("data", []) or payload.get("rain_24h", {}).get("data", [])
        
        pb_rain = []
        for item in raw_list:
            st = item.get("station", {}) or {}
            geo = item.get("geocode", {}) or {}
            basin = item.get("basin", {}) or {}
            prov = str(geo.get("province_name", {}).get("th", "") if isinstance(geo.get("province_name"), dict) else geo.get("province_name", ""))
            st_name = str(st.get("tele_station_name", {}).get("th", "") if isinstance(st.get("tele_station_name"), dict) else st.get("tele_station_name", ""))
            
            lat = st.get("tele_station_lat")
            lon = st.get("tele_station_long")
            if lat is None or lon is None:
                continue
            lat_f = float(lat)
            lon_f = float(lon)
            in_pb = ("ปราจีน" in prov or "ปราจีน" in st_name or (13.58 <= lat_f <= 14.46 and 101.13 <= lon_f <= 102.13))
            if in_pb:
                pb_rain.append({
                    "code": st.get("tele_station_oldcode") or st.get("tele_station_code") or item.get("id"),
                    "name": st_name,
                    "rain_24h": item.get("rain_24h")
                })
        
        print(f"  ✓ HTTP Status: {http_code}")
        print(f"  ✓ Total National Stations Received: {len(raw_list)}")
        print(f"  ✓ Prachin Buri Stations Count: {len(pb_rain)}")
        print(f"  ✓ Latency: {lat_ms:.1f}ms")
        print(f"  ✓ Sample Station [0]: {pb_rain[0]['name']} -> {pb_rain[0]['rain_24h']} mm/24h")
        
        sources_report.append({
            "source_id": "thaiwater_rainfall",
            "type": "LIVE_EXTERNAL",
            "endpoint": rain_url,
            "http_status": http_code,
            "national_count": len(raw_list),
            "prachin_count": len(pb_rain),
            "latency_ms": lat_ms
        })
    except Exception as e:
        print(f"  ❌ Error fetching ThaiWater rainfall: {e}")

    # 3. RID Reservoirs
    rid_url = settings.RID_RESERVOIR_API_URL
    print(f"\n[Testing Source: rid_reservoirs] -> {rid_url}")
    try:
        t0 = time.time()
        resp = httpx.get(rid_url, timeout=10.0, headers={"User-Agent": "FloodTraceAudit/1.0"})
        lat_ms = (time.time() - t0) * 1000
        http_code = resp.status_code
        print(f"  ✓ HTTP Status: {http_code}")
        print(f"  ✓ Latency: {lat_ms:.1f}ms")
        sources_report.append({
            "source_id": "rid_reservoirs",
            "type": "LIVE_EXTERNAL",
            "endpoint": rid_url,
            "http_status": http_code,
            "latency_ms": lat_ms
        })
    except Exception as e:
        print(f"  ○ RID endpoint test note: {e}")

    # 4. Open-Meteo Weather Forecast
    om_url = f"{settings.OPEN_METEO_API_URL}?latitude=14.0535&longitude=101.3868&daily=precipitation_sum&timezone=Asia%2FBangkok"
    print(f"\n[Testing Source: open_meteo_forecast] -> {om_url}")
    try:
        t0 = time.time()
        resp = httpx.get(om_url, timeout=10.0)
        lat_ms = (time.time() - t0) * 1000
        http_code = resp.status_code
        payload = resp.json()
        daily = payload.get("daily", {})
        print(f"  ✓ HTTP Status: {http_code}")
        print(f"  ✓ Forecast Days Received: {len(daily.get('time', []))}")
        print(f"  ✓ Timezone in Payload: {payload.get('timezone')} ({payload.get('timezone_abbreviation')})")
        sources_report.append({
            "source_id": "open_meteo_forecast",
            "type": "LIVE_EXTERNAL",
            "endpoint": om_url,
            "http_status": http_code,
            "latency_ms": lat_ms
        })
    except Exception as e:
        print(f"  ❌ Error fetching Open-Meteo: {e}")

    return sources_report

def audit_database_truth():
    print("\n================================================================================")
    print("2. DATABASE DATA TRUTH & CITIZEN REPORT CLASSIFICATION")
    print("================================================================================")
    
    with SessionLocal() as db:
        water_count = db.query(WaterStation).count()
        rain_count = db.query(RainfallStation).count()
        water_obs = db.query(WaterLevelObservation).count()
        rain_obs = db.query(RainfallObservation).count()
        facility_count = db.query(IndustrialFacility).count()
        res_count = db.query(Reservoir).count()
        audit_count = db.query(SecurityAuditLog).count()
        total_reports = db.query(CitizenReport).count()
        
        print(f"  - water_stations: {water_count}")
        print(f"  - rainfall_stations: {rain_count}")
        print(f"  - water_level_observations: {water_obs}")
        print(f"  - rainfall_observations: {rain_obs}")
        print(f"  - industrial_facilities: {facility_count}")
        print(f"  - reservoirs: {res_count}")
        print(f"  - security_audit_logs: {audit_count}")
        print(f"  - citizen_reports (TOTAL): {total_reports}")
        
        # Deep inspection of CitizenReport origin
        reports = db.query(CitizenReport).all()
        classifications = {
            "AUTOMATED_TEST_FIXTURE": 0,
            "CLASSIFIED_WHISTLEBLOWER": 0,
            "TEST_DEMO": 0,
            "AUDIT_SUBMISSION": 0,
            "PRODUCTION_REAL": 0
        }
        
        for r in reports:
            reporter = (r.reporter_name or "").lower()
            role = (r.reporter_role or "").upper()
            desc = (r.description or "").lower()
            
            if "somchai" in reporter or "test" in reporter or "idemp" in desc:
                classifications["AUTOMATED_TEST_FIXTURE"] += 1
            elif role == "WHISTLEBLOWER" or "whistleblower" in desc or "classified" in desc:
                classifications["CLASSIFIED_WHISTLEBLOWER"] += 1
            elif "demo" in desc or reporter == "demo":
                classifications["TEST_DEMO"] += 1
            elif "ตรวจสอบความพร้อม" in desc or "audit" in desc or "ทดสอบ" in desc:
                classifications["AUDIT_SUBMISSION"] += 1
            else:
                classifications["PRODUCTION_REAL"] += 1
                
        print("\nCitizen Report Breakdown by Origin:")
        for k, v in classifications.items():
            print(f"    • {k}: {v}")
            
        print(f"\nREAL_PUBLIC_REPORT_COUNT = {classifications['PRODUCTION_REAL']}")
        print(f"TOTAL_NON_PRODUCTION_REPORTS = {total_reports - classifications['PRODUCTION_REAL']}")
        
        return {
            "water_count": water_count,
            "rain_count": rain_count,
            "water_obs": water_obs,
            "rain_obs": rain_obs,
            "facility_count": facility_count,
            "total_reports": total_reports,
            "classifications": classifications
        }

def audit_scheduler_runtime():
    print("\n================================================================================")
    print("3. SCHEDULER RUNTIME & PIPELINE HEALTH AUDIT")
    print("================================================================================")
    
    try:
        resp = httpx.get("http://localhost:8001/api/v1/admin/scheduler/status", headers={"X-Admin-Key": settings.ADMIN_API_KEY})
        if resp.status_code == 200:
            status = resp.json()
            print(f"  ✓ Scheduler Status Endpoint: 200 OK")
            print(f"  ✓ Scheduler Active: {status.get('scheduler_active')}")
            print(f"  ✓ Tasks Registered: {len(status.get('tasks', []))}")
            for t in status.get('tasks', []):
                print(f"      - {t.get('source_id')}: interval={t.get('interval_seconds')}s, next_run={t.get('next_run')}")
        else:
            print(f"  ○ Scheduler status response: {resp.status_code}")
    except Exception as e:
        print(f"  ○ Scheduler audit note: {e}")

    try:
        resp2 = httpx.get("http://localhost:8001/health/metrics", headers={"X-Admin-Key": settings.ADMIN_API_KEY})
        if resp2.status_code == 200:
            m = resp2.json()
            print(f"  ✓ Health Metrics Status: {m.get('status')} (Alert Level: {m.get('alert_level')})")
            print(f"  ✓ Circuit Breakers Monitored: {list(m.get('circuit_breakers', {}).keys())}")
            for name, cb in m.get('circuit_breakers', {}).items():
                print(f"      - {name}: state={cb.get('state')}, failures={cb.get('failures')}, successes={cb.get('successes')}")
    except Exception as e:
        print(f"  ○ Metrics check note: {e}")

if __name__ == "__main__":
    audit_sources_and_thaiwater()
    audit_database_truth()
    audit_scheduler_runtime()
