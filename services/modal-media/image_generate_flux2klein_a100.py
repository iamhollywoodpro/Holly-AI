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
    "h0lly, h0lly-body, "
    "completely nude woman, fully naked, bare skin, not wearing any clothing, "
    "no clothing anywhere on her body, zero garments, bare from head to toe, "
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
        "weight": 0.95,
        "desc": "Holly Face v2.0 (trigger: h0lly) — raised from 0.85 to dominate Klein base",
    },
    "body": {
        "file": "holly-body-v2.5.safetensors",
        "weight": 1.15,
        "desc": "Holly Body v2.5 (trigger: h0lly-body) — 207-img explicit dataset, raised from 0.75 to force nude output past Klein's clothing priors",
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
                enhance_face = is_holly_selfie  # default true for Holly, false otherwise
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
                    "X-Face":        face_status[:80] if face_status else "skipped",
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
    # AVATAR-QUALITY FACE ENHANCEMENT
    # ─────────────────────────────────────────────────────────────────────────
    # Holly's avatars (public/avatars/*.jpg) are 768x768 close-up headshots
    # where the face fills 80%+ of the frame — naturally sharp.
    # Full-body NSFW images render the face at ~80-120px (8-10% of frame),
    # which is geometrically softer regardless of prompt language.
    #
    # This pass:
    #   1. Detects face bbox via OpenCV Haar cascade (frontal + profile)
    #   2. Pads bbox generously (face + hair + neck + upper chest context)
    #   3. Builds a feathered mask (smooth alpha at edges to avoid seams)
    #   4. Runs inpaint pipe with an avatar-quality prompt + face-only mask
    #   5. Inpaint pipeline shares the baked Holly face+body LoRAs, so the
    #      re-rendered face is still Holly, just at full detail.
    #
    # Strength 0.55: enough to re-render face geometry crisply, not enough
    # to lose identity or change expression meaningfully.
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

    def _detect_face_bbox(self, pil_img):
        """Return (x, y, w, h) of the largest face in the image, or None."""
        import cv2
        import numpy as np

        arr = np.array(pil_img.convert("RGB"))
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        # Equalize histogram to improve detection on varied lighting
        gray = cv2.equalizeHist(gray)

        # Try frontal cascade first, then profile. Haar cascades ship with
        # opencv-python-headless under cv2.data.haarcascades.
        frontal_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        profile_path = cv2.data.haarcascades + "haarcascade_profileface.xml"

        frontal = cv2.CascadeClassifier(frontal_path)
        profile = cv2.CascadeClassifier(profile_path)

        # minSize: faces in full-body 1024x1024 are ~70-150px. Anything smaller
        # is likely a false positive; anything larger we'd miss is unlikely.
        min_size = (60, 60)

        # Frontal detection (try multiple scale factors for robustness)
        faces = []
        for sf in (1.05, 1.1, 1.2):
            found = frontal.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=min_size)
            if len(found):
                faces.extend(found)

        # If no frontal hit, try profile (and flip image for the other side)
        if not faces:
            for sf in (1.05, 1.1):
                found = profile.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=min_size)
                if len(found):
                    faces.extend(found)
                flipped = cv2.flip(gray, 1)
                found_r = profile.detectMultiScale(flipped, scaleFactor=sf, minNeighbors=5, minSize=min_size)
                if len(found_r):
                    # Un-flip x coord
                    w_img = gray.shape[1]
                    for (x, y, w, h) in found_r:
                        faces.append((w_img - x - w, y, w, h))

        if not faces:
            return None

        # Pick the largest face by area (most likely the subject)
        best = max(faces, key=lambda f: f[2] * f[3])
        return tuple(int(v) for v in best)

    def _build_face_mask(self, width, height, face_bbox, padding_factor=2.0):
        """
        Build a feathered mask: white over the face region, black elsewhere.
        padding_factor=2.0 means the white region is 2x the face bbox in each
        dimension (gives forehead, hair, neck, upper chest context to inpaint).
        Feathering uses Gaussian blur so the inpaint blends seamlessly.
        """
        import cv2
        import numpy as np

        x, y, w, h = face_bbox
        pad_w = int(w * (padding_factor - 1.0) / 2)
        pad_h = int(h * (padding_factor - 1.0) / 2)

        x0 = max(0, x - pad_w)
        y0 = max(0, y - pad_h)
        x1 = min(width, x + w + pad_w)
        y1 = min(height, y + h + pad_h)

        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.rectangle(mask, (x0, y0), (x1, y1), 255, thickness=-1)

        # Feather: blur radius proportional to face size (10% of face width)
        blur_radius = max(15, int(w * 0.10))
        mask = cv2.GaussianBlur(mask, (blur_radius * 2 + 1, blur_radius * 2 + 1), blur_radius / 2)
        return mask

    def _enhance_face(self, pil_img, original_prompt):
        """
        Run inpaint pipe on the face region with avatar-quality prompt.
        Returns (enhanced_pil_or_None, status_string).
        """
        import torch
        import numpy as np
        from PIL import Image

        # Skip if inpaint pipeline isn't available
        if not getattr(self, "inpaint_pipe", None):
            return None, "skipped (no inpaint pipe)"

        # Skip if image is too small to bother
        w, h = pil_img.size
        if w < 512 or h < 512:
            return None, "skipped (image too small)"

        bbox = self._detect_face_bbox(pil_img)
        if bbox is None:
            return None, "skipped (no face detected)"

        x, y, fw, fh = bbox
        print(f"  👤 Face detected at ({x},{y}) {fw}x{fh}")

        mask_arr = self._build_face_mask(w, h, bbox, padding_factor=2.0)
        mask_img = Image.fromarray(mask_arr, mode="L")

        # Build prompt: avatar face language + emotional cues from original
        # If the original prompt mentioned an emotion/expression, carry it over
        emotion_hints = []
        p_lower = original_prompt.lower()
        emotion_map = {
            "happy": ["smiling", "happy", "joy"],
            "playful": ["playful", "cheeky", "mischievous"],
            "aroused": ["aroused", "horny", "wet ", "flushed"],
            "orgasm": ["orgasm", "climax", "ecstat"],
            "passionate": ["passionate", "intense"],
            "flirty": ["flirty", "seductive"],
            "shy": ["shy", "blushing"],
            "sleepy": ["sleepy", "tired"],
            "sad": ["sad", "melancholy"],
        }
        for emotion, keywords in emotion_map.items():
            if any(kw in p_lower for kw in keywords):
                emotion_hints.append(emotion)

        face_prompt = self.AVATAR_FACE_PROMPT
        if emotion_hints:
            face_prompt += ", " + ", ".join(emotion_hints[:3]) + " expression"

        try:
            with torch.inference_mode():
                result = self.inpaint_pipe(
                    prompt=face_prompt,
                    image=pil_img.convert("RGB"),
                    mask_image=mask_img,
                    width=w,
                    height=h,
                    strength=0.55,
                    num_inference_steps=8,
                    guidance_scale=1.2,
                )
            enhanced = result.images[0]
            return enhanced, f"enhanced (bbox={fw}x{fh})"
        except Exception as ie:
            print(f"  ⚠️ Inpaint face enhance failed: {ie}")
            return None, f"error during inpaint: {ie}"

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
