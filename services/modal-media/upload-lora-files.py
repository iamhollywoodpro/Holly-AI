#!/usr/bin/env/python3
"""
Upload Holly Face v2.0 LoRA to Modal volume.
"""

import modal

app = modal.App("upload-face-lora")
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)
LORA_DIR = "/lora"

LOCAL_FILE = "/Users/stevefreshblendz/Desktop/Holly-AI-main/services/modal-media/loras/holly-face-v2.safetensors"


@app.function(
    volumes={LORA_DIR: lora_volume},
    timeout=300,
)
def upload(data: bytes, filename: str):
    import os
    remote_path = os.path.join(LORA_DIR, filename)
    with open(remote_path, "wb") as f:
        f.write(data)
    lora_volume.commit()
    return f"Uploaded {filename} ({len(data) / (1024*1024):.1f} MB)"


@app.function(volumes={LORA_DIR: lora_volume}, timeout=60)
def list_files():
    import os
    files = []
    for f in sorted(os.listdir(LORA_DIR)):
        sz = os.path.getsize(os.path.join(LORA_DIR, f))
        files.append((f, sz))
    return files


if __name__ == "__main__":
    import os

    with open(LOCAL_FILE, "rb") as f:
        data = f.read()

    print(f"Uploading holly-face-v2.safetensors ({len(data)/(1024*1024):.1f} MB)...")
    with app.run():
        result = upload.remote(data, "holly-face-v2.safetensors")
        print(f"  {result}")

        files = list_files.remote()
        print(f"\nFiles on holly-lora-weights volume:")
        for name, size in files:
            print(f"  {name} ({size / (1024*1024):.1f} MB)")

    print("\nDone!")
