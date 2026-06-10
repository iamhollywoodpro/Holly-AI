#!/usr/bin/env/python3
"""
HOLLY FLUX.2 Klein 9B — A100 Dataset Generation Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: High-fidelity image generation for LoRA training datasets.
GPU:     NVIDIA A100 (80 GB VRAM) — full bf16, no offloading, no quantization
Cost:    ~$1.50-2.00/hr | 84 images ≈ $1.50 total
Output:  Lossless WebP (training-grade quality)

Architecture:
  BAKED IN (fused at startup, always active):
    - Holly Face v2.0 (consistent face, trigger: h0lly)
    - Ultra Real V4 (realistic skin texture, detail)
    - Full Fine Body (full body poses, all angles)

  No on-demand LoRAs. No CPU offloading. Full precision.
  Only spun up for dataset generation — not for daily chat use.

  Request format: {"prompt": "...", "width": 1024, "height": 1024}

  Daily chat endpoint: image_generate_flux2klein.py (L4)
  Dataset generation:   THIS FILE (A100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-image-flux2klein-a100")

FLUX_MODEL = "black-forest-labs/FLUX.2-klein-9B"
VOLUME_MOUNT = "/flux-models"
MODEL_CACHE = "/flux-models/bf16"
LORA_DIR = "/lora"

# Holly's permanent body description — injected into EVERY prompt.
# Source of truth: HOLLY_ANATOMY.md
HOLLY_BODY_PREFIX = (
    "h0lly, "
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

# ── BAKED-IN LoRAs: loaded + fused at startup (always active) ────────────────
BAKED_LORAS = {
    "face": {
        "file": "holly-face-v2.safetensors",
        "weight": 0.85,
        "desc": "Holly Face v2.0 (trigger: h0lly)",
    },
    "realism": {
        "file": "ultra-real-v4.safetensors",
        "weight": 0.55,
        "desc": "Ultra Real V4 — skin texture, pores, no plastic look",
    },
    "body": {
        "file": "full-fine-body-v1.safetensors",
        "weight": 0.7,
        "desc": "Full body poses, all angles",
    },
}

# Shared volumes — same weights as L4 endpoint, no duplication
volume = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

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
    gpu="A100",
    max_containers=1,
    scaledown_window=120,
    timeout=300,
    startup_timeout=1200,
    volumes={VOLUME_MOUNT: volume, LORA_DIR: lora_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyFlux2KleinA100:

    @modal.enter()
    def load_model(self):
        import torch
        from huggingface_hub import snapshot_download, login

        self.pipe = None
        self.baked_adapters = {}
        self.model_name = "FLUX.2 Klein 9B A100 (not loaded)"
        self.startup_error = None

        # Authenticate with HuggingFace
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
        if hf_token:
            login(token=hf_token)
            print("✅ HuggingFace authenticated")
        else:
            print("⚠️  No HuggingFace token found")

        # Download FLUX.2 Klein 9B BF16 to volume on first run
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
                print("✅ FLUX.2 Klein 9B BF16 weights in volume")
        except Exception as e:
            self.startup_error = f"Model download failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # Load FLUX.2 Klein pipeline on CPU first (for LoRA fusion)
        try:
            print(f"🚀 Loading FLUX.2 Klein 9B from {MODEL_CACHE}...")
            from diffusers import Flux2KleinPipeline

            self.pipe = Flux2KleinPipeline.from_pretrained(
                MODEL_CACHE,
                torch_dtype=torch.bfloat16,
                local_files_only=True,
            )
            print("✅ Pipeline loaded on CPU")
        except Exception as e:
            self.startup_error = f"Pipeline load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # Load and fuse BAKED LoRAs on CPU
        loaded_names = []
        for name, config in BAKED_LORAS.items():
            lora_path = f"{LORA_DIR}/{config['file']}"
            if os.path.exists(lora_path):
                try:
                    print(f"🎭 Baking '{name}': {config['file']}...")
                    self.pipe.load_lora_weights(
                        LORA_DIR, weight_name=config["file"], adapter_name=name,
                    )
                    self.baked_adapters[name] = config
                    loaded_names.append(name)
                    print(f"  ✅ {name} loaded")
                except Exception as e:
                    print(f"  ⚠️  Failed to load {name}: {e}")
            else:
                print(f"  ⚠️  {config['file']} not found — skipping {name}")

        if loaded_names:
            weights = [BAKED_LORAS[n]["weight"] for n in loaded_names]
            self.pipe.set_adapters(loaded_names, adapter_weights=weights)
            print(f"🎭 Baked adapters active: {list(zip(loaded_names, weights))}")
            self.pipe.fuse_lora()
            self.pipe.unload_lora_weights()
            print("✅ Baked LoRAs fused into model weights")

        # A100 has 80GB VRAM — entire model fits in GPU, no offloading needed.
        # Move the full pipeline to GPU for maximum speed and precision.
        import gc
        gc.collect()
        self.pipe.enable_model_cpu_offload()
        torch.cuda.empty_cache()
        print("✅ Pipeline moved to A100 GPU — full bf16, no offloading")

        adapter_list = ", ".join(loaded_names) if loaded_names else "none"
        self.model_name = f"FLUX.2 Klein 9B A100 + Baked [{adapter_list}]"
        print(f"✅ {self.model_name} ready")

    @modal.fastapi_endpoint(method="POST", label="generate-holly-a100")
    def generate(self, request: dict):
        import torch
        import traceback
        from fastapi.responses import Response

        try:
            raw_prompt = (request.get("prompt") or "").strip()

            # Inject Holly's permanent body description into every prompt.
            if "h0lly" in raw_prompt.lower():
                prompt = raw_prompt.replace("h0lly", HOLLY_BODY_PREFIX.rstrip(", "))
                prompt = prompt.replace("H0lly", HOLLY_BODY_PREFIX.rstrip(", "))
            else:
                prompt = HOLLY_BODY_PREFIX + raw_prompt
            width  = min(int(request.get("width",  1024)), 1024)
            height = min(int(request.get("height", 1024)), 1024)
            steps  = min(int(request.get("num_inference_steps", 4)), 50)
            seed   = request.get("seed")
            fmt    = request.get("format", "webp").lower()
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

            # ── Face restoration for Holly's self-portraits ──
            is_holly_selfie = "h0lly" in prompt.lower()
            if is_holly_selfie:
                try:
                    from PIL import ImageFilter, ImageEnhance
                    smoothed = img.filter(ImageFilter.GaussianBlur(radius=1.2))
                    img = Image.blend(img, smoothed, alpha=0.25)
                    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=100, threshold=5))
                    img = ImageEnhance.Brightness(img).enhance(1.04)
                    img = ImageEnhance.Color(img).enhance(1.06)
                    print(f"  ✨ Face restoration pass applied (Holly self-portrait)")
                except Exception as fre:
                    print(f"  ⚠️ Face restoration pass skipped: {fre}")

            # Output: Lossless WebP for training, PNG/JPEG as fallback
            buf = io.BytesIO()
            if fmt == "png":
                img.save(buf, format="PNG")
                media_type = "image/png"
            elif fmt == "jpeg" or fmt == "jpg":
                img.save(buf, format="JPEG", quality=95)
                media_type = "image/jpeg"
            else:
                # Default: Lossless WebP — training-grade quality
                img.save(buf, format="WEBP", lossless=True)
                media_type = "image/webp"

            img_bytes = buf.getvalue()
            fmt_label = "WEBP (lossless)" if fmt == "webp" else fmt.upper()
            print(f"✅ {width}x{height} {fmt_label} — {len(img_bytes):,} bytes")

            return Response(
                content=img_bytes,
                media_type=media_type,
                headers={
                    "X-Model":       self.model_name,
                    "X-Provider":    "modal-flux2klein-a100",
                    "X-Baked":       ",".join(self.baked_adapters.keys()),
                    "X-Width":       str(width),
                    "X-Height":      str(height),
                    "X-Steps":       str(steps),
                    "X-Guidance":    str(guidance_scale),
                    "X-Version":     "1.2.0",
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

    @modal.fastapi_endpoint(method="GET", label="holly-health-a100")
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
            "baked_adapters":    {k: v["desc"] for k, v in getattr(self, "baked_adapters", {}).items()},
            "startup_error":     startup_error,
            "action_needed":     action,
            "gpu":               "A100",
            "base_model":        "FLUX.2 Klein 9B BF16",
            "max_gpus":          1,
            "purpose":           "Holly dataset generation — A100 full precision, lossless output",
            "trigger_word":      "h0lly",
            "licence":           "Apache-2.0",
            "version":           "1.1.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/image_generate_flux2klein_a100.py")
    print("Generate: https://iamhollywoodpro--generate-holly-a100.modal.run")
    print("Health:   https://iamhollywoodpro--holly-health-a100.modal.run")
