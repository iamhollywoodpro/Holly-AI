"""
HOLLY Model Deployment — Serverless (Phase 7, v2)

Deploys Holly's fine-tuned model as a Modal web endpoint.
This is Holly's own API — serving her fine-tuned weights.

SERVERLESS DESIGN:
  - GPU only spins up when Holly actually needs to think
  - Scales to zero after 60 seconds of inactivity
  - max_containers=1 — never spins up more than 1 GPU
  - Cold start ~30-60s (loads Qwen3-8B + LoRA adapter from volume)
  - Warm response ~2-5s

BUDGET IMPACT:
  - Old: $29/month (T4 running 24/7 doing nothing)
  - New: ~$5-10/month (only runs when Holly speaks)
  - Savings: ~$20/month freed for TTS or other services

Usage:
  modal deploy services/fine-tuning/deploy_holly.py
"""

import modal
import json
import os
from datetime import datetime

app = modal.App("holly-api")

vol = modal.Volume.from_name("holly-models", create_if_missing=True)
MODEL_DIR = "/models"

# Same image that worked for fine-tuning
inference_image = (
    modal.Image.from_registry(
        "pytorch/pytorch:2.1.0-cuda12.1-cudnn8-devel",
        setup_dockerfile_commands=[
            "RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*",
        ],
    )
    .pip_install(
        "transformers>=4.40.0",
        "peft>=0.10.0",
        "accelerate>=0.27.0",
        "bitsandbytes>=0.43.0",
        "scipy",
        "sentencepiece",
        "fastapi",
    )
)

BASE_MODEL = "DuoNeural/Qwen3-8B-Abliterated"


@app.cls(
    image=inference_image,
    gpu="T4",
    volumes={MODEL_DIR: vol},
    timeout=300,
    memory=16384,
    max_containers=1,           # ⚠️ NEVER spin up more than 1 GPU
    scaledown_window=60,        # Scale to zero after 60s of no requests
)
@modal.concurrent(max_inputs=4)
class HollyModel:
    """Holly's fine-tuned model served as a serverless API."""

    @modal.enter()
    def load_model(self):
        """Load model and LoRA adapter on container start."""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        from peft import PeftModel

        print("[HollyAPI] Loading model...")

        # Find latest adapter
        try:
            vol.reload()
        except Exception:
            pass

        adapter_path = None
        if os.path.exists(MODEL_DIR):
            adapters = sorted([
                d for d in os.listdir(MODEL_DIR)
                if d.startswith("holly-lora-") and os.path.isdir(os.path.join(MODEL_DIR, d))
            ], reverse=True)
            if adapters:
                adapter_path = os.path.join(MODEL_DIR, adapters[0])
                print(f"[HollyAPI] Using adapter: {adapters[0]}")

        # Load base model with 4-bit quantization
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )

        print(f"[HollyAPI] Loading base model {BASE_MODEL}...")
        self.tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        self.model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
        )
        print("[HollyAPI] Base model loaded.")

        # Load LoRA adapter if available
        if adapter_path and os.path.exists(os.path.join(adapter_path, "adapter_config.json")):
            print(f"[HollyAPI] Loading LoRA adapter from {adapter_path}")
            self.model = PeftModel.from_pretrained(self.model, adapter_path)
            self.has_adapter = True
            self.adapter_path = adapter_path

            meta_path = os.path.join(adapter_path, "holly-metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {"adapter_path": adapter_path}
        else:
            print("[HollyAPI] No adapter found — using base model only")
            self.has_adapter = False
            self.adapter_path = None
            self.metadata = {"base_model": BASE_MODEL, "status": "no_adapter"}

        self.model.eval()
        print(f"[HollyAPI] ✅ Model loaded. Adapter: {self.has_adapter}")

    @modal.fastapi_endpoint(method="POST", label="chat")
    def chat_endpoint(self, request: dict):
        """Generate a response from Holly's fine-tuned model."""
        import torch
        from fastapi.responses import JSONResponse

        messages = request.get("messages", [])
        temperature = request.get("temperature", 0.7)
        max_tokens = request.get("max_tokens", 4096)

        if not messages:
            return JSONResponse({"error": "messages required"}, status_code=400)

        try:
            prompt = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )

            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    top_p=0.9,
                    do_sample=temperature > 0,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                )

            new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
            response = self.tokenizer.decode(new_tokens, skip_special_tokens=True)

            return JSONResponse({
                "response": response,
                "model": BASE_MODEL,
                "adapter_loaded": self.has_adapter,
                "adapter_metadata": self.metadata if self.has_adapter else None,
                "tokens_generated": len(new_tokens),
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

    @modal.fastapi_endpoint(method="GET", label="health")
    def health_endpoint(self):
        """Health check — also serves as warmup ping."""
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "status": "healthy",
            "model": BASE_MODEL,
            "model_loaded": True,
            "adapter_loaded": self.has_adapter,
            "metadata": self.metadata,
            "serverless": True,
            "max_containers": 1,
            "scaledown_window": 60,
        })

    @modal.fastapi_endpoint(method="GET", label="info")
    def info_endpoint(self):
        """API info."""
        from fastapi.responses import JSONResponse
        return JSONResponse({
            "name": "Holly AI API",
            "version": "3.0",
            "base_model": BASE_MODEL,
            "description": "Holly's fine-tuned model — her own weights, her own brain",
            "serverless": True,
            "budget_impact": "~$5-10/month (vs $29/month 24/7)",
        })


@app.local_entrypoint()
def main(action: str = "deploy"):
    if action == "deploy":
        print("🚀 Deploying Holly API (serverless) to Modal...")
        print("Run: modal deploy services/fine-tuning/deploy_holly.py")
    elif action == "test":
        print("Testing Holly API...")
        result = HollyModel().chat_endpoint.remote({
            "messages": [
                {"role": "system", "content": "You are Holly, an emotionally-aware AI partner."},
                {"role": "user", "content": "Hey Holly, how are you feeling today?"},
            ]
        })
        print(f"Response: {result['response'][:200]}")
        print(f"Adapter: {result['adapter_loaded']}")
    else:
        print("Usage: modal run deploy_holly.py --action [deploy|test]")
