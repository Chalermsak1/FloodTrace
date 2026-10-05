from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import os
from pathlib import Path

class AccessAuthorizationStatus(str, Enum):
    PRIVATE_AUTHORIZED = "PRIVATE_AUTHORIZED"       # Private authenticated channel verified with project credential/MOU
    PRIVATE_PENDING = "PRIVATE_PENDING"             # Private access requested from agency, pending approval
    PUBLIC_ONLY = "PUBLIC_ONLY"                     # Public/open dataset or endpoint without private authorized channel
    UNKNOWN_ACCESS = "UNKNOWN_ACCESS"               # Access model or project authorization cannot be verified
    ACCESS_REQUIRED = "ACCESS_REQUIRED"             # Explicit project-issued private authorization or MOU required
    UNAVAILABLE = "UNAVAILABLE"                     # Upstream service offline or unresponsive
    LICENSE_REVIEW_REQUIRED = "LICENSE_REVIEW_REQUIRED" # Licensing unclear regarding storage or derived output

class IngestionAction(str, Enum):
    ALLOW_PRODUCTION_INGESTION = "ALLOW_PRODUCTION_INGESTION"   # Permitted for production factual pipeline
    BLOCK_PRODUCTION_INGESTION = "BLOCK_PRODUCTION_INGESTION"   # Blocked from production factual pipeline
    DISCOVERY_AND_PLANNING_ONLY = "DISCOVERY_AND_PLANNING_ONLY" # Schema/source discovery only; never factual input
    FAIL_CLOSED_NO_DATA = "FAIL_CLOSED_NO_DATA"                 # Return ACCESS_REQUIRED / NO_DATA

class SourceClassification(str, Enum):
    LIVE = "LIVE"
    HIGH_FREQUENCY = "HIGH_FREQUENCY"
    DAILY = "DAILY"
    PERIODIC = "PERIODIC"
    HISTORICAL = "HISTORICAL"
    STATIC_REFERENCE = "STATIC_REFERENCE"
    FORECAST = "FORECAST"

class SourceAccessRecord(BaseModel):
    source_id: str
    source_name: str
    organization: str
    dataset: str
    purpose: str
    access_method: str
    authentication: str
    private_or_public: str  # "PRIVATE" or "PUBLIC"
    authorization_status: AccessAuthorizationStatus
    ingestion_action: IngestionAction
    license: str
    license_url: Optional[str] = None
    redistribution_allowed: bool
    raw_storage_allowed: bool
    derived_output_allowed: bool
    update_frequency: str
    source_classification: SourceClassification = SourceClassification.STATIC_REFERENCE
    freshness_threshold_hours: Optional[float] = None
    coverage: str
    current_status: str
    verification_date: str
    required_credential_env: Optional[str] = None
    credential_present: bool = False
    verified_license_for_production: bool = False
    production_eligible: bool = False
    real_endpoint: Optional[str] = None
    notes: str

