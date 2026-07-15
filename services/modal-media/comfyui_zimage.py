#!/usr/bin/env python3
"""
HOLLY ComfyUI + Z-Image Turbo — Modal Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deploy ComfyUI on Modal with Z-Image Turbo base for Holly's image generation.

WHY COMFYUI (not diffusers):
  ZImagePipeline's LoRA loading in diffusers is buggy (issues #12745, #13221, #13249).
  ComfyUI's native LoraLoader node is the proven, stable path for Z-Image LoRAs.

WHY Z-IMAGE (not Klein):
  Klein 9B ships with NSFW filters baked into the weights — it can't do the explicit
  content Holly needs. Z-Image Turbo is the community #1 photorealistic NSFW model.

ARCHITECTURE:
  1. ComfyUI runs as a background subprocess (localhost:8188) inside the Modal container
  2. A FastAPI wrapper handles: build workflow JSON → POST /prompt → poll /history → GET /view
  3. Returns raw image bytes (same contract as the Klein endpoint — minimal TS change)

DEPLOY:
  modal deploy --profile iamhollywoodpro services/modal-media/comfyui_zimage.py

ENDPOINTS (after deploy):
  Generate: https://iamhollywoodpro--generate-comfyui-zimage.modal.run
  Health:   https://iamhollywoodpro--comfyui-zimage-health.modal.run

GPU: A100 on Modal (~$1.50-2.00/hr)
Cost per image: ~$0.01-0.02 (4-step Turbo, sub-second generation)

PREREQUISITE:
  Modal secret "huggingface-secret" must exist (holds HF_TOKEN). Already configured.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import sys
import time
import json
import uuid
import urllib.request
import urllib.error
import subprocess
import signal

import modal

app = modal.App("holly-comfyui-zimage")

# ─── Paths ────────────────────────────────────────────────────────────
COMFYUI_DIR = "/root/ComfyUI"
MODELS_DIR = f"{COMFYUI_DIR}/models"
UNET_DIR = f"{MODELS_DIR}/diffusion_models"
CLIP_DIR = f"{MODELS_DIR}/text_encoders"
VAE_DIR = f"{MODELS_DIR}/vae"
LORA_DIR = f"{MODELS_DIR}/loras"
OUTPUT_DIR = f"{COMFYUI_DIR}/output"

# Volumes — model weights cached separately from LoRAs
MODEL_VOL = "/models"
LORA_VOL_MOUNT = "/lora"
COMFYUI_PORT = 8188

# Z-Image Turbo model files — from Comfy-Org (ComfyUI-formatted single files)
# Comfy-Org re-hosts the model in single-file safetensors format under split_files/
# The original Tongyi-MAI/Z-Image-Turbo uses diffusers folder structure, not single files.
ZIMAGE_REPO = "Comfy-Org/z_image_turbo"
UNET_FILE = "z_image_turbo_bf16.safetensors"      # split_files/diffusion_models/
CLIP_FILE = "qwen_3_4b.safetensors"                # split_files/text_encoders/
VAE_FILE = "ae.safetensors"                        # split_files/vae/

# Subpaths within the HF repo
UNET_SUBPATH = "split_files/diffusion_models"
CLIP_SUBPATH = "split_files/text_encoders"
VAE_SUBPATH = "split_files/vae"


# ─── Workflow builder (inlined — avoids cross-module packaging issues) ──
def build_workflow(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    seed=None,
    loras=None,
    steps: int = 4,
    cfg: float = 1.0,
    sampler: str = "dpmpp_2m_sde",
    scheduler: str = "sgm_uniform",
    filename_prefix: str = "Holly",
) -> dict:
    """Build ComfyUI API-format workflow for Z-Image Turbo text-to-image with LoRA stacking."""
    import random as _random
    if seed is None:
        seed = _random.randint(0, 2**63 - 1)
    if loras is None:
        loras = []

    wf = {}
    nid = [1]

    def _id():
        v = str(nid[0]); nid[0] += 1; return v

    # Loaders
    unet_id = _id()
    wf[unet_id] = {"class_type": "UNETLoader", "inputs": {"unet_name": UNET_FILE, "weight_dtype": "fp8_e4m3fn"}}
    clip_id = _id()
    wf[clip_id] = {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP_FILE, "type": "lumina2"}}
    vae_id = _id()
    wf[vae_id] = {"class_type": "VAELoader", "inputs": {"vae_name": VAE_FILE}}

    # Chained LoRAs
    cur_model = [unet_id, 0]
    cur_clip = [clip_id, 0]
    for lora in loras:
        lid = _id()
        wf[lid] = {"class_type": "LoraLoader", "inputs": {
            "lora_name": lora["name"],
            "strength_model": lora.get("strength", 0.8),
            "strength_clip": lora.get("strength_clip", lora.get("strength", 0.8)),
            "model": cur_model, "clip": cur_clip,
        }}
        cur_model = [lid, 0]
        cur_clip = [lid, 1]

    # Conditioning
    pos_id = _id()
    wf[pos_id] = {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": cur_clip}}
    neg_id = _id()
    wf[neg_id] = {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": [pos_id, 0]}}

    # Latent + Sampler
    latent_id = _id()
    wf[latent_id] = {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}}
    sampler_id = _id()
    wf[sampler_id] = {"class_type": "KSampler", "inputs": {
        "seed": seed, "steps": steps, "cfg": cfg,
        "sampler_name": sampler, "scheduler": scheduler, "denoise": 1.0,
        "model": cur_model, "positive": [pos_id, 0], "negative": [neg_id, 0],
        "latent_image": [latent_id, 0],
    }}

    # Decode + Save
    decode_id = _id()
    wf[decode_id] = {"class_type": "VAEDecode", "inputs": {"samples": [sampler_id, 0], "vae": [vae_id, 0]}}
    save_id = _id()
    wf[save_id] = {"class_type": "SaveImage", "inputs": {"images": [decode_id, 0], "filename_prefix": filename_prefix}}

    return {"prompt": wf}


# ─── Volumes ──────────────────────────────────────────────────────────
model_volume = modal.Volume.from_name("holly-comfyui-models", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

# ─── Image: ComfyUI + dependencies ────────────────────────────────────
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    # PyTorch with CUDA 12.4
    .pip_install(
        "torch>=2.6.0",
        "torchvision",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    # Clone ComfyUI
    .run_commands(
        "git clone https://github.com/comfyanonymous/ComfyUI.git /root/ComfyUI",
    )
    # Install ComfyUI requirements (must use run_commands for -r flag)
    .run_commands(
        f"pip install -r /root/ComfyUI/requirements.txt",
    )
    # Create model directories (ComfyUI expects these)
    .run_commands(
        f"mkdir -p {UNET_DIR} {CLIP_DIR} {VAE_DIR} {LORA_DIR} {OUTPUT_DIR}",
    )
    # Additional deps for Z-Image + workflow + FastAPI endpoints
    .pip_install("huggingface_hub", "safetensors", "accelerate", "fastapi[standard]")
)


# ─── Helper: download Z-Image model files to volume ───────────────────
def download_models():
    """Download Z-Image Turbo model files to the models volume if not cached."""
    from huggingface_hub import hf_hub_download

    unet_path = f"{MODEL_VOL}/unet/{UNET_FILE}"
    clip_path = f"{MODEL_VOL}/clip/{CLIP_FILE}"
    vae_path = f"{MODEL_VOL}/vae/{VAE_FILE}"

    os.makedirs(f"{MODEL_VOL}/unet", exist_ok=True)
    os.makedirs(f"{MODEL_VOL}/clip", exist_ok=True)
    os.makedirs(f"{MODEL_VOL}/vae", exist_ok=True)

    # Download each file if not present
    # Comfy-Org repo structure: split_files/{diffusion_models,text_encoders,vae}/{filename}
    files_to_download = [
        (f"{UNET_SUBPATH}/{UNET_FILE}", unet_path),
        (f"{CLIP_SUBPATH}/{CLIP_FILE}", clip_path),
        (f"{VAE_SUBPATH}/{VAE_FILE}", vae_path),
    ]

    for hf_path, dest in files_to_download:
        filename = os.path.basename(hf_path)
        if os.path.exists(dest):
            print(f"✅ {filename} already cached")
        else:
            print(f"📥 Downloading {hf_path} from {ZIMAGE_REPO}...")
            downloaded = hf_hub_download(
                repo_id=ZIMAGE_REPO,
                filename=hf_path,
                local_dir=f"{MODEL_VOL}/_dl",
            )
            import shutil
            shutil.move(downloaded, dest)
            shutil.rmtree(f"{MODEL_VOL}/_dl", ignore_errors=True)
            print(f"✅ {filename} saved to volume")


def link_models_to_comfyui():
    """Symlink model files from the volume into ComfyUI's expected directories."""
    import shutil

    # UNET
    unet_src = f"{MODEL_VOL}/unet/{UNET_FILE}"
    unet_dst = f"{UNET_DIR}/{UNET_FILE}"
    if os.path.exists(unet_src) and not os.path.exists(unet_dst):
        os.symlink(unet_src, unet_dst)

    # CLIP
    clip_src = f"{MODEL_VOL}/clip/{CLIP_FILE}"
    clip_dst = f"{CLIP_DIR}/{CLIP_FILE}"
    if os.path.exists(clip_src) and not os.path.exists(clip_dst):
        os.symlink(clip_src, clip_dst)

    # VAE
    vae_src = f"{MODEL_VOL}/vae/{VAE_FILE}"
    vae_dst = f"{VAE_DIR}/{VAE_FILE}"
    if os.path.exists(vae_src) and not os.path.exists(vae_dst):
        os.symlink(vae_src, vae_dst)

    print(f"✅ Model files linked into ComfyUI directories")


