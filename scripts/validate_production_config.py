#!/usr/bin/env python3
"""
FloodTrace Production Readiness & Configuration Validation Script
Inspects environment settings, reverse proxies, database configurations,
security boundaries, and Docker containers prior to public deployment.
"""

import os
import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

def check(title: str, condition: bool, details: str = ""):
    status = "✓ PASS" if condition else "✗ FAIL"
    print(f"[{status}] {title}")
    if not condition and details:
        print(f"       -> Reason: {details}")
    return condition

def run_production_config_validation():
    print("=" * 70)
    print("FLOODTRACE PRODUCTION DEPLOYMENT CONFIGURATION AUDIT")
    print("=" * 70)

    all_passed = True

    # 1. Inspect Web Nginx Configuration
    print("\n--- 1. Frontend & Reverse Proxy Configuration ---")
    nginx_conf = ROOT / "apps" / "web" / "nginx.conf"
    all_passed &= check("Nginx production config exists (apps/web/nginx.conf)", nginx_conf.exists())
    if nginx_conf.exists():
        content = nginx_conf.read_text(encoding="utf-8")
        all_passed &= check("Nginx contains SPA try_files directive", "try_files $uri $uri/ /index.html;" in content)
        all_passed &= check("Nginx proxies /api/ to backend", "proxy_pass http://api:8001;" in content or "proxy_pass http://api:8001/api/" in content)
        all_passed &= check("Nginx handles SSE streaming without buffering", "proxy_buffering off;" in content)
        all_passed &= check("Nginx enforces security headers (nosniff, SAMEORIGIN)", "X-Content-Type-Options" in content and "X-Frame-Options" in content)
        all_passed &= check("Nginx includes Gzip compression", "gzip on;" in content)

    # 2. Inspect Dockerfiles
    print("\n--- 2. Containerization & Health Checks ---")
    web_dockerfile = ROOT / "apps" / "web" / "Dockerfile"
    api_dockerfile = ROOT / "apps" / "api" / "Dockerfile"
    all_passed &= check("Web Dockerfile exists", web_dockerfile.exists())
    all_passed &= check("API Dockerfile exists", api_dockerfile.exists())

    if web_dockerfile.exists():
        w_content = web_dockerfile.read_text(encoding="utf-8")
        all_passed &= check("Web Dockerfile copies nginx.conf", "COPY apps/web/nginx.conf" in w_content)
        all_passed &= check("Web Dockerfile has HEALTHCHECK", "HEALTHCHECK" in w_content)

    if api_dockerfile.exists():
        a_content = api_dockerfile.read_text(encoding="utf-8")
        all_passed &= check("API Dockerfile has HEALTHCHECK", "HEALTHCHECK" in a_content)
        all_passed &= check("API Dockerfile has proxy-headers support", "--proxy-headers" in a_content)

    # 3. Inspect Docker Compose Files
    print("\n--- 3. Orchestration & Production Stacks ---")
    compose_base = ROOT / "docker-compose.yml"
    compose_ssl = ROOT / "docker-compose.prod.ssl.yml"
    caddyfile = ROOT / "Caddyfile"
    all_passed &= check("Base docker-compose.yml exists", compose_base.exists())
    all_passed &= check("Production SSL docker-compose.prod.ssl.yml exists", compose_ssl.exists())
    all_passed &= check("Caddyfile for automatic HTTPS exists", caddyfile.exists())

    if compose_base.exists():
        c_content = compose_base.read_text(encoding="utf-8")
        all_passed &= check("Web service maps port 80 (not dev 5173)", ":80" in c_content)
        all_passed &= check("Persistent PostgreSQL volume configured", "floodtrace_pgdata" in c_content)

    # 4. Inspect Backup Automation
    print("\n--- 4. Automated Backup & Recovery ---")
    backup_sh = ROOT / "scripts" / "production_backup.sh"
    all_passed &= check("Automated backup script exists (scripts/production_backup.sh)", backup_sh.exists())
    if backup_sh.exists():
        b_content = backup_sh.read_text(encoding="utf-8")
        all_passed &= check("Backup script tests archive integrity (gzip -t)", "gzip -t" in b_content)
        all_passed &= check("Backup script includes retention rotation", "find" in b_content and "-delete" in b_content)

    # 5. Inspect Environment & Backend Config
    print("\n--- 5. Environment & Security Boundaries ---")
    env_example = ROOT / ".env.production.example"
    all_passed &= check("Production environment template exists (.env.production.example)", env_example.exists())

    from apps.api.app.core.config import settings
    all_passed &= check("Scheduler lifecycle is configurable (ENABLE_SCHEDULER)", hasattr(settings, "ENABLE_SCHEDULER"))
    all_passed &= check("CORS origins property is dynamic", hasattr(settings, "cors_origins"))

    # 6. Overall Summary
    print("\n" + "=" * 70)
    if all_passed:
        print("RESULT: ALL PRODUCTION CONFIGURATION CHECKS PASSED (READY FOR HOSTING)")
    else:
        print("RESULT: SOME CHECKS FAILED — REVIEW WARNINGS ABOVE")
    print("=" * 70)
    return all_passed

if __name__ == "__main__":
    success = run_production_config_validation()
    sys.exit(0 if success else 1)