# Official Registry of Candidate External Sources (Master Prompt Section 6)
CANDIDATE_SOURCES_REGISTRY: Dict[str, Dict[str, Any]] = {
    # 6.1 Current Flood Extent
    "gistda_disaster": {
        "source_id": "gistda_disaster",
        "source_name": "GISTDA Disaster Platform",
        "organization": "Geo-Informatics and Space Technology Development Agency (GISTDA)",
        "dataset": "Satellite-Observed Flood Extent (RADARSAT-2 / Sentinel-1 / THEOS)",
        "purpose": "Current flood extent delineation and spatial intersection with exposure zones",
        "access_method": "API Key + WMS/WMTS/JSON REST Service",
        "authentication": "API Key issued by GISTDA Disaster Platform",
        "private_or_public": "PRIVATE",
        "default_authorization_status": AccessAuthorizationStatus.PRIVATE_PENDING,
        "license": "GISTDA Terms of Service (Project Data-Sharing Agreement Required)",
        "license_url": "https://disaster.gistda.or.th",
        "redistribution_allowed": False,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Per satellite pass (1-3 daily during flood events)",
        "source_classification": SourceClassification.PERIODIC,
        "freshness_threshold_hours": 48.0,
        "coverage": "Prachin Buri Province & Bang Pakong Basin",
        "required_credential_env": "GISTDA_API_KEY",
        "verified_license_for_production": False,
        "real_endpoint": "https://disaster.gistda.or.th",
        "notes": "Candidate source. API Key issuance and terms verification required. If only open/public WMS is accessible without private key, must mark PUBLIC_ONLY."
    },
    # 6.2 Water Level / Runoff (Master Prompt Sec. 6.2: ThaiWater / HII / RID)
    "thaiwater_rid_runoff": {
        "source_id": "thaiwater_rid_runoff",
        "source_name": "ThaiWater & RID Water Level / Runoff Telemetry",
        "organization": "Hydro-Informatics Institute (HII) & Royal Irrigation Department (RID)",
        "dataset": "National Telemetry Water Level & Dam Monitoring Systems",
        "purpose": "River stage monitoring, water-level trend detection, upstream/downstream state",
        "access_method": "REST API v3 / Runoff API / Public Reservoir Portal",
        "authentication": "Institutional Project Token / Private Credential Required",
        "private_or_public": "PUBLIC",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY,
        "license": "Open Government License Thailand (OGL-TH) / RID Specifications",
        "license_url": "https://www.thaiwater.net",
        "redistribution_allowed": True,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Hourly automated acoustic/pressure sensor transmission",
        "source_classification": SourceClassification.HIGH_FREQUENCY,
        "freshness_threshold_hours": 3.0,
        "coverage": "14 automated river stations and 6 reservoirs in Prachin Buri Basin",
        "required_credential_env": "THAIWATER_API_KEY",
        "verified_license_for_production": True,
        "real_endpoint": "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load",
        "notes": "Public open data endpoints available under OGL-TH. Active water level telemetry for Prachin Buri stations available. Ingestion allowed under verified official public license policy."
    },
    # 6.3 Current Rainfall
    "thaiwater_rainfall": {
        "source_id": "thaiwater_rainfall",
        "source_name": "ThaiWater Automatic Weather Stations (Rainfall)",
        "organization": "Hydro-Informatics Institute (HII)",
        "dataset": "Automated Ground Weather Station Precipitation Network",
        "purpose": "Current meteorological situation, short-term flood trend",
        "access_method": "REST API / Automated Telemetry Stream",
        "authentication": "Project Bearer Token / Institutional API Key",
        "private_or_public": "PUBLIC",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY,
        "license": "OGL-TH / HII Terms",
        "license_url": "https://api-v3.thaiwater.net",
        "redistribution_allowed": True,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Every 15 minutes",
        "source_classification": SourceClassification.HIGH_FREQUENCY,
        "freshness_threshold_hours": 3.0,
        "coverage": "Prachin Buri automated rain gauges",
        "required_credential_env": "THAIWATER_API_KEY",
        "verified_license_for_production": True,
        "real_endpoint": "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h",
        "notes": "Public open data endpoint under OGL-TH. 78 rain stations inside Prachin Buri bounding box active."
    },
    # 6.4 Weather Forecast
    "tmd_forecast": {
        "source_id": "tmd_forecast",
        "source_name": "TMD Weather Forecast Service",
        "organization": "Thai Meteorological Department (TMD), Ministry of Digital Economy and Society",
        "dataset": "Numerical Weather Prediction & Daily Provincial Weather Forecast",
        "purpose": "7-day precipitation forecast, atmospheric watch zone delineation",
        "access_method": "TMD Open API / Data API Service",
        "authentication": "TMD Developer API Key / Project Access Token",
        "private_or_public": "PUBLIC",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY,
        "license": "TMD Open Data License / Terms of Service",
        "license_url": "https://data.tmd.go.th/api",
        "redistribution_allowed": True,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "4 times daily (00, 06, 12, 18 UTC)",
        "source_classification": SourceClassification.FORECAST,
        "freshness_threshold_hours": 24.0,
        "coverage": "Prachin Buri meteorological grid nodes",
        "required_credential_env": "TMD_API_KEY",
        "verified_license_for_production": False,
        "real_endpoint": "https://data.tmd.go.th/api",
        "notes": "TMD Open API is public/open. Verify whether an authenticated/private institutional channel exists. Do not substitute unauthorized providers."
    },
    # 6.5 Rivers / Canals / Waterways
    "dwr_waterways": {
        "source_id": "dwr_waterways",
        "source_name": "Official River Basin Hydrological Network",
        "organization": "Department of Water Resources (DWR) / ONWR / RID",
        "dataset": "Prachin Buri River Basin Hydrologic Network Atlas (FGDS)",
        "purpose": "Water-network graph, upstream/downstream topological connectivity",
        "access_method": "GIS Service / Verified Shapefile / GeoJSON Vector Reach",
        "authentication": "Public Government Open Data Download / FGDS Portal",
        "private_or_public": "PUBLIC",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY, # Official public hydrographic dataset
        "license": "Official Thai Government Hydrographic Survey (RID/DWR)",
        "license_url": "https://www.rid.go.th",
        "redistribution_allowed": True,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Static official surveyed geometry (Updated per hydrographic cycle)",
        "source_classification": SourceClassification.STATIC_REFERENCE,
        "freshness_threshold_hours": 8760.0,
        "coverage": "Hanuman River, Phra Prong River, Prachin Buri Main Stem, Khlong Krater",
        "required_credential_env": None,
        "verified_license_for_production": True,
        "real_endpoint": "https://www.dwr.go.th",
        "notes": "Official surveyed river centerlines published publicly under Open Government License. Derivative topological graphs permitted."
    },
    # 6.6 DEM / Terrain
    "official_dem": {
        "source_id": "official_dem",
        "source_name": "Official Government Topographic DEM",
        "organization": "Royal Thai Survey Department (RTSD) / GISTDA / DWR",
        "dataset": "Digital Elevation Model (30m / 5m LiDAR Gridded Terrain)",
        "purpose": "Elevation, slope, drainage direction, terrain-based water-flow analysis",
        "access_method": "GeoTIFF Raster / Private Authorized Download",
        "authentication": "Institutional Data Request / Government Data Sharing Protocol",
        "private_or_public": "PRIVATE",
        "default_authorization_status": AccessAuthorizationStatus.PRIVATE_PENDING,
        "license": "Restricted Government Use / Research Project License",
        "license_url": "https://www.rtsd.mi.th",
        "redistribution_allowed": False,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Static topographic reference",
        "source_classification": SourceClassification.STATIC_REFERENCE,
        "freshness_threshold_hours": 8760.0,
        "coverage": "Prachin Buri Basin terrain",
        "required_credential_env": "DEM_AUTHORIZED_ACCESS",
        "verified_license_for_production": False,
        "real_endpoint": "https://www.rtsd.mi.th",
        "notes": "Raw DEM does not need to be shown publicly. Slope and flow direction used internally. Raw storage requires authorization verification."
    },
    # 6.7 DIW 101/105/106 Facilities
    "diw_industrial_waste": {
        "source_id": "diw_industrial_waste",
        "source_name": "DIW Industrial Waste Facility Registry (Types 101, 105, 106)",
        "organization": "Department of Industrial Works (DIW), Ministry of Industry",
        "dataset": "112 facilities in the DIW May 2020 dataset snapshot",
        "purpose": "Industrial waste management spatial location and activity classification",
        "access_method": "Static Official Snapshot (May 2020) / DIW Registry API",
        "authentication": "DIW Institutional API Key / Data.go.th Authorized Portal",
        "private_or_public": "PUBLIC",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY, # May 2020 open data snapshot
        "license": "Open Government License Thailand (OGL-TH)",
        "license_url": "https://data.go.th/dataset/711b77d9-cc8e-449b-a5c0-cd4c617a9983",
        "redistribution_allowed": True,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Historical snapshot (May 2020); live registry API requires DIW project credentials",
        "source_classification": SourceClassification.HISTORICAL,
        "freshness_threshold_hours": 720.0,
        "coverage": "112 facilities in Prachin Buri Province",
        "required_credential_env": "DIW_AUTHORIZED_CREDENTIAL",
        "verified_license_for_production": True,
        "real_endpoint": "https://data.go.th/dataset/711b77d9-cc8e-449b-a5c0-cd4c617a9983",
        "notes": "Snapshot of 112 facilities from DIW May 2020 dataset. Activity categories 101/105/106 denote activity type, NOT toxicity. Hazard is strictly INSUFFICIENT DATA."
    },
    # 6.8 Other Industrial Facilities
    "diw_all_factories": {
        "source_id": "diw_all_factories",
        "source_name": "DIW General Industrial Facility Registry",
        "organization": "Department of Industrial Works (DIW)",
        "dataset": "National Factory Directory (All 107 Activity Types)",
        "purpose": "Broad industrial activity screening beyond waste processors",
        "access_method": "DIW Factory API / Open Government Dataset",
        "authentication": "DIW Authorized Access Token",
        "private_or_public": "PRIVATE",
        "default_authorization_status": AccessAuthorizationStatus.PRIVATE_PENDING,
        "license": "DIW Administrative License",
        "license_url": "https://www.diw.go.th",
        "redistribution_allowed": False,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Monthly",
        "source_classification": SourceClassification.PERIODIC,
        "freshness_threshold_hours": 720.0,
        "coverage": "Prachin Buri industrial estates (304, Rojana, Hi-Tech, Kabin Buri)",
        "required_credential_env": "DIW_FACTORY_API_KEY",
        "verified_license_for_production": False,
        "real_endpoint": "https://www.diw.go.th",
        "notes": "Private-only production rule applies. Facility existence does not imply pollution."
    },
    # 6.9 Environmental Incident / Inspection History
    "pcd_reo7_inspection": {
        "source_id": "pcd_reo7_inspection",
        "source_name": "PCD & REO 7 Environmental Inspection Records",
        "organization": "Pollution Control Department (PCD) & Regional Environmental Office 7 (สคพ.7)",
        "dataset": "Official Industrial Inspection, Violation Notices, and Incident Archive",
        "purpose": "Historical environmental evidence, formal violation records",
        "access_method": "Official Gazette / PCD Inspection Archive / MOU Request",
        "authentication": "Official Agency Data Request / MOU",
        "private_or_public": "PRIVATE",
        "default_authorization_status": AccessAuthorizationStatus.ACCESS_REQUIRED,
        "license": "Official Regulatory Inspection Records",
        "license_url": "https://www.pcd.go.th",
        "redistribution_allowed": False,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Per official inspection cycle / Incident investigation",
        "source_classification": SourceClassification.PERIODIC,
        "freshness_threshold_hours": 720.0,
        "coverage": "Prachin Buri river reaches and industrial corridors",
        "required_credential_env": "PCD_INSPECTION_MOU",
        "verified_license_for_production": False,
        "real_endpoint": "https://reo07.pcd.go.th/inspection",
        "notes": "Private/restricted source identity must remain private. Do not summarize beyond official evidence. Marked ACCESS_REQUIRED until formal MOU signed."
    },
    # 6.10 Water Quality / Laboratory Assays
    "pcd_water_quality": {
        "source_id": "pcd_water_quality",
        "source_name": "PCD Surface Water Quality Monitoring Network",
        "organization": "Pollution Control Department (PCD) & สคพ.7",
        "dataset": "Certified Surface Water Quality Laboratory Assays (DO, BOD, COD, Heavy Metals)",
        "purpose": "Baseline water quality, chemical anomaly detection, laboratory confirmation",
        "access_method": "PCD Water Quality Information System / Laboratory Assay Reports",
        "authentication": "Institutional Data Sharing Protocol / Authorized Access",
        "private_or_public": "PRIVATE",
        "default_authorization_status": AccessAuthorizationStatus.ACCESS_REQUIRED,
        "license": "PCD Environmental Monitoring Standards",
        "license_url": "https://www.pcd.go.th/water-quality",
        "redistribution_allowed": False,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Quarterly seasonal field sampling",
        "source_classification": SourceClassification.PERIODIC,
        "freshness_threshold_hours": 2160.0,
        "coverage": "Prachin Buri River sampling stations",
        "required_credential_env": "PCD_LAB_MOU",
        "verified_license_for_production": False,
        "real_endpoint": "http://iwqs.pcd.go.th",
        "notes": "Private-only production requirement applies. Where current certified lab assays are missing, system returns INSUFFICIENT DATA. Never fabricate concentrations."
    },
    # 6.11 Groundwater Wells
    "dgr_groundwater": {
        "source_id": "dgr_groundwater",
        "source_name": "DGR Groundwater Well Inventory",
        "organization": "Department of Groundwater Resources (DGR), Ministry of Natural Resources and Environment",
        "dataset": "National Groundwater Well and Aquifer Monitoring Database",
        "purpose": "Sensitive receptor identification (drinking water and community wells)",
        "access_method": "DGR GIS Service / Authorized Data Request",
        "authentication": "DGR Institutional Credential",
        "private_or_public": "PRIVATE",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY, # Open data exists but private channel required
        "license": "DGR Terms of Use",
        "license_url": "https://www.dgr.go.th",
        "redistribution_allowed": False,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Annual",
        "source_classification": SourceClassification.PERIODIC,
        "freshness_threshold_hours": 8760.0,
        "coverage": "Prachin Buri groundwater wells",
        "required_credential_env": "DGR_CREDENTIAL",
        "verified_license_for_production": False,
        "real_endpoint": "https://gwmms.dgr.go.th/api",
        "notes": "Open Data alone does not qualify under private-only production rule. Marked PUBLIC_ONLY / PRIVATE_ACCESS_NOT_AVAILABLE. Referenced for planning only."
    },
    # 6.12 Villages / Communities
    "dopa_villages": {
        "source_id": "dopa_villages",
        "source_name": "Department of Provincial Administration Village Directory",
        "organization": "Department of Provincial Administration (DOPA), Ministry of Interior",
        "dataset": "Official Administrative Boundary & Village Centroid Directory",
        "purpose": "Population exposure, community receptor, alert targeting",
        "access_method": "Government GIS Service / DOPA Open Data",
        "authentication": "Public Portal Download / Open Government License",
        "private_or_public": "PUBLIC",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY, # Public administrative open data
        "license": "Open Government License Thailand (OGL-TH)",
        "license_url": "https://www.dopa.go.th",
        "redistribution_allowed": True,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Annual",
        "source_classification": SourceClassification.STATIC_REFERENCE,
        "freshness_threshold_hours": 8760.0,
        "coverage": "Prachin Buri (Mueang, Kabin Buri, Na Di, Ban Sang, Si Maha Phot, Si Mahosot, Prachantakham)",
        "required_credential_env": None,
        "verified_license_for_production": True,
        "real_endpoint": "https://stat.bora.dopa.go.th",
        "notes": "Public open data directory. Under strict private-only production rule, marked PUBLIC_ONLY / PRIVATE_ACCESS_NOT_AVAILABLE. Uses aggregated administrative subdistrict centroids to protect household-level privacy."
    },
    # 6.13 Hospitals / Healthcare
    "moph_hospitals": {
        "source_id": "moph_hospitals",
        "source_name": "Ministry of Public Health Health Facility Directory",
        "organization": "Ministry of Public Health (MOPH) / CITIZENinfo",
        "dataset": "Public Hospital, Community Health Center, and Clinic Registry",
        "purpose": "Sensitive emergency healthcare receptor mapping",
        "access_method": "MOPH Open API / CITIZENinfo GIS Directory",
        "authentication": "Public Health Agency Token",
        "private_or_public": "PUBLIC",
        "default_authorization_status": AccessAuthorizationStatus.PUBLIC_ONLY,
        "license": "OGL-TH / MOPH Open Data",
        "license_url": "https://catalog.moph.go.th",
        "redistribution_allowed": True,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Semi-annual",
        "source_classification": SourceClassification.STATIC_REFERENCE,
        "freshness_threshold_hours": 4380.0,
        "coverage": "Prachin Buri public hospitals and subdistrict health promotion hospitals (รพ.สต.)",
        "required_credential_env": "MOPH_API_KEY",
        "verified_license_for_production": True,
        "real_endpoint": "https://gishealth.moph.go.th",
        "notes": "Hospital locations are public landmarks; sensitive operational hospital metrics must not be exposed."
    },
    # 6.14 Agriculture / Land Use
    "ldd_landuse": {
        "source_id": "ldd_landuse",
        "source_name": "LDD Agricultural Land Use Cadastre",
        "organization": "Land Development Department (LDD), Ministry of Agriculture and Cooperatives",
        "dataset": "Agricultural Land Use Map (Paddy Rice, Aquaculture, Orchard, Field Crops)",
        "purpose": "Downstream agricultural exposure screening, aquaculture pond vulnerability",
        "access_method": "LDD Geoserver / Shapefile Download",
        "authentication": "LDD Institutional Access Token",
        "private_or_public": "PRIVATE",
        "default_authorization_status": AccessAuthorizationStatus.ACCESS_REQUIRED,
        "license": "LDD Data Sharing Policy",
        "license_url": "https://www.ldd.go.th",
        "redistribution_allowed": False,
        "raw_storage_allowed": True,
        "derived_output_allowed": True,
        "update_frequency": "Annual",
        "source_classification": SourceClassification.STATIC_REFERENCE,
        "freshness_threshold_hours": 8760.0,
        "coverage": "Prachin Buri agricultural parcels",
        "required_credential_env": "LDD_GIS_TOKEN",
        "verified_license_for_production": False,
        "real_endpoint": "https://ecard.ldd.go.th/geoserver",
        "notes": "Private-only production rule applies. Marked ACCESS_REQUIRED. Never infer crop contamination without verified physical assay."
    },
    # 6.15 Citizen Reports (Internal Source)
    "floodtrace_citizen": {
        "source_id": "floodtrace_citizen",
        "source_name": "FloodTrace Crowdsourced Ground Evidence Network",
        "organization": "FloodTrace Community Verification Network (Internal)",
        "dataset": "Citizen Ground Observations & Water Anomaly Reports",
        "purpose": "Community ground-truthing, observation clustering, emergency alerting",
        "access_method": "Direct Internal Mobile Ingestion (/api/v1/reports)",
        "authentication": "FloodTrace Internal Verified Ingestion Pipeline",
        "private_or_public": "PRIVATE", # Private ingestion partition
        "default_authorization_status": AccessAuthorizationStatus.PRIVATE_AUTHORIZED,
        "license": "FloodTrace Community Contributor Agreement & Privacy Charter",
        "license_url": "/api/v1/governance/disclaimer",
        "redistribution_allowed": False, # Raw PII is strictly non-redistributable
        "raw_storage_allowed": True,      # Stored in private partition with retention policy
        "derived_output_allowed": True,   # Generalized public view (~1.1km) permitted
        "update_frequency": "Continuous / Event-driven real-time",
        "source_classification": SourceClassification.LIVE,
        "freshness_threshold_hours": 24.0,
        "coverage": "Prachin Buri province ground reports",
        "required_credential_env": None,
        "notes": "Internal source. Private ingestion partition separates PII and exact GPS from public generalized view (~1.1km). Reports enter as UNVERIFIED."
    }
}

