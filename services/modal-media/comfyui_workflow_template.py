#!/usr/bin/env python3
"""
ComfyUI Workflow Template for Z-Image Turbo + LoRAs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Builds the ComfyUI API-format workflow JSON for text-to-image generation
with Z-Image Turbo, supporting stacked LoRA loading.

This is the PROVEN path for Z-Image LoRAs — ComfyUI's native LoraLoader node
is stable, unlike diffusers ZImagePipeline (issues #12745, #13221, #13249).

Node graph:
  UNETLoader → LoraLoader(s) → KSampler → VAEDecode → SaveImage
  CLIPLoader → LoraLoader(s) → CLIPTextEncode → KSampler
  VAELoader → VAEDecode
  EmptyLatentImage → KSampler
  CLIPTextEncode (positive) → KSampler
  ConditioningZeroOut (negative) → KSampler

Z-Image Turbo inference params (from verified ComfyUI workflow):
  - Steps: 4 (distilled, sub-second)
  - CFG: 1.0
  - Sampler: dpmpp_2m_sde
  - Scheduler: sgm_uniform
  - Negative: ConditioningZeroOut (zeroes positive — standard for distilled)
"""

from typing import Optional


def build_workflow(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    seed: Optional[int] = None,
    loras: Optional[list] = None,
    steps: int = 4,
    cfg: float = 1.0,
    sampler: str = "dpmpp_2m_sde",
    scheduler: str = "sgm_uniform",
    filename_prefix: str = "Holly",
) -> dict:
    """
    Build a ComfyUI API-format workflow for Z-Image Turbo text-to-image.

    Args:
        prompt: The positive prompt text.
        width: Image width (default 1024).
        height: Image height (default 1024).
        seed: Random seed. None = random (ComfyUI generates one).
        loras: List of {"name": "file.safetensors", "strength": 0.8, "strength_clip": 0.8}.
               Multiple LoRAs are chained (each takes the previous model+clip output).
        steps: Inference steps (default 4 for Turbo).
        cfg: CFG scale (default 1.0 for distilled).
        sampler: Sampler name (default dpmpp_2m_sde).
        scheduler: Scheduler name (default sgm_uniform).
        filename_prefix: Prefix for saved images.

    Returns:
        Dict in ComfyUI API format: {"prompt": {"1": {...}, "2": {...}, ...}}
    """
    if seed is None:
        import random
        seed = random.randint(0, 2**63 - 1)

    if loras is None:
        loras = []

    workflow = {}
    node_id = 1

    def next_id():
        nonlocal node_id
        nid = node_id
        node_id += 1
        return str(nid)

    # ── Loaders ───────────────────────────────────────────────────────
    # UNETLoader — Z-Image Turbo checkpoint
    unet_id = next_id()
    workflow[unet_id] = {
        "class_type": "UNETLoader",
        "inputs": {
            "unet_name": "z_image_turbo_bf16.safetensors",
            "weight_dtype": "fp8_e4m3fn",
        },
    }

    # CLIPLoader — Qwen3-4B text encoder
    clip_id = next_id()
    workflow[clip_id] = {
        "class_type": "CLIPLoader",
        "inputs": {
            "clip_name": "qwen_3_4b.safetensors",
            "type": "lumina2",
        },
    }

    # VAELoader
    vae_id = next_id()
    workflow[vae_id] = {
        "class_type": "VAELoader",
        "inputs": {
            "vae_name": "zImage_vae.safetensors",
        },
    }

    # ── LoRA Loading (chained) ────────────────────────────────────────
    # Each LoraLoader takes the previous model+clip output, building a chain.
    # This is how ComfyUI stacks multiple LoRAs natively.
    current_model_ref = [unet_id, 0]  # [node_id, output_index]
    current_clip_ref = [clip_id, 0]

    for lora in loras:
        lora_id = next_id()
        workflow[lora_id] = {
            "class_type": "LoraLoader",
            "inputs": {
                "lora_name": lora["name"],
                "strength_model": lora.get("strength", 0.8),
                "strength_clip": lora.get("strength_clip", lora.get("strength", 0.8)),
                "model": current_model_ref,
                "clip": current_clip_ref,
            },
        }
        # Chain: next node takes this LoraLoader's outputs
        current_model_ref = [lora_id, 0]
        current_clip_ref = [lora_id, 1]

    # ── Conditioning ──────────────────────────────────────────────────
    # Positive prompt — uses the final clip output (after LoRAs)
    pos_id = next_id()
    workflow[pos_id] = {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": prompt,
            "clip": current_clip_ref,
        },
    }

    # Negative — ConditioningZeroOut (standard for distilled models like Z-Image Turbo)
    neg_id = next_id()
    workflow[neg_id] = {
        "class_type": "ConditioningZeroOut",
        "inputs": {
            "conditioning": [pos_id, 0],
        },
    }

    # ── Latent ────────────────────────────────────────────────────────
    latent_id = next_id()
    workflow[latent_id] = {
        "class_type": "EmptyLatentImage",
        "inputs": {
            "width": width,
            "height": height,
            "batch_size": 1,
        },
    }

    # ── Sampler ───────────────────────────────────────────────────────
    # KSampler — uses the final model output (after LoRAs)
    sampler_id = next_id()
    workflow[sampler_id] = {
        "class_type": "KSampler",
        "inputs": {
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": scheduler,
            "denoise": 1.0,
            "model": current_model_ref,
            "positive": [pos_id, 0],
            "negative": [neg_id, 0],
            "latent_image": [latent_id, 0],
        },
    }

    # ── Decode + Save ─────────────────────────────────────────────────
    decode_id = next_id()
    workflow[decode_id] = {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": [sampler_id, 0],
            "vae": [vae_id, 0],
        },
    }

    save_id = next_id()
    workflow[save_id] = {
        "class_type": "SaveImage",
        "inputs": {
            "images": [decode_id, 0],
            "filename_prefix": filename_prefix,
        },
    }

    return {"prompt": workflow}


# ── Test / CLI ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json

    # Example: simple generation (no LoRAs)
    wf = build_workflow(
        prompt="a beautiful sunset over the ocean, photorealistic",
        width=1024,
        height=1024,
        seed=42,
    )
    print("=== No LoRAs ===")
    print(json.dumps(wf, indent=2))

    # Example: with 2 stacked LoRAs
    wf2 = build_workflow(
        prompt="h0lly, beautiful woman smiling",
        loras=[
            {"name": "holly-face.safetensors", "strength": 0.8},
            {"name": "holly-body.safetensors", "strength": 0.7},
        ],
    )
    print("\n=== With LoRAs ===")
    print(json.dumps(wf2, indent=2))
