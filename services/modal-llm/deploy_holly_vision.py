"""
HOLLY Vision — Huihui-MiniCPM-V-4.6-Thinking-abliterated

Holly's UNCENSORED multimodal vision fallback. Sits behind brain-v35 in the
vision cascade. When brain-v35's container is cold or down, this endpoint
takes over image understanding duties — fully uncensored (abliterated).

WHY THIS MODEL:
  - MiniCPM-V 4.6 is natively multimodal (text + image)
  - huihui-ai's abliteration removes the RLHF refusals WITHOUT breaking
    vision capability (rank-1 orthogonal projection, same technique as
    DuoNeural/Qwen3-8B-Abliterated that powers our text brain)
  - ~1B params → fits on T4 with room to spare
  - GGUF available → runs on llama.cpp (same stack as brain-v35)
  - Zero providers host this abliterated variant → must self-host

COST (iamhollywoodpro workspace, $30/month target):
  - T4 GPU: $0.000164/sec
  - Cold start: ~30-60s (downloads GGUF first time, cached after)
  - Warm response: ~2-5s for typical image+question
  - Scale-to-zero after 5 min idle
  - Estimated: ~$3-5/month (only fires when brain-v35 is unreachable)

USAGE:
  modal deploy services/modal-llm/deploy_holly_vision.py
  curl https://iamhollywoodpro--vision-chat.modal.run \\
    -H "Content-Type: application/json" \\
    -d '{
      "messages": [{
        "role": "user",
        "content": [
          {"type": "text", "text": "Describe this image"},
          {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
        ]
      }]
    }'
"""

import modal
import os
import subprocess
import time
import threading
from typing import Any

app = modal.App("holly-vision")

# Persistent volume — caches GGUF so cold starts after the first one are fast.
vol = modal.Volume.from_name("holly-vision", create_if_missing=True)
MODEL_DIR = "/models"

# ── Model spec ───────────────────────────────────────────────────────────────
# huihui-ai's abliterated MiniCPM-V 4.6 Thinking. Same abliteration technique
# as DuoNeural/Qwen3-8B-Abliterated (rank-1 orthogonal projection) applied to
# the multimodal MiniCPM-V 4.6 base. RLHF refusals removed, vision capability
# preserved.
HF_REPO = "huihui-ai/Huihui-MiniCPM-V-4.6-Thinking-abliterated"
GGUF_FILE = "Huihui-MiniCPM-V-4.6-Thinking-abliterated-Q4_K_M.gguf"
MMPROJ_FILE = "mmproj-Huihui-MiniCPM-V-4.6-Thinking-abliterated-f16.gguf"

# llama-server (from llama.cpp) binds here.
LLAMA_PORT = 8081  # 8080 is brain-v35; this endpoint uses 8081 to avoid clash
N_GPU_LAYERS = 999  # offload everything to GPU
CONTEXT_SIZE = 8192  # MiniCPM-V handles 8K image+text context easily


# ── Image: build llama.cpp once, cache forever ───────────────────────────────
# Same build recipe as brain-v35 — both endpoints share the llama.cpp build
# approach but live in separate Modal apps for independent scaling.
image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.0-devel-ubuntu22.04",
        add_python="3.11",
        setup_dockerfile_commands=[
            "RUN apt-get update && apt-get install -y --no-install-recommends "
            "git build-essential cmake curl ca-certificates "
            "&& rm -rf /var/lib/apt/lists/*",
        ],
    )
    .run_commands(
        # Symlink libcuda stub → libcuda.so.1 (same fix as brain-v35)
        "ln -sf /usr/local/cuda/lib64/stubs/libcuda.so /usr/lib/x86_64-linux-gnu/libcuda.so.1",
        # Clone + build llama.cpp with CUDA support
        "git clone --depth=1 https://github.com/ggerganov/llama.cpp /opt/llama.cpp",
        "cd /opt/llama.cpp && "
        "cmake -B build -DGGML_CUDA=ON -DLLAMA_CURL=ON -DLLAMA_SERVER_SSL=OFF "
        "-DCMAKE_CUDA_ARCHITECTURES=75 && "
        "cmake --build build --config Release -j --target llama-server",
    )
    .pip_install("huggingface_hub", "fastapi", "requests")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)


def _download_models() -> None:
    """Pull GGUF + mmproj from HF on first run; subsequent runs use the volume."""
    from huggingface_hub import hf_hub_download

    gguf_path = os.path.join(MODEL_DIR, GGUF_FILE)
    mmproj_path = os.path.join(MODEL_DIR, MMPROJ_FILE)

    if not os.path.exists(gguf_path):
        print(f"[holly-vision] Downloading {GGUF_FILE}...")
        hf_hub_download(
            repo_id=HF_REPO,
            filename=GGUF_FILE,
            local_dir=MODEL_DIR,
        )
        print(f"[holly-vision] ✅ GGUF cached")

    if not os.path.exists(mmproj_path):
        print(f"[holly-vision] Downloading {MMPROJ_FILE}...")
        hf_hub_download(
            repo_id=HF_REPO,
            filename=MMPROJ_FILE,
            local_dir=MODEL_DIR,
        )
        print(f"[holly-vision] ✅ mmproj cached")

    try:
        vol.commit()
    except Exception as e:
        print(f"[holly-vision] Volume commit warning: {e}")


