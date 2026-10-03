#!/usr/bin/env bash
# ==============================================================================
# FloodTrace Ubuntu 24.04 LTS Bootstrap Script
# Installs system dependencies, Docker CE, Docker Compose, Cloudflared,
# and configures hardened UFW firewall rules.
# ==============================================================================

set -euo pipefail

echo "================================================================================"
echo "FLOODTRACE UBUNTU 24.04 LTS PRODUCTION BOOTSTRAP"
echo "================================================================================"

if [[ $EUID -ne 0 ]]; then
   echo "❌ ERROR: This script must be run as root (use sudo)." 
   exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# 1. System Update & Base Utilities
echo "Step 1: Updating system packages and installing utilities..."
apt-get update -q
apt-get install -y -q \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    jq \
    python3 \
    python3-pip \
    tar \
    gzip

# 2. Install Docker CE & Docker Compose Plugin
echo "Step 2: Installing official Docker CE & Compose plugin..."
if ! command -v docker >/dev/null 2>&1; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -q
    apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    echo "✓ Docker installed successfully: $(docker --version)"
else
    echo "✓ Docker is already installed: $(docker --version)"
fi

# 3. Install Cloudflared (For Named Tunnel deployment)
echo "Step 3: Installing Cloudflare Tunnel daemon (cloudflared)..."
if ! command -v cloudflared >/dev/null 2>&1; then
    mkdir -p --mode=0755 /etc/apt/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /etc/apt/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | \
      tee /etc/apt/sources.list.d/cloudflared.list
    apt-get update -q
    apt-get install -y -q cloudflared
    echo "✓ cloudflared installed successfully: $(cloudflared --version)"
else
    echo "✓ cloudflared is already installed: $(cloudflared --version)"
fi

# 4. Firewall & Network Hardening (UFW)
echo "Step 4: Hardening firewall rules (UFW)..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (Keep port 22 or detected SSH port open to prevent lockout)
ufw allow OpenSSH || ufw allow 22/tcp

# Allow Web & SSL Traffic (Required for Caddy / Web ingress)
ufw allow 80/tcp comment "FloodTrace HTTP"
ufw allow 443/tcp comment "FloodTrace HTTPS"

# Explicitly ensure internal database and private services are blocked from external access
ufw deny 5432/tcp comment "PostgreSQL private database block"
ufw deny 8001/tcp comment "FloodTrace internal backend block"

# Enable UFW without prompting
ufw --force enable
echo "✓ UFW firewall status:"
ufw status verbose

echo "================================================================================"
echo "✓ BOOTSTRAP COMPLETE: Host is configured and secured for FloodTrace."
echo "================================================================================"
