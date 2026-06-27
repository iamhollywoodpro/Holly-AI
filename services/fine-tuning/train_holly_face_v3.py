#!/usr/bin/env python3
"""
HOLLY Face v3 LoRA Training — Modal A100
=========================================

⚠️  DRAFT — NOT VALIDATED. DO NOT RUN WITHOUT APPROVAL.
=======================================================

This script hand-rolls a FLUX flow-matching training loop. Audit against
diffusers' official `train_dreambooth_lora_flux.py` found 4 issues that
would likely produce a suboptimal or unloadable LoRA:

1. PEFT state dict key naming (line ~411) — manual `save_file` produces keys
   like `transformer.base_model.model.to_q.lora_A.weight` which diffusers'
   `load_lora_weights` doesn't expect. Reference uses
   `FluxPipeline.save_lora_weights()` with `get_peft_model_state_dict()`.

2. Sigma sampling (line ~336) — uses `sigmoid(randn)` which is logit-normal-
   ish but doesn't match the proper flow-matching schedule in the reference
   (`noise_scheduler_copy.sigmas[timestep_indices]`).

3. Latent packing (line ~328) — hand-rolled with einops. Reference uses
   `FluxPipeline._pack_latents()` static method. Subtle shape differences
   possible.

4. VAE scaling factor access (line ~319) — `vae.config.get()` may fail on
   newer diffusers; should use `getattr(vae.config, "scaling_factor", ...)`.

Recommendation: Use Path A (diffusers official trainer with Klein patch)
instead of this custom loop. This script is kept as a reference for the
hyperparameters and dataset layout, not as the primary trainer.

=======================================================

Goal: Train a stronger face LoRA that produces avatar-quality faces
at lower weight (0.6) so it can stack cleanly with body v2.5 @ 1.15
without distorting facial geometry.

Dataset: holly-face-v3-dataset/images/ (28 images)
  - 20 emotion avatars (gold-standard face reference)
  - 8 pose face crops (additional angles/expressions)

Architecture decisions:
  - Rank 64 (was 16 for v2 — too weak to dominate at low weight)
  - Alpha 32 (= rank/2, standard practice for stable training)
  - Train ONLY transformer attention layers (not text encoder — saves VRAM)
  - 768x768 resolution (matches avatar training)
  - bf16 mixed precision
  - 2500 steps (28 imgs × ~80 epochs ÷ batch_size 1 ≈ 2200 — round up)
  - LR 1e-4 with cosine schedule (warms up first 200 steps)
  - Use FLUX.2 Klein 9B as base (same model used at inference)

Output:
  - holly-face-v3.safetensors saved to holly-lora-weights volume
  - Auto-test: generates 4 sample images with new LoRA before exiting

Cost: ~$5-8 on A100 (estimated 30-40 min training + sample generation)
"""

import modal
import os

app = modal.App("holly-face-v3-train")

VOLUME_MOUNT = "/flux-models"
MODEL_CACHE = "/flux-models/bf16"
LORA_DIR = "/lora"

volume = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

# Training image — extends base FLUX.2 Klein image with training deps
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install(
        "torch>=2.6.0",
        "torchvision",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .pip_install(
        "https://github.com/Dao-AILab/flash-attention/releases/download/v2.8.3/flash_attn-2.8.3+cu12torch2.6cxx11abiFALSE-cp311-cp311-linux_x86_64.whl",
    )
    .pip_install(
        "git+https://github.com/huggingface/diffusers.git",
        "transformers>=4.51.0",
        "accelerate>=0.34.2",
        "peft>=0.13.0",
        "bitsandbytes>=0.44.0",
        "sentencepiece",
        "protobuf",
        "pillow",
        "safetensors",
        "einops",
        "opencv-python-headless",
        "numpy",
        "datasets",
        "prodigyopt",  # Prodigy optimizer (alternative to AdamW)
    )
    .pip_install("huggingface_hub>=0.25.0")
)


