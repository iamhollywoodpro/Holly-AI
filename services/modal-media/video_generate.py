#!/usr/bin/env python3
"""
HOLLY Modal Video Generation Service — Wan2.2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  Wan2.2-T2V-A14B (Alibaba, Apache-2.0)
GPU:    NVIDIA A10G (24 GB VRAM)
Cost:   ~$0.000306/s | ~180s/video → ~$0.055/video
Free:   $30/mo Modal credits → ~545 videos/month FREE

Wan2.2 advantages over CogVideoX-5B:
  - MoE (Mixture-of-Experts) architecture = better quality
  - 720P resolution (vs CogVideoX 480P)
  - 16fps output (vs CogVideoX 8fps)
  - Cinematic motion quality
  - Better prompt adherence

Memory management on A10G (24GB):
  - FP8 quantization reduces 14B model to ~14GB
  - CPU offloading for text encoder (T5)
  - VAE slicing + tiling for decode
  - Total fits in 24GB with offloading
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-video-generate")

WAN_MODEL = "Wan-AI/Wan2.2-T2V-A14B"
MODEL_CACHE = "/model-cache"

# Use FP8 version for A10G (24GB) compatibility
# Full BF16 A14B needs 60GB+ VRAM. FP8 fits in 24GB.
WAN_FP8_MODEL = "Wan-AI/Wan2.2-T2V-A14B-FP8"


def download_weights():
    from huggingface_hub import snapshot_download
    print(f"📥 Downloading {WAN_FP8_MODEL} weights (Apache-2.0, FP8 for A10G)...")
    snapshot_download(
        repo_id=WAN_FP8_MODEL,
        local_dir=MODEL_CACHE,
        ignore_patterns=["*.md", "*.txt", "*.json.bak", "original/*"],
    )
    print("✅ Wan2.2-T2V-A14B-FP8 weights downloaded")


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.5.1",
        "torchvision",
        "torchaudio",
        "diffusers>=0.32.0",  # Wan2.2 needs diffusers 0.32+
        "transformers>=4.46.3",
        "accelerate>=0.34.0",
        "sentencepiece",
        "protobuf",
        "imageio[ffmpeg]",
        "imageio-ffmpeg",
        "pillow",
        "numpy<2.0",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.26.0",
        "bitsandbytes>=0.44.0",  # FP8 quantization support
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .run_function(
        download_weights,
        timeout=1800,  # 30 min — Wan2.2 FP8 is ~14GB download
    )
)


@app.cls(
    image=image,
    gpu="A10G",
    max_containers=1,        # never spin up more than 1 GPU
    scaledown_window=300,    # warm 5 min between requests
    timeout=900,             # 15 min max per video
    startup_timeout=900,     # 15 min startup
    memory=32768,            # 32GB system RAM for offloading
)
class HollyVideoGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import AutoencoderKLWan, WanPipeline
        from transformers import T5EncoderModel

        print(f"📥 Loading Wan2.2-T2V-A14B-FP8 from {MODEL_CACHE}...")

        # Load components separately for memory management
        # T5 text encoder offloaded to CPU (saves VRAM)
        text_encoder = T5EncoderModel.from_pretrained(
            MODEL_CACHE,
            subfolder="text_encoder",
            torch_dtype=torch.float8_e4m3fn,  # FP8 for memory
            device_map="cpu",  # Keep on CPU, move to GPU only for encoding
        )

        # VAE
        vae = AutoencoderKLWan.from_pretrained(
            MODEL_CACHE,
            subfolder="vae",
            torch_dtype=torch.float8_e4m3fn,
        )

        # Main pipeline
        self.pipe = WanPipeline.from_pretrained(
            MODEL_CACHE,
            text_encoder=text_encoder,
            vae=vae,
            torch_dtype=torch.float8_e4m3fn,
        )
        self.pipe = self.pipe.to("cuda")

        # Memory optimization
        self.pipe.enable_model_cpu_offload()
        if hasattr(self.pipe.vae, 'enable_slicing'):
            self.pipe.vae.enable_slicing()
        if hasattr(self.pipe.vae, 'enable_tiling'):
            self.pipe.vae.enable_tiling()

        print("✅ Wan2.2-T2V-A14B-FP8 loaded on A10G GPU")

    @modal.fastapi_endpoint(method="POST", label="video-generate")
    def generate(self, request: dict):
        import torch
        import tempfile
        import imageio
        import numpy as np
        from fastapi.responses import Response

        prompt = (request.get("prompt") or "").strip()
        duration = min(float(request.get("duration", 5.0)), 8.0)
        fps = int(request.get("fps", 16))  # Wan2.2 outputs 16fps
        width = min(int(request.get("width", 1280)), 1280)
        height = min(int(request.get("height", 720)), 720)
        steps = min(int(request.get("num_inference_steps", 30)), 40)  # Wan2.2 uses fewer steps
        seed = request.get("seed")
        negative_prompt = request.get("negative_prompt", "low quality, blurry, distorted, watermark")

        if not prompt:
            return Response(
                content=b'{"error":"prompt is required"}',
                media_type="application/json", status_code=400,
            )

        # Wan2.2 frame calculation
        num_frames = min(int(duration * fps), 121)  # Wan2.2 max ~121 frames
        actual_dur = num_frames / fps
        print(f"🎬 {prompt[:80]} | {num_frames}f @ {fps}fps = {actual_dur:.1f}s | {width}x{height}")

        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            result = self.pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=steps,
                guidance_scale=5.0,  # Wan2.2 recommended CFG
                generator=generator,
            )

        frames = result.frames[0]
        np_frames = [np.array(f) for f in frames]

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        imageio.mimwrite(tmp_path, np_frames, fps=fps, codec="libx264",
                         output_params=["-crf", "20", "-preset", "medium"])  # Higher quality CRF

        with open(tmp_path, "rb") as f:
            video_bytes = f.read()
        os.unlink(tmp_path)

        print(f"✅ {actual_dur:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model": "Wan2.2-T2V-A14B-FP8",
                "X-Provider": "modal",
                "X-Duration": str(round(actual_dur, 2)),
                "X-FPS": str(fps),
                "X-Width": str(width),
                "X-Height": str(height),
                "X-Licence": "Apache-2.0",
                "Access-Control-Allow-Origin": "*",
            },
        )

    @modal.fastapi_endpoint(method="GET", label="video-health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status": "healthy",
            "model": WAN_FP8_MODEL,
            "gpu": "A10G",
            "licence": "Apache-2.0",
            "cost": "~$0.055/video (A10G @$0.000306/s, ~180s inference)",
            "free_quota": "$30/mo → ~545 videos/mo free (at ≤18/day)",
            "version": "3.0.0",
            "upgraded_from": "CogVideoX-5B → Wan2.2-T2V-A14B-FP8",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/video_generate.py")
    print("Endpoint: https://iamdoregosteve--video-generate.modal.run")
    print("Health: https://iamdoregosteve--video-health.modal.run")
