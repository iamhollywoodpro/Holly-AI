#!/usr/bin/env python3
"""
HOLLY ComfyUI + FLUX.2 Klein 9B DISTILLED — Modal Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deploy ComfyUI on Modal with FLUX.2 Klein 9B DISTILLED for Holly's image
generation. This is the PROVEN photorealistic base — tested 3x against Base,
Base always produces cartoon output. Distilled is locked.

WHY COMFYUI (not diffusers) FOR THIS ENDPOINT:
  The v2-recipe needs 4 stacked LoRAs: Holly face + Holly body + the NSFW-unlock
  LoRAs (SNOFS lokr, Unchained, Masturbation). diffusers load_lora_weights does
  NOT support LyCORIS lokr format — SNOFS would fail to load. ComfyUI's native
  LoraLoader handles ALL LoRA formats (standard lora, lokr, ComfyUI naming)
  transparently. ComfyUI is what Civitai used to generate the reference images.

WHY KLEIN (not Z-Image, not SDXL):
  Three months of testing proved Klein is the best base for Holly's identity.
  Z-Image produced fuzzy/wrong-ethnicity output; SDXL RealVisXL produced deformed
  monster-like output. The v2-recipe (Klein + body v1 + the right sampler) got
  "Perfection" verdicts on face and full-body nude. Klein is the correct base.

ARCHITECTURE:
  1. ComfyUI runs as a background subprocess (localhost:8188) inside the Modal container
  2. A FastAPI wrapper handles: build workflow JSON → POST /prompt → poll /history → GET /view
  3. Returns raw image bytes (same contract as the diffusers Klein endpoint)

MODEL FILES (all ComfyUI single-file format):
  - UNET:  flux-2-klein-9b.safetensors (already on holly-flux2klein-weights volume)
  - CLIP:  qwen_3_8b.safetensors (from Comfy-Org/vae-text-encorder-for-flux-klein-9b)
  - VAE:   flux2-vae.safetensors (from Comfy-Org/vae-text-encorder-for-flux-klein-9b)

DEPLOY:
  modal deploy --profile iamhollywoodpro services/modal-media/comfyui_klein.py

ENDPOINTS (after deploy):
  Generate: https://iamhollywoodpro--generate-comfyui-klein.modal.run
  Health:   https://iamhollywoodpro--comfyui-klein-health.modal.run

GPU: A100 on Modal (~$1.50-2.00/hr)

PREREQUISITE:
  Modal secret "huggingface-secret" must exist (holds HF_TOKEN). Already configured.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import sys
import time
import json
import uuid
import urllib.request
import urllib.error
import subprocess
import signal

import modal

app = modal.App("holly-comfyui-klein")

# ─── Paths ────────────────────────────────────────────────────────────
COMFYUI_DIR = "/root/ComfyUI"
MODELS_DIR = f"{COMFYUI_DIR}/models"
UNET_DIR = f"{MODELS_DIR}/diffusion_models"
CLIP_DIR = f"{MODELS_DIR}/text_encoders"
VAE_DIR = f"{MODELS_DIR}/vae"
LORA_DIR = f"{MODELS_DIR}/loras"
CONTROLNET_DIR = f"{MODELS_DIR}/controlnet"
OUTPUT_DIR = f"{COMFYUI_DIR}/output"
INPUT_DIR = f"{COMFYUI_DIR}/input"
CUSTOM_NODES_DIR = f"{COMFYUI_DIR}/custom_nodes"

# Volumes — Klein weights on holly-flux2klein-weights (shared with diffusers
# endpoints). CLIP/VAE single-files download to holly-comfyui-models on first
# run. LoRAs on holly-lora-weights (shared with diffusers endpoints).
KLEIN_VOL_MOUNT = "/flux-models"
MODEL_VOL = "/models"
LORA_VOL_MOUNT = "/lora"
COMFYUI_PORT = 8188

# FLUX.2 Klein 9B DISTILLED — the proven base for photorealistic Holly.
#
# Base was tested THREE times (Aug 5, Aug 6, Aug 11) with multiple CFG values
# (2.8, 3.5, 4.0) and step counts (12, 20, 28). EVERY test produced cartoon /
# flat plastic output. GLM-4.6V confirmed all outputs are "obviously AI/cartoon,
# not a photograph." Base does NOT work for our use case despite LoRAs being
# trained on it. This is SETTLED — do not test Base again.
#
# Distilled + CFG 1.0 + 12 steps = the recipe that produces photorealistic Holly.
# Steve confirmed this multiple times. This is the locked configuration.
# SNOFS (2026-08-12): SNOFS is a Klein 9B Distilled NSFW checkpoint (Civitai 2416142).
# This is the model that generated Holly's explicit action images on Civitai.
# Steve confirmed: dildo renders correctly with SNOFS + combined-v1(0.9) + FK(1.0).
# Settings: 12 steps, CFG 1.0 (same Distilled recipe — NOT 4-step Smoke8 which looks bad).
# SNOFS quality: 8/10 photorealistic (vs 1-3/10 on stock Klein Distilled for NSFW).
KLEIN_UNET_FILE = "snofs-klein-9b-v14-distilled-fp8.safetensors"
KLEIN_UNET_VOL_PATH = f"{KLEIN_VOL_MOUNT}/bf16/{KLEIN_UNET_FILE}"

# CLIP + VAE: from Comfy-Org (NOT gated, ComfyUI-formatted single files).
# Repo: Comfy-Org/vae-text-encorder-for-flux-klein-9b (typo "encorder" is theirs)
COMFYORG_KLEIN_REPO = "Comfy-Org/vae-text-encorder-for-flux-klein-9b"
CLIP_FILE = "qwen_3_8b.safetensors"            # split_files/text_encoders/
VAE_FILE = "flux2-vae.safetensors"             # split_files/vae/

# Subpaths within the Comfy-Org repo
CLIP_SUBPATH = "split_files/text_encoders"
VAE_SUBPATH = "split_files/vae"

# ControlNet: alibaba-pai/FLUX.2-dev-Fun-Controlnet-Union
# Unified ControlNet — auto-detects pose/canny/depth from input image.
# Works with any FLUX.2 architecture UNET (including Klein Distilled) via
# runtime patching (flux_patch.py in the custom node).
CONTROLNET_FILE = "FLUX.2-dev-Fun-Controlnet-Union.safetensors"
CONTROLNET_REPO = "alibaba-pai/FLUX.2-dev-Fun-Controlnet-Union"

# ComfyUI UNETLoader expects the filename as it appears in models/diffusion_models/
# We symlink KLEIN_UNET_FILE there from the Klein volume.
UNET_FILE = KLEIN_UNET_FILE

# Distilled settings (PROVEN — produces photorealistic Holly):
#   12 steps, CFG 1.0, Euler sampler, Simple scheduler.
# Distilled ignores CFG (baked in during distillation) — the value is nominal.
# This is the recipe that produced "PERFECTION" verdicts across all tests.
V2_STEPS = 12
V2_CFG = 1.0
V2_SAMPLER = "euler"
V2_SCHEDULER = "simple"

# v2-recipe baked LoRAs — Holly's identity foundation.
# THE RECIPE (July 29, verified "PERFECTION" by Steve):
#   1. holly-combined-v1 @ 0.9 — combined face+body+actions LoRA (locks identity)
#   2. pussydiffusion @ 0.8 — Holly's own intimate anatomy specialist (unlocks
#      realistic genitalia that Klein's base can't render alone)
# BOTH are Steve's own LoRAs trained on Holly. NO generic LoRAs (no SNOFS,
# no Unchained). This 2-LoRA combo produced "PERFECTION" on spreading, bent-over,
# and closeup tests.
#
# IMPORTANT (2026-08-03): PussyDiffusion is trained EXCLUSIVELY on nude anatomy.
# Steve's directive (2026-08-04): PussyDiffusion ONLY for explicit/nude/sexual
# images. NEVER for SFW. combined-v1 alone is sufficient for identity (Steve
# confirmed beach and bar images ARE Holly — GLM vision was wrong about identity).
#
# REMOVED 2026-08-07: FLUX2_KLEIN_UNLOCKED_V2 — GENERIC LoRA that causes
# identity drift (same as SNOFS/Unchained). FACT.md rule #7 bans generic LoRAs.
# Klein's training data limitation for explicit actions is an ARCHITECTURAL limit,
# not fixable with generic unlock LoRAs.
#
# Three LoRA tiers:
#   SFW:              combined-v1 @ 0.9 only
#   NSFW (nude pose): combined-v1 @ 0.9 + pussydiffusion @ 0.8
#   NSFW (explicit):  combined-v1 @ 0.9 + nsfw-unlocked @ 0.8 + pussydiffusion @ 0.8
V2_BAKED_LORAS = [
    {"name": "holly-combined-v1.safetensors", "strength": 0.9},
    {"name": "pussydiffusion-f2-klein-9b_v2.safetensors", "strength": 0.8},
]

# Explicit action LoRA stack — uses ONLY Steve's own LoRAs (FACT.md rule #7:
# "Generic LoRAs cause identity drift. Use Steve's own LoRAs only.")
# FLUX2_KLEIN_UNLOCKED REMOVED — it's a generic LoRA that causes identity drift
# (same category as SNOFS/Unchained which FACT.md explicitly bans).
V2_EXPLICIT_LORAS = [
    {"name": "holly-combined-v1.safetensors", "strength": 0.9},
    {"name": "pussydiffusion-f2-klein-9b_v2.safetensors", "strength": 0.8},
]

# NSFW nude pose LoRA stack — no unlock needed for static nudity
V2_NUDE_LORAS = [
    {"name": "holly-combined-v1.safetensors", "strength": 0.9},
    {"name": "pussydiffusion-f2-klein-9b_v2.safetensors", "strength": 0.8},
]

# SFW LoRA stack — identity only, no anatomy LoRA
V2_SFW_LORAS = [
    {"name": "holly-combined-v1.safetensors", "strength": 0.9},
]

# Anatomy anchors — injected into EVERY prompt to enforce Holly's exact
# proportions. These are SPLIT into two sets:
# - BASE_ANCHORS: always applied (identity, body type, hands/feet, skin)
# - NUDE_ANCHORS: only applied when the prompt is explicitly nude/NSFW
# This prevents Holly from always being naked when the user just says
# "I want to see you" — she should match the conversation mood.
# Clothing detection: if the prompt mentions clothing, skip nude anchors.
import re as _re_clothing
_CLOTHING_RE = _re_clothing.compile(
    r"\b(dress|skirt|jeans|pants|shorts|top|blouse|shirt|sweater|hoodie|jacket|"
    r"coat|bikini|swimsuit|swim\s*suit|one\s*piece|lingerie|bra|panties|"
    r"thong|g-?string|tank\s*top|t-?shirt|leggings|yoga\s*pants|robe|"
    r"nightgown|pajama|loungewear|casual|outfit|clothed|wearing|dressed)\b",
    _re_clothing.IGNORECASE,
)

BASE_ANCHORS = (
    "olive skin tone (Portuguese/South Indian heritage), "
    "flawless even clear skin tone everywhere, no blotches no dark spots no uneven patches, "
    "smooth clean clear complexion on legs arms and body, uniform skin color, "
    "dark brown wavy hair ending at mid-chest level with subtle natural highlights, voluminous with face-framing layers, "
    "striking green eyes almond-shaped, "
    "5'4\" tall (163cm), 125 pounds, slim fit athletic build, "
    "flat toned stomach with faint abs visible, slim waist, "
    "phat plum apple-bottom ass round plump and full but proportional, "
    "thick thighs proportional to her plump ass, "
    "slender toned arms, slender toned legs, "
    "small petite delicate hands, five fingers on each hand, "
    "small petite feminine feet (size 5), five toes on each foot, "
    "fit healthy youthful 21 year old body"
)

# Nude anchors — only injected when the prompt is explicitly nude/NSFW
# (no clothing mentioned AND the prompt contains nudity keywords)
_NUDE_RE = _re_clothing.compile(
    r"\b(nude|naked|bare|topless|bottomless|completely\s+(?:nude|naked)|"
    r"pussy|vulva|breasts?|nipples?|genitals?|explicit|intimate\s+area|"
    r"masturbat|spread|penetrat|insert|dildo|fingering)\b",
    _re_clothing.IGNORECASE,
)

NUDE_ANCHORS = (
    "completely hairless pubic area, smooth bare skin, "
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "pudendal cleft at the base of the torso NOT high up, "
    "soft smooth mons pubis mound above the slit on the pubic bone, "
    "plump labia majora meeting evenly at rest, small labia minora, "
    "small clitoris at the top of the cleft, vaginal opening in lower half, "
    "3 inch perineum connecting vulva to anus, generous spacing between vaginal opening and anus, "
    "anus located in the buttock cleft between the ass cheeks NOT on the front, "
    "anus is positioned behind and below the vaginal opening NOT directly beneath it, "
    "correct anatomical positioning when sitting: anus hidden between cheeks, only visible from behind"
)

def get_anatomy_anchors(raw_prompt: str) -> str:
    """Return anatomy anchors based on the prompt content.

    SIMPLE RULE (Steve's directive 2026-08-04):
    - Nudity keywords present → BASE + NUDE anchors (anatomy details)
    - No nudity keywords → BASE + clothing reinforcement.
      The combined-v1 LoRA was trained on nudes and defaults toward nudity
      even when the prompt says "bikini." A simple "wearing clothes" anchor
      counteracts this bias without using NSFW trigger words.

    IMPORTANT: Do NOT use words that match _NUDE_RE (nipples, breasts, pussy,
    etc.) in clothing anchors — they'll trigger NSFW routing and load
    PussyDiffusion. Use "clothes" not "covering nipples."
    """
    has_nudity = bool(_NUDE_RE.search(raw_prompt))

    if has_nudity:
        # Explicit nudity requested — include anatomy anchors
        return BASE_ANCHORS + ", " + NUDE_ANCHORS
    else:
        # No nudity keywords — reinforce that she's wearing clothes.
        # The combined-v1 LoRA (trained on nudes) needs this push to render
        # actual fabric instead of see-through/missing clothing.
        # Simple and direct — no NSFW trigger words.
        return BASE_ANCHORS + ", wearing clothes, dressed, fabric covering her body"


# ─── Workflow builder (inlined — avoids cross-module packaging issues) ──
def build_workflow(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    seed=None,
    loras=None,
    steps: int = V2_STEPS,
    cfg: float = V2_CFG,
    sampler: str = V2_SAMPLER,
    scheduler: str = V2_SCHEDULER,
    filename_prefix: str = "Holly",
) -> dict:
    """Build ComfyUI API-format workflow for FLUX.2 Klein 9B text-to-image with LoRA stacking."""
    import random as _random
    if seed is None:
        seed = _random.randint(0, 2**63 - 1)
    if loras is None:
        loras = []

    wf = {}
    nid = [1]

    def _id():
        v = str(nid[0]); nid[0] += 1; return v

    # Loaders — Klein uses bf16 (NOT fp8). CLIPLoader type is "flux" for FLUX.2.
    unet_id = _id()
    wf[unet_id] = {"class_type": "UNETLoader", "inputs": {"unet_name": UNET_FILE, "weight_dtype": "default"}}
    # CLIPLoader type for FLUX.2 Klein 9B is "flux2" (NOT "flux").
    # ComfyUI's valid types (25): stable_diffusion, stable_cascade, sd3, ...,
    # flux2, ... — verified from ComfyUI nodes.py CLIPLoader.INPUT_TYPES.
    clip_id = _id()
    wf[clip_id] = {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP_FILE, "type": "flux2"}}
    vae_id = _id()
    wf[vae_id] = {"class_type": "VAELoader", "inputs": {"vae_name": VAE_FILE}}

    # Chained LoRAs
    cur_model = [unet_id, 0]
    cur_clip = [clip_id, 0]
    for lora in loras:
        lid = _id()
        wf[lid] = {"class_type": "LoraLoader", "inputs": {
            "lora_name": lora["name"],
            "strength_model": lora.get("strength", 0.8),
            "strength_clip": lora.get("strength_clip", lora.get("strength", 0.8)),
            "model": cur_model, "clip": cur_clip,
        }}
        cur_model = [lid, 0]
        cur_clip = [lid, 1]

    # Conditioning
    pos_id = _id()
    wf[pos_id] = {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": cur_clip}}
    neg_id = _id()
    wf[neg_id] = {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": [pos_id, 0]}}

    # Latent + Sampler
    latent_id = _id()
    wf[latent_id] = {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}}
    sampler_id = _id()
    wf[sampler_id] = {"class_type": "KSampler", "inputs": {
        "seed": seed, "steps": steps, "cfg": cfg,
        "sampler_name": sampler, "scheduler": scheduler, "denoise": 1.0,
        "model": cur_model, "positive": [pos_id, 0], "negative": [neg_id, 0],
        "latent_image": [latent_id, 0],
    }}

    # Decode + Save
    decode_id = _id()
    wf[decode_id] = {"class_type": "VAEDecode", "inputs": {"samples": [sampler_id, 0], "vae": [vae_id, 0]}}
    save_id = _id()
    wf[save_id] = {"class_type": "SaveImage", "inputs": {"images": [decode_id, 0], "filename_prefix": filename_prefix}}

    return {"prompt": wf}


def build_pose_guided_workflow(
    pose_image_filename: str,
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    seed=None,
    loras=None,
    denoise: float = 0.50,
    steps: int = V2_STEPS,
    cfg: float = V2_CFG,
    sampler: str = "euler",
    scheduler: str = "simple",
    filename_prefix: str = "Holly",
) -> dict:
    """Build a ComfyUI POSE-GUIDED (img2img) workflow.

    This bypasses Klein's block on explicit sexual actions. Instead of asking
    Klein to invent "dildo insertion" from text (which it refuses), we load a
    reference pose image showing the correct position, encode it to latent, and
    sample at LOW denoise (0.35). Klein follows the pose structure from the
    image but re-renders it as Holly with her LoRAs.

    Args:
        pose_image_filename: the reference pose image (uploaded to ComfyUI input/)
        denoise: 0.35 = follows pose strongly, replaces identity with Holly.
                 Lower (0.25) = more faithful to original. Higher (0.45) = more
                 Holly identity but may drift from the pose.
    """
    import random as _random
    if seed is None:
        seed = _random.randint(0, 2**63 - 1)
    if loras is None:
        loras = []

    wf = {}
    nid = [1]

    def _id():
        v = str(nid[0]); nid[0] += 1; return v

    # Loaders (same as build_workflow)
    unet_id = _id()
    wf[unet_id] = {"class_type": "UNETLoader", "inputs": {"unet_name": UNET_FILE, "weight_dtype": "default"}}
    clip_id = _id()
    wf[clip_id] = {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP_FILE, "type": "flux2"}}
    vae_id = _id()
    wf[vae_id] = {"class_type": "VAELoader", "inputs": {"vae_name": VAE_FILE}}

    # Chained LoRAs (same stack)
    cur_model = [unet_id, 0]
    cur_clip = [clip_id, 0]
    for lora in loras:
        lid = _id()
        wf[lid] = {"class_type": "LoraLoader", "inputs": {
            "lora_name": lora["name"],
            "strength_model": lora.get("strength", 0.8),
            "strength_clip": lora.get("strength_clip", lora.get("strength", 0.8)),
            "model": cur_model, "clip": cur_clip,
        }}
        cur_model = [lid, 0]
        cur_clip = [lid, 1]

    # Conditioning
    pos_id = _id()
    wf[pos_id] = {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": cur_clip}}
    neg_id = _id()
    wf[neg_id] = {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": [pos_id, 0]}}

    # POSE-GUIDED PATH: LoadImage → VAEEncode → KSampler(low denoise)
    load_id = _id()
    wf[load_id] = {"class_type": "LoadImage", "inputs": {"image": pose_image_filename}}

    # Encode the reference pose image to latent space
    vae_encode_id = _id()
    wf[vae_encode_id] = {"class_type": "VAEEncode", "inputs": {
        "pixels": [load_id, 0],
        "vae": [vae_id, 0],
    }}

    # KSampler with LOW denoise — follows the pose but re-renders as Holly
    sampler_id = _id()
    wf[sampler_id] = {"class_type": "KSampler", "inputs": {
        "seed": seed, "steps": steps, "cfg": cfg,
        "sampler_name": sampler, "scheduler": scheduler,
        "denoise": denoise,
        "model": cur_model, "positive": [pos_id, 0], "negative": [neg_id, 0],
        "latent_image": [vae_encode_id, 0],
    }}

    # Decode + Save
    decode_id = _id()
    wf[decode_id] = {"class_type": "VAEDecode", "inputs": {"samples": [sampler_id, 0], "vae": [vae_id, 0]}}
    save_id = _id()
    wf[save_id] = {"class_type": "SaveImage", "inputs": {"images": [decode_id, 0], "filename_prefix": filename_prefix}}

    return {"prompt": wf}


def build_controlnet_workflow(
    pose_skeleton_path: str,
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    seed=None,
    loras=None,
    steps: int = V2_STEPS,
    cfg: float = V2_CFG,
    sampler: str = V2_SAMPLER,
    scheduler: str = V2_SCHEDULER,
    controlnet_strength: float = 0.7,
    filename_prefix: str = "Holly",
) -> dict:
    """Build a ComfyUI workflow using ControlNet pose guidance.

    Instead of img2img (tracing a reference photo), this feeds a DWPose
    SKELETON (stick figure) to the ControlNet. Klein generates a completely
    new image around the skeleton — different lighting, skin, expression,
    camera angle — while keeping the pose geometry correct.

    Args:
        pose_skeleton_path: path to the .pose.png skeleton file (on the volume)
        controlnet_strength: 0.0-2.0, recommended 0.65-0.80
    """
    import random as _random
    if seed is None:
        seed = _random.randint(0, 2**63 - 1)
    if loras is None:
        loras = []

    wf = {}
    nid = [1]

    def _id():
        v = str(nid[0]); nid[0] += 1; return v

    # Loaders — same as build_workflow
    unet_id = _id()
    wf[unet_id] = {"class_type": "UNETLoader", "inputs": {"unet_name": UNET_FILE, "weight_dtype": "default"}}
    clip_id = _id()
    wf[clip_id] = {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP_FILE, "type": "flux2"}}
    vae_id = _id()
    wf[vae_id] = {"class_type": "VAELoader", "inputs": {"vae_name": VAE_FILE}}

    # Chained LoRAs
    cur_model = [unet_id, 0]
    cur_clip = [clip_id, 0]
    for lora in loras:
        lid = _id()
        wf[lid] = {"class_type": "LoraLoader", "inputs": {
            "lora_name": lora["name"],
            "strength_model": lora.get("strength", 0.8),
            "strength_clip": lora.get("strength_clip", lora.get("strength", 0.8)),
            "model": cur_model, "clip": cur_clip,
        }}
        cur_model = [lid, 0]
        cur_clip = [lid, 1]

    # Load the pose skeleton image
    skeleton_id = _id()
    wf[skeleton_id] = {"class_type": "LoadImage", "inputs": {"image": pose_skeleton_path}}

    # Conditioning (positive + negative)
    pos_id = _id()
    wf[pos_id] = {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": cur_clip}}
    neg_id = _id()
    wf[neg_id] = {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": [pos_id, 0]}}

    # ControlNet — load and apply
    # Node class names from comfyui-flux2fun-controlnet custom node.
    cn_load_id = _id()
    wf[cn_load_id] = {"class_type": "Flux2FunControlNetLoader", "inputs": {
        "controlnet_name": CONTROLNET_FILE,
    }}
    cn_apply_id = _id()
    wf[cn_apply_id] = {"class_type": "Flux2FunControlNetApply", "inputs": {
        "conditioning": [pos_id, 0],
        "controlnet": [cn_load_id, 0],
        "vae": [vae_id, 0],
        "strength": controlnet_strength,
        "control_image": [skeleton_id, 0],
    }}

    # Latent + Sampler
    latent_id = _id()
    wf[latent_id] = {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}}
    sampler_id = _id()
    wf[sampler_id] = {"class_type": "KSampler", "inputs": {
        "seed": seed, "steps": steps, "cfg": cfg,
        "sampler_name": sampler, "scheduler": scheduler, "denoise": 1.0,
        "model": cur_model,
        "positive": [cn_apply_id, 0],
        "negative": [neg_id, 0],
        "latent_image": [latent_id, 0],
    }}

    # Decode + Save
    decode_id = _id()
    wf[decode_id] = {"class_type": "VAEDecode", "inputs": {"samples": [sampler_id, 0], "vae": [vae_id, 0]}}
    save_id = _id()
    wf[save_id] = {"class_type": "SaveImage", "inputs": {"images": [decode_id, 0], "filename_prefix": filename_prefix}}

    return {"prompt": wf}


def build_inpaint_workflow(
    image_filename: str,
    prompt: str,
    width: int,
    height: int,
    loras,
    seed=None,
    denoise: float = 0.55,
    steps: int = V2_STEPS,
    cfg: float = V2_CFG,
    sampler: str = "euler",
    scheduler: str = "simple",
    filename_prefix: str = "Holly_refined",
) -> dict:
    """Build a ComfyUI INPAINT workflow for region refinement (ADetailer-style).

    Reuses the same loader + LoRA-chain + conditioning as build_workflow, but
    swaps EmptyLatentImage for LoadImage + VAEEncodeForInpaint + KSampler(denoise).
    This lets us re-render a cropped region (face/hand/foot) at high resolution
    with the SAME LoRA stack, fixing digit counts and identity drift.

    Args:
        image_filename: the uploaded crop filename in ComfyUI's input/ dir
        prompt: refinement prompt (anatomy anchors + region-specific language)
        width, height: crop dimensions (should match the uploaded image)
        loras: same LoRA stack as the main generation (identity-preserving)
        denoise: regeneration strength. 0.55 is conservative — preserves
                 structure while allowing digit-count fixes. Higher (0.65)
                 fixes more aggressively but risks the "plastic" over-processing
                 that disabled the diffusers face-enhance (FACT.md lesson).
    """
    import random as _random
    if seed is None:
        seed = _random.randint(0, 2**63 - 1)
    if loras is None:
        loras = []

    wf = {}
    nid = [1]

    def _id():
        v = str(nid[0]); nid[0] += 1; return v

    # Loaders — identical to build_workflow (Klein bf16, flux2 CLIPLoader)
    unet_id = _id()
    wf[unet_id] = {"class_type": "UNETLoader", "inputs": {"unet_name": UNET_FILE, "weight_dtype": "default"}}
    clip_id = _id()
    wf[clip_id] = {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP_FILE, "type": "flux2"}}
    vae_id = _id()
    wf[vae_id] = {"class_type": "VAELoader", "inputs": {"vae_name": VAE_FILE}}

    # Chained LoRAs — SAME stack as main generation (identity-preserving)
    cur_model = [unet_id, 0]
    cur_clip = [clip_id, 0]
    for lora in loras:
        lid = _id()
        wf[lid] = {"class_type": "LoraLoader", "inputs": {
            "lora_name": lora["name"],
            "strength_model": lora.get("strength", 0.8),
            "strength_clip": lora.get("strength_clip", lora.get("strength", 0.8)),
            "model": cur_model, "clip": cur_clip,
        }}
        cur_model = [lid, 0]
        cur_clip = [lid, 1]

    # Conditioning
    pos_id = _id()
    wf[pos_id] = {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": cur_clip}}
    neg_id = _id()
    wf[neg_id] = {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": [pos_id, 0]}}

    # INPAINT path: LoadImage → VAEEncodeForInpaint (full-white mask = img2img)
    load_id = _id()
    wf[load_id] = {"class_type": "LoadImage", "inputs": {"image": image_filename}}

    # Full-white mask via ImagePadForOutputStyles? No — VAEEncodeForInpaint takes
    # a MASK input. We build a white mask using a constant mask node.
    # Simpler: VAEEncodeForInpaint with a white mask = regenerate entire region.
    # ComfyUI's LoadImage outputs IMAGE + MASK. If the image has no alpha, MASK
    # is all-white (full inpaint). That's what we want for region re-render.
    vae_encode_id = _id()
    wf[vae_encode_id] = {"class_type": "VAEEncodeForInpaint", "inputs": {
        "pixels": [load_id, 0],
        "vae": [vae_id, 0],
        "mask": [load_id, 1],   # LoadImage's MASK output (all-white = full inpaint)
        "grow_mask_by": 6,
    }}

    # KSampler with denoise < 1.0 (partial re-render, preserves structure)
    sampler_id = _id()
    wf[sampler_id] = {"class_type": "KSampler", "inputs": {
        "seed": seed, "steps": steps, "cfg": cfg,
        "sampler_name": sampler, "scheduler": scheduler,
        "denoise": denoise,   # 0.55 = conservative refinement
        "model": cur_model, "positive": [pos_id, 0], "negative": [neg_id, 0],
        "latent_image": [vae_encode_id, 0],
    }}

    # Decode + Save
    decode_id = _id()
    wf[decode_id] = {"class_type": "VAEDecode", "inputs": {"samples": [sampler_id, 0], "vae": [vae_id, 0]}}
    save_id = _id()
    wf[save_id] = {"class_type": "SaveImage", "inputs": {"images": [decode_id, 0], "filename_prefix": filename_prefix}}

    return {"prompt": wf}


# ─── Volumes ──────────────────────────────────────────────────────────
# holly-flux2klein-weights: holds the Klein UNET single-file (shared with the
#   diffusers Klein endpoints — no duplicate download needed).
# holly-comfyui-models: holds the ComfyUI-format CLIP + VAE single-files
#   (downloaded on first run from Comfy-Org).
# holly-lora-weights: holds all LoRAs (shared with diffusers endpoints).
klein_volume = modal.Volume.from_name("holly-flux2klein-weights", create_if_missing=True)
model_volume = modal.Volume.from_name("holly-comfyui-models", create_if_missing=True)
lora_volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

# ─── Image: ComfyUI + dependencies ────────────────────────────────────
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    # PyTorch with CUDA 12.4
    .pip_install(
        "torch>=2.6.0",
        "torchvision",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    # Clone ComfyUI (latest — we patch the custom node instead of pinning)
    .run_commands(
        "git clone https://github.com/comfyanonymous/ComfyUI.git /root/ComfyUI",
    )
    # Install ComfyUI requirements (must use run_commands for -r flag)
    .run_commands(
        f"pip install -r /root/ComfyUI/requirements.txt",
    )
    # Install ControlNet custom node (comfyui-flux2fun-controlnet)
    # This provides Flux2FunControlNetLoader + Flux2FunControlNetApply nodes.
    # Patches ComfyUI's Flux model at runtime to support ControlNet hint injection.
    .run_commands(
        f"git clone https://github.com/bryanmcguire/comfyui-flux2fun-controlnet.git {CUSTOM_NODES_DIR}/comfyui-flux2fun-controlnet",
    )
    # Patch the custom node for latest ComfyUI compatibility (2 known errors):
    # 1. multigpu_clones: ComfyUI samplers.py:899 calls x['control'].multigpu_clones
    #    but ControlNetWrapper doesn't have it → add empty dict attribute
    # 2. timestep_zero_index: latest ComfyUI passes timestep_zero_index kwarg to
    #    patched_forward_orig but the node doesn't accept it → add the param
    .run_commands(
        # Fix 1: add multigpu_clones attribute to ControlNetWrapper.__init__
        f"sed -i '/self.previous_controlnet = None/a\\        self.multigpu_clones = {{}}' "
        f"{CUSTOM_NODES_DIR}/comfyui-flux2fun-controlnet/nodes.py",
        # Fix 2: add timestep_zero_index param to patched_forward_orig signature
        f"sed -i 's/attn_mask: Tensor = None,/attn_mask: Tensor = None,\\n        timestep_zero_index=None,/' "
        f"{CUSTOM_NODES_DIR}/comfyui-flux2fun-controlnet/flux_patch.py",
    )
    # Create model directories (ComfyUI expects these)
    .run_commands(
        f"mkdir -p {UNET_DIR} {CLIP_DIR} {VAE_DIR} {LORA_DIR} {CONTROLNET_DIR} {OUTPUT_DIR}",
    )
    # Additional deps for Klein + workflow + FastAPI endpoints
    .pip_install("huggingface_hub", "safetensors", "accelerate", "fastapi[standard]")
    # ── Refinement pass dependencies (ADetailer-style hand/face detection) ──
    # opencv-python-headless: PINNED to <5.0.0 — opencv 5.0.0 dropped the Haar
    # cascade XML files from the default install path, breaking face detection.
    # 4.x ships haarcascade_frontalface_default.xml at cv2.data.haarcascades.
    # numpy: array math for skin-tone matching and alpha masks
    # mediapipe: pinned to 0.10.14 — newer versions broke the solutions API
    #   (documented in scripts/extract-dwpose-modal.py). Load-bearing pin.
    #   Used for hand detection (21 keypoints per hand, high reliability).
    .pip_install(
        "opencv-python-headless>=4.10.0,<5.0.0",
        "numpy>=1.26.0",
        "mediapipe==0.10.14",
        "pillow",
    )
)


# ─── Helper: download Klein CLIP + VAE to volume (UNET already on Klein volume) ───
def download_models():
    """Download ComfyUI-format CLIP + VAE for Klein 9B if not cached.

    The UNET single-file is NOT downloaded here — it already lives on the
    holly-flux2klein-weights volume (placed there by the diffusers Klein
    endpoint). We only need the ComfyUI-format text encoder + VAE, which come
    from Comfy-Org/vae-text-encorder-for-flux-klein-9b (NOT gated).
    """
    from huggingface_hub import hf_hub_download
    import shutil

    clip_path = f"{MODEL_VOL}/clip/{CLIP_FILE}"
    vae_path = f"{MODEL_VOL}/vae/{VAE_FILE}"
    controlnet_path = f"{MODEL_VOL}/controlnet/{CONTROLNET_FILE}"

    os.makedirs(f"{MODEL_VOL}/clip", exist_ok=True)
    os.makedirs(f"{MODEL_VOL}/vae", exist_ok=True)
    os.makedirs(f"{MODEL_VOL}/controlnet", exist_ok=True)

    files_to_download = [
        (f"{CLIP_SUBPATH}/{CLIP_FILE}", clip_path, COMFYORG_KLEIN_REPO),
        (f"{VAE_SUBPATH}/{VAE_FILE}", vae_path, COMFYORG_KLEIN_REPO),
    ]

    for hf_path, dest, repo in files_to_download:
        filename = os.path.basename(hf_path)
        if os.path.exists(dest):
            print(f"✅ {filename} already cached")
        else:
            print(f"📥 Downloading {hf_path} from {repo}...")
            downloaded = hf_hub_download(
                repo_id=repo,
                filename=hf_path,
                local_dir=f"{MODEL_VOL}/_dl",
            )
            shutil.move(downloaded, dest)
            shutil.rmtree(f"{MODEL_VOL}/_dl", ignore_errors=True)
            print(f"✅ {filename} saved to volume")

    # ControlNet model (~8.3GB, from alibaba-pai)
    if os.path.exists(controlnet_path):
        print(f"✅ {CONTROLNET_FILE} already cached")
    else:
        print(f"📥 Downloading {CONTROLNET_FILE} from {CONTROLNET_REPO} (~8.3GB)...")
        downloaded = hf_hub_download(
            repo_id=CONTROLNET_REPO,
            filename=CONTROLNET_FILE,
            local_dir=f"{MODEL_VOL}/_dl",
        )
        shutil.move(downloaded, controlnet_path)
        shutil.rmtree(f"{MODEL_VOL}/_dl", ignore_errors=True)
        print(f"✅ {CONTROLNET_FILE} saved to volume")


def link_models_to_comfyui():
    """Symlink model files into ComfyUI's expected directories.

    UNET comes from the Klein volume (holly-flux2klein-weights).
    CLIP + VAE come from the ComfyUI models volume (holly-comfyui-models).
    """
    import shutil

    # UNET — from the Klein volume (bf16 single-file, shared with diffusers endpoints)
    unet_src = KLEIN_UNET_VOL_PATH
    unet_dst = f"{UNET_DIR}/{UNET_FILE}"
    if os.path.islink(unet_dst) or os.path.exists(unet_dst):
        os.unlink(unet_dst)
    if os.path.exists(unet_src):
        os.symlink(unet_src, unet_dst)
        print(f"✅ UNET linked: {unet_src} → {unet_dst}")
    else:
        print(f"❌ UNET not found at {unet_src} — Klein volume mount issue?")

    # CLIP
    clip_src = f"{MODEL_VOL}/clip/{CLIP_FILE}"
    clip_dst = f"{CLIP_DIR}/{CLIP_FILE}"
    if os.path.islink(clip_dst) or os.path.exists(clip_dst):
        os.unlink(clip_dst)
    if os.path.exists(clip_src):
        os.symlink(clip_src, clip_dst)

    # VAE
    vae_src = f"{MODEL_VOL}/vae/{VAE_FILE}"
    vae_dst = f"{VAE_DIR}/{VAE_FILE}"
    if os.path.islink(vae_dst) or os.path.exists(vae_dst):
        os.unlink(vae_dst)
    if os.path.exists(vae_src):
        os.symlink(vae_src, vae_dst)

    # ControlNet (alibaba-pai FLUX.2-dev-Fun-Controlnet-Union)
    controlnet_src = f"{MODEL_VOL}/controlnet/{CONTROLNET_FILE}"
    controlnet_dst = f"{CONTROLNET_DIR}/{CONTROLNET_FILE}"
    if os.path.islink(controlnet_dst) or os.path.exists(controlnet_dst):
        os.unlink(controlnet_dst)
    if os.path.exists(controlnet_src):
        os.symlink(controlnet_src, controlnet_dst)
        print(f"✅ ControlNet linked: {controlnet_src} → {controlnet_dst}")
    else:
        print(f"⚠️ ControlNet not found at {controlnet_src} — ControlNet generation unavailable")

    print(f"✅ Model files linked into ComfyUI directories")


# ─── Category-aware LoRA routing ──────────────────────────────────────
# Picks the LoRA stack for a given prompt, matching the decoded Civitai
# recipes from Steve's perfect reference images. Every stack starts with the
# proven v2-recipe baked layer (face @ 0.85 + body v1 @ 0.7) so identity is
# always preserved, then appends category-specific specialists.
#
# LoRA inventory (all on holly-lora-weights volume):
#   holly-face-v2.safetensors          — Holly face (baked, v2-recipe)
#   holly-body-v1.safetensors          — Holly body v1.0 (baked, v2-recipe)
#   SNOFS-Klein-9b-v1.4.safetensors    — NSFW unlock (lokr, general anatomy)
#   KLEIN-Unchained-V2.safetensors     — NSFW unlock (strips safety dampeners)
#   Holly-Masturbation-Klein9b-v1.safetensors — fingering/insertion geometry
#   pussydiffusion-f2-klein-9b_v2.safetensors — pussy closeup geometry
#   femaleasshole-f2-klein-9b-musubituner.safetensors — anus/rear geometry
#   FK_dildoinsertion.safetensors      — dildo insertion geometry
import re as _re_cat

# Keyword matchers per category (first-match-wins, most-specific first).
_CATEGORY_PATTERNS = [
    # ORDER MATTERS — most specific first, least specific last.
    # dildo_masturbation must come before masturbation and dildo alone,
    # because it combines both keywords and needs the dildo insertion LoRA.
    ("dildo_masturbation", _re_cat.compile(
        r"\b((?:masturbat\w*|touch\w*|pleasur\w*|slid\w*|push\w*|insert\w*|fuck\w*).{0,30}(?:dildo|toy|vibrator)|(?:dildo|toy|vibrator).{0,30}(?:masturbat\w*|inside|deep|pussy|penetrat\w*|insert\w*))\b",
        _re_cat.IGNORECASE)),
    # dildo alone — toy present but no masturbation context
    ("dildo", _re_cat.compile(
        r"\b(dildo|toy|vibrator|penetrat\w*|using\s+a\s*(?:dildo|toy))\b",
        _re_cat.IGNORECASE)),
    # masturbation / fingering — hand actions on body
    ("masturbation", _re_cat.compile(
        r"\b(masturbat\w*|fingering|finger\s*insert|insert\w*\s+(\w+\s+){0,3}finger|finger\w*\s+(inside|into|in)\s+(\w+\s+){0,2}(pussy|vagina|her)|touch\w*\s+(herself|yourself)|playing\s+with\s+(her\s+)?(pussy|clit|clitoris|vagina)|rubbing\s+(her\s+)?(pussy|clit|clitoris)|self\s*pleasur|hand\s+between)\b",
        _re_cat.IGNORECASE)),
    # spread / pussy closeup — MUST come after action categories
    ("spread", _re_cat.compile(
        r"\b(spread\w*|pussy\s*spread|spread\s*pussy|(pussy|vulva|clit)\s*close\s*up|(pussy|vulva|clit)\s*closeup|close\s*up\s*(pussy|vulva|clit)|vulva|labia)\b",
        _re_cat.IGNORECASE)),
    # bent_over / from behind — LEAST specific, comes last
    ("bent_over", _re_cat.compile(
        r"\b(bent\s*over|all\s*fours|on\s*(all\s*)?fours|doggy|doggiestyle|from\s*behind|rear\s*view|ass\s*in\s*the\s*air|looking\s*back)\b",
        _re_cat.IGNORECASE)),
]

# Specialist LoRA stacks per category — RESTORED 2026-08-06.
# These specialist LoRAs were trained by Steve on Civitai and produced
# "PERFECT" results in Smoke8 testing (documented in FACT.md):
#   FK_dildoinsertion @ 0.9    → PERFECT dildo penetration
#   femaleasshole-musubituner @ 0.8 → PERFECT bent-over/anal views
#   pussydiffusion @ 0.8       → PERFECT closeups/spreading
#   SEXGOD_FemaleMasturbation @ 0.8 → masturbation positions
#
# They were removed during a "simplification" that broke ALL explicit actions.
# combined-v1 handles identity; these specialists handle the ACTIONS.
_CATEGORY_STACKS = {
    # FACT.md LOCKED RECIPES — only Steve's own LoRAs, proven in Smoke8 testing.
    # These EXACT combos produced "PERFECT" results. Don't add anything else.
    "bent_over": [
        {"name": "femaleasshole-f2-klein-9b-musubituner.safetensors", "strength": 1.0},
    ],
    "dildo": [
        {"name": "FK_dildoinsertion.safetensors", "strength": 1.0},
    ],
    "dildo_masturbation": [
        {"name": "FK_dildoinsertion.safetensors", "strength": 1.0},
    ],
    "spread_poses": [
        {"name": "pussydiffusion-f2-klein-9b_v2.safetensors", "strength": 0.85},
    ],
    "closeup": [
        {"name": "pussydiffusion-f2-klein-9b_v2.safetensors", "strength": 1.0},
    ],
}


def select_loras_for_prompt(prompt: str, extra_loras: list = None) -> list:
    """Return the full LoRA stack for a prompt: baked v2-recipe layer + category specialists.

    Args:
        prompt: the user's generation prompt
        extra_loras: optional caller-specified LoRAs to append (highest priority)

    Returns:
        List of {"name": str, "strength": float} dicts, ordered for the
        ComfyUI LoraLoader chain (baked first, specialists after, extras last).
        Capped at 6 total (2 baked + up to 4 specialists/extras) to stay within
        ComfyUI's stable stacking range.
    """
    # LoRA selection (Steve's directive 2026-08-04):
    # PussyDiffusion ONLY for explicit/nude/sexual images. NEVER for SFW.
    # Simple rule: if nudity keywords present → PussyDiffusion. If not → no.
    # Three-tier LoRA selection (2026-08-05):
    # 1. Explicit actions (insertion, penetration, dildo, masturbation) → unlock + identity + anatomy
    # 2. Nude poses (naked, nude, no action) → identity + anatomy
    # 3. SFW (no nudity keywords) → identity only
    has_nudity = bool(_NUDE_RE.search(prompt))
    _EXPLICIT_RE = _re_clothing.compile(
        r'\b(masturbat\w*|fingering|finger\s*inside|penetrat|insert|dildo|'
        r'toy\s*inside|inside\s*her\s*(?:pussy|ass|anus)|'
        r'fucking|herself|riding\s+(?:a\s+)?(?:toy|dildo)|'
        r'spread.*pussy|pussy.*spread|anal|asshole|butthole|'
        r'cumming|orgasm|squirting|climax)\b',
        _re_clothing.IGNORECASE,
    )
    has_explicit = bool(_EXPLICIT_RE.search(prompt))

    if has_explicit:
        # Explicit action — uses Steve's own LoRAs only (FACT.md LOCKED RECIPES)
        # Generic LoRAs (UNLOCKED, SNOFS, Unchained) BANNED — cause identity drift.
        stack = list(V2_EXPLICIT_LORAS)
    elif has_nudity:
        # Nude pose — anatomy only, no unlock needed
        stack = list(V2_NUDE_LORAS)
    else:
        # SFW — identity only
        stack = list(V2_SFW_LORAS)

    # Detect category (first-match-wins)
    category = None
    for cat, pattern in _CATEGORY_PATTERNS:
        if pattern.search(prompt):
            category = cat
            break

    if category and category in _CATEGORY_STACKS:
        stack.extend(_CATEGORY_STACKS[category])

    # Append caller-specified extras (for future per-request overrides)
    if extra_loras:
        stack.extend(extra_loras)

    # Cap at 6 LoRAs (ComfyUI handles more, but stability drops past ~6)
    return stack[:6]


# ─── Helper: wait for ComfyUI to be ready ─────────────────────────────
def wait_for_comfyui(timeout: int = 120):
    """Wait for ComfyUI server to respond."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{COMFYUI_PORT}/system_stats")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    print("✅ ComfyUI server is ready")
                    return True
        except Exception:
            time.sleep(2)
    raise TimeoutError(f"ComfyUI did not become ready within {timeout}s")


