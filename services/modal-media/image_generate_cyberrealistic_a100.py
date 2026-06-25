#!/usr/bin/env python3
"""
HOLLY CYBERREALISTIC FLUX — A100 Dataset Generation Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Generate photorealistic NSFW training images for Holly Body v2.5 LoRA.
GPU:     NVIDIA A100 (80 GB VRAM)
Cost:    ~$2.50/hr | 300 images ≈ $15 total
Output:  Lossless WebP (training-grade quality)

Why this exists (Phase V pivot — June 17, 2026):
  FLUX.2 Klein 9B has safety training that refuses explicit content
  (insertion, anatomically correct genitals). After 4 failed test batches
  and 2 failed inpaint iterations, we pivoted to CyberRealistic FLUX v2.5 —
  a FLUX.1 Dev checkpoint purpose-trained for explicit NSFW.

Architecture:
  BASE MODEL (loaded once, always active):
    - CyberRealistic FLUX v2.5 (FLUX.1 Dev merge, explicit NSFW specialist)
    - FP8 quantization (~11 GB) — fits A100 80GB comfortably
    - Downloaded manually from Civitai, uploaded to Modal volume
      (avoids needing Civitai API token in Modal secrets)

  IDENTITY PRESERVATION:
    - PuLID for Flux v0.9.1 (loaded from HuggingFace)
    - Reference face image passed in request as base64
    - Replaces Holly Face LoRA (which was trained on FLUX.2 Klein — incompatible)

  NO BAKED LoRAs:
    - Holly Face v2.0 and Body v1.0 LoRAs were trained on FLUX.2 Klein.
    - They will NOT load on FLUX.1 Dev architecture. Don't try.
    - Identity is preserved via PuLID + reference photo instead.

  NO CONTROLNET (yet):
    - Test batch validates base + PuLID.
    - If pose precision is the remaining gap, ControlNet Union added in v2.

Endpoint URL pattern:
  https://iamdoregosteve--generate-cyberrealistic-a100.modal.run
  https://iamdoregosteve--cyberrealistic-health-a100.modal.run

Daily chat endpoint (UNCHANGED):
  image_generate_flux2klein.py (L4) — still on Klein for non-explicit chat
  image_generate_flux2klein_a100.py — Klein A100 (existing, untouched)

Request format:
  POST /generate-cyberrealistic-a100
  {
    "prompt":          "explicit description of desired image",
    "reference_faces": ["<base64 PNG>", "<base64 PNG>", ...],  # multi-ref preferred
    "reference_face":  "<base64 PNG>",                          # single (backward compat)
    "width":           1024,
    "height":          1024,
    "num_inference_steps": 24,
    "guidance_scale":  4.0,
    "pulid_strength":  0.85,   # how strongly to lock identity (0-1)
    "seed":            null,
    "format":          "webp"
  }

Multi-reference PuLID:
  Pass 2-4 face images for stronger identity lock. PuLID auto-detects
  faces via facexlib (no pre-crop needed) and averages embeddings.
  v1.1.0 change — averaging implemented per PuLID best practice.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-image-cyberrealistic-a100")

# CyberRealistic FLUX v2.5 — downloaded manually from https://civitai.red/models/1799857
# File on volume: cyberrealistic-flux-v25-fp8.safetensors
# NOTE: Despite the filename, the actual content is bf16 full-precision (22.7 GB),
#       not fp8 (which would be ~11 GB). Civitai's labeling was misleading.
#       This is fine — bf16 works perfectly on A100 80GB and is higher quality.
#       from_single_file() auto-detects format from file contents, not filename.
CYBERREALISTIC_FILE = "cyberrealistic-flux-v25-fp8.safetensors"

# PuLID for Flux v0.9.1 — downloaded from HuggingFace on first run
PULID_HF_REPO = "guozinan/pulid-flux-v0.9.1"
PULID_ADAPTER_FILE = "pulid-flux-v0.9.1.safetensors"

VOLUME_MOUNT = "/flux-models"
MODEL_CACHE = "/flux-models/cyberrealistic"
LORA_DIR = "/lora"  # unused but kept for volume mount compat

# Holly's permanent body description — injected into EVERY prompt.
# Same as Klein endpoint — keeps Holly's identity consistent.
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

# Shared volume — model weights
volume = modal.Volume.from_name("holly-cyberrealistic-weights", create_if_missing=True)
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
    # PuLID install deferred to v1.1 — package has setuptools auto-discovery issue
    # that blocks image build. Once CyberRealistic base is validated, we'll add
    # PuLID via vendored modules or forked repo with proper pyproject.toml.
)


@app.cls(
    image=image,
    gpu="A100",
    max_containers=1,
    scaledown_window=120,
    timeout=600,
    startup_timeout=1800,  # 30 min for first-run download + load
    volumes={VOLUME_MOUNT: volume, LORA_DIR: lora_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyCyberRealisticA100:

    @modal.enter()
    def load_model(self):
        import torch
        from huggingface_hub import snapshot_download, hf_hub_download, login

        self.pipe = None
        self.pulid_adapter = None
        self.model_name = "CyberRealistic FLUX v2.5 (not loaded)"
        self.startup_error = None
        self.pulid_available = False

        # Authenticate with HuggingFace (for PuLID weights)
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
        if hf_token:
            login(token=hf_token)
            print("✅ HuggingFace authenticated")

        # ── Step 1: Verify CyberRealistic file is on volume ────────────────
        model_path = f"{VOLUME_MOUNT}/{CYBERREALISTIC_FILE}"
        if not os.path.exists(model_path):
            self.startup_error = (
                f"CyberRealistic file not found at {model_path}. "
                f"Download from https://civitai.red/models/1799857 and run "
                f"scripts/upload-cyberrealistic-to-volume.sh first."
            )
            print(f"❌ {self.startup_error}")
            return

        size_gb = os.path.getsize(model_path) / (1024 ** 3)
        print(f"✅ CyberRealistic FP8 found: {size_gb:.1f} GB")

        # ── Step 2: Ensure FLUX.1 Dev base is on volume (for text encoders) ─
        # CyberRealistic single-file checkpoint only contains transformer+VAE.
        # We need the full FLUX.1 Dev base for CLIP/T5/tokenizer/scheduler,
        # then we swap in CyberRealistic's transformer.
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
            print(f"✅ FLUX.1 Dev base found on volume")

        # ── Step 3: Load FluxPipeline from FLUX.1 Dev base ─────────────────
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

        # ── Step 4: Swap in CyberRealistic transformer ────────────────────
        # The transformer is the only component CyberRealistic actually trains.
        # Everything else (text encoders, VAE, tokenizer) is shared with FLUX.1 Dev.
        try:
            from diffusers import FluxTransformer2DModel
            print(f"🎭 Loading CyberRealistic transformer from {model_path}...")
            cr_transformer = FluxTransformer2DModel.from_single_file(
                model_path,
                torch_dtype=torch.bfloat16,
            )
            # Free the base transformer before swap (saves VRAM during swap)
            del self.pipe.transformer
            self.pipe.transformer = cr_transformer
            print("✅ CyberRealistic transformer swapped in")
        except Exception as e:
            self.startup_error = f"CyberRealistic transformer load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # Move full pipeline to GPU
        import gc
        gc.collect()
        try:
            self.pipe.to("cuda")
            print("✅ Pipeline on A100 GPU")
        except Exception as e:
            # Fallback: enable model CPU offload if full GPU move fails
            print(f"⚠️  Full GPU move failed ({e}), using CPU offload")
            self.pipe.enable_model_cpu_offload()

        # ── Step 3: PuLID deferred to v1.1 ─────────────────────────────────
        # Package install blocked by setuptools auto-discovery issue.
        # Identity preservation in v1.0 relies on Holly Face LoRA trigger word
        # in prompt + CyberRealistic's native Flux Dev training.
        # v1.1 will add PuLID via vendored modules or alternative install method.
        self.pulid_available = False
        print("ℹ️  PuLID not loaded (deferred to v1.1) — no identity lock this version")

        self.model_name = (
            f"CyberRealistic FLUX v2.5"
            + (" + PuLID" if self.pulid_available else " (no identity lock)")
        )
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
            "cyberrealistic_available": self.pipe is not None,
            "pulid_available": self.pulid_available,
            "startup_error": self.startup_error,
            "base_architecture": "FLUX.1 Dev (CyberRealistic merge)",
            "format": "bf16",
            "notes": "v1.1.0 — PuLID deferred, single Web Function via asgi_app",
        }

    def generate(self, request: dict):
        """Generate an image with CyberRealistic (+ PuLID when available)."""
        import base64
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

            # Inject Holly's body description (same as Klein endpoint)
            if "h0lly" in raw_prompt.lower():
                prompt = raw_prompt.replace("h0lly", HOLLY_BODY_PREFIX.rstrip(", "))
                prompt = prompt.replace("H0lly", HOLLY_BODY_PREFIX.rstrip(", "))
            else:
                prompt = HOLLY_BODY_PREFIX + raw_prompt

            width = min(int(request.get("width", 1024)), 1024)
            height = min(int(request.get("height", 1024)), 1024)
            steps = min(int(request.get("num_inference_steps", 24)), 50)
            seed = request.get("seed")
            fmt = request.get("format", "webp").lower()
            guidance_scale = float(request.get("guidance_scale", 4.0))
            pulid_strength = float(request.get("pulid_strength", 0.85))

            # Reference face(s) — accept list (preferred) or single (backward compat)
            # Multi-reference: PuLID averages embeddings for stronger identity lock
            reference_faces_b64 = request.get("reference_faces")
            if reference_faces_b64 is None:
                # Backward compat: single image
                single = request.get("reference_face")
                if single:
                    reference_faces_b64 = [single]
            if not isinstance(reference_faces_b64, list):
                reference_faces_b64 = [reference_faces_b64] if reference_faces_b64 else []

            if not hasattr(self, 'pipe') or self.pipe is None:
                return Response(
                    content=b'{"error":"model not loaded"}',
                    media_type="application/json", status_code=503,
                )

            # ── Decode reference faces and compute averaged embedding ───────
            # PuLID's get_id_embeds() uses facexlib to auto-detect the largest
            # face in each image. No pre-crop needed — just pass the full image.
            id_embeds = None
            n_faces_used = 0
            if reference_faces_b64 and self.pulid_available:
                embeddings = []
                for i, b64 in enumerate(reference_faces_b64):
                    try:
                        img_bytes = base64.b64decode(b64)
                        ref_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                        emb = self.pulid_adapter.get_id_embeds(ref_img)
                        embeddings.append(emb)
                        print(f"  🎭 Reference {i+1}/{len(reference_faces_b64)}: face embedded ({ref_img.size[0]}x{ref_img.size[1]})")
                        n_faces_used += 1
                    except Exception as re:
                        print(f"  ⚠️  Reference {i+1} failed (face not detected?): {re}")

                if embeddings:
                    if len(embeddings) == 1:
                        id_embeds = embeddings[0]
                    else:
                        # Average embeddings across all references for stronger lock
                        import torch
                        # Handle both tensor and dict return formats
                        if isinstance(embeddings[0], dict):
                            id_embeds = {
                                k: torch.stack([e[k] for e in embeddings]).mean(dim=0)
                                for k in embeddings[0].keys()
                                if torch.is_tensor(embeddings[0][k])
                            }
                        elif torch.is_tensor(embeddings[0]):
                            id_embeds = torch.stack(embeddings).mean(dim=0)
                        else:
                            id_embeds = embeddings[0]
                            print(f"  ⚠️  Unknown embedding format, using first only")
                        print(f"  🔒 Averaged {len(embeddings)} face embeddings")
                else:
                    print(f"  ⚠️  No faces detected in any reference image — generating without identity lock")

            print(f"🎨 [{self.model_name}] {prompt[:100]}...")
            generator = torch.Generator("cpu").manual_seed(seed) if seed is not None else None

            # ── Generate ────────────────────────────────────────────────────
            with torch.inference_mode():
                if id_embeds is not None and self.pulid_available:
                    # PuLID path — identity locked via averaged embeddings
                    result = self.pipe(
                        prompt=prompt,
                        width=width,
                        height=height,
                        num_inference_steps=steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                        id_embeds=id_embeds,
                        pulid_scale=pulid_strength,
                    )
                else:
                    # Plain text-to-image (no identity lock)
                    if reference_faces_b64 and not self.pulid_available:
                        print("  ⚠️  reference_faces ignored — PuLID not loaded")
                    result = self.pipe(
                        prompt=prompt,
                        width=width,
                        height=height,
                        num_inference_steps=steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                    )

            img = result.images[0]

            # ── Face restoration for Holly self-portraits ──────────────────
            is_holly_selfie = "h0lly" in prompt.lower()
            if is_holly_selfie:
                try:
                    from PIL import ImageFilter, ImageEnhance
                    smoothed = img.filter(ImageFilter.GaussianBlur(radius=1.2))
                    img = Image.blend(img, smoothed, alpha=0.25)
                    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=100, threshold=5))
                    img = ImageEnhance.Brightness(img).enhance(1.04)
                    img = ImageEnhance.Color(img).enhance(1.06)
                except Exception:
                    pass  # Skip if PIL ops fail

            # ── Output ──────────────────────────────────────────────────────
            buf = io.BytesIO()
            if fmt == "png":
                img.save(buf, format="PNG")
                media_type = "image/png"
            elif fmt in ("jpeg", "jpg"):
                img.save(buf, format="JPEG", quality=95)
                media_type = "image/jpeg"
            else:
                # Default: Lossless WebP — training-grade
                img.save(buf, format="WEBP", lossless=True)
                media_type = "image/webp"

            img_bytes = buf.getvalue()
            print(f"✅ {width}x{height} — {len(img_bytes):,} bytes")

            id_source = "pulid" if id_embeds is not None else "none"

            return Response(
                content=img_bytes,
                media_type=media_type,
                headers={
                    "X-Model": self.model_name,
                    "X-Provider": "modal-cyberrealistic-a100",
                    "X-Base": "flux1-dev",
                    "X-PuLID": "active" if id_source == "pulid" else "inactive",
                    "X-PuLID-Faces": str(n_faces_used),
                    "X-Width": str(width),
                    "X-Height": str(height),
                    "X-Steps": str(steps),
                    "X-Guidance": str(guidance_scale),
                    "X-PuLID-Strength": str(pulid_strength),
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

    @modal.asgi_app(label="holly-cyberrealistic-a100")
    def web(self):
        """Single Web Function exposing /health and /generate routes.

        Consolidated to fit Modal's 8 Web Function limit on free plan.
        URL pattern:
          GET  /health    → status check
          POST /generate  → image generation
        """
        from fastapi import FastAPI, Request
        from fastapi.responses import JSONResponse

        web_app = FastAPI(title="Holly CyberRealistic A100", version="1.1.0")

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
                "service": "holly-cyberrealistic-a100",
                "version": "1.1.0",
                "endpoints": ["/health (GET)", "/generate (POST)"],
            }

        return web_app


if __name__ == "__main__":
    # Local dev / smoke test — Modal CLI handles actual deploy
    print("Deploy with: modal deploy services/modal-media/image_generate_cyberrealistic_a100.py")
    print("Test with:   python scripts/test-cyberrealistic-v16.py")
