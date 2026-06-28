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
# IMPORTANT: Includes explicit nudity anchors because Klein base has strong
# clothing priors. Without these, even an explicit user prompt produces
# "topless with shorts." The body LoRA was trained on these exact phrases.
HOLLY_BODY_PREFIX = (
    "h0lly, h0lly-body, 21 years old woman in her early twenties, youthful young adult, "
    "completely nude woman, fully naked, bare skin, not wearing any clothing, "
    "no clothing anywhere on her body, zero garments, bare from head to toe, "
    "olive skin tone (Portuguese/South Indian heritage), "
    "flawless silky smooth even complexion, clean healthy well-moisturized sheen, "
    "uniform clear flawless skin texture, perfectly clean and even, "
    "realistic skin stretching and folding at joints, natural living skin texture with micro-veins, "
    "smooth bright under-eye area, no eye bags, no dark circles, no lines under her eyes, smooth wrinkle-free youthful under-eyes, "
    "soft smooth gentle skin texture, soft feminine features, overall soft youthful look, "
    "barely visible natural cheek color, no blush, neutral cheek tone matching surrounding skin, "
    "youthful early-twenties face, fresh young adult features, smooth forehead, plump youthful skin, "
    "youthful round full face with soft wider jaw, generous full pinchable cheeks, softer fuller facial structure, healthy round face shape, "
    "5'4\" tall (163cm), "
    "fit healthy toned figure with soft feminine curves, "
    "fit but not overly lean, healthy athletic build with a soft layer of feminine fullness, "
    "natural 34C breasts, teardrop shape, "
    "very large plump round juicy butt, thick full bubble-butt cheeks, generous curvy wide ass proportional to her hourglass frame, "
    "wide hips, thick shapely thighs, flat stomach with faint abs, "
    "small feminine feet (size 6), delicate hands, shapely legs, "
    "extra-thick voluminous auburn hair with massive body and bounce, "
    "root-lifted crown with teased voluminous roots for maximum height, "
    "full thick bouncy loose waves with face-framing layers ending three inches past shoulders at mid-chest, "
    "abundant dense hair with rich copper and gold highlights throughout, "
    "green eyes with specular catchlights, "
    "very light subtle freckles barely visible across the bridge of her nose, "
    "natural clear skin with minimal freckling, "
    "full lips with natural micro-ridges. "
)

