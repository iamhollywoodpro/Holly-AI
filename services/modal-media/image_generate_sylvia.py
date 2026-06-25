#!/usr/bin/env/python3
"""
SYLVIA FLUX.2 Klein 9B Image Generation Service (Clean — No LoRAs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  FLUX.2 Klein 9B (BF16) — BARE, no baked LoRAs
GPU:    NVIDIA L4 (24 GB VRAM) — BF16 model with CPU offloading
Cost:   ~$0.001/image (4 steps!) | $30/mo free → ~30 hours/month
Trigger: sylvia (planned — no LoRA yet, prompt-only for now)

Architecture:
  NO BAKED LoRAs — completely clean FLUX.2 Klein 9B.
  Sylvia's appearance is driven entirely by detailed prompts
  until her face LoRA is trained and published.

  This is a SEPARATE Modal app from Holly's endpoint.
  They share the same base model weights volume but nothing else.

  Request format: {"prompt": "...", "width": 1024, "height": 1024}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-image-sylvia")

FLUX_MODEL = "black-forest-labs/FLUX.2-klein-9B"
VOLUME_MOUNT = "/flux-models"
MODEL_CACHE = "/flux-models/bf16"

# Sylvia's permanent body description — injected into EVERY prompt.
# Source of truth: SYLVIA_ANATOMY.md
SYLVIA_BODY_PREFIX = (
    "sylvia, "
    "woman mid-30s fair-light skin with cool-neutral undertone and slight pinkness at cheeks, "
    "mature natural skin texture with visible pores and fine lines around eyes, "
    "round-oval face with soft full cheeks and wider jawline, "
    "grey-green eyes almond-shaped slightly downturned at outer corners, "
    "full naturally thick slightly arched brows, "
    "medium-full lips with noticeably fuller lower lip and pale rose-pink color, "
    "natural dark blonde light brown hair with ash blonde balayage, "
    "long wavy messy hair past shoulders to mid-back, darker roots fading to ash blonde tips, "
    "small silver labret stud piercing below lower lip, "
    "two small dark beauty marks one below right eye one on left jawline, "
    "faint crow's feet at eye corners, subtle nasolabial folds, "
    "5'5\" tall (165cm) chubby pear-shaped body, "
    "wide hips 40-42 inches, full soft thighs that touch when standing, "
    "plump round wide butt, soft slightly rounded lower belly, "
    "natural 30C breasts with mature slope and pale pink nipples, "
    "faint silver stretch marks on hips thighs and lower belly, "
    "subtle cellulite on backs of upper thighs, "
    "soft upper arms, medium-sized hands with short nails, "
    "feet size 7.5 with Greek toe. "
)

# ── NO BAKED LoRAs — completely clean model ─────────────────────────────────
BAKED_LORAS = {}  # intentionally empty — Sylvia has no trained LoRAs yet

# Reuse Holly's model weights volume (same base model, shared cache)
volume = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
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
    gpu="L4",
    max_containers=1,
    scaledown_window=30,
    timeout=300,
    startup_timeout=1200,
    volumes={VOLUME_MOUNT: volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class SylviaFlux2Klein:

    @modal.enter()
    def load_model(self):
        import torch
        from huggingface_hub import snapshot_download, login

        self.pipe = None
        self.model_name = "FLUX.2 Klein 9B - CLEAN (no LoRAs)"
        self.startup_error = None

        # Authenticate with HuggingFace
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
        if hf_token:
            login(token=hf_token)
            print("✅ HuggingFace authenticated")
        else:
            print("⚠️  No HuggingFace token found")

        # Download FLUX.2 Klein 9B BF16 to volume on first run
        # (Shares the same volume as Holly's endpoint — already downloaded)
        try:
            has_index = os.path.exists(f"{MODEL_CACHE}/model_index.json")
            has_transformer = os.path.exists(f"{MODEL_CACHE}/transformer")
            if not has_index or not has_transformer:
                print(f"📥 Downloading {FLUX_MODEL} to volume...")
                snapshot_download(
                    repo_id=FLUX_MODEL,
                    local_dir=MODEL_CACHE,
                    ignore_patterns=["*.md", "original/*"],
                )
                volume.commit()
                print("✅ FLUX.2 Klein 9B BF16 weights saved to volume")
            else:
                print("✅ FLUX.2 Klein 9B BF16 weights in volume (shared with Holly)")
        except Exception as e:
            self.startup_error = f"Model download failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # Load FLUX.2 Klein pipeline — NO LoRAs loaded at all
        try:
            print(f"🚀 Loading FLUX.2 Klein 9B (clean, no LoRAs) from {MODEL_CACHE}...")
            from diffusers import Flux2KleinPipeline

            self.pipe = Flux2KleinPipeline.from_pretrained(
                MODEL_CACHE,
                torch_dtype=torch.bfloat16,
                local_files_only=True,
            )
            print("✅ Pipeline loaded on CPU (no LoRAs)")
        except Exception as e:
            self.startup_error = f"Pipeline load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # Sequential CPU offloading for L4 memory efficiency
        import gc
        gc.collect()
        self.pipe.enable_sequential_cpu_offload()
        torch.cuda.empty_cache()
        print("✅ Sequential CPU offloading enabled")

        print(f"✅ {self.model_name} ready — Sylvia's clean endpoint")

    @modal.fastapi_endpoint(method="POST", label="generate-sylvia")
    def generate(self, request: dict):
        import torch
        import traceback
        from fastapi.responses import Response

        try:
            raw_prompt = (request.get("prompt") or "").strip()

            # Inject Sylvia's body description into every prompt.
            # If the prompt already contains "sylvia", replace it with the full body prefix.
            if "sylvia" in raw_prompt.lower():
                prompt = raw_prompt.replace("sylvia", SYLVIA_BODY_PREFIX.rstrip(", "))
                prompt = prompt.replace("Sylvia", SYLVIA_BODY_PREFIX.rstrip(", "))
            else:
                prompt = SYLVIA_BODY_PREFIX + raw_prompt

            width  = min(int(request.get("width",  1024)), 1024)
            height = min(int(request.get("height", 1024)), 1024)
            steps  = min(int(request.get("num_inference_steps", 4)), 50)
            seed   = request.get("seed")
            fmt    = request.get("format", "jpeg").lower()
            guidance_scale = float(request.get("guidance_scale", 4.0))

            if not prompt:
                return Response(
                    content=b'{"error":"prompt is required"}',
                    media_type="application/json", status_code=400,
                )

            if not hasattr(self, 'pipe') or self.pipe is None:
                return Response(
                    content=b'{"error":"model not loaded"}',
                    media_type="application/json", status_code=503,
                )

            print(f"🎨 [{self.model_name}] {prompt[:100]}")
            generator = torch.Generator("cpu").manual_seed(seed) if seed is not None else None

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

            # ── Face restoration for Sylvia's self-portraits ──
            is_sylvia_selfie = "sylvia" in prompt.lower()
            if is_sylvia_selfie:
                try:
                    from PIL import ImageFilter, ImageEnhance
                    smoothed = img.filter(ImageFilter.GaussianBlur(radius=1.2))
                    img = Image.blend(img, smoothed, alpha=0.25)
                    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=100, threshold=5))
                    img = ImageEnhance.Brightness(img).enhance(1.04)
                    img = ImageEnhance.Color(img).enhance(1.06)
                    print(f"  ✨ Face restoration pass applied (Sylvia self-portrait)")
                except Exception as fre:
                    print(f"  ⚠️ Face restoration pass skipped: {fre}")

            buf = io.BytesIO()
            if fmt == "png":
                img.save(buf, format="PNG")
                media_type = "image/png"
            elif fmt == "webp":
                img.save(buf, format="WEBP", lossless=True)
                media_type = "image/webp"
            elif fmt == "jpeg":
                img.save(buf, format="JPEG", quality=95)
                media_type = "image/jpeg"
            else:
                img.save(buf, format="JPEG", quality=95)
                media_type = "image/jpeg"

            img_bytes = buf.getvalue()
            fmt_label = fmt.upper() if fmt != "webp" else "WEBP (lossless)"
            print(f"✅ {width}x{height} {fmt_label} — {len(img_bytes):,} bytes")

            return Response(
                content=img_bytes,
                media_type=media_type,
                headers={
                    "X-Model":       self.model_name,
                    "X-Provider":    "modal-flux2klein-sylvia",
                    "X-Baked":       "none",
                    "X-Width":       str(width),
                    "X-Height":      str(height),
                    "X-Steps":       str(steps),
                    "X-Guidance":    str(guidance_scale),
                    "X-Version":     "1.0.0",
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

    @modal.fastapi_endpoint(method="GET", label="sylvia-health")
    def health(self):
        from fastapi.responses import JSONResponse
        startup_error = getattr(self, "startup_error", None)
        model_loaded = self.pipe is not None
        action = None
        if startup_error and ("gated" in startup_error.lower() or "401" in startup_error or "403" in startup_error):
            action = "Accept gated repo license at https://huggingface.co/black-forest-labs/FLUX.2-klein-9B"
        return JSONResponse({
            "status":            "healthy" if model_loaded else "waiting",
            "model":             getattr(self, "model_name", "loading..."),
            "model_loaded":      model_loaded,
            "baked_adapters":    "none — clean FLUX.2 Klein 9B",
            "startup_error":     startup_error,
            "action_needed":     action,
            "gpu":               "L4",
            "base_model":        "FLUX.2 Klein 9B BF16",
            "max_gpus":          1,
            "purpose":           "Sylvia V1.1 image generation — no LoRAs, prompt-only",
            "trigger_word":      "sylvia (planned — no LoRA yet)",
            "licence":           "Apache-2.0",
            "version":           "1.0.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy:  modal deploy services/modal-media/image_generate_sylvia.py")
    print("Generate: https://iamhollywoodpro--generate-sylvia.modal.run")
    print("Health:   https://iamhollywoodpro--sylvia-health.modal.run")
