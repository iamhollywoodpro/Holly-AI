#!/usr/bin/env python3
"""
HOLLY SDXL + LoRA Image Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  StableDiffusion XL 1.0 + Holly LoRA (face consistency)
GPU:    NVIDIA T4 (16 GB VRAM) — $0.000164/s
Cost:   ~$0.003/image | $30/mo free → barely touches budget
Trigger: h0lly — LoRA trained on Civitai for consistent Holly face

Purpose: ONLY used when generating images of Holly herself.
         All other image generation stays on FLUX.1-schnell.

Design:
  - SDXL weights + Holly LoRA in Modal Volume
  - LoRA loaded at startup, always ready
  - scaledown_window=60 → stays warm 1 min, then scales to zero
  - max_containers=1 → never spins up more than 1 GPU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-image-sdxl-lora")

SDXL_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
MODEL_CACHE = "/sdxl-models"
LORA_DIR = "/lora"

volume = modal.Volume.from_name("holly-sdxl-weights", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

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
        "safetensors",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
)


@app.cls(
    image=image,
    gpu="T4",
    max_containers=1,
    scaledown_window=60,
    timeout=300,
    startup_timeout=600,
    volumes={MODEL_CACHE: volume, LORA_DIR: lora_volume},
)
class HollySDXLLoRA:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import StableDiffusionXLPipeline
        from huggingface_hub import snapshot_download

        # Download SDXL weights to volume on first run only
        if not os.path.exists(f"{MODEL_CACHE}/model_index.json"):
            print(f"📥 Downloading {SDXL_MODEL} to volume (first run only)...")
            snapshot_download(
                repo_id=SDXL_MODEL,
                local_dir=MODEL_CACHE,
                ignore_patterns=["*.md", "original/*"],
            )
            print("✅ SDXL weights saved to volume")
            volume.commit()
        else:
            print("✅ SDXL weights in volume — skipping download")

        # Load SDXL pipeline
        print(f"🚀 Loading SDXL from {MODEL_CACHE}...")
        self.pipe = StableDiffusionXLPipeline.from_pretrained(
            MODEL_CACHE,
            torch_dtype=torch.float16,
            local_files_only=True,
            use_safetensors=True,
        )
        self.pipe = self.pipe.to("cuda")
        self.pipe.enable_attention_slicing()
        print("✅ SDXL pipeline loaded")

        # Load Holly LoRA
        self.lora_loaded = False
        lora_files = [f for f in os.listdir(LORA_DIR) if f.endswith('.safetensors')]
        if lora_files:
            lora_path = os.path.join(LORA_DIR, lora_files[0])
            print(f"🎭 Loading Holly LoRA: {lora_files[0]}...")
            self.pipe.load_lora_weights(LORA_DIR, weight_name=lora_files[0])
            self.lora_loaded = True
            self.lora_name = lora_files[0]
            print(f"✅ Holly LoRA loaded — {self.lora_name}")
        else:
            print("⚠️  No LoRA file found in volume — generating without LoRA")
            self.lora_name = None

        self.model_name = "SDXL 1.0 + Holly LoRA" if self.lora_loaded else "SDXL 1.0"
        print(f"✅ {self.model_name} ready")

    @modal.fastapi_endpoint(method="POST", label="generate-holly")
    def generate(self, request: dict):
        import torch
        import traceback
        from fastapi.responses import Response

        try:
            prompt = (request.get("prompt") or "").strip()
            width  = min(int(request.get("width",  1024)), 1024)
            height = min(int(request.get("height", 1024)), 1024)
            steps  = min(int(request.get("num_inference_steps", 30)), 50)
            seed   = request.get("seed")
            fmt    = request.get("format", "jpeg").lower()
            lora_scale = float(request.get("lora_scale", 0.7))

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
            generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None

            # Apply LoRA scale if loaded
            cross_attention_kwargs = {"scale": lora_scale} if self.lora_loaded else None

            with torch.inference_mode():
                result = self.pipe(
                    prompt=prompt,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=7.5,
                    generator=generator,
                    cross_attention_kwargs=cross_attention_kwargs,
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
                    "X-Provider": "modal-sdxl-lora",
                    "X-LoRA":     self.lora_name or "none",
                    "X-LoRA-Scale": str(lora_scale),
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

    @modal.fastapi_endpoint(method="GET", label="holly-health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status":       "healthy",
            "model":        getattr(self, "model_name", "loading..."),
            "lora_loaded":  getattr(self, "lora_loaded", False),
            "lora_name":    getattr(self, "lora_name", None),
            "gpu":          "T4",
            "max_gpus":     1,
            "purpose":      "Holly self-portraits only — SDXL + LoRA for face consistency",
            "trigger_word": "h0lly",
            "licence":      "Apache-2.0",
            "version":      "1.0.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/image_generate_sdxl.py")
    print("Generate: https://iamhollywoodpro--generate-holly.modal.run")
    print("Health:   https://iamhollywoodpro--holly-health.modal.run")
