#!/usr/bin/env python3
"""
HOLLY RealVisXL V5.0 + DWPose ControlNet — A100 Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Generate photorealistic NSFW training images for Holly Body v2.5 LoRA.
GPU:     NVIDIA A100 (80 GB VRAM)
Cost:    ~$2.50/hr | 300 images ≈ $15 total
Output:  Lossless WebP (training-grade quality)

Why this exists (Phase V pivot v3 — June 18, 2026):
  PHOTO RAW failed — wrong architecture (FLUX.1 Dev LoRAs incompatible with
  our Klein-trained LoRAs). Pivoted to SDXL where mature NSFW ecosystem lives.

  RealVisXL V5.0 chosen as base because:
    - SG161222's cleanest photoreal SDXL fine-tune (not a merge)
    - Trained on real photos — produces human skin, not plastic
    - Native NSFW-capable (no safety filter)
    - Battle-tested by Civitai NSFW community (top-tier reputation)

  DWPose ControlNet for SDXL added for pose control:
    - Skeleton-only conditioning (no identity/anatomy bleed)
    - Solves "specialist LoRAs overwrite Holly's body" problem
    - Wireframes from PoseMy.Art give us exact pose control

Architecture:
  BASE MODEL (loaded from Modal volume):
    - RealVisXL V5.0 fp16 (~6.6 GB)
    - File: /models/RealVisXL_V5.0_fp16.safetensors
    - Source: huggingface.co/SG161222/RealVisXL_V5.0

  CONTROLNET (loaded from Modal volume):
    - DWPose for SDXL (5 GB)
    - File: /models/dwpose-controlnet-sdxl/diffusion_pytorch_model.safetensors
    - Source: huggingface.co/dimitribarbot/controlnet-dwpose-sdxl-1.0

  PIPELINE:
    StableDiffusionXLControlNetImg2ImgPipeline
    - Accepts BOTH image= (img2img reference) AND control_image= (pose)
    - This is the proven community pipeline for "image + pose → new pose"

IDENTITY PRESERVATION (no LoRAs needed):
  Holly's face + body come from the input reference image (T09 or similar).
  DWPose only changes the POSE — not the body, not the face.
  At strength=0.45, model keeps ~55% of reference identity, regenerates ~45%.

Settings (RealVisXL V5.0 official creator recommendations):
  - Sampler: DPM++ SDE Karras (algorithm_type="sde-d", use_karras_sigmas=True)
  - Steps: 30 (creator recommends 25-30+)
  - CFG: 4.0 (creator recommends 3.0-5.0)
  - CLIP skip: 2 (SDXL standard)
  - Resolution: 896x1152 (creator-tested portrait)
  - Negative: "(worst quality, low quality, illustration, 3d, 2d, painting,
              cartoons, sketch), open mouth"

Endpoint URL pattern (single asgi_app, fits Web Function limit):
  GET  https://iamdoregosteve--holly-realvisxl-a100.modal.run/health
  POST https://iamdoregosteve--holly-realvisxl-a100.modal.run/generate

Request format:
  POST /generate
  {
    "prompt":                    "explicit scene description",
    "image_base64":              "<base64 PNG/JPEG/WebP — Holly reference>",
    "control_image_base64":      "<base64 PNG/JPEG — DWPose wireframe>",
    "negative_prompt":           null (uses default if not provided),
    "width":                     896,
    "height":                    1152,
    "num_inference_steps":       30,
    "guidance_scale":            4.0,
    "strength":                  0.45,       # img2img denoise (0-1)
    "controlnet_conditioning_scale": 0.8,    # pose strength (0-2)
    "control_guidance_start":    0.0,
    "control_guidance_end":      1.0,
    "seed":                      null,
    "format":                    "webp",     # webp|png|jpeg
    "clip_skip":                 2
  }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import base64
import io
import os
import modal

app = modal.App("holly-image-realvisxl-a100")

# ─────────────────────────────────────────────────────────────────────────────
# Volume + paths
# ─────────────────────────────────────────────────────────────────────────────
VOLUME_MOUNT = "/models"            # RealVisXL base + DWPose ControlNet
LORA_DIR     = "/lora"              # Optional LoRA volume (for future SDXL Holly LoRAs)

BASE_FILE     = "RealVisXL_V5.0_fp16.safetensors"
CONTROLNET_DIRNAME = "dwpose-controlnet-sdxl"

volume      = modal.Volume.from_name("holly-realvisxl-weights", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights",      create_if_missing=True)

# ─────────────────────────────────────────────────────────────────────────────
# RealVisXL V5.0 official settings
# Source: https://civitai.com/models/139562 (creator README)
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_WIDTH    = 896
DEFAULT_HEIGHT   = 1152
DEFAULT_STEPS    = 30
DEFAULT_CFG      = 4.0
DEFAULT_STRENGTH = 0.45          # img2img denoise — keeps identity
DEFAULT_CN_SCALE = 0.8           # ControlNet strength — pose adherence
DEFAULT_CLIP_SKIP = 2

# RealVisXL V5.0 official negative prompt
DEFAULT_NEGATIVE = (
    "(worst quality, low quality, illustration, 3d, 2d, painting, cartoons, sketch), "
    "open mouth"
)

# Holly's permanent body description — used ONLY when caller doesn't provide
# reference image (txt2img fallback). With img2img, identity comes from the
# reference photo, not the prompt, so this is lighter than the FLUX prefix.
HOLLY_PROMPT_HINT = (
    "photorealistic woman, "
    "olive skin tone, flawless smooth skin texture, "
    "fit curvy hourglass figure, natural 34C breasts, "
    "flat stomach with faint abs, plump round butt, "
    "shapely legs, auburn wavy hair, green eyes, freckles, "
    "professional photography, studio lighting, sharp focus, "
    "high resolution, detailed skin pores, realistic anatomy"
)

# ─────────────────────────────────────────────────────────────────────────────
# Image — diffusers + ControlNet + DPM++ SDE Karras deps
# ─────────────────────────────────────────────────────────────────────────────
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install(
        "torch>=2.6.0",
        "torchvision",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .pip_install(
        # ControlNet img2img pipeline requires recent diffusers
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
    volumes={VOLUME_MOUNT: volume, LORA_DIR: lora_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyRealVisXLA100:

    @modal.enter()
    def load_model(self):
        import torch
        from pathlib import Path

        self.pipe = None
        self.model_name = "RealVisXL V5.0 (not loaded)"
        self.startup_error = None

        # ── Step 1: Verify RealVisXL file ───────────────────────────────
        base_path = f"{VOLUME_MOUNT}/{BASE_FILE}"
        if not os.path.exists(base_path):
            self.startup_error = (
                f"RealVisXL V5.0 not found at {base_path}. "
                f"Run: modal run scripts/download-realvisxl-direct.py"
            )
            print(f"❌ {self.startup_error}")
            return

        size_gb = os.path.getsize(base_path) / (1024 ** 3)
        print(f"✅ RealVisXL V5.0 found: {size_gb:.2f} GB")

        # ── Step 2: Verify DWPose ControlNet (download to volume if missing) ──
        cn_dir = Path(VOLUME_MOUNT) / CONTROLNET_DIRNAME
        cn_file = cn_dir / "diffusion_pytorch_model.safetensors"
        cn_config = cn_dir / "config.json"

        if not cn_file.exists():
            try:
                print(f"📥 DWPose ControlNet missing — downloading from HF...")
                cn_dir.mkdir(parents=True, exist_ok=True)
                from huggingface_hub import hf_hub_download
                import shutil

                for filename in ["diffusion_pytorch_model.safetensors", "config.json"]:
                    downloaded = hf_hub_download(
                        repo_id="dimitribarbot/controlnet-dwpose-sdxl-1.0",
                        filename=filename,
                        cache_dir="/tmp/hf_cache",
                    )
                    shutil.copy2(downloaded, cn_dir / filename)
                    print(f"   ✓ {filename}")

                volume.commit()
                print(f"✅ DWPose ControlNet saved to volume")
            except Exception as e:
                self.startup_error = f"DWPose download failed: {e}"
                print(f"❌ {self.startup_error}")
                return
        else:
            print(f"✅ DWPose ControlNet found on volume")

        # ── Step 3: Load ControlNet ─────────────────────────────────────
        try:
            from diffusers import ControlNetModel
            print(f"🎭 Loading DWPose ControlNet...")
            self.controlnet = ControlNetModel.from_pretrained(
                str(cn_dir),
                torch_dtype=torch.float16,
                local_files_only=True,
            )
            print(f"✅ ControlNet loaded")
        except Exception as e:
            self.startup_error = f"ControlNet load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # ── Step 4: Load SDXL ControlNet img2img pipeline from single file ──
        try:
            from diffusers import StableDiffusionXLControlNetImg2ImgPipeline
            print(f"🚀 Loading RealVisXL V5.0 + ControlNet img2img pipeline...")
            self.pipe = StableDiffusionXLControlNetImg2ImgPipeline.from_single_file(
                base_path,
                controlnet=self.controlnet,
                torch_dtype=torch.float16,
                local_files_only=False,  # allow config download if needed
            )
            print(f"✅ Pipeline loaded from single-file checkpoint")
        except Exception as e:
            self.startup_error = f"Pipeline load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # ── Step 5: Configure DPM++ SDE Karras scheduler (RealVisXL rec) ──
        try:
            from diffusers import DPMSolverMultistepScheduler
            self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(
                self.pipe.scheduler.config,
                algorithm_type="sde-d",
                use_karras_sigmas=True,
            )
            print(f"✅ Scheduler: DPM++ SDE Karras")
        except Exception as e:
            print(f"⚠️  Scheduler override failed ({e}) — using default")

        # ── Step 6: Move to GPU ─────────────────────────────────────────
        import gc
        gc.collect()
        try:
            self.pipe.to("cuda")
            print(f"✅ Pipeline on A100 GPU")
        except Exception as e:
            print(f"⚠️  Full GPU move failed ({e}), using CPU offload")
            self.pipe.enable_model_cpu_offload()

        # Optional: load SDXL LoRAs if present in /lora (for future use)
        self.lora_loaded = False
        self.lora_name = None
        try:
            lora_files = [f for f in os.listdir(LORA_DIR) if f.endswith('.safetensors')]
            if lora_files:
                # Skip auto-loading — caller can request via /generate
                print(f"ℹ️  {len(lora_files)} LoRA file(s) available in volume (not auto-loaded)")
                self.lora_name = lora_files[0]
        except Exception:
            pass

        # ── Step 7: Load plain txt2img pipeline (shares weights, no extra VRAM) ──
        # Used when /generate is called WITHOUT image_base64 + control_image_base64.
        # Pure prompt-driven generation — strips all confounding variables.
        try:
            from diffusers import StableDiffusionXLPipeline
            print(f"🚀 Loading plain SDXL txt2img pipeline (shared weights)...")
            self.txt2img_pipe = StableDiffusionXLPipeline(
                vae=self.pipe.vae,
                unet=self.pipe.unet,
                text_encoder=self.pipe.text_encoder,
                text_encoder_2=self.pipe.text_encoder_2,
                tokenizer=self.pipe.tokenizer,
                tokenizer_2=self.pipe.tokenizer_2,
                scheduler=self.pipe.scheduler,
            )
            print(f"✅ Plain txt2img pipeline ready (shared weights)")
        except Exception as e:
            print(f"⚠️  txt2img pipeline load failed ({e}) — only img2img+ControlNet mode available")
            self.txt2img_pipe = None

        self.model_name = "RealVisXL V5.0 + DWPose ControlNet SDXL"
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
            "version": "1.0.0",
            "pipeline": "StableDiffusionXLControlNetImg2ImgPipeline",
            "base_architecture": "SDXL (RealVisXL V5.0 fp16)",
            "controlnet": "DWPose SDXL" if healthy else "missing",
            "scheduler": "DPM++ SDE Karras",
            "lora_available": self.lora_name,
            "startup_error": self.startup_error,
            "defaults": {
                "width": DEFAULT_WIDTH,
                "height": DEFAULT_HEIGHT,
                "steps": DEFAULT_STEPS,
                "cfg": DEFAULT_CFG,
                "strength": DEFAULT_STRENGTH,
                "controlnet_scale": DEFAULT_CN_SCALE,
                "clip_skip": DEFAULT_CLIP_SKIP,
            },
            "required_inputs": {
                "image_base64": "img2img reference (Holly photo)",
                "control_image_base64": "DWPose wireframe pose",
            },
        }

    def generate(self, request: dict):
        """Generate an image with RealVisXL V5.0 + ControlNet + img2img."""
        import torch
        import traceback
        from PIL import Image
        from fastapi.responses import Response

        try:
            # ── Parse request ───────────────────────────────────────────
            prompt = (request.get("prompt") or "").strip()
            if not prompt:
                return Response(
                    content=b'{"error":"prompt is required"}',
                    media_type="application/json", status_code=400,
                )

            image_b64 = request.get("image_base64")
            control_b64 = request.get("control_image_base64")

            # Dispatch mode:
            #   - Both provided → ControlNet img2img (identity + pose)
            #   - Neither      → Plain txt2img (prompt-only baseline)
            use_txt2img = not image_b64 and not control_b64

            ref_img = None
            pose_img = None
            if not use_txt2img:
                if not image_b64:
                    return Response(
                        content=b'{"error":"image_base64 required for img2img mode (or omit both for txt2img)"}',
                        media_type="application/json", status_code=400,
                    )
                if not control_b64:
                    return Response(
                        content=b'{"error":"control_image_base64 required for img2img mode (or omit both for txt2img)"}',
                        media_type="application/json", status_code=400,
                    )

                # Decode base64 → PIL
                try:
                    ref_img = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")
                except Exception as e:
                    return Response(
                        content=f'{{"error":"invalid image_base64: {e}"}}'.encode(),
                        media_type="application/json", status_code=400,
                    )

                try:
                    pose_img = Image.open(io.BytesIO(base64.b64decode(control_b64))).convert("RGB")
                except Exception as e:
                    return Response(
                        content=f'{{"error":"invalid control_image_base64: {e}"}}'.encode(),
                        media_type="application/json", status_code=400,
                    )

            # RealVisXL V5.0 settings
            width   = int(request.get("width",  DEFAULT_WIDTH))
            height  = int(request.get("height", DEFAULT_HEIGHT))
            steps   = min(int(request.get("num_inference_steps", DEFAULT_STEPS)), 50)
            cfg     = float(request.get("guidance_scale", DEFAULT_CFG))
            strength = float(request.get("strength", DEFAULT_STRENGTH))
            cn_scale = float(request.get("controlnet_conditioning_scale", DEFAULT_CN_SCALE))
            cn_start = float(request.get("control_guidance_start", 0.0))
            cn_end   = float(request.get("control_guidance_end", 1.0))
            clip_skip = int(request.get("clip_skip", DEFAULT_CLIP_SKIP))
            seed     = request.get("seed")
            fmt      = request.get("format", "webp").lower()
            negative = request.get("negative_prompt") or DEFAULT_NEGATIVE

            if use_txt2img:
                if not hasattr(self, 'txt2img_pipe') or self.txt2img_pipe is None:
                    return Response(
                        content=b'{"error":"txt2img pipeline not loaded"}',
                        media_type="application/json", status_code=503,
                    )
                active_pipe = self.txt2img_pipe
                mode_label = "txt2img"
            else:
                if not hasattr(self, 'pipe') or self.pipe is None:
                    return Response(
                        content=b'{"error":"img2img model not loaded"}',
                        media_type="application/json", status_code=503,
                    )
                active_pipe = self.pipe
                mode_label = "img2img+ControlNet"
                # Resize reference + pose to target resolution (ControlNet needs same aspect)
                ref_img  = ref_img.resize((width, height),  Image.LANCZOS)
                pose_img = pose_img.resize((width, height), Image.LANCZOS)

            generator = torch.Generator("cuda").manual_seed(int(seed)) if seed is not None else None

            print(f"🎨 [{self.model_name}] mode={mode_label}")
            print(f"   {width}x{height} | {steps} steps | CFG {cfg} | CLIP skip={clip_skip}")
            if not use_txt2img:
                print(f"   strength={strength} | ControlNet: scale={cn_scale} range=[{cn_start}-{cn_end}]")
            print(f"   Prompt: {prompt[:100]}")

            # ── Generate ────────────────────────────────────────────────
            with torch.inference_mode():
                if use_txt2img:
                    result = active_pipe(
                        prompt=prompt,
                        negative_prompt=negative,
                        width=width,
                        height=height,
                        num_inference_steps=steps,
                        guidance_scale=cfg,
                        clip_skip=clip_skip,
                        generator=generator,
                    )
                else:
                    result = active_pipe(
                        prompt=prompt,
                        negative_prompt=negative,
                        image=ref_img,                 # img2img source (identity)
                        control_image=pose_img,        # ControlNet condition (pose)
                        strength=strength,
                        width=width,
                        height=height,
                        num_inference_steps=steps,
                        guidance_scale=cfg,
                        controlnet_conditioning_scale=cn_scale,
                        control_guidance_start=cn_start,
                        control_guidance_end=cn_end,
                        clip_skip=clip_skip,
                        generator=generator,
                    )
            img = result.images[0]

            # ── Output ──────────────────────────────────────────────────
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
                    "X-Mode": mode_label,
                    "X-Provider": "modal-realvisxl-a100",
                    "X-Base": "realvisxl-v5.0-sdxl",
                    "X-ControlNet": "dwpose-sdxl" if not use_txt2img else "off",
                    "X-Scheduler": "dpm++-sde-karras",
                    "X-Width": str(width),
                    "X-Height": str(height),
                    "X-Steps": str(steps),
                    "X-Guidance": str(cfg),
                    "X-Strength": str(strength) if not use_txt2img else "n/a",
                    "X-ControlNet-Scale": str(cn_scale) if not use_txt2img else "n/a",
                    "X-CLIP-Skip": str(clip_skip),
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

    @modal.asgi_app(label="holly-realvisxl-a100")
    def web(self):
        """Single Web Function exposing /health and /generate routes."""
        from fastapi import FastAPI, Request
        from fastapi.middleware.cors import CORSMiddleware

        web_app = FastAPI(title="Holly RealVisXL V5.0 A100", version="1.0.0")
        web_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["GET", "POST"],
            allow_headers=["*"],
        )

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
                "service": "holly-realvisxl-a100",
                "version": "1.0.0",
                "model": "RealVisXL V5.0 + DWPose ControlNet SDXL",
                "endpoints": {
                    "health":   "GET  /health",
                    "generate": "POST /generate",
                },
                "required_inputs": ["image_base64", "control_image_base64", "prompt"],
                "defaults": {
                    "width": DEFAULT_WIDTH,
                    "height": DEFAULT_HEIGHT,
                    "steps": DEFAULT_STEPS,
                    "cfg": DEFAULT_CFG,
                    "strength": DEFAULT_STRENGTH,
                    "controlnet_scale": DEFAULT_CN_SCALE,
                },
            }

        return web_app


if __name__ == "__main__":
    print("Deploy with: modal deploy services/modal-media/image_generate_realvisxl_a100.py")
    print("Endpoint:    https://iamdoregosteve--holly-realvisxl-a100.modal.run")
    print("Health:      https://iamdoregosteve--holly-realvisxl-a100.modal.run/health")
    print("Generate:    https://iamdoregosteve--holly-realvisxl-a100.modal.run/generate")
