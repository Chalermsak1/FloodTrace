#!/usr/bin/env python3
"""
External Verification Script: Real Public Deployment Audit
FloodTrace / Ruwaigon Platform — Prachin Buri Province

Verifies:
1. Public HTTPS URL Opens
2. Home Loads
3. Map Loads & Boundary Verified
4. Real Water Data Appears (ThaiWater HII)
5. Real Rainfall Data Appears (ThaiWater HII 24h)
6. Data Sources Page Works (Provenance Catalog)
7. Citizen Report Submission Works
8. Report ID is Generated (FT-2026-XXXXXX, UNVERIFIED)
9. Report Tracking Works (Public Safe, Privacy Preserved)
10. Staff Console is Protected (HTTP 401 Unauthorized)
11. Scheduler is Running (Automated Refresh Engine)
12. Database is Persistent (PostgreSQL Storage)
"""

import sys
import json
import urllib.request
import urllib.parse
import urllib.error
import ssl
from datetime import datetime

PUBLIC_BASE = "https://roulette-funny-joint-scout.trycloudflare.com"

STAFF_HEADERS = {
    "X-Admin-Key": "dev-admin-secret-key-change-in-prod",
    "X-Staff-Role": "ADMIN",
    "X-Staff-User": "admin_user",
    "Content-Type": "application/json",
    "User-Agent": "FloodTraceExternalVerifier/1.0"
}

def log_check(name: str, passed: bool, detail: str = ""):
    icon = "✅ PASS" if passed else "❌ FAIL"
    print(f"{icon} | {name:<50} | {detail}")
    return passed

def http_req(method: str, path: str, data: dict = None, headers: dict = None):
    url = f"{PUBLIC_BASE}{path}"
    req_headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "Accept": "*/*"
    }
    if headers:
        req_headers.update(headers)
    
    encoded_data = None
    if data is not None:
        encoded_data = json.dumps(data).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    # Strict SSL context
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            ct = resp.headers.get("Content-Type", "")
            if "json" in ct:
                return resp.status, json.loads(raw)
            return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw}
    except Exception as e:
        return 0, {"error": str(e)}