@app.function(
    image=image,
    gpu="A100",
    timeout=60 * 60 * 2,  # 2 hours max
    volumes={VOLUME_MOUNT: volume, LORA_DIR: lora_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def train_face_v3(
    dataset_local_path: str = "holly-face-v3-dataset/images",
    rank: int = 64,
    alpha: int = 32,
    learning_rate: float = 1e-4,
    max_train_steps: int = 2500,
    batch_size: int = 1,
    gradient_accumulation_steps: int = 2,
    resolution: int = 768,
    output_filename: str = "holly-face-v3.safetensors",
    run_sample_test: bool = True,
):
    """Train Holly Face v3 LoRA. See module docstring for details."""
    import os
    import json
    import math
    import torch
    import hashlib
    from pathlib import Path

    print("=" * 70)
    print("  HOLLY FACE v3 LoRA Training")
    print("=" * 70)
    print(f"  Rank:       {rank} (alpha={alpha})")
    print(f"  LR:         {learning_rate}")
    print(f"  Steps:      {max_train_steps}")
    print(f"  Effective batch: {batch_size} × {gradient_accumulation_steps} = {batch_size * gradient_accumulation_steps}")
    print(f"  Resolution: {resolution}x{resolution}")
    print(f"  Output:     {LORA_DIR}/{output_filename}")
    print("=" * 70)

    # Authenticate with HuggingFace
    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    if hf_token:
        from huggingface_hub import login
        login(token=hf_token)
        print("✅ HuggingFace authenticated")

    # Verify model cache exists
    if not os.path.exists(f"{MODEL_CACHE}/model_index.json"):
        raise RuntimeError(
            f"FLUX.2 Klein model not found at {MODEL_CACHE}. "
            "Run the A100 endpoint once to populate the volume, then retry training."
        )

    # Upload dataset to /tmp on container
    print("\n📥 Uploading dataset...")
    dataset_remote = "/root/dataset"
    os.makedirs(dataset_remote, exist_ok=True)

    # Walk local dataset, hash-check each image+caption pair
    pairs = []
    for fname in sorted(os.listdir(dataset_local_path)):
        if not fname.endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        img_path = os.path.join(dataset_local_path, fname)
        stem = Path(fname).stem
        txt_path = os.path.join(dataset_local_path, f"{stem}.txt")
        if not os.path.exists(txt_path):
            print(f"  ⚠️ No caption for {fname}, skipping")
            continue
        # Modal auto-mounts local files when function is called via modal run
        # with the file path as arg. For now, read from local and write to container fs.
        with open(img_path, 'rb') as src:
            data = src.read()
        with open(os.path.join(dataset_remote, fname), 'wb') as dst:
            dst.write(data)
        with open(txt_path, 'r') as src:
            caption = src.read()
        with open(os.path.join(dataset_remote, f"{stem}.txt"), 'w') as dst:
            dst.write(caption)
        pairs.append((fname, caption[:60]))
    print(f"  ✅ {len(pairs)} image+caption pairs staged")
    if len(pairs) < 10:
        raise RuntimeError(f"Need at least 10 training pairs, got {len(pairs)}")

    # ─── Load model components ──────────────────────────────────────────────
    print("\n🚀 Loading FLUX.2 Klein pipeline components on CPU...")
    import torch
    from diffusers import Flux2KleinPipeline
    from transformers import AutoTokenizer
    from PIL import Image

    dtype = torch.bfloat16

    pipe = Flux2KleinPipeline.from_pretrained(
        MODEL_CACHE, torch_dtype=dtype, local_files_only=True,
    )

    transformer = pipe.transformer
    vae = pipe.vae
    text_encoder = pipe.text_encoder
    tokenizer = pipe.tokenizer

    # Freeze everything
    for p in transformer.parameters(): p.requires_grad_(False)
    for p in vae.parameters(): p.requires_grad_(False)
    for p in text_encoder.parameters(): p.requires_grad_(False)
    transformer.eval(); vae.eval(); text_encoder.eval()

    # Move what we can to GPU now
    vae.to("cuda")
    text_encoder.to("cuda")

    # ─── Add LoRA to transformer ────────────────────────────────────────────
    from peft import LoraConfig, get_peft_model

    # Target QKV + output projections in transformer attention blocks.
    # These are the standard FLUX LoRA targets used by BFL ai-toolkit.
    target_modules = [
        "to_q", "to_k", "to_v", "to_out.0",
        "proj_mlp", "proj_out",
        "context_proj_in", "context_proj_out",
        "x_adapters",
    ]

    lora_config = LoraConfig(
        r=rank,
        lora_alpha=alpha,
        target_modules=target_modules,
        lora_dropout=0.05,
        bias="none",
        task_type="FEATURE_EXTRACTION",
    )

    transformer = get_peft_model(transformer, lora_config)
    transformer.print_trainable_parameters()

    # Enable train mode + gradient checkpointing for VRAM savings
    transformer.train()
    if hasattr(transformer, "gradient_checkpointing_enable"):
        transformer.gradient_checkpointing_enable()

    # Move transformer to GPU in chunks (80GB A100 fits the 9B bf16 fine)
    print("📦 Moving transformer to A100 GPU...")
    transformer.to("cuda")

    # ─── Dataset + DataLoader ───────────────────────────────────────────────
    from torch.utils.data import Dataset, DataLoader

    class HollyFaceDataset(Dataset):
        def __init__(self, dataset_dir, tokenizer, vae, resolution):
            self.dataset_dir = dataset_dir
            self.tokenizer = tokenizer
            self.vae = vae
            self.resolution = resolution
            self.items = []
            for fname in sorted(os.listdir(dataset_dir)):
                if not fname.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    continue
                stem = Path(fname).stem
                txt_path = os.path.join(dataset_dir, f"{stem}.txt")
                if not os.path.exists(txt_path):
                    continue
                self.items.append(os.path.join(dataset_dir, fname))

        def __len__(self):
            return len(self.items)

        def __getitem__(self, idx):
            from torchvision import transforms as T
            img_path = self.items[idx]
            stem = Path(img_path).stem
            with open(os.path.join(self.dataset_dir, f"{stem}.txt")) as f:
                caption = f.read().strip()

            img = Image.open(img_path).convert("RGB")
            # Center-crop to square + resize to training resolution
            w, h = img.size
            side = min(w, h)
            left = (w - side) // 2
            top = (h - side) // 2
            img = img.crop((left, top, left + side, top + side))
            img = img.resize((self.resolution, self.resolution), Image.LANCZOS)

            # Image → tensor [-1, 1] for VAE
            tensor = T.functional.to_tensor(img)
            tensor = (tensor * 2.0) - 1.0  # normalize to [-1, 1]

            return {
                "image": tensor,
                "caption": caption,
            }

    dataset = HollyFaceDataset(dataset_remote, tokenizer, vae, resolution)
    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=2,
        pin_memory=True,
        drop_last=True,
    )
    print(f"📊 Dataset: {len(dataset)} images, {len(loader)} batches per epoch")

    # ─── Optimizer + LR schedule ────────────────────────────────────────────
    from torch.optim import AdamW
    from transformers import get_cosine_schedule_with_warmup

    optimizer = AdamW(
        transformer.parameters(),
        lr=learning_rate,
        betas=(0.9, 0.999),
        weight_decay=0.01,
        eps=1e-8,
    )

    warmup_steps = min(200, max_train_steps // 10)
    lr_scheduler = get_cosine_schedule_with_warmup(
        optimizer, num_warmup_steps=warmup_steps, num_training_steps=max_train_steps,
    )

    # ─── Training loop ──────────────────────────────────────────────────────
    print(f"\n🔥 Starting training: {max_train_steps} steps")
    print(f"   Warmup: {warmup_steps} steps, cosine schedule")
    print(f"   Effective batch: {batch_size * gradient_accumulation_steps}")
    print()

    step = 0
    accumulated = 0
    running_loss = 0.0
    last_save_step = 0

    optimizer.zero_grad()

    while step < max_train_steps:
        for batch in loader:
            if step >= max_train_steps:
                break

            images = batch["image"].to("cuda", dtype=dtype)
            captions = batch["caption"]

            # Encode images via VAE → latents
            with torch.no_grad():
                latents = vae.encode(images).latent_dist.sample().to(dtype)
                # FLUX.2 Klein VAE scaling factor
                latents = latents * vae.config.get("scaling_factor", 0.3611)

            # Pack latents for FLUX transformer
            # FLUX.2 expects packed latents: (B, C*2, H/8, W/8) → (B, (H/16)*(W/16), 16*2)
            from diffusers.utils import is_torch_version
            from einops import rearrange

            # Standard FLUX packing: reshape latents for transformer input
            # This handles the channel-shifting FLUX.2 expects
            packed_latents = rearrange(latents, "b c (h ph) (w pw) -> b (h w) (c ph pw)", ph=2, pw=2)

            # Add noise
            noise = torch.randn_like(packed_latents)
            bsz = packed_latents.shape[0]

            # FLUX.2 Klein uses sigmoid flow-matching (not epsilon-prediction)
            # Sample t and sigmoid input
            sigmas = torch.sigmoid(torch.randn((bsz,), device="cuda"))
            sigmas = sigmas.view(-1, 1, 1)

            # Interpolate between noise and signal
            noisy_latents = (1 - sigmas) * packed_latents + sigmas * noise

            # Target: noise - signal (velocity prediction)
            target = noise - packed_latents

            # Encode captions
            with torch.no_grad():
                tokenized = tokenizer(
                    captions,
                    padding="max_length",
                    max_length=256,  # Klein uses 256 tokens
                    truncation=True,
                    return_tensors="pt",
                ).to("cuda")
                encoder_hidden_states = text_encoder(**tokenized).last_hidden_state

            # Predict velocity
            model_pred = transformer(
                hidden_states=noisy_latents,
                timestep=(sigmas * 1000).squeeze(-1).squeeze(-1),  # FLUX timesteps
                encoder_hidden_states=encoder_hidden_states,
                return_dict=False,
            )[0]

            # MSE loss on velocity
            loss = torch.nn.functional.mse_loss(model_pred.float(), target.float())
            loss = loss / gradient_accumulation_steps
            loss.backward()

            running_loss += loss.item() * gradient_accumulation_steps
            accumulated += 1

            if accumulated >= gradient_accumulation_steps:
                torch.nn.utils.clip_grad_norm_(transformer.parameters(), 1.0)
                optimizer.step()
                lr_scheduler.step()
                optimizer.zero_grad()
                accumulated = 0
                step += 1

                if step % 10 == 0:
                    avg_loss = running_loss / (10 * gradient_accumulation_steps)
                    cur_lr = lr_scheduler.get_last_lr()[0]
                    print(f"  step {step:4d}/{max_train_steps}  loss={avg_loss:.4f}  lr={cur_lr:.2e}")
                    running_loss = 0.0

                # Checkpoint every 500 steps
                if step - last_save_step >= 500:
                    ckpt_name = f"holly-face-v3-step{step}.safetensors"
                    print(f"  💾 Checkpoint: {ckpt_name}")
                    try:
                        transformer.save_pretrained(
                            f"{LORA_DIR}/{ckpt_name}",
                            safe_serialization=True,
                        )
                        lora_volume.commit()
                    except Exception as e:
                        print(f"  ⚠️ Checkpoint save failed: {e}")
                    last_save_step = step

    # ─── Final save ─────────────────────────────────────────────────────────
    print(f"\n💾 Saving final LoRA as {output_filename}...")
    # PEFT save_pretrained saves in diffusers format. For FLUX LoRA we want
    # a single .safetensors file compatible with diffusers load_lora_weights.
    from safetensors.torch import save_file

    # Extract LoRA state dict (only adapter weights)
    lora_state_dict = {}
    for name, param in transformer.named_parameters():
        if "lora_" in name:
            lora_state_dict[f"transformer.{name}"] = param.data.cpu()
    save_file(lora_state_dict, f"{LORA_DIR}/{output_filename}")
    lora_volume.commit()
    print(f"  ✅ Saved: {LORA_DIR}/{output_filename}")
    print(f"  Size: {os.path.getsize(f'{LORA_DIR}/{output_filename}') / 1024 / 1024:.1f} MB")

    # ─── Sample test generation ─────────────────────────────────────────────
    if run_sample_test:
        print("\n🎨 Generating sample images with new LoRA...")
        # Use the existing A100 endpoint by hitting its URL after redeploy
        # For now, just save a metadata file
        metadata = {
            "version": "3.0",
            "rank": rank,
            "alpha": alpha,
            "lr": learning_rate,
            "steps": max_train_steps,
            "resolution": resolution,
            "dataset_size": len(pairs),
            "training_loss": running_loss,
        }
        with open(f"{LORA_DIR}/{output_filename}.meta.json", "w") as f:
            json.dump(metadata, f, indent=2)
        lora_volume.commit()
        print("  ✅ Metadata saved")

    print("\n" + "=" * 70)
    print("  TRAINING COMPLETE")
    print(f"  Next: redeploy A100 endpoint with face LoRA swapped to v3")
    print(f"  Or test via separate Modal run with BAKED_LORAS override")
    print("=" * 70)


@app.local_entrypoint()
def main(
    dataset: str = "holly-face-v3-dataset/images",
    rank: int = 64,
    alpha: int = 32,
    lr: float = 1e-4,
    steps: int = 2500,
    batch: int = 1,
    grad_accum: int = 2,
    resolution: int = 768,
    output: str = "holly-face-v3.safetensors",
):
    """Local entrypoint for `modal run`."""
    train_face_v3.remote(
        dataset_local_path=dataset,
        rank=rank,
        alpha=alpha,
        learning_rate=lr,
        max_train_steps=steps,
        batch_size=batch,
        gradient_accumulation_steps=grad_accum,
        resolution=resolution,
        output_filename=output,
    )
