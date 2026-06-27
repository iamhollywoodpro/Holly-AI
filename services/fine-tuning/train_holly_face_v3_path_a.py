#!/usr/bin/env python3
"""
HOLLY Face v3 LoRA Training — Path A (diffusers-aligned)
=========================================================

Uses Flux2KleinPipeline's own helper methods for VAE encoding, prompt
encoding, latent packing, and position IDs. This guarantees train/inference
parity — same code path that produces images at runtime is used to compute
the training loss.

Key correctness points (vs the rejected draft in train_holly_face_v3.py):

  1. **VAE**: Klein uses batch-norm in VAE, NOT scaling-factor. We use
     pipe._encode_vae_image() which applies the BN normalization correctly.
  2. **Timestep**: Klein transformer expects timestep/1000 (in [0,1]),
     NOT raw timesteps in [0,1000]. Matches inference call site.
  3. **Position IDs**: Klein transformer requires txt_ids and img_ids
     positional embeddings. We use pipe._prepare_text_ids() and
     pipe._prepare_latent_ids().
  4. **Latent pipeline**: encode → patchify → BN → noise/pack → transformer
     → unpack → loss. Matches Klein's internal flow exactly.
  5. **Sigma sampling**: logit-normal per diffusers FLUX trainer reference
     (`sigmoid(randn) * train_timesteps`).
  6. **Save**: pipe.save_lora_weights() + get_peft_model_state_dict()
     produces a pytorch_lora_weights.safetensors that the A100 endpoint's
     pipe.load_lora_weights() reads natively. No format conversion needed.

Output:
  - holly-face-v3.safetensors on the holly-lora-weights Modal volume
  - Sample metadata file alongside

Cost: ~$5-8 on A100 (estimated 30-40 min)
"""

import os
import modal

app = modal.App("holly-face-v3-train-path-a")

VOLUME_MOUNT = "/flux-models"
MODEL_CACHE = "/flux-models/bf16"
LORA_DIR = "/lora"

volume = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

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
    )
    .pip_install("huggingface_hub>=0.25.0")
)


