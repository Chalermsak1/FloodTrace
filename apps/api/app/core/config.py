import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FloodTrace Prachin Buri"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://chalermsak:@localhost:5432/floodtrace_db"
    )
    # Database Connection Pool & Statement Limits (Section 9 & 10)
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    DB_STATEMENT_TIMEOUT_MS: int = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "10000"))
    
    # Network Timeouts (Seconds - Section 6)
    TIMEOUT_FAST_SECONDS: float = float(os.getenv("TIMEOUT_FAST_SECONDS", "3.0"))
    TIMEOUT_NORMAL_SECONDS: float = float(os.getenv("TIMEOUT_NORMAL_SECONDS", "10.0"))
    TIMEOUT_LONG_SECONDS: float = float(os.getenv("TIMEOUT_LONG_SECONDS", "30.0"))
    
    # External APIs (Real Official Data Sources)
    THAIWATER_API_URL: str = "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load"
    THAIWATER_RAIN_API_URL: str = "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h"
    RID_RESERVOIR_API_URL: str = "https://app.rid.go.th/reservoir/api/reservoir/public"
    OPEN_METEO_API_URL: str = "https://api.open-meteo.com/v1/forecast"
    DIW_WASTE_DATASET_URL: str = "https://data.go.th/dataset/711b77d9-cc8e-449b-a5c0-cd4c617a9983/resource/a1821014-19fd-444c-8310-830f6d744849/download/101-105-106-1.csv"
    
    # Private / Authorized Ingestion Credentials (Master Prompt Section 2 & 7)
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATA_ENV: str = os.getenv("DATA_ENV", "DEVELOPMENT")
    REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION: bool = os.getenv("REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION", "false").lower() in ("true", "1")
    ALLOW_OFFICIAL_PUBLIC_PRODUCTION: bool = os.getenv("ALLOW_OFFICIAL_PUBLIC_PRODUCTION", "true").lower() in ("true", "1")
    THAIWATER_API_KEY: str | None = os.getenv("THAIWATER_API_KEY", None)
    GISTDA_API_KEY: str | None = os.getenv("GISTDA_API_KEY", None)
    TMD_API_KEY: str | None = os.getenv("TMD_API_KEY", None)
    DIW_AUTHORIZED_CREDENTIAL: str | None = os.getenv("DIW_AUTHORIZED_CREDENTIAL", None)
    RID_PRIVATE_TOKEN: str | None = os.getenv("RID_PRIVATE_TOKEN", None)
    PCD_LAB_MOU: str | None = os.getenv("PCD_LAB_MOU", None)
    
    # Prachin Buri Geodetic Bounds
    PRACHINBURI_CENTER_LAT: float = 14.0535
    PRACHINBURI_CENTER_LON: float = 101.3868
    PRACHINBURI_BBOX: list[float] = [101.1374, 13.5823, 102.1263, 14.4625] # minLon, minLat, maxLon, maxLat
    
    # Project Governance (Strict No-Affiliation-Invention Standard)
    PROJECT_OWNER: str = os.getenv("PROJECT_OWNER", "NOT DESIGNATED")
    INSTITUTION: str = os.getenv("INSTITUTION", "NOT DESIGNATED")
    ADVISOR: str = os.getenv("ADVISOR", "NOT DESIGNATED")
    PUBLIC_CONTACT: str = os.getenv("PUBLIC_CONTACT", "NOT DESIGNATED")
    PRIVACY_CONTACT: str = os.getenv("PRIVACY_CONTACT", "NOT DESIGNATED")
    SECURITY_CONTACT: str = os.getenv("SECURITY_CONTACT", "NOT DESIGNATED")
    LEGAL_CONTACT: str = os.getenv("LEGAL_CONTACT", "NOT DESIGNATED")
    
    # Security, Auth & Upload Limits
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "dev-admin-secret-key-change-in-prod")
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "")
    CLOUDFLARE_TUNNEL_TOKEN: str | None = os.getenv("CLOUDFLARE_TUNNEL_TOKEN", None)
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "1200"))
    SUBMIT_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("SUBMIT_RATE_LIMIT_PER_MINUTE", "60"))
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(5 * 1024 * 1024))) # 5 MB max
    DATA_RETENTION_DAYS: int = int(os.getenv("DATA_RETENTION_DAYS", "365"))
    COORDINATE_GENERALIZE_DECIMALS: int = int(os.getenv("COORDINATE_GENERALIZE_DECIMALS", "2")) # ~1.1km blur
    
    # Scheduler lifecycle & Near-Real-Time Source Cadence (Section 4, 28, 43)
    ENABLE_SCHEDULER: bool = os.getenv("ENABLE_SCHEDULER", "true").lower() in ("true", "1")
    THAIWATER_POLL_INTERVAL: int = int(os.getenv("THAIWATER_POLL_INTERVAL", "180"))  # 3 minutes default polling for 15-min upstream
    RID_POLL_INTERVAL: int = int(os.getenv("RID_POLL_INTERVAL", "3600"))              # 1 hour for reservoir/dam reports
    OPENMETEO_POLL_INTERVAL: int = int(os.getenv("OPENMETEO_POLL_INTERVAL", "3600"))  # 1 hour for forecast model updates
    SOURCE_TIMEOUT_SECONDS: float = float(os.getenv("SOURCE_TIMEOUT_SECONDS", "20.0"))
    SOURCE_MAX_RETRIES: int = int(os.getenv("SOURCE_MAX_RETRIES", "3"))
    SOURCE_BACKOFF_BASE: float = float(os.getenv("SOURCE_BACKOFF_BASE", "2.0"))
    FRESHNESS_WARNING_SECONDS: int = int(os.getenv("FRESHNESS_WARNING_SECONDS", "1800"))  # 30 min default
    FRESHNESS_STALE_SECONDS: int = int(os.getenv("FRESHNESS_STALE_SECONDS", "3600"))      # 60 min default
    SSE_HEARTBEAT_SECONDS: float = float(os.getenv("SSE_HEARTBEAT_SECONDS", "15.0"))
    
    # CORS Origins (Configurable via comma-separated string or default)
    @property
    def cors_origins(self) -> list[str]:
        raw = os.getenv("BACKEND_CORS_ORIGINS")
        if raw:
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        if self.ENVIRONMENT.lower() == "production":
            return ["https://localhost", "http://localhost"]
        return ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]

    def validate_production_settings(self, raise_on_error: bool = False) -> list[str]:
        """
        Master Prompt Section 4: Validates production settings and refuses startup with
        placeholder, weak, or insecure configurations when ENVIRONMENT=production.
        """
        errors: list[str] = []
        is_prod = self.ENVIRONMENT.lower() == "production"

        if not is_prod:
            return errors

        # 1. Admin API Key Validation
        insecure_admin_keys = {
            "dev-admin-secret-key-change-in-prod",
            "floodtrace_admin_production_key_change_me",
            "admin", "password", "secret", "123456", "changeme"
        }
        if not self.ADMIN_API_KEY or self.ADMIN_API_KEY in insecure_admin_keys:
            errors.append("ADMIN_API_KEY uses insecure default development value.")
        elif "REPLACE_WITH" in self.ADMIN_API_KEY or "change-me" in self.ADMIN_API_KEY.lower():
            errors.append("ADMIN_API_KEY contains placeholder pattern.")
        elif len(self.ADMIN_API_KEY) < 24:
            errors.append("ADMIN_API_KEY must be at least 24 characters in production.")

        # 2. Secret Key Validation
        insecure_secret_keys = {
            "dev-secret-key-change-in-production",
            "secret", "supersecret", "jwt-secret", "default_secret"
        }
        if not self.SECRET_KEY or self.SECRET_KEY in insecure_secret_keys:
            errors.append("SECRET_KEY uses insecure default development value.")
        elif "REPLACE_WITH" in self.SECRET_KEY or "change-me" in self.SECRET_KEY.lower():
            errors.append("SECRET_KEY contains placeholder pattern.")
        elif len(self.SECRET_KEY) < 24:
            errors.append("SECRET_KEY must be at least 24 characters in production.")

        # 3. Database URL Validation
        insecure_db_patterns = [
            "floodtrace_secure_pass",
            "REPLACE_WITH",
            "chalermsak:@"
        ]
        for pat in insecure_db_patterns:
            if pat in self.DATABASE_URL:
                errors.append(f"DATABASE_URL contains insecure default or placeholder credentials ('{pat}').")
                break

        # 4. Public Base URL Validation
        if self.PUBLIC_BASE_URL:
            if "trycloudflare.com" in self.PUBLIC_BASE_URL.lower():
                errors.append("PUBLIC_BASE_URL is configured with an ephemeral Quick Tunnel ('trycloudflare.com').")
            elif "localhost" in self.PUBLIC_BASE_URL.lower() or "127.0.0.1" in self.PUBLIC_BASE_URL:
                errors.append("PUBLIC_BASE_URL cannot point to localhost or loopback in production.")

        if errors and raise_on_error:
            raise RuntimeError(
                "UNSAFE PRODUCTION CONFIGURATION REFUSED:\n- " + "\n- ".join(errors)
            )

        return errors

    model_config = {
        "case_sensitive": True,
        "extra": "ignore"
    }

settings = Settings()

