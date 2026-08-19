#!/usr/bin/env python3
"""
HOLLY Modal Video Service — MiniMax H3 (Phase D1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  MiniMax H3 (32B omni-modal, open weights via Comfy-Org repack)
Modes:  I2V (first-frame image → video)  +  R2V (reference images → video)
GPU:    NVIDIA A100 80GB
Repo:   Comfy-Org/MiniMax-H3 (ComfyUI-format weights)

WHY H3 (decided 2026-08-19, roadmap Phase D revision):
  - #2 overall on Artificial Analysis image-to-video arena (blind votes),
    highest-ranked OPEN-WEIGHTS model. Wan2.2 is not in the top 15.
  - R2V mode accepts reference images tagged <Picture 1..9> — identity
    anchoring from Holly's existing reference set (the fix for morphing faces).
  - Wan2.2 T2V (previous service) had NO image anchor — faces re-invented
    every generation. This service ALWAYS anchors on Holly's images.
  - License: MiniMax H3 Community License — Steve is in Canada (not on the
    US/EU/UK/KR exclusion list).

WEIGHTS (all from Comfy-Org/MiniMax-H3, ~67GB total on one Modal volume):
  diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors   (21GB, I2V)
  diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors  (21GB, R2V)
  text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors           (15.7GB)
  vae/minimax_h3_video_vae_fp16.safetensors                            (5.2GB)
  vae/minimax_h3_audio_vae_fp32.safetensors                            (0.6GB)
  loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors      (2GB, I2V speed)
  loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors     (2GB, R2V speed)

WHY COMFYUI (not diffusers): diffusers H3 support is inference-only/
in flux (open weights-format discussion on HF); ComfyUI has day-0 native
nodes (MiniMaxH3ImageToVideo, MiniMaxH3ReferenceToVideo) and this repo
already runs a proven headless-ComfyUI-on-Modal pattern (comfyui_klein.py).
Node graph below mirrors comfy-org/workflow_templates
(video_minimax_h3_i2v.json / video_minimax_h3_r2v.json).

LENGTH CONSTRAINT (from official template's ComfyMathExpression):
  length = max(5, round(duration_s * 24)) adjusted so length % 17 == 5.

Identity strategy (NO MODEL STACKING — one model, one anchor pattern):
  1. Still frame comes from the existing Klein image pipeline (identity
     already locked by holly-combined-v1). Video only animates.
  2. R2V adds Holly's reference photos as <Picture N> anchors.
  3. Prompt describes MOTION ONLY (camera + action), never Holly's appearance.
"""

import base64
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

import modal

app = modal.App("holly-h3-video")

COMFYUI_DIR = "/root/ComfyUI"
MODELS_DIR = f"{COMFYUI_DIR}/models"
UNET_DIR = f"{MODELS_DIR}/diffusion_models"
CLIP_DIR = f"{MODELS_DIR}/text_encoders"
VAE_DIR = f"{MODELS_DIR}/vae"
LORA_DIR = f"{MODELS_DIR}/loras"
OUTPUT_DIR = f"{COMFYUI_DIR}/output"
INPUT_DIR = f"{COMFYUI_DIR}/input"
COMFYUI_PORT = 8188

H3_VOL_MOUNT = "/h3-weights"
H3_REPO = "Comfy-Org/MiniMax-H3"

UNET_I2V = "minimax_h3_fl2va_pruned_int8_convrot.safetensors"
UNET_R2V = "minimax_h3_ref2va_pruned_int8_convrot.safetensors"
TEXT_ENCODER = "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors"
VIDEO_VAE = "minimax_h3_video_vae_fp16.safetensors"
AUDIO_VAE = "minimax_h3_audio_vae_fp32.safetensors"
TURBO_I2V = "minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors"
TURBO_R2V = "minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors"

# (repo_subdir, filename) — everything lives flat in the volume, symlinked
# into ComfyUI's expected directories at startup.
H3_FILES = [
    ("diffusion_models", UNET_I2V),
    ("diffusion_models", UNET_R2V),
    ("text_encoders", TEXT_ENCODER),
    ("vae", VIDEO_VAE),
    ("vae", AUDIO_VAE),
    ("loras", TURBO_I2V),
    ("loras", TURBO_R2V),
]


