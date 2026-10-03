#!/usr/bin/env python3
"""
Production Verification Script: Complete Citizen Reporting & Staff Console Workflow
FloodTrace / Ruwaigon Platform — Prachin Buri Province

End-to-End Verification of:
Citizen -> Submit Observation -> Receive Report ID -> Track Status ->
Staff Review -> Filter Reports -> Assign -> Compare Nearby Telemetry ->
Request More Info -> Verify Observation -> Escalate -> Resolve ->
View Timeline Audit Log -> Public / Internal Privacy Separation
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

BACKEND_BASE = "http://localhost:8001"
STAFF_HEADERS = {
    "X-Admin-Key": "dev-admin-secret-key-change-in-prod",
    "X-Staff-Role": "ADMIN",
    "X-Staff-User": "admin_user",
    "Content-Type": "application/json",
    "User-Agent": "FloodTraceWorkflowVerifier/1.0"
}

def log_check(name: str, passed: bool, detail: str = ""):
    icon = "✅ PASS" if passed else "❌ FAIL"
    print(f"{icon} | {name:<52} | {detail}")
    return passed

def http_req(method: str, path: str, data: dict = None, headers: dict = None):
    url = f"{BACKEND_BASE}{path}"
    req_headers = {"User-Agent": "FloodTraceWorkflowVerifier/1.0"}
    if headers:
        req_headers.update(headers)
    
    encoded_data = None
    if data is not None:
        encoded_data = json.dumps(data).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
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
    print("FLOODTRACE CITIZEN REPORTING & STAFF OPERATIONS CONSOLE WORKFLOW AUDIT")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Backend Target: {BACKEND_BASE}")
    print("=" * 84)

    all_passed = True

    # ----------------------------------------------------
    # Step 1: Citizen Submits Observation
    # ----------------------------------------------------
    print("\n--- 1. Citizen Submits Observation ---")
    sub_payload = {
        "category": "น้ำเปลี่ยนสี",
        "district": "กบินทร์บุรี",
        "subdistrict": "กบินทร์",
        "latitude": 13.9925,
        "longitude": 101.7245,
        "description": "พบเห็นน้ำในแม่น้ำหนุมานมีสีเขียวเข้มและมีกลิ่นฉุนผิดปกติ สังเกตเห็นบริเวณสะพาน",
        "water_depth_cm": 45.0,
        "declaration_confirmed": True
    }
    status, sub_resp = http_req("POST", "/api/public/reports", data=sub_payload)
    sub_ok = status == 201 and sub_resp.get("success") is True
    report_id = sub_resp.get("report_id")
    all_passed &= log_check("1.1 Citizen Report Submission (HTTP 201)", sub_ok, f"Report ID: {report_id}")

    # Check initial classification and verification level
    init_verif = sub_resp.get("status")
    init_class = sub_resp.get("classification")
    not_official = init_verif == "UNVERIFIED" and init_class == "COMMUNITY"
    all_passed &= log_check("1.2 Starts as CITIZEN_REPORTED / UNVERIFIED", not_official, f"Status: {init_verif}, Class: {init_class}")

    # ----------------------------------------------------
    # Step 2: Citizen Tracks Status
    # ----------------------------------------------------
    print("\n--- 2. Citizen Tracks Status with Report ID ---")
    track_status, track_resp = http_req("GET", f"/api/public/reports/track/{report_id}")
    track_ok = track_status == 200 and track_resp.get("report_id") == report_id
    all_passed &= log_check("2.1 Citizen Status Lookup by Report ID", track_ok, f"Status TH: {track_resp.get('public_status')}")

    # Verify public safety & privacy: no private coordinates, no PII
    no_exact_gps = "exact_latitude" not in track_resp and "exact_longitude" not in track_resp
    no_pii = not any(k in track_resp for k in ["reporter_name", "phone", "reporter_phone", "reporter_email", "email"])
    all_passed &= log_check("2.2 Tracking Privacy (No Exact GPS, No PII)", no_exact_gps and no_pii, "Privacy fully preserved")

    # ----------------------------------------------------
    # Step 3: Staff Console Access & Security Boundary
    # ----------------------------------------------------
    print("\n--- 3. Staff Console Protection & Queue Viewing ---")
    unauth_status, _ = http_req("GET", "/api/v1/admin/reports")
    is_protected = unauth_status in (401, 403)
    all_passed &= log_check("3.1 Staff Console Protected Against Unauthenticated Access", is_protected, f"HTTP Status: {unauth_status}")

    # Authenticated Staff Queue
    list_status, list_resp = http_req("GET", "/api/v1/admin/reports?limit=10", headers=STAFF_HEADERS)
    total_in_db = list_resp.get("total_count", len(list_resp.get("items", [])))
    list_ok = list_status == 200 and "items" in list_resp
    all_passed &= log_check("3.2 Staff Can View Incoming Reports Queue", list_ok, f"Total in DB: {total_in_db}")

    # Filter by District (URL-encode Thai text)
    encoded_district = urllib.parse.quote("กบินทร์บุรี")
    filt_status, filt_resp = http_req("GET", f"/api/v1/admin/reports?district={encoded_district}", headers=STAFF_HEADERS)
    filt_items = filt_resp.get("items", [])
    filt_ok = filt_status == 200 and isinstance(filt_items, list) and len(filt_items) >= 1
    all_passed &= log_check("3.3 Staff Can Filter Reports by District", filt_ok, f"Filtered Count: {len(filt_items)}")

    # ----------------------------------------------------
    # Step 4: Staff Review & Compare Telemetry Context
    # ----------------------------------------------------
    print("\n--- 4. Staff Review & Cross-Check Nearby Telemetry ---")
    det_status, det_resp = http_req("GET", f"/api/v1/admin/reports/{report_id}", headers=STAFF_HEADERS)
    det_ok = det_status == 200 and det_resp.get("id") == report_id
    all_passed &= log_check("4.1 Staff Detailed Report Inspection", det_ok, f"Category: {det_resp.get('category')}")

    ctx_status, ctx_resp = http_req("GET", f"/api/v1/admin/reports/{report_id}/context", headers=STAFF_HEADERS)
    ctx_ok = ctx_status == 200 and "primary_water_station" in ctx_resp and "primary_rain_station" in ctx_resp
    water_st = ctx_resp.get("primary_water_station", {})
    rain_st = ctx_resp.get("primary_rain_station", {})
    all_passed &= log_check("4.2 Compare Nearby Water/Rainfall Data", ctx_ok, f"Water: {water_st.get('name_th', 'N/A')} ({water_st.get('distance_km')}km), Rain: {rain_st.get('name_th', 'N/A')} ({rain_st.get('distance_km')}km)")

    # ----------------------------------------------------
    # Step 5: Staff Assigns Report
    # ----------------------------------------------------
    print("\n--- 5. Staff Assignment ---")
    assign_payload = {
        "assigned_to": "reviewer_prachin",
        "assignment_note": "มอบหมายให้ตรวจสอบสภาพน้ำและภาพถ่ายร่วมกับผู้นำชุมชนกบินทร์บุรี"
    }
    as_status, as_resp = http_req("POST", f"/api/v1/admin/reports/{report_id}/assign", data=assign_payload, headers=STAFF_HEADERS)
    as_ok = as_status == 200 and as_resp.get("assigned_to") == "reviewer_prachin"
    all_passed &= log_check("5.1 Staff Assigns Report to Officer", as_ok, f"Assigned To: {as_resp.get('assigned_to')}")

    # ----------------------------------------------------
    # Step 6: Staff Requests More Information
    # ----------------------------------------------------
    print("\n--- 6. Staff Requests More Information ---")
    info_payload = {
        "request_type": "UPLOAD_ANOTHER_PHOTO",
        "request_text": "รบกวนขอภาพถ่ายเพิ่มเติมบริเวณผิวน้ำที่มีการสะท้อนคราบเพื่อประกอบการตรวจสอบ"
    }
    info_status, info_resp = http_req("POST", f"/api/v1/admin/reports/{report_id}/request-info", data=info_payload, headers=STAFF_HEADERS)
    info_ok = info_status == 200 and info_resp.get("status") == "NEED_MORE_INFO"
    all_passed &= log_check("6.1 Staff Requests More Information", info_ok, f"Status: {info_resp.get('status')}")

    # Citizen tracking reflects status update without leaking internal notes
    t2_status, t2_resp = http_req("GET", f"/api/public/reports/track/{report_id}")
    t2_ok = t2_status == 200 and "ขอข้อมูลเพิ่มเติม" in t2_resp.get("public_status", "")
    all_passed &= log_check("6.2 Citizen Tracking Reflects NEED_MORE_INFO Safely", t2_ok, f"Citizen sees: {t2_resp.get('public_status')}")

    # ----------------------------------------------------
    # Step 7: Staff Records Structured Verification
    # ----------------------------------------------------
    print("\n--- 7. Staff Records Structured Verification ---")
    
    # 7.1 Verify guardrail: OFFICIAL_CONFIRMED without citation must fail
    fake_off_payload = {
        "verification_status": "OFFICIAL_CONFIRMED",
        "verification_method": "OFFICIAL_SOURCE",
        "what_was_reported": "น้ำมีกลิ่น",
        "what_was_observed": "ตรวจสอบพบจริง",
        "what_system_data_shows": "ระดับน้ำปกติ",
        "what_model_suggests": "เสี่ยงปานกลาง",
        "what_is_unknown": "สารเคมี",
        "what_should_be_verified": "ส่งตรวจแล็บ",
        "official_source_evidence": "" # Blank evidence must be rejected
    }
    rej_status, _ = http_req("POST", f"/api/v1/admin/reports/{report_id}/verify", data=fake_off_payload, headers=STAFF_HEADERS)
    guardrail_ok = rej_status == 400
    all_passed &= log_check("7.1 Uncertified Official Confirmation Rejected", guardrail_ok, f"Rejected with HTTP {rej_status}")

    # 7.2 Structured Verification as VERIFIED_OBSERVATION
    ver_payload = {
        "verification_status": "VERIFIED_OBSERVATION",
        "verification_method": "CROSS_CHECKED_SYSTEM_DATA",
        "notes": "ตรวจสอบข้อสังเกตเบื้องต้นตรงกับข้อมูลโทรมาตร",
        "what_was_reported": "พบเห็นน้ำในแม่น้ำหนุมานมีสีเขียวเข้มและมีกลิ่นฉุน",
        "what_was_observed": "ภาพถ่ายแสดงสีน้ำขุ่นเข้มผิดธรรมชาติ มีฟองตกค้างตามริมตลิ่ง",
        "what_system_data_shows": "สถานีโทรมาตร Kgt.19 ระดับน้ำปกติ 12.4m ปริมาณฝน 24h 0.0mm ไม่มีน้ำหลาก",
        "what_model_suggests": "แบบจำลองระบุความสำคัญในการเฝ้าระวังระดับปานกลาง (MODERATE)",
        "what_is_unknown": "ยังไม่ทราบชนิดของสารหรือค่า BOD/COD จนกว่าจะมีผลแล็บ",
        "what_should_be_verified": "ประสานศูนย์ควบคุมมลพิษจังหวัดปราจีนบุรีเก็บตัวอย่างน้ำวิเคราะห์",
        "official_source_evidence": None
    }
    ver_status, ver_resp = http_req("POST", f"/api/v1/admin/reports/{report_id}/verify", data=ver_payload, headers=STAFF_HEADERS)
    ver_ok = ver_status == 200 and ver_resp.get("status") == "VERIFIED_OBSERVATION"
    all_passed &= log_check("7.2 Staff Records VERIFIED_OBSERVATION", ver_ok, f"Status: {ver_resp.get('status')}")

    # ----------------------------------------------------
    # Step 8: Staff Escalates to External Response Team
    # ----------------------------------------------------
    print("\n--- 8. Operational Escalation ---")
    esc_payload = {
        "destination_team": "POLLUTION_CONTROL_CENTER_7",
        "escalation_reason": "พบคราบและกลิ่นผิดปกติในแม่น้ำหนุมาน ควรส่งทีมตรวจวัดคุณภาพน้ำภาคสนาม",
        "urgency": "HIGH",
        "evidence_summary": "ภาพถ่ายความขุ่นและพิกัดจุดสังเกตการณ์ กบินทร์บุรี"
    }
    esc_status, esc_resp = http_req("POST", f"/api/v1/admin/reports/{report_id}/escalate", data=esc_payload, headers=STAFF_HEADERS)
    esc_ok = esc_status == 200 and esc_resp.get("status") == "ESCALATED"
    all_passed &= log_check("8.1 Staff Escalates to Specialized Agency", esc_ok, f"Escalated to: {esc_resp.get('destination_team')}")

    # ----------------------------------------------------
    # Step 9: Staff Resolves Report
    # ----------------------------------------------------
    print("\n--- 9. Operational Resolution ---")
    res_payload = {
        "resolution_type": "VERIFIED_OBSERVATION",
        "resolution_summary": "บันทึกเป็นข้อสังเกตทางกายภาพที่ผ่านการตรวจสอบแล้ว และส่งต่อข้อมูลไปยังศูนย์สิ่งแวดล้อมเพื่อติดตามในรอบตรวจถัดไป"
    }
    res_status, res_resp = http_req("POST", f"/api/v1/admin/reports/{report_id}/resolve", data=res_payload, headers=STAFF_HEADERS)
    res_ok = res_status == 200 and res_resp.get("status") == "RESOLVED"
    all_passed &= log_check("9.1 Staff Resolves and Closes Report", res_ok, f"Status: {res_resp.get('status')}, Type: {res_resp.get('resolution_type')}")

    # ----------------------------------------------------
    # Step 10: Immutable Audit Log & Timeline
    # ----------------------------------------------------
    print("\n--- 10. Immutable Audit Timeline ---")
    tl_status, timeline = http_req("GET", f"/api/v1/admin/reports/{report_id}/timeline", headers=STAFF_HEADERS)
    tl_ok = tl_status == 200 and isinstance(timeline, list) and len(timeline) >= 4
    actions = [item.get("action") for item in (timeline if isinstance(timeline, list) else [])]
    all_passed &= log_check("10.1 Complete Audit History Tracked", tl_ok, f"Actions recorded ({len(actions)}): {actions}")

    # ----------------------------------------------------
    # Step 11: Final Public Boundary & Privacy Check
    # ----------------------------------------------------
    print("\n--- 11. Final Public Boundary & Privacy Check ---")
    final_track_st, final_track = http_req("GET", f"/api/public/reports/track/{report_id}")
    has_resolved = final_track.get("public_status") == "ปิดเรื่อง"
    leaked_keys = [k for k in ["internal_notes", "actor_id", "audit_log", "exact_latitude", "exact_longitude", "reporter_phone", "reporter_email", "reporter_name", "triage_flags", "triage_notes", "admin_notes"] if k in final_track]
    no_leak = len(leaked_keys) == 0
    all_passed &= log_check("11.1 Final Tracking Closed Safely", has_resolved and no_leak, f"Citizen sees: '{final_track.get('public_status')}', Zero privacy leak (leaked={leaked_keys})")

    print("\n" + "=" * 84)
    if all_passed:
        print("🎉 CITIZEN REPORTING & STAFF OPERATIONS WORKFLOW FULLY VERIFIED!")
        print("Every step from Citizen Submission to Staff Resolution & Audit is functional.")
        print("=" * 84)
        return 0
    else:
        print("❌ SOME WORKFLOW CHECKS FAILED! Please review output above.")
        print("=" * 84)
        return 1

if __name__ == "__main__":
    sys.exit(main())
