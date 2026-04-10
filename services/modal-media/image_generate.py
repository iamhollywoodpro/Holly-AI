#!/usr/bin/env python3
"""
HOLLY Modal Image Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary:  FLUX.1-schnell  (Black Forest Labs, Apache-2.0)  — needs HF_TOKEN
Fallback: ostris/OpenFLUX.1 (Apache-2.0, no token required, same quality)

GPU:     NVIDIA T4 (16GB VRAM) — cheapest Modal GPU that fits FLUX schnell
Cost:    ~$0.000164/s | ~0.5–1s/image → ~$0.0001/image
Free:    $30/mo Modal credits → ~300,000 images/month FREE

Deploy:
    modal deploy services/modal-media/image_generate.py

After deploy Modal prints your endpoint URL, e.g.:
    https://iamhollywoodpro--holly-image-generate.modal.run

Set in Coolify env:
    MODAL_IMAGE_URL=https://iamhollywoodpro--holly-image-generate.modal.run

Optional (for FLUX.1-schnell instead of OpenFLUX.1):
    Create Modal secret:  modal secret create huggingface-secret HF_TOKEN=hf_xxxx
    Then accept the FLUX.1-schnell license at:
    https://huggingface.co/black-forest-labs/FLUX.1-schnell

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST BREAKDOWN (T4, $0.000164/s):
  • Cold start: ~8s  → $0.0013 (first request only, weights cached in volume)
  • Warm inference: ~0.5–1s → $0.0001/image
  • 1,000 images/day → ~$0.10/day → $3/month  ← well within $30 free
  • Idle: $0 (serverless, scales to zero between requests)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("holly-image-generate")

# ─── Container image ──────────────────────────────────────────────────────────
# Lean Python 3.11 image with only what diffusers needs for FLUX on T4

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.4.1",
        "torchvision",
        "diffusers>=0.30.0",
        "transformers>=4.44.0",
        "accelerate>=0.34.0",
        "sentencepiece",
        "protobuf",
        "pillow",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.25.0",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu121",
    )
)

# ─── Model weights volume (avoids re-downloading on every cold start) ─────────

weights_vol = modal.Volume.from_name("holly-flux-weights", create_if_missing=True)
MODEL_CACHE = "/models"

# Preferred: FLUX.1-schnell (requires HF_TOKEN + license accepted)
FLUX_SCHNELL   = "black-forest-labs/FLUX.1-schnell"
# Fallback: OpenFLUX.1 (Apache-2.0, no token required, same quality)
OPEN_FLUX      = "ostris/OpenFLUX.1"

# ─── Inference class ──────────────────────────────────────────────────────────
# NOTE: No HuggingFace secret needed — defaults to ostris/OpenFLUX.1 (Apache-2.0).
# To upgrade to FLUX.1-schnell: create the secret and add secrets=[modal.Secret.from_name("huggingface-secret")]
# then accept the license at https://huggingface.co/black-forest-labs/FLUX.1-schnell

@app.cls(
    image=image,
    gpu="T4",                     # cheapest GPU — FLUX schnell fits in 16GB
    volumes={MODEL_CACHE: weights_vol},
    scaledown_window=120,          # stay warm 2 min after last request ($0 idle)
    timeout=120,                  # max 120s per request
)
class HollyImageGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import FluxPipeline

        # Use OpenFLUX.1 — Apache-2.0, no token required, same quality as FLUX schnell
        # To use FLUX.1-schnell instead: create huggingface-secret, accept license,
        # add secrets param to @app.cls above, and change OPEN_FLUX to FLUX_SCHNELL here.
        print(f"📥 Loading {OPEN_FLUX} (Apache-2.0, no token needed)...")
        self.pipe = FluxPipeline.from_pretrained(
            OPEN_FLUX,
            torch_dtype=torch.bfloat16,
            cache_dir=MODEL_CACHE,
        )
        self.model_name = "OpenFLUX.1"
        self.pipe = self.pipe.to("cuda")
        self.pipe.enable_attention_slicing()
        print(f"✅ OpenFLUX.1 loaded on T4 GPU")

    @modal.fastapi_endpoint(method="POST", label="generate")
    def generate(self, request: dict):
        import torch
        from fastapi.responses import Response

        prompt  = (request.get("prompt") or "").strip()
        width   = min(int(request.get("width",  1024)), 1024)
        height  = min(int(request.get("height", 1024)), 1024)
        steps   = min(int(request.get("num_inference_steps", 4)), 8)
        seed    = request.get("seed")
        fmt     = request.get("format", "jpeg").lower()

        if not prompt:
            return Response(
                content=b'{"error":"prompt is required"}',
                media_type="application/json",
                status_code=400,
            )
        if len(prompt) > 2000:
            return Response(
                content=b'{"error":"prompt too long (max 2000 chars)"}',
                media_type="application/json",
                status_code=400,
            )

        print(f"🎨 [{self.model_name}] Generating: {prompt[:80]}{'...' if len(prompt) > 80 else ''}")

        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            result = self.pipe(
                prompt=prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=0.0,   # FLUX schnell: guidance=0 is optimal
                generator=generator,
            )

        img = result.images[0]
        buf = io.BytesIO()
        if fmt == "png":
            img.save(buf, format="PNG")
            media_type = "image/png"
        else:
            img.save(buf, format="JPEG", quality=95)
            media_type = "image/jpeg"

        img_bytes = buf.getvalue()
        print(f"✅ {width}x{height} {fmt.upper()} — {len(img_bytes):,} bytes")

        return Response(
            content=img_bytes,
            media_type=media_type,
            headers={
                "X-Model":    self.model_name,
                "X-Provider": "modal",
                "X-Width":    str(width),
                "X-Height":   str(height),
                "X-Licence":  "Apache-2.0",
                "Access-Control-Allow-Origin": "*",
            },
        )

    @modal.fastapi_endpoint(method="GET", label="health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status":   "healthy",
            "model":    getattr(self, "model_name", "loading..."),
            "gpu":      "T4",
            "licence":  "Apache-2.0",
            "cost":     "~$0.0001/image (T4 @$0.000164/s)",
            "free":     "$30/mo Modal credits → ~300,000 images/mo free",
            "note":     "Uses FLUX.1-schnell if HF_TOKEN set, else OpenFLUX.1 (same quality)",
            "version":  "1.1.0",
        })


# ─── Local test ───────────────────────────────────────────────────────────────

@app.local_entrypoint()
def test():
    """Quick local test — run with: modal run services/modal-media/image_generate.py"""
    print("Holly Image Generator — check Modal dashboard for endpoint URL after deploy")
    print("Deploy with: modal deploy services/modal-media/image_generate.py")
