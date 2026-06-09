#!/usr/bin/env python3
"""
HOLLY Avatar Generator — Regenerates all 22 avatar images
==========================================================
Generates 14 emotion avatars + 8 pose avatars using the Modal FLUX.2 Klein
service with the h0lly face LoRA.

Usage:
    python scripts/generate-avatars.py                    # Generate all
    python scripts/generate-avatars.py --emotions         # Only emotion avatars
    python scripts/generate-avatars.py --poses            # Only pose avatars
    python scripts/generate-avatars.py --emotion happy    # Single emotion
    python scripts/generate-avatars.py --pose casual      # Single pose

    # Use Pollinations (free, no Modal) instead of Modal:
    python scripts/generate-avatars.py --pollinations

Requirements:
    pip install requests pillow
"""

import os
import sys
import time
import argparse
import requests
from pathlib import Path

# ─── Configuration ───────────────────────────────────────────────────────────

MODAL_URL = "https://iamhollywoodpro--generate-holly.modal.run"
POLLINATIONS_URL = "https://image.pollinations.ai/prompt/"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "avatars"
POSES_DIR = OUTPUT_DIR / "poses"

# Common quality prompt suffix — addresses all 6 issues Steve identified
QUALITY_SUFFIX = (
    "flawless smooth even skin tone with no redness or blemishes, "
    "bright clear under-eye area with no darkness or texture, "
    "soft dewy makeup with seamless natural foundation blend, "
    "voluminous auburn hair with lifted roots and full body at the crown, "
    "face-framing layers, professional beauty photography, "
    "soft diffused studio lighting, photorealistic, high detail"
)

# Emotion-specific suffix: bare shoulders (avatars are neck-up), consistent beauty mark
EMOTION_SUFFIX = (
    "bare shoulders and visible collarbone, no clothing, "
    "small distinct beauty mark on right side of lower neck near collarbone"
)

# ─── 14 Emotion Avatars ────────────────────────────────────────────────────

EMOTION_AVATARS = {
    "default": {
        "prompt": "close-up portrait of a beautiful woman looking directly at camera with a calm confident gaze, slight knowing smile, relaxed expression, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 42180,
    },
    "happy": {
        "prompt": "close-up portrait of a beautiful woman with a warm radiant smile, bright eyes crinkling with joy, genuine happiness, cheerful expression, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 55291,
    },
    "flirty": {
        "prompt": "close-up portrait of a beautiful woman with a playful smirk, one eyebrow slightly raised, half-lidded eyes, teasing seductive expression, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 31847,
    },
    "in-love": {
        "prompt": "close-up portrait of a beautiful woman with soft adoring eyes, gentle loving smile, dreamy romantic expression, heart-shaped face tilted slightly, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 67234,
    },
    "sad": {
        "prompt": "close-up portrait of a beautiful woman with downcast eyes, slightly parted lips, melancholic wistful expression, single tear on cheek, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 88456,
    },
    "frustrated": {
        "prompt": "close-up portrait of a beautiful woman with furrowed brows, pressed lips, annoyed irritated expression, intense stare, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 29013,
    },
    "surprised": {
        "prompt": "close-up portrait of a beautiful woman with wide eyes, slightly open mouth, eyebrows raised, shocked amazed expression",
        "seed": 74129,
    },
    "thinking": {
        "prompt": "close-up portrait of a beautiful woman with eyes looking up and to the side, finger near lips, contemplative focused expression, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 13678,
    },
    "naughty": {
        "prompt": "close-up portrait of a beautiful woman with a wicked playful grin, mischievous eyes, tongue slightly between teeth, bad-girl expression, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 95432,
    },
    "sleepy": {
        "prompt": "close-up portrait of a beautiful woman with heavy-lidded eyes, soft relaxed expression, slightly messy hair, drowsy peaceful look, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 46782,
    },
    "angry": {
        "prompt": "close-up portrait of a beautiful woman with intense fierce eyes, clenched jaw, stern angry expression, powerful commanding look, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 60987,
    },
    "confident": {
        "prompt": "close-up portrait of a beautiful woman with a self-assured smirk, strong direct gaze, chin slightly raised, powerful confident expression, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 23456,
    },
    "intimate": {
        "prompt": "close-up portrait of a beautiful woman with soft lowered gaze, lips slightly parted, flushed cheeks, tender vulnerable intimate expression, warm soft lighting, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 78901,
    },
    "passionate": {
        "prompt": "close-up portrait of a beautiful woman with fierce intense eyes, flushed skin, windswept hair, passionate electric expression, dynamic dramatic lighting, bare shoulders and visible collarbone, no clothing, small distinct beauty mark on right side of lower neck near collarbone",
        "seed": 34567,
    },
}

