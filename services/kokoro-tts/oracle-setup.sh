#!/bin/bash
# ============================================================================
# HOLLY Kokoro TTS — Oracle Cloud ARM Setup Script
# Run this ONCE on your new Oracle ARM instance after SSH-ing in.
#
# Usage:
#   ssh ubuntu@YOUR_ORACLE_IP
#   curl -fsSL https://raw.githubusercontent.com/iamhollywoodpro/Holly-AI/genspark_ai_developer/services/kokoro-tts/oracle-setup.sh | bash
#
# After this script:
#   - Kokoro TTS runs on port 8880 (always-on, starts on reboot)
#   - Add KOKORO_TTS_URL=http://YOUR_ORACLE_IP:8880 to Vercel env vars
# ============================================================================

set -e
echo "========================================"
echo " HOLLY Kokoro TTS — Oracle ARM Setup"
echo "========================================"

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/6] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y python3 python3-pip wget curl git espeak-ng ffmpeg

# ── 2. Python packages ────────────────────────────────────────────────────────
echo "[2/6] Installing Python packages (kokoro-onnx, fastapi, uvicorn)..."
pip3 install --quiet kokoro-onnx soundfile fastapi uvicorn pydantic

# ── 3. Download Kokoro model files ────────────────────────────────────────────
echo "[3/6] Downloading Kokoro model files (~340MB total)..."
mkdir -p ~/kokoro-tts && cd ~/kokoro-tts

if [ ! -f "kokoro-v1.0.onnx" ]; then
  wget -q --show-progress \
    https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
fi

if [ ! -f "voices-v1.0.bin" ]; then
  wget -q --show-progress \
    https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
fi

echo "Model files:"
ls -lh kokoro-v1.0.onnx voices-v1.0.bin

# ── 4. Copy the server.py ─────────────────────────────────────────────────────
echo "[4/6] Downloading server.py..."
wget -q -O ~/kokoro-tts/server.py \
  https://raw.githubusercontent.com/iamhollywoodpro/Holly-AI/genspark_ai_developer/services/kokoro-tts/server.py

# ── 5. Create systemd service (auto-start on reboot) ─────────────────────────
echo "[5/6] Creating systemd service..."
sudo tee /etc/systemd/system/kokoro-tts.service > /dev/null << EOF
[Unit]
Description=HOLLY Kokoro TTS Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/kokoro-tts
ExecStart=$(which python3) /home/$USER/kokoro-tts/server.py
Restart=always
RestartSec=5
Environment=PORT=8880
Environment=KOKORO_VOICE=af_heart

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kokoro-tts
sudo systemctl start kokoro-tts

# ── 6. Open firewall port 8880 ────────────────────────────────────────────────
echo "[6/6] Opening firewall port 8880..."
# Ubuntu UFW (if active)
sudo ufw allow 8880/tcp 2>/dev/null || true
# Oracle's iptables rules (required for OCI instances)
sudo iptables -I INPUT -p tcp --dport 8880 -j ACCEPT
# Make iptables rule persist across reboots
sudo apt-get install -y iptables-persistent -qq 2>/dev/null || true
sudo netfilter-persistent save 2>/dev/null || true

# ── Done ──────────────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")

echo ""
echo "========================================"
echo " ✅ HOLLY Kokoro TTS is running!"
echo "========================================"
echo ""
echo " Service status: sudo systemctl status kokoro-tts"
echo " View logs:      sudo journalctl -u kokoro-tts -f"
echo ""
echo " Health check:   http://${PUBLIC_IP}:8880/health"
echo " TTS endpoint:   http://${PUBLIC_IP}:8880/v1/audio/speech"
echo ""
echo " ─── Add this to Vercel env vars ────────"
echo " KOKORO_TTS_URL=http://${PUBLIC_IP}:8880"
echo " KOKORO_VOICE=af_heart"
echo " ─────────────────────────────────────────"
echo ""
echo " Test it now:"
echo "   curl -X POST http://${PUBLIC_IP}:8880/v1/audio/speech \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"input\":\"Hello from HOLLY!\",\"voice\":\"af_heart\"}' \\"
echo "     --output test.wav && aplay test.wav"
echo ""
