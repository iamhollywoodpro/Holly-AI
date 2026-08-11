#!/usr/bin/env python3
"""
HOLLY Modal Video Generation Service — HunyuanVideo 1.5 (Unified)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  HunyuanVideo-1.5 (Tencent, 8.3B params, tencent-hunyuan-community)
GPU:    NVIDIA A10G (24 GB VRAM)
Modes:  T2V (text-to-video) + I2V (image-to-video, identity-preserving)

This REPLACES the Wan2.2 endpoint entirely. HunyuanVideo 1.5 won the A/B test
(2026-08-11) for face identity preservation. Using one model for both T2V and
I2V simplifies the stack — no more two-model confusion.

Both modes use the STEP-DISTILLED 480p variants (purpose-built for 24GB GPUs).
The full (non-distilled) models OOM on A10G 24GB.

T2V endpoint: POST hunyuan-t2v  → {prompt, duration, fps, seed}
I2V endpoint: POST hunyuan-i2v  → {image_url, prompt, duration, fps, seed}

Memory strategy on A10G (24GB):
  - enable_model_cpu_offload() (sequential_cpu_offload hits a meta-device bug)
  - vae.enable_tiling() + enable_slicing()
  - 64GB system RAM (32GB SIGKILL'd during frame generation)
  - expandable_segments for CUDA fragmentation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import modal

app = modal.App("holly-video-hunyuan")

# Step-distilled 480p variants — purpose-built for 24GB consumer GPUs.
# Distilled = 8-12 steps (vs 30-50), which keeps peak VRAM under 24GB.
T2V_MODEL = "hunyuanvideo-community/HunyuanVideo-1.5-Diffusers-480p_t2v_distilled"
I2V_MODEL = "hunyuanvideo-community/HunyuanVideo-1.5-Diffusers-480p_i2v_distilled"
T2V_CACHE = "/t2v-cache"
I2V_CACHE = "/i2v-cache"


def download_weights():
    from huggingface_hub import snapshot_download
    print(f"📥 Downloading {T2V_MODEL} weights...")
    snapshot_download(
        repo_id=T2V_MODEL,
        local_dir=T2V_CACHE,
        ignore_patterns=["*.md", "*.txt", "*.json.bak", "original/*"],
    )
    print(f"✅ {T2V_MODEL} downloaded")
    print(f"📥 Downloading {I2V_MODEL} weights...")
    snapshot_download(
        repo_id=I2V_MODEL,
        local_dir=I2V_CACHE,
        ignore_patterns=["*.md", "*.txt", "*.json.bak", "original/*"],
    )
    print(f"✅ {I2V_MODEL} downloaded")


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        # torch cu124 pinned — cu130 produces degraded output on Ampere (A10G).
        "torch==2.6.0+cu124",
        "torchvision==0.21.0+cu124",
        "torchaudio==2.6.0+cu124",
        extra_options="--index-url https://download.pytorch.org/whl/cu124",
    )
    .pip_install(
        # HunyuanVideo 1.5 pipeline classes landed in diffusers 0.38.0.
        # transformers 4.57.1 required (Qwen2.5-VL text encoder).
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
    .env({"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True"})
    .run_function(
        download_weights,
        timeout=2400,  # 40 min — two ~8.5GB model downloads
    )
)


@app.cls(
    image=image,
    gpu="A10G",
    max_containers=1,
    scaledown_window=300,
    timeout=900,
    startup_timeout=900,
    memory=65536,  # 32GB SIGKILL'd; 64GB is safe
)
class HollyHunyuanVideo:

    @modal.enter()
    def startup(self):
        """Lazily load pipelines on first use (saves VRAM at startup).
        Each pipeline is ~17GB in BF16 — loading both at once would OOM."""
        self.t2v_pipe = None
        self.i2v_pipe = None
        print("✅ HunyuanVideo container ready (pipelines load on first request)")

    def _ensure_t2v(self):
        if self.t2v_pipe is not None:
            return self.t2v_pipe
        import torch
        import ftfy  # noqa: F401 — diffusers uses ftfy but imports it conditionally
        from diffusers import HunyuanVideo15Pipeline
        print(f"📥 Loading T2V pipeline ({T2V_MODEL})...")
        self.t2v_pipe = HunyuanVideo15Pipeline.from_pretrained(
            T2V_CACHE, torch_dtype=torch.bfloat16,
        )
        self.t2v_pipe.enable_model_cpu_offload()
        if hasattr(self.t2v_pipe, 'vae'):
            if hasattr(self.t2v_pipe.vae, 'enable_tiling'):
                self.t2v_pipe.vae.enable_tiling()
            if hasattr(self.t2v_pipe.vae, 'enable_slicing'):
                self.t2v_pipe.vae.enable_slicing()
        # Unload I2V if loaded to free VRAM (can't hold both at once)
        if self.i2v_pipe is not None:
            del self.i2v_pipe
            self.i2v_pipe = None
        print("✅ T2V pipeline loaded")
        return self.t2v_pipe

    def _ensure_i2v(self):
        if self.i2v_pipe is not None:
            return self.i2v_pipe
        import torch
        import ftfy  # noqa: F401
        from diffusers import HunyuanVideo15ImageToVideoPipeline
        print(f"📥 Loading I2V pipeline ({I2V_MODEL})...")
        self.i2v_pipe = HunyuanVideo15ImageToVideoPipeline.from_pretrained(
            I2V_CACHE, torch_dtype=torch.bfloat16,
        )
        self.i2v_pipe.enable_model_cpu_offload()
        if hasattr(self.i2v_pipe, 'vae'):
            if hasattr(self.i2v_pipe.vae, 'enable_tiling'):
                self.i2v_pipe.vae.enable_tiling()
            if hasattr(self.i2v_pipe.vae, 'enable_slicing'):
                self.i2v_pipe.vae.enable_slicing()
        # Unload T2V if loaded to free VRAM
        if self.t2v_pipe is not None:
            del self.t2v_pipe
            self.t2v_pipe = None
        print("✅ I2V pipeline loaded")
        return self.i2v_pipe

    def _encode_video(self, frames, fps):
        """Shared: encode frame list to MP4 bytes."""
        import tempfile
        import imageio
        import numpy as np

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
        return video_bytes

    @modal.fastapi_endpoint(method="POST", label="hunyuan-t2v")
    def generate_t2v(self, request: dict):
        """Text-to-video using HunyuanVideo 1.5 Distilled.

        Request body:
            prompt: str     — scene description (required)
            duration: float — seconds (default 3, max 5)
            fps: int        — output fps (default 24)
            seed: int       — optional
        """
        import torch
        from fastapi.responses import Response

        prompt = (request.get("prompt") or "").strip()
        duration = min(float(request.get("duration", 3.0)), 5.0)
        fps = int(request.get("fps", 24))
        seed = request.get("seed")
        negative_prompt = request.get(
            "negative_prompt",
            "low quality, blurry, distorted, watermark, static, deformed",
        )

        if not prompt:
            return Response(
                content=b'{"error":"prompt is required"}',
                media_type="application/json", status_code=400,
            )

        raw_frames = int(duration * fps)
        num_frames = min(((raw_frames // 4) * 4) + 1, 121)
        actual_dur = num_frames / fps
        width, height = 832, 480  # 480p landscape

        print(f"🎬 Hunyuan T2V: \"{prompt[:60]}\" | "
              f"{actual_dur:.1f}s @ {fps}fps | {num_frames} frames")

        pipe = self._ensure_t2v()
        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=12,  # distilled: 8-12 steps
                generator=generator,
            )

        video_bytes = self._encode_video(result.frames[0], fps)
        print(f"✅ Hunyuan T2V {actual_dur:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model": T2V_MODEL,
                "X-Mode": "text-to-video",
                "X-Provider": "modal",
                "X-Engine": "hunyuan-1.5-distilled",
                "X-Duration": str(round(actual_dur, 2)),
                "X-FPS": str(fps),
                "X-Width": str(width),
                "X-Height": str(height),
                "X-Licence": "tencent-hunyuan-community",
                "Access-Control-Allow-Origin": "*",
            },
        )

    @modal.fastapi_endpoint(method="POST", label="hunyuan-i2v")
    def generate_i2v(self, request: dict):
        """Image-to-video using HunyuanVideo 1.5 Distilled.

        Request body:
            image_url: str  — URL or base64 data URI of the image to animate
            prompt: str     — motion description
            duration: float — seconds (default 3, max 5)
            fps: int        — output fps (default 24)
            seed: int       — optional
        """
        import torch
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
                media_type="application/json", status_code=400,
            )

        # Load input image (handle base64 data URIs + HTTP URLs)
        from PIL import Image as _PIL
        if image_url.startswith("data:"):
            header, b64data = image_url.split(",", 1)
            input_img = _PIL.open(_io.BytesIO(_b64.b64decode(b64data))).convert("RGB")
        else:
            from diffusers.utils import load_image
            input_img = load_image(image_url)

        # 480p: match aspect ratio
        orig_w, orig_h = input_img.size
        if orig_w >= orig_h:
            width, height = 832, 480
        else:
            width, height = 480, 832
        input_img = input_img.resize((width, height), _PIL.LANCZOS)

        raw_frames = int(duration * fps)
        num_frames = min(((raw_frames // 4) * 4) + 1, 121)
        actual_dur = num_frames / fps
        print(f"🎬 Hunyuan I2V: {orig_w}x{orig_h} → {width}x{height} | "
              f"\"{prompt[:60]}\" | {actual_dur:.1f}s @ {fps}fps")

        pipe = self._ensure_i2v()
        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            result = pipe(
                image=input_img,
                prompt=prompt or "subtle natural motion, gentle movement",
                negative_prompt=negative_prompt,
                num_frames=num_frames,
                num_inference_steps=12,
                generator=generator,
            )

        video_bytes = self._encode_video(result.frames[0], fps)
        print(f"✅ Hunyuan I2V {actual_dur:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model": I2V_MODEL,
                "X-Mode": "image-to-video",
                "X-Provider": "modal",
                "X-Engine": "hunyuan-1.5-distilled",
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
        return JSONResponse({
            "status": "healthy",
            "t2v_model": T2V_MODEL,
            "i2v_model": I2V_MODEL,
            "gpu": "A10G",
            "engine": "HunyuanVideo-1.5 Distilled (8.3B)",
            "licence": "tencent-hunyuan-community",
            "modes": "T2V (hunyuan-t2v) + I2V (hunyuan-i2v)",
            "cost": "~$0.02/video (A10G, ~75-250s at 12 steps distilled)",
            "version": "2.0.0-hunyuan-unified",
            "note": "Replaces Wan2.2 entirely. A/B winner 2026-08-11.",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/video_generate_hunyuan.py")
    print("  (deploy to iamdoregosteve workspace)")
    print("T2V:    https://iamdoregosteve--hunyuan-t2v.modal.run")
    print("I2V:    https://iamdoregosteve--hunyuan-i2v.modal.run")
    print("Health: https://iamdoregosteve--hunyuan-health.modal.run")
