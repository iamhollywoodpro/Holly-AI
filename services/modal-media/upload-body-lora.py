#!/usr/bin/env/python3
"""
Upload Holly Body v1.0 LoRA to Modal volume.
Sends the file as bytes from local machine to Modal function.
"""

import modal

app = modal.App("upload-body-lora")
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)
LORA_DIR = "/lora"

LOCAL_FILE = "/Users/stevefreshblendz/Desktop/Holly-AI-main/services/modal-media/loras/holly-body-v1.safetensors"
REMOTE_FILE = "holly-body-v1.safetensors"


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
    size_mb = len(data) / (1024 * 1024)
    print(f"✅ Uploaded {filename} ({size_mb:.1f} MB) to holly-lora-weights volume")

    # List all files on volume
    print(f"\n📋 Files on holly-lora-weights volume:")
    for fn in sorted(os.listdir(LORA_DIR)):
        sz = os.path.getsize(os.path.join(LORA_DIR, fn))
        print(f"  {fn} ({sz / (1024*1024):.1f} MB)")


if __name__ == "__main__":
    import os

    if not os.path.exists(LOCAL_FILE):
        print(f"❌ File not found: {LOCAL_FILE}")
        exit(1)

    size_mb = os.path.getsize(LOCAL_FILE) / (1024 * 1024)
    print(f"📂 Reading {LOCAL_FILE} ({size_mb:.1f} MB)...")

    with open(LOCAL_FILE, "rb") as f:
        data = f.read()

    print(f"📤 Uploading to Modal volume...")
    with app.run():
        upload.remote(data, REMOTE_FILE)

    print("\n🎉 Done!")
