#!/usr/bin/env python3
"""Inspect existing Klein 9B volume to identify text encoder architecture."""
import modal

app = modal.App("holly-klein-inspector")
volume = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)

image = modal.Image.debian_slim(python_version="3.11").pip_install("pyyaml")


@app.function(image=image, volumes={"/flux-models": volume}, timeout=120)
def inspect():
    import os
    import json
    from pathlib import Path

    base = Path("/flux-models/bf16")

    print("=" * 60)
    print("Klein 9B volume contents")
    print("=" * 60)

    if not base.exists():
        print(f"❌ {base} does not exist")
        return

    # List top-level
    print("\nTop-level directories:")
    for item in sorted(base.iterdir()):
        if item.is_dir():
            print(f"  📁 {item.name}/")
        else:
            size_mb = item.stat().st_size / (1024 * 1024)
            print(f"  📄 {item.name} ({size_mb:.1f} MB)")

    # Inspect text_encoder
    te = base / "text_encoder"
    if te.exists():
        print(f"\n📝 text_encoder contents:")
        for f in sorted(te.rglob("*")):
            if f.is_file():
                size_mb = f.stat().st_size / (1024 * 1024)
                rel = f.relative_to(te)
                print(f"  {size_mb:>8.1f} MB  {rel}")

        # Check config.json
        cfg = te / "config.json"
        if cfg.exists():
            print(f"\n📝 text_encoder config.json:")
            data = json.loads(cfg.read_text())
            for k in ["model_type", "architectures", "hidden_size", "num_hidden_layers",
                     "num_attention_heads", "vocab_size", "torch_dtype"]:
                if k in data:
                    print(f"  {k}: {data[k]}")

    # Inspect tokenizer
    tok = base / "tokenizer"
    if tok.exists():
        print(f"\n🔤 tokenizer contents:")
        for f in sorted(tok.iterdir()):
            if f.is_file():
                size_kb = f.stat().st_size / 1024
                print(f"  {size_kb:>8.1f} KB  {f.name}")

        # tokenizer_config.json reveals the model family
        tc = tok / "tokenizer_config.json"
        if tc.exists():
            print(f"\n🔤 tokenizer_config.json (key fields):")
            data = json.loads(tc.read_text())
            for k in ["tokenizer_class", "model_max_length", "name_or_path"]:
                if k in data:
                    print(f"  {k}: {data[k]}")

    # Inspect model_index.json
    mi = base / "model_index.json"
    if mi.exists():
        print(f"\n📋 model_index.json:")
        data = json.loads(mi.read_text())
        for k, v in data.items():
            if isinstance(v, list) and len(v) == 2:
                print(f"  {k}: {v[0]}/{v[1]}")
            else:
                print(f"  {k}: {v}")


if __name__ == "__main__":
    print("Run with: modal run scripts/inspect-klein-volume.py")
