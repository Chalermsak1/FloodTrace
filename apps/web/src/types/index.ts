export interface ProvenanceMetadata {
  category: 'OFFICIAL_RECORD' | 'MEASURED_FACT' | 'DERIVED' | 'MODELED' | 'FORECAST' | 'CITIZEN_REPORTED' | 'UNVERIFIED';
  source_agency: string;
  source_dataset: string;
  source_url?: string;
  retrieval_timestamp?: string;
  retrieved_at?: string;
  original_timestamp?: string;
  source_verification?: 'VERIFIED_OFFICIAL' | 'PROVISIONAL' | 'PENDING_VERIFICATION' | 'UNVERIFIED' | 'INSUFFICIENT_DATA' | 'UNAVAILABLE';
  freshness_status: 'CURRENT' | 'RECENT' | 'STALE' | 'HISTORICAL' | 'UNKNOWN';
  source_age_days?: number | null;
  measurement_status?: string;
  model_status?: string | null;
  value_nature: 'OBSERVED' | 'RECORDED' | 'DERIVED' | 'MODELED' | 'FORECAST';
  confidence: number;
  official_id?: string;
  data_quality_notes?: string;
  is_simulated?: boolean;
  geocoding_precision?: string;
  geocoding_confidence?: number;
  original_text_location?: string;
  original_address?: string;
  geocoder_source?: string;
  crs?: string;
  unit?: string;
  methodology?: string;
  transformation?: string;
  audit_notes?: string;
  model_version?: string;
}

export interface WaterStation {
  id: string;
  name_th: string;
  name_en?: string;
  basin: string;
  district: string;
  latitude: number;
  longitude: number;
  water_level_msl: number | null;
  ground_level_msl: number | null;
  warning_level_msl: number | null;
  critical_level_msl: number | null;
  status: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL' | 'NO_DATA' | 'STAGE_RECORDED' | 'SENSOR_OUTLIER_STALE';
  last_updated?: string;
  provenance: ProvenanceMetadata;
}

export interface Reservoir {
  id: string;
  name_th: string;
  capacity_mcm: number;
  storage_mcm: number | null;
  storage_percent: number | null;
  inflow_mcm_day: number | null;
  outflow_mcm_day: number | null;
  latitude: number;
  longitude: number;
  district: string;
  status?: string;
  last_updated?: string;
  provenance: ProvenanceMetadata;
}

export interface IndustrialFacility {
  id: string;
  fid?: string;
  name: string;
  business_type: string;
  facility_type: '101' | '105' | '106' | string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  latitude: number;
  longitude: number;
  horsepower: number;
  workers: number;
  capital: number;
  official_license_no?: string;
  hazard_assessment_status?: 'INSUFFICIENT_DATA' | 'CONFIRMED_HAZARD';
  verified_waste_records?: string | null;
  geocoding_precision?: string;
  geocoding_confidence?: number;
  original_textual_location?: string;
  provenance: ProvenanceMetadata;
}

export interface FactorAudit {
  source: string;
  value: any;
  unit?: string | null;
  transformation?: string;
  methodology?: string;
  status?: string;
  [key: string]: any;
}

export interface RiskHotspot {
  id: string;
  target_id: string;
  name: string;
  facility_type: string;
  latitude: number;
  longitude: number;
  district: string;
  subdistrict: string;
  proximity_to_river_km: number;
  nearest_river_name: string;
  nearest_station_id?: string | null;
  nearest_station_name?: string | null;
  nearest_station_stage_msl?: number | null;
  screening_priority: 'HIGH_PROXIMITY_INSPECTION_NEEDED' | 'MODERATE_PROXIMITY' | 'LOW_PROXIMITY';
  priority_rank: number;
  priority_label: string;
  hazard_data_status: string;
  contamination_status: string;
  factors?: {
    spatial_proximity: FactorAudit;
    hydrological_stage: FactorAudit;
    forecast_rainfall_48h: FactorAudit;
    chemical_hazard_evidence: FactorAudit;
    contamination_status: FactorAudit;
  };
  last_calculated: string;
  provenance: ProvenanceMetadata;
}

export interface ForecastDay {
  date: string;
  precipitation_sum_mm: number;
  probability_max_pct: number;
  rain_hours: number;
  runoff_risk_level: string;
}

export interface ForecastResponse {
  station_key: string;
  station_name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  forecast_days: ForecastDay[];
  provenance: ProvenanceMetadata;
  status?: string;
  forecast_status?: string;
  reason?: string;
  source?: string;
  source_access?: string;
  source_access_status?: string;
  production_allowed?: boolean;
  limitations?: string;
}

export interface CitizenReport {
  id: string;
  reporter_name: string;
  reporter_role: string;
  latitude: number;
  longitude: number;
  district: string;
  subdistrict: string;
  water_depth_cm: number;
  water_flow_speed: string;
  contamination_signs: string[];
  description?: string;
  photo_url?: string;
  verification_status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  created_at: string;
  provenance: ProvenanceMetadata;
}

export interface AlertItem {
  id: string;
  type: string;
  severity: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  location: { lat: number; lon: number; district: string };
  timestamp: string;
  provenance: ProvenanceMetadata;
}
