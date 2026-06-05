#!/usr/bin/env/python3
"""
HOLLY FLUX.2 Klein 9B + Multi-LoRA Image Generation Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  FLUX.2 Klein 9B (BF16) + Multi-LoRA stack
GPU:    NVIDIA L4 (24 GB VRAM) — BF16 model with CPU offloading
Cost:   ~$0.001/image (4 steps!) | $30/mo free → ~30 hours/month
Trigger: h0lly — LoRA trained on Civitai for consistent Holly face

LoRA Stack (all loaded + fused at startup):
  1. holly-face-v2.safetensors       — Holly's consistent face (trigger: h0lly)
  2. flux-klein-nsfw-v2.safetensors  — NSFW anatomy, no face change (Lorian)
  3. full-fine-body-v1.safetensors   — Full body poses, all angles (Sarcastic TOFU)

Design:
  - FLUX.2 Klein 9B BF16 weights in Modal Volume
  - enable_model_cpu_offload() keeps peak VRAM under 24 GB on L4
  - All LoRAs loaded and fused at startup — prompt controls output
  - scaledown_window=120 → stays warm 2 min, then scales to zero
  - max_containers=1 → never spins up more than 1 GPU
  - 4 inference steps → sub-second generation after model loads
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

# LoRA adapters — loaded and fused at startup
# Max ~4 adapters before OOM on L4 (24GB). Face is mandatory.
# Additional LoRAs are available in the volume but not loaded —
# swap them in by moving from AVAILABLE to LORA_ADAPTERS dict.
LORA_ADAPTERS = {
    # ── ACTIVE (loaded at startup, fused into model) ──
    "face": {
        "file": "holly-face-v2.safetensors",
        "weight": 0.85,
        "desc": "Holly Face v2.0 (trigger: h0lly) [MANDATORY]",
    },
    "nsfw": {
        "file": "flux-klein-nsfw-v2.safetensors",
        "weight": 0.7,
        "desc": "NSFW anatomy, no face change (Lorian)",
    },
    "body": {
        "file": "full-fine-body-v1.safetensors",
        "weight": 0.7,
        "desc": "Full body poses, all angles (Sarcastic TOFU)",
    },
}

# Available but NOT loaded — swap into LORA_ADAPTERS as needed
LORA_AVAILABLE = {
    "insert": {
        "file": "insertkit.safetensors",
        "weight": 0.65,
        "desc": "Insertion/explicit act variety",
    },
    "unchained": {
        "file": "klein-unchained-v2.safetensors",
        "weight": 0.6,
        "desc": "Unchained — uncensored enhancement",
    },
    "pusfix": {
        "file": "pusfix-klein.safetensors",
        "weight": 0.7,
        "desc": "Pussy anatomy fix/detail",
    },
    "phat-ass": {
        "file": "phat-ass-v1.safetensors",
        "weight": 0.65,
        "desc": "Ass/body enhancement variety",
    },
    "pytorch": {
        "file": "pytorch-lora-weights.safetensors",
        "weight": 0.5,
        "desc": "Additional LoRA enhancement (38MB, limited scope)",
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
        self.loaded_adapters = {}
        self.model_name = "FLUX.2 Klein 9B (not loaded)"
        self.startup_error = None

        # Authenticate with HuggingFace
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
        if hf_token:
            login(token=hf_token)
            print("✅ HuggingFace authenticated")
        else:
            print("⚠️  No HuggingFace token found")

        # Download FLUX.2 Klein 9B BF16 to volume on first run only
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

        # Load FLUX.2 Klein pipeline
        try:
            print(f"🚀 Loading FLUX.2 Klein 9B from {MODEL_CACHE}...")
            from diffusers import Flux2KleinPipeline

            self.pipe = Flux2KleinPipeline.from_pretrained(
                MODEL_CACHE,
                torch_dtype=torch.bfloat16,
                local_files_only=True,
            )
            self.pipe.enable_model_cpu_offload()
            print("✅ Pipeline loaded with CPU offloading")
        except Exception as e:
            self.startup_error = f"Pipeline load failed: {e}"
            print(f"❌ {self.startup_error}")
            return

        # Load all LoRA adapters (each gets a named adapter)
        loaded_names = []
        for adapter_name, config in LORA_ADAPTERS.items():
            lora_path = f"{LORA_DIR}/{config['file']}"
            if os.path.exists(lora_path):
                try:
                    print(f"🎭 Loading LoRA '{adapter_name}': {config['file']}...")
                    self.pipe.load_lora_weights(
                        LORA_DIR,
                        weight_name=config["file"],
                        adapter_name=adapter_name,
                    )
                    self.loaded_adapters[adapter_name] = config
                    loaded_names.append(adapter_name)
                    print(f"  ✅ {adapter_name} loaded")
                except Exception as e:
                    print(f"  ⚠️  Failed to load {adapter_name}: {e}")
            else:
                print(f"  ⚠️  {config['file']} not found — skipping {adapter_name}")

        # Set all adapters active with their individual weights, then fuse into model
        if loaded_names:
            adapter_weights = [LORA_ADAPTERS[a]["weight"] for a in loaded_names]
            self.pipe.set_adapters(loaded_names, adapter_weights=adapter_weights)
            print(f"🎭 All adapters active: {list(zip(loaded_names, adapter_weights))}")

            # Fuse LoRAs into model weights then unload originals to free VRAM
            self.pipe.fuse_lora()
            self.pipe.unload_lora_weights()
            print("✅ All LoRAs fused into model weights (originals unloaded)")

        adapter_list = ", ".join(loaded_names) if loaded_names else "none"
        self.model_name = f"FLUX.2 Klein 9B + LoRAs [{adapter_list}]"
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
            steps  = min(int(request.get("num_inference_steps", 4)), 50)
            seed   = request.get("seed")
            fmt    = request.get("format", "jpeg").lower()
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
                    "X-Provider": "modal-flux2klein-lora",
                    "X-Adapters": ",".join(self.loaded_adapters.keys()),
                    "X-Width":    str(width),
                    "X-Height":   str(height),
                    "X-Steps":    str(steps),
                    "X-Guidance": str(guidance_scale),
                    "X-Version":  "6.0.0",
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
        startup_error = getattr(self, "startup_error", None)
        model_loaded = self.pipe is not None
        action = None
        if startup_error and ("gated" in startup_error.lower() or "401" in startup_error or "403" in startup_error):
            action = "Accept gated repo license at https://huggingface.co/black-forest-labs/FLUX.2-klein-9B"
        return JSONResponse({
            "status":           "healthy" if model_loaded else "waiting",
            "model":            getattr(self, "model_name", "loading..."),
            "model_loaded":     model_loaded,
            "loaded_adapters":  list(getattr(self, "loaded_adapters", {}).keys()),
            "adapter_details":  {k: v["desc"] for k, v in getattr(self, "loaded_adapters", {}).items()},
            "startup_error":    startup_error,
            "action_needed":    action,
            "gpu":              "L4",
            "base_model":       "FLUX.2 Klein 9B BF16",
            "max_gpus":         1,
            "purpose":          "Holly self-portraits — FLUX.2 Klein 9B + Multi-LoRA",
            "trigger_word":     "h0lly",
            "licence":          "Apache-2.0",
            "version":          "6.0.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/image_generate_flux2klein.py")
    print("Generate: https://iamhollywoodpro--generate-holly.modal.run")
    print("Health:   https://iamhollywoodpro--holly-health.modal.run")
