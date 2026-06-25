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
    - Holly Face v2.0 (0.85 — consistent face, trigger: h0lly)
    - Holly Body v1.0 (0.50 — lowered so specialists can drive pose, trigger: h0lly-body)

  Realism LoRA removed — FLUX Klein's native quality is cleaner.
  No CPU offloading. Full precision on A100.

  Request format: {"prompt": "...", "width": 1024, "height": 1024}

  Daily chat endpoint: image_generate_flux2klein.py (L4)
  Dataset generation:   THIS FILE (A100)

  Dynamic LoRA Stacking (v1.3.0):
    Requests may include a "loras" array to apply specialist LoRAs on top
    of the baked face+body. Up to 4 dynamic LoRAs per request.
    Format: {"loras": [{"file": "name.safetensors", "strength": 0.7}, ...]}
    Dynamic LoRAs are loaded, applied via set_adapters, used for one image,
    then unloaded so the next request starts clean.

  Inpainting (v1.5.0):
    POST /inpaint-holly-a100 with image + mask + prompt to regenerate a
    masked region of an existing image. Shares transformer/VAE/text_encoder
    with the main pipeline, so baked face+body LoRAs are inherited.
    Used for explicit content that one-pass generation can't produce
    (insertion, anatomy fixes on specific zones).
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

