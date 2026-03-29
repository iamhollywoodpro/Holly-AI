#!/usr/bin/env python3
"""
HOLLY Maya1 TTS — Modal.com Deployment
Fixed for Modal SDK v1.x:
  - max_inputs moved inside @app.cls() — no separate @modal.concurrent stacking
  - torch pinned to cu124 (Modal infra is CUDA 12.4+)
  - startup_timeout=900 (model is 7B params, first download can take 5-10 min)
  - enable_memory_snapshot=True to cache loaded state between cold starts
  - snac quantizer API guarded with try/except for both old and new API

Deploy: modal deploy modal_deploy.py
"""

import modal
import io
import os

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("holly-maya1-tts")

# ─── Docker Image ─────────────────────────────────────────────────────────────
# Use cu124 wheels — Modal infrastructure runs CUDA 12.4+
# Pinning torch==2.3.1+cu121 was causing container crashes on Modal's current fleet

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch>=2.4.0",
        "torchaudio>=2.4.0",
        "transformers>=4.44.0",
        "accelerate>=0.34.0",
        "snac",
        "soundfile",
        "numpy",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub>=0.24.0",
        "hf_transfer",
        "safetensors",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124"
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "HF_HUB_DISABLE_PROGRESS_BARS": "1",
        "TOKENIZERS_PARALLELISM": "false",
    })
)

# ─── Persistent volume for model weights ──────────────────────────────────────

model_volume = modal.Volume.from_name("holly-maya1-weights", create_if_missing=True)
MODEL_CACHE_DIR = "/models"

# ─── HOLLY's Voice Profile ────────────────────────────────────────────────────

HOLLY_VOICE_DESCRIPTION = (
    "Female voice in her 30s with an American accent. "
    "Confident, intelligent, warm tone with clear diction. "
    "Professional yet friendly, conversational pacing with emotional depth."
)

# ─── Maya1 Token Constants ────────────────────────────────────────────────────

CODE_START_TOKEN_ID   = 128257
CODE_END_TOKEN_ID     = 128258
CODE_TOKEN_OFFSET     = 128266
SNAC_MIN_ID           = 128266
SNAC_MAX_ID           = 156937
SNAC_TOKENS_PER_FRAME = 7
SOH_ID                = 128259
EOH_ID                = 128260
SOA_ID                = 128261
TEXT_EOT_ID           = 128009


# ─── Model download step (runs during image build, caches to volume) ──────────

def _download_models():
    """Pre-download Maya1 and SNAC to the persistent volume."""
    from huggingface_hub import snapshot_download
    import os

    maya1_dir = f"{MODEL_CACHE_DIR}/maya1"
    snac_dir  = f"{MODEL_CACHE_DIR}/snac_24khz"

    if not os.path.exists(f"{maya1_dir}/config.json"):
        print("📦 Downloading maya-research/maya1 weights...")
        snapshot_download(
            repo_id="maya-research/maya1",
            local_dir=maya1_dir,
            ignore_patterns=["*.msgpack", "*.h5", "flax_model*"],
        )
        print("✅ Maya1 weights cached.")

    if not os.path.exists(f"{snac_dir}/config.json"):
        print("📦 Downloading hubertsiuzdak/snac_24khz...")
        snapshot_download(
            repo_id="hubertsiuzdak/snac_24khz",
            local_dir=snac_dir,
        )
        print("✅ SNAC weights cached.")


# ─── Modal Class ──────────────────────────────────────────────────────────────
# KEY FIX: In Modal v1.x:
#   - max_inputs goes directly in @app.cls(), NOT as a separate @modal.concurrent
#   - startup_timeout must cover full cold-start model load (~5 min first time)
#   - enable_memory_snapshot caches the loaded model state for fast warm restarts

