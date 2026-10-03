import io
import time
import uuid
import hashlib
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timezone
from fastapi import Request, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from PIL import Image

from apps.api.app.core.config import settings

# Header schemes
api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

def verify_admin_key(
    header_key: Optional[str] = Security(api_key_header),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
) -> str:
    """
    Enforces RBAC / least privilege on sensitive admin and moderation endpoints.
    Requires matching ADMIN_API_KEY.
    """
    provided_key = None
    if header_key:
        provided_key = header_key
    elif credentials and credentials.credentials:
        provided_key = credentials.credentials

    if not provided_key or provided_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Provide valid 'X-Admin-Key' or 'Authorization: Bearer <token>'."
        )
    return provided_key


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Master Prompt Section 8: REQUEST ID & TRACE ID PROPAGATION.
    Injects or propagates unique request_id across the request lifecycle.
    """
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID")
        if not req_id:
            req_id = f"req_{uuid.uuid4().hex[:12]}"
        
        request.state.request_id = req_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Master Prompt Section 31: PRODUCTION SECURITY HEADERS.
    Applies HSTS, CSP, X-Frame-Options, X-Content-Type-Options across all responses.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https://api.open-meteo.com https://api-v3.thaiwater.net https://app.rid.go.th https://server.arcgisonline.com https://*.basemaps.cartocdn.com; "
            "frame-ancestors 'none';"
        )
        return response


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter per IP address.
    """
    def __init__(self):
        self._requests = {}

    def is_allowed(self, client_ip: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        if client_ip not in self._requests:
            self._requests[client_ip] = []
        
        # Clean timestamps older than window
        self._requests[client_ip] = [ts for ts in self._requests[client_ip] if now - ts < window_seconds]
        
        current_count = len(self._requests[client_ip])
        if current_count >= max_requests:
            remaining_time = int(window_seconds - (now - self._requests[client_ip][0])) if self._requests[client_ip] else window_seconds
            return False, max(1, remaining_time)
        
        self._requests[client_ip].append(now)
        return True, 0

rate_limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Master Prompt Section 25 & 26: TIERED ABUSE PROTECTION & RATE LIMITING.
    Enforces per-minute caps based on endpoint sensitivity.
    """
    async def dispatch(self, request: Request, call_next):
        # Extract IP supporting reverse proxy / load balancer (Section 3 & 25)
        cf_ip = request.headers.get("CF-Connecting-IP")
        forwarded = request.headers.get("X-Forwarded-For")
        if cf_ip:
            client_ip = cf_ip.strip()
        elif forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"
            
        path = request.url.path
        req_id = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex[:12]}")

        # Determine rate limit tier
        limit = settings.RATE_LIMIT_PER_MINUTE
        if "/admin" in path:
            limit = max(settings.RATE_LIMIT_PER_MINUTE * 5, 300) # Staff operations console
        elif "/reports/upload-photo" in path:
            limit = 5 # Max 5 photo uploads per minute
        elif ("/public/reports" in path or "/reports" in path) and request.method == "POST":
            limit = settings.SUBMIT_RATE_LIMIT_PER_MINUTE # 10/min for citizen report submissions
        elif "/governance/takedown" in path and request.method == "POST":
            limit = settings.SUBMIT_RATE_LIMIT_PER_MINUTE

        allowed, retry_after = rate_limiter.is_allowed(client_ip, limit, window_seconds=60)
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"ส่งคำขอถี่เกินขีดจำกัด กรุณารอ {retry_after} วินาทีก่อนลองใหม่",
                        "retryable": True,
                        "retry_after_seconds": retry_after,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "request_id": req_id
                    }
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-Request-ID": req_id
                }
            )
        
        return await call_next(request)


def format_standard_error(
    code: str,
    message: str,
    request_id: str,
    retryable: bool = False,
    status_code: int = 400
) -> JSONResponse:
    """
    Master Prompt Section 7: UNIFIED PRODUCTION ERROR RESPONSE FORMAT.
    Never exposes stack traces, internal paths, SQL queries, or credentials.
    Includes 'detail' for standard FastAPI compatibility.
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "detail": message,
            "error": {
                "code": code,
                "message": message,
                "retryable": retryable,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": request_id
            }
        },
        headers={"X-Request-ID": request_id}
    )


# Allowed MIME types and corresponding magic signatures
ALLOWED_IMAGE_SIGNATURES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89\x50\x4e\x47\x0d\x0a\x1a\x0a"],
    "image/webp": [b"RIFF"]
}

def sanitize_and_strip_exif_image(file_bytes: bytes, max_bytes: int = 5 * 1024 * 1024) -> Tuple[bytes, str]:
    """
    Section 18 & 29 Security Hardening:
    - Verifies file size limit
    - Validates binary magic byte signature (never trusts extension)
    - Strips EXIF metadata (GPS home coordinates, device serials)
    - Re-encodes image into clean JPEG or PNG
    - Generates randomized storage identifier
    """
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image upload exceeds maximum permissible size of {max_bytes / (1024*1024):.1f} MB."
        )

    # Magic byte verification
    matched_mime = None
    for mime, signatures in ALLOWED_IMAGE_SIGNATURES.items():
        for sig in signatures:
            if file_bytes.startswith(sig):
                matched_mime = mime
                break
        if matched_mime:
            break

    if not matched_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file format. Only verified JPEG, PNG, or WebP binary images are permitted."
        )

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify() # Verify file integrity
        
        # Re-open for stripping and re-encoding
        image = Image.open(io.BytesIO(file_bytes))
        output_buffer = io.BytesIO()
        
        # Save as clean RGB JPEG or RGBA PNG with zero EXIF
        if image.mode in ("RGBA", "P"):
            image.save(output_buffer, format="PNG", optimize=True)
            ext = "png"
        else:
            image = image.convert("RGB")
            image.save(output_buffer, format="JPEG", quality=85, optimize=True)
            ext = "jpg"
            
        clean_bytes = output_buffer.getvalue()
        random_filename = f"evd_{uuid.uuid4().hex[:16]}.{ext}"
        return clean_bytes, random_filename
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image decoding and sanitization failed: {str(e)}"
        )


def validate_prachin_coordinates(lat: float, lon: float) -> bool:
    """
    Master Prompt Section 46: DATA CORRUPTION PROTECTION.
    Ensures input coordinates fall within the realistic Prachin Buri regional envelope.
    """
    min_lon, min_lat, max_lon, max_lat = settings.PRACHINBURI_BBOX
    # Allow small 0.5-degree margin for basin tributaries
    return (min_lat - 0.5 <= lat <= max_lat + 0.5) and (min_lon - 0.5 <= lon <= max_lon + 0.5)


def generalize_coordinates(lat: float, lon: float, decimals: int = 2) -> Tuple[float, float]:
    """
    Section 11 Reporter Privacy:
    Generalizes exact GPS coordinates to protect citizen reporter privacy.
    2 decimal places corresponds to approximately ~1.1 km precision.
    """
    return round(lat, decimals), round(lon, decimals)