# Uncensored text encoder — drop-in replacement for Klein's stock Qwen3-8B.
# Stock encoder has safety filters that silently soften/softblock NSFW prompts.
# DuoNeural/Qwen3-8B-Abliterated removes refusal vectors via orthogonal projection.
# Same arch (4096/36/32/151936), BF16, 4 shards — exact drop-in.
# If dir missing, falls back to stock encoder automatically.
UNCENSORED_ENCODER_DIR = f"{MODEL_CACHE}/text_encoder_uncensored"

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
    "very large plump round juicy butt, thick full bubble-butt cheeks, generous curvy wide ass proportional to her hourglass frame, "
    "wide hips, thick shapely thighs, flat stomach with faint abs, "
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
    "body": {
        "file": "holly-body-v2.5.safetensors",
        "weight": 0.75,
        "desc": "Holly Body v2.5 (trigger: h0lly-body) — 207-img dataset, raised weight since v2.5 trained properly",
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
    timeout=600,
    startup_timeout=2400,  # first cold start downloads FLUX + encoder (~30 min)
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

        # ── Download uncensored Qwen3-8B text encoder to volume on first run ──
        # Stock Qwen3-8B in Klein has safety filters that soften NSFW prompts.
        # DuoNeural/Qwen3-8B-Abliterated removes refusal vectors via orthogonal
        # projection. Auto-downloads from HuggingFace if not on volume.
        # Added June 20, 2026 for iamhollywoodpro workspace migration.
        if not os.path.exists(UNCENSORED_ENCODER_DIR):
            try:
                print(f"📥 Downloading DuoNeural/Qwen3-8B-Abliterated encoder to volume...")
                snapshot_download(
                    repo_id="DuoNeural/Qwen3-8B-Abliterated",
                    local_dir=UNCENSORED_ENCODER_DIR,
                    ignore_patterns=["*.md", "original/*"],
                )
                volume.commit()
                print("✅ Uncensored Qwen3-8B encoder saved to volume")
            except Exception as enc_e:
                print(f"⚠️  Uncensored encoder download failed: {enc_e}")
                print(f"     Will fall back to stock Klein encoder (NSFW may be filtered)")

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

        # ── Swap in uncensored Qwen3-8B text encoder ───────────────────────
        # Stock Qwen3-8B in Klein has safety filters that soften NSFW prompts.
        # The abliterated version removes refusal vectors so prompts pass through
        # unfiltered. Tokenizer stays as Klein's stock (compatible with Qwen3 base).
        # Inpaint pipeline (initialized below) inherits this swap automatically
        # because it reads self.pipe.text_encoder at construction time.
        self.uncensored = False
        if os.path.exists(UNCENSORED_ENCODER_DIR):
            try:
                print(f"🔓 Loading uncensored text encoder from {UNCENSORED_ENCODER_DIR}...")
                from transformers import Qwen3ForCausalLM

                uncensored_encoder = Qwen3ForCausalLM.from_pretrained(
                    UNCENSORED_ENCODER_DIR,
                    torch_dtype=torch.bfloat16,
                    local_files_only=True,
                )
                # Free the stock encoder before swapping to save VRAM
                del self.pipe.text_encoder
                self.pipe.text_encoder = uncensored_encoder
                self.uncensored = True
                print("✅ Uncensored Qwen3-8B text encoder swapped in")
            except Exception as e:
                print(f"⚠️  Uncensored encoder swap failed: {e}")
                print(f"     Falling back to stock Klein text encoder")
        else:
            print(f"ℹ️  No uncensored encoder at {UNCENSORED_ENCODER_DIR}")
            print(f"     Using stock Klein text encoder (NSFW may be filtered)")

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
        encoder_tag = "uncensored" if self.uncensored else "stock-encoder"
        self.model_name = f"FLUX.2 Klein 9B A100 + Baked [{adapter_list}] ({encoder_tag})"
        print(f"✅ {self.model_name} ready")

        # ── Load inpaint pipeline (shares transformer/VAE/text_encoder with main pipe) ──
        # The inpaint pipeline uses the same model components but supports image+mask input.
        # Baked face+body LoRAs are already fused into self.pipe.transformer weights,
        # so inpaint requests automatically benefit from Holly's identity.
        self.inpaint_pipe = None
        try:
            from diffusers import Flux2KleinInpaintPipeline
            print("🎭 Loading Flux2KleinInpaintPipeline (shared components)...")
            self.inpaint_pipe = Flux2KleinInpaintPipeline(
                vae=self.pipe.vae,
                text_encoder=self.pipe.text_encoder,
                tokenizer=self.pipe.tokenizer,
                scheduler=self.pipe.scheduler,
                transformer=self.pipe.transformer,
            )
            print("✅ Inpaint pipeline ready — baked identity inherited from main pipe")
        except ImportError:
            print("⚠️  Flux2KleinInpaintPipeline not available in this diffusers version")
            print("    Inpaint requests will return 503 — update diffusers to enable")
        except Exception as e:
            print(f"⚠️  Inpaint pipeline load failed: {e}")
            print("    Inpaint requests will return 503")

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
            # Klein Distilled sweet spot: CFG 1.0-1.5 (NOT 4.0 — that's for non-distilled).
            # Previous default of 4.0 was producing over-guided artifacts on distilled model.
            # Higher CFG on distilled = burnt/oversaturated images.
            guidance_scale = float(request.get("guidance_scale", 1.2))

            # ── Dynamic LoRA Stack (specialists layered on top of baked face+body) ──
            # Format: [{"file": "name.safetensors", "strength": 0.7}, ...]
            # Up to 4 dynamic LoRAs. Files must exist on the holly-lora-weights volume.
            request_loras = request.get("loras") or []
            if not isinstance(request_loras, list):
                request_loras = [request_loras]

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

            # Load each dynamic LoRA and activate. Baked face+body stays fused in
            # the model weights; these are layered on top via set_adapters.
            import re
            dynamic_adapters = []  # list of (adapter_name, filename, strength)
            for i, spec in enumerate(request_loras[:4]):
                if isinstance(spec, dict):
                    fname = spec.get("file") or spec.get("name")
                    strength = float(spec.get("strength", 0.7))
                else:
                    fname = str(spec)
                    strength = 0.7
                if not fname:
                    continue
                # Security: only filenames, no paths
                if "/" in fname or "\\" in fname or ".." in fname:
                    print(f"  ⚠️ Rejected path in LoRA filename: {fname}")
                    continue
                lora_path = f"{LORA_DIR}/{fname}"
                if not os.path.exists(lora_path):
                    print(f"  ⚠️ Dynamic LoRA not found on volume: {fname}")
                    continue
                # Adapter names must be valid Python identifiers — no dots, dashes, etc.
                # PEFT raises "module name can't contain '.'" if we use the raw filename.
                stem = fname.replace(".safetensors", "").replace(".safetensor", "")
                safe_stem = re.sub(r"[^a-zA-Z0-9_]", "_", stem)[:30]
                adapter_name = f"dyn_{i}_{safe_stem}"
                try:
                    self.pipe.load_lora_weights(
                        LORA_DIR, weight_name=fname, adapter_name=adapter_name,
                    )
                    dynamic_adapters.append((adapter_name, fname, strength))
                    print(f"  🎭 Dynamic LoRA loaded: {fname} @ {strength}")
                except Exception as le:
                    print(f"  ⚠️ Failed to load {fname}: {le}")

            if dynamic_adapters:
                try:
                    self.pipe.set_adapters(
                        [a[0] for a in dynamic_adapters],
                        adapter_weights=[a[2] for a in dynamic_adapters],
                    )
                    active_str = ", ".join(f"{a[1]}@{a[2]}" for a in dynamic_adapters)
                    print(f"  🎭 Active dynamic stack: {active_str}")
                except Exception as se:
                    print(f"  ⚠️ set_adapters failed: {se}")

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

            # ── Cleanup dynamic LoRAs so the next request starts clean ──
            # Baked face+body are fused into weights — unaffected by this unload.
            if dynamic_adapters:
                try:
                    self.pipe.unload_lora_weights()
                    print(f"  🧹 Dynamic LoRAs unloaded ({len(dynamic_adapters)})")
                except Exception as ce:
                    print(f"  ⚠️ LoRA cleanup issue: {ce}")

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

            dynamic_header = ";".join(f"{a[1]}@{a[2]}" for a in dynamic_adapters) if dynamic_adapters else "none"

            return Response(
                content=img_bytes,
                media_type=media_type,
                headers={
                    "X-Model":       self.model_name,
                    "X-Provider":    "modal-flux2klein-a100",
                    "X-Baked":       ",".join(self.baked_adapters.keys()),
                    "X-Dynamic":     dynamic_header,
                    "X-Width":       str(width),
                    "X-Height":      str(height),
                    "X-Steps":       str(steps),
                    "X-Guidance":    str(guidance_scale),
                    "X-Version":     "1.5.0",
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

    @modal.fastapi_endpoint(method="POST", label="inpaint-holly-a100")
    def inpaint(self, request: dict):
        """
        Inpaint endpoint — regenerate a masked region of an existing image.

        Request format:
            {
                "image":   "<base64-encoded source image>",
                "mask":    "<base64-encoded mask (white=regen, black=keep)>",
                "prompt":  "explicit description of what to generate in masked zone",
                "strength": 0.8,           # how strongly to deviate from source
                "width":   1024, "height": 1024,
                "num_inference_steps": 8,
                "guidance_scale": 4.0,
                "seed":    null,
                "format":  "webp"
            }

        Baked face+body LoRAs are inherited from the main pipeline (fused into weights).
        Dynamic specialists are NOT loaded here — the base generation should stack those.
        """
        import base64
        import io
        import torch
        import traceback
        from PIL import Image
        from fastapi.responses import Response

        try:
            if not hasattr(self, 'inpaint_pipe') or self.inpaint_pipe is None:
                return Response(
                    content=b'{"error":"inpaint pipeline not available on this endpoint"}',
                    media_type="application/json", status_code=503,
                )

            image_b64 = request.get("image")
            mask_b64 = request.get("mask")
            raw_prompt = (request.get("prompt") or "").strip()

            if not image_b64 or not mask_b64 or not raw_prompt:
                return Response(
                    content=b'{"error":"image, mask, and prompt are required"}',
                    media_type="application/json", status_code=400,
                )

            # Decode source image
            try:
                image_bytes = base64.b64decode(image_b64)
                source_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            except Exception as ie:
                return Response(
                    content=f'{{"error":"invalid image base64: {ie}"}}'.encode(),
                    media_type="application/json", status_code=400,
                )

            # Decode mask (grayscale — white = regenerate, black = keep)
            try:
                mask_bytes = base64.b64decode(mask_b64)
                mask_image = Image.open(io.BytesIO(mask_bytes)).convert("L")
            except Exception as me:
                return Response(
                    content=f'{{"error":"invalid mask base64: {me}"}}'.encode(),
                    media_type="application/json", status_code=400,
                )

            # Inject Holly body prefix into prompt
            if "h0lly" in raw_prompt.lower():
                prompt = raw_prompt.replace("h0lly", HOLLY_BODY_PREFIX.rstrip(", "))
                prompt = prompt.replace("H0lly", HOLLY_BODY_PREFIX.rstrip(", "))
            else:
                prompt = HOLLY_BODY_PREFIX + raw_prompt

            strength = max(0.1, min(float(request.get("strength", 0.8)), 1.0))
            width  = min(int(request.get("width",  1024)), 1024)
            height = min(int(request.get("height", 1024)), 1024)
            steps  = min(int(request.get("num_inference_steps", 8)), 50)
            seed   = request.get("seed")
            fmt    = request.get("format", "webp").lower()
            guidance_scale = float(request.get("guidance_scale", 4.0))

            # ── Dynamic LoRA Stack (same as generate endpoint) ──
            # Format: [{"file": "name.safetensors", "strength": 0.7}, ...]
            # Loaded onto the shared transformer — affects both pipes since they share weights.
            request_loras = request.get("loras") or []
            if not isinstance(request_loras, list):
                request_loras = [request_loras]

            import re
            dynamic_adapters = []
            for i, spec in enumerate(request_loras[:4]):
                if isinstance(spec, dict):
                    fname = spec.get("file") or spec.get("name")
                    lora_strength = float(spec.get("strength", 0.7))
                else:
                    fname = str(spec)
                    lora_strength = 0.7
                if not fname:
                    continue
                if "/" in fname or "\\" in fname or ".." in fname:
                    print(f"  ⚠️ Rejected path in LoRA filename: {fname}")
                    continue
                lora_path = f"{LORA_DIR}/{fname}"
                if not os.path.exists(lora_path):
                    print(f"  ⚠️ Dynamic LoRA not found on volume: {fname}")
                    continue
                stem = fname.replace(".safetensors", "").replace(".safetensor", "")
                safe_stem = re.sub(r"[^a-zA-Z0-9_]", "_", stem)[:30]
                adapter_name = f"inpaint_{i}_{safe_stem}"
                try:
                    # Load onto the shared transformer (both pipes will see it)
                    self.inpaint_pipe.load_lora_weights(
                        LORA_DIR, weight_name=fname, adapter_name=adapter_name,
                    )
                    dynamic_adapters.append((adapter_name, fname, lora_strength))
                    print(f"  🎭 Inpaint LoRA loaded: {fname} @ {lora_strength}")
                except Exception as le:
                    print(f"  ⚠️ Failed to load {fname}: {le}")

            if dynamic_adapters:
                try:
                    self.inpaint_pipe.set_adapters(
                        [a[0] for a in dynamic_adapters],
                        adapter_weights=[a[2] for a in dynamic_adapters],
                    )
                    active_str = ", ".join(f"{a[1]}@{a[2]}" for a in dynamic_adapters)
                    print(f"  🎭 Active inpaint stack: {active_str}")
                except Exception as se:
                    print(f"  ⚠️ set_adapters failed: {se}")

            print(f"🎨 INPAINT [{self.model_name}] strength={strength}")
            print(f"   prompt: {prompt[:100]}")
            print(f"   image: {source_image.size}, mask: {mask_image.size}")

            generator = torch.Generator("cpu").manual_seed(seed) if seed is not None else None

            with torch.inference_mode():
                result = self.inpaint_pipe(
                    prompt=prompt,
                    image=source_image,
                    mask_image=mask_image,
                    strength=strength,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                )

            img = result.images[0]

            # Cleanup dynamic LoRAs so next request starts clean
            if dynamic_adapters:
                try:
                    self.inpaint_pipe.unload_lora_weights()
                    print(f"  🧹 Inpaint LoRAs unloaded ({len(dynamic_adapters)})")
                except Exception as ce:
                    print(f"  ⚠️ LoRA cleanup issue: {ce}")

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
            print(f"✅ Inpaint {width}x{height} strength={strength} — {len(img_bytes):,} bytes")

            return Response(
                content=img_bytes,
                media_type=media_type,
                headers={
                    "X-Model":    self.model_name,
                    "X-Provider": "modal-flux2klein-a100",
                    "X-Mode":     "inpaint",
                    "X-Strength": str(strength),
                    "X-Version":  "1.5.1",
                    "Access-Control-Allow-Origin": "*",
                },
            )

        except Exception as e:
            tb = traceback.format_exc()
            print(f"❌ Inpaint error: {tb}")
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
        inpaint_loaded = getattr(self, "inpaint_pipe", None) is not None
        action = None
        if startup_error and ("gated" in startup_error.lower() or "401" in startup_error or "403" in startup_error):
            action = "Accept gated repo license at https://huggingface.co/black-forest-labs/FLUX.2-klein-9B"
        return JSONResponse({
            "status":            "healthy" if model_loaded else "waiting",
            "model":             getattr(self, "model_name", "loading..."),
            "model_loaded":      model_loaded,
            "inpaint_available": inpaint_loaded,
            "baked_adapters":    {k: v["desc"] for k, v in getattr(self, "baked_adapters", {}).items()},
            "startup_error":     startup_error,
            "action_needed":     action,
            "gpu":               "A100",
            "base_model":        "FLUX.2 Klein 9B BF16",
            "max_gpus":          1,
            "purpose":           "Holly dataset generation — A100 full precision, lossless output + inpainting",
            "trigger_word":      "h0lly",
            "licence":           "Apache-2.0",
            "version":           "1.5.1",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/image_generate_flux2klein_a100.py")
    print("Generate: https://iamhollywoodpro--generate-holly-a100.modal.run")
    print("Health:   https://iamhollywoodpro--holly-health-a100.modal.run")
