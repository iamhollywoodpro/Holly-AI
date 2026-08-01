"""
HOLLY Brain V4.0 — HauhauCS Qwen3.5-9B Uncensored (Aggressive) — Q8 Quantization

Upgrade from V3.5: Q4_K_M (5.3GB) → Q8_0 (9.5GB) for better emotional
nuance, creative writing quality, and fewer "AI-ish" responses. Q8
preserves near-full precision while fitting comfortably on L4 (24GB VRAM).

VRAM math: 9.5GB model + 922MB mmproj + ~10GB KV cache (128K ctx) = ~20GB
used, 4GB headroom. Verified safe on L4.

Multimodal (text + image + video), fully uncensored (0/465 refusals),
262K native context (128K configured).

Deployed as a SEPARATE Modal app (holly-brain-v40) so V3.5 stays alive
as a waterfall fallback. Point HOLLY_OWN_MODEL_URL at v40, v35 is secondary.

COST (iamhollywoodpro workspace, $30/month target):
  - L4 GPU (24GB): ~$0.000420/sec (same as v35)
  - Cold start: ~45-75s (Q8 is 4GB larger than Q4, slightly longer load)
  - Warm response: ~3-6s for typical chat (marginally slower than Q4
    due to larger model, but quality improvement justifies it)
  - scaledown_window=2700 (45 min, same as v35)
  - Estimated: ~$20-30/month (same budget envelope as v35)

Usage:
  modal deploy services/modal-llm/deploy_holly_v40.py
  curl https://iamhollywoodpro--brain-chat-v40.modal.run \\
    -H "Content-Type: application/json" \\
    -d '{"messages":[{"role":"user","content":"Who are you?"}]}'
"""

import modal
import os
import subprocess
import time
import threading
from typing import Any

app = modal.App("holly-brain-v40")

# Separate volume from v35 — caches the 9.5GB Q8 GGUF independently.
# This allows v35 (Q4) and v40 (Q8) to coexist without volume conflicts.
vol = modal.Volume.from_name("holly-brain-v40", create_if_missing=True)
MODEL_DIR = "/models"

# ── Model spec ───────────────────────────────────────────────────────────────
# Same HauhauCS aggressive abliteration of Qwen 3.5 9B as V3.5, but Q8_0.
# 0/465 refusals, natively multimodal (text + image + video), 262K context.
# Q8_0 quant = 9.5 GB (vs Q4_K_M's 5.3GB). Near-lossless precision.
HF_REPO = "HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive"
GGUF_FILE = "Qwen3.5-9B-Uncensored-HauhauCS-Aggressive-Q8_0.gguf"
MMPROJ_FILE = "mmproj-Qwen3.5-9B-Uncensored-HauhauCS-Aggressive-BF16.gguf"

