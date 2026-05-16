"""Quick check: list files in Modal holly-models volume."""
import modal
import os

app = modal.App("check-holly-volume")
vol = modal.Volume.from_name("holly-models")
MODEL_DIR = "/models"

@app.function(volumes={MODEL_DIR: vol})
def check():
    td = os.path.join(MODEL_DIR, "training-data")
    if os.path.exists(td):
        files = os.listdir(td)
        print(f"Files in training-data: {files}")
        for f in files:
            fp = os.path.join(td, f)
            size = os.path.getsize(fp)
            print(f"  {f}: {size} bytes")
    else:
        print("No training-data directory yet")
    
    # Also check for adapters
    for name in os.listdir(MODEL_DIR):
        if name.startswith("holly-lora"):
            print(f"Adapter found: {name}")

@app.local_entrypoint()
def main():
    check.remote()
