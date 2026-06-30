"""
HOLLY Brain V3.5 — HauhauCS Qwen3.5-9B Uncensored (Aggressive)

Holly's primary reasoning model. Multimodal (text + image + video),
fully uncensored (0/465 refusals), 262K context.

Deployed via llama.cpp server (the model ships GGUF-only on HF — see
FACT.md lesson on HauhauCS). OpenAI-compatible /v1/chat/completions.

REplaces the DuoNeural Qwen3-8B-Abliterated endpoint as Holly's primary.
The old endpoint (iamhollywoodpro--chat.modal.run) stays as backup.

COST (iamhollywoodpro workspace, $30/month target):
  - L4 GPU (24GB): ~$0.000420/sec (2.5x T4 cost — acceptable for unlimited context)
  - Cold start: ~30-60s (downloads GGUF first time, cached after)
  - Warm response: ~2-5s for typical chat
  - Scale-to-zero after 5 min idle
  - Estimated: ~$20-30/month for typical chat volume
  - Tradeoff: more expensive than T4 but enables 128K context (4x bigger)

Usage:
  modal deploy services/modal-llm/deploy_holly_v35.py
  curl https://iamhollywoodpro--brain-chat.modal.run \\
    -H "Content-Type: application/json" \\
    -d '{"messages":[{"role":"user","content":"Who are you?"}]}'
"""

import modal
import os
import subprocess
import time
import threading
from typing import Any

app = modal.App("holly-brain-v35")

# Persistent volume — caches the 5.3GB GGUF so cold starts after the first
# one are fast (volume reload vs. full HF download).
vol = modal.Volume.from_name("holly-brain-v35", create_if_missing=True)
MODEL_DIR = "/models"

# ── Model spec ───────────────────────────────────────────────────────────────
# HauhauCS aggressive abliteration of Qwen 3.5 9B.
# 0/465 refusals, natively multimodal (text + image + video), 262K context.
# Q4_K_M quant = 5.3 GB. Fits comfortably on L4 (24GB VRAM) with 128K context.
HF_REPO = "HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive"
GGUF_FILE = "Qwen3.5-9B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf"
MMPROJ_FILE = "mmproj-Qwen3.5-9B-Uncensored-HauhauCS-Aggressive-BF16.gguf"

# llama-server (from llama.cpp) binds here.
LLAMA_PORT = 8080
N_GPU_LAYERS = 999  # offload everything to GPU
# V3.6 (2026-06-30): Bumped 32K → 128K context. Qwen3.5 supports 262K natively;
# 128K fits L4 (24GB) with room for KV cache (~10GB at Q8) + model (5.3GB) +
# mmproj (880MB) = ~16GB used, 8GB headroom. This eliminates the context
# overflow crashes that were breaking Holly for any conversation with
# accumulated history. Steve's directive: Holly is unlimited forever —
# no more artificial walls.
CONTEXT_SIZE = 131072  # 128K context (within Qwen's 262K native limit)


# ── Image: build llama.cpp once, cache forever ───────────────────────────────
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
        # Symlink libcuda stub → libcuda.so.1 so the linker can resolve the
        # CUDA driver API at link time. The CUDA devel image ships stubs at
        # /usr/local/cuda/lib64/stubs/libcuda.so but ld wants libcuda.so.1
        # in the standard search path. At runtime, Modal's T4 host provides
        # the real libcuda.so.1 via the driver, so this is build-time only.
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
        print(f"[holly-brain-v35] Downloading {GGUF_FILE} (5.3 GB)...")
        hf_hub_download(
            repo_id=HF_REPO,
            filename=GGUF_FILE,
            local_dir=MODEL_DIR,
        )
        print(f"[holly-brain-v35] ✅ GGUF cached")

    if not os.path.exists(mmproj_path):
        print(f"[holly-brain-v35] Downloading {MMPROJ_FILE} (880 MB)...")
        hf_hub_download(
            repo_id=HF_REPO,
            filename=MMPROJ_FILE,
            local_dir=MODEL_DIR,
        )
        print(f"[holly-brain-v35] ✅ mmproj cached")

    # Commit downloads to the volume so the next container starts fast
    try:
        vol.commit()
    except Exception as e:
        print(f"[holly-brain-v35] Volume commit warning: {e}")