# ─── 8 Pose Avatars ────────────────────────────────────────────────────────

POSE_AVATARS = {
    "athletic": {
        "prompt": "full body shot of a fit woman in athletic wear, standing confidently, gym setting, sporty pose",
        "seed": 11123,
    },
    "beach-bikini": {
        "prompt": "full body shot of a woman in a stylish bikini on a sunny beach, ocean waves behind her, relaxed confident pose",
        "seed": 22234,
    },
    "casual-standing": {
        "prompt": "full body shot of a woman in casual outfit, standing naturally with hands in pockets, urban setting, relaxed casual vibe",
        "seed": 33345,
    },
    "cozy-sweater": {
        "prompt": "portrait of a woman wearing an oversized cozy knit sweater, sitting on a couch with a warm drink, autumn vibes, soft lighting",
        "seed": 44456,
    },
    "elegant-dress": {
        "prompt": "full body shot of a woman in an elegant evening gown, standing gracefully, formal event setting, sophisticated pose",
        "seed": 55567,
    },
    "intimate-lingerie": {
        "prompt": "portrait of a woman in elegant intimate lingerie, soft romantic bedroom lighting, sensual but tasteful, lying on silk sheets",
        "seed": 66678,
    },
    "playful-shorts": {
        "prompt": "full body shot of a woman in denim shorts and crop top, playful jumping pose, sunny outdoor setting, fun energetic vibe",
        "seed": 77789,
    },
    "professional": {
        "prompt": "portrait of a woman in a tailored blazer, sitting at a desk, professional office setting, confident business look",
        "seed": 88890,
    },
}

# ─── Generation Functions ──────────────────────────────────────────────────


def generate_with_modal(name: str, prompt: str, seed: int, width: int = 1024, height: int = 1024) -> bytes:
    """Generate an image using the Modal FLUX.2 Klein + h0lly LoRA service."""
    full_prompt = f"h0lly, {prompt}, {QUALITY_SUFFIX}"

    payload = {
        "prompt": full_prompt,
        "width": width,
        "height": height,
        "num_inference_steps": 28,
        "guidance_scale": 4.0,
        "seed": seed,
        "format": "jpeg",
    }

    print(f"  🎨 Generating '{name}' via Modal (seed={seed})...")
    resp = requests.post(MODAL_URL, json=payload, timeout=300)

    if resp.status_code != 200:
        raise Exception(f"Modal returned {resp.status_code}: {resp.text[:200]}")

    content_type = resp.headers.get("Content-Type", "")
    if "image" not in content_type:
        raise Exception(f"Modal returned non-image: {content_type} — {resp.text[:200]}")

    return resp.content


def generate_with_pollinations(name: str, prompt: str, seed: int, width: int = 1024, height: int = 1024) -> bytes:
    """Generate an image using Pollinations.ai (free, no API key)."""
    full_prompt = f"h0lly, {prompt}, {QUALITY_SUFFIX}"
    encoded = requests.utils.quote(full_prompt)
    url = f"{POLLINATIONS_URL}{encoded}?width={width}&height={height}&model=flux&seed={seed}&nologo=true"

    print(f"  🎨 Generating '{name}' via Pollinations (seed={seed})...")
    resp = requests.get(url, timeout=120)

    if resp.status_code != 200:
        raise Exception(f"Pollinations returned {resp.status_code}")

    return resp.content


