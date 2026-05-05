#!/usr/bin/env python3
"""
HOLLY VoxCPM2 TTS Service (Modal)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:  VoxCPM2 (OpenBMB, Apache-2.0) — 2B params, 48kHz, 30 languages
GPU:    NVIDIA A10G (24 GB VRAM) — ~8 GB model
Speed:  RTF ~0.3 on A10G (~3s for 10s audio)
Cost:   ~$0.000306/s | ~$0.001/request from $30/mo free credits
Free:   $30/mo -> ~30,000 TTS requests/mo

Features:
  - Voice Design: describe voice in natural language
  - 48kHz studio quality
  - Streaming support
  - 30 languages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import modal

app = modal.App("holly-voxcpm2-tts")

MODEL_CACHE = "/voxcpm2-model"


def download_model():
    from huggingface_hub import snapshot_download
    print("Downloading VoxCPM2 weights (2B params, ~8GB)...")
    snapshot_download(
        repo_id="openbmb/VoxCPM2",
        local_dir=MODEL_CACHE,
        ignore_patterns=["*.md", "*.txt"],
    )
    print("VoxCPM2 weights downloaded")


image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-devel-ubuntu22.04",
        add_python="3.11",
    )
    .apt_install("ffmpeg", "libsndfile1", "git")
    .env({"TORCHINDUCTOR_CUDAGRAPHS": "0",
          "TORCH_COMPILE_DISABLE": "1"})
    .pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "voxcpm",
        "soundfile",
        "numpy",
        "nvidia-cuda-runtime-cu12",
        "nvidia-cublas-cu12",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.25.0",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .run_function(download_model, timeout=1200)
)

@app.cls(
    image=image,
    gpu="A10G",
    max_containers=1,
    scaledown_window=30,
    timeout=120,
    startup_timeout=900,
)
class HollyVoxCPM2:

    @modal.enter()
    def load_model(self):
        from voxcpm import VoxCPM
        print(f"Loading VoxCPM2 from {MODEL_CACHE}...")
        self.model = VoxCPM.from_pretrained(
            MODEL_CACHE,
            load_denoiser=False,
        )
        print("VoxCPM2 loaded on A10G GPU — ready")

    @modal.fastapi_endpoint(method="POST", label="tts")
    def synthesize(self, request: dict):
        import torch
        import soundfile as sf
        import numpy as np
        import traceback
        from fastapi.responses import Response

        try:
            text = (request.get("text") or "").strip()
            voice_description = request.get("voice_description", "")
            style_guidance = request.get("style_guidance", "natural, warm, confident")
            sample_rate = request.get("sample_rate", 48000)

            if not text:
                return Response(
                    content=b'{"error":"text is required"}',
                    media_type="application/json",
                    status_code=400,
                )

            if voice_description:
                tts_text = f"({voice_description}){text}"
            else:
                tts_text = text

            print(f"Speaking: {tts_text[:100]}...")

            wav = self.model.generate(
                text=tts_text,
                cfg_value=2.0,
                inference_timesteps=10,
            )

            if isinstance(wav, np.ndarray):
                audio = wav
            else:
                audio = wav.cpu().numpy() if hasattr(wav, 'cpu') else np.array(wav)

            if audio.ndim > 1:
                audio = audio.squeeze()

            actual_sr = self.model.tts_model.sample_rate

            buf = io.BytesIO()
            sf.write(buf, audio, actual_sr, format="WAV")
            audio_bytes = buf.getvalue()

            print(f"TTS done: {len(text)} chars -> {len(audio_bytes):,} bytes WAV @ {actual_sr}Hz")

            return Response(
                content=audio_bytes,
                media_type="audio/wav",
                headers={
                    "X-Voice-Provider": "voxcpm2",
                    "X-Voice-Model": "VoxCPM2-2B",
                    "X-Sample-Rate": str(actual_sr),
                    "X-Licence": "Apache-2.0",
                    "Access-Control-Allow-Origin": "*",
                },
            )
        except Exception as e:
            tb = traceback.format_exc()
            print(f"TTS error: {tb}")
            return Response(
                content=f'{{"error":"{str(e)}","traceback":"{tb[:2000]}"}}'.encode(),
                media_type="application/json",
                status_code=500,
            )

    @modal.fastapi_endpoint(method="GET", label="tts-health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status": "healthy",
            "model": "openbmb/VoxCPM2",
            "gpu": "A10G",
            "params": "2B",
            "sample_rate": 48000,
            "languages": 30,
            "licence": "Apache-2.0",
            "cost": "~$0.001/request (A10G, ~3s)",
            "free_quota": "$30/mo -> ~30,000 TTS requests/mo FREE",
            "version": "1.1.0",
        })


@app.local_entrypoint()
def main():
    print("Deploy: modal deploy services/modal-media/voxcpm2_tts.py")
    print("TTS:    https://iamhollywoodpro--tts.modal.run")
    print("Health: https://iamhollywoodpro--tts-health.modal.run")
