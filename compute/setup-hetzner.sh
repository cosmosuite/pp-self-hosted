#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# SafeVision Compute — Hetzner VPS Setup Script
#
# Prerequisites:
#   - Ubuntu 22.04 LTS VPS (CX32 or higher: 4 vCPU / 8GB RAM recommended)
#   - SSH root access
#
# Usage:
#   1. SSH into your Hetzner server:    ssh root@YOUR_SERVER_IP
#   2. Upload this script:              scp setup-hetzner.sh root@YOUR_SERVER_IP:/root/
#   3. Make executable + run:           chmod +x /root/setup-hetzner.sh && /root/setup-hetzner.sh
#
# After running, deploy with:
#   scp -r compute/ root@YOUR_SERVER_IP:/opt/safevision-compute/
#   ssh root@YOUR_SERVER_IP "cd /opt/safevision-compute && docker compose up -d --build"
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "═══════════════════════════════════════════════════════════════════"
echo "  SafeVision Compute — Hetzner VPS Setup"
echo "═══════════════════════════════════════════════════════════════════"

# 1. System update
echo "[1/6] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# 2. Install Docker
echo "[2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed."
else
    echo "Docker already installed."
fi

# 3. Install Docker Compose plugin
echo "[3/6] Ensuring Docker Compose plugin..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi
docker compose version

# 4. Configure firewall (UFW)
echo "[4/6] Configuring firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 8000/tcp   # Compute API port
ufw --force enable
ufw status

# 5. Create app directory
echo "[5/6] Creating application directory..."
mkdir -p /opt/safevision-compute

# 6. Create systemd service for auto-restart
echo "[6/6] Creating systemd service..."
cat > /etc/systemd/system/safevision-compute.service << 'EOF'
[Unit]
Description=SafeVision Compute Server
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/safevision-compute
ExecStart=/usr/bin/docker compose up -d --build
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable safevision-compute.service

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Copy compute files to this server:"
echo "     scp -r compute/ root@$(hostname -I | awk '{print $1}'):/opt/safevision-compute/"
echo ""
echo "  2. Create .env file on the server:"
echo "     echo 'COMPUTE_API_KEY=your-secret-key-here' > /opt/safevision-compute/.env"
echo ""
echo "  3. Start the service:"
echo "     cd /opt/safevision-compute && docker compose up -d --build"
echo ""
echo "  4. Check status:"
echo "     docker compose logs -f"
echo "     curl http://localhost:8000/health"
echo ""
echo "  Server IP: $(hostname -I | awk '{print $1}')"
echo "  Port: 8000"
echo "═══════════════════════════════════════════════════════════════════"
