"""
FloodTrace Source Metadata & Image Extraction Service
=====================================================
Responsible for:
1. Extracting OpenGraph (og:image), Twitter Card (twitter:image), and source preview images
   from verified public/official news and announcement source URLs.
2. Enforcing rigorous SSRF protections (RFC 1918, link-local, loopback, cloud metadata,
   dangerous port blocking, DNS resolution verification, redirect validation).
3. Validating content types, max sizes, and image integrity.
4. Caching extracted metadata to prevent repeated network load.
5. Providing graceful, truthful fallbacks when sources do not expose preview images.
"""

import re
import socket
import ipaddress
import threading
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlsplit, urljoin
from datetime import datetime, timezone
import httpx

# Blocked hostnames (Local, Cloud Metadata, Container Services)
BLOCKED_HOSTNAMES = {
    "localhost", "0.0.0.0", "127.0.0.1", "::1", "169.254.169.254",
    "metadata.google.internal", "metadata", "instance-data",
    "kubernetes.default.svc", "internal"
}

# Dangerous / Internal ports to prevent SSRF port scanning
DANGEROUS_PORTS = {
    21, 22, 23, 25, 53, 69, 110, 111, 135, 137, 138, 139, 143, 389, 445,
    636, 1433, 1521, 2049, 2375, 2376, 3306, 3389, 5000, 5432, 5984, 6379,
    8000, 8086, 8888, 9000, 9042, 9092, 9200, 9300, 11211, 27017, 28017
}

# Max HTML size to read (1 MB) to prevent memory exhaustion
MAX_HTML_BYTES = 1024 * 1024

# Max Image size allowed (10 MB)
MAX_IMAGE_BYTES = 10 * 1024 * 1024

# Allowed image content types
ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"
}


