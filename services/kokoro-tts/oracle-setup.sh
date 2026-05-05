#!/bin/bash
# ============================================================================
# HOLLY Kokoro TTS — Oracle Cloud Setup Script
# Works on BOTH:
#   - VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM) — your existing HOLLY-CI-BRAIN
#   - VM.Standard.A1.Flex    (4 OCPU, 24GB RAM) — ARM free tier (if you get it)
#
# Kokoro ONNX only uses ~416MB RAM, so it fits on the 1GB micro instance fine.
#
# Usage — SSH into your Oracle instance then run:
#   curl -fsSL https://raw.githubusercontent.com/iamhollywoodpro/Holly-AI/genspark_ai_developer/services/kokoro-tts/oracle-setup.sh | bash
#
# After this script completes:
#   Kokoro TTS is running on port 8880, auto-starts on reboot.
#   Add KOKORO_TTS_URL=http://YOUR_IP:8880 to Vercel env vars.
# ============================================================================

set -e

echo "========================================"
echo " HOLLY Kokoro TTS — Oracle Cloud Setup"
echo "========================================"

ARCH=$(uname -m)
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
echo " Architecture : $ARCH"
echo " RAM          : ${RAM_MB}MB"
echo " Kokoro uses  : ~420MB (fits on 1GB micro)"
echo "========================================"

# ── 1. System packages ────────────────────────────────────────────────────────
echo ""
echo "[1/6] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y python3 python3-pip wget curl espeak-ng libsndfile1 2>/dev/null

# ── 2. Python packages ────────────────────────────────────────────────────────
echo "[2/6] Installing Python packages..."
pip3 install --quiet --upgrade pip
pip3 install --quiet kokoro-onnx soundfile fastapi "uvicorn[standard]" pydantic psutil

# ── 3. Download Kokoro model files ────────────────────────────────────────────
echo "[3/6] Downloading Kokoro model files (~340MB)..."
mkdir -p ~/kokoro-tts && cd ~/kokoro-tts

if [ ! -f "kokoro-v1.0.onnx" ]; then
    echo "  Downloading kokoro-v1.0.onnx (311MB)..."
    wget -q --show-progress \
        https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
fi

if [ ! -f "voices-v1.0.bin" ]; then
    echo "  Downloading voices-v1.0.bin (27MB)..."
    wget -q --show-progress \
        https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
fi

echo "  Model files:"
ls -lh kokoro-v1.0.onnx voices-v1.0.bin

# ── 4. Download server.py ─────────────────────────────────────────────────────
echo "[4/6] Downloading HOLLY Kokoro TTS server..."
wget -q -O ~/kokoro-tts/server.py \
    https://raw.githubusercontent.com/iamhollywoodpro/Holly-AI/genspark_ai_developer/services/kokoro-tts/server.py
echo "  server.py downloaded."

# ── 5. Create systemd service ─────────────────────────────────────────────────
echo "[5/6] Creating systemd service (auto-start on reboot)..."

PYTHON_PATH=$(which python3)
USER_NAME=$(whoami)
HOME_DIR=$(eval echo ~$USER_NAME)

sudo tee /etc/systemd/system/kokoro-tts.service > /dev/null << EOF
[Unit]
Description=HOLLY Kokoro TTS Server
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${HOME_DIR}/kokoro-tts
ExecStart=${PYTHON_PATH} ${HOME_DIR}/kokoro-tts/server.py
Restart=always
RestartSec=10
Environment=PORT=8880
Environment=KOKORO_VOICE=af_heart
# Limit memory to stay within 1GB instance budget
MemoryMax=600M

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kokoro-tts
sudo systemctl start kokoro-tts
echo "  Service started."

# ── 6. Open firewall port 8880 ────────────────────────────────────────────────
echo "[6/6] Opening firewall rules for port 8880..."

# Ubuntu UFW (if active)
if command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active"; then
    sudo ufw allow 8880/tcp
    echo "  UFW: port 8880 opened."
fi

# Oracle OCI instances use iptables directly — this is REQUIRED
sudo iptables -I INPUT -p tcp --dport 8880 -j ACCEPT 2>/dev/null || true

# Persist iptables across reboots
if ! command -v netfilter-persistent &>/dev/null; then
    echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
    echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
    sudo apt-get install -y iptables-persistent -qq 2>/dev/null || true
fi
sudo netfilter-persistent save 2>/dev/null || true
echo "  iptables: port 8880 opened and persisted."

# ── Wait for server to start then test it ────────────────────────────────────
echo ""
echo "Waiting for server to start..."
sleep 8

if curl -sf http://localhost:8880/health > /dev/null 2>&1; then
    echo "✅ Server is running!"
    curl -s http://localhost:8880/health | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'   Status : {d[\"status\"]}')
print(f'   Model  : {d[\"model\"]}')
print(f'   Voices : {len(d[\"voices\"])} available')
"
else
    echo "⚠️  Server not responding yet — check logs:"
    echo "   sudo journalctl -u kokoro-tts -n 30"
fi

# ── Print final instructions ──────────────────────────────────────────────────
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || \
            curl -s --max-time 5 icanhazip.com 2>/dev/null || \
            echo "YOUR_ORACLE_IP")

echo ""
echo "========================================"
echo " ✅ HOLLY Kokoro TTS Setup Complete!"
echo "========================================"
echo ""
echo " Useful commands:"
echo "   sudo systemctl status kokoro-tts    # check status"
echo "   sudo journalctl -u kokoro-tts -f    # live logs"
echo "   sudo systemctl restart kokoro-tts   # restart"
echo ""
echo " Test locally:"
echo "   curl http://localhost:8880/health"
echo ""
echo " ┌─────────────────────────────────────────┐"
echo " │  Add these to Vercel Environment Vars:  │"
echo " │                                         │"
echo " │  KOKORO_TTS_URL=http://${PUBLIC_IP}:8880 │"
echo " │  KOKORO_VOICE=af_heart                  │"
echo " └─────────────────────────────────────────┘"
echo ""
echo " IMPORTANT — You also need to open port 8880 in the"
echo " Oracle Cloud Security List (VCN → Security Lists → Ingress Rules):"
echo "   Source CIDR : 0.0.0.0/0"
echo "   Protocol    : TCP"
echo "   Port        : 8880"
echo ""
