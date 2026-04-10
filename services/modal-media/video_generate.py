#!/usr/bin/env python3
"""
HOLLY Modal Video Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:   CogVideoX-5B  (THUDM, Apache-2.0 — no token required, fully open)
GPU:     NVIDIA A10G (24GB VRAM) — minimum GPU for CogVideoX-5B
Cost:    ~$0.000306/s | ~90s/video → ~$0.028/video
Free:    $30/mo Modal credits → ~1,000 videos/month (at ≤30 vids/day)

Quality vs current Pollinations:
  Pollinations (LTX-Video):  Decent, experimental, no GPU control
  CogVideoX-5B (this):       Excellent — cinematic motion, 720p capable, T2V + I2V

Deploy:
    modal deploy services/modal-media/video_generate.py

After deploy Modal prints your endpoint URL, e.g.:
    https://iamhollywoodpro--holly-video-generate.modal.run

Set in Coolify env:
    MODAL_VIDEO_URL=https://iamhollywoodpro--holly-video-generate.modal.run

No HuggingFace token required — CogVideoX-5B is fully open (Apache-2.0).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST BREAKDOWN (A10G, $0.000306/s = $1.10/hr):
  • Cold start:    ~60s  → $0.018 (first request, weights cached in volume after that)
  • Warm inference (5s video): ~90s → $0.028/video
  • 20 videos/day → $0.56/day → $17/month  ← within $30 free
  • 30+ videos/day may approach the $30 limit — monitor usage!

⚠️  IMPORTANT: Set a spend alert on Modal account settings:
    https://modal.com/settings  → Billing → Spend alerts
    Recommend: alert at $25/mo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("holly-video-generate")

# ─── Container image ──────────────────────────────────────────────────────────

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.4.1",
        "torchvision",
        "torchaudio",
        "diffusers>=0.30.0",
        "transformers>=4.44.0",
        "accelerate>=0.34.0",
        "sentencepiece",
        "protobuf",
        "imageio[ffmpeg]",
        "imageio-ffmpeg",
        "pillow",
        "numpy",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.25.0",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu121",
    )
)

# ─── Model weights volume (avoids re-downloading — first load takes ~5 min) ───

weights_vol    = modal.Volume.from_name("holly-cogvideo-weights", create_if_missing=True)
MODEL_CACHE    = "/models"
COGVIDEO_MODEL = "THUDM/CogVideoX-5b"   # Apache-2.0, no token required

# ─── Inference class ──────────────────────────────────────────────────────────

@app.cls(
    image=image,
    gpu="A10G",                   # 24GB VRAM — minimum for CogVideoX-5B
    volumes={MODEL_CACHE: weights_vol},
    scaledown_window=300,          # stay warm 5 min (cold start is ~60s)
    timeout=600,                  # max 10 min per video generation
    # No HF secret needed — CogVideoX-5B is fully open
)
class HollyVideoGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import CogVideoXPipeline

        print(f"📥 Loading {COGVIDEO_MODEL} (first load ~5 min, cached after)...")

        self.pipe = CogVideoXPipeline.from_pretrained(
            COGVIDEO_MODEL,
            torch_dtype=torch.bfloat16,
            cache_dir=MODEL_CACHE,
        )
        self.pipe = self.pipe.to("cuda")
        self.pipe.enable_model_cpu_offload()   # fits 24GB VRAM efficiently
        self.pipe.vae.enable_slicing()
        self.pipe.vae.enable_tiling()

        print(f"✅ {COGVIDEO_MODEL} loaded on A10G GPU")

    @modal.fastapi_endpoint(method="POST", label="video-generate")
    def generate(self, request: dict):
        import torch
        import tempfile
        import imageio
        import numpy as np
        from fastapi.responses import Response

        prompt      = (request.get("prompt") or "").strip()
        duration    = min(float(request.get("duration", 5.0)), 10.0)   # max 10s
        fps         = int(request.get("fps", 8))
        width       = min(int(request.get("width",  480)), 720)
        height      = min(int(request.get("height", 320)), 480)
        steps       = min(int(request.get("num_inference_steps", 50)), 50)
        seed        = request.get("seed")

        if not prompt:
            return Response(
                content=b'{"error":"prompt is required"}',
                media_type="application/json",
                status_code=400,
            )
        if len(prompt) > 2000:
            return Response(
                content=b'{"error":"prompt too long (max 2000 chars)"}',
                media_type="application/json",
                status_code=400,
            )

        # CogVideoX-5B max 49 frames
        num_frames = min(int(duration * fps), 49)
        actual_duration = num_frames / fps

        print(f"🎬 Generating video: {prompt[:80]}...")
        print(f"   {num_frames} frames @ {fps}fps = {actual_duration:.1f}s | {width}x{height}")

        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            result = self.pipe(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=steps,
                guidance_scale=6.0,
                generator=generator,
            )

        # Export frames to MP4 via imageio
        frames     = result.frames[0]   # list of PIL images
        np_frames  = [np.array(f) for f in frames]

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        imageio.mimwrite(
            tmp_path,
            np_frames,
            fps=fps,
            codec="libx264",
            output_params=["-crf", "23", "-preset", "fast"],
        )

        with open(tmp_path, "rb") as f:
            video_bytes = f.read()

        os.unlink(tmp_path)

        print(f"✅ {actual_duration:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model":     "CogVideoX-5B",
                "X-Provider":  "modal",
                "X-Duration":  str(round(actual_duration, 2)),
                "X-FPS":       str(fps),
                "X-Width":     str(width),
                "X-Height":    str(height),
                "X-Licence":   "Apache-2.0",
                "Access-Control-Allow-Origin": "*",
            },
        )

    @modal.fastapi_endpoint(method="GET", label="video-health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status":   "healthy",
            "model":    COGVIDEO_MODEL,
            "gpu":      "A10G",
            "licence":  "Apache-2.0",
            "cost":     "~$0.028/video (A10G @$0.000306/s, ~90s inference)",
            "free":     "$30/mo credits → ~1,000 videos/mo (≤20/day to stay free)",
            "warning":  "Monitor spend at https://modal.com/settings → Billing",
            "no_token": "CogVideoX-5B is fully open — no HuggingFace token needed",
            "version":  "1.1.0",
        })


# ─── Local test ───────────────────────────────────────────────────────────────

@app.local_entrypoint()
def test():
    """Quick local test — run with: modal run services/modal-media/video_generate.py"""
    print("Holly Video Generator — check Modal dashboard for endpoint URL after deploy")
    print("Deploy with: modal deploy services/modal-media/video_generate.py")
