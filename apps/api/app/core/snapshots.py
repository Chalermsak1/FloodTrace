"""
FloodTrace Prachin Buri Snapshot Loader & Data Synchronizer
Loads verified external information, external evidence, and monitoring event snapshots.
Ensures identical high-fidelity real data across local development, testing, and cloud environments (Render Free Tier).
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from apps.api.app.models.entities import (
    ExternalInformation,
    ExternalEvidence,
    ExternalEvidenceMedia,
    MonitoringEvent,
    EvidenceEventLink
)

logger = logging.getLogger(__name__)

def _resolve_data_path(filename: str) -> Optional[str]:
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../data", filename)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data", filename)),
        os.path.abspath(os.path.join("data", filename)),
        os.path.abspath(os.path.join("/opt/render/project/src/data", filename))
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def seed_external_evidence_snapshot(db: Session) -> int:
    """
    Seeds verified external evidence, media, and linked monitoring events from snapshot.
    Idempotent: uses db.merge so existing records are updated rather than duplicated.
    """
    path = _resolve_data_path("prachinburi_external_evidence_snapshot.json")
    if not path:
        logger.warning("External evidence snapshot file not found.")
        return 0

    try:
        with open(path, "r", encoding="utf-8") as f:
            bundle = json.load(f)

        # 1. Seed / update Monitoring Events
        for ev_data in bundle.get("monitoring_events", []):
            item_copy = dict(ev_data)
            for k in ["start_time", "end_time", "created_at", "updated_at"]:
                if item_copy.get(k) and isinstance(item_copy[k], str):
                    try:
                        item_copy[k] = datetime.fromisoformat(item_copy[k])
                    except Exception:
                        pass
            m_ev = MonitoringEvent(**item_copy)
            db.merge(m_ev)
        db.flush()

        # 2. Seed / update External Evidence
        count = 0
        for item in bundle.get("external_evidence", []):
            item_copy = dict(item)
            for k in ["published_at", "observed_at", "retrieved_at", "reviewed_at", "created_at", "updated_at"]:
                if item_copy.get(k) and isinstance(item_copy[k], str):
                    try:
                        item_copy[k] = datetime.fromisoformat(item_copy[k])
                    except Exception:
                        pass
            ev = ExternalEvidence(**item_copy)
            db.merge(ev)
            count += 1
        db.flush()

        # 3. Seed / update Media
        for m_item in bundle.get("external_evidence_media", []):
            item_copy = dict(m_item)
            for k in ["captured_at", "created_at"]:
                if item_copy.get(k) and isinstance(item_copy[k], str):
                    try:
                        item_copy[k] = datetime.fromisoformat(item_copy[k])
                    except Exception:
                        pass
            med = ExternalEvidenceMedia(**item_copy)
            db.merge(med)

        # 4. Ensure EvidenceEventLink for primary event if exists
        mev_001 = db.query(MonitoringEvent).filter(MonitoringEvent.id == "MEV-20261008-001").first()
        if mev_001:
            existing_link = db.query(EvidenceEventLink).filter(
                EvidenceEventLink.evidence_id == "EVD-20260928-001",
                EvidenceEventLink.event_id == mev_001.id
            ).first()
            if not existing_link:
                link = EvidenceEventLink(
                    id="LNK-20260928-001",
                    evidence_id="EVD-20260928-001",
                    event_id=mev_001.id,
                    link_type="PRIMARY_OBSERVATION",
                    relation_type="PRIMARY_EVIDENCE",
                    relevance_score=1.0,
                    linked_by="reviewer_provenance"
                )
                db.add(link)

        db.commit()
        logger.info(f"Successfully synced {count} external evidence items from snapshot.")
        return count
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed external evidence snapshot: {e}", exc_info=True)
        return 0


def seed_external_information_snapshot(db: Session) -> int:
    """
    Seeds verified external information / news items from snapshot.
    Idempotent: uses db.merge so existing records are updated rather than duplicated.
    """
    path = _resolve_data_path("prachinburi_external_information_snapshot.json")
    if not path:
        logger.warning("External information snapshot file not found.")
        return 0

    try:
        with open(path, "r", encoding="utf-8") as f:
            infos = json.load(f)

        count = 0
        for item in infos:
            item_copy = dict(item)
            for k in ["published_at", "observed_at", "retrieved_at", "source_image_fetched_at", "created_at", "updated_at"]:
                if item_copy.get(k) and isinstance(item_copy[k], str):
                    try:
                        item_copy[k] = datetime.fromisoformat(item_copy[k])
                    except Exception:
                        pass
            info_obj = ExternalInformation(**item_copy)
            db.merge(info_obj)
            count += 1

        db.commit()
        logger.info(f"Successfully synced {count} external information items from snapshot.")
        return count
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed external information snapshot: {e}", exc_info=True)
        return 0