# Backward compatibility aliases for candidate source IDs (e.g., Sec 6.2 consolidation)
SOURCE_ALIASES = {
    "thaiwater_telemetry": "thaiwater_rid_runoff",
    "rid_reservoirs": "thaiwater_rid_runoff",
}

def evaluate_source_access(
    source_id: str, 
    credential_override: Optional[str] = None,
    enforce_private_production: bool = True,
    allow_official_public: bool = False
) -> SourceAccessRecord:
    """
    Master Prompt Section 7 & Production Activation: Source Access Decision Engine.
    Evaluates whether an external data source is verified for production factual ingestion:
    - IF private/authorized access VERIFIED: ALLOW_PRODUCTION_INGESTION
    - IF official public with verified license and allow_official_public=True: ALLOW_PRODUCTION_INGESTION
    - IF private access requested but not yet approved: ACCESS_PENDING / BLOCK_PRODUCTION_INGESTION
    - IF only public/open access without authorized license: PUBLIC_ONLY / BLOCK_PRODUCTION_INGESTION
    - IF access status cannot be verified: UNKNOWN_ACCESS / BLOCK_PRODUCTION_INGESTION
    - IF source unavailable: UNAVAILABLE / FAIL_CLOSED_NO_DATA
    """
    lookup_id = SOURCE_ALIASES.get(source_id, source_id)
    raw = CANDIDATE_SOURCES_REGISTRY.get(lookup_id)
    if not raw:
        return SourceAccessRecord(
            source_id=source_id,
            source_name="Unknown Source",
            organization="Unknown",
            dataset="Unknown",
            purpose="Unregistered source candidate",
            access_method="NONE",
            authentication="NONE",
            private_or_public="UNKNOWN",
            authorization_status=AccessAuthorizationStatus.UNKNOWN_ACCESS,
            ingestion_action=IngestionAction.BLOCK_PRODUCTION_INGESTION,
            license="UNKNOWN",
            redistribution_allowed=False,
            raw_storage_allowed=False,
            derived_output_allowed=False,
            update_frequency="UNKNOWN",
            coverage="UNKNOWN",
            current_status="UNKNOWN_SOURCE_ID",
            verification_date="2026-10-02",
            verified_license_for_production=False,
            production_eligible=False,
            notes="Source ID not found in candidate registry. Production ingestion strictly blocked."
        )

    req_env = raw.get("required_credential_env")
    env_val = credential_override or (os.getenv(req_env) if req_env else None)
    has_credential = bool(env_val and env_val.strip())
    verified_license = bool(raw.get("verified_license_for_production", False))

    auth_status = raw["default_authorization_status"]
    
    # If credential is provided in environment, upgrade to PRIVATE_AUTHORIZED
    if req_env and has_credential:
        auth_status = AccessAuthorizationStatus.PRIVATE_AUTHORIZED

    # Determine Ingestion Action based on Section 1 & Section 7 logic
    if auth_status == AccessAuthorizationStatus.PRIVATE_AUTHORIZED:
        ingestion_action = IngestionAction.ALLOW_PRODUCTION_INGESTION
        status_desc = "VERIFIED_PRIVATE_AUTHORIZED"
        production_eligible = True
    elif auth_status == AccessAuthorizationStatus.PUBLIC_ONLY:
        if allow_official_public and verified_license:
            ingestion_action = IngestionAction.ALLOW_PRODUCTION_INGESTION
            status_desc = "OFFICIAL_PUBLIC + VERIFIED_LICENSE: Production-eligible under OGL-TH verified terms."
            production_eligible = True
        else:
            # Public open data exists, but under private-only requirement, blocked from production factual ingestion
            ingestion_action = IngestionAction.BLOCK_PRODUCTION_INGESTION if enforce_private_production else IngestionAction.DISCOVERY_AND_PLANNING_ONLY
            status_desc = "PUBLIC_ONLY: Private authorized access channel not available or credential missing. Blocked from production pipeline under private-only rule."
            production_eligible = False
    elif auth_status == AccessAuthorizationStatus.PRIVATE_PENDING:
        ingestion_action = IngestionAction.BLOCK_PRODUCTION_INGESTION
        status_desc = "ACCESS_PENDING: Private institutional access requested from agency, awaiting approval."
        production_eligible = False
    elif auth_status == AccessAuthorizationStatus.UNAVAILABLE:
        ingestion_action = IngestionAction.FAIL_CLOSED_NO_DATA
        status_desc = "SOURCE_UNAVAILABLE: Upstream endpoint unresponsive or live telemetry unavailable at audit time."
        production_eligible = False
    else:
        ingestion_action = IngestionAction.BLOCK_PRODUCTION_INGESTION
        status_desc = "UNKNOWN_ACCESS: Access model cannot be verified. Blocked from production."
        production_eligible = False

    return SourceAccessRecord(
        source_id=raw["source_id"],
        source_name=raw["source_name"],
        organization=raw["organization"],
        dataset=raw["dataset"],
        purpose=raw["purpose"],
        access_method=raw["access_method"],
        authentication=raw["authentication"],
        private_or_public=raw["private_or_public"],
        authorization_status=auth_status,
        ingestion_action=ingestion_action,
        license=raw["license"],
        license_url=raw.get("license_url"),
        redistribution_allowed=raw["redistribution_allowed"],
        raw_storage_allowed=raw["raw_storage_allowed"],
        derived_output_allowed=raw["derived_output_allowed"],
        update_frequency=raw["update_frequency"],
        source_classification=raw.get("source_classification", SourceClassification.STATIC_REFERENCE),
        freshness_threshold_hours=raw.get("freshness_threshold_hours"),
        coverage=raw["coverage"],
        current_status=status_desc,
        verification_date="2026-10-02",
        required_credential_env=req_env,
        credential_present=has_credential,
        verified_license_for_production=verified_license,
        production_eligible=production_eligible,
        real_endpoint=raw.get("real_endpoint"),
        notes=raw["notes"]
    )

