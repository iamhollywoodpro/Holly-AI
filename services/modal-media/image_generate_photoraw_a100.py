#!/usr/bin/env python3
"""
HOLLY PHOTO RAW FLUX — A100 Dataset Generation Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Generate photorealistic NSFW training images for Holly Body v2.5 LoRA.
GPU:     NVIDIA A100 (80 GB VRAM)
Cost:    ~$2.50/hr | 300 images ≈ $15 total
Output:  Lossless WebP (training-grade quality)

Why this exists (Phase V pivot v2 — June 17, 2026):
  CyberRealistic test failed — not because the model can't do photorealism
  (it can) but because our config was wrong:
    - Wrong aspect ratio (1024x1024 square — model trained on portrait)
    - Wrong sampler (defaults instead of Euler)
    - No identity lock (PuLID install failed, deferred)
  PHOTO RAW chosen for v2 pivot because:
    - Has BUILT-IN Identity Lock feature (no PuLID install needed)
    - Camera sensor simulation tuned for photoreal skin/texture
    - Explicit-capable out of the box

Architecture:
  BASE MODEL (loaded once, always active):
    - PHOTO RAW (FLUX.1 Dev checkpoint with Identity Lock)
    - File: photo-raw-flux-fp8.safetensors (~16 GB intermediate format)
    - Downloaded manually from Civitai, uploaded to Modal volume

  IDENTITY LOCK (PHOTO RAW native feature):
    - Trigger phrase: "identity lock" + Holly description in prompt
    - No external adapter needed (unlike PuLID)

  CONFIG FIXES (lessons from CyberRealistic failure):
    - Default aspect ratio: 832x1216 (portrait, not 1024x1024)
    - Default CFG: 3.5 (lower than Klein's 4.0 — Flux likes lower)
    - Default steps: 28 (slightly more than CyberRealistic for detail)

  NO BAKED LoRAs:
    - Holly Face v2.0 + Body v1.0 LoRAs are FLUX.2 Klein — incompatible
    - Identity comes from PHOTO RAW's native Identity Lock feature

Endpoint URL pattern (single asgi_app, fits Web Function limit):
  GET  https://iamdoregosteve--holly-photoraw-a100.modal.run/health
  POST https://iamdoregosteve--holly-photoraw-a100.modal.run/generate

Request format:
  POST /generate
  {
    "prompt":         "explicit description (include 'identity lock' Holly body prefix auto-added)",
    "width":          832,
    "height":         1216,
    "num_inference_steps": 28,
    "guidance_scale": 3.5,
    "seed":           null,
    "format":         "webp"
  }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-image-photoraw-a100")

# PHOTO RAW — downloaded manually from https://civitai.red/models/2253017
# File on volume: photo-raw-flux-fp8.safetensors (~16 GB intermediate format)
PHOTORAW_FILE = "photo-raw-flux-fp8.safetensors"

VOLUME_MOUNT = "/flux-models"          # PHOTO RAW volume
SHARED_MOUNT = "/flux-shared"          # CyberRealistic volume (FLUX.1 Dev base lives here)
LORA_DIR = "/lora"  # unused but kept for volume mount compat
FLUX_DEV_DIR = "/flux-shared/flux1-dev"  # shared with CyberRealistic endpoint

# Holly's permanent body description — injected into EVERY prompt.
# Tuned for PHOTO RAW: includes "identity lock" trigger + Holly's physical canon.
# Source of truth: HOLLY_ANATOMY.md
HOLLY_BODY_PREFIX = (
    "identity lock, h0lly, "
    "olive skin tone (Portuguese/South Indian heritage), "
    "flawless silky smooth even complexion, clean healthy well-moisturized sheen, "
    "uniform clear flawless skin texture, perfectly clean and even, "
    "realistic skin stretching and folding at joints, natural living skin texture with micro-veins, "
    "bright clear under-eye area, soft dewy makeup with seamless natural foundation blend, "
    "5'4\" tall (163cm), "
    "fit curvy body with hourglass proportions, natural 34C breasts, teardrop shape, "
    "plump round butt well-proportioned to her petite frame, flat stomach with faint abs, "
    "small feminine feet (size 6), delicate hands, shapely legs, "
    "voluminous auburn hair with lifted roots and full body at the crown, "
    "bouncy loose waves with face-framing layers ending three inches past shoulders at mid-chest, "
    "copper and gold highlights, "
    "green eyes with specular catchlights, freckles, full lips with natural micro-ridges. "
)

# PHOTO RAW official creator-recommended settings (June 17, 2026)
# Source: PHOTO RAW model page on Civitai
# Tested resolutions: 512x640, 640x768, 768x960, 896x1152
# Sampler: Euler/simple (or DPM++2M/beta, Euler/beta)
# Steps: 18-30 (sweet spot ~24)
# CFG: 3.5-8.0 (sweet spot ~4.0)
# CLIP skip: 0 (default for Flux)
# Hires.fix: 540x540 → 1080x1080 (2-pass for detail)
DEFAULT_WIDTH = 896        # creator-tested resolution
DEFAULT_HEIGHT = 1152
DEFAULT_STEPS = 24         # middle of recommended range
DEFAULT_CFG = 4.0          # middle of recommended range
DEFAULT_HIRES_FIX = True   # 2-pass generation (low-res → upscale → img2img refine)
DEFAULT_HIRES_STRENGTH = 0.4  # how much to refine in second pass (0-1)

# Shared volumes:
# - holly-photoraw-weights: PHOTO RAW file (uploaded manually)
# - holly-cyberrealistic-weights: FLUX.1 Dev base (already downloaded from CyberRealistic test)
# - holly-lora-weights: Holly LoRAs (unused on this endpoint but mounted for compat)
volume = modal.Volume.from_name("holly-photoraw-weights", create_if_missing=True)
cyberrealistic_volume = modal.Volume.from_name("holly-cyberrealistic-weights", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install(
        "torch>=2.6.0",
        "torchvision",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .pip_install(
        "https://github.com/Dao-AILab/flash-attention/releases/download/v2.8.3/flash_attn-2.8.3+cu12torch2.6cxx11abiFALSE-cp311-cp311-linux_x86_64.whl",
    )
    .pip_install(
        "git+https://github.com/huggingface/diffusers.git",
        "transformers>=4.51.0",
        "accelerate>=0.34.2",
        "sentencepiece",
        "protobuf",
        "pillow",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.25.0",
        "safetensors",
        "einops",
        "peft",
    )
)


@app.cls(
    image=image,
    gpu="A100",
    max_containers=1,
    scaledown_window=120,
    timeout=600,
    startup_timeout=1800,
    volumes={VOLUME_MOUNT: volume, SHARED_MOUNT: cyberrealistic_volume, LORA_DIR: lora_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyPhotoRawA100:

    @modal.enter()
    def load_model(self):
        import torch
        from huggingface_hub import snapshot_download

        self.pipe = None
        self.model_name = "PHOTO RAW (not loaded)"
        self.startup_error = None

        # Authenticate with HuggingFace (for FLUX.1 Dev base download)
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
        if hf_token:
            from huggingface_hub import login
            login(token=hf_token)
            print("✅ HuggingFace authenticated")

        # ── Step 1: Verify PHOTO RAW file is on volume ────────────────
        model_path = f"{VOLUME_MOUNT}/{PHOTORAW_FILE}"
        if not os.path.exists(model_path):
            self.startup_error = (
                f"PHOTO RAW file not found at {model_path}. "
                f"Download from https://civitai.red/models/2253017 and run "
                f"scripts/upload-photoraw-to-volume.sh first."
            )
            print(f"❌ {self.startup_error}")
            return

        size_gb = os.path.getsize(model_path) / (1024 ** 3)
        print(f"✅ PHOTO RAW found: {size_gb:.1f} GB")

        # ── Step 2: Ensure FLUX.1 Dev base is available ────────────────
        # Try shared volume first (already downloaded from CyberRealistic test).
        # Fall back to downloading to PHOTO RAW volume if not present.
        flux_dev_dir = FLUX_DEV_DIR
        if not os.path.exists(f"{flux_dev_dir}/model_index.json"):
            # Not on shared volume — fall back to photoraw volume
            flux_dev_dir = f"{VOLUME_MOUNT}/flux1-dev"
            if not os.path.exists(f"{flux_dev_dir}/model_index.json"):
                try:
                    print(f"📥 Downloading FLUX.1 Dev base (text encoders + components)...")
                    snapshot_download(
                        repo_id="black-forest-labs/FLUX.1-dev",
                        local_dir=flux_dev_dir,
                        ignore_patterns=["*.md", "*.gitattributes", "original/*"],
                    )
                    volume.commit()
                    print("✅ FLUX.1 Dev base saved to volume")
                except Exception as e:
                    self.startup_error = f"FLUX.1 Dev download failed: {e}"
                    print(f"❌ {self.startup_error}")
                    return
            else:
                print(f"✅ FLUX.1 Dev base found on PHOTO RAW volume")
        else:
            print(f"✅ FLUX.1 Dev base found on shared CyberRealistic volume (skipping redundant download)")

        # ── Step 3: Load FluxPipeline from FLUX.1 Dev base ─────────────
        try:
            print(f"🚀 Loading FLUX.1 Dev pipeline from {flux_dev_dir}...")
            from diffusers import FluxPipeline

            self.pipe = FluxPipeline.from_pretrained(
                flux_dev_dir,
                torch_dtype=torch.bfloat16,
            )
            print("✅ Base pipeline loaded (CLIP + T5 + VAE + tokenizer)")
        except Exception as e:
            self.startup_error = f"Base pipeline load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # ── Step 4: Swap in PHOTO RAW transformer ────────────────────
        try:
            from diffusers import FluxTransformer2DModel
            print(f"🎭 Loading PHOTO RAW transformer from {model_path}...")
            pr_transformer = FluxTransformer2DModel.from_single_file(
                model_path,
                torch_dtype=torch.bfloat16,
            )
            del self.pipe.transformer
            self.pipe.transformer = pr_transformer
            print("✅ PHOTO RAW transformer swapped in")
        except Exception as e:
            self.startup_error = f"PHOTO RAW transformer load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # Move full pipeline to GPU
        import gc
        gc.collect()
        try:
            self.pipe.to("cuda")
            print("✅ Pipeline on A100 GPU")
        except Exception as e:
            print(f"⚠️  Full GPU move failed ({e}), using CPU offload")
            self.pipe.enable_model_cpu_offload()

        # ── Step 5: Load FluxImg2ImgPipeline (shares weights with main pipe) ─
        # Needed for Hires.fix — second pass refines upscaled image.
        # Components are shared, no extra VRAM cost.
        try:
            from diffusers import FluxImg2ImgPipeline
            self.img2img_pipe = FluxImg2ImgPipeline(
                vae=self.pipe.vae,
                text_encoder=self.pipe.text_encoder,
                text_encoder_2=self.pipe.text_encoder_2,
                tokenizer=self.pipe.tokenizer,
                tokenizer_2=self.pipe.tokenizer_2,
                scheduler=self.pipe.scheduler,
                transformer=self.pipe.transformer,
            )
            print("✅ FluxImg2ImgPipeline ready (shared weights) — Hires.fix enabled")
        except Exception as e:
            print(f"⚠️  Img2Img pipeline load failed ({e}) — Hires.fix disabled")
            self.img2img_pipe = None

        self.model_name = "PHOTO RAW FLUX.1 Dev + Identity Lock"
        print(f"✅ {self.model_name} ready")

    def health(self):
        """Health check — verify model loaded successfully."""
        healthy = (
            self.pipe is not None
            and self.startup_error is None
        )
        return {
            "status": "healthy" if healthy else "unhealthy",
            "model": self.model_name,
            "version": "1.1.0",
            "photoraw_available": self.pipe is not None,
            "identity_lock": "native (trigger: 'identity lock')",
            "hires_fix_available": getattr(self, 'img2img_pipe', None) is not None,
            "startup_error": self.startup_error,
            "base_architecture": "FLUX.1 Dev (PHOTO RAW)",
            "defaults": {
                "width": DEFAULT_WIDTH,
                "height": DEFAULT_HEIGHT,
                "steps": DEFAULT_STEPS,
                "cfg": DEFAULT_CFG,
                "hires_fix": DEFAULT_HIRES_FIX,
                "hires_strength": DEFAULT_HIRES_STRENGTH,
            },
        }

    def generate(self, request: dict):
        """Generate an image with PHOTO RAW + native Identity Lock + Hires.fix."""
        import io
        import torch
        import traceback
        from PIL import Image
        from fastapi.responses import Response

        try:
            raw_prompt = (request.get("prompt") or "").strip()
            if not raw_prompt:
                return Response(
                    content=b'{"error":"prompt is required"}',
                    media_type="application/json", status_code=400,
                )

            # Inject Holly's body description + identity lock trigger
            if "h0lly" in raw_prompt.lower():
                prompt = raw_prompt.replace("h0lly", HOLLY_BODY_PREFIX.rstrip(", "))
                prompt = prompt.replace("H0lly", HOLLY_BODY_PREFIX.rstrip(", "))
            else:
                prompt = HOLLY_BODY_PREFIX + raw_prompt

            # PHOTO RAW creator-recommended defaults
            width = int(request.get("width", DEFAULT_WIDTH))
            height = int(request.get("height", DEFAULT_HEIGHT))
            steps = min(int(request.get("num_inference_steps", DEFAULT_STEPS)), 50)
            seed = request.get("seed")
            fmt = request.get("format", "webp").lower()
            guidance_scale = float(request.get("guidance_scale", DEFAULT_CFG))
            hires_fix = bool(request.get("hires_fix", DEFAULT_HIRES_FIX))
            hires_strength = float(request.get("hires_strength", DEFAULT_HIRES_STRENGTH))

            if not hasattr(self, 'pipe') or self.pipe is None:
                return Response(
                    content=b'{"error":"model not loaded"}',
                    media_type="application/json", status_code=503,
                )

            # If Hires.fix requested but img2img unavailable, fall back to single-pass
            if hires_fix and (not hasattr(self, 'img2img_pipe') or self.img2img_pipe is None):
                print(f"  ⚠️  Hires.fix requested but img2img unavailable — single-pass")
                hires_fix = False

            generator = torch.Generator("cpu").manual_seed(seed) if seed is not None else None

            # ── PASS 1: Low-res generation ────────────────────────────────
            # Creator recommends starting at 540×540 or similar low-res
            # For portrait: use 512×640 or scale target by 0.5
            if hires_fix:
                low_w, low_h = width // 2, height // 2  # half-res first pass
                print(f"🎨 [{self.model_name}] Pass 1/2 (low-res): {low_w}x{low_h}")
                print(f"   {steps} steps | CFG {guidance_scale}")
                with torch.inference_mode():
                    result = self.pipe(
                        prompt=prompt,
                        width=low_w,
                        height=low_h,
                        num_inference_steps=steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                    )
                low_img = result.images[0]

                # Upscale to target resolution
                low_img = low_img.resize((width, height), Image.LANCZOS)
                print(f"  ✅ Pass 1 complete — upscaled to {width}x{height}")

                # ── PASS 2: Hires.fix refine via img2img ───────────────────
                # Lower strength = preserve more composition, add detail
                # Higher strength = more regeneration but may drift
                print(f"🎨 Pass 2/2 (Hires.fix): strength={hires_strength}")
                # Reset generator for second pass (different seed = more variation)
                gen2 = torch.Generator("cpu").manual_seed(seed + 1) if seed is not None else None
                with torch.inference_mode():
                    result = self.img2img_pipe(
                        image=low_img,
                        prompt=prompt,
                        strength=hires_strength,
                        num_inference_steps=steps,
                        guidance_scale=guidance_scale,
                        generator=gen2,
                    )
                img = result.images[0]
                print(f"  ✅ Pass 2 complete — final {width}x{height}")

            else:
                # Single-pass generation (no Hires.fix)
                print(f"🎨 [{self.model_name}] (single-pass): {width}x{height}")
                print(f"   {steps} steps | CFG {guidance_scale}")
                with torch.inference_mode():
                    result = self.pipe(
                        prompt=prompt,
                        width=width,
                        height=height,
                        num_inference_steps=steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                    )
                img = result.images[0]

            # ── Face restoration for Holly self-portraits (ADetailer-lite) ──
            # Simple version: blur+sharpen face area. Full ADetailer would
            # detect face, crop, regenerate at high res, blend back.
            # This is a quality post-process — not a fix for bad generation.
            is_holly_selfie = "h0lly" in prompt.lower()
            if is_holly_selfie:
                try:
                    from PIL import ImageFilter, ImageEnhance
                    smoothed = img.filter(ImageFilter.GaussianBlur(radius=1.0))
                    img = Image.blend(img, smoothed, alpha=0.20)
                    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=120, threshold=3))
                    img = ImageEnhance.Brightness(img).enhance(1.03)
                    img = ImageEnhance.Color(img).enhance(1.05)
                except Exception:
                    pass

            # Output
            buf = io.BytesIO()
            if fmt == "png":
                img.save(buf, format="PNG")
                media_type = "image/png"
            elif fmt in ("jpeg", "jpg"):
                img.save(buf, format="JPEG", quality=95)
                media_type = "image/jpeg"
            else:
                img.save(buf, format="WEBP", lossless=True)
                media_type = "image/webp"

            img_bytes = buf.getvalue()
            print(f"✅ Final {width}x{height} — {len(img_bytes):,} bytes")

            return Response(
                content=img_bytes,
                media_type=media_type,
                headers={
                    "X-Model": self.model_name,
                    "X-Provider": "modal-photoraw-a100",
                    "X-Base": "flux1-dev",
                    "X-Identity-Lock": "native",
                    "X-Hires-Fix": "on" if hires_fix else "off",
                    "X-Width": str(width),
                    "X-Height": str(height),
                    "X-Steps": str(steps),
                    "X-Guidance": str(guidance_scale),
                    "X-Version": "1.1.0",
                    "Access-Control-Allow-Origin": "*",
                },
            )

        except Exception as e:
            tb = traceback.format_exc()
            print(f"❌ Generation error: {tb}")
            return Response(
                content=f'{{"error":"{str(e)}","traceback":"{tb[:500]}"}}'.encode(),
                media_type="application/json",
                status_code=500,
            )

    @modal.asgi_app(label="holly-photoraw-a100")
    def web(self):
        """Single Web Function exposing /health and /generate routes."""
        from fastapi import FastAPI, Request

        web_app = FastAPI(title="Holly PHOTO RAW A100", version="1.0.0")

        @web_app.get("/health")
        def health_route():
            return self.health()

        @web_app.post("/generate")
        async def generate_route(request: Request):
            body = await request.json()
            return self.generate(body)

        @web_app.get("/")
        def root():
            return {
                "service": "holly-photoraw-a100",
                "version": "1.0.0",
                "endpoints": ["/health (GET)", "/generate (POST)"],
                "defaults": {
                    "width": DEFAULT_WIDTH,
                    "height": DEFAULT_HEIGHT,
                    "steps": DEFAULT_STEPS,
                    "cfg": DEFAULT_CFG,
                },
            }

        return web_app


if __name__ == "__main__":
    print("Deploy with: modal deploy services/modal-media/image_generate_photoraw_a100.py")
    print("Test with:   python scripts/test-photoraw-v17.py")