# ── BAKED-IN LoRAs: loaded + fused at startup (always active) ────────────────
# Avatar recipe isolation test (2026-06-27) confirmed:
#   - Klein Distilled needs 4 steps + CFG 4.0 (NOT 20 steps CFG 1.2)
#   - LoRA weights at 0.95/1.15 over-fired and distorted face geometry
#   - Stock vs uncensored encoder produces identical face quality
#   - Body v2.5 @ 0.65 is avatar-quality (slightly softer than v1 but NSFW-capable)
# Lower weights + correct sampler = avatar-matching face on A100 hardware.
BAKED_LORAS = {
    "face": {
        "file": "holly-face-v2.safetensors",
        "weight": 0.75,
        "desc": "Holly Face v2.0 (trigger: h0lly) — avatar recipe, matches L4 endpoint",
    },
    "body": {
        "file": "holly-body-v2.5.safetensors",
        "weight": 0.65,
        "desc": "Holly Body v2.5 (trigger: h0lly-body) — 207-img explicit dataset, avatar-matched weight",
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
        # Face enhancement pass — Haar cascade + array math for face detection
        # and mask generation. Used by _enhance_face() to re-render Holly's
        # face at avatar quality after full-body generation.
        "opencv-python-headless>=4.10.0",
        "numpy>=1.26.0",
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
        # IMPORTANT: scheduler is COPIED, not shared. Constructing Flux2KleinInpaintPipeline
        # mutates the scheduler's internal config, which breaks main pipe generation
        # at higher step counts (off-by-one in scheduler.timesteps array).
        self.inpaint_pipe = None
        try:
            from diffusers import Flux2KleinInpaintPipeline
            import copy
            print("🎭 Loading Flux2KleinInpaintPipeline (shared components)...")
            self.inpaint_pipe = Flux2KleinInpaintPipeline(
                vae=self.pipe.vae,
                text_encoder=self.pipe.text_encoder,
                tokenizer=self.pipe.tokenizer,
                scheduler=copy.deepcopy(self.pipe.scheduler),
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
            # EXACT L4 avatar recipe (services/modal-media/image_generate_flux2klein.py):
            # 4 steps + CFG 4.0 — what generated the avatars Steve approved.
            guidance_scale = float(request.get("guidance_scale", 4.0))

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

            # ── Full L4 avatar post-process (matches services/modal-media/image_generate_flux2klein.py) ──
            # This is the exact pipeline that produced the avatars Steve approved.
            # Gaussian blur blend + unsharp mask + brightness/color boost.
            is_holly_selfie_post = "h0lly" in prompt.lower()
            if is_holly_selfie_post:
                try:
                    from PIL import ImageFilter, ImageEnhance
                    smoothed = img.filter(ImageFilter.GaussianBlur(radius=1.2))
                    img = Image.blend(img, smoothed, alpha=0.25)
                    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=100, threshold=5))
                    img = ImageEnhance.Brightness(img).enhance(1.04)
                    img = ImageEnhance.Color(img).enhance(1.06)
                    print(f"  ✨ Full L4 post-process applied (avatar recipe)")
                except Exception as pe:
                    print(f"  ⚠️ Post-process skipped: {pe}")

            # ── Cleanup dynamic LoRAs so the next request starts clean ──
            # Baked face+body are fused into weights — unaffected by this unload.
            if dynamic_adapters:
                try:
                    self.pipe.unload_lora_weights()
                    print(f"  🧹 Dynamic LoRAs unloaded ({len(dynamic_adapters)})")
                except Exception as ce:
                    print(f"  ⚠️ LoRA cleanup issue: {ce}")

            # ── Avatar-quality face enhancement for Holly's self-portraits ──
            # Full-body NSFW images render the face at ~80-120px (8-10% of frame),
            # which is fundamentally softer than the avatar set (face fills 80%
            # of frame at 768x768). No prompt language can fix this — pixel
            # allocation is geometric. The fix: after main generation, detect
            # the face bbox and re-render JUST that region with an avatar-style
            # prompt via the inpaint pipeline (shares baked face+body LoRAs).
            # The result: full-body image with avatar-quality face detail.
            is_holly_selfie = "h0lly" in prompt.lower()
            enhance_face = request.get("enhance_face")
            if enhance_face is None:
                # Disabled by default 2026-06-27 — d-recipe-d test proved raw
                # 20-step generation with light post-process produces the most
                # realistic skin/face. Face enhance was over-processing and
                # creating a "plastic" look. Still available on-demand via
                # explicit `"enhance_face": true` in request body.
                enhance_face = False
            face_status = "skipped"
            if enhance_face:
                try:
                    enhanced, face_status = self._enhance_face(img, prompt)
                    if enhanced is not None:
                        img = enhanced
                    print(f"  ✨ Face enhancement: {face_status}")
                except Exception as fee:
                    print(f"  ⚠️ Face enhancement failed: {fee}")
                    face_status = f"error: {fee}"

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
                    "X-Face":        (face_status or "skipped").encode("ascii", "replace").decode("ascii")[:80],
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

    # ─────────────────────────────────────────────────────────────────────────
    # AVATAR-QUALITY FACE ENHANCEMENT (v2 — crop → upscale → regenerate)
    # ─────────────────────────────────────────────────────────────────────────
    # Holly's avatars (public/avatars/*.jpg) are 768x768 close-up headshots
    # where the face fills 80%+ of the frame — naturally sharp because Klein
    # allocates pixels proportional to subject size in frame.
    #
    # Full-body NSFW images render the face at ~80-120px (8-10% of frame).
    # The previous v1 approach ran inpaint at FULL image resolution with a
    # small face mask — but that just re-rendered the face at the same
    # ~100px budget, so it stayed soft. No operation at the same resolution
    # can add detail that wasn't generated.
    #
    # This v2 approach:
    #   1. Detect face bbox via OpenCV Haar cascade (frontal + profile)
    #   2. Crop a SQUARE region centered on face — 3x face width gives
    #      head + hair + neck + upper chest context
    #   3. Upscale crop to 768x768 (avatar resolution) via Lanczos
    #   4. Run inpaint pipe with FULL white mask (effectively img2img) using
    #      avatar-quality prompt at strength 0.65 — enough to re-render the
    #      face at full avatar detail while preserving identity/proportions
    #      from the init crop
    #   5. Resize enhanced crop back to original crop dimensions
    #   6. Paste into original image with feathered alpha (seamless blend)
    #
    # The inpaint pipeline shares baked face+body LoRAs, so the regenerated
    # face is still Holly — same identity, just at avatar sharpness.
    # ─────────────────────────────────────────────────────────────────────────
    AVATAR_FACE_PROMPT = (
        "h0lly, h0lly-body, extreme close-up headshot portrait of this woman, "
        "sharp detailed facial features, crisp eyes with vivid green irises and bright catchlights, "
        "detailed iris pattern, sharp eyelashes, perfectly shaped eyebrows, "
        "flawless smooth skin with realistic texture and micro-detail, "
        "bright clear under-eye area, soft dewy makeup with seamless foundation, "
        "natural rose-pink lips with crisp lip line and cupid's bow, "
        "voluminous auburn hair with lifted roots and full body, "
        "sharp focus on face, professional portrait photography, 85mm lens, "
        "shallow depth of field, photorealistic, high resolution face detail"
    )

    AVATAR_SIZE = 768  # square — matches avatar training/output resolution

    def _detect_face_bbox(self, pil_img):
        """Return (x, y, w, h) of the largest face in the image, or None."""
        import cv2
        import numpy as np

        arr = np.array(pil_img.convert("RGB"))
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)

        frontal_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        profile_path = cv2.data.haarcascades + "haarcascade_profileface.xml"

        frontal = cv2.CascadeClassifier(frontal_path)
        profile = cv2.CascadeClassifier(profile_path)

        min_size = (60, 60)

        faces = []
        for sf in (1.05, 1.1, 1.2):
            found = frontal.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=min_size)
            if len(found):
                faces.extend(found)

        if not faces:
            for sf in (1.05, 1.1):
                found = profile.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=min_size)
                if len(found):
                    faces.extend(found)
                flipped = cv2.flip(gray, 1)
                found_r = profile.detectMultiScale(flipped, scaleFactor=sf, minNeighbors=5, minSize=min_size)
                if len(found_r):
                    w_img = gray.shape[1]
                    for (x, y, w, h) in found_r:
                        faces.append((w_img - x - w, y, w, h))

        if not faces:
            return None

        best = max(faces, key=lambda f: f[2] * f[3])
        return tuple(int(v) for v in best)

    def _face_crop_region(self, img_w, img_h, bbox, crop_factor=3.0):
        """
        Return (x0, y0, x1, y1) of a SQUARE crop centered on the face.
        crop_factor=3.0 → crop is 3x face width (covers head + hair + neck
        + upper chest context so inpaint sees body for skin-tone matching).
        Clamped to image bounds, then re-squared using the smaller dimension.
        """
        x, y, fw, fh = bbox
        cx = x + fw // 2
        cy = y + fh // 2
        # Square side based on face width (most reliable dimension)
        side = int(fw * crop_factor)
        half = side // 2

        x0 = cx - half
        y0 = cy - half
        x1 = cx + half
        y1 = cy + half

        # Clamp to image bounds
        x0 = max(0, x0)
        y0 = max(0, y0)
        x1 = min(img_w, x1)
        y1 = min(img_h, y1)

        # Re-square using the smaller actual dimension after clamping
        actual_side = min(x1 - x0, y1 - y0)
        x1 = x0 + actual_side
        y1 = y0 + actual_side

        return (x0, y0, x1, y1), actual_side

    def _build_paste_alpha(self, side, feather_ratio=0.25):
        """
        Build a feathered alpha mask for pasting the enhanced face crop back.
        White in center, fades smoothly to black at edges over feather_ratio
        of the side. Prevents visible seam between inpainted region and body.

        Uses cv2.distanceTransform for a clean Euclidean gradient — simpler
        and more robust than manual per-row/col loops.
        """
        import cv2
        import numpy as np

        feather = max(8, int(side * feather_ratio))

        # White rectangle in center, black border of width `feather` on all sides
        mask = np.zeros((side, side), dtype=np.uint8)
        cv2.rectangle(
            mask,
            (feather, feather),
            (side - feather, side - feather),
            255, thickness=-1,
        )

        # Distance transform: each pixel's distance to nearest zero (black border).
        # Interior pixels far from border → high distance → opaque after normalize.
        # Border pixels → distance 0 → transparent.
        dist = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
        max_dist = feather  # we want the gradient to span exactly the feather width
        alpha = (dist.clip(0, max_dist) / max_dist * 255).astype(np.uint8)

        # Small additional gaussian smoothing for organic edge falloff
        alpha = cv2.GaussianBlur(alpha, (feather * 2 + 1, feather * 2 + 1), feather / 3)
        return alpha

    def _enhance_face(self, pil_img, original_prompt):
        """
        Crop → upscale → regenerate at avatar quality → paste back.
        Returns (enhanced_pil_or_None, status_string).
        """
        import torch
        import numpy as np
        from PIL import Image

        if not getattr(self, "inpaint_pipe", None):
            return None, "skipped (no inpaint pipe)"

        w_img, h_img = pil_img.size
        if w_img < 512 or h_img < 512:
            return None, "skipped (image too small)"

        bbox = self._detect_face_bbox(pil_img)
        if bbox is None:
            return None, "skipped (no face detected)"

        x, y, fw, fh = bbox
        print(f"  👤 Face detected at ({x},{y}) {fw}x{fh} in {w_img}x{h_img} frame")

        # 1. Square crop centered on face, 3x face width
        (cx0, cy0, cx1, cy1), crop_side = self._face_crop_region(w_img, h_img, bbox, crop_factor=3.0)
        if crop_side < 200:
            return None, f"skipped (crop too small: {crop_side}px)"
        print(f"  ✂️ Face crop: ({cx0},{cy0}) to ({cx1},{cy1}) side={crop_side}")

        # 2. Crop and upscale to avatar resolution (768x768)
        crop_orig = pil_img.convert("RGB").crop((cx0, cy0, cx1, cy1))
        crop_avatar = crop_orig.resize((self.AVATAR_SIZE, self.AVATAR_SIZE), Image.LANCZOS)

        # 3. Build avatar-quality prompt + carry emotion cues from original
        p_lower = original_prompt.lower()
        emotion_hints = []
        emotion_map = {
            "happy":      ["smiling", "happy", "joy"],
            "playful":    ["playful", "cheeky", "mischievous"],
            "aroused":    ["aroused", "horny", "wet ", "flushed"],
            "orgasm":     ["orgasm", "climax", "ecstat"],
            "passionate": ["passionate", "intense"],
            "flirty":     ["flirty", "seductive"],
            "shy":        ["shy", "blushing"],
            "sleepy":     ["sleepy", "tired"],
            "sad":        ["sad", "melancholy"],
        }
        for emotion, keywords in emotion_map.items():
            if any(kw in p_lower for kw in keywords):
                emotion_hints.append(emotion)

        face_prompt = self.AVATAR_FACE_PROMPT
        if emotion_hints:
            face_prompt += ", " + ", ".join(emotion_hints[:3]) + " expression"

        # 4. Full-white mask = effectively img2img (regenerate entire crop).
        # Strength 0.65 re-renders face geometry at full avatar quality while
        # preserving identity/proportions from the init crop.
        # Sampler: 4 steps + CFG 1.2 (Klein Distilled ignores CFG, uses internal).
        full_mask = Image.new("L", (self.AVATAR_SIZE, self.AVATAR_SIZE), 255)

        try:
            with torch.inference_mode():
                result = self.inpaint_pipe(
                    prompt=face_prompt,
                    image=crop_avatar,
                    mask_image=full_mask,
                    width=self.AVATAR_SIZE,
                    height=self.AVATAR_SIZE,
                    strength=0.65,
                    num_inference_steps=4,
                    guidance_scale=1.2,
                )
            enhanced_avatar = result.images[0]
        except Exception as ie:
            print(f"  ⚠️ Face inpaint failed: {ie}")
            return None, f"error during inpaint: {ie}"

        # 5. Resize enhanced crop back to original crop dimensions
        enhanced_orig = enhanced_avatar.resize((crop_side, crop_side), Image.LANCZOS)

        # 6. Color-match enhanced crop to original (avoid skin-tone drift)
        # Sample average skin tone from original crop forehead/cheek region
        # and apply as soft match to enhanced. Skip if colors already close.
        try:
            enhanced_orig = self._match_skin_tone(crop_orig, enhanced_orig)
        except Exception as cme:
            print(f"  ⚠️ Skin tone match skipped: {cme}")

        # 7. Build feathered alpha and paste into original image
        alpha = self._build_paste_alpha(crop_side, feather_ratio=0.22)
        alpha_pil = Image.fromarray(alpha, mode="L")

        final = pil_img.convert("RGB").copy()
        final.paste(enhanced_orig, (cx0, cy0), alpha_pil)

        return final, f"enhanced v2 (face={fw}x{fh}, crop={crop_side}, regen={self.AVATAR_SIZE})"

    def _match_skin_tone(self, source_crop, enhanced_crop):
        """
        Match average luminance and color balance of enhanced crop to source.
        Prevents the regenerated face from looking like a different skin tone
        than the body it's being pasted onto.
        Uses simple mean-shift in LAB space (lightweight, no extra deps).
        """
        import numpy as np
        from PIL import Image

        src = np.array(source_crop.convert("RGB")).astype(np.float32)
        enh = np.array(enhanced_crop.convert("RGB")).astype(np.float32)

        # Mean-shift: subtract enhanced mean, add source mean
        src_mean = src.mean(axis=(0, 1))
        enh_mean = enh.mean(axis=(0, 1))

        # Only apply if the difference is meaningful (avoid overcorrecting)
        delta = src_mean - enh_mean
        # Blend 50% toward source mean — enough to match tone, not so much
        # that we kill the inpaint's color improvements
        matched = enh + delta * 0.5
        matched = matched.clip(0, 255).astype(np.uint8)

        return Image.fromarray(matched, mode="RGB")

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
