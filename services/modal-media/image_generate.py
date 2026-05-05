#!/usr/bin/env python3
"""
HOLLY Modal Image Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  FLUX.1-schnell (Black Forest Labs, Apache-2.0)
        Falls back to ostris/OpenFLUX.1 if HF_TOKEN missing
GPU:    NVIDIA T4 (16 GB VRAM) — $0.000164/s
Speed:  ~10-15s/image with model_cpu_offload (safe on T4)
Cost:   ~$0.002/image warm | $30/mo free → ~15,000 images/mo

⚠️  SCALING SAFETY:
  - max_containers=1  → NEVER spins up more than 1 GPU (protects free tier)
  - Requests queue up  → no parallel GPU waste
  - scaledown_window=300 → stays warm 5 min, then scales to zero

Design:
  - Weights in Modal Volume (flat dir) — downloaded once, ~5 min first run
  - All subsequent cold starts load from volume in ~20s
  - enable_model_cpu_offload() → prevents OOM, no full GPU needed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

app = modal.App("holly-image-generate")

FLUX_SCHNELL = "black-forest-labs/FLUX.1-schnell"
OPEN_FLUX    = "ostris/OpenFLUX.1"
MODEL_CACHE  = "/models"

volume = modal.Volume.from_name("holly-flux-weights", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1",
        "torchvision",
        "diffusers==0.31.0",
        "transformers==4.46.3",
        "accelerate==0.34.2",
        "sentencepiece",
        "protobuf",
        "pillow",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.25.0",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
)

@app.cls(
    image=image,
    gpu="T4",
    max_containers=1,
    scaledown_window=30,
    timeout=300,
    startup_timeout=600,
    secrets=[modal.Secret.from_name("huggingface-secret")],
    volumes={MODEL_CACHE: volume},
)
class HollyImageGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import FluxPipeline
        from huggingface_hub import snapshot_download

        hf_token = os.environ.get("HF_TOKEN", "").strip() or None
        model_id = FLUX_SCHNELL if hf_token else OPEN_FLUX

        # Download weights to volume on first run only
        if not os.path.exists(f"{MODEL_CACHE}/model_index.json"):
            print(f"📥 Downloading {model_id} to volume (first run only)...")
            try:
                snapshot_download(
                    repo_id=model_id,
                    token=hf_token,
                    local_dir=MODEL_CACHE,
                    ignore_patterns=["*.md", "original/*"],
                )
                print(f"✅ {model_id} saved to volume")
                volume.commit()
            except Exception as e:
                if model_id == FLUX_SCHNELL:
                    print(f"⚠️  FLUX download failed ({e}) — using OpenFLUX.1")
                    model_id = OPEN_FLUX
                    hf_token = None
                    snapshot_download(
                        repo_id=OPEN_FLUX,
                        local_dir=MODEL_CACHE,
                        ignore_patterns=["*.md", "original/*"],
                    )
                    print("✅ OpenFLUX.1 saved to volume")
                    volume.commit()
                else:
                    raise
        else:
            print(f"✅ Weights in volume — skipping download")

        # Load from flat dir — local_files_only = no network calls
        print(f"🚀 Loading from {MODEL_CACHE}...")
        self.pipe = FluxPipeline.from_pretrained(
            MODEL_CACHE,
            torch_dtype=torch.bfloat16,
            local_files_only=True,
        )

        self.pipe.enable_sequential_cpu_offload()
        self.pipe.enable_attention_slicing()

        self.model_name = "FLUX.1-schnell" if hf_token else "OpenFLUX.1"
        print(f"✅ {self.model_name} ready")

    @modal.fastapi_endpoint(method="POST", label="generate")
    def generate(self, request: dict):
        import torch
        import traceback
        from fastapi.responses import Response

        try:
            prompt = (request.get("prompt") or "").strip()
            width  = min(int(request.get("width",  512)), 1024)
            height = min(int(request.get("height", 512)), 1024)
            steps  = min(int(request.get("num_inference_steps", 4)), 8)
            seed   = request.get("seed")
            fmt    = request.get("format", "jpeg").lower()

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

            print(f"🎨 [{self.model_name}] {prompt[:80]}")
            generator = torch.Generator("cpu").manual_seed(seed) if seed is not None else None

            with torch.inference_mode():
                result = self.pipe(
                    prompt=prompt,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=0.0,
                    generator=generator,
                )

            img = result.images[0]
            buf = io.BytesIO()
            if fmt == "png":
                img.save(buf, format="PNG")
                media_type = "image/png"
            else:
                img.save(buf, format="JPEG", quality=92)
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
        except Exception as e:
            tb = traceback.format_exc()
            print(f"❌ Generation error: {tb}")
            return Response(
                content=f'{{"error":"{str(e)}","traceback":"{tb[:500]}"}}'.encode(),
                media_type="application/json",
                status_code=500,
            )

    @modal.fastapi_endpoint(method="GET", label="health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status":     "healthy",
            "model":      getattr(self, "model_name", "loading..."),
            "gpu":        "T4",
            "max_gpus":   1,
            "licence":    "Apache-2.0",
            "cost":       "~$0.002/image (T4, ~10s warm)",
            "free_quota": "$30/mo → ~15,000 images/mo FREE",
            "version":    "3.0.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/image_generate.py")
    print("Image:  https://iamhollywoodpro--generate.modal.run")
    print("Health: https://iamhollywoodpro--health.modal.run")
