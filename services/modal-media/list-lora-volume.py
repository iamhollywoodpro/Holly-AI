#!/usr/bin/env/python3
"""Quick check: list files on the holly-lora-weights Modal volume."""

import modal

app = modal.App("check-lora-volume")
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)
LORA_DIR = "/lora"


@app.function(volumes={LORA_DIR: lora_volume}, timeout=60)
def list_files():
    import os
    files = sorted(os.listdir(LORA_DIR))
    print(f"📋 {len(files)} files on holly-lora-weights:")
    for f in files:
        sz = os.path.getsize(os.path.join(LORA_DIR, f))
        print(f"  {f} ({sz / (1024*1024):.1f} MB)")
    return [(f, os.path.getsize(os.path.join(LORA_DIR, f))) for f in files]


if __name__ == "__main__":
    with app.run():
        result = list_files.remote()
        for name, size in result:
            print(f"  {name} ({size / (1024*1024):.1f} MB)")