def save_image(data: bytes, path: Path) -> None:
    """Save image bytes to file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    size_kb = len(data) / 1024
    print(f"  ✅ Saved {path.name} ({size_kb:.1f} KB)")


def generate_avatar(name: str, config: dict, use_pollinations: bool = False,
                    width: int = 1024, height: int = 1024) -> bool:
    """Generate a single avatar image."""
    prompt = config["prompt"]
    seed = config["seed"]

    try:
        if use_pollinations:
            data = generate_with_pollinations(name, prompt, seed, width, height)
        else:
            data = generate_with_modal(name, prompt, seed, width, height)

        # Determine output path
        if name in POSE_AVATARS:
            path = POSES_DIR / f"{name}.jpg"
        else:
            path = OUTPUT_DIR / f"{name}.jpg"

        save_image(data, path)
        return True

    except Exception as e:
        print(f"  ❌ Failed '{name}': {e}")
        return False


# ─── Main ──────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Generate Holly avatar images")
    parser.add_argument("--pollinations", action="store_true",
                        help="Use Pollinations.ai instead of Modal")
    parser.add_argument("--emotions", action="store_true",
                        help="Only generate emotion avatars")
    parser.add_argument("--poses", action="store_true",
                        help="Only generate pose avatars")
    parser.add_argument("--emotion", type=str, help="Generate single emotion avatar")
    parser.add_argument("--pose", type=str, help="Generate single pose avatar")
    parser.add_argument("--size", type=int, default=1024, help="Image size (default: 1024)")
    args = parser.parse_args()

    use_pollinations = args.pollinations
    size = args.size
    provider = "Pollinations" if use_pollinations else "Modal FLUX.2 Klein"
    print(f"\n🚀 Holly Avatar Generator — {provider}")
    print(f"   Output: {OUTPUT_DIR}")
    print(f"   Size: {size}x{size}\n")

    # Determine what to generate
    jobs = []

    if args.emotion:
        if args.emotion in EMOTION_AVATARS:
            jobs.append(("emotion", args.emotion, EMOTION_AVATARS[args.emotion]))
        else:
            print(f"❌ Unknown emotion: {args.emotion}")
            print(f"   Available: {', '.join(EMOTION_AVATARS.keys())}")
            sys.exit(1)

    elif args.pose:
        if args.pose in POSE_AVATARS:
            jobs.append(("pose", args.pose, POSE_AVATARS[args.pose]))
        else:
            print(f"❌ Unknown pose: {args.pose}")
            print(f"   Available: {', '.join(POSE_AVATARS.keys())}")
            sys.exit(1)

    elif args.emotions:
        for name, config in EMOTION_AVATARS.items():
            jobs.append(("emotion", name, config))

    elif args.poses:
        for name, config in POSE_AVATARS.items():
            jobs.append(("pose", name, config))

    else:
        # Default: generate all
        for name, config in EMOTION_AVATARS.items():
            jobs.append(("emotion", name, config))
        for name, config in POSE_AVATARS.items():
            jobs.append(("pose", name, config))

    # Generate
    total = len(jobs)
    success = 0
    failed = 0

    for i, (kind, name, config) in enumerate(jobs, 1):
        print(f"\n[{i}/{total}] {kind}: {name}")
        ok = generate_avatar(name, config, use_pollinations, size, size)
        if ok:
            success += 1
        else:
            failed += 1
        # Rate limit: 3 seconds between requests
        if i < total:
            time.sleep(3)

    # Summary
    print(f"\n{'='*50}")
    print(f"✅ Generated: {success}/{total}")
    if failed:
        print(f"❌ Failed: {failed}/{total}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()