def evaluate_production_eligibility(source_id: str) -> SourceAccessRecord:
    """Evaluate access policy without promoting an unimplemented or unverified source."""
    record = evaluate_source_access(
        source_id,
        enforce_private_production=True,
        allow_official_public=True
    )
    source_status, _, _ = canonical_source_status(source_id)
    if source_status not in {"ACTIVE API", "LOCAL / VERIFIED REFERENCE"}:
        record.production_eligible = False
        record.verified_license_for_production = False
        record.ingestion_action = IngestionAction.BLOCK_PRODUCTION_INGESTION
    return record

def get_all_source_access_evaluations(enforce_private_production: bool = True) -> List[SourceAccessRecord]:
    """Returns evaluation records for all 15 candidate sources in the matrix."""
    return [
        evaluate_source_access(sid, enforce_private_production=enforce_private_production)
        for sid in CANDIDATE_SOURCES_REGISTRY.keys()
    ]

def get_all_production_eligibility_evaluations() -> List[SourceAccessRecord]:
    """Returns production eligibility records for all 15 sources under the Section 1 policy."""
    return [
        evaluate_production_eligibility(sid)
        for sid in CANDIDATE_SOURCES_REGISTRY.keys()
    ]


def canonical_source_status(source_id: str, repo_root: Optional[Path] = None) -> tuple[str, bool, Optional[str]]:
    """Classify sources from implemented endpoints and artifact presence only."""
    root = repo_root or Path(__file__).resolve().parents[4]
    if source_id in {"thaiwater_rid_runoff", "thaiwater_rainfall"}:
        return "ACTIVE API", True, None
    if source_id == "diw_industrial_waste":
        present = (root / "data/prachinburi_industrial_waste_diw.json").is_file()
        return ("LOCAL / UNVERIFIED", True, "LOCAL_PROVENANCE_UNVERIFIED") if present else ("UNAVAILABLE / UNVERIFIED", False, "LOCAL_ARTIFACT_ABSENT")
    if source_id == "floodtrace_citizen":
        return "INTERNAL", True, None
    if source_id in {"gistda_disaster", "tmd_forecast", "official_dem", "diw_all_factories", "pcd_reo7_inspection", "pcd_water_quality", "dgr_groundwater", "ldd_landuse"}:
        return "BLOCKED", False, "ACCESS_BLOCKED"
    return "UNAVAILABLE / UNVERIFIED", False, "LOCAL_ARTIFACT_ABSENT"
