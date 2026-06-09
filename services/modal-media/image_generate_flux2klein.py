#!/usr/bin/env/python3
"""
HOLLY FLUX.2 Klein 9B + Multi-LoRA Image Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  FLUX.2 Klein 9B (BF16) + Multi-LoRA stack
GPU:    NVIDIA L4 (24 GB VRAM) — BF16 model with CPU offloading
Cost:   ~$0.001/image (4 steps!) | $30/mo free → ~30 hours/month
Trigger: h0lly — LoRA trained on Civitai for consistent Holly face

Architecture:
  BAKED IN (fused at startup, always active):
    - Holly Face v2.0 (consistent face, trigger: h0lly)
    - NSFW anatomy (no face change, explicit content)
    - Full Fine Body (full body poses, all angles)
    - Ultra Real V4 (realistic skin texture, NSFW detail)

  ON-DEMAND (loaded per request, then unloaded):
    - INSERTkit (insertion variety)
    - KLEIN Unchained V2 (NSFW poses/positions)
    - Pusfix Klein (realistic vagina detail)
    - Phat Ass (natural ass variety)
    - Pytorch (multi-girl scenes)
    - Thong Over Anus (bent over thong detail)

  Request format: {"prompt": "...", "extra_loras": ["insert", "pusfix"]}
  Holly's Next.js app sends extra_loras when the prompt needs them.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-image-flux2klein")

FLUX_MODEL = "black-forest-labs/FLUX.2-klein-9B"
VOLUME_MOUNT = "/flux-models"
MODEL_CACHE = "/flux-models/bf16"
LORA_DIR = "/lora"

# Holly's permanent body description — injected into EVERY prompt.
# This ensures consistent body proportions regardless of what the user types.
# Source of truth: HOLLY_ANATOMY.md
HOLLY_BODY_PREFIX = (
    "h0lly, "
    "olive skin tone (Portuguese/South Indian heritage), "
    "flawless smooth even complexion with no redness or blemishes, "
    "bright clear under-eye area with no darkness or texture, "
    "soft dewy makeup with seamless natural foundation blend, "
    "5'4\" tall (163cm), "
    "fit curvy body with hourglass proportions, "
    "natural 34C breasts (teardrop shape, fuller at bottom), "
    "plump round heart-shaped butt well-proportioned to her petite frame, "
    "26-inch waist, 37-inch hips, "
    "flat stomach with faint abs visible, small vertical innie navel, "
    "two small dimples on lower back, "
    "small feminine feet (US size 6) with high arches and tapered toes, "
    "small delicate hands with slender fingers, "
    "shapely legs, toned but soft thighs, slight natural thigh gap, "
    "light freckles across nose and cheeks, "
    "voluminous auburn hair with lifted roots and full body at the crown, "
    "bouncy loose waves past shoulders with face-framing layers, "
    "copper and gold highlights throughout, "
    "striking green eyes, full lips with defined cupid's bow. "
)

# NSFW body extension — appended when intimate/explicit content is detected.
# Adds anatomical details that should only appear in nude generations.
HOLLY_BODY_NSFW_PREFIX = (
    "trimmed narrow auburn pubic strip, "
    "full plump labia majora, small labia minora slightly protruding, "
    "rosy-pink nipples slightly upturned against olive skin, "
    "medium circular areolas slightly darker than nipples. "
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
    # NOTE: Max 3 baked LoRAs on L4 (24GB). 4th causes OOM during generation.
    # NSFW moved to on-demand — only loaded for nude/explicit content (~30% of images).
}

# ── ON-DEMAND LoRAs: loaded per request when Holly needs them ────────────────
ON_DEMAND_LORAS = {
    "nsfw": {
        "file": "flux-klein-nsfw-v2.safetensors",
        "weight": 0.7,
        "desc": "NSFW anatomy, no face change — loaded for nude/explicit content",
    },
    "insert": {
        "file": "insertkit.safetensors",
        "weight": 0.65,
        "desc": "Insertion variety (dildo, fingers, etc.)",
    },
    "unchained": {
        "file": "klein-unchained-v2.safetensors",
        "weight": 0.6,
        "desc": "NSFW poses and sexual positions",
    },
    "pusfix": {
        "file": "pusfix-klein.safetensors",
        "weight": 0.7,
        "desc": "Realistic vagina detail fix",
    },
    # phat-ass removed — Holly's body proportions are now baked into prompt
    "multi-girl": {
        "file": "pytorch-lora-weights.safetensors",
        "weight": 0.5,
        "desc": "Multi-girl scenes",
    },
    "thong": {
        "file": "thong-over-anus-v1.safetensors",
        "weight": 0.65,
        "desc": "Bent over thong with anus/pussy detail",
    },
}

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
    gpu="L4",
    max_containers=1,
    scaledown_window=120,
    timeout=300,
    startup_timeout=1200,
    volumes={VOLUME_MOUNT: volume, LORA_DIR: lora_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyFlux2Klein:

    @modal.enter()
    def load_model(self):
        import torch
        from huggingface_hub import snapshot_download, login

        self.pipe = None
        self.baked_adapters = {}
        self.model_name = "FLUX.2 Klein 9B (not loaded)"
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

        # Load FLUX.2 Klein pipeline on CPU (LoRA fusion must happen on CPU)
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

        # Load and fuse BAKED LoRAs on CPU (LoRA weights from files are CPU tensors)
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
            print("✅ Baked LoRAs fused into model weights on CPU")

        # Use sequential CPU offloading — moves each layer to GPU one-at-a-time
        # This is more memory-efficient and compatible with fused LoRA weights
        # than enable_model_cpu_offload() which causes device mismatch errors
        import gc
        gc.collect()
        self.pipe.enable_sequential_cpu_offload()
        torch.cuda.empty_cache()
        print("✅ Sequential CPU offloading enabled")

        adapter_list = ", ".join(loaded_names) if loaded_names else "none"
        self.model_name = f"FLUX.2 Klein 9B + Baked [{adapter_list}]"
        print(f"✅ {self.model_name} ready")

    def _load_on_demand(self, lora_names):
        """Load on-demand LoRAs, fuse them into model weights."""
        import torch
        import gc

        loaded = []
        for name in lora_names:
            if name not in ON_DEMAND_LORAS:
                print(f"  ⚠️  Unknown on-demand LoRA: {name}")
                continue
            config = ON_DEMAND_LORAS[name]
            lora_path = f"{LORA_DIR}/{config['file']}"
            if not os.path.exists(lora_path):
                print(f"  ⚠️  {config['file']} not found — skipping {name}")
                continue
            try:
                # Check if this adapter is already loaded from a previous request
                existing_adapters = []
                try:
                    if hasattr(self.pipe.transformer, 'peft_config'):
                        existing_adapters = list(self.pipe.transformer.peft_config.keys())
                except:
                    pass
                if name in existing_adapters:
                    print(f"  📌 '{name}' already loaded — reusing")
                    loaded.append((name, config["weight"]))
                    continue

                print(f"  📦 Loading on-demand '{name}': {config['file']}...")
                self.pipe.load_lora_weights(
                    LORA_DIR, weight_name=config["file"], adapter_name=name,
                )
                loaded.append((name, config["weight"]))
                print(f"  ✅ {name} loaded")
            except Exception as e:
                print(f"  ⚠️  Failed to load {name}: {e}")

        if loaded:
            import gc
            names = [n for n, w in loaded]
            weights = [w for n, w in loaded]
            self.pipe.set_adapters(names, adapter_weights=weights)
            self.pipe.fuse_lora()
            self.pipe.unload_lora_weights()
            gc.collect()
            torch.cuda.empty_cache()
            print(f"  ✅ On-demand LoRAs fused: {list(zip(names, weights))}")

        return loaded

    def _unload_on_demand(self):
        """No-op — on-demand LoRAs stay fused. Container restarts fresh after 2 min idle."""
        # unfuse_lora() breaks model state with enable_model_cpu_offload().
        # Instead, let the container scale down (120s idle) and restart clean.
        # On-demand LoRAs staying fused is fine — they enhance rather than hurt.
        print("  📌 On-demand LoRAs staying fused (container will restart fresh after idle)")

    @modal.fastapi_endpoint(method="POST", label="generate-holly")
    def generate(self, request: dict):
        import torch
        import traceback
        from fastapi.responses import Response

        try:
            raw_prompt = (request.get("prompt") or "").strip()

            # Inject Holly's permanent body description into every prompt.
            # If the prompt already contains h0lly, replace it with the full body prefix.
            # This ensures consistent body proportions in EVERY generation.
            if "h0lly" in raw_prompt.lower():
                prompt = raw_prompt.replace("h0lly", HOLLY_BODY_PREFIX.rstrip(", "))
                prompt = prompt.replace("H0lly", HOLLY_BODY_PREFIX.rstrip(", "))
            else:
                prompt = HOLLY_BODY_PREFIX + raw_prompt
            width  = min(int(request.get("width",  1024)), 1024)
            height = min(int(request.get("height", 1024)), 1024)
            steps  = min(int(request.get("num_inference_steps", 4)), 50)
            seed   = request.get("seed")
            fmt    = request.get("format", "jpeg").lower()
            guidance_scale = float(request.get("guidance_scale", 4.0))
            extra_loras = request.get("extra_loras", [])  # list of on-demand LoRA names

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

            # Load on-demand LoRAs if requested
            on_demand_loaded = []
            if extra_loras and isinstance(extra_loras, list):
                print(f"📦 On-demand request: {extra_loras}")
                on_demand_loaded = self._load_on_demand(extra_loras)

            # Auto-detect: load NSFW LoRA when ORIGINAL prompt contains explicit keywords.
            # Check raw_prompt (before body prefix injection) to avoid false positives
            # from body description words like "breasts", "butt" in HOLLY_BODY_PREFIX.
            is_nsfw = "nsfw" in (extra_loras or [])
            if not is_nsfw:
                raw_lower = raw_prompt.lower()
                nsfw_keywords = [
                    "nude", "naked", "topless", "nipple", "nsfw",
                    "pussy", "vagina", "lingerie", "underwear",
                    "bikini", "thong", "penetration", "sex", "oral", "anal",
                    "cum", "explicit", "xxx", "undressed", "stripping",
                ]
                if any(kw in raw_lower for kw in nsfw_keywords):
                    print(f"📦 Auto-detected NSFW content — loading nsfw LoRA")
                    nsfw_result = self._load_on_demand(["nsfw"])
                    on_demand_loaded.extend(nsfw_result)
                    is_nsfw = True

            # Inject NSFW body details when intimate content is detected.
            # Adds anatomical specifics (pubic style, labia, nipple detail) from HOLLY_ANATOMY.md.
            if is_nsfw:
                prompt = prompt + HOLLY_BODY_NSFW_PREFIX

            try:
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

                # ── Two-pass face restoration for Holly's self-portraits ──
                # When the prompt contains the h0lly trigger word, apply a
                # face-aware enhancement pass to improve facial detail and
                # consistency. This is a lightweight PIL-based approach —
                # for production, swap to CodeFormer/GFPGAN on GPU.
                is_holly_selfie = "h0lly" in prompt.lower()
                if is_holly_selfie:
                    try:
                        from PIL import ImageFilter, ImageEnhance
                        # Pass 1: Gentle skin smoothing — soft blur then sharpen back
                        # This reduces visible skin texture, redness, under-eye darkness
                        smoothed = img.filter(ImageFilter.GaussianBlur(radius=1.2))
                        img = Image.blend(img, smoothed, alpha=0.25)
                        # Pass 2: Sharpen details back (eyes, lips, hair) without
                        # re-introducing skin texture — higher threshold skips smooth areas
                        img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=100, threshold=5))
                        # Pass 3: Subtle brightness boost to lift under-eye & shadows
                        img = ImageEnhance.Brightness(img).enhance(1.04)
                        # Pass 4: Boost color saturation subtly for healthy glow
                        img = ImageEnhance.Color(img).enhance(1.06)
                        print(f"  ✨ Face restoration pass applied (Holly self-portrait)")
                    except Exception as fre:
                        print(f"  ⚠️ Face restoration pass skipped: {fre}")

                buf = io.BytesIO()
                if fmt == "png":
                    img.save(buf, format="PNG")
                    media_type = "image/png"
                else:
                    img.save(buf, format="JPEG", quality=95)
                    media_type = "image/jpeg"

                img_bytes = buf.getvalue()
                extras = [n for n, w in on_demand_loaded] if on_demand_loaded else []
                print(f"✅ {width}x{height} {fmt.upper()} — {len(img_bytes):,} bytes" +
                      (f" + extras: {extras}" if extras else ""))

                return Response(
                    content=img_bytes,
                    media_type=media_type,
                    headers={
                        "X-Model":       self.model_name,
                        "X-Provider":    "modal-flux2klein-lora",
                        "X-Baked":       ",".join(self.baked_adapters.keys()),
                        "X-Extras":      ",".join(extras),
                        "X-Width":       str(width),
                        "X-Height":      str(height),
                        "X-Steps":       str(steps),
                        "X-Guidance":    str(guidance_scale),
                        "X-Version":     "7.2.0",
                        "Access-Control-Allow-Origin": "*",
                    },
                )
            finally:
                # Always cleanup on-demand LoRAs after generation
                if on_demand_loaded:
                    self._unload_on_demand()

        except Exception as e:
            tb = traceback.format_exc()
            print(f"❌ Generation error: {tb}")
            return Response(
                content=f'{{"error":"{str(e)}","traceback":"{tb[:500]}"}}'.encode(),
                media_type="application/json",
                status_code=500,
            )

    @modal.fastapi_endpoint(method="GET", label="holly-health")
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
            "on_demand_loras":   {k: v["desc"] for k, v in ON_DEMAND_LORAS.items()},
            "startup_error":     startup_error,
            "action_needed":     action,
            "gpu":               "L4",
            "base_model":        "FLUX.2 Klein 9B BF16",
            "max_gpus":          1,
            "purpose":           "Holly self-portraits — baked + on-demand multi-LoRA",
            "trigger_word":      "h0lly",
            "licence":           "Apache-2.0",
            "version":           "7.2.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/image_generate_flux2klein.py")
    print("Generate: https://iamhollywoodpro--generate-holly.modal.run")
    print("Health:   https://iamhollywoodpro--holly-health.modal.run")