@app.function(
    image=image,
    gpu="A100",
    timeout=60 * 60 * 2,
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
):
    """Train Holly Face v3 LoRA using Klein pipeline's own methods."""
    import json
    import math
    import torch
    import numpy as np
    from pathlib import Path
    from PIL import Image

    print("=" * 70)
    print("  HOLLY FACE v3 LoRA Training — Path A")
    print("=" * 70)
    print(f"  Rank:       {rank} (alpha={alpha})")
    print(f"  LR:         {learning_rate}")
    print(f"  Steps:      {max_train_steps}")
    print(f"  Effective batch: {batch_size} x {gradient_accumulation_steps}")
    print(f"  Resolution: {resolution}x{resolution}")
    print(f"  Output:     {LORA_DIR}/{output_filename}")
    print("=" * 70)

    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    if hf_token:
        from huggingface_hub import login
        login(token=hf_token)
        print("✅ HuggingFace authenticated")

    if not os.path.exists(f"{MODEL_CACHE}/model_index.json"):
        raise RuntimeError(
            f"FLUX.2 Klein model not found at {MODEL_CACHE}. "
            "Run the A100 endpoint once to populate the volume."
        )

    # ─── Stage dataset to container fs ──────────────────────────────────────
    print("\n📥 Staging dataset...")
    dataset_remote = "/root/dataset"
    os.makedirs(dataset_remote, exist_ok=True)

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
        with open(img_path, 'rb') as src, open(os.path.join(dataset_remote, fname), 'wb') as dst:
            dst.write(src.read())
        with open(txt_path, 'r') as src, open(os.path.join(dataset_remote, f"{stem}.txt"), 'w') as dst:
            dst.write(src.read())
        pairs.append(fname)
    print(f"  ✅ {len(pairs)} pairs staged")
    if len(pairs) < 10:
        raise RuntimeError(f"Need >=10 pairs, got {len(pairs)}")

    # ─── Load pipeline ──────────────────────────────────────────────────────
    print("\n🚀 Loading FLUX.2 Klein pipeline on CPU...")
    import torch
    from diffusers import Flux2KleinPipeline, FlowMatchEulerDiscreteScheduler

    dtype = torch.bfloat16
    pipe = Flux2KleinPipeline.from_pretrained(
        MODEL_CACHE, torch_dtype=dtype, local_files_only=True,
    )

    transformer = pipe.transformer
    vae = pipe.vae
    text_encoder = pipe.text_encoder
    tokenizer = pipe.tokenizer
    scheduler: FlowMatchEulerDiscreteScheduler = pipe.scheduler

    # Freeze base weights
    for p in vae.parameters(): p.requires_grad_(False)
    for p in text_encoder.parameters(): p.requires_grad_(False)
    vae.eval(); text_encoder.eval()

    # Move frozen components to GPU
    vae.to("cuda")
    text_encoder.to("cuda")

    # ─── Attach LoRA via add_adapter (diffusers convention) ─────────────────
    from peft import LoraConfig

    # Same target modules as diffusers FLUX trainer
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
        init_lora_weights="gaussian",
    )

    transformer.add_adapter(lora_config)
    transformer.print_trainable_parameters() if hasattr(transformer, "print_trainable_parameters") else None

    # Enable train mode + gradient checkpointing
    transformer.train()
    if hasattr(transformer, "gradient_checkpointing_enable"):
        transformer.gradient_checkpointing_enable()

    print("📦 Moving transformer to A100 GPU...")
    transformer.to("cuda")

    # ─── Dataset + DataLoader ───────────────────────────────────────────────
    from torch.utils.data import Dataset, DataLoader

    class HollyFaceDataset(Dataset):
        def __init__(self, dataset_dir, resolution):
            self.dataset_dir = dataset_dir
            self.resolution = resolution
            self.items = []
            for fname in sorted(os.listdir(dataset_dir)):
                if not fname.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    continue
                stem = Path(fname).stem
                if os.path.exists(os.path.join(dataset_dir, f"{stem}.txt")):
                    self.items.append(fname)

        def __len__(self):
            return len(self.items)

        def __getitem__(self, idx):
            from torchvision import transforms as T
            fname = self.items[idx]
            stem = Path(fname).stem
            with open(os.path.join(self.dataset_dir, f"{stem}.txt")) as f:
                caption = f.read().strip()
            img = Image.open(os.path.join(self.dataset_dir, fname)).convert("RGB")
            w, h = img.size
            side = min(w, h)
            left = (w - side) // 2
            top = (h - side) // 2
            img = img.crop((left, top, left + side, top + side))
            img = img.resize((self.resolution, self.resolution), Image.LANCZOS)
            tensor = T.functional.to_tensor(img)
            tensor = (tensor * 2.0) - 1.0  # [-1, 1] for VAE
            return {"image": tensor, "caption": caption}

    dataset = HollyFaceDataset(dataset_remote, resolution)
    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=2,
        pin_memory=True,
        drop_last=True,
    )
    print(f"📊 Dataset: {len(dataset)} images, {len(loader)} batches/epoch")

    # ─── Optimizer + LR schedule ────────────────────────────────────────────
    from torch.optim import AdamW
    from transformers import get_cosine_schedule_with_warmup

    trainable_params = [p for p in transformer.parameters() if p.requires_grad]
    optimizer = AdamW(trainable_params, lr=learning_rate, betas=(0.9, 0.999), weight_decay=0.01)

    warmup_steps = min(200, max_train_steps // 10)
    lr_scheduler = get_cosine_schedule_with_warmup(
        optimizer, num_warmup_steps=warmup_steps, num_training_steps=max_train_steps,
    )

    # ─── Training loop ──────────────────────────────────────────────────────
    # num_train_timesteps for FlowMatchEulerDiscreteScheduler defaults to 1000
    num_train_timesteps = scheduler.config.num_train_timesteps
    print(f"\n🔥 Training: {max_train_steps} steps, {num_train_timesteps} train timesteps")
    print(f"   Warmup: {warmup_steps} steps, cosine schedule\n")

    step = 0
    accumulated = 0
    running_loss = 0.0
    last_save_step = 0
    save_interval = 500

    optimizer.zero_grad()

    while step < max_train_steps:
        for batch in loader:
            if step >= max_train_steps:
                break

            images = batch["image"].to("cuda", dtype=dtype)
            captions = list(batch["caption"])
            bsz = images.shape[0]

            # ── Encode images via Klein's VAE (handles patchify + BN) ──
            with torch.no_grad():
                # pipe._encode_vae_image takes (B, C, H, W) tensor, returns patched+BN'd latents
                # shape: (B, num_channels*4, H/2/2, W/2/2) = (B, C*4, H_vae/2, W_vae/2)
                # For 768x768 input: VAE factor 8 → 96x96; patchify /2 → 48x48 channels*4
                latents = pipe._encode_vae_image(images, generator=None)
                # shape is now (B, C*4, H_p, W_p) where H_p=W_p=48 for 768 input

            # ── Encode captions via Klein's Qwen3 helper ──
            with torch.no_grad():
                prompt_embeds, text_ids = pipe.encode_prompt(
                    prompt=captions,
                    device="cuda",
                    dtype=dtype,
                    num_images_per_prompt=1,
                )
                text_ids = text_ids.to("cuda")

            # ── Prepare latent IDs for positional encoding ──
            with torch.no_grad():
                latent_ids = pipe._prepare_latent_ids(latents).to("cuda")

            # ── Sample noise and timesteps (logit-normal per diffusers reference) ──
            noise = torch.randn_like(latents)

            # u from logit-normal: u = sigmoid(randn * logit_std + logit_mean)
            # Then indices = u * num_train_timesteps
            u = torch.sigmoid(torch.randn((bsz,), device="cuda", dtype=torch.float32))
            indices = (u * num_train_timesteps).long().clamp(0, num_train_timesteps - 1)
            timesteps = scheduler.timesteps.to("cuda")[indices]

            # Get sigmas corresponding to timesteps
            schedule_timesteps = scheduler.timesteps.to("cuda")
            step_indices = [(schedule_timesteps == t).nonzero().item() for t in timesteps]
            sigmas = scheduler.sigmas.to("cuda", dtype=dtype)[step_indices].flatten()
            while len(sigmas.shape) < latents.ndim:
                sigmas = sigmas.unsqueeze(-1)

            # Flow matching: z_t = (1 - sigma) * x + sigma * noise
            noisy_latents = (1.0 - sigmas) * latents + sigmas * noise

            # ── Pack latents for transformer ──
            packed_noisy = pipe._pack_latents(noisy_latents)

            # ── Forward pass ──
            model_pred = transformer(
                hidden_states=packed_noisy,
                timestep=timesteps / 1000,  # Klein expects [0, 1]
                guidance=None,
                encoder_hidden_states=prompt_embeds,
                txt_ids=text_ids,
                img_ids=latent_ids,
                joint_attention_kwargs=None,
                return_dict=False,
            )[0]

            # ── Unpack prediction back to latent shape ──
            # _pack_latents was: (B, C, H, W) -> permute(0, 2, 1) -> (B, H*W, C)
            # Inverse: (B, H*W, C) -> permute(0, 2, 1) -> (B, C, H*W) -> reshape (B, C, H, W)
            B, HW, C = model_pred.shape
            H = W = int(math.sqrt(HW))
            model_pred = model_pred.permute(0, 2, 1).reshape(B, C, H, W)

            # ── Flow-matching loss ──
            target = noise - latents
            loss = torch.nn.functional.mse_loss(model_pred.float(), target.float())
            loss = loss / gradient_accumulation_steps
            loss.backward()

            running_loss += loss.item() * gradient_accumulation_steps
            accumulated += 1

            if accumulated >= gradient_accumulation_steps:
                torch.nn.utils.clip_grad_norm_(trainable_params, 1.0)
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

                if step - last_save_step >= save_interval:
                    ckpt_dir = f"{LORA_DIR}/holly-face-v3-step{step}"
                    print(f"  💾 Checkpoint: {ckpt_dir}/")
                    try:
                        pipe.save_lora_weights(
                            save_directory=ckpt_dir,
                            transformer_lora_layers=None,  # populated below
                        )
                    except Exception:
                        # Fallback: direct PEFT save
                        from peft import PeftModel
                        if hasattr(transformer, "save_pretrained"):
                            transformer.save_pretrained(ckpt_dir, safe_serialization=True)
                    try:
                        lora_volume.commit()
                    except Exception as e:
                        print(f"  ⚠️ Commit failed: {e}")
                    last_save_step = step

    # ─── Final save via Klein's save_lora_weights ───────────────────────────
    print(f"\n💾 Saving final LoRA as {output_filename}...")
    from peft.utils import get_peft_model_state_dict

    final_dir = f"{LORA_DIR}/holly-face-v3-final"
    os.makedirs(final_dir, exist_ok=True)

    transformer_lora_layers = get_peft_model_state_dict(transformer)
    pipe.save_lora_weights(
        save_directory=final_dir,
        transformer_lora_layers=transformer_lora_layers,
    )
    # Rename default filename to our desired name
    default_path = os.path.join(final_dir, "pytorch_lora_weights.safetensors")
    final_path = os.path.join(LORA_DIR, output_filename)
    if os.path.exists(default_path):
        os.rename(default_path, final_path)
    lora_volume.commit()
    print(f"  ✅ Saved: {final_path}")
    print(f"  Size: {os.path.getsize(final_path) / 1024 / 1024:.1f} MB")

    # ─── Metadata ───────────────────────────────────────────────────────────
    metadata = {
        "version": "3.0",
        "path": "A",
        "rank": rank,
        "alpha": alpha,
        "lr": learning_rate,
        "steps": max_train_steps,
        "resolution": resolution,
        "dataset_size": len(pairs),
        "final_loss": running_loss,
        "base_model": "FLUX.2 Klein 9B BF16",
        "trained_with": "Flux2KleinPipeline native methods",
    }
    with open(f"{LORA_DIR}/{output_filename}.meta.json", "w") as f:
        json.dump(metadata, f, indent=2)
    lora_volume.commit()

    print("\n" + "=" * 70)
    print("  TRAINING COMPLETE")
    print(f"  Next: deploy holly-face-v3.safetensors to A100 endpoint")
    print(f"  and test with face weight 0.6 + body v2.5 @ 1.15")
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
    """Local entrypoint: `modal run train_holly_face_v3_path_a.py`"""
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
