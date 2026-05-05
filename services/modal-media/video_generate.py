#!/usr/bin/env python3
"""
HOLLY Modal Video Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  CogVideoX-5B (THUDM, Apache-2.0, no HF token required)
GPU:    NVIDIA A10G (24 GB VRAM)
Cost:   ~$0.000306/s | ~90s/video → ~$0.028/video
Free:   $30/mo Modal credits → ~1,000 videos/month FREE (at ≤20/day)

Key design:
  - Weights downloaded at IMAGE BUILD TIME (baked in, no download on cold start)
  - Cold start = load weights to GPU (~30s), no network I/O
  - scaledown_window=300 keeps container warm 5 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("holly-video-generate")

COGVIDEO_MODEL = "THUDM/CogVideoX-5b"
MODEL_CACHE    = "/model-cache"

# ─── Download weights at BUILD TIME ───────────────────────────────────────────

def download_weights():
    from huggingface_hub import snapshot_download
    print(f"📥 Downloading {COGVIDEO_MODEL} weights (Apache-2.0, no token)...")
    snapshot_download(
        repo_id=COGVIDEO_MODEL,
        local_dir=MODEL_CACHE,
        ignore_patterns=["*.md", "*.txt", "original/*"],
    )
    print("✅ CogVideoX-5B weights downloaded")


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.5.1",
        "torchvision",
        "torchaudio",
        "diffusers==0.31.0",
        "transformers==4.46.3",
        "accelerate==0.34.2",
        "sentencepiece",
        "protobuf",
        "imageio[ffmpeg]",
        "imageio-ffmpeg",
        "pillow",
        "numpy",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.25.0",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    # Bake weights into the image at build time — cold start needs no download
    .run_function(
        download_weights,
        timeout=1200,   # 20 min — CogVideoX-5B is ~35GB
    )
)

# ─── Inference class ──────────────────────────────────────────────────────────

@app.cls(
    image=image,
    gpu="A10G",
    max_containers=1,        # ⚠️ CRITICAL: never spin up more than 1 GPU
    scaledown_window=30,    # warm for 5 min between requests
    timeout=600,             # 10 min max per video
    startup_timeout=900,     # 15 min startup — covers first weight download
)
class HollyVideoGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import CogVideoXPipeline

        print(f"📥 Loading CogVideoX-5B from {MODEL_CACHE}...")
        self.pipe = CogVideoXPipeline.from_pretrained(
            MODEL_CACHE,
            torch_dtype=torch.bfloat16,
            local_files_only=True,
        )
        self.pipe = self.pipe.to("cuda")
        self.pipe.enable_model_cpu_offload()
        self.pipe.vae.enable_slicing()
        self.pipe.vae.enable_tiling()
        print("✅ CogVideoX-5B loaded on A10G GPU")

    @modal.fastapi_endpoint(method="POST", label="video-generate")
    def generate(self, request: dict):
        import torch
        import tempfile
        import imageio
        import numpy as np
        from fastapi.responses import Response

        prompt     = (request.get("prompt") or "").strip()
        duration   = min(float(request.get("duration", 5.0)), 10.0)
        fps        = int(request.get("fps", 8))
        width      = min(int(request.get("width",  480)), 720)
        height     = min(int(request.get("height", 320)), 480)
        steps      = min(int(request.get("num_inference_steps", 50)), 50)
        seed       = request.get("seed")

        if not prompt:
            return Response(
                content=b'{"error":"prompt is required"}',
                media_type="application/json", status_code=400,
            )

        num_frames = min(int(duration * fps), 49)
        actual_dur = num_frames / fps
        print(f"🎬 {prompt[:80]} | {num_frames}f @ {fps}fps = {actual_dur:.1f}s | {width}x{height}")

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

        frames    = result.frames[0]
        np_frames = [np.array(f) for f in frames]

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        imageio.mimwrite(tmp_path, np_frames, fps=fps, codec="libx264",
                         output_params=["-crf", "23", "-preset", "fast"])

        with open(tmp_path, "rb") as f:
            video_bytes = f.read()
        os.unlink(tmp_path)

        print(f"✅ {actual_dur:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model":    "CogVideoX-5B",
                "X-Provider": "modal",
                "X-Duration": str(round(actual_dur, 2)),
                "X-FPS":      str(fps),
                "X-Width":    str(width),
                "X-Height":   str(height),
                "X-Licence":  "Apache-2.0",
                "Access-Control-Allow-Origin": "*",
            },
        )

    @modal.fastapi_endpoint(method="GET", label="video-health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status":     "healthy",
            "model":      COGVIDEO_MODEL,
            "gpu":        "A10G",
            "licence":    "Apache-2.0",
            "cost":       "~$0.028/video (A10G @$0.000306/s, ~90s inference)",
            "free_quota": "$30/mo → ~1,000 videos/mo free (at ≤20/day)",
            "version":    "2.0.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/video_generate.py")
    print("Endpoint: https://iamhollywoodpro--video-generate.modal.run")
