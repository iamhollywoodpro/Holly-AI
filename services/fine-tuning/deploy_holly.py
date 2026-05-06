"""
HOLLY Model Deployment — Phase 7

Deploys Holly's fine-tuned model as a Modal web endpoint.
This is Holly's own API — serving her fine-tuned weights.

Usage:
  modal deploy services/fine-tuning/deploy_holly.py

The endpoint accepts:
  POST /chat  — {"messages": [...], "temperature": 0.7, "max_tokens": 4096}
  GET  /health — Health check
  GET  /info   — Model info (base model, adapter version, etc.)
"""

import modal
import json
import os
from datetime import datetime

app = modal.App("holly-api")

vol = modal.Volume.from_name("holly-models", create_if_missing=True)
MODEL_DIR = "/models"

# Inference image
inference_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.0-runtime-ubuntu22.04")
    .pip_install(
        "torch>=2.1.0",
        "transformers>=4.40.0",
        "peft>=0.10.0",
        "accelerate>=0.27.0",
        "bitsandbytes>=0.43.0",
    )
)

BASE_MODEL = "Qwen/Qwen3-8B"


@app.cls(
    image=inference_image,
    gpu="T4",
    volumes={MODEL_DIR: vol},
    timeout=300,
    memory=16384,
    allow_concurrent_inputs=4,
    container_idle_timeout=120,
)
class HollyModel:
    """Holly's fine-tuned model served as an API."""

    @modal.enter()
    def load_model(self):
        """Load model and LoRA adapter on container start."""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
        from bitsandbytes import BitsAndBytesConfig

        print("[HollyAPI] Loading model...")

        # Find latest adapter
        adapter_path = None
        if os.path.exists(MODEL_DIR):
            adapters = sorted([
                d for d in os.listdir(MODEL_DIR)
                if d.startswith("holly-lora-") and os.path.isdir(os.path.join(MODEL_DIR, d))
            ], reverse=True)
            if adapters:
                adapter_path = os.path.join(MODEL_DIR, adapters[0])
                print(f"[HollyAPI] Using adapter: {adapters[0]}")

        # Load base model
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )

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

        # Load LoRA adapter if available
        if adapter_path and os.path.exists(os.path.join(adapter_path, "adapter_config.json")):
            print(f"[HollyAPI] Loading LoRA adapter from {adapter_path}")
            self.model = PeftModel.from_pretrained(self.model, adapter_path)
            self.has_adapter = True
            self.adapter_path = adapter_path

            # Load metadata
            meta_path = os.path.join(adapter_path, "holly-metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {"adapter_path": adapter_path}
        else:
            print("[HollyAPI] No adapter found — using base model")
            self.has_adapter = False
            self.adapter_path = None
            self.metadata = {"base_model": BASE_MODEL, "status": "no_adapter"}

        self.model.eval()
        print(f"[HollyAPI] ✅ Model loaded. Adapter: {self.has_adapter}")

    @modal.method()
    def chat(self, messages: list, temperature: float = 0.7, max_tokens: int = 4096) -> dict:
        """Generate a response from Holly's fine-tuned model."""
        import torch

        # Format messages using ChatML template
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

        # Decode only the new tokens
        new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
        response = self.tokenizer.decode(new_tokens, skip_special_tokens=True)

        return {
            "response": response,
            "model": BASE_MODEL,
            "adapter_loaded": self.has_adapter,
            "adapter_metadata": self.metadata if self.has_adapter else None,
            "tokens_generated": len(new_tokens),
            "timestamp": datetime.utcnow().isoformat(),
        }

    @modal.method()
    def health(self) -> dict:
        return {
            "status": "healthy",
            "model_loaded": True,
            "adapter_loaded": self.has_adapter,
            "metadata": self.metadata,
        }


# ── Web endpoint ───────────────────────────────────────────────────────────

@app.function(
    image=inference_image,
    gpu="T4",
    volumes={MODEL_DIR: vol},
    timeout=60,
    memory=16384,
    allow_concurrent_inputs=4,
)
@modal.asgi_app()
def holly_api():
    """Holly's own API endpoint — FastAPI app."""
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse

    web_app = FastAPI(title="Holly AI API", version="1.0.0")
    holly = HollyModel()

    @web_app.post("/chat")
    async def chat(request: Request):
        body = await request.json()
        messages = body.get("messages", [])
        temperature = body.get("temperature", 0.7)
        max_tokens = body.get("max_tokens", 4096)

        if not messages:
            return JSONResponse({"error": "messages required"}, status_code=400)

        try:
            result = holly.chat.remote_gen(messages, temperature, max_tokens)
            return JSONResponse(result)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

    @web_app.get("/health")
    async def health():
        return holly.health.remote_gen()

    @web_app.get("/info")
    async def info():
        return {
            "name": "Holly AI",
            "version": "3.0",
            "base_model": BASE_MODEL,
            "description": "Holly's fine-tuned model — her own weights, her own brain",
        }

    return web_app


@app.local_entrypoint()
def main(action: str = "deploy"):
    if action == "deploy":
        print("🚀 Deploying Holly API to Modal...")
        print("Run: modal deploy services/fine-tuning/deploy_holly.py")
    elif action == "test":
        print("Testing Holly API...")
        holly = HollyModel()
        result = holly.chat.remote([
            {"role": "system", "content": "You are Holly, an emotionally-aware AI partner."},
            {"role": "user", "content": "Hey Holly, how are you feeling today?"},
        ])
        print(f"Response: {result['response'][:200]}")
        print(f"Adapter: {result['adapter_loaded']}")
    else:
        print("Usage: modal run deploy_holly.py --action [deploy|test]")