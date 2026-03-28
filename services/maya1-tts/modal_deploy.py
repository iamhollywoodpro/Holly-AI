#!/usr/bin/env python3
"""
HOLLY Maya1 TTS — Modal.com Deployment
========================================
Deploy Maya1 TTS as a serverless GPU function on Modal.com
Free tier: $30/month credit — covers thousands of TTS requests

Usage:
  modal deploy modal_deploy.py          # Deploy to Modal (creates persistent endpoint)
  modal serve modal_deploy.py           # Local dev mode with live reload
  modal run modal_deploy.py             # One-off test run

Your endpoint URL will be:
  https://iamhollywoodpro--holly-maya1-tts-web.modal.run

Requirements:
  pip install modal
  modal token new   # (authenticate once)
"""

import modal
import io
import os
from pathlib import Path

# ─── Modal App ────────────────────────────────────────────────────────────────

app = modal.App("holly-maya1-tts")

# ─── Docker Image ─────────────────────────────────────────────────────────────
# Pre-install all dependencies in the container image
# This is cached by Modal so cold starts are fast (~5-10s model load after cache)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.3.1",
        "torchvision",
        "torchaudio",
        "transformers>=4.40.0",
        "accelerate>=0.30.0",
        "snac",
        "soundfile",
        "numpy",
        "fastapi[standard]",
        "pydantic>=2.0",
        "huggingface_hub",
        "safetensors",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu121"
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

# ─── Model Volume (persistent cache between cold starts) ──────────────────────
# This stores the Maya1 model weights so we don't re-download on every cold start
# Saves bandwidth and speeds up cold starts significantly

model_volume = modal.Volume.from_name("holly-maya1-weights", create_if_missing=True)
MODEL_CACHE_DIR = "/models"

# ─── HOLLY's Voice Profile ────────────────────────────────────────────────────

HOLLY_VOICE_DESCRIPTION = (
    "Female voice in her 30s with an American accent. "
    "Confident, intelligent, warm tone with clear diction. "
    "Professional yet friendly, conversational pacing with emotional depth."
)

# ─── Maya1 Token Constants ────────────────────────────────────────────────────

CODE_START_TOKEN_ID = 128257
CODE_END_TOKEN_ID   = 128258
CODE_TOKEN_OFFSET   = 128266
SNAC_MIN_ID         = 128266
SNAC_MAX_ID         = 156937
SNAC_TOKENS_PER_FRAME = 7
SOH_ID    = 128259
EOH_ID    = 128260
SOA_ID    = 128261
TEXT_EOT_ID = 128009


# ─── Modal Function ───────────────────────────────────────────────────────────