class SourceMetadataService:
    """Thread-safe metadata and preview image extractor with robust SSRF protections."""

    _cache: Dict[str, Dict[str, Any]] = {}
    _cache_lock = threading.Lock()
    _cache_ttl_seconds = 3600  # 1 hour cache TTL

    @classmethod
    def validate_safe_url(cls, url: str, require_resolvable: bool = False) -> str:
        """
        Validates URL against SSRF attacks (RFC 1918, 169.254, loopback, IPv6 mapped, credentials, ports).
        If require_resolvable=True, verifies domain can be resolved in DNS.
        Raises ValueError if URL is insecure or unresolvable.
        """
        s = url.strip()
        parsed = urlsplit(s)

        if parsed.scheme.lower() not in ("http", "https"):
            raise ValueError(f"Invalid URL scheme '{parsed.scheme}': only http and https are allowed")

        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid URL: missing hostname")

        if parsed.username or parsed.password:
            raise ValueError("Invalid URL: embedding credentials in URL is prohibited")

        if parsed.port and parsed.port in DANGEROUS_PORTS:
            raise ValueError(f"Invalid URL: sensitive service port {parsed.port} is blocked")

        host_lower = hostname.lower().strip("[]")

        if host_lower in BLOCKED_HOSTNAMES or host_lower.endswith(
            (".localhost", ".local", ".internal", ".lan", ".home", ".corp")
        ):
            raise ValueError(f"Invalid source URL: access to internal host '{hostname}' is prohibited")

        def check_ip_obj(ip_obj):
            if (
                ip_obj.is_private or
                ip_obj.is_loopback or
                ip_obj.is_link_local or
                ip_obj.is_reserved or
                ip_obj.is_multicast or
                ip_obj.is_unspecified
            ):
                raise ValueError(f"Invalid source URL: access to private/reserved IP {ip_obj} is prohibited")
            if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped:
                mapped = ip_obj.ipv4_mapped
                if mapped.is_private or mapped.is_loopback or mapped.is_link_local or mapped.is_reserved:
                    raise ValueError(f"Invalid source URL: access to mapped private IP {mapped} is prohibited")

        # Check standard IP parsing
        try:
            ip_obj = ipaddress.ip_address(host_lower)
            check_ip_obj(ip_obj)
            return s
        except ValueError:
            pass

        # Check alternate numeric representations (e.g. 2130706433 for 127.0.0.1)
        if host_lower.isdigit():
            try:
                ip_int = int(host_lower)
                if 0 <= ip_int <= 0xFFFFFFFF:
                    check_ip_obj(ipaddress.IPv4Address(ip_int))
            except Exception:
                pass

        # Regex check for RFC 1918 / Cloud metadata prefixes
        if re.search(r"^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)", host_lower):
            raise ValueError(f"Invalid source URL: private subnet access '{host_lower}' is prohibited")

        # DNS resolution check for domain names (prevents DNS rebinding and NXDOMAIN)
        try:
            addr_info = socket.getaddrinfo(host_lower, None, proto=socket.IPPROTO_TCP)
            for _, _, _, _, sockaddr in addr_info:
                check_ip_obj(ipaddress.ip_address(sockaddr[0]))
        except (socket.gaierror, socket.herror) as e:
            if require_resolvable:
                raise ValueError(f"Invalid source URL: domain '{hostname}' could not be resolved in DNS: {e}")

        return s

    @classmethod
    def check_dns_resolvable(cls, url: str) -> bool:
        """Returns True if the domain can be resolved in DNS, False otherwise."""
        try:
            parsed = urlsplit(url)
            host = (parsed.hostname or "").lower().strip("[]")
            if not host:
                return False
            if host in BLOCKED_HOSTNAMES or host.endswith((".localhost", ".local", ".internal", ".lan", ".home", ".corp")):
                return False
            addr_info = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
            return bool(addr_info)
        except Exception:
            return False

    @classmethod
    def extract_image_tags_from_html(cls, html_content: str, base_url: str) -> Optional[Tuple[str, str]]:
        """
        Parses HTML and extracts image according to priority:
        1. og:image -> OG_IMAGE
        2. twitter:image -> TWITTER_IMAGE
        3. image_src / itemprop -> SOURCE_IMAGE
        Returns (resolved_image_url, image_source_type) or None.
        """
        if not html_content:
            return None

        # 1. OpenGraph Image (og:image)
        og_match = re.search(
            r'<meta\s+[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']',
            html_content, re.IGNORECASE
        ) or re.search(
            r'<meta\s+[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']',
            html_content, re.IGNORECASE
        ) or re.search(
            r'<meta\s+[^>]*name=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']',
            html_content, re.IGNORECASE
        )
        if og_match:
            raw_url = og_match.group(1).strip()
            resolved = urljoin(base_url, raw_url)
            return (resolved, "OG_IMAGE")

        # 2. Twitter Card Image (twitter:image)
        tw_match = re.search(
            r'<meta\s+[^>]*name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\']',
            html_content, re.IGNORECASE
        ) or re.search(
            r'<meta\s+[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']twitter:image["\']',
            html_content, re.IGNORECASE
        ) or re.search(
            r'<meta\s+[^>]*property=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\']',
            html_content, re.IGNORECASE
        ) or re.search(
            r'<meta\s+[^>]*name=["\']twitter:image:src["\'][^>]*content=["\']([^"\']+)["\']',
            html_content, re.IGNORECASE
        )
        if tw_match:
            raw_url = tw_match.group(1).strip()
            resolved = urljoin(base_url, raw_url)
            return (resolved, "TWITTER_IMAGE")

        # 3. Standard Link or Meta Image Source
        src_match = re.search(
            r'<link\s+[^>]*rel=["\']image_src["\'][^>]*href=["\']([^"\']+)["\']',
            html_content, re.IGNORECASE
        ) or re.search(
            r'<meta\s+[^>]*itemprop=["\']image["\'][^>]*content=["\']([^"\']+)["\']',
            html_content, re.IGNORECASE
        )
        if src_match:
            raw_url = src_match.group(1).strip()
            resolved = urljoin(base_url, raw_url)
            return (resolved, "SOURCE_IMAGE")

        return None

    @classmethod
    def extract_text_metadata(cls, html_content: str) -> Tuple[Optional[str], Optional[str]]:
        """Extracts authentic title and summary description from HTML tags."""
        if not html_content:
            return None, None

        title = None
        # Try og:title, then twitter:title, then <title>
        og_t = re.search(r'<meta\s+[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
        if og_t:
            title = og_t.group(1).strip()
        else:
            t_tag = re.search(r'<title>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
            if t_tag:
                title = t_tag.group(1).strip()

        desc = None
        # Try og:description, then twitter:description, then <meta name="description">
        og_d = re.search(r'<meta\s+[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']', html_content, re.IGNORECASE) or \
               re.search(r'<meta\s+[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
        if og_d:
            desc = og_d.group(1).strip()

        return title, desc

    @classmethod
    def get_metadata(
        cls, 
        source_url: str, 
        agency: Optional[str] = None, 
        skip_network: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves source metadata including operational health and extracted preview image.
        Uses in-memory cache and returns standard metadata contract.
        """
        if not source_url:
            return {
                "source_url": "",
                "source_name": agency or "",
                "source_domain": "",
                "source_image_url": None,
                "source_image_fetched_at": None,
                "image_source_type": "FALLBACK",
                "source_status": "NOT_CONFIGURED",
                "extracted_title": None,
                "extracted_description": None
            }

        # Check Cache
        with cls._cache_lock:
            cached = cls._cache.get(source_url)
            if cached:
                cached_time = cached.get("_timestamp", 0)
                if (datetime.now(timezone.utc).timestamp() - cached_time) < cls._cache_ttl_seconds:
                    result = dict(cached)
                    result.pop("_timestamp", None)
                    return result

        # Compute Domain
        try:
            parsed = urlsplit(source_url)
            domain = parsed.netloc.split(":")[0].lower() if parsed.netloc else ""
        except Exception:
            domain = ""

        # Validate SSRF
        try:
            cls.validate_safe_url(source_url)
        except ValueError:
            # If URL is unsafe/SSRF target, return safe fallback with no image
            fallback_res = {
                "source_url": source_url,
                "source_name": agency or "",
                "source_domain": domain,
                "source_image_url": None,
                "source_image_fetched_at": datetime.now(timezone.utc).isoformat(),
                "image_source_type": "FALLBACK",
                "source_status": "BLOCKED",
                "extracted_title": None,
                "extracted_description": None
            }
            return fallback_res

        # Network Extraction and Health Verification
        extracted_image_url: Optional[str] = None
        extracted_type: str = "NONE"
        source_status: str = "AVAILABLE"
        extracted_title: Optional[str] = None
        extracted_description: Optional[str] = None

        if not skip_network and not source_url.endswith((".pdf", ".doc", ".docx", ".zip")):
            # First check DNS resolvability
            if not cls.check_dns_resolvable(source_url):
                source_status = "DNS_ERROR"
            else:
                try:
                    # Use client with strict timeouts & manual redirect validation
                    with httpx.Client(timeout=3.0, follow_redirects=False) as client:
                        curr_url = source_url
                        resp = None

                        # Follow at most 3 redirects safely
                        for _ in range(3):
                            cls.validate_safe_url(curr_url)
                            resp = client.get(
                                curr_url, 
                                headers={"User-Agent": "FloodTrace-Bot/1.0 (+https://floodtrace.org; environmental monitoring)"}
                            )
                            if resp.status_code in (301, 302, 303, 307, 308) and "location" in resp.headers:
                                next_url = urljoin(curr_url, resp.headers["location"])
                                curr_url = next_url
                            else:
                                break

                        if resp:
                            if resp.status_code == 200:
                                source_status = "AVAILABLE"
                                content_type = resp.headers.get("content-type", "").lower()
                                if "text/html" in content_type or "application/xhtml+xml" in content_type:
                                    html_chunk = resp.text[:MAX_HTML_BYTES]
                                    extracted_title, extracted_description = cls.extract_text_metadata(html_chunk)
                                    extracted = cls.extract_image_tags_from_html(html_chunk, curr_url)
                                    if extracted:
                                        candidate_url, candidate_type = extracted
                                        # Validate candidate image URL with SSRF checker
                                        try:
                                            cls.validate_safe_url(candidate_url)
                                            extracted_image_url = candidate_url
                                            extracted_type = candidate_type
                                        except ValueError:
                                            extracted_image_url = None
                                            extracted_type = "NONE"
                            elif resp.status_code == 429:
                                source_status = "RATE_LIMITED"
                            elif resp.status_code in (404, 410):
                                source_status = "UNAVAILABLE"
                            elif resp.status_code in (401, 403):
                                source_status = "BLOCKED"
                            else:
                                source_status = "UNAVAILABLE"
                except httpx.TimeoutException:
                    source_status = "TIMEOUT"
                except Exception:
                    # Connection error or DNS failure
                    source_status = "UNAVAILABLE"
        elif skip_network:
            # If skipping network, check if domain is resolvable
            if not cls.check_dns_resolvable(source_url):
                source_status = "DNS_ERROR"
            else:
                source_status = "AVAILABLE"

        now_iso = datetime.now(timezone.utc).isoformat()
        metadata_result = {
            "source_url": source_url,
            "source_name": agency or "",
            "source_domain": domain,
            "source_image_url": extracted_image_url,
            "source_image_fetched_at": now_iso if extracted_image_url else None,
            "image_source_type": extracted_type,
            "source_status": source_status,
            "extracted_title": extracted_title,
            "extracted_description": extracted_description
        }

        # Store in cache
        with cls._cache_lock:
            cached_entry = dict(metadata_result)
            cached_entry["_timestamp"] = datetime.now(timezone.utc).timestamp()
            cls._cache[source_url] = cached_entry

        return metadata_result

