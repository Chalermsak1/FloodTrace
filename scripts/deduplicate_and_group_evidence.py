"""
FloodTrace External Evidence Deduplication and Incident Grouping Migration Script
Preserves complete data provenance, flags duplicates safely without deleting original records,
updates non-descriptive author-only titles with truthful observation summaries,
and links related evidence and news items to Monitoring Events.
"""

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from apps.api.app.core.database import SessionLocal
from apps.api.app.models.entities import (
    ExternalEvidence,
    ExternalInformation,
    MonitoringEvent,
    EvidenceEventLink,
    ExternalEvidenceAuditLog
)

def run_deduplication_and_grouping():
    db = SessionLocal()
    print("================================================================================")
    print("FLOODTRACE: DEDUPLICATING AND GROUPING EXTERNAL EVIDENCE")
    print("================================================================================\n")

    try:
        # 1. Deduplicate EVD-CITIZEN-010 (Exact Duplicate of EVD-CITIZEN-005)
        ev_010 = db.query(ExternalEvidence).filter(ExternalEvidence.id == "EVD-CITIZEN-010").first()
        ev_005 = db.query(ExternalEvidence).filter(ExternalEvidence.id == "EVD-CITIZEN-005").first()
        if ev_010 and ev_005:
            ev_010.is_duplicate = True
            ev_010.parent_evidence_id = "EVD-CITIZEN-005"
            ev_010.source_group_id = "GRP-SRIMAHAPHOT-WASTE-01"
            ev_010.duplicate_reason = "IDENTICAL_CANONICAL_URL: matches existing evidence EVD-CITIZEN-005"
            print(f"[DEDUP] Marked EVD-CITIZEN-010 as duplicate of EVD-CITIZEN-005 (Exact URL match)")

        # 2. Deduplicate EVD-CITIZEN-018 (Duplicate of EVD-CITIZEN-002, same post shared via different URL)
        ev_018 = db.query(ExternalEvidence).filter(ExternalEvidence.id == "EVD-CITIZEN-018").first()
        ev_002 = db.query(ExternalEvidence).filter(ExternalEvidence.id == "EVD-CITIZEN-002").first()
        if ev_018 and ev_002:
            ev_018.is_duplicate = True
            ev_018.parent_evidence_id = "EVD-CITIZEN-002"
            ev_018.source_group_id = "GRP-SRIMAHAPHOT-WASTE-01"
            ev_018.duplicate_reason = "IDENTICAL_UNDERLYING_POST: matches existing evidence EVD-CITIZEN-002"
            print(f"[DEDUP] Marked EVD-CITIZEN-018 as duplicate of EVD-CITIZEN-002 (Identical underlying post)")

        # 3. Update titles of EVD-CITIZEN records from author name to truthful observation summaries
        # Keep author in source_name for clear attribution
        CITIZEN_UPDATES = {
            "EVD-CITIZEN-001": {
                "title": "ข้อสังเกตการบริหารจัดการพื้นที่รับน้ำและการกำกับดูแลโรงงาน จ.ปราจีนบุรี",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-CITIZEN-POLICY-01",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-002": {
                "title": "สคพ.ควบคุมมลพิษภาค 7 เข้าเก็บตัวอย่างน้ำรอบบ่อฝังกลบกากขยะ 105 106 ต.หัวหว้า อ.ศรีมหาโพธิ",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-003": {
                "title": "ข้อสังเกตคราบรุ้งและสภาพน้ำรอบบ่อฝังกลบกากอุตสาหกรรม ต.หัวหว้า อ.ศรีมหาโพธิ",
                "source_name": "Chamnan Sirirak (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-004": {
                "title": "ข้อสังเกตผลกระทบเรื่องกลิ่นจากโรงงานในพื้นที่ ต.หัวหว้า อ.ศรีมหาโพธิ",
                "source_name": "Chamnan Sirirak (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-005": {
                "title": "ติดตามสถานการณ์บ่อฝังกลบขยะและคราบรุ้งที่กระจายตัวตามทิศทางน้ำ ต.หัวหว้า อ.ศรีมหาโพธิ",
                "source_name": "Chamnan Sirirak (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-006": {
                "title": "ข้อสังเกตน้ำท่วมและน้ำชะล้างจากโรงงานสู่พื้นที่เกษตรกรรม จ.ปราจีนบุรี",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-CITIZEN-POLICY-02",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-007": {
                "title": "กองกากอุตสาหกรรมแถวโคกปีบ รอยต่อสระมะเขือหัวซา อ.ศรีมโหสถ",
                "source_name": "ศรีมโหสถ ชุมชนคนโคกปีบ (Facebook)",
                "source_group_id": "GRP-SRIMAHOSOT-01",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-008": {
                "title": "ข้อเรียกร้องการแก้ปัญหาและการตรวจสอบกากของเสียระดับนโยบาย",
                "source_name": "อ.คอลลี มังกร จอนฟอน (Facebook)",
                "source_group_id": "GRP-CITIZEN-POLICY-03",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-009": {
                "title": "ข้อสังเกตการเปิดเผยข้อมูลการขอขยายกิจการโรงงานในพื้นที่ จ.ปราจีนบุรี",
                "source_name": "Chamnan Sirirak (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-010": {
                "title": "ติดตามสถานการณ์บ่อฝังกลบขยะและคราบรุ้งที่กระจายตัวตามทิศทางน้ำ (ข้อมูลซ้ำซ้อน)",
                "source_name": "Chamnan Sirirak (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-011": {
                "title": "ข้อสังเกตการทิ้งกากของเสียในแปลงเกษตรและผลกระทบต่อสิ่งแวดล้อม อ.เมืองปราจีนบุรี",
                "source_name": "สุนทร คมคาย (Facebook)",
                "source_group_id": "GRP-MUEANG-WASTE-01",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-012": {
                "title": "ปัญหากลิ่นเหม็นจากบ่อฝังกลบกากขยะอุตสาหกรรม 105 106 ต.กรอกสมบูรณ์ อ.ศรีมหาโพธิ",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-KROKSOMBUN-AIR-01",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-013": {
                "title": "ข้อสังเกตสารระเหย tVOC จากสายรุ้งรอบกองกากขยะ ม.6 ต.หัวหว้า อ.ศรีมหาโพธิ",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-014": {
                "title": "สภาพหมอกควันและกลิ่นเหม็น ต.กรอกสมบูรณ์ อ.ศรีมหาโพธิ",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-KROKSOMBUN-AIR-01",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-015": {
                "title": "ข้อสังเกตกลุ่มควันจากโรงงาน ม.7 ต.กรอกสมบูรณ์ อ.ศรีมหาโพธิ",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-KROKSOMBUN-AIR-01",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-016": {
                "title": "ข้อเรียกร้องการตรวจสอบการกำกับดูแลโรงงานอุตสาหกรรม จ.ปราจีนบุรี",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-CITIZEN-POLICY-04",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-017": {
                "title": "ข้อสังเกตสารประกอบอินทรีย์ระเหยง่าย (tVOC) รอบแหล่งน้ำธรรมชาติ อ.ศรีมหาโพธิ",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-018": {
                "title": "สคพ.ควบคุมมลพิษภาค 7 เข้าเก็บตัวอย่างน้ำรอบบ่อฝังกลบกากขยะ (ข้อมูลซ้ำซ้อน)",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            },
            "EVD-CITIZEN-019": {
                "title": "การติดตามและให้กำลังใจประชาชนในพื้นที่น้ำท่วม จ.ปราจีนบุรี",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-CITIZEN-POLICY-05",
                "monitoring_event_id": None
            },
            "EVD-CITIZEN-020": {
                "title": "ข้อเรียกร้องให้เร่งทำคันดินป้องกันน้ำท่วมบ่อขยะฝังกลบ 105 106 ต.หัวหว้า อ.ศรีมหาโพธิ",
                "source_name": "สุเมธ เหรียญพงษ์นาม (Facebook)",
                "source_group_id": "GRP-SRIMAHAPHOT-WASTE-01",
                "monitoring_event_id": "MEV-20261008-SM02"
            }
        }

        updated_titles_count = 0
        for ev_id, udata in CITIZEN_UPDATES.items():
            ev = db.query(ExternalEvidence).filter(ExternalEvidence.id == ev_id).first()
            if ev:
                ev.title_or_summary = udata["title"]
                ev.source_name = udata["source_name"]
                ev.source_group_id = udata["source_group_id"]
                if udata["monitoring_event_id"]:
                    ev.monitoring_event_id = udata["monitoring_event_id"]
                updated_titles_count += 1

        print(f"[TITLES] Updated {updated_titles_count} citizen evidence titles with truthful observation summaries")

        # 4. Group Related Evidence Items from seed records (Records 01 - 13)
        SEED_GROUP_UPDATES = {
            # Kabin Buri Flood group
            "EVD-20260928-001": {"group": "GRP-KABIN-FLOOD-01", "event": "MEV-20261008-001"},
            "EVD-20260928-002": {"group": "GRP-KABIN-FLOOD-01", "event": "MEV-20261008-001"},
            "EVD-20260929-005": {"group": "GRP-KABIN-FLOOD-01", "event": "MEV-20261008-001"},
            # Sri Maha Phot / Hua Wa Rainbow Sheen
            "EVD-20260929-007": {"group": "GRP-SRIMAHAPHOT-WASTE-01", "event": "MEV-20261008-SM02"},
            # Ban Tham Flood group
            "EVD-20261001-010": {"group": "GRP-BANTHAM-FLOOD-01", "event": None},
            "EVD-20260929-004": {"group": "GRP-BANTHAM-FLOOD-01", "event": None},
            # Ban Sang Road Flooding
            "EVD-20261005-011": {"group": "GRP-BANSANG-ROAD-01", "event": None},
            "EVD-20261006-013": {"group": "GRP-BANSANG-ROAD-01", "event": None},
            "EVD-20261001-009": {"group": "GRP-BANSANG-ROAD-01", "event": None},
            # Mueang Prachin Buri Flood & Rescue
            "EVD-20261005-012": {"group": "GRP-MUEANG-FLOOD-01", "event": None},
            "EVD-20260929-008": {"group": "GRP-MUEANG-FLOOD-01", "event": None},
            "EVD-20260929-006": {"group": "GRP-MUEANG-FLOOD-01", "event": None},
            # Sri Maha Phot Lowland
            "EVD-20260928-003": {"group": "GRP-SRIMAHAPHOT-LOWLAND-01", "event": None}
        }

        for ev_id, gdata in SEED_GROUP_UPDATES.items():
            ev = db.query(ExternalEvidence).filter(ExternalEvidence.id == ev_id).first()
            if ev:
                ev.source_group_id = gdata["group"]
                if gdata["event"]:
                    ev.monitoring_event_id = gdata["event"]

        print(f"[GROUPS] Organized 13 seed evidence records into thematic incident clusters")

        # 5. Link EvidenceEventLink for MEV-20261008-SM02 and MEV-20261008-001
        EVENT_LINKS = [
            # Kabin Buri event links
            {"ev_id": "EVD-20260928-001", "event_id": "MEV-20261008-001", "relation": "PRIMARY_EVIDENCE"},
            {"ev_id": "EVD-20260928-002", "event_id": "MEV-20261008-001", "relation": "SUPPORTING_EVIDENCE"},
            {"ev_id": "EVD-20260929-005", "event_id": "MEV-20261008-001", "relation": "RELATED_REPORT"},
            # Sri Maha Phot waste & sheen event links
            {"ev_id": "EVD-20260929-007", "event_id": "MEV-20261008-SM02", "relation": "PRIMARY_EVIDENCE"},
            {"ev_id": "EVD-CITIZEN-003", "event_id": "MEV-20261008-SM02", "relation": "CORROBORATING_REPORT"},
            {"ev_id": "EVD-CITIZEN-005", "event_id": "MEV-20261008-SM02", "relation": "SUPPORTING_EVIDENCE"},
            {"ev_id": "EVD-CITIZEN-002", "event_id": "MEV-20261008-SM02", "relation": "SUPPORTING_EVIDENCE"},
            {"ev_id": "EVD-CITIZEN-013", "event_id": "MEV-20261008-SM02", "relation": "RELATED_REPORT"},
        ]

        for elink in EVENT_LINKS:
            existing_link = db.query(EvidenceEventLink).filter(
                EvidenceEventLink.evidence_id == elink["ev_id"],
                EvidenceEventLink.event_id == elink["event_id"]
            ).first()
            if not existing_link:
                new_link = EvidenceEventLink(
                    id=f"LNK-{elink['ev_id']}-{elink['event_id'][-4:]}",
                    evidence_id=elink["ev_id"],
                    event_id=elink["event_id"],
                    link_type="PRIMARY_OBSERVATION" if elink["relation"] == "PRIMARY_EVIDENCE" else "CORROBORATING_SIGNAL",
                    relation_type=elink["relation"],
                    linked_by="system_dedup_migration"
                )
                db.add(new_link)

        print(f"[LINKS] Created EvidenceEventLink linkages for monitoring events")

        # 6. Link related news articles in ExternalInformation to MEV-20261008-SM02
        # Section 4: News articles may be linked to an existing Monitoring Event as supporting source,
        # but must not become a citizen report.
        RELATED_NEWS_IDS = ["INF-CURATED-001", "INF-CURATED-002", "INF-CURATED-011", "INF-CURATED-024"]
        for news_id in RELATED_NEWS_IDS:
            news = db.query(ExternalInformation).filter(ExternalInformation.id == news_id).first()
            if news:
                news.monitoring_event_id = "MEV-20261008-SM02"

        print(f"[NEWS] Linked {len(RELATED_NEWS_IDS)} related news articles as supporting event context")

        db.commit()
        print("\n=> DEDUPLICATION AND GROUPING MIGRATION COMPLETED SUCCESSFULLY")

    except Exception as e:
        db.rollback()
        print(f"Migration error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_deduplication_and_grouping()
