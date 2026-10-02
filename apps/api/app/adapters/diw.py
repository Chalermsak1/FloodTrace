import json
import os
import logging
from typing import List, Dict, Any
from apps.api.app.core.provenance import make_provenance, DataCategory, VerificationStatus

from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
from apps.api.app.core.config import settings

logger = logging.getLogger(__name__)
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "prachinburi_industrial_waste_diw.json")

def load_diw_facilities() -> List[Dict[str, Any]]:
    """
    Loads verified DIW registered industrial waste processing/treatment plants (Types 101, 105, 106)
    in Prachin Buri province.
    Audited: Evaluates source access authorization under Master Prompt Section 2 & 7.
    """
    access_eval = evaluate_source_access(
        "diw_industrial_waste",
        credential_override=settings.DIW_AUTHORIZED_CREDENTIAL,
        enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION
    )
    if access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
        logger.warning(
            f"DIW ingestion BLOCKED by Source Access Decision Engine: {access_eval.current_status}. "
            f"Private authorized credential required under production rule."
        )
        return []

    resolved_path = os.path.abspath(DATA_PATH)
    if not os.path.exists(resolved_path):
        logger.error(f"DIW dataset not found at {resolved_path}")
        return []
        
    with open(resolved_path, "r", encoding="utf-8") as f:
        facilities = json.load(f)

    # Ensure access governance fields in facility provenance
    for f in facilities:
        if "provenance" in f and isinstance(f["provenance"], dict):
            f["provenance"]["access_method"] = access_eval.access_method
            f["provenance"]["authorization_status"] = access_eval.authorization_status.value
            f["provenance"]["license"] = access_eval.license
            f["provenance"]["license_url"] = access_eval.license_url
            f["provenance"]["raw_storage_allowed"] = access_eval.raw_storage_allowed
            f["provenance"]["derived_output_allowed"] = access_eval.derived_output_allowed
            f["provenance"]["redistribution_allowed"] = access_eval.redistribution_allowed
        
    logger.info(f"Loaded {len(facilities)} official DIW facilities from {resolved_path} (Access: {access_eval.authorization_status.value})")
    return facilities
