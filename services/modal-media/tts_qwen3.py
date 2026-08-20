"""TTS BAKE-OFF — Qwen3-TTS 1.7B CustomVoice (Apache-2.0, instruct-style emotion).

Temporary trial service. NOT wired into Holly. Endpoints:
  POST /tts  {"text": ..., "speaker": "Vivian", "instruct": "playful, flirty..."}
  POST /design  {"text": ..., "description": "young playful female voice..."}
           → audio/wav

Deploy: modal deploy services/modal-media/tts_bakeoff_qwen3.py
"""

import modal

app = modal.App("holly-tts-qwen3")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install("qwen-tts", "fastapi[standard]")
)


@app.cls(image=image, gpu="L4", timeout=900, scaledown_window=300, max_containers=1)
class Qwen3TTS:
    @modal.enter()
    def load(self):
        import torch
        from qwen_tts import Qwen3TTSModel

        print("─── loading Qwen3-TTS 1.7B CustomVoice ───")
        self.model_custom = Qwen3TTSModel.from_pretrained(
            "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
            device_map="cuda:0",
            dtype=torch.bfloat16,
        )
        print("─── Qwen3-TTS ready ───")

    @modal.fastapi_endpoint(method="POST", label="tts-qwen3")
    def tts(self, request: dict) -> bytes:
        import io
        import wave

        import numpy as np
        from fastapi.responses import JSONResponse, Response

        text = (request.get("text") or "").strip()
        if not text:
            return JSONResponse({"error": "text required"}, status_code=400)
        speaker = request.get("speaker") or "Vivian"
        instruct = request.get("instruct") or "Very happy and playful."

        wavs, sr = self.model_custom.generate_custom_voice(
            text=text,
            language="English",
            speaker=speaker,
            instruct=instruct,
        )
        audio = (np.asarray(wavs[0]).squeeze() * 32767).astype("int16").tobytes()
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(int(sr))
            wf.writeframes(audio)
        return Response(
            content=buf.getvalue(),
            media_type="audio/wav",
            headers={"X-Speaker": speaker, "X-SampleRate": str(int(sr))},
        )

    @modal.fastapi_endpoint(method="GET", label="tts-qwen3-warmup")
    def warmup(self) -> dict:
        """GET wakes the container (loads the model via @modal.enter) without
        running a synthesis. Called fire-and-forget by the chat route on each
        user message so the speaker button hits a WARM container (~5-15s synth
        instead of ~40s cold start + Magpie fallback). Container still scales
        to zero after scaledown_window=300 — no 24/7 GPU burn."""
        return {"ok": True, "model": "Qwen3-TTS-12Hz-1.7B-CustomVoice", "speaker": "Vivian"}
