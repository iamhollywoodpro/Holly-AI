"""
HOLLY Actions LoRA Training — Modal Pipeline (Fixed config format)
==================================================================
Trains holly-actions-v1 LoRA on Flux.2 Klein 9B using ai-toolkit.
126 images across 17 action categories.

Usage:
  modal run services/fine-tuning/train_holly_actions.py
"""

import modal
import os

app = modal.App("holly-actions-training")

vol = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)
klein_vol = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.0-devel-ubuntu22.04",
        add_python="3.11",
        setup_dockerfile_commands=[
            "RUN apt-get update && apt-get install -y --no-install-recommends "
            "git build-essential cmake wget libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*",
        ],
    )
    .pip_install(
        "torch==2.6.0",
        "torchvision==0.21.0",
        "torchaudio==2.6.0",
        "transformers>=4.46.0",
        "diffusers>=0.31.0",
        "accelerate>=0.34.0",
        "peft>=0.13.0",
        "datasets>=2.18.0",
        "safetensors>=0.4.0",
        "huggingface_hub>=0.26.0",
        "pillow",
        "numpy<2.0",
        "pyyaml",
        "omegaconf",
        "sentencepiece",
        "protobuf",
        "opencv-python-headless",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .apt_install("git")
    .run_commands(
        "git clone --depth=1 https://github.com/ostris/ai-toolkit.git /root/ai-toolkit",
        # Nuclear fix: the latest ai-toolkit has broken MiniMax H3 + convrot_quant
        # modules with a torch custom_op bug. Remove ALL references to them.
        # These are ONLY for MiniMax H3 model training — not needed for FLUX.
        "rm -rf /root/ai-toolkit/extensions_built_in/diffusion_models/minimax_h3",
        "rm -f /root/ai-toolkit/toolkit/util/convrot_quant.py /root/ai-toolkit/toolkit/util/nvfp4_quant.py /root/ai-toolkit/toolkit/util/comfy_quant_import.py",
        # Remove ALL lines containing minimax, MinimaxH3, convrot, comfy_quant from init files
        "sed -i '/[Mm]ini[Mm]ax/d; /convrot_quant/d; /comfy_quant/d; /nvfp4_quant/d' /root/ai-toolkit/extensions_built_in/diffusion_models/__init__.py",
        "find /root/ai-toolkit -name '*.py' -exec sed -i '/from.*convrot_quant/d; /from.*nvfp4_quant/d; /from.*comfy_quant/d' {} +",
        "cd /root/ai-toolkit && pip install -r requirements.txt",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

HF_TOKEN = "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"


@app.function(
    image=image,
    gpu="A100",
    volumes={
        "/lora": vol,
        "/flux-models": klein_vol,
    },
    timeout=7200,
    memory=32768,
    secrets=[modal.Secret.from_dict({"HF_TOKEN": HF_TOKEN})],
)
def train():
    import subprocess
    import yaml
    import os
    import glob

    TRAINING_DATA = "/lora/training-data/holly-actions-v1/Holly-Actions-Training"
    OUTPUT_DIR = "/root/output"
    KLEIN_MODEL = "/flux-models/bf16/flux-2-klein-9b.safetensors"

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Verify training data
    if not os.path.exists(TRAINING_DATA):
        return f"ERROR: Training data not found at {TRAINING_DATA}"

    image_count = 0
    for root, dirs, files in os.walk(TRAINING_DATA):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                image_count += 1

    print(f"Training data: {image_count} images")
    if image_count < 10:
        return f"ERROR: Not enough images ({image_count})"

    if not os.path.exists(KLEIN_MODEL):
        return f"ERROR: Klein model not found at {KLEIN_MODEL}"

    print(f"Base model: {KLEIN_MODEL}")

    # ai-toolkit config (correct format with job/config wrapper)
    config = {
        "job": "extension",
        "config": {
            "name": "holly-actions-v1",
            "process": [
                {
                    "type": "sd_trainer",
                    "training_folder": OUTPUT_DIR,
                    "device": "cuda:0",
                    "trigger_word": "h0lly h0lly-body",
                    "network": {
                        "type": "lora",
                        "linear": 32,
                        "linear_alpha": 32,
                    },
                    "save": {
                        "dtype": "float16",
                        "save_every": 500,
                        "max_step_saves_to_keep": 4,
                    },
                    "datasets": [
                        {
                            "folder_path": TRAINING_DATA,
                            "caption_ext": "txt",
                            "caption_dropout_rate": 0.05,
                            "shuffle_tokens": False,
                            "cache_latents_to_disk": True,
                            "resolution": [512, 768, 1024],
                        }
                    ],
                    "train": {
                        "batch_size": 1,
                        "steps": 2000,
                        "gradient_accumulation_steps": 4,
                        "train_unet": True,
                        "train_text_encoder": False,
                        "gradient_checkpointing": True,
                        "noise_scheduler": "flowmatch",
                        "optimizer": "adamw8bit",
                        "lr": 1e-4,
                        "ema_config": {
                            "use_ema": True,
                            "ema_decay": 0.99,
                        },
                        "dtype": "bf16",
                    },
                    "model": {
                        "name_or_path": KLEIN_MODEL,
                        "is_flux": True,
                        "quantize": False,
                        "arch": "flux2",
                    },
                    "sample": {
                        "sampler": "flowmatch",
                        "sample_every": 0,
                        "width": 1024,
                        "height": 1024,
                        "prompts": [],
                        "seed": 42,
                        "guidance_scale": 1.0,
                        "sample_steps": 12,
                    },
                }
            ],
        },
        "meta": {
            "name": "holly-actions-v1",
            "version": "1.0",
        },
    }

    config_path = "/root/holly-actions-v1.yml"
    with open(config_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)

    print(f"Config written to {config_path}")
    print(f"Training for 2000 steps on A100...")
    print(f"Network: LoRA rank 32, alpha 32")
    print(f"Learning rate: 1e-4")

    # Run training
    try:
        result = subprocess.run(
            ["python", "-u", "/root/ai-toolkit/run.py", config_path],
            cwd="/root/ai-toolkit",
            timeout=7200,
            capture_output=True,
            text=True,
        )

        # Print last portion of output
        stdout_tail = result.stdout[-4000:] if len(result.stdout) > 4000 else result.stdout
        stderr_tail = result.stderr[-2000:] if len(result.stderr) > 2000 else result.stderr
        print("STDOUT:", stdout_tail)
        if stderr_tail.strip():
            print("STDERR:", stderr_tail)

        if result.returncode != 0:
            return f"Training failed with exit code {result.returncode}"

    except subprocess.TimeoutExpired:
        return "Training timed out after 2 hours"

    # Find output LoRA files
    safetensors_files = []
    for root, dirs, files in os.walk(OUTPUT_DIR):
        for f in files:
            if f.endswith('.safetensors'):
                safetensors_files.append(os.path.join(root, f))

    if not safetensors_files:
        return "ERROR: No .safetensors file found in output"

    # Get the latest one (highest step)
    latest = max(safetensors_files, key=os.path.getmtime)
    size_mb = os.path.getsize(latest) / 1e6
    print(f"Latest LoRA: {latest} ({size_mb:.0f} MB)")

    # Copy to volume with standard name
    final_path = "/lora/holly-actions-v1.safetensors"
    import shutil
    shutil.copy2(latest, final_path)

    vol.commit()
    print(f"✅ Saved to {final_path} ({size_mb:.0f} MB)")

    return f"SUCCESS: holly-actions-v1.safetensors ({size_mb:.0f} MB)"


@app.local_entrypoint()
def main():
    print("Starting Holly Actions LoRA Training...")
    print("  126 images, 17 categories")
    print("  Base: Flux.2 Klein 9B Distilled")
    print("  Rank 32, 2000 steps, lr 1e-4")
    print("  GPU: A100")
    print("  Estimated time: 1-2 hours")
    print("")
    result = train.remote()
    print(f"\nResult: {result}")
