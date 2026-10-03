#!/usr/bin/env python3
"""
FloodTrace Test Data Quarantine and Safe Purge Manager
Master Prompt Section 8: Safe data-management mechanism with explicit safeguards.
"""

import os
import sys
import argparse
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from apps.api.app.core.database import SessionLocal
from apps.api.app.models.entities import CitizenReport, CitizenReportAuditLog

TEST_REPORTERS = [
    "somchai test",
    "citizen idempotency test",
    "classified whistleblower 99",
    "citizen observation"
]

def classify_report(r: CitizenReport) -> str:
    rep = (r.reporter_name or "").lower()
    desc = (r.description or "").lower()
    role = (r.reporter_role or "").upper()
    
    if "somchai" in rep or "idemp" in rep or "idemp" in desc:
        return "AUTOMATED_TEST_FIXTURE"
    elif "whistleblower" in rep or role == "WHISTLEBLOWER":
        return "WHISTLEBLOWER_MOCK"
    elif rep == "citizen observation" or role == "TEST/DEMO":
        return "TEST_DEMO"
    elif (
        "ตรวจสอบความพร้อม" in desc
        or "audit" in desc
        or "ทดสอบ" in desc
        or "audit" in rep
        or "production_audit_test" in desc
        or "production_audit_test" in rep
        or rep == "citizen_public"
        or "พบเห็นน้ำมีสีดำคล้ำผิดปกติตอนช่วงเช้า" in desc
        or "พบเห็นน้ำในแม่น้ำหนุมาน" in desc
        or "chemical discharge observation" in desc
        or "noticeable color change near irrigation canal" in desc
    ):
        return "AUDIT_SUBMISSION"
    return "PRODUCTION_REAL"


def analyze_records(db):
    reports = db.query(CitizenReport).all()
    breakdown = {
        "AUTOMATED_TEST_FIXTURE": [],
        "WHISTLEBLOWER_MOCK": [],
        "TEST_DEMO": [],
        "AUDIT_SUBMISSION": [],
        "PRODUCTION_REAL": []
    }
    for r in reports:
        cat = classify_report(r)
        breakdown[cat].append(r)
    return breakdown

def main():
    parser = argparse.ArgumentParser(description="FloodTrace Test Data Quarantine & Safe Purge Manager")
    parser.add_argument("--status", action="store_true", help="Display current dataset classification breakdown")
    parser.add_argument("--quarantine", action="store_true", help="Quarantine all non-production reports (sets publication_state=WITHHELD)")
    parser.add_argument("--purge", action="store_true", help="Purge non-production test/mock reports")
    parser.add_argument("--confirm-irreversible-delete", action="store_true", help="Explicit confirmation flag required for irreversible purge")
    parser.add_argument("--target-class", choices=["AUTOMATED_TEST_FIXTURE", "WHISTLEBLOWER_MOCK", "TEST_DEMO", "AUDIT_SUBMISSION", "ALL_NON_PROD"],
                        default="ALL_NON_PROD", help="Target classification to quarantine or purge")

    args = parser.parse_args()

    with SessionLocal() as db:
        breakdown = analyze_records(db)
        total = sum(len(v) for v in breakdown.values())

        print("================================================================================")
        print("FLOODTRACE CITIZEN REPORTS DATA INVENTORY")
        print("================================================================================")
        print(f"Total Records in Database: {total}\n")
        print(f"  [1] AUTOMATED_TEST_FIXTURE: {len(breakdown['AUTOMATED_TEST_FIXTURE'])} records")
        print(f"  [2] WHISTLEBLOWER_MOCK:     {len(breakdown['WHISTLEBLOWER_MOCK'])} records")
        print(f"  [3] TEST_DEMO:              {len(breakdown['TEST_DEMO'])} records")
        print(f"  [4] AUDIT_SUBMISSION:       {len(breakdown['AUDIT_SUBMISSION'])} records")
        print(f"  -------------------------------------------------------------")
        print(f"  [5] PRODUCTION_REAL:        {len(breakdown['PRODUCTION_REAL'])} records (REAL PUBLIC OBSERVATIONS)")
        print("================================================================================\n")

        if args.status or (not args.quarantine and not args.purge):
            print("Status mode complete. No database modifications made.")
            return

        # Determine target list
        targets = []
        if args.target_class == "ALL_NON_PROD":
            for k in ["AUTOMATED_TEST_FIXTURE", "WHISTLEBLOWER_MOCK", "TEST_DEMO", "AUDIT_SUBMISSION"]:
                targets.extend(breakdown[k])
        else:
            targets = breakdown[args.target_class]

        print(f"Selected target: {args.target_class} ({len(targets)} records)")

        if args.quarantine:
            print(f"\n[ACTION: QUARANTINE] Marking {len(targets)} records as WITHHELD / FLAGGED...")
            for r in targets:
                r.publication_state = "WITHHELD"
                r.triage_status = "FLAGGED"
                r.status = "SPAM"
            db.commit()
            print(f"✓ Successfully quarantined {len(targets)} records. They will not appear in public feeds or analytics.")
            return

        if args.purge:
            if not args.confirm_irreversible_delete:
                print("\n❌ SAFEGUARD ERROR: --purge requires explicit confirmation flag --confirm-irreversible-delete.")
                print(f"Aborting without modifying {len(targets)} records.")
                sys.exit(1)

            print(f"\n[ACTION: IRREVERSIBLE PURGE] Deleting {len(targets)} records...")
            target_ids = [r.id for r in targets]
            
            # Remove related audit logs first to preserve FK integrity
            deleted_logs = db.query(CitizenReportAuditLog).filter(CitizenReportAuditLog.report_id.in_(target_ids)).delete(synchronize_session=False)
            deleted_reports = db.query(CitizenReport).filter(CitizenReport.id.in_(target_ids)).delete(synchronize_session=False)
            db.commit()
            print(f"✓ Purge completed: Removed {deleted_reports} report rows and {deleted_logs} related audit logs.")
            print(f"✓ Remaining database records: {db.query(CitizenReport).count()} rows.")

if __name__ == "__main__":
    main()