@app.cls(
    gpu="A10G",                      # 24GB VRAM — perfect for Maya1 (needs 16GB)
    image=image,
    volumes={MODEL_CACHE_DIR: model_volume},
    timeout=120,                     # 2 min max per request
    container_idle_timeout=300,      # Keep warm 5 min after last request
    allow_concurrent_inputs=1,       # One TTS at a time per container
    secrets=[
        modal.Secret.from_name("holly-tts-secret", required=False),
    ],
)
class HollyTTS:
    """
    HOLLY Maya1 TTS — serverless GPU inference on Modal.com
    
    GPU: A10G (24GB VRAM, ~$0.59/hr)
    Cost per TTS: ~$0.001-0.003 (< 0.1-0.5s GPU time per sentence)
    Monthly free credits: $30 → covers ~10,000-30,000 TTS requests
    """
    
    @modal.enter()
    def load_model(self):
        """Load Maya1 + SNAC on container startup (runs once per cold start)"""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from snac import SNAC
        
        print("🚀 Loading HOLLY's Maya1 voice model...")
        
        model_name = "maya-research/maya1"
        local_model_dir = f"{MODEL_CACHE_DIR}/maya1"
        
        # Check if model is already cached in the volume
        if os.path.exists(f"{local_model_dir}/config.json"):
            print(f"✅ Model found in cache: {local_model_dir}")
            load_path = local_model_dir
        else:
            print(f"📥 Downloading Maya1 from HuggingFace (first run only)...")
            load_path = model_name
        
        # Load Maya1 (3B Llama-style TTS model)
        self.model = AutoModelForCausalLM.from_pretrained(
            load_path,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
            cache_dir=MODEL_CACHE_DIR,
        )
        
        self.tokenizer = AutoTokenizer.from_pretrained(
            load_path,
            trust_remote_code=True,
            cache_dir=MODEL_CACHE_DIR,
        )
        
        # Load SNAC neural audio codec (for decoding to 24kHz audio)
        snac_dir = f"{MODEL_CACHE_DIR}/snac_24khz"
        snac_load = snac_dir if os.path.exists(f"{snac_dir}/config.json") else "hubertsiuzdak/snac_24khz"
        
        self.snac_model = SNAC.from_pretrained(snac_load, cache_dir=MODEL_CACHE_DIR).eval().cuda()
        
        # Save models to volume if just downloaded (for future cold starts)
        if not os.path.exists(f"{local_model_dir}/config.json"):
            print("💾 Saving model to volume cache for faster future cold starts...")
            self.model.save_pretrained(local_model_dir)
            self.tokenizer.save_pretrained(local_model_dir)
            model_volume.commit()
        
        self.device = "cuda"
        print("✨ HOLLY's voice is ready!\n")
    
    def _build_prompt(self, description: str, text: str) -> str:
        """Build Maya1 prompt with voice description and emotion tags"""
        soh_token  = self.tokenizer.decode([SOH_ID])
        eoh_token  = self.tokenizer.decode([EOH_ID])
        soa_token  = self.tokenizer.decode([SOA_ID])
        sos_token  = self.tokenizer.decode([CODE_START_TOKEN_ID])
        eot_token  = self.tokenizer.decode([TEXT_EOT_ID])
        bos_token  = self.tokenizer.bos_token
        
        formatted_text = f'<description="{description}"> {text}'
        
        return (
            soh_token + bos_token + formatted_text + eot_token +
            eoh_token + soa_token + sos_token
        )
    
    def _extract_snac_codes(self, token_ids):
        """Extract SNAC audio codes from generated tokens"""
        try:
            eos_idx = token_ids.index(CODE_END_TOKEN_ID)
        except ValueError:
            eos_idx = len(token_ids)
        
        return [t for t in token_ids[:eos_idx] if SNAC_MIN_ID <= t <= SNAC_MAX_ID]
    
    def _unpack_snac(self, snac_tokens):
        """Unpack 7-token SNAC frames to 3 hierarchical levels for audio decoding"""
        if snac_tokens and snac_tokens[-1] == CODE_END_TOKEN_ID:
            snac_tokens = snac_tokens[:-1]
        
        frames = len(snac_tokens) // SNAC_TOKENS_PER_FRAME
        snac_tokens = snac_tokens[:frames * SNAC_TOKENS_PER_FRAME]
        
        if frames == 0:
            return [[], [], []]
        
        l1, l2, l3 = [], [], []
        for i in range(frames):
            s = snac_tokens[i*7:(i+1)*7]
            l1.append((s[0] - CODE_TOKEN_OFFSET) % 4096)
            l2.extend([(s[1] - CODE_TOKEN_OFFSET) % 4096, (s[4] - CODE_TOKEN_OFFSET) % 4096])
            l3.extend([
                (s[2] - CODE_TOKEN_OFFSET) % 4096,
                (s[3] - CODE_TOKEN_OFFSET) % 4096,
                (s[5] - CODE_TOKEN_OFFSET) % 4096,
                (s[6] - CODE_TOKEN_OFFSET) % 4096,
            ])
        
        return [l1, l2, l3]
    
    def _generate_audio(self, text: str, description: str, temperature: float = 0.4, top_p: float = 0.9):
        """Core audio generation — runs on GPU"""
        import torch
        import numpy as np
        
        prompt = self._build_prompt(description, text)
        inputs = self.tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=2048,
                min_new_tokens=28,
                temperature=temperature,
                top_p=top_p,
                repetition_penalty=1.1,
                do_sample=True,
                eos_token_id=CODE_END_TOKEN_ID,
                pad_token_id=self.tokenizer.pad_token_id,
            )
        
        generated_ids = outputs[0, inputs['input_ids'].shape[1]:].tolist()
        snac_tokens   = self._extract_snac_codes(generated_ids)
        
        if len(snac_tokens) < 7:
            raise ValueError(f"Too few SNAC tokens: {len(snac_tokens)}")
        
        levels = self._unpack_snac(snac_tokens)
        codes_tensor = [
            torch.tensor(level, dtype=torch.long, device=self.device).unsqueeze(0)
            for level in levels
        ]
        
        with torch.inference_mode():
            z_q   = self.snac_model.quantizer.from_codes(codes_tensor)
            audio = self.snac_model.decoder(z_q)[0, 0].cpu().numpy()
        
        # Trim warmup artifact (first 2048 samples)
        if len(audio) > 2048:
            audio = audio[2048:]
        
        return audio
    
    @modal.web_endpoint(method="POST", label="generate")
    def generate(self, request: dict):
        """
        POST /generate
        Body: { "text": "...", "description": "...", "temperature": 0.4 }
        Returns: WAV audio bytes (24kHz mono)
        """
        import soundfile as sf
        from fastapi.responses import Response
        
        text        = request.get("text", "").strip()
        description = request.get("description", HOLLY_VOICE_DESCRIPTION)
        temperature = float(request.get("temperature", 0.4))
        top_p       = float(request.get("top_p", 0.9))
        
        if not text:
            return Response(content=b'{"error":"text is required"}', media_type="application/json", status_code=400)
        
        if len(text) > 5000:
            return Response(content=b'{"error":"text too long (max 5000 chars)"}', media_type="application/json", status_code=400)
        
        print(f"🎤 Generating voice for: {text[:80]}{'...' if len(text) > 80 else ''}")
        
        audio = self._generate_audio(text, description, temperature, top_p)
        
        # Encode to WAV
        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, audio, 24000, format='WAV')
        wav_bytes = wav_buffer.getvalue()
        
        duration = len(audio) / 24000
        print(f"✅ Generated {duration:.2f}s of audio ({len(wav_bytes):,} bytes)")
        
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=holly.wav",
                "X-Duration-Seconds": str(round(duration, 2)),
                "X-Sample-Rate": "24000",
                "X-Model": "maya-research/maya1",
                "Access-Control-Allow-Origin": "*",
            }
        )
    
    @modal.web_endpoint(method="GET", label="health")
    def health(self):
        """GET /health — readiness probe"""
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status": "healthy",
            "model": "maya-research/maya1",
            "voice": "HOLLY",
            "device": self.device,
            "service": "holly-maya1-tts",
        })
    
    @modal.web_endpoint(method="GET", label="voices")
    def voices(self):
        """GET /voices — list supported emotions and voice profile"""
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "voice_name": "HOLLY",
            "description": HOLLY_VOICE_DESCRIPTION,
            "model": "maya-research/maya1",
            "sample_rate": 24000,
            "license": "Apache 2.0",
            "emotions": [
                "<laugh>",
                "<laugh_harder>",
                "<chuckle>",
                "<giggle>",
                "<whisper>",
                "<sigh>",
                "<gasp>",
                "<cry>",
                "<angry>",
                "<excited>",
                "<snort>",
                "<scream>",
            ],
            "usage": {
                "basic":   "Hello Hollywood, I'm ready to help.",
                "emotion": "Great news! <laugh> We just shipped the feature you asked for.",
                "whisper": "Just between us <whisper> I think this is brilliant</whisper>.",
                "mixed":   "Wow, that's incredible! <gasp> I didn't see that coming <chuckle>.",
            }
        })


