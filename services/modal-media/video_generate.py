#!/usr/bin/env python3
"""
HOLLY Modal Video Generation Service — Wan2.2 TI2V-5B
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  Wan2.2-TI2V-5B (Alibaba, Apache-2.0)
GPU:    NVIDIA A10G (24 GB VRAM)
Cost:   ~$0.000306/s | ~120s/video → ~$0.037/video
Free:   $30/mo Modal credits → ~800 videos/month FREE

Why TI2V-5B (not T2V-A14B):
  - A14B unquantized needs 80GB VRAM. The only official FP8 build
    (nvidia/Wan2.2-T2V-A14B-Diffusers-FP8) targets Blackwell B200 and
    ships a TRTLLM/SGLang CLI, NOT a drop-in diffusers WanPipeline.
    Forcing FP8 via torch.float8_e4m3fn on the BF16 A14B weights is
    unstable and undocumented. (Previous script did this and 401'd
    because Wan-AI never published a T2V-A14B-FP8 repo.)
  - TI2V-5B is EXPLICITLY documented by Wan-AI to run on 24GB VRAM
    (RTX 4090 / A10G) with model CPU offload + T5 on CPU.
    Source: https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B-Diffusers
  - TI2V = Text+Image-to-Video (superset of T2V). Outputs 720P @ 24fps.
    Still a large upgrade over CogVideoX-5B (480P @ 8fps).

Memory strategy on A10G (24GB) — matches Wan-AI's documented recipe:
  - WanPipeline in BF16 (native dtype, do NOT force FP8)
  - enable_model_cpu_offload() — swaps transformer/VAE to GPU by phase
  - enable_vae_tiling() + enable_vae_slicing() for decode phase
  - T5 text encoder runs on CPU during prompt encoding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-video-generate")

# Verified repo (2026-08-10): Wan-AI/Wan2.2-TI2V-5B-Diffusers exists, is
# public, Apache-2.0, and documented to run on 24GB VRAM. The previous
# repo "Wan-AI/Wan2.2-T2V-A14B-FP8" did not exist (401 on snapshot_download).
WAN_MODEL = "Wan-AI/Wan2.2-TI2V-5B-Diffusers"
MODEL_CACHE = "/model-cache"


def download_weights():
    from huggingface_hub import snapshot_download
    print(f"📥 Downloading {WAN_MODEL} weights (Apache-2.0, BF16)...")
    snapshot_download(
        repo_id=WAN_MODEL,
        local_dir=MODEL_CACHE,
        ignore_patterns=["*.md", "*.txt", "*.json.bak", "original/*"],
    )
    print(f"✅ {WAN_MODEL} weights downloaded")


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    # Step 1: Install torch/torchvision/torchaudio pinned to the cu124 build.
    # The local version tag (+cu124) forces pip to grab the CUDA 12.4 wheel
    # specifically. Without it, pip resolves torch>=2.6.0 to the latest PyPI
    # build (2.13.0+cu130 / CUDA 13), which produced severely degraded blocky
    # video output on A10G (Ampere architecture). cu124 is the known-good
    # wheel for Ampere GPUs (A10G/A100).
    .pip_install(
        "torch==2.6.0+cu124",
        "torchvision==0.21.0+cu124",
        "torchaudio==2.6.0+cu124",
        extra_options="--index-url https://download.pytorch.org/whl/cu124",
    )
    # Step 2: Install remaining deps from PyPI (default index). Done as a
    # separate step so torch's cu124 pin from step 1 is preserved.
    # Version pins match the Wan2.2 official requirements.txt + known-good combos:
    #   - transformers <=4.51.3 (official Wan2.2 upper bound; newer versions break
    #     accelerate's _hf_hook → AttributeError on WanTransformer3DModel)
    #   - accelerate 1.6.0 (stable release compatible with torch 2.6 + diffusers 0.35+)
    #   - diffusers >=0.35.1 (includes VAE patches fix PR #12041 for sharp output)
    .pip_install(
        "diffusers>=0.35.1,<0.40",
        "transformers>=4.49.0,<=4.51.3",
        "accelerate>=1.1.1,<=1.6.0",
        "sentencepiece",
        "protobuf",
        "ftfy",           # required by WanImageToVideoPipeline for prompt cleaning
        "easydict",       # required by Wan2.2 official requirements.txt
        "imageio[ffmpeg]",
        "imageio-ffmpeg",
        "pillow",
        "numpy<2.0",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.26.0",
    )
    .run_function(
        download_weights,
        timeout=1800,  # 30 min — TI2V-5B BF16 is ~20GB download
    )
)


@app.cls(
    image=image,
    gpu="A10G",
    max_containers=1,        # never spin up more than 1 GPU
    scaledown_window=300,    # warm 5 min between requests
    timeout=900,             # 15 min max per video
    startup_timeout=900,     # 15 min startup
    memory=32768,            # 32GB system RAM for CPU offloading
)
class HollyVideoGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import AutoencoderKLWan, WanPipeline

        print(f"📥 Loading {WAN_MODEL} from {MODEL_CACHE} (BF16)...")

        # VAE in float32 for numerical stability during decode
        # (Wan-AI's own example loads VAE at float32 — mixing BF16 VAE with
        # BF16 transformer causes color drift in decoded frames).
        vae = AutoencoderKLWan.from_pretrained(
            MODEL_CACHE,
            subfolder="vae",
            torch_dtype=torch.float32,
        )

        # Pipeline in BF16 (native dtype). We do NOT force FP8 — the only
        # official FP8 build is NVIDIA's Blackwell-targeted repo, which is
        # not a drop-in diffusers model. BF16 + CPU offload is Wan-AI's
        # documented 24GB recipe.
        self.pipe = WanPipeline.from_pretrained(
            MODEL_CACHE,
            vae=vae,
            torch_dtype=torch.bfloat16,
        )

        # 24GB VRAM recipe (per Wan-AI model card for TI2V-5B on RTX 4090):
        # - enable_model_cpu_offload: moves transformer↔VAE↔T5 between CPU
        #   and GPU per pipeline phase, keeping peak VRAM under 24GB.
        # - vae tiling + slicing: decode large frame batches in chunks.
        self.pipe.enable_model_cpu_offload()
        if hasattr(self.pipe.vae, 'enable_slicing'):
            self.pipe.vae.enable_slicing()
        if hasattr(self.pipe.vae, 'enable_tiling'):
            self.pipe.vae.enable_tiling()

        print(f"✅ {WAN_MODEL} loaded (BF16 + CPU offload) on A10G GPU")
        # I2V pipeline loaded lazily on first image-to-video request (saves
        # VRAM at startup — both pipelines share the same weights but load
        # separate pipeline wrappers).
        self.i2v_pipe = None

    def _ensure_i2v(self):
        """Lazily load the WanImageToVideoPipeline on first I2V request."""
        if self.i2v_pipe is not None:
            return self.i2v_pipe
        import torch
        # ftfy must be imported BEFORE loading the I2V pipeline — diffusers v0.39
        # has a bug where pipeline_wan_i2v.py uses ftfy.fix_text() in basic_clean()
        # but only imports it conditionally (is_ftfy_available()), which fails the
        # availability check even when ftfy is installed. Importing it here puts it
        # in the global namespace so the pipeline can find it.
        import ftfy  # noqa: F401 — required to fix diffusers NameError
        from diffusers import AutoencoderKLWan, WanImageToVideoPipeline
        print(f"📥 Loading WanImageToVideoPipeline (lazy, first I2V request)...")
        vae = AutoencoderKLWan.from_pretrained(
            MODEL_CACHE, subfolder="vae", torch_dtype=torch.float32,
        )
        self.i2v_pipe = WanImageToVideoPipeline.from_pretrained(
            MODEL_CACHE, vae=vae, torch_dtype=torch.bfloat16,
        )
        self.i2v_pipe.enable_model_cpu_offload()
        if hasattr(self.i2v_pipe.vae, 'enable_slicing'):
            self.i2v_pipe.vae.enable_slicing()
        if hasattr(self.i2v_pipe.vae, 'enable_tiling'):
            self.i2v_pipe.vae.enable_tiling()
        print("✅ WanImageToVideoPipeline loaded")
        return self.i2v_pipe

    @modal.fastapi_endpoint(method="POST", label="video-generate")
    def generate(self, request: dict):
        import torch
        import tempfile
        import imageio
        import numpy as np
        from fastapi.responses import Response

        prompt = (request.get("prompt") or "").strip()
        duration = min(float(request.get("duration", 5.0)), 8.0)
        # TI2V-5B outputs 24fps natively (Wan-AI model card). 16fps is also
        # supported; default to 24 to match the model's native cadence.
        fps = int(request.get("fps", 24))
        # TI2V-5B 720P dimensions (per Wan-AI card): 1280x704 or 704x1280.
        # Both must be divisible by 16. Cap at 720P to stay within 24GB VRAM.
        width = min(int(request.get("width", 1280)), 1280)
        height = min(int(request.get("height", 704)), 704)
        steps = min(int(request.get("num_inference_steps", 50)), 50)  # Wan-AI recommends 50
        seed = request.get("seed")
        negative_prompt = request.get("negative_prompt", "low quality, blurry, distorted, watermark")

        if not prompt:
            return Response(
                content=b'{"error":"prompt is required"}',
                media_type="application/json", status_code=400,
            )

        # Wan2.2 frame calculation. num_frames must be 4k+1 for Wan VAE.
        raw_frames = int(duration * fps)
        num_frames = min(((raw_frames // 4) * 4) + 1, 121)  # cap ~5s @ 24fps
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
        # Explicitly convert frames to uint8 [0,255]. diffusers returns PIL
        # Images (uint8) for WanPipeline, but some code paths return float32
        # arrays in [0,1] range — imageio's auto-conversion of those is lossy
        # and produces the "Lossy conversion from float32 to uint8" warning.
        # Forcing uint8 here ensures clean, consistent encoding.
        np_frames = []
        for f in frames:
            arr = np.array(f)
            if arr.dtype != np.uint8:
                arr = (arr * 255).clip(0, 255).astype(np.uint8)
            np_frames.append(arr)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        imageio.mimwrite(tmp_path, np_frames, fps=fps, codec="libx264",
                         output_params=["-crf", "20", "-preset", "medium"])

        with open(tmp_path, "rb") as f:
            video_bytes = f.read()
        os.unlink(tmp_path)

        print(f"✅ {actual_dur:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model": WAN_MODEL,
                "X-Provider": "modal",
                "X-Duration": str(round(actual_dur, 2)),
                "X-FPS": str(fps),
                "X-Width": str(width),
                "X-Height": str(height),
                "X-Licence": "Apache-2.0",
                "Access-Control-Allow-Origin": "*",
            },
        )

    @modal.fastapi_endpoint(method="POST", label="video-i2v")
    def generate_i2v(self, request: dict):
        """Image-to-video: animate a still image using Wan2.2-TI2V-5B.

        Request body:
            image_url: str  — URL of the image to animate (required)
            prompt: str     — motion description (optional, guides the animation)
            duration: float — seconds (default 3, max 5)
            fps: int        — output fps (default 24)
            seed: int       — optional reproducibility
        """
        import torch
        import tempfile
        import imageio
        import numpy as np
        from fastapi.responses import Response
        from diffusers.utils import load_image

        image_url = (request.get("image_url") or "").strip()
        prompt = (request.get("prompt") or "").strip()
        duration = min(float(request.get("duration", 3.0)), 5.0)
        fps = int(request.get("fps", 24))
        seed = request.get("seed")
        negative_prompt = request.get("negative_prompt",
            "low quality, blurry, distorted, watermark, static, no motion")

        if not image_url:
            return Response(
                content=b'{"error":"image_url is required"}',
                media_type="application/json", status_code=400,
            )

        # Load + resize the input image to Wan's expected dimensions.
        # TI2V-5B works best at 832x480 (landscape) or 480x832 (portrait).
        # Match the input image's aspect ratio to avoid distortion.
        # Handle base64 data URLs (diffusers load_image doesn't support them).
        import io as _io
        import base64 as _b64
        if image_url.startswith("data:"):
            # data:image/png;base64,XXXX → decode
            from PIL import Image as _PIL
            header, b64data = image_url.split(",", 1)
            input_img = _PIL.open(_io.BytesIO(_b64.b64decode(b64data))).convert("RGB")
        else:
            from diffusers.utils import load_image
            input_img = load_image(image_url)
        orig_w, orig_h = input_img.size
        # Pick the closest Wan-supported resolution preserving aspect ratio
        if orig_w >= orig_h:
            width, height = 832, 480
        else:
            width, height = 480, 832
        from PIL import Image as _PIL
        input_img = input_img.resize((width, height), _PIL.LANCZOS)
        print(f"🎬 I2V: {orig_w}x{orig_h} → {width}x{height} | "
              f"prompt=\"{prompt[:60]}\" | {duration}s @ {fps}fps")

        pipe = self._ensure_i2v()

        raw_frames = int(duration * fps)
        num_frames = min(((raw_frames // 4) * 4) + 1, 81)  # cap ~3s @ 24fps
        actual_dur = num_frames / fps

        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            result = pipe(
                image=input_img,
                prompt=prompt or "subtle natural motion, gentle movement",
                negative_prompt=negative_prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=50,
                guidance_scale=5.0,
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

        imageio.mimwrite(tmp_path, np_frames, fps=fps, codec="libx264",
                         output_params=["-crf", "20", "-preset", "medium"])

        with open(tmp_path, "rb") as f:
            video_bytes = f.read()
        os.unlink(tmp_path)

        print(f"✅ I2V {actual_dur:.1f}s MP4 — {len(video_bytes):,} bytes")

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={
                "X-Model": WAN_MODEL,
                "X-Mode": "image-to-video",
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
            "model": WAN_MODEL,
            "gpu": "A10G",
            "licence": "Apache-2.0",
            "modes": "text-to-video (video-generate) + image-to-video (video-i2v)",
            "cost": "~$0.05/video (A10G @$0.000306/s, ~180s at 50 steps)",
            "free_quota": "$30/mo → ~600 videos/mo free",
            "version": "3.2.0",
            "note": "Wan2.2-TI2V-5B (was CogVideoX-5B). A14B not used — needs 80GB VRAM.",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/video_generate.py")
    print("  (deploy to iamdoregosteve workspace)")
    print("T2V: https://iamdoregosteve--video-generate.modal.run")
    print("I2V: https://iamdoregosteve--video-i2v.modal.run")
    print("Health: https://iamdoregosteve--video-health.modal.run")
