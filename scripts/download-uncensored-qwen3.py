#!/usr/bin/env python3
"""
Download uncensored Qwen3-8B text encoder for FLUX.2 Klein 9B.

Why:
  FLUX.2 Klein ships with a stock Qwen3-8B text encoder that has safety filters
  baked in — it silently softens or refuses NSFW prompts at the prompt-encoding
  stage, even though the DiT itself has no such filter. Swapping in an
  abliterated/uncensored Qwen3-8B removes this gatekeeper.

Source repo:
  DuoNeural/Qwen3-8B-Abliterated
  - Apache 2.0 license, UNGATED (no license click required)
  - Qwen3-8B with refusal vectors removed via orthogonal ablation
  - Exact arch match: hidden_size=4096, num_hidden_layers=36, vocab_size=151936
  - BF16 in shards (matches Klein's existing encoder dtype/format)

  (Originally tried ponpoke/flux2-klein-9b-uncensored-text-encoder and
   huihui-ai/Qwen3-8B-abliterated — both gated. DuoNeural is the cleanest
   ungated path with identical architecture.)

Target location:
  Modal volume `holly-flux2klein-weights` → /flux-models/bf16/text_encoder_uncensored/
  Non-destructive: original text_encoder/ directory is preserved untouched.

Usage:
    modal run scripts/download-uncensored-qwen3.py
"""

import modal

app = modal.App("holly-uncensored-encoder-download")

VOLUME_MOUNT = "/flux-models"
volume = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("huggingface_hub>=0.25.0", "requests")
)


@app.function(
    image=image,
    cpu=2,
    memory=8192,
    timeout=1800,  # 30 min — 16GB download
    volumes={VOLUME_MOUNT: volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def download_uncensored_encoder() -> dict:
    import os
    import json
    from pathlib import Path

    from huggingface_hub import snapshot_download, login

    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    if hf_token:
        login(token=hf_token)
        print("✅ HuggingFace authenticated")
    else:
        print("⚠️  No HF token — may fail if repo is gated")

    REPO = "DuoNeural/Qwen3-8B-Abliterated"
    TARGET = Path("/flux-models/bf16/text_encoder_uncensored")

    # Already downloaded?
    if (TARGET / "config.json").exists() and any(TARGET.glob("*.safetensors")):
        print(f"✅ Encoder already present at {TARGET}")
        files = sorted(p.name for p in TARGET.iterdir())
        return {"status": "exists", "path": str(TARGET), "files": files}

    TARGET.mkdir(parents=True, exist_ok=True)

    print(f"📥 Downloading {REPO} → {TARGET}")
    print(f"   (15.6 GB, single safetensors + config + tokenizer)")

    # Download the full repo snapshot (config, safetensors shards, tokenizer)
    # huihui-ai/Qwen3-8B-abliterated has 4 BF16 shards totaling ~16GB
    snapshot_download(
        repo_id=REPO,
        local_dir=str(TARGET),
        # Skip GGUF quants and large unused files
        ignore_patterns=["*.gguf", "*.md", "*.txt",
                         "original/*", "onnx/*"],
    )

    # Commit volume so files persist
    volume.commit()

    # Verify
    print(f"\n📋 Contents of {TARGET}:")
    total_bytes = 0
    file_info = []
    for f in sorted(TARGET.iterdir()):
        if f.is_file():
            sz = f.stat().st_size
            total_bytes += sz
            sz_gb = sz / (1024 ** 3)
            print(f"  {sz_gb:>6.2f} GB  {f.name}")
            file_info.append({"name": f.name, "size_gb": round(sz_gb, 2)})

    print(f"\nTotal: {total_bytes / (1024 ** 3):.2f} GB")

    # Read config.json to verify architecture matches
    cfg_path = TARGET / "config.json"
    if cfg_path.exists():
        cfg = json.loads(cfg_path.read_text())
        print(f"\n📝 config.json key fields:")
        for k in ["model_type", "architectures", "hidden_size",
                  "num_hidden_layers", "num_attention_heads", "vocab_size",
                  "torch_dtype"]:
            if k in cfg:
                print(f"  {k}: {cfg[k]}")

        # Sanity check against Klein's expected encoder arch
        expected = {
            "model_type": "qwen3",
            "architectures": ["Qwen3ForCausalLM"],
            "hidden_size": 4096,
            "num_hidden_layers": 36,
            "num_attention_heads": 32,
            "vocab_size": 151936,
        }
        mismatches = []
        for k, v in expected.items():
            if cfg.get(k) != v:
                mismatches.append(f"{k}: expected {v}, got {cfg.get(k)}")

        if mismatches:
            print(f"\n❌ ARCHITECTURE MISMATCH:")
            for m in mismatches:
                print(f"   {m}")
            return {"status": "mismatch", "mismatches": mismatches}
        else:
            print(f"\n✅ Architecture matches Klein's expected text_encoder")

    return {
        "status": "downloaded",
        "path": str(TARGET),
        "total_gb": round(total_bytes / (1024 ** 3), 2),
        "files": file_info,
    }


@app.local_entrypoint()
def main():
    print("🚀 Downloading uncensored Qwen3-8B text encoder...")
    result = download_uncensored_encoder.remote()
    print(f"\n{'=' * 60}")
    print(f"RESULT: {result}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    print("Run with: modal run scripts/download-uncensored-qwen3.py")