# ─── GPU Class ────────────────────────────────────────────────────────
@app.cls(
    image=image,
    gpu="A100",
    max_containers=1,
    scaledown_window=120,
    timeout=600,
    startup_timeout=900,  # 15 min — CLIP/VAE download on first run (~7GB clip)
    volumes={
        KLEIN_VOL_MOUNT: klein_volume,
        MODEL_VOL: model_volume,
        LORA_VOL_MOUNT: lora_volume,
    },
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class HollyComfyUIKlein:
    """ComfyUI + FLUX.2 Klein 9B v2-recipe endpoint with category-aware LoRA routing."""

    @modal.enter()
    def startup(self):
        """Download CLIP/VAE (first run), link models, launch ComfyUI server."""
        print("═══ Holly ComfyUI Klein v2-recipe Startup ═══")

        # Step 1: Download ComfyUI-format CLIP + VAE for Klein (cached after first run).
        # The UNET single-file is NOT downloaded — it's on the Klein volume, symlinked next.
        download_models()
        model_volume.commit()

        # Step 2: Link model files into ComfyUI's expected directories
        # (UNET from Klein volume, CLIP+VAE from ComfyUI models volume)
        link_models_to_comfyui()

        # Step 3: Symlink LoRA volume into ComfyUI's loras directory
        # The holly-lora-weights volume is mounted at /lora; ComfyUI looks in models/loras/
        # Always replace the empty models/loras dir with a symlink to the volume
        import shutil
        if os.path.islink(LORA_DIR):
            os.unlink(LORA_DIR)
        if os.path.exists(LORA_DIR) and os.path.isdir(LORA_DIR):
            shutil.rmtree(LORA_DIR)
        os.symlink(LORA_VOL_MOUNT, LORA_DIR)
        print(f"✅ LoRA volume linked: {LORA_VOL_MOUNT} → {LORA_DIR}")

        # List available LoRAs for debugging
        try:
            lora_files = sorted([f for f in os.listdir(LORA_VOL_MOUNT) if f.endswith('.safetensors')])
            print(f"📋 LoRAs available: {len(lora_files)} files")
            for f in lora_files:
                print(f"   {f}")
        except Exception:
            pass

        # Step 4: Launch ComfyUI as background process
        print(f"🚀 Launching ComfyUI on port {COMFYUI_PORT}...")
        self.comfyui_proc = subprocess.Popen(
            [
                sys.executable, "main.py",
                "--listen", "127.0.0.1",
                "--port", str(COMFYUI_PORT),
                "--preview-method", "auto",
                "--output-directory", OUTPUT_DIR,
            ],
            cwd=COMFYUI_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env={**os.environ, "CUDA_VISIBLE_DEVICES": "0"},
        )

        # Step 5: Wait for ComfyUI to be ready
        wait_for_comfyui(timeout=180)

        # Print any startup output for debugging
        print("═══ ComfyUI Klein v2-recipe Ready ═══")

    @modal.exit()
    def shutdown(self):
        """Clean shutdown of ComfyUI subprocess."""
        if hasattr(self, 'comfyui_proc') and self.comfyui_proc.poll() is None:
            self.comfyui_proc.send_signal(signal.SIGTERM)
            self.comfyui_proc.wait(timeout=30)
            print("🛑 ComfyUI subprocess stopped")

    def _post_workflow(self, workflow: dict) -> str:
        """Submit workflow to ComfyUI, return prompt_id.

        On 400, ComfyUI returns a JSON body with the node-level validation
        error (e.g. {"error": {"node_id": ["message"]}}). We capture and
        surface that body so the actual problem is visible instead of a
        generic "HTTP Error 400".
        """
        data = json.dumps(workflow).encode("utf-8")
        req = urllib.request.Request(
            f"http://127.0.0.1:{COMFYUI_PORT}/prompt",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            return result["prompt_id"]
        except urllib.error.HTTPError as e:
            # Read ComfyUI's error body before re-raising
            err_body = ""
            try:
                err_body = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            print(f"❌ ComfyUI /prompt returned {e.code}: {err_body[:1000]}")
            raise RuntimeError(f"ComfyUI {e.code}: {err_body[:500]}") from e

    def _poll_history(self, prompt_id: str, timeout: int = 300) -> dict:
        """Poll /history/{prompt_id} until the job completes. Returns history entry."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                req = urllib.request.Request(
                    f"http://127.0.0.1:{COMFYUI_PORT}/history/{prompt_id}"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    history = json.loads(resp.read())

                if prompt_id in history:
                    entry = history[prompt_id]
                    # Check for errors
                    if "status" in entry and entry["status"].get("status_str") == "error":
                        raise RuntimeError(f"ComfyUI job failed: {entry['status'].get('messages', 'unknown error')}")
                    # Check if outputs exist
                    if "outputs" in entry and entry["outputs"]:
                        return entry
            except urllib.error.URLError:
                pass
            time.sleep(1)

        raise TimeoutError(f"ComfyUI job {prompt_id} did not complete within {timeout}s")

    def _fetch_image(self, history_entry: dict) -> bytes:
        """Fetch the generated image from ComfyUI's /view endpoint."""
        # Find the SaveImage output
        outputs = history_entry.get("outputs", {})
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                img_info = node_output["images"][0]
                filename = img_info["filename"]
                subfolder = img_info.get("subfolder", "")
                img_type = img_info.get("type", "output")

                url = (
                    f"http://127.0.0.1:{COMFYUI_PORT}/view?"
                    f"filename={filename}&subfolder={subfolder}&type={img_type}"
                )
                with urllib.request.urlopen(url, timeout=30) as resp:
                    return resp.read()

        raise RuntimeError("No image found in ComfyUI output")

    # ─────────────────────────────────────────────────────────────────────
    # ADetailer-style refinement pass (hands, feet, faces)
    # ─────────────────────────────────────────────────────────────────────
    # After main generation, detect anatomical regions and re-render each at
    # high resolution to fix digit counts and identity drift. Conservative
    # denoise (0.55) avoids the "plastic" over-processing that disabled the
    # diffusers face-enhance (FACT.md lesson, June 27 2026).
    # Detection: Haar cascade for faces (proven), DWPose for hands/feet.

    def _upload_image(self, img_bytes: bytes, filename: str = None) -> str:
        """Upload an image to ComfyUI's input/ dir via /upload/image.

        Returns the filename ComfyUI stored it as (for LoadImage node).
        Uses multipart form-data per ComfyUI's upload API.
        """
        import uuid as _uuid
        if filename is None:
            filename = f"refine_{_uuid.uuid4().hex[:8]}.png"

        # Build multipart form data manually (avoid extra deps)
        boundary = f"----HolLyBoundary{_uuid.uuid4().hex}"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
            f"Content-Type: image/png\r\n\r\n"
        ).encode("utf-8") + img_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        req = urllib.request.Request(
            f"http://127.0.0.1:{COMFYUI_PORT}/upload/image",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        # ComfyUI returns {"name": filename, "subfolder": "", "type": "input"}
        return result.get("name", filename)

    def _detect_face_bbox(self, pil_img):
        """Detect the largest face via OpenCV Haar cascades.
        Ported verbatim from image_generate_flux2klein_a100.py lines 650-689.
        Returns (x, y, w, h) or None.
        """
        import cv2
        import numpy as np

        arr = np.array(pil_img.convert("RGB"))
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)

        frontal_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        profile_path = cv2.data.haarcascades + "haarcascade_profileface.xml"

        frontal = cv2.CascadeClassifier(frontal_path)
        profile = cv2.CascadeClassifier(profile_path)

        min_size = (60, 60)
        faces = []
        for sf in (1.05, 1.1, 1.2):
            found = frontal.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=min_size)
            if len(found):
                faces.extend(found)

        if not faces:
            for sf in (1.05, 1.1):
                found = profile.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=min_size)
                if len(found):
                    faces.extend(found)
                flipped = cv2.flip(gray, 1)
                found_r = profile.detectMultiScale(flipped, scaleFactor=sf, minNeighbors=5, minSize=min_size)
                if len(found_r):
                    w_img = gray.shape[1]
                    for (x, y, w, h) in found_r:
                        faces.append((w_img - x - w, y, w, h))

        if not faces:
            return None

        best = max(faces, key=lambda f: f[2] * f[3])
        return tuple(int(v) for v in best)

    def _face_crop_region(self, img_w, img_h, bbox, crop_factor=3.0):
        """Square crop centered on face. Ported from a100 lines 691-721."""
        x, y, fw, fh = bbox
        cx = x + fw // 2
        cy = y + fh // 2
        side = int(fw * crop_factor)
        half = side // 2

        x0 = cx - half
        y0 = cy - half
        x1 = cx + half
        y1 = cy + half

        x0 = max(0, x0)
        y0 = max(0, y0)
        x1 = min(img_w, x1)
        y1 = min(img_h, y1)

        actual_side = min(x1 - x0, y1 - y0)
        x1 = x0 + actual_side
        y1 = y0 + actual_side

        return (x0, y0, x1, y1), actual_side

    def _build_paste_alpha(self, side, feather_ratio=0.18):
        """Feathered alpha mask for seamless paste. Ported from a100 lines 723-755."""
        import cv2
        import numpy as np

        feather = max(8, int(side * feather_ratio))
        mask = np.zeros((side, side), dtype=np.uint8)
        cv2.rectangle(mask, (feather, feather), (side - feather, side - feather), 255, thickness=-1)
        dist = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
        max_dist = feather
        alpha = (dist.clip(0, max_dist) / max_dist * 255).astype(np.uint8)
        alpha = cv2.GaussianBlur(alpha, (feather * 2 + 1, feather * 2 + 1), feather / 3)
        return alpha

    def _match_skin_tone(self, source_crop, enhanced_crop):
        """RGB mean-shift color match. Ported from a100 lines 855-879."""
        import numpy as np
        from PIL import Image

        src = np.array(source_crop.convert("RGB")).astype(np.float32)
        enh = np.array(enhanced_crop.convert("RGB")).astype(np.float32)
        src_mean = src.mean(axis=(0, 1))
        enh_mean = enh.mean(axis=(0, 1))
        delta = src_mean - enh_mean
        matched = enh + delta * 0.5
        matched = matched.clip(0, 255).astype(np.uint8)
        return Image.fromarray(matched, mode="RGB")

    def _check_image_quality(self, img_bytes):
        """Quick quality check on a generated image. Returns (passes, reason).

        Uses MediaPipe to count hands — more than 2 hands = likely conjoined/
        duplicated subject. Returns True if the image passes basic anatomy check.

        This is the auto-reject filter for multi-generation: if an image has
        >2 hands or >1 body, it's rejected and we try the next seed.
        """
        try:
            import io
            from PIL import Image
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            hands, feet, body_count = self._detect_hand_and_foot_regions(pil_img)
            if body_count > 1:
                return False, f"{body_count} bodies detected (conjoined)"
            if len(hands) > 2:
                return False, f"{len(hands)} hands detected (extra limbs)"
            return True, f"OK ({len(hands)} hands, {body_count} body)"
        except Exception as e:
            # If detection fails, don't reject — return the image
            return True, f"detection skipped ({e})"

    def _generate_single(self, prompt, width, height, seed, loras, steps, cfg):
        """Generate a single image via ComfyUI. Returns (img_bytes, prompt_id)."""
        job_id = str(uuid.uuid4())[:8]
        workflow = build_workflow(
            prompt=prompt,
            width=min(width, 1536),
            height=min(height, 1536),
            seed=seed,
            loras=loras,
            steps=steps,
            cfg=cfg,
            filename_prefix=f"Holly_{job_id}",
        )
        prompt_id = self._post_workflow(workflow)
        history = self._poll_history(prompt_id, timeout=300)
        img_bytes = self._fetch_image(history)
        return img_bytes, prompt_id, job_id

    def _load_hand_detector(self):
        """Lazy-load MediaPipe Hands detector (cached on instance).
        Uses the solutions API (mediapipe==0.10.14 pinned — newer versions
        dropped this API)."""
        if hasattr(self, '_hand_detector') and self._hand_detector is not None:
            return self._hand_detector
        try:
            import mediapipe as mp
            print("📥 Loading MediaPipe Hands detector (first use)...")
            self._hand_detector = mp.solutions.hands.Hands(
                static_image_mode=True,
                max_num_hands=4,
                min_detection_confidence=0.25,  # lowered from 0.4 — MediaPipe
                # struggles with hands near explicit content; lower threshold
                # catches more (may add false positives, but refinement is safe)
            )
            print("✅ MediaPipe Hands detector loaded")
        except Exception as e:
            print(f"⚠️ MediaPipe Hands load failed: {e}")
            self._hand_detector = None
        return self._hand_detector

    def _detect_hand_and_foot_regions(self, pil_img):
        """Detect hand and foot regions via MediaPipe Hands.

        Returns (hands, feet, body_count) where each is a list of (x0, y0, x1, y1).
        body_count is used for conjoined-twin detection (>2 hands detected in a
        single-subject prompt may indicate duplicated/conjoined subject).

        MediaPipe Hands returns 21 keypoints per detected hand with high
        reliability. Feet are NOT detected here (no reliable off-the-shelf
        foot detector) — feet refinement is best-effort via body pose, which
        we approximate by checking for foot-like regions near the bottom edge.
        For now feet detection returns empty (can be extended later).
        """
        import numpy as np

        hands_detector = self._load_hand_detector()
        if hands_detector is None:
            return [], [], 1

        w_img, h_img = pil_img.size
        hands = []

        try:
            import cv2
            # MediaPipe expects RGB numpy array
            rgb = np.array(pil_img.convert("RGB"))
            results = hands_detector.process(rgb)

            if results.multi_hand_landmarks:
                for hand_lms in results.multi_hand_landmarks:
                    # 21 landmarks; derive bbox from normalized coords
                    xs = [lm.x for lm in hand_lms.landmark]
                    ys = [lm.y for lm in hand_lms.landmark]
                    # Convert to pixel coords
                    x_min = int(min(xs) * w_img)
                    x_max = int(max(xs) * w_img)
                    y_min = int(min(ys) * h_img)
                    y_max = int(max(ys) * h_img)
                    # Padding around hand
                    pad = 25
                    hands.append((
                        max(0, x_min - pad),
                        max(0, y_min - pad),
                        min(w_img, x_max + pad),
                        min(h_img, y_max + pad),
                    ))

            # Conjoined-twin heuristic: if we detect >2 hands on a single
            # subject, the subject may be duplicated (each person has 2 hands).
            body_count = 1
            if len(hands) > 2:
                body_count = (len(hands) + 1) // 2  # ~estimate
                print(f"  ⚠️ {len(hands)} hands detected — possible conjoined/duplicated subject")

        except Exception as e:
            print(f"⚠️ Hand detection error: {e}")

        # Feet: no reliable detector. Return empty for now.
        # Future: could use MediaPipe Pose (full body) for ankle→foot keypoints.
        feet = []

        return hands, feet, body_count

        return hands, feet, max(body_count, 1)

    def _refine_region(self, pil_img, region, region_type, prompt, loras, seed=None):
        """Refine a single region (face/hand/foot) via ComfyUI inpaint.

        Returns (refined_pil, status_string) or (None, error_string).
        """
        import io
        from PIL import Image

        w_img, h_img = pil_img.size
        x0, y0, x1, y1 = region
        crop_w = x1 - x0
        crop_h = y1 - y0

        # Make it square for the inpaint (ComfyUI handles arbitrary sizes, but
        # square is simpler and matches the diffusers face-enhance pattern)
        side = min(crop_w, crop_h)
        # Expand to square centered on the region center
        cx = (x0 + x1) // 2
        cy = (y0 + y1) // 2
        half = side // 2
        sx0 = max(0, cx - half)
        sy0 = max(0, cy - half)
        sx1 = min(w_img, cx + half)
        sy1 = min(h_img, cy + half)
        # Re-square after clamping
        actual_side = min(sx1 - sx0, sy1 - sy0)
        sx1 = sx0 + actual_side
        sy1 = sy0 + actual_side

        if actual_side < 60:
            return None, f"skipped ({region_type} crop too small: {actual_side}px)"

        # Crop
        crop_orig = pil_img.convert("RGB").crop((sx0, sy0, sx1, sy1))

        # Upscale to 768 for refinement (more pixel budget for digit geometry)
        REFINE_SIZE = 768
        crop_up = crop_orig.resize((REFINE_SIZE, REFINE_SIZE), Image.LANCZOS)

        # Region-specific prompt
        if region_type == "face":
            region_prompt = (
                f"{prompt}, extreme close-up headshot portrait, sharp detailed facial "
                f"features, crisp eyes, professional portrait photography, photorealistic"
            )
            feather_ratio = 0.22
        elif region_type == "hand":
            region_prompt = (
                f"{prompt}, close-up of a hand, small petite delicate hand, exactly five "
                f"fingers, slender fingers, natural knuckle wrinkles, photorealistic hand detail"
            )
            feather_ratio = 0.14
        elif region_type == "foot":
            region_prompt = (
                f"{prompt}, close-up of a foot, small petite feminine foot (size 5), exactly "
                f"five toes, high arch, tapered toes, photorealistic foot detail"
            )
            feather_ratio = 0.14
        else:
            region_prompt = prompt
            feather_ratio = 0.18

        # IDENTITY-PRESERVING LoRA FILTER for face refinement.
        # NSFW specialist LoRAs (Unchained, SNOFS, dildo, femaleasshole, etc.)
        # are trained on body/genital anatomy — loading them during FACE
        # re-render pulls the face away from Holly (Steve flagged this as the
        # #1 issue on dildo + bent-over tests). For face refinement, use ONLY
        # the identity LoRAs (holly-face + holly-body). This matches how
        # ADetailer is used in practice — the detailer pass for faces drops
        # the pose/anatomy LoRAs.
        region_loras = loras
        if region_type == "face":
            identity_only = [
                l for l in loras
                if "holly-face" in l["name"] or "holly-body" in l["name"]
            ]
            if identity_only:
                region_loras = identity_only
                print(f"   Face refinement: using identity-only LoRAs {[(l['name'], l['strength']) for l in region_loras]}")
            else:
                region_loras = list(V2_BAKED_LORAS)

        # Upload crop to ComfyUI
        buf = io.BytesIO()
        crop_up.save(buf, format="PNG")
        crop_bytes = buf.getvalue()
        try:
            uploaded_name = self._upload_image(crop_bytes)
        except Exception as e:
            return None, f"upload failed: {e}"

        # Build inpaint workflow (region-filtered LoRA stack for identity safety)
        workflow = build_inpaint_workflow(
            image_filename=uploaded_name,
            prompt=region_prompt,
            width=REFINE_SIZE,
            height=REFINE_SIZE,
            loras=region_loras,
            seed=seed,
            denoise=0.55,
            steps=12,
            filename_prefix=f"Holly_refine_{region_type}",
        )

        try:
            prompt_id = self._post_workflow(workflow)
            history = self._poll_history(prompt_id, timeout=120)
            refined_bytes = self._fetch_image(history)
        except Exception as e:
            return None, f"inpaint failed: {e}"

        # Decode refined image
        refined_up = Image.open(io.BytesIO(refined_bytes)).convert("RGB")

        # Resize back to crop dimensions
        refined_orig = refined_up.resize((actual_side, actual_side), Image.LANCZOS)

        # Skin-tone match
        try:
            refined_orig = self._match_skin_tone(crop_orig, refined_orig)
        except Exception:
            pass

        # Feathered paste
        alpha = self._build_paste_alpha(actual_side, feather_ratio=feather_ratio)
        alpha_pil = Image.fromarray(alpha, mode="L")

        final = pil_img.convert("RGB").copy()
        final.paste(refined_orig, (sx0, sy0), alpha_pil)

        return final, f"refined {region_type} ({actual_side}px)"

    def _run_refinement_pass(self, pil_img, prompt, loras, seed=None):
        """Run the full ADetailer-style refinement pass.

        Detects faces, hands, and feet, then refines each. Returns
        (refined_pil, regions_refined_list, reroll_recommended_bool).
        """
        import numpy as np
        from PIL import Image

        refined = pil_img
        regions_done = []
        reroll = False

        # 1. Detect conjoined-twin case (body count > 1 = re-roll needed)
        hands, feet, body_count = self._detect_hand_and_foot_regions(pil_img)
        if body_count > 1:
            print(f"⚠️ DWPose detected {body_count} bodies — conjoined-twin likely. Flagging for re-roll.")
            reroll = True
            # Still attempt face/hand refinement — may partially help

        # 2. Detect faces (Haar cascade — proven, fast)
        face_bbox = self._detect_face_bbox(pil_img)
        face_region = None
        if face_bbox:
            face_region, _ = self._face_crop_region(
                pil_img.size[0], pil_img.size[1], face_bbox, crop_factor=3.0
            )

        # 3. Refine face first (largest region, most identity impact)
        if face_region:
            try:
                refined, status = self._refine_region(
                    refined, face_region, "face", prompt, loras, seed
                )
                if refined is not None:
                    regions_done.append("face")
                    print(f"  ✨ {status}")
            except Exception as e:
                print(f"  ⚠️ Face refinement failed: {e}")

        # 4. Refine hands (up to 2 — the digit-count problem is mainly here)
        for i, hand_region in enumerate(hands[:2]):
            try:
                refined, status = self._refine_region(
                    refined, hand_region, "hand", prompt, loras, seed
                )
                if refined is not None:
                    regions_done.append(f"hand{i+1}")
                    print(f"  ✨ {status}")
            except Exception as e:
                print(f"  ⚠️ Hand {i+1} refinement failed: {e}")

        # 5. Refine feet (weakest detection — best-effort)
        for i, foot_region in enumerate(feet[:2]):
            try:
                refined, status = self._refine_region(
                    refined, foot_region, "foot", prompt, loras, seed
                )
                if refined is not None:
                    regions_done.append(f"foot{i+1}")
                    print(f"  ✨ {status}")
            except Exception as e:
                print(f"  ⚠️ Foot {i+1} refinement failed: {e}")

        return refined, regions_done, reroll

    @modal.fastapi_endpoint(method="POST", label="generate-comfyui-klein")
    def generate(self, request: dict) -> bytes:
        """
        Generate an image using FLUX.2 Klein 9B via ComfyUI with the v2-recipe
        (face @ 0.8 + body v1 @ 0.8 + 12 steps + CFG 1) and category-aware LoRA
        routing.

        The endpoint automatically builds the LoRA stack from the prompt.
        Only Steve's own LoRAs are used (FACT.md LOCKED RECIPES):
          - Always: holly-combined-v1 @ 0.9 (identity base)
          - explicit dildo: + pussydiffusion @ 0.8 + FK_dildoinsertion @ 1.0
          - bent_over: + pussydiffusion @ 0.8 + femaleasshole @ 1.0
          - spread/closeup: + pussydiffusion @ 0.85-1.0
          - nude pose: + pussydiffusion @ 0.8
          - SFW: combined-v1 only

        Request body:
            prompt: str — the image prompt
            width: int — image width (default 1024)
            height: int — image height (default 1024)
            seed: int — random seed (optional)
            loras: list — OPTIONAL caller-specified extras to append
            steps: int — inference steps (default 12, v2-recipe)
            cfg: float — CFG scale (default 1.0, v2-recipe)
            disable_routing: bool — if true, use only the provided loras (no
                             category routing). Defaults to false.

        Returns:
            Raw image bytes (PNG).
        """
        from fastapi import Response

        raw_prompt = request.get("prompt", "")
        width = request.get("width", 1024)
        height = request.get("height", 1024)
        seed = request.get("seed")
        caller_loras = request.get("loras", [])
        steps = request.get("steps", V2_STEPS)
        cfg = request.get("cfg", V2_CFG)
        # ADetailer-style refinement: OFF by default (same caution as diffusers
        # face-enhance, disabled June 27 for over-processing). Enable explicitly.
        enhance_details = request.get("enhance_details", False)

        # Inject anatomy anchors into every prompt to enforce Holly's exact
        # proportions (small hands, size 5 feet, 5 fingers/toes, olive skin).
        # These counteract Klein's tendency toward extra digits and oversize
        # hands/feet, and prevent skin-tone drift when NSFW LoRAs are stacked.
        prompt = f"{raw_prompt}, {get_anatomy_anchors(raw_prompt)}" if raw_prompt else get_anatomy_anchors(raw_prompt)

        # VARIATION INJECTION (2026-08-01): Steve flagged "same images every time."
        # Even with random seeds, identical prompts produce similar compositions.
        # Inject random variation in camera angle, lighting, and expression so
        # each generation feels fresh and unique.
        import random as _var_rng
        _ANGLES = [
            "straight-on camera angle", "slightly from above", "slightly from below",
            "three-quarter angle", "side angle", "looking over shoulder camera angle",
        ]
        _LIGHTING = [
            "warm golden hour lighting", "soft diffused studio lighting",
            "bright natural daylight", "moody low-key lighting",
            "warm bedside lamp lighting", "cool blue hour lighting",
        ]
        _EXPRESSIONS = [
            "soft genuine smile", "confident expression", "playful smirk",
            "relaxed content expression", "slightly surprised look",
            "warm affectionate gaze", "thoughtful expression",
        ]
        _variation = f"{_var_rng.choice(_ANGLES)}, {_var_rng.choice(_LIGHTING)}, {_var_rng.choice(_EXPRESSIONS)}"
        prompt = f"{prompt}, {_variation}"

        disable_routing = request.get("disable_routing", False)

        if not prompt:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="prompt is required")

        # Build the LoRA stack: category routing (default) or caller-only
        if disable_routing:
            loras = caller_loras if caller_loras else list(V2_BAKED_LORAS)
            routing_info = "disabled (caller loras only)"
        else:
            loras = select_loras_for_prompt(prompt, caller_loras)
            # Detect which category matched (for the header)
            routing_info = "default (baked only)"
            for cat, pattern in _CATEGORY_PATTERNS:
                if pattern.search(prompt):
                    routing_info = cat
                    break

        print(f"🎨 [{routing_info}] prompt: {prompt[:100]}")
        print(f"   LoRA stack: {[(l['name'], l['strength']) for l in loras]}")

        # ── Multi-generation for explicit/complex actions ──
        # Complex explicit actions (insertion, dildo, spreading) have a ~30%
        # success rate per generation due to diffusion composition limits.
        # Generate up to 3 with different seeds, auto-reject broken ones
        # (detected via MediaPipe: >2 hands or >1 body = reject), return first clean.
        # Simple prompts (face, standing) always single-gen (they work first time).
        is_explicit = routing_info in ("masturbation", "spread", "dildo", "bent_over")
        max_attempts = 3 if is_explicit else 1

        # Caller can override: quality_mode = "fast" (1 gen) or "best" (3 gen)
        quality_mode = request.get("quality_mode", "auto")
        if quality_mode == "fast":
            max_attempts = 1
        elif quality_mode == "best":
            max_attempts = 3

        import random as _rng
        base_seed = seed if seed is not None else _rng.randint(0, 2**63 - 1)

        try:
            img_bytes = None
            prompt_id = None
            job_id = None
            attempts_made = 0
            reject_reason = ""

            for attempt in range(max_attempts):
                attempt_seed = base_seed + attempt * 1000000  # different seed each try
                attempts_made += 1
                print(f"   Generation {attempt+1}/{max_attempts} (seed={attempt_seed})...")

                img_bytes, prompt_id, job_id = self._generate_single(
                    prompt, width, height, attempt_seed, loras, steps, cfg
                )

                # Quality check (auto-reject broken images)
                if max_attempts > 1:
                    passes, reason = self._check_image_quality(img_bytes)
                    print(f"   Quality check: {reason}")
                    if passes:
                        print(f"   ✅ Accepted on attempt {attempt+1}")
                        break
                    else:
                        reject_reason = reason
                        print(f"   ❌ Rejected: {reason}")
                        if attempt < max_attempts - 1:
                            print(f"   → Trying next seed...")
                        continue
                else:
                    break  # single-gen mode, accept whatever we get

            if img_bytes is None:
                raise RuntimeError("All generation attempts failed")

            # ── ADetailer-style refinement pass (hands, feet, faces) ──
            # Optional, gated by enhance_details flag. Detects anatomical regions
            # and re-renders each at high resolution to fix digit counts.
            refined_regions = "none"
            reroll_recommended = False
            if enhance_details:
                try:
                    import io
                    from PIL import Image
                    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                    print(f"✨ Running refinement pass (enhance_details=true)...")
                    refined, regions_done, reroll = self._run_refinement_pass(
                        pil_img, prompt, loras, seed
                    )
                    refined_regions = ",".join(regions_done) if regions_done else "none"
                    reroll_recommended = reroll
                    if regions_done:
                        # Re-encode the refined image
                        buf = io.BytesIO()
                        refined.save(buf, format="PNG")
                        img_bytes = buf.getvalue()
                        print(f"   Refined: {refined_regions}")
                    else:
                        print(f"   No regions refined (detection found nothing)")
                except Exception as re:
                    print(f"⚠️ Refinement pass failed (returning unrefined): {re}")
                    refined_regions = f"error: {str(re)[:60]}"

            return Response(
                content=img_bytes,
                media_type="image/png",
                headers={
                    "X-Model": "FLUX.2-Klein-9B-via-ComfyUI-v2-recipe",
                    "X-Provider": "holly-comfyui-klein",
                    "X-Routing": routing_info,
                    "X-Lora-Count": str(len(loras)),
                    "X-Attempts": str(attempts_made),
                    "X-Seed": str(base_seed),
                    "X-Refined-Regions": refined_regions.encode("ascii", "replace").decode("ascii")[:80],
                    "X-Reroll-Recommended": "true" if reroll_recommended else "false",
                    "X-Job-Id": job_id,
                    "X-Prompt-Id": prompt_id,
                    "Access-Control-Allow-Origin": "*",
                },
            )
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail=f"Generation failed: {str(e)}")

    @modal.fastapi_endpoint(method="POST", label="generate-pose-guided")
    def generate_pose_guided(self, request: dict) -> bytes:
        """
        Pose-guided generation — uses a reference pose image to guide composition.

        This bypasses Klein's block on explicit sexual actions. Instead of
        text-only generation (which can't compose penetration/insertion), we
        load a reference pose image and sample at low denoise (0.35) so Klein
        follows the pose structure but re-renders it as Holly.

        Request body:
            prompt: str — description (identity + lighting/style only)
            pose_ref: str — filename of reference pose in pose-refs/ on the
                            LoRA volume (e.g. "dildo_dildo_004.webp")
            denoise: float — 0.35 default. Lower = more faithful to pose.
            width, height, seed, loras, steps, cfg — same as generate()

        Returns:
            Raw image bytes (PNG).
        """
        from fastapi import Response

        raw_prompt = request.get("prompt", "")
        pose_ref = request.get("pose_ref", "")
        denoise = float(request.get("denoise", 0.50))
        width = request.get("width", 1024)
        height = request.get("height", 1024)
        seed = request.get("seed")
        caller_loras = request.get("loras", [])
        steps = request.get("steps", V2_STEPS)
        cfg = request.get("cfg", V2_CFG)

        if not raw_prompt:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="prompt is required")
        if not pose_ref:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="pose_ref is required (filename in pose-refs/)")

        # Build the LoRA stack — use select_loras_for_prompt for explicit detection
        # This ensures specialist LoRAs (FK_dildoinsertion, etc.) load for explicit prompts
        loras = caller_loras if caller_loras else select_loras_for_prompt(raw_prompt)
        prompt = f"{raw_prompt}, {get_anatomy_anchors(raw_prompt)}" if raw_prompt else get_anatomy_anchors(raw_prompt)

        # The pose reference is on the LoRA volume at /lora/pose-refs/{pose_ref}
        # ComfyUI's LoraLoader reads from models/loras/ (symlinked to /lora)
        # But LoadImage reads from ComfyUI's input/ directory — we need to
        # upload the pose image to ComfyUI's input/ first.
        pose_path = f"{LORA_VOL_MOUNT}/pose-refs/{pose_ref}"
        if not os.path.exists(pose_path):
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"pose_ref not found: {pose_ref}")

        # Read and upload the pose image to ComfyUI's input/ directory
        with open(pose_path, 'rb') as f:
            pose_bytes = f.read()
        uploaded_name = self._upload_image(pose_bytes)

        job_id = str(uuid.uuid4())[:8]
        workflow = build_pose_guided_workflow(
            pose_image_filename=uploaded_name,
            prompt=prompt,
            width=min(width, 1536),
            height=min(height, 1536),
            seed=seed,
            loras=loras,
            denoise=denoise,
            steps=steps,
            cfg=cfg,
            filename_prefix=f"Holly_pose_{job_id}",
        )

        print(f"🎨 [pose-guided] ref={pose_ref} denoise={denoise} prompt: {prompt[:80]}")
        print(f"   LoRA stack: {[(l['name'], l['strength']) for l in loras]}")

        try:
            prompt_id = self._post_workflow(workflow)
            history = self._poll_history(prompt_id, timeout=300)
            img_bytes = self._fetch_image(history)

            return Response(
                content=img_bytes,
                media_type="image/png",
                headers={
                    "X-Model": "FLUX.2-Klein-9B-pose-guided",
                    "X-Provider": "holly-comfyui-klein",
                    "X-Pose-Ref": pose_ref,
                    "X-Denoise": str(denoise),
                    "X-Lora-Count": str(len(loras)),
                    "X-Job-Id": job_id,
                    "X-Prompt-Id": prompt_id,
                    "Access-Control-Allow-Origin": "*",
                },
            )
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail=f"Generation failed: {str(e)}")

    @modal.fastapi_endpoint(method="POST", label="generate-controlnet")
    def generate_controlnet(self, request: dict) -> bytes:
        """Generate using ControlNet pose skeleton guidance.

        Unlike the pose-guided (img2img) endpoint which TRACES a reference photo,
        this endpoint takes a DWPose SKELETON (stick figure) and generates a
        completely new image around it. Klein creates fresh lighting, skin,
        expression, and details while the skeleton ensures correct pose geometry.

        Request body:
            pose_skeleton: str — path to .pose.png on the lora volume
                             (e.g. "action-poses/01_dildo_pussy/01_dildo_pussy.pose.png")
            prompt: str — the generation prompt
            width: int — default 1024
            height: int — default 1024
            seed: int — optional
            loras: list — optional caller-specified LoRAs (defaults to auto-routing)
            controlnet_strength: float — default 0.7 (range 0.0-2.0)
        """
        from fastapi import Response
        import uuid

        pose_path = request.get("pose_skeleton", "")
        raw_prompt = request.get("prompt", "")
        width = request.get("width", 1024)
        height = request.get("height", 1024)
        seed = request.get("seed")
        caller_loras = request.get("loras", [])
        cn_strength = request.get("controlnet_strength", 0.7)
        steps = request.get("steps", V2_STEPS)
        cfg = request.get("cfg", V2_CFG)

        if not pose_path:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="pose_skeleton is required")
        if not raw_prompt:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="prompt is required")

        # Resolve skeleton path on the lora volume
        full_skeleton_path = f"{LORA_VOL_MOUNT}/{pose_path}"
        if not os.path.exists(full_skeleton_path):
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Skeleton not found: {pose_path}")

        # ComfyUI's LoadImage node only reads from its input/ directory.
        # Copy the skeleton there with a unique name to avoid collisions.
        import shutil
        os.makedirs(INPUT_DIR, exist_ok=True)
        skeleton_basename = os.path.basename(full_skeleton_path)
        input_skeleton = f"{INPUT_DIR}/{skeleton_basename}"
        shutil.copy2(full_skeleton_path, input_skeleton)

        # Build prompt with anatomy anchors
        prompt = f"{raw_prompt}, {get_anatomy_anchors(raw_prompt)}" if raw_prompt else get_anatomy_anchors(raw_prompt)

        # Build LoRA stack (auto-route or caller-specified)
        if caller_loras:
            loras = caller_loras
        else:
            loras = select_loras_for_prompt(prompt)

        job_id = str(uuid.uuid4())[:8]
        print(f"🎨 [controlnet] skeleton={pose_path}")
        print(f"   prompt: {prompt[:100]}")
        print(f"   LoRA stack: {[(l['name'], l['strength']) for l in loras]}")
        print(f"   ControlNet strength: {cn_strength}")

        # Build the ControlNet workflow (LoadImage reads from input/ by filename)
        workflow = build_controlnet_workflow(
            pose_skeleton_path=skeleton_basename,
            prompt=prompt,
            width=min(width, 1536),
            height=min(height, 1536),
            seed=seed,
            loras=loras,
            steps=steps,
            cfg=cfg,
            controlnet_strength=cn_strength,
            filename_prefix=f"Holly_cn_{job_id}",
        )

        prompt_id = self._post_workflow(workflow)
        history = self._poll_history(prompt_id, timeout=300)
        img_bytes = self._fetch_image(history)

        print(f"✅ ControlNet generation complete — {len(img_bytes):,} bytes")

        return Response(
            content=img_bytes,
            media_type="image/png",
            headers={
                "X-Model": "FLUX.2-Klein-9B-Distilled-ControlNet",
                "X-Provider": "holly-comfyui-klein",
                "X-Mode": "controlnet-pose",
                "X-Skeleton": pose_path,
                "X-ControlNet-Strength": str(cn_strength),
                "X-Lora-Count": str(len(loras)),
                "X-Seed": str(seed) if seed else "random",
                "X-Job-Id": job_id,
                "X-Prompt-Id": prompt_id,
                "Access-Control-Allow-Origin": "*",
            },
        )

    def health(self):
        """Health check — confirms ComfyUI is alive + Klein model is loaded."""
        import socket

        # Check if ComfyUI process is alive
        proc_alive = hasattr(self, 'comfyui_proc') and self.comfyui_proc.poll() is None

        # Check if we can reach ComfyUI's API
        comfyui_reachable = False
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{COMFYUI_PORT}/system_stats")
            with urllib.request.urlopen(req, timeout=5) as resp:
                comfyui_reachable = resp.status == 200
        except Exception:
            pass

        # Check model files exist (UNET from Klein volume, CLIP+VAE from ComfyUI volume)
        unet_present = os.path.exists(f"{UNET_DIR}/{UNET_FILE}")
        clip_present = os.path.exists(f"{CLIP_DIR}/{CLIP_FILE}")
        vae_present = os.path.exists(f"{VAE_DIR}/{VAE_FILE}")
        models_present = all([unet_present, clip_present, vae_present])

        # Check key LoRAs present — ONLY Steve's own LoRAs (FACT.md rule #7)
        # Generic LoRAs (SNOFS, Unchained, FLUX2_KLEIN_UNLOCKED) are BANNED
        # because they cause identity drift.
        key_loras = [
            "holly-combined-v1.safetensors",
            "pussydiffusion-f2-klein-9b_v2.safetensors",
            "FK_dildoinsertion.safetensors",
            "femaleasshole-f2-klein-9b-musubituner.safetensors",
        ]
        loras_present = {name: os.path.exists(f"{LORA_DIR}/{name}") for name in key_loras}

        status = "healthy" if (proc_alive and comfyui_reachable and models_present) else "degraded"

        return {
            "status": status,
            "comfyui_process": "alive" if proc_alive else "dead",
            "comfyui_api": "reachable" if comfyui_reachable else "unreachable",
            "models": "loaded" if models_present else "missing",
            "model_files": {
                "unet": unet_present,
                "clip": clip_present,
                "vae": vae_present,
            },
            "key_loras": loras_present,
            "model": "FLUX.2-Klein-9B-Distilled",
            "backend": "ComfyUI",
            "recipe": f"Distilled + {V2_STEPS} steps + CFG {V2_CFG} + Euler + Simple (PROVEN photorealistic)",
            "version": "1.0.0-comfyui-klein",
        }


# ─── Deploy hints ─────────────────────────────────────────────────────
@app.local_entrypoint()
def main():
    print("═══ Holly ComfyUI Klein v2-recipe Endpoint ═══")
    print(f"Deploy: modal deploy services/modal-media/comfyui_klein.py")
    print(f"  (deploy to the iamdoregosteve workspace — comfyui-klein lives there)")
    print(f"Generate: https://iamdoregosteve--generate-comfyui-klein.modal.run")
    print(f"Health:   https://iamdoregosteve--comfyui-klein-health.modal.run")
