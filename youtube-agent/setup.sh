#!/bin/bash
# ============================================
# YouTube Agent - Server Setup Script
# Run on fresh Ubuntu 22.04 VPS
# ============================================

set -e

echo "=============================="
echo " YouTube Agent - Setup"
echo "=============================="

# 1. System update
echo "[1/7] Updating system..."
apt update && apt upgrade -y

# 2. Install Docker
echo "[2/7] Installing Docker..."
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Install Node.js 20 (for local development)
echo "[3/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Install FFmpeg
echo "[4/7] Installing FFmpeg..."
apt install -y ffmpeg

# 5. Create project directory
echo "[5/7] Setting up project..."
mkdir -p /opt/youtube-agent
cd /opt/youtube-agent

# 6. Install git and clone
echo "[6/7] Installing git..."
apt install -y git

echo ""
echo "=============================="
echo " Setup complete!"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. Clone your repo:"
echo "   cd /opt/youtube-agent"
echo "   git clone https://github.com/n1meli333-ops/web-worker.git ."
echo "   cd youtube-agent"
echo ""
echo "2. Copy and edit .env:"
echo "   cp .env.example .env"
echo "   nano .env"
echo ""
echo "3. Start everything:"
echo "   docker compose up -d"
echo ""
echo "4. Run database migrations:"
echo "   docker compose exec server npx prisma migrate deploy"
echo "   docker compose exec server npx prisma db seed"
echo ""
echo "5. Open dashboard:"
echo "   http://YOUR_SERVER_IP"
echo ""
echo "6. Set up firewall:"
echo "   ufw allow 22    # SSH"
echo "   ufw allow 80    # Dashboard"
echo "   ufw allow 443   # HTTPS (optional)"
echo "   ufw enable"
