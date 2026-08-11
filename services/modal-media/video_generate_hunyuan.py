#!/usr/bin/env python3
"""
HOLLY Modal Video Generation Service — HunyuanVideo 1.5 I2V
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  HunyuanVideo-1.5 (Tencent, 8.3B params, tencent-hunyuan-community license)
GPU:    NVIDIA A10G (24 GB VRAM)
Purpose: Image-to-video with identity preservation (better faces than Wan2.2-5B)

Why HunyuanVideo 1.5 alongside Wan2.2-TI2V-5B:
  - Wan2.2-5B produced distorted faces on motion (I2V test 2026-08-11).
  - HunyuanVideo 1.5 is 8.3B params (66% larger), designed for consumer GPUs
    (min 14GB VRAM with offloading), and its I2V pipeline is specifically
    built to be identity-preserving (holds the face from frame 1).
  - Sources: GitHub Tencent-Hunyuan/HunyuanVideo-1.5, SiliconFlow photorealism
    comparison, WillItRunAI VRAM guide.
  - Same GPU tier (A10G 24GB), same cost (~$0.31/hr). No budget increase.

This endpoint is for A/B testing against Wan2.2. It does NOT replace Wan2.2 —
both run side-by-side. Once Steve compares quality, the winner stays.

Memory strategy on A10G (24GB):
  - enable_model_cpu_offload() (same as Wan2.2)
  - vae.enable_tiling() for decode phase
  - BF16 native dtype (no forced FP8)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import modal

app = modal.App("holly-video-hunyuan")

# Using STEP-DISTILLED 480p variant — purpose-built for 24GB consumer GPUs.
# The full 480p I2V OOMs on A10G 24GB (8.3B BF16 = 17GB + VAE decode > 22GB usable),
# and sequential_cpu_offload hits a meta-device incompatibility bug.
# The step-distilled variant generates in 8-12 steps (vs 30-50), reducing peak
# VRAM pressure. Tencent built this specifically for RTX 4090 (24GB) — "a single
# RTX 4090 can generate videos within 75 seconds" per their Dec 2025 release notes.
HUNYUAN_MODEL = "hunyuanvideo-community/HunyuanVideo-1.5-Diffusers-480p_i2v_distilled"
MODEL_CACHE = "/model-cache"


def download_weights():
    from huggingface_hub import snapshot_download
    print(f"📥 Downloading {HUNYUAN_MODEL} weights (8.3B BF16)...")
    snapshot_download(
        repo_id=HUNYUAN_MODEL,
        local_dir=MODEL_CACHE,
        ignore_patterns=["*.md", "*.txt", "*.json.bak", "original/*"],
    )
    print(f"✅ {HUNYUAN_MODEL} weights downloaded")


# Same proven dependency stack as the Wan2.2 endpoint (which works):
# - torch 2.6.0+cu124 (NOT cu130 — cu130 produces degraded output on Ampere)
# - diffusers >=0.35.1 (HunyuanVideo 1.5 support landed in 0.38.0+)
# - transformers <=4.51.3 (Wan2.2 official pin; compatible with HunyuanVideo)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.6.0+cu124",
        "torchvision==0.21.0+cu124",
        "torchaudio==2.6.0+cu124",
        extra_options="--index-url https://download.pytorch.org/whl/cu124",
    )
    .pip_install(
        # HunyuanVideo 1.5 pipeline support landed in diffusers 0.38.0
        # (release notes: "We added modular support for LTX-2 and Hunyuan 1.5").
        # The class HunyuanVideo15ImageToVideoPipeline is in the
        # hunyuan_video1_5/ submodule, added in 0.38.0.
        # NOTE: transformers 4.57.1 is required (Qwen2.5-VL text encoder).
        # This differs from the Wan2.2 endpoint (transformers<=4.51.3) —
        # separate endpoints have separate images, no conflict.
        "diffusers>=0.38.0,<0.40",
        "transformers==4.57.1",
        "accelerate>=1.1.1",
        "sentencepiece",
        "protobuf",
        "ftfy",
        "easydict",
        "einops",
        "imageio[ffmpeg]",
        "imageio-ffmpeg",
        "pillow",
        "numpy<2.0",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.26.0",
        "qwen-vl-utils",
    )
    # Reduce CUDA memory fragmentation (PyTorch recommendation for tight VRAM)
    .env({"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True"})
    .run_function(
        download_weights,
        timeout=1800,
    )
)


@app.cls(
    image=image,
    gpu="A10G",
    max_containers=1,
    scaledown_window=300,
    timeout=900,
    startup_timeout=900,
    # 32GB hit SIGKILL 137 (OOM). The 8.3B model in system RAM during CPU
    # offload + frame generation tensors needs more headroom.
    memory=65536,
)
class HollyHunyuanVideo:

    @modal.enter()
    def load_model(self):
        import torch
        # ftfy import must happen before pipeline load (same diffusers bug as Wan I2V)
        import ftfy  # noqa: F401
        from diffusers import HunyuanVideo15ImageToVideoPipeline

        print(f"📥 Loading {HUNYUAN_MODEL} (BF16, distilled)...")
        self.pipe = HunyuanVideo15ImageToVideoPipeline.from_pretrained(
            MODEL_CACHE,
            torch_dtype=torch.bfloat16,
        )
        # Distilled model runs 8-12 steps (not 30-50), which reduces peak VRAM
        # during inference enough to fit A10G 24GB with model_cpu_offload.
        # (sequential_cpu_offload hits a meta-device bug with this pipeline.)
        self.pipe.enable_model_cpu_offload()
        if hasattr(self.pipe, 'vae') and hasattr(self.pipe.vae, 'enable_tiling'):
            self.pipe.vae.enable_tiling()
        if hasattr(self.pipe, 'vae') and hasattr(self.pipe.vae, 'enable_slicing'):
            self.pipe.vae.enable_slicing()

        print(f"✅ {HUNYUAN_MODEL} loaded on A10G")

    @modal.fastapi_endpoint(method="POST", label="hunyuan-i2v")
    def generate_i2v(self, request: dict):
        """Image-to-video using HunyuanVideo 1.5.

        Request body:
            image_url: str  — URL or base64 data URI of the image to animate
            prompt: str     — motion description
            duration: float — seconds (default 3, max 5)
            fps: int        — output fps (default 24)
            seed: int       — optional
        """
        import torch
        import tempfile
        import imageio
        import numpy as np
        import io as _io
        import base64 as _b64
        from fastapi.responses import Response

        image_url = (request.get("image_url") or "").strip()
        prompt = (request.get("prompt") or "").strip()
        duration = min(float(request.get("duration", 3.0)), 5.0)
        fps = int(request.get("fps", 24))
        seed = request.get("seed")
        negative_prompt = request.get(
            "negative_prompt",
            "low quality, blurry, distorted, watermark, static, no motion, deformed",
        )

        if not image_url:
            return Response(
                content=b'{"error":"image_url is required"}',
                media_type="application/json",
                status_code=400,
            )

        # Load input image (handle base64 data URIs + HTTP URLs)
        from PIL import Image as _PIL
        if image_url.startswith("data:"):
            header, b64data = image_url.split(",", 1)
            input_img = _PIL.open(_io.BytesIO(_b64.b64decode(b64data))).convert("RGB")
        else:
            from diffusers.utils import load_image
            input_img = load_image(image_url)

        # HunyuanVideo 1.5 at 480p (832x480 landscape or 480x832 portrait).
        # 720p OOMs on A10G 24GB — 480p is the comfortable tier.
        orig_w, orig_h = input_img.size
        if orig_w >= orig_h:
            width, height = 832, 480
        else:
            width, height = 480, 832
        input_img = input_img.resize((width, height), _PIL.LANCZOS)

        raw_frames = int(duration * fps)
        # HunyuanVideo VAE needs num_frames = 4k+1
        num_frames = min(((raw_frames // 4) * 4) + 1, 121)
        actual_dur = num_frames / fps
        print(f"🎬 Hunyuan I2V: {orig_w}x{orig_h} → {width}x{height} | "
              f"\"{prompt[:60]}\" | {actual_dur:.1f}s @ {fps}fps | {num_frames} frames")

        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            # HunyuanVideo 1.5 I2V does NOT accept guidance_scale (uses internal
            # guidance like distilled models). API differs from Wan2.2.
            result = self.pipe(
                image=input_img,
                prompt=prompt or "subtle natural motion, gentle movement",
                negative_prompt=negative_prompt,
                num_frames=num_frames,
                num_inference_steps=12,  # distilled model: 8-12 steps recommended
                generator=generator,
            )

        frames = result.frames[0]
        np_frames = []
        for f in frames:
            arr = np.array(f)
            if arr.dtype != np.uint8:
                arr = (arr * 255).clip(0, 255).astype(np.uint8)
            np_frames.append(arr)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        imageio.mimwrite(
            tmp_path, np_frames, fps=fps, codec="libx264",
            output_params=["-crf", "20", "-preset", "medium"],
        )

        with open(tmp_path, "rb") as f:
            video_bytes = f.read()
        os.unlink(tmp_path)

        print(f"✅ Hunyuan I2V {actual_dur:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model": HUNYUAN_MODEL,
                "X-Mode": "image-to-video",
                "X-Provider": "modal",
                "X-Engine": "hunyuan-1.5",
                "X-Duration": str(round(actual_dur, 2)),
                "X-FPS": str(fps),
                "X-Width": str(width),
                "X-Height": str(height),
                "X-Licence": "tencent-hunyuan-community",
                "Access-Control-Allow-Origin": "*",
            },
        )

    @modal.fastapi_endpoint(method="GET", label="hunyuan-health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            {
                "status": "healthy",
                "model": HUNYUAN_MODEL,
                "gpu": "A10G",
                "engine": "HunyuanVideo-1.5 (8.3B)",
                "licence": "tencent-hunyuan-community",
                "mode": "image-to-video",
                "cost": "~$0.02/video (A10G, ~120s at 30 steps)",
                "version": "1.0.0-hunyuan",
            }
        )


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/video_generate_hunyuan.py")
    print("  (deploy to iamdoregosteve workspace)")
    print("I2V:    https://iamdoregosteve--hunyuan-i2v.modal.run")
    print("Health: https://iamdoregosteve--hunyuan-health.modal.run")