def download_weights():
    """Download H3 weights to the volume (idempotent — first run ~67GB)."""
    from huggingface_hub import hf_hub_download

    for subdir, filename in H3_FILES:
        target_dir = os.path.join(H3_VOL_MOUNT, subdir)
        target = os.path.join(target_dir, filename)
        if os.path.exists(target) and os.path.getsize(target) > 1_000_000:
            print(f"✅ already present: {subdir}/{filename}")
            continue
        os.makedirs(target_dir, exist_ok=True)
        print(f"📥 Downloading {subdir}/{filename} ...")
        got = hf_hub_download(
            repo_id=H3_REPO,
            filename=f"{subdir}/{filename}",
            local_dir=H3_VOL_MOUNT,
        )
        if os.path.abspath(got) != os.path.abspath(target):
            os.replace(got, target)
        print(f"✅ saved: {subdir}/{filename}")


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    .pip_install(
        # torch >= 2.8 required (comfy_kitchen list[int] op schemas); cu130
        # required — latest ComfyUI ships prebuilt comfy_kitchen kernels
        # linked against libcudart.so.13 (CUDA 13). cu128 crashes at import.
        "torch==2.9.0",
        "torchvision==0.24.0",
        "torchaudio==2.9.0",
        extra_options="--index-url https://download.pytorch.org/whl/cu130",
    )
    .run_commands("git clone https://github.com/comfyanonymous/ComfyUI.git /root/ComfyUI")
    .run_commands("pip install -r /root/ComfyUI/requirements.txt")
    .run_commands(f"mkdir -p {UNET_DIR} {CLIP_DIR} {VAE_DIR} {LORA_DIR} {OUTPUT_DIR} {INPUT_DIR}")
    .pip_install("huggingface_hub", "fastapi[standard]", "pillow")
)

h3_volume = modal.Volume.from_name("holly-h3-weights", create_if_missing=True)


def link_weights_to_comfyui():
    """Symlink volume files into ComfyUI's model directories."""
    links = [
        (os.path.join(H3_VOL_MOUNT, "diffusion_models", UNET_I2V), UNET_DIR),
        (os.path.join(H3_VOL_MOUNT, "diffusion_models", UNET_R2V), UNET_DIR),
        (os.path.join(H3_VOL_MOUNT, "text_encoders", TEXT_ENCODER), CLIP_DIR),
        (os.path.join(H3_VOL_MOUNT, "vae", VIDEO_VAE), VAE_DIR),
        (os.path.join(H3_VOL_MOUNT, "vae", AUDIO_VAE), VAE_DIR),
        (os.path.join(H3_VOL_MOUNT, "loras", TURBO_I2V), LORA_DIR),
        (os.path.join(H3_VOL_MOUNT, "loras", TURBO_R2V), LORA_DIR),
    ]
    for src, dst_dir in links:
        name = os.path.basename(src)
        dst = os.path.join(dst_dir, name)
        if os.path.islink(dst):
            os.unlink(dst)
        elif os.path.exists(dst):
            os.remove(dst)
        if not os.path.exists(src):
            raise FileNotFoundError(f"H3 weight missing on volume: {src}")
        os.symlink(src, dst)
        print(f"🔗 {name} → {dst_dir}")


def wait_for_comfyui(timeout: int = 600):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{COMFYUI_PORT}/system_stats")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    print("✅ ComfyUI is ready")
                    return
        except Exception:
            pass
        # If the subprocess died, fail fast with its output
        if hasattr(wait_for_comfyui, "_proc") and wait_for_comfyui._proc is not None \
                and wait_for_comfyui._proc.poll() is not None:
            _dump_comfyui_log()
            raise RuntimeError(
                f"ComfyUI subprocess exited with code {wait_for_comfyui._proc.returncode}")
        time.sleep(2)
    _dump_comfyui_log()
    raise RuntimeError("ComfyUI did not become ready in time")


COMFYUI_LOG = "/tmp/comfyui_h3.log"


def _dump_comfyui_log():
    """Print the tail of the ComfyUI subprocess log for debugging."""
    try:
        with open(COMFYUI_LOG, "r", errors="replace") as f:
            tail = f.read()[-6000:]
        print(f"───── ComfyUI subprocess log (tail) ─────\n{tail}\n──────────────────────────────────────────")
    except Exception as e:
        print(f"(could not read ComfyUI log: {e})")


def frame_length(duration_s: float) -> int:
    """Official length constraint: length % 17 == 5, min 5, ~24fps."""
    n = max(5, round(duration_s * 24))
    n += (5 - (n % 17)) % 17
    return n