# ─── Helper: wait for ComfyUI to be ready ─────────────────────────────
def wait_for_comfyui(timeout: int = 120):
    """Wait for ComfyUI server to respond."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{COMFYUI_PORT}/system_stats")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    print("✅ ComfyUI server is ready")
                    return True
        except Exception:
            time.sleep(2)
    raise TimeoutError(f"ComfyUI did not become ready within {timeout}s")


# ─── GPU Class ────────────────────────────────────────────────────────
@app.cls(
    image=image,
    gpu="A100",
    max_containers=1,
    scaledown_window=120,
    timeout=600,
    startup_timeout=600,  # 10 min — model download on first run
    volumes={
        MODEL_VOL: model_volume,
        LORA_VOL_MOUNT: lora_volume,
    },
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyComfyUIZImage:
    """ComfyUI + Z-Image Turbo generation endpoint."""

    @modal.enter()
    def startup(self):
        """Download models (first run), link to ComfyUI, launch ComfyUI server."""
        print("═══ Holly ComfyUI Z-Image Startup ═══")

        # Step 1: Download Z-Image model files to volume (cached after first run)
        download_models()
        model_volume.commit()

        # Step 2: Link model files into ComfyUI's expected directories
        link_models_to_comfyui()

        # Step 3: Symlink LoRA volume into ComfyUI's loras directory
        # The holly-lora-weights volume is mounted at /lora; ComfyUI looks in models/loras/
        lora_link = LORA_DIR
        if os.path.exists(LORA_VOL_MOUNT) and not os.path.exists(lora_link):
            # Remove empty dir and symlink the volume
            os.rmdir(lora_link)
            os.symlink(LORA_VOL_MOUNT, lora_link)
            print(f"✅ LoRA volume linked: {LORA_VOL_MOUNT} → {lora_link}")
        elif os.path.islink(lora_link):
            print(f"✅ LoRA volume already linked")

        # Step 4: Launch ComfyUI as background process
        print(f"🚀 Launching ComfyUI on port {COMFYUI_PORT}...")
        self.comfyui_proc = subprocess.Popen(
            [
                sys.executable, "main.py",
                "--listen", "127.0.0.1",
                "--port", str(COMFYUI_PORT),
                "--preview-method", "auto",
                "--output-directory", OUTPUT_DIR,
            ],
            cwd=COMFYUI_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env={**os.environ, "CUDA_VISIBLE_DEVICES": "0"},
        )

        # Step 5: Wait for ComfyUI to be ready
        wait_for_comfyui(timeout=180)

        # Print any startup output for debugging
        print("═══ ComfyUI Z-Image Ready ═══")

    @modal.exit()
    def shutdown(self):
        """Clean shutdown of ComfyUI subprocess."""
        if hasattr(self, 'comfyui_proc') and self.comfyui_proc.poll() is None:
            self.comfyui_proc.send_signal(signal.SIGTERM)
            self.comfyui_proc.wait(timeout=30)
            print("🛑 ComfyUI subprocess stopped")

    def _post_workflow(self, workflow: dict) -> str:
        """Submit workflow to ComfyUI, return prompt_id."""
        data = json.dumps(workflow).encode("utf-8")
        req = urllib.request.Request(
            f"http://127.0.0.1:{COMFYUI_PORT}/prompt",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        return result["prompt_id"]

    def _poll_history(self, prompt_id: str, timeout: int = 300) -> dict:
        """Poll /history/{prompt_id} until the job completes. Returns history entry."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                req = urllib.request.Request(
                    f"http://127.0.0.1:{COMFYUI_PORT}/history/{prompt_id}"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    history = json.loads(resp.read())

                if prompt_id in history:
                    entry = history[prompt_id]
                    # Check for errors
                    if "status" in entry and entry["status"].get("status_str") == "error":
                        raise RuntimeError(f"ComfyUI job failed: {entry['status'].get('messages', 'unknown error')}")
                    # Check if outputs exist
                    if "outputs" in entry and entry["outputs"]:
                        return entry
            except urllib.error.URLError:
                pass
            time.sleep(1)

        raise TimeoutError(f"ComfyUI job {prompt_id} did not complete within {timeout}s")

    def _fetch_image(self, history_entry: dict) -> bytes:
        """Fetch the generated image from ComfyUI's /view endpoint."""
        # Find the SaveImage output
        outputs = history_entry.get("outputs", {})
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                img_info = node_output["images"][0]
                filename = img_info["filename"]
                subfolder = img_info.get("subfolder", "")
                img_type = img_info.get("type", "output")

                url = (
                    f"http://127.0.0.1:{COMFYUI_PORT}/view?"
                    f"filename={filename}&subfolder={subfolder}&type={img_type}"
                )
                with urllib.request.urlopen(url, timeout=30) as resp:
                    return resp.read()

        raise RuntimeError("No image found in ComfyUI output")

    @modal.fastapi_endpoint(method="POST", label="generate-comfyui-zimage")
    def generate(self, request: dict) -> bytes:
        """
        Generate an image using Z-Image Turbo via ComfyUI.

        Request body:
            prompt: str — the image prompt
            width: int — image width (default 1024)
            height: int — image height (default 1024)
            seed: int — random seed (optional)
            loras: list — [{"name": "file.safetensors", "strength": 0.8}, ...]
            steps: int — inference steps (default 4)
            cfg: float — CFG scale (default 1.0)

        Returns:
            Raw image bytes (PNG).
        """
        from fastapi import Response

        prompt = request.get("prompt", "")
        width = request.get("width", 1024)
        height = request.get("height", 1024)
        seed = request.get("seed")
        loras = request.get("loras", [])
        steps = request.get("steps", 4)
        cfg = request.get("cfg", 1.0)

        if not prompt:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="prompt is required")

        # Build the workflow
        # Use a unique filename prefix so we can find the output
        job_id = str(uuid.uuid4())[:8]
        workflow = build_workflow(
            prompt=prompt,
            width=min(width, 1536),
            height=min(height, 1536),
            seed=seed,
            loras=loras,
            steps=steps,
            cfg=cfg,
            filename_prefix=f"Holly_{job_id}",
        )

        try:
            # Submit → poll → fetch
            prompt_id = self._post_workflow(workflow)
            history = self._poll_history(prompt_id, timeout=300)
            img_bytes = self._fetch_image(history)

            return Response(
                content=img_bytes,
                media_type="image/png",
                headers={
                    "X-Model": "Z-Image-Turbo-via-ComfyUI",
                    "X-Provider": "holly-comfyui-zimage",
                    "X-Job-Id": job_id,
                    "X-Prompt-Id": prompt_id,
                    "Access-Control-Allow-Origin": "*",
                },
            )
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail=f"Generation failed: {str(e)}")

    @modal.fastapi_endpoint(method="GET", label="comfyui-zimage-health")
    def health(self):
        """Health check — confirms ComfyUI is alive + Z-Image model is loaded."""
        import socket

        # Check if ComfyUI process is alive
        proc_alive = hasattr(self, 'comfyui_proc') and self.comfyui_proc.poll() is None

        # Check if we can reach ComfyUI's API
        comfyui_reachable = False
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{COMFYUI_PORT}/system_stats")
            with urllib.request.urlopen(req, timeout=5) as resp:
                comfyui_reachable = resp.status == 200
        except Exception:
            pass

        # Check model files exist
        models_present = all([
            os.path.exists(f"{UNET_DIR}/{UNET_FILE}"),
            os.path.exists(f"{CLIP_DIR}/{CLIP_FILE}"),
            os.path.exists(f"{VAE_DIR}/{VAE_FILE}"),
        ])

        status = "healthy" if (proc_alive and comfyui_reachable and models_present) else "degraded"

        return {
            "status": status,
            "comfyui_process": "alive" if proc_alive else "dead",
            "comfyui_api": "reachable" if comfyui_reachable else "unreachable",
            "models": "loaded" if models_present else "missing",
            "model": "Z-Image-Turbo",
            "backend": "ComfyUI",
        }


# ─── Deploy hints ─────────────────────────────────────────────────────
@app.local_entrypoint()
def main():
    print("═══ Holly ComfyUI Z-Image Endpoint ═══")
    print(f"Deploy: modal deploy --profile iamhollywoodpro services/modal-media/comfyui_zimage.py")
    print(f"Generate: https://iamhollywoodpro--generate-comfyui-zimage.modal.run")
    print(f"Health:   https://iamhollywoodpro--comfyui-zimage-health.modal.run")