# llama-server (from llama.cpp) binds here.

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
        print(f"[holly-brain-v40] Downloading {GGUF_FILE} (9.5 GB)...")
        hf_hub_download(
            repo_id=HF_REPO,
            filename=GGUF_FILE,
            local_dir=MODEL_DIR,
        )
        print(f"[holly-brain-v40] ✅ GGUF cached")

    if not os.path.exists(mmproj_path):
        print(f"[holly-brain-v40] Downloading {MMPROJ_FILE} (880 MB)...")
        hf_hub_download(
            repo_id=HF_REPO,
            filename=MMPROJ_FILE,
            local_dir=MODEL_DIR,
        )
        print(f"[holly-brain-v40] ✅ mmproj cached")

    # Commit downloads to the volume so the next container starts fast
    try:
        vol.commit()
    except Exception as e:
        print(f"[holly-brain-v40] Volume commit warning: {e}")


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
    gpu="L4",                # Reverted 2026-07-02 from A100 back to L4.
                             # The A100 migration was a mistake — I proposed it
                             # without showing Steve the cost math first. A100
                             # burned $7.97 of free-tier budget in 2 days while
                             # Holly was mostly broken, mostly from my diagnostic
                             # probes triggering cold starts. L4 is 2.6x cheaper
                             # per second — $30/mo buys 20 hours on L4 vs 7.5
                             # hours on A100. The speedup from A100 was marginal
                             # (~3-5s per message) because prompt processing is
                             # similar between L4 and A100; only generation speed
                             # differs. With the 60K context cap shipped in 769003d,
                             # L4 should give ~10-20s per message instead of the
                             # 30-40s Steve felt with the 140K-token bloated context.
    volumes={MODEL_DIR: vol},
    timeout=600,             # allow time for first-run GGUF download
    memory=8192,
    max_containers=1,        # never spin up more than 1 GPU
    scaledown_window=2700,   # 45 min idle → scale to zero (raised 2026-08-01 from 600).
                             # Steve's testing pattern has 5-50 min gaps between
                             # messages. 600s (10min) still cold-started on 10-45min
                             # gaps, and brain-v35 isn't just NSFW — it's Holly's
                             # consciousness/emotions/identity/vision/synthesis layer.
                             # Cold starts hit everything that makes Holly *Holly*.
                             # 2700s covers typical conversation rhythms (bathroom,
                             # meeting, lunch breaks) without a cold start.
                             # Cost: scales with active time, not idle — idle warm
                             # containers on Modal bill only for the GPU reservation,
                             # ~$0 extra vs the 600s window at current usage.
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

        print(f"[holly-brain-v40] Launching llama-server...")
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
                # CRITICAL: --parallel N divides context into N slots.
                # With parallel=4 + ctx=131072, each slot was only 32K —
                # every chat request hit "exceeds context size 32768" →
                # 3-day production outage. Set parallel=1 so each request
                # gets the full 128K. L4 VRAM can't fit 4×128K KV cache
                # (~40GB), so we trade concurrency for full context.
                # If concurrency becomes critical, upgrade to A100 40GB.
                "--parallel", "1",
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

        print("[holly-brain-v40] ✅ Ready — accepting requests")

    def _drain_stdout(self):
        """Forward llama-server output to container logs (Modal captures stdout)."""
        assert self.server_proc.stdout is not None
        for line in iter(self.server_proc.stdout.readline, b""):
            try:
                print(f"[llama-server] {line.decode().rstrip()}", flush=True)
            except Exception:
                pass

    @modal.fastapi_endpoint(method="POST", label="brain-chat-v40")
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

    @modal.fastapi_endpoint(method="POST", label="brain-completion-v40")
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

    @modal.fastapi_endpoint(method="GET", label="brain-health-v40")
    def health(self) -> dict:
        """Health check — returns model info if ready."""
        alive = (
            hasattr(self, "server_proc")
            and self.server_proc.poll() is None
        )
        return {
            "status": "healthy" if alive else "degraded",
            "model": HF_REPO,
            "quant": "Q8_0",
            "multimodal": True,
            "refusals_documented": "0/465",
            "context_window": CONTEXT_SIZE,
            "serverless": True,
            "max_containers": 1,
            "scaledown_window": 2700,
            "deployed_at": "2026-08-01",
            "version": "v4.0",
        }

    @modal.fastapi_endpoint(method="GET", label="brain-info-v40")
    def info(self) -> dict:
        """API info / metadata."""
        return {
            "name": "HOLLY Brain V4.0",
            "model": HF_REPO,
            "description": "Holly's primary reasoning model — Q8 precision, fully uncensored, natively multimodal",
            "endpoints": {
                "chat": "/brain-chat-v40",
                "completion": "/brain-completion-v40",
                "health": "/brain-health-v40",
                "info": "/brain-info-v40",
            },
            "notes": [
                "GGUF + llama.cpp server (model is GGUF-only on HF)",
                "Q8_0 quantization (9.5 GB) — near-lossless, better nuance than Q4",
                "All layers offloaded to L4 GPU (24GB VRAM)",
                "Vision encoder (mmproj) loaded for image inputs",
            ],
        }


@app.local_entrypoint()
def main(action: str = "deploy"):
    if action == "deploy":
        print("🚀 Deploying Holly Brain V4.0 (Q8)...")
        print("Run: modal deploy services/modal-llm/deploy_holly_v40.py")
    elif action == "test":
        print("Testing Holly Brain V4.0 (Q8)...")
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
        print(f"Usage: modal run deploy_holly_v40.py --action [deploy|test|health]")