@app.cls(
    image=image,
    gpu="A100-80GB",  # gpu="A100" gives the 40GB variant — too small
    max_containers=1,
    scaledown_window=300,
    timeout=1800,
    startup_timeout=3600,  # first run downloads ~67GB of weights
    memory=65536,
    volumes={H3_VOL_MOUNT: h3_volume},
)
class HollyH3Video:

    @modal.enter()
    def startup(self):
        print("═══ Holly H3 Video (MiniMax H3) Startup ═══")
        download_weights()
        h3_volume.commit()
        link_weights_to_comfyui()
        print(f"🚀 Launching ComfyUI on port {COMFYUI_PORT}...")
        comfyui_log = open(COMFYUI_LOG, "w")
        self.comfyui_proc = subprocess.Popen(
            [
                sys.executable, "main.py",
                "--listen", "127.0.0.1",
                "--port", str(COMFYUI_PORT),
                "--preview-method", "auto",
                "--output-directory", OUTPUT_DIR,
            ],
            cwd=COMFYUI_DIR,
            stdout=comfyui_log,
            stderr=subprocess.STDOUT,
            env={**os.environ, "CUDA_VISIBLE_DEVICES": "0"},
        )
        wait_for_comfyui._proc = self.comfyui_proc
        wait_for_comfyui(timeout=600)
        print("═══ Holly H3 Video Ready ═══")

    @modal.exit()
    def shutdown(self):
        if hasattr(self, "comfyui_proc") and self.comfyui_proc.poll() is None:
            self.comfyui_proc.send_signal(signal.SIGTERM)
            self.comfyui_proc.wait(timeout=30)
            print("🛑 ComfyUI subprocess stopped")

    # ── ComfyUI plumbing ────────────────────────────────────────────────

    def _post_workflow(self, workflow: dict) -> str:
        req = urllib.request.Request(
            f"http://127.0.0.1:{COMFYUI_PORT}/prompt",
            data=json.dumps({"prompt": workflow}).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())["prompt_id"]
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            raise RuntimeError(f"ComfyUI /prompt {e.code}: {body[:2000]}") from e

    def _poll_history(self, prompt_id: str, timeout: int = 1500) -> dict:
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                req = urllib.request.Request(
                    f"http://127.0.0.1:{COMFYUI_PORT}/history/{prompt_id}"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    hist = json.loads(resp.read())
                entry = hist.get(prompt_id)
                if entry:
                    status = entry.get("status", {})
                    if status.get("completed") or status.get("status_str") == "success":
                        return entry
                    if status.get("status_str") == "error":
                        msgs = status.get("messages", [])
                        raise RuntimeError(f"ComfyUI execution error: {str(msgs)[:2000]}")
            except urllib.error.URLError:
                pass
            time.sleep(3)
        raise TimeoutError(f"ComfyUI job {prompt_id} timed out")

    def _read_output_video(self, history: dict) -> bytes:
        """SaveVideo writes an mp4 into OUTPUT_DIR; read it directly."""
        for node_out in history.get("outputs", {}).values():
            for artifact in node_out.get("videos", []) or node_out.get("gifs", []) or []:
                filename = artifact.get("filename")
                subfolder = artifact.get("subfolder", "")
                path = os.path.join(OUTPUT_DIR, subfolder, filename)
                if filename and os.path.exists(path):
                    with open(path, "rb") as f:
                        return f.read()
        print(f"🔍 _read_output_video: outputs={list(history.get('outputs', {}).keys())} "
              f"status={history.get('status', {}).get('status_str')} "
              f"OUTPUT_DIR contents={os.listdir(OUTPUT_DIR)}")
        # Fallback: SaveVideo writes into OUTPUT_DIR regardless of history
        # artifacts (history 'outputs' can omit the video entry depending on
        # ComfyUI version). Scan for the newest holly_h3* mp4 directly.
        candidates = []
        for root, _dirs, files in os.walk(OUTPUT_DIR):
            for fn in files:
                if fn.startswith("holly_h3") and fn.endswith(".mp4"):
                    p = os.path.join(root, fn)
                    candidates.append((os.path.getmtime(p), p))
        if candidates:
            candidates.sort()
            with open(candidates[-1][1], "rb") as f:
                return f.read()
        raise RuntimeError(f"No video in ComfyUI history outputs or {OUTPUT_DIR}: {str(history)[:500]}")

    def _save_input_image(self, image_b64: str, name: str) -> str:
        os.makedirs(INPUT_DIR, exist_ok=True)
        path = os.path.join(INPUT_DIR, name)
        with open(path, "wb") as f:
            f.write(base64.b64decode(image_b64))
        return name

    # ── Workflow builders (API format, mirror official templates) ───────

    def _build_sampler_chain(self, h3_key: str, model_key: str, seed: int, steps: int) -> dict:
        return {
            "noise": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
            "guider": {"class_type": "BasicGuider", "inputs": {
                "model": [model_key, 0], "conditioning": [h3_key, 0]}},
            "sampler": {"class_type": "KSamplerSelect", "inputs": {
                "sampler_name": "res_multistep"}},
            "scheduler": {"class_type": "BasicScheduler", "inputs": {
                "model": [model_key, 0], "scheduler": "simple",
                "steps": steps, "denoise": 1.0}},
            "sca": {"class_type": "SamplerCustomAdvanced", "inputs": {
                "noise": ["noise", 0], "guider": ["guider", 0],
                "sampler": ["sampler", 0], "sigmas": ["scheduler", 0],
                "latent_image": [h3_key, 1]}},
            "vdec": {"class_type": "VAEDecode", "inputs": {
                "samples": ["sca", 0], "vae": ["vae_v", 0]}},
            "adec": {"class_type": "VAEDecodeAudio", "inputs": {
                "samples": ["sca", 0], "vae": ["vae_a", 0]}},
            "cvid": {"class_type": "CreateVideo", "inputs": {
                "images": ["vdec", 0], "fps": 24, "audio": ["adec", 0],
                "bit_depth": 8}},
            "save": {"class_type": "SaveVideo", "inputs": {
                "video": ["cvid", 0], "filename_prefix": "holly_h3",
                "format": "auto", "codec": "auto"}},
        }

    def _common_loaders(self) -> dict:
        return {
            "clip": {"class_type": "CLIPLoader", "inputs": {
                "clip_name": TEXT_ENCODER, "type": "minimax", "device": "default"}},
            "vae_v": {"class_type": "VAELoader", "inputs": {"vae_name": VIDEO_VAE}},
            "vae_a": {"class_type": "VAELoader", "inputs": {"vae_name": AUDIO_VAE}},
        }

    def build_i2v_workflow(self, prompt: str, image_name: str, width: int,
                           height: int, length: int, seed: int, steps: int) -> dict:
        wf = self._common_loaders()
        wf["load_image"] = {"class_type": "LoadImage", "inputs": {"image": image_name}}
        wf["unet"] = {"class_type": "UNETLoader", "inputs": {
            "unet_name": UNET_I2V, "weight_dtype": "default"}}
        wf["turbo"] = {"class_type": "LoraLoaderModelOnly", "inputs": {
            "model": ["unet", 0], "lora_name": TURBO_I2V, "strength_model": 1.0}}
        wf["h3"] = {"class_type": "MiniMaxH3ImageToVideo", "inputs": {
            "clip": ["clip", 0], "vae": ["vae_v", 0],
            "first_frame": ["load_image", 0],
            "prompt": prompt, "width": width, "height": height, "length": length}}
        wf.update(self._build_sampler_chain("h3", "turbo", seed, steps))
        return wf

    def build_r2v_workflow(self, prompt: str, ref_image_names: list,
                           width: int, height: int, length: int,
                           seed: int, steps: int) -> dict:
        wf = self._common_loaders()
        wf["unet"] = {"class_type": "UNETLoader", "inputs": {
            "unet_name": UNET_R2V, "weight_dtype": "default"}}
        wf["turbo"] = {"class_type": "LoraLoaderModelOnly", "inputs": {
            "model": ["unet", 0], "lora_name": TURBO_R2V, "strength_model": 1.0}}

        # Reference inputs are named ref_images.ref_image_0..2 (node schema).
        h3_inputs = {
            "clip": ["clip", 0], "vae": ["vae_v", 0], "audio_vae": ["vae_a", 0],
            "prompt": prompt, "width": width, "height": height,
            "length": length, "ref_image_size": "match",
        }
        for i, name in enumerate(ref_image_names[:3]):
            key = f"ref_img_{i}"
            wf[key] = {"class_type": "LoadImage", "inputs": {"image": name}}
            h3_inputs[f"ref_images.ref_image_{i}"] = [key, 0]
        wf["h3"] = {"class_type": "MiniMaxH3ReferenceToVideo", "inputs": h3_inputs}
        wf.update(self._build_sampler_chain("h3", "turbo", seed, steps))
        return wf

    def _run(self, workflow: dict) -> bytes:
        prompt_id = self._post_workflow(workflow)
        history = self._poll_history(prompt_id)
        return self._read_output_video(history)

    # ── HTTP endpoints ──────────────────────────────────────────────────

    def _auto_dims(self, request: dict) -> tuple:
        """Width/height from request, else detect from the first input image.

        Keeps portrait Klein frames portrait (no force-crop to 16:9).
        Rounds to multiples of 16 and caps the long edge at 1280 (VRAM headroom
        on A100-80GB with the 21GB int8 DiT + 16GB text encoder).
        """
        try:
            w = int(request.get("width", 0))
            h = int(request.get("height", 0))
        except (TypeError, ValueError):
            w = h = 0
        if w > 0 and h > 0:
            return w, h
        from PIL import Image
        b64 = (request.get("image_base64") or
               (request.get("reference_images_base64") or [""])[0])
        try:
            import io
            with Image.open(io.BytesIO(base64.b64decode(b64))) as img:
                w, h = img.size
        except Exception:
            w, h = 864, 480
        scale = min(1.0, 1280 / max(w, h))
        w = max(256, int(round(w * scale / 16.0)) * 16)
        h = max(256, int(round(h * scale / 16.0)) * 16)
        return w, h

    @modal.fastapi_endpoint(method="POST", label="h3-animate")
    def animate(self, request: dict) -> bytes:
        """I2V: Klein-locked still frame → video. Prompt = motion only."""
        from fastapi.responses import Response

        prompt = (request.get("prompt") or "").strip()
        image_b64 = (request.get("image_base64") or "").strip()
        if not prompt or not image_b64:
            from fastapi.responses import JSONResponse
            return JSONResponse({"error": "prompt and image_base64 required"}, status_code=400)

        duration = min(max(float(request.get("duration", 5.0)), 1.0), 15.0)
        width, height = self._auto_dims(request)
        steps = min(max(int(request.get("steps", 8)), 4), 30)
        seed = int(request.get("seed") or uuid.uuid4().int % (2**48))

        image_name = self._save_input_image(image_b64, f"h3_i2v_{uuid.uuid4().hex[:12]}.png")
        wf = self.build_i2v_workflow(
            prompt, image_name, width, height, frame_length(duration), seed, steps)
        video = self._run(wf)
        return Response(
            content=video,
            media_type="video/mp4",
            headers={"X-H3-Seed": str(seed), "X-H3-Steps": str(steps)},
        )

    @modal.fastapi_endpoint(method="POST", label="h3-animate-ref")
    def animate_ref(self, request: dict) -> bytes:
        """R2V: reference images (Holly's identity set) → video."""
        from fastapi.responses import Response, JSONResponse

        prompt = (request.get("prompt") or "").strip()
        refs = request.get("reference_images_base64") or []
        if not prompt or not isinstance(refs, list) or len(refs) == 0:
            return JSONResponse(
                {"error": "prompt and reference_images_base64 (1-3 images) required"},
                status_code=400)

        duration = min(max(float(request.get("duration", 5.0)), 1.0), 15.0)
        width, height = self._auto_dims(request)
        steps = min(max(int(request.get("steps", 4)), 4), 30)
        seed = int(request.get("seed") or uuid.uuid4().int % (2**48))

        names = [
            self._save_input_image(b, f"h3_ref_{uuid.uuid4().hex[:12]}.png")
            for b in refs[:3]
        ]
        wf = self.build_r2v_workflow(
            prompt, names, width, height, frame_length(duration), seed, steps)
        video = self._run(wf)
        return Response(
            content=video,
            media_type="video/mp4",
            headers={"X-H3-Seed": str(seed), "X-H3-Steps": str(steps)},
        )

    @modal.fastapi_endpoint(method="GET", label="h3-video-health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status": "healthy",
            "model": "MiniMax H3 (Comfy-Org pruned int8 + turbo LoRA)",
            "modes": "I2V (h3-animate) + R2V (h3-animate-ref)",
            "gpu": "A100-80GB",
            "license": "MiniMax H3 Community License (deployer: Canada)",
            "length_rule": "duration*24fps, adjusted so length % 17 == 5",
            "version": "1.0.0 (Phase D1)",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/video_generate_h3.py")
    print("  (deploy to iamdoregosteve workspace)")
    print("I2V:    https://iamdoregosteve--h3-animate.modal.run")
    print("R2V:    https://iamdoregosteve--h3-animate-ref.modal.run")
    print("Health: https://iamdoregosteve--h3-video-health.modal.run")