@app.cls(
    gpu="A10G",
    image=image,
    volumes={MODEL_CACHE_DIR: model_volume},
    timeout=300,                  # 5 min per request
    startup_timeout=900,          # 15 min for cold start (first model download)
    scaledown_window=300,         # keep warm 5 min after last request
    single_use_containers=True,   # serialize inference — replaces deprecated max_inputs=1
    enable_memory_snapshot=True,  # snapshot loaded model state → fast restarts
)
class HollyTTS:

    @modal.enter()
    def load_model(self):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from snac import SNAC

        print("🚀 Loading HOLLY's Maya1 voice model...")

        maya1_dir = f"{MODEL_CACHE_DIR}/maya1"
        snac_dir  = f"{MODEL_CACHE_DIR}/snac_24khz"

        # Download if not already in volume
        _download_models()
        model_volume.reload()  # ensure latest volume state is visible

        maya1_path = maya1_dir if os.path.exists(f"{maya1_dir}/config.json") else "maya-research/maya1"
        snac_path  = snac_dir  if os.path.exists(f"{snac_dir}/config.json")  else "hubertsiuzdak/snac_24khz"

        print(f"   Loading from: {maya1_path}")
        self.model = AutoModelForCausalLM.from_pretrained(
            maya1_path,
            dtype=torch.bfloat16,      # torch_dtype was deprecated in transformers >= 4.44
            device_map="auto",
            trust_remote_code=True,
            cache_dir=MODEL_CACHE_DIR,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(
            maya1_path,
            trust_remote_code=True,
            cache_dir=MODEL_CACHE_DIR,
        )
        print("   ✅ Maya1 LM loaded")

        print(f"   Loading SNAC from: {snac_path}")
        self.snac = SNAC.from_pretrained(snac_path, cache_dir=MODEL_CACHE_DIR).eval()
        self.snac = self.snac.cuda()
        print("   ✅ SNAC decoder loaded")

        self.device = "cuda"
        print("✨ HOLLY's voice ready!")

    # ── Prompt builder ────────────────────────────────────────────────────────

    def _build_prompt(self, description: str, text: str) -> str:
        soh = self.tokenizer.decode([SOH_ID])
        eoh = self.tokenizer.decode([EOH_ID])
        soa = self.tokenizer.decode([SOA_ID])
        sos = self.tokenizer.decode([CODE_START_TOKEN_ID])
        eot = self.tokenizer.decode([TEXT_EOT_ID])
        bos = self.tokenizer.bos_token or ""
        return soh + bos + f'<description="{description}"> {text}' + eot + eoh + soa + sos

    # ── SNAC helpers ──────────────────────────────────────────────────────────

    def _extract_snac(self, token_ids):
        try:
            eos = token_ids.index(CODE_END_TOKEN_ID)
        except ValueError:
            eos = len(token_ids)
        return [t for t in token_ids[:eos] if SNAC_MIN_ID <= t <= SNAC_MAX_ID]

    def _unpack_snac(self, tokens):
        if tokens and tokens[-1] == CODE_END_TOKEN_ID:
            tokens = tokens[:-1]
        frames = len(tokens) // SNAC_TOKENS_PER_FRAME
        tokens = tokens[:frames * SNAC_TOKENS_PER_FRAME]
        if frames == 0:
            return [[], [], []]
        l1, l2, l3 = [], [], []
        for i in range(frames):
            s = tokens[i * 7:(i + 1) * 7]
            l1.append((s[0] - CODE_TOKEN_OFFSET) % 4096)
            l2 += [(s[1] - CODE_TOKEN_OFFSET) % 4096, (s[4] - CODE_TOKEN_OFFSET) % 4096]
            l3 += [
                (s[2] - CODE_TOKEN_OFFSET) % 4096, (s[3] - CODE_TOKEN_OFFSET) % 4096,
                (s[5] - CODE_TOKEN_OFFSET) % 4096, (s[6] - CODE_TOKEN_OFFSET) % 4096,
            ]
        return [l1, l2, l3]

    def _decode_audio(self, levels):
        """Decode SNAC levels to audio — handles both old and new SNAC API."""
        import torch
        codes = [
            torch.tensor(l, dtype=torch.long, device=self.device).unsqueeze(0)
            for l in levels
        ]
        with torch.inference_mode():
            # SNAC API changed between versions:
            # Old (< 1.2): snac.quantizer.from_codes(codes) then snac.decoder(z_q)
            # New (>= 1.2): snac.decode(codes) directly
            try:
                audio = self.snac.decode(codes)            # new API
                return audio[0, 0].cpu().numpy()
            except (AttributeError, TypeError):
                z_q = self.snac.quantizer.from_codes(codes)  # old API
                audio = self.snac.decoder(z_q)
                return audio[0, 0].cpu().numpy()

    # ── Core generation ───────────────────────────────────────────────────────

    def _generate(self, text: str, description: str, temperature: float = 0.4, top_p: float = 0.9):
        import torch
        prompt = self._build_prompt(description, text)
        inputs = self.tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.inference_mode():
            out = self.model.generate(
                **inputs,
                max_new_tokens=2048,
                min_new_tokens=28,
                temperature=temperature,
                top_p=top_p,
                repetition_penalty=1.1,
                do_sample=True,
                eos_token_id=CODE_END_TOKEN_ID,
                pad_token_id=self.tokenizer.pad_token_id or self.tokenizer.eos_token_id,
            )

        ids    = out[0, inputs['input_ids'].shape[1]:].tolist()
        snac   = self._extract_snac(ids)

        if len(snac) < 7:
            raise ValueError(f"Not enough SNAC tokens generated: {len(snac)} (need ≥ 7)")

        levels = self._unpack_snac(snac)
        audio  = self._decode_audio(levels)

        # Trim startup artifact
        return audio[2048:] if len(audio) > 2048 else audio

    # ── Endpoints ─────────────────────────────────────────────────────────────

    @modal.fastapi_endpoint(method="POST", label="generate")
    def generate(self, request: dict):
        import soundfile as sf
        from fastapi.responses import Response

        text        = (request.get("text") or "").strip()
        description = request.get("description") or HOLLY_VOICE_DESCRIPTION
        temperature = float(request.get("temperature", 0.4))
        top_p       = float(request.get("top_p", 0.9))

        if not text:
            return Response(
                content=b'{"error":"text is required"}',
                media_type="application/json",
                status_code=400,
            )
        if len(text) > 5000:
            return Response(
                content=b'{"error":"text too long (max 5000 chars)"}',
                media_type="application/json",
                status_code=400,
            )

        print(f"🎤 Generating: {text[:80]}{'...' if len(text) > 80 else ''}")
        audio    = self._generate(text, description, temperature, top_p)
        buf      = io.BytesIO()
        sf.write(buf, audio, 24000, format="WAV")
        wav      = buf.getvalue()
        duration = len(audio) / 24000
        print(f"✅ {duration:.2f}s audio, {len(wav):,} bytes")

        return Response(
            content=wav,
            media_type="audio/wav",
            headers={
                "Content-Disposition":          "inline; filename=holly.wav",
                "X-Duration-Seconds":           str(round(duration, 2)),
                "X-Sample-Rate":                "24000",
                "X-Model":                      "maya-research/maya1",
                "Access-Control-Allow-Origin":  "*",
            },
        )

    @modal.fastapi_endpoint(method="GET", label="health")
    def health(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status":   "healthy",
            "model":    "maya-research/maya1",
            "voice":    "HOLLY",
            "device":   self.device,
            "version":  "2.0.0",
        })

    @modal.fastapi_endpoint(method="GET", label="voices")
    def voices(self):
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "voice":        "HOLLY",
            "description":  HOLLY_VOICE_DESCRIPTION,
            "model":        "maya-research/maya1",
            "sample_rate":  24000,
            "license":      "Apache 2.0",
            "emotions": [
                "<laugh>", "<laugh_harder>", "<chuckle>", "<giggle>",
                "<whisper>", "<sigh>", "<gasp>", "<cry>", "<angry>",
                "<excited>", "<snort>", "<scream>",
            ],
        })


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import subprocess, sys
    print("🚀 Deploying HOLLY Maya1 TTS to Modal.com (v2.0 — fixed for Modal SDK v1.x)...")
    result = subprocess.run(
        [sys.executable, "-m", "modal", "deploy", __file__],
        capture_output=False,
    )
    sys.exit(result.returncode)