def _wait_for_llama(timeout_s: int = 180) -> bool:
    """Block until llama-server responds to /health or timeout."""
    import requests

    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            r = requests.get(f"http://127.0.0.1:{LLAMA_PORT}/health", timeout=2)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


@app.cls(
    image=image,
    gpu="T4",
    volumes={MODEL_DIR: vol},
    timeout=600,
    memory=8192,
    max_containers=1,        # never spin up more than 1 GPU
    scaledown_window=300,    # 5 min idle → scale to zero
)
@modal.concurrent(max_inputs=4)
class HollyVision:
    """Holly's uncensored vision fallback — Huihui MiniCPM-V 4.6 abliterated."""

    @modal.enter()
    def boot(self):
        """Container startup: pull models if needed, then launch llama-server."""
        _download_models()

        gguf_path = os.path.join(MODEL_DIR, GGUF_FILE)
        mmproj_path = os.path.join(MODEL_DIR, MMPROJ_FILE)

        print(f"[holly-vision] Launching llama-server...")
        print(f"  model:  {gguf_path}")
        print(f"  vision: {mmproj_path}")
        print(f"  ctx:    {CONTEXT_SIZE}")
        print(f"  gpu:    T4 (offloading all {N_GPU_LAYERS} layers)")

        self.server_proc = subprocess.Popen(
            [
                "/opt/llama.cpp/build/bin/llama-server",
                "--model", gguf_path,
                "--mmproj", mmproj_path,
                "--port", str(LLAMA_PORT),
                "--host", "127.0.0.1",
                "--n-gpu-layers", str(N_GPU_LAYERS),
                "--ctx-size", str(CONTEXT_SIZE),
                "--parallel", "4",
                "--cont-batching",
                "--metrics",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )

        threading.Thread(target=self._drain_stdout, daemon=True).start()

        if not _wait_for_llama(timeout_s=180):
            raise RuntimeError(
                "llama-server failed to become healthy within 180s — "
                "check container logs for build/runtime errors"
            )

        print("[holly-vision] ✅ Ready — accepting requests")

    def _drain_stdout(self):
        """Forward llama-server output to container logs."""
        assert self.server_proc.stdout is not None
        for line in iter(self.server_proc.stdout.readline, b""):
            try:
                print(f"[llama-server] {line.decode().rstrip()}", flush=True)
            except Exception:
                pass

    @modal.fastapi_endpoint(method="POST", label="vision-chat")
    def chat(self, request: dict) -> dict:
        """
        OpenAI-compatible chat completions with vision support.
        Forward request body to local llama-server /v1/chat/completions.
        Supports messages with image_url content blocks (data: URLs).
        """
        import requests as _requests
        from fastapi import HTTPException

        try:
            resp = _requests.post(
                f"http://127.0.0.1:{LLAMA_PORT}/v1/chat/completions",
                json=request,
                timeout=120,
            )
        except _requests.exceptions.Timeout:
            raise HTTPException(
                status_code=504,
                detail={"error": "llama-server timeout (120s)", "type": "timeout"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail={"error": str(e), "type": "internal_error"},
            )

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=resp.json(),
            )
        # Plain dict return — Modal's fastapi_endpoint serializes to JSON.
        # Do NOT wrap in JSONResponse: Modal returns the OpenAPI schema
        # description instead of actual data when you do.
        return resp.json()

    @modal.fastapi_endpoint(method="GET", label="vision-health")
    def health(self) -> dict:
        """Health check — returns model info if ready."""
        alive = (
            hasattr(self, "server_proc")
            and self.server_proc.poll() is None
        )
        return {
            "status": "healthy" if alive else "degraded",
            "model": HF_REPO,
            "quant": "Q4_K_M",
            "multimodal": True,
            "abliterated": True,
            "context_window": CONTEXT_SIZE,
            "serverless": True,
            "max_containers": 1,
            "scaledown_window": 300,
            "deployed_at": "2026-06-30",
            "version": "v1.0",
            "role": "vision-fallback",
            "primary": "holly-brain-v35",
        }

    @modal.fastapi_endpoint(method="GET", label="vision-info")
    def info(self) -> dict:
        """API info / metadata."""
        return {
            "name": "HOLLY Vision",
            "model": HF_REPO,
            "description": "Holly's uncensored vision fallback — abliterated MiniCPM-V 4.6",
            "endpoints": {
                "chat": "/vision-chat",
                "health": "/vision-health",
                "info": "/vision-info",
            },
            "notes": [
                "GGUF + llama.cpp server (model is GGUF-only on HF)",
                "Q4_K_M quantization",
                "All layers offloaded to T4 GPU",
                "Vision encoder (mmproj) loaded for image inputs",
                "Abliterated — no RLHF refusals on NSFW image content",
            ],
        }


@app.local_entrypoint()
def main(action: str = "deploy"):
    if action == "deploy":
        print("🚀 Deploying Holly Vision (MiniCPM-V abliterated)...")
        print("Run: modal deploy services/modal-llm/deploy_holly_vision.py")
    elif action == "test":
        print("Testing Holly Vision...")
        result = HollyVision().health.remote()
        print(f"Health: {result}")
    elif action == "health":
        result = HollyVision().health.remote()
        print(f"Health: {result}")
    else:
        print(f"Usage: modal run deploy_holly_vision.py --action [deploy|test|health]")