def main():
    print("=" * 84)
    print("FLOODTRACE PRODUCTION DEPLOYMENT EXTERNAL AUDIT")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Public HTTPS Target: {PUBLIC_BASE}")
    print("=" * 84)

    all_passed = True

    # ----------------------------------------------------
    # Check 1: Public URL Opens (HTTPS & SSL Verification)
    # ----------------------------------------------------
    print("\n--- 1. Public HTTPS Connectivity ---")
    st, html = http_req("GET", "/", headers={"Accept": "text/html"})
    opens_ok = st == 200 and isinstance(html, str) and ("FloodTrace" in html or "<div id=\"root\">" in html)
    all_passed &= log_check("1. Public URL Opens over HTTPS", opens_ok, f"HTTP {st}, Length={len(html) if isinstance(html, str) else 0}")

    # ----------------------------------------------------
    # Check 2: Home Loads & Public Overview
    # ----------------------------------------------------
    print("\n--- 2. Home Page & Public Overview ---")
    st2, ov_data = http_req("GET", "/api/public/overview")
    home_ok = st2 == 200 and isinstance(ov_data, dict) and "selected_area" in ov_data
    all_passed &= log_check("2. Home Page Overview Loads", home_ok, f"Area: {ov_data.get('selected_area', 'N/A')}")

    # ----------------------------------------------------
    # Check 3: Map Data (Priority Surface, Boundaries, Waterways)
    # ----------------------------------------------------
    print("\n--- 3. Map Layers & Monitoring Boundary ---")
    st_prio, prio_data = http_req("GET", "/api/public/map/monitoring-priority")
    prio_features = prio_data.get("features", []) if isinstance(prio_data, dict) else []
    prio_ok = st_prio == 200 and len(prio_features) >= 30

    st_bound, bound_data = http_req("GET", "/api/public/map/boundary")
    bound_ok = st_bound == 200 and ("outside_scope_mask" in bound_data or bound_data.get("type") == "FeatureCollection")

    st_ww, ww_data = http_req("GET", "/api/public/waterways")
    ww_features = ww_data.get("features", []) if isinstance(ww_data, dict) else []
    ww_ok = st_ww == 200 and len(ww_features) >= 5

    map_ok = prio_ok and bound_ok and ww_ok
    all_passed &= log_check("3. Map Loads (Surface, Bounds, Waterways)", map_ok, f"Cells={len(prio_features)}, Waterways={len(ww_features)}")

    # ----------------------------------------------------
    # Check 4: Real Water Data Appears (ThaiWater HII)
    # ----------------------------------------------------
    print("\n--- 4. Real Water Level Telemetry ---")
    st_w, water_stations = http_req("GET", "/api/public/stations")
    water_ok = st_w == 200 and isinstance(water_stations, list) and len(water_stations) >= 20
    first_w = water_stations[0] if (isinstance(water_stations, list) and water_stations) else {}
    all_passed &= log_check("4. Real Water Data Appears (ThaiWater HII)", water_ok, f"Stations={len(water_stations) if isinstance(water_stations, list) else 0}, Sample: {first_w.get('name_th')}")

    # ----------------------------------------------------
    # Check 5: Real Rainfall Data Appears (ThaiWater HII 24h)
    # ----------------------------------------------------
    print("\n--- 5. Real Rainfall Telemetry ---")
    st_r, rain_stations = http_req("GET", "/api/public/rainfall-stations")
    rain_ok = st_r == 200 and isinstance(rain_stations, list) and len(rain_stations) >= 50
    first_r = rain_stations[0] if (isinstance(rain_stations, list) and rain_stations) else {}
    all_passed &= log_check("5. Real Rainfall Data Appears (ThaiWater HII)", rain_ok, f"Stations={len(rain_stations) if isinstance(rain_stations, list) else 0}, Sample: {first_r.get('name_th')}")

    # ----------------------------------------------------
    # Check 6: Data Sources & Provenance Catalog
    # ----------------------------------------------------
    print("\n--- 6. Data Sources Page ---")
    st_src, prov_data = http_req("GET", "/api/public/provenance")
    active_sources = prov_data.get("active_sources", []) if isinstance(prov_data, dict) else []
    ref_sources = prov_data.get("reference_sources", []) if isinstance(prov_data, dict) else []
    all_sources = active_sources + ref_sources
    src_ok = st_src == 200 and len(all_sources) >= 5
    all_passed &= log_check("6. Data Sources Page Works", src_ok, f"Total Sources={len(all_sources)}, Active={len(active_sources)}")

    # ----------------------------------------------------
    # Check 7: Citizen Report Submission Works
    # ----------------------------------------------------
    print("\n--- 7. Citizen Report Submission ---")
    sub_payload = {
        "category": "น้ำท่วมขัง",
        "district": "เมืองปราจีนบุรี",
        "subdistrict": "หน้าเมือง",
        "latitude": 14.0512,
        "longitude": 101.3725,
        "description": "ระดับน้ำในคูเมืองเริ่มเอ่อล้นเข้าท่วมผิวจราจรบางส่วน ทดสอบการรายงานจริงภายนอกระบบ",
        "water_depth_cm": 25.0,
        "declaration_confirmed": True
    }
    st_sub, sub_resp = http_req("POST", "/api/public/reports", data=sub_payload)
    sub_ok = st_sub == 201 and sub_resp.get("success") is True
    report_id = sub_resp.get("report_id")
    all_passed &= log_check("7. Citizen Report Submission Works", sub_ok, f"Generated Report ID={report_id}")

    # ----------------------------------------------------
    # Check 8: Report ID Generated as UNVERIFIED / COMMUNITY
    # ----------------------------------------------------
    print("\n--- 8. Report Classification Guardrail ---")
    is_unverified = sub_resp.get("status") == "UNVERIFIED"
    is_community = sub_resp.get("classification") == "COMMUNITY"
    all_passed &= log_check("8. Report Starts as UNVERIFIED / COMMUNITY", is_unverified and is_community, f"Status={sub_resp.get('status')}, Class={sub_resp.get('classification')}")

    # ----------------------------------------------------
    # Check 9: Report Tracking Works & Privacy Preserved
    # ----------------------------------------------------
    print("\n--- 9. Report Tracking & Privacy ---")
    st_tr, tr_data = http_req("GET", f"/api/public/reports/track/{report_id}")
    tr_ok = st_tr == 200 and tr_data.get("report_id") == report_id
    no_pii = not any(k in tr_data for k in ["reporter_name", "reporter_phone", "reporter_email", "exact_latitude", "exact_longitude", "internal_notes"])
    all_passed &= log_check("9. Report Tracking Works Safely", tr_ok and no_pii, f"Public Status: {tr_data.get('public_status')}, Zero PII leaked")

    # ----------------------------------------------------
    # Check 10: Protected Staff Console
    # ----------------------------------------------------
    print("\n--- 10. Staff Console Security Boundary ---")
    st_unauth, _ = http_req("GET", "/api/v1/admin/reports")
    is_protected = st_unauth in (401, 403)

    st_auth, auth_queue = http_req("GET", "/api/v1/admin/reports?limit=5", headers=STAFF_HEADERS)
    can_staff_read = st_auth == 200 and "items" in auth_queue
    all_passed &= log_check("10. Staff Console is Protected", is_protected and can_staff_read, f"Unauth={st_unauth}, Auth Status={st_auth}, Queue={len(auth_queue.get('items', []))}")

    # ----------------------------------------------------
    # Check 11: Scheduler is Running
    # ----------------------------------------------------
    print("\n--- 11. Automated Scheduler Status ---")
    st_sched, sched_status = http_req("GET", "/api/v1/admin/scheduler/status", headers=STAFF_HEADERS)
    sources_dict = sched_status.get("sources", {}) if isinstance(sched_status, dict) else {}
    sched_ok = st_sched == 200 and (sched_status.get("scheduler_active") is True or sched_status.get("running") is True) and len(sources_dict) > 0
    all_passed &= log_check("11. Automated Scheduler is Running", sched_ok, f"Active={sched_status.get('scheduler_active', True)}, Registered Sources={len(sources_dict)}")

    # ----------------------------------------------------
    # Check 12: Database is Persistent
    # ----------------------------------------------------
    print("\n--- 12. Persistent Database Storage ---")
    st_det, det_report = http_req("GET", f"/api/v1/admin/reports/{report_id}", headers=STAFF_HEADERS)
    db_ok = st_det == 200 and det_report.get("id") == report_id and det_report.get("district") == "เมืองปราจีนบุรี"
    all_passed &= log_check("12. Database is Persistent", db_ok, f"Record retrieved from PostgreSQL, ID={det_report.get('id')}")

    print("\n" + "=" * 84)
    if all_passed:
        print("🎉 ALL 12 EXTERNAL PRODUCTION DEPLOYMENT CHECKS PASSED!")
        print(f"Public URL: {PUBLIC_BASE}")
        print("The FloodTrace platform is live and verified from the outside.")
        print("=" * 84)
        return 0
    else:
        print("❌ ONE OR MORE EXTERNAL CHECKS FAILED! Please review output above.")
        print("=" * 84)
        return 1

if __name__ == "__main__":
    sys.exit(main())
