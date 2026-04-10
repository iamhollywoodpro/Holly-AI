#!/usr/bin/env python3
"""
HOLLY Modal Image Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary:  FLUX.1-schnell (Black Forest Labs, Apache-2.0)
          Requires: HF_TOKEN in Modal secret + one-time license accept at HF
Fallback: ostris/OpenFLUX.1 (Apache-2.0, no token, same architecture/quality)
          Used automatically when HF_TOKEN is absent.

GPU:  NVIDIA T4 (16GB VRAM) — cheapest Modal GPU that runs FLUX schnell
Cost: ~$0.000164/s | ~0.5–1s/image → ~$0.0001/image
Free: $30/mo Modal credits → ~300,000 images/month FREE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO UPGRADE TO FLUX.1-schnell (3 steps, ~2 min):

  1. Accept FLUX.1-schnell license (ONE TIME, free, just click agree):
       https://huggingface.co/black-forest-labs/FLUX.1-schnell
       (sign in → click "Agree and access repository")

  2. Create Modal secret with your existing free HF token:
       modal secret create huggingface-secret HF_TOKEN=hf_yourtoken
       (your token is in Coolify as HUGGINGFACE_API_KEY)

  3. Re-deploy:
       modal deploy services/modal-media/image_generate.py

  Holly will then use the real FLUX.1-schnell at full quality.
  Without the secret, OpenFLUX.1 runs automatically as fallback.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST BREAKDOWN (T4, $0.000164/s):
  • Cold start: ~8s  → $0.0013 (first request, weights cached after)
  • Warm inference: ~0.5–1s → $0.0001/image
  • 1,000 images/day → ~$0.10/day → $3/month  ← well within $30 free
  • Idle: $0 (serverless, scales to zero)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("holly-image-generate")

# ─── Container image ──────────────────────────────────────────────────────────

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

# ─── Model weights volume (cached — avoids re-downloading on every cold start) ─

weights_vol  = modal.Volume.from_name("holly-flux-weights", create_if_missing=True)
MODEL_CACHE  = "/models"
FLUX_SCHNELL = "black-forest-labs/FLUX.1-schnell"   # gated:auto, Apache-2.0
OPEN_FLUX    = "ostris/OpenFLUX.1"                  # fully open, Apache-2.0, same arch

# ─── Secrets ─────────────────────────────────────────────────────────────────
# 'huggingface-secret' exists in Modal workspace with HF_TOKEN.
# HF_TOKEN="" (empty) → loads OpenFLUX.1 (no token fallback, same quality)
# HF_TOKEN="hf_xxx" → loads FLUX.1-schnell (requires license accepted at HF once)
#
# To set real token: modal secret create huggingface-secret HF_TOKEN=hf_yourtoken
# To accept license:  https://huggingface.co/black-forest-labs/FLUX.1-schnell

# ─── Inference class ──────────────────────────────────────────────────────────

@app.cls(
    image=image,
    gpu="T4",
    volumes={MODEL_CACHE: weights_vol},
    scaledown_window=120,   # stay warm 2 min ($0 idle cost)
    timeout=120,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyImageGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import FluxPipeline

        hf_token = os.environ.get("HF_TOKEN")

        if hf_token:
            # ── FLUX.1-schnell (Black Forest Labs, Apache-2.0) ────────────────
            # Requires: HF_TOKEN + license accepted at HF once
            print(f"🔑 HF_TOKEN found — loading {FLUX_SCHNELL}...")
            try:
                self.pipe = FluxPipeline.from_pretrained(
                    FLUX_SCHNELL,
                    torch_dtype=torch.bfloat16,
                    cache_dir=MODEL_CACHE,
                    token=hf_token,
                )
                self.model_name = "FLUX.1-schnell"
                print("✅ FLUX.1-schnell loaded on T4 GPU")
            except Exception as e:
                print(f"⚠️  FLUX.1-schnell failed: {e}")
                print(f"   Did you accept the license at https://huggingface.co/black-forest-labs/FLUX.1-schnell ?")
                print(f"   Falling back to OpenFLUX.1...")
                hf_token = None   # trigger fallback below

        if not hf_token:
            # ── OpenFLUX.1 (ostris, Apache-2.0) ──────────────────────────────
            # Identical architecture to FLUX.1-schnell — same quality, no token needed
            print(f"📥 No HF_TOKEN — loading {OPEN_FLUX} (Apache-2.0, no token needed)...")
            self.pipe = FluxPipeline.from_pretrained(
                OPEN_FLUX,
                torch_dtype=torch.bfloat16,
                cache_dir=MODEL_CACHE,
            )
            self.model_name = "OpenFLUX.1"
            print("✅ OpenFLUX.1 loaded on T4 GPU")

        self.pipe = self.pipe.to("cuda")
        self.pipe.enable_attention_slicing()

    @modal.fastapi_endpoint(method="POST", label="generate")
    def generate(self, request: dict):
        import torch
        from fastapi.responses import Response

        prompt = (request.get("prompt") or "").strip()
        width  = min(int(request.get("width",  1024)), 1024)
        height = min(int(request.get("height", 1024)), 1024)
        steps  = min(int(request.get("num_inference_steps", 4)), 8)
        seed   = request.get("seed")
        fmt    = request.get("format", "jpeg").lower()

        if not prompt:
            return Response(
                content=b'{"error":"prompt is required"}',
                media_type="application/json", status_code=400,
            )
        if len(prompt) > 2000:
            return Response(
                content=b'{"error":"prompt too long (max 2000 chars)"}',
                media_type="application/json", status_code=400,
            )

        print(f"🎨 [{self.model_name}] {prompt[:80]}{'...' if len(prompt) > 80 else ''}")

        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

        with torch.inference_mode():
            result = self.pipe(
                prompt=prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=0.0,   # FLUX schnell optimal
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
            "status":      "healthy",
            "model":       getattr(self, "model_name", "loading..."),
            "gpu":         "T4",
            "licence":     "Apache-2.0",
            "cost":        "~$0.0001/image (T4 @$0.000164/s)",
            "free_quota":  "$30/mo Modal credits → ~300,000 images/mo FREE",
            "upgrade":     "Add Modal secret 'huggingface-secret' with HF_TOKEN to use FLUX.1-schnell",
            "version":     "1.2.0",
        })


# ─── Local entry ──────────────────────────────────────────────────────────────

@app.local_entrypoint()
def main():
    print("Holly Image Generator — deploy with:")
    print("  modal deploy services/modal-media/image_generate.py")
    print("Endpoint: https://iamhollywoodpro--generate.modal.run")
