# FloodTrace — Production Deployment & Operations Runbook

> **Target Platform:** Ubuntu 24.04 LTS / Linux (x86_64 or arm64)  
> **Orchestration:** Docker Compose v2 + Systemd  
> **Ingress Options:** Cloudflare Named Tunnel (Zero Open Ports) OR Caddy Automatic TLS (Ports 80/443)  
> **Database:** PostgreSQL 16 + PostGIS 3.4 Persistent Volume  

---

## 1. Architecture Overview

FloodTrace supports two verified production deployment paths:

### Path A: Cloudflare Named Tunnel (Recommended)
```
[Public User Browser]
       │ HTTPS
       ▼
[Cloudflare Edge Network] (DDoS, WAF, CDN, DNS: floodtrace.yourdomain.org)
       │ Encrypted Outbound Tunnel (No Inbound Ports Opened)
       ▼
[cloudflared daemon] (systemd: floodtrace-tunnel.service)
       │ HTTP (localhost:80 or docker network)
       ▼
[floodtrace_web] (Nginx SPA Static Assets & Internal Reverse Proxy)
       │ HTTP
       ▼
[floodtrace_api] (FastAPI ASGI Server)
       │ SQL (Private Network Only)
       ▼
[floodtrace_db] (PostgreSQL 16 + PostGIS 3.4 Persistent NVMe Volume)
```

### Path B: Dedicated VPS with Caddy Automated SSL
```
[Public User Browser]
       │ HTTPS (Ports 80 & 443)
       ▼
[Caddy Reverse Proxy] (Automatic Let's Encrypt TLS 1.3, Brotli/Zstd)
       │
       ▼
[floodtrace_web] (Nginx SPA Frontend)
       │
       ▼
[floodtrace_api] (FastAPI Backend + SourceScheduler)
       │
       ▼
[floodtrace_db] (PostgreSQL 16 + PostGIS 3.4)
```

---

## 2. Server Bootstrap (Ubuntu 24.04 LTS)

On a freshly provisioned Ubuntu 24.04 LTS VPS:

```bash
# 1. Clone repository to /opt/floodtrace
sudo git clone <YOUR_GIT_REPO_URL> /opt/floodtrace
cd /opt/floodtrace

# 2. Run automated bootstrap script (installs Docker, Compose, Git, UFW rules, cloudflared)
sudo bash deploy/scripts/bootstrap_ubuntu.sh
```

---

## 3. Configuration Setup

Copy the production environment template:

```bash
cp deploy/production/.env.production.example /opt/floodtrace/.env.production
chmod 600 /opt/floodtrace/.env.production
```

Edit `/opt/floodtrace/.env.production`:

1. **DOMAIN & PUBLIC_BASE_URL:** Enter your registered domain (e.g. `DOMAIN=floodtrace.in.th`).
2. **SECRET_KEY:** Generate with `openssl rand -hex 32`.
3. **ADMIN_API_KEY:** Generate with `openssl rand -hex 32`.
4. **POSTGRES_PASSWORD:** Generate with `openssl rand -base64 48`.
5. **DATABASE_URL:** Ensure the generated password is substituted in `DATABASE_URL`.

Validate the configuration before starting:

```bash
python3 scripts/validate_production_config.py --env-file .env.production
```

---

## 4. Deployment Instructions

### Method 1: Using Cloudflare Named Tunnel (Zero Inbound Ports)

1. Authenticate Cloudflare CLI on the server:
   ```bash
   cloudflared tunnel login
   ```
2. Create your persistent Named Tunnel:
   ```bash
   cloudflared tunnel create floodtrace-prod
   ```
3. Associate DNS record on your domain:
   ```bash
   cloudflared tunnel route dns floodtrace-prod floodtrace.yourdomain.org
   ```
4. Copy systemd service unit and start:
   ```bash
   sudo cp deploy/systemd/floodtrace-tunnel.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now floodtrace-tunnel.service
   ```
5. Deploy containers:
   ```bash
   bash deploy/production/deploy.sh
   ```

### Method 2: Using Automated Caddy SSL (Ports 80 & 443)

Ensure ports 80 and 443 are open in your firewall and DNS points to the server IP.

Deploy with the SSL compose stack:

```bash
bash deploy/production/deploy.sh --ssl
```

---

## 5. Operations & Maintenance

### Verify System Health
Run the comprehensive verification tool anytime:

```bash
./deploy/production/verify.sh
```

### Apply Updates
Safely update containers with automated pre-update database backup:

```bash
./deploy/production/update.sh
```

### Emergency Rollback
Roll back to the previous stable release or restore a database snapshot:

```bash
./deploy/production/rollback.sh
```

### Manual Database Backup
Create an immediate snapshot:

```bash
bash scripts/backup_production.sh
```

Backups are saved to `/opt/floodtrace/backups/floodtrace_db_YYYYMMDD_HHMMSS.dump`.

---

## 6. Systemd Auto-Restart on Boot

To ensure containers automatically restart after a server reboot:

```bash
sudo cp deploy/systemd/floodtrace.service /etc/systemd/system/
sudo cp deploy/systemd/floodtrace-backup.service /etc/systemd/system/
sudo cp deploy/systemd/floodtrace-backup.timer /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable floodtrace.service
sudo systemctl enable floodtrace-backup.timer
```