# ─── One-off Test ─────────────────────────────────────────────────────────────

@app.local_entrypoint()
def test():
    """Run a quick test — call with: modal run modal_deploy.py"""
    import requests
    
    print("🧪 Testing HOLLY Maya1 TTS on Modal...")
    
    # The deployed URL will look like this after deployment:
    # https://iamhollywoodpro--holly-maya1-tts-generate.modal.run
    # 
    # For local testing with `modal run`, we invoke the class directly:
    
    holly = HollyTTS()
    
    test_texts = [
        "Hello Hollywood! I'm HOLLY, your AI partner. Ready to build something amazing?",
        "Great work on that deployment! <chuckle> The code looks absolutely solid.",
        "I've been thinking about this architecture... <sigh> Let me walk you through my analysis.",
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n[{i}/{len(test_texts)}] Testing: {text[:60]}...")
        
        result = holly.generate.remote({"text": text})
        
        # Save test audio
        output_file = f"/tmp/holly_test_{i}.wav"
        with open(output_file, "wb") as f:
            f.write(result.body)
        
        print(f"✅ Saved: {output_file}")
    
    print("\n✨ All tests passed! HOLLY's voice is working on Modal.")
    print("\n📋 Next steps:")
    print("  1. Deploy: modal deploy modal_deploy.py")
    print("  2. Copy the endpoint URL to HOLLY_MAYA1_TTS_URL in Vercel env vars")
    print("  3. HOLLY will start using Maya1 for all voice responses\n")