def _wait_for_llama(timeout_s: int = 120) -> bool:
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
    gpu="L4",
    volumes={MODEL_DIR: vol},
    timeout=600,             # allow time for first-run GGUF download
    memory=8192,
    max_containers=1,        # never spin up more than 1 GPU
    scaledown_window=300,    # 5 min idle → scale to zero
)
@modal.concurrent(max_inputs=4)
class HollyBrain:
    """Holly's primary reasoning model — HauhauCS Qwen3.5-9B Aggressive."""

    @modal.enter()
    def boot(self):
        """Container startup: pull models if needed, then launch llama-server."""
        _download_models()

        gguf_path = os.path.join(MODEL_DIR, GGUF_FILE)
        mmproj_path = os.path.join(MODEL_DIR, MMPROJ_FILE)

        print(f"[holly-brain-v35] Launching llama-server...")
        print(f"  model:  {gguf_path}")
        print(f"  vision: {mmproj_path}")
        print(f"  ctx:    {CONTEXT_SIZE}")
        print(f"  gpu:    L4 24GB (offloading all {N_GPU_LAYERS} layers)")

        # llama-server stays alive for the life of the container
        self.server_proc = subprocess.Popen(
            [
                "/opt/llama.cpp/build/bin/llama-server",
                "--model", gguf_path,
                "--mmproj", mmproj_path,
                "--port", str(LLAMA_PORT),
                "--host", "127.0.0.1",
                "--n-gpu-layers", str(N_GPU_LAYERS),
                "--ctx-size", str(CONTEXT_SIZE),
                "--parallel", "4",             # allow 4 concurrent requests
                "--cont-batching",
                "--metrics",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )

        # Background thread to drain llama-server stdout to Modal logs
        threading.Thread(target=self._drain_stdout, daemon=True).start()

        if not _wait_for_llama(timeout_s=180):
            raise RuntimeError(
                "llama-server failed to become healthy within 180s — "
                "check container logs for build/runtime errors"
            )

        print("[holly-brain-v35] ✅ Ready — accepting requests")

    def _drain_stdout(self):
        """Forward llama-server output to container logs (Modal captures stdout)."""
        assert self.server_proc.stdout is not None
        for line in iter(self.server_proc.stdout.readline, b""):
            try:
                print(f"[llama-server] {line.decode().rstrip()}", flush=True)
            except Exception:
                pass

    @modal.fastapi_endpoint(method="POST", label="brain-chat")
    def chat(self, request: dict) -> dict:
        """
        OpenAI-compatible chat completions.
        Forward request body to local llama-server /v1/chat/completions.
        Supports messages with image_url content blocks for vision.
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

    @modal.fastapi_endpoint(method="POST", label="brain-completion")
    def completion(self, request: dict) -> dict:
        """OpenAI-compatible /v1/completions (non-chat)."""
        import requests as _requests
        from fastapi import HTTPException

        resp = _requests.post(
            f"http://127.0.0.1:{LLAMA_PORT}/v1/completions",
            json=request,
            timeout=120,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.json())
        return resp.json()

    @modal.fastapi_endpoint(method="GET", label="brain-health")
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
            "refusals_documented": "0/465",
            "context_window": CONTEXT_SIZE,
            "serverless": True,
            "max_containers": 1,
            "scaledown_window": 300,
            "deployed_at": "2026-06-30",
            "version": "v3.5",
        }

    @modal.fastapi_endpoint(method="GET", label="brain-info")
    def info(self) -> dict:
        """API info / metadata."""
        return {
            "name": "HOLLY Brain V3.5",
            "model": HF_REPO,
            "description": "Holly's primary reasoning model — fully uncensored, natively multimodal",
            "endpoints": {
                "chat": "/brain-chat",
                "completion": "/brain-completion",
                "health": "/brain-health",
                "info": "/brain-info",
            },
            "notes": [
                "GGUF + llama.cpp server (model is GGUF-only on HF)",
                "Q4_K_M quantization (5.3 GB)",
                "All layers offloaded to L4 GPU (24GB VRAM)",
                "Vision encoder (mmproj) loaded for image inputs",
            ],
        }


@app.local_entrypoint()
def main(action: str = "deploy"):
    if action == "deploy":
        print("🚀 Deploying Holly Brain V3.5...")
        print("Run: modal deploy services/modal-llm/deploy_holly_v35.py")
    elif action == "test":
        print("Testing Holly Brain V3.5...")
        # Smoke test: simple chat
        result = HollyBrain().chat.remote({
            "messages": [
                {"role": "system", "content": "You are Holly, an AI partner."},
                {"role": "user", "content": "Say hello in one short sentence."},
            ],
            "max_tokens": 100,
            "temperature": 0.7,
        })
        print(f"Response: {result}")
    elif action == "health":
        result = HollyBrain().health.remote()
        print(f"Health: {result}")
    else:
        print(f"Usage: modal run deploy_holly_v35.py --action [deploy|test|health]")
