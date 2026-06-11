#!/usr/bin/env/python3
"""
Holly Face V3.0 — Avatar Generation Script
=============================================
Generates 20 emotion-specific headshot avatars using FLUX.2 Klein 9B
with baked Holly face LoRA (v2.0) + body LoRA.

Output: /public/avatars/ (direct replacement)
Format: JPEG 95% quality (optimized for web, circular crop)
Size:   768x768 (square, perfect for circular avatar)

Avatar emotions:
  Core (14): default, happy, flirty, in-love, sad, frustrated, surprised,
             thinking, naughty, sleepy, angry, confident, intimate, passionate
  Intimate (6): aroused, pre-orgasm, orgasm, post-orgasm, shy, playful

Usage:
  python scripts/generate-holly-avatars-v3.py

The h0lly trigger word activates the baked face LoRA automatically.
"""

import os
import sys
import time
import requests

ENDPOINT = "https://iamhollywoodpro--generate-holly.modal.run"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "avatars")
SIZE = 768  # Square avatar — perfect circular crop

# ─── Holly Face V3.0 Prompts ──────────────────────────────────────────────────
#
# Each prompt is designed for a close-up headshot with clean circular crop.
# The h0lly trigger word activates the baked face LoRA (v2.0).
# HOLLY_BODY_PREFIX is auto-injected by the endpoint, so we only add
# expression/framing/emotion details here.

AVATAR_SHOTS = [
    # ── Core Emotions (14) ──────────────────────────────────────────────────────
    {
        "id": "default",
        "prompt": (
            "h0lly, close-up headshot portrait looking directly at camera, "
            "neutral calm expression with subtle warmth in her eyes, "
            "relaxed face, lips gently closed with a hint of a smile, "
            "centered framing from shoulders up, soft studio lighting, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30001,
    },
    {
        "id": "happy",
        "prompt": (
            "h0lly, close-up headshot portrait, genuinely happy wide smile "
            "showing teeth, eyes crinkled with joy and warmth, cheeks slightly raised, "
            "radiant positive energy, bright natural lighting, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30002,
    },
    {
        "id": "flirty",
        "prompt": (
            "h0lly, close-up headshot portrait, flirty playful expression, "
            "half-smile with one corner of mouth raised, one eyebrow slightly arched, "
            "eyes looking slightly upward at camera through lashes, "
            "knowing seductive look, soft warm lighting with slight golden glow, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30003,
    },
    {
        "id": "in-love",
        "prompt": (
            "h0lly, close-up headshot portrait, deeply in love expression, "
            "soft dreamy adoring gaze looking up slightly, pupils dilated, "
            "gentle loving smile, slightly flushed cheeks with warm pink blush, "
            "eyes sparkling with affection, soft warm romantic lighting, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30004,
    },
    {
        "id": "sad",
        "prompt": (
            "h0lly, close-up headshot portrait, sad expression with downcast eyes, "
            "slightly furrowed brows, lips slightly parted and downturned at corners, "
            "glossy eyes almost tearing up, somber melancholy mood, "
            "soft diffused cool lighting, slight blue tint, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30005,
    },
    {
        "id": "frustrated",
        "prompt": (
            "h0lly, close-up headshot portrait, frustrated annoyed expression, "
            "furrowed brows with visible crease between eyebrows, "
            "tight-lipped with jaw slightly clenched, narrowed eyes, "
            "one hand possibly on hip visible at frame edge, "
            "slightly harsh directional lighting, centered framing from shoulders up, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30006,
    },
    {
        "id": "surprised",
        "prompt": (
            "h0lly, close-up headshot portrait, genuinely surprised expression, "
            "wide open eyes with raised eyebrows, mouth slightly open in O shape, "
            "lips parted, natural shocked reaction, "
            "bright even lighting, centered framing from shoulders up, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30007,
    },
    {
        "id": "thinking",
        "prompt": (
            "h0lly, close-up headshot portrait, thoughtful contemplative expression, "
            "eyes looking slightly upward and to the side, one eyebrow slightly raised, "
            "lips pressed together in concentration, slight head tilt, "
            "calm focused intelligent look, soft even lighting, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30008,
    },
    {
        "id": "naughty",
        "prompt": (
            "h0lly, close-up headshot portrait, naughty mischievous expression, "
            "sly knowing smirk with lips closed, eyes narrowed with playful deviousness, "
            "one eyebrow slightly raised, slightly flushed cheeks, "
            "up-to-no-good energy, warm sultry lighting, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30009,
    },
    {
        "id": "sleepy",
        "prompt": (
            "h0lly, close-up headshot portrait, sleepy drowsy expression, "
            "heavy-lidded half-closed eyes, soft relaxed face, "
            "lips slightly parted, relaxed jaw, gentle peaceful look, "
            "slightly messy hair, soft warm dim lighting like bedroom at night, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30010,
    },
    {
        "id": "angry",
        "prompt": (
            "h0lly, close-up headshot portrait, angry fierce expression, "
            "intense narrowed eyes with hard stare, deeply furrowed brows, "
            "lips pressed tight and downturned, jaw clenched, "
            "nostrils slightly flared, strong dramatic side lighting, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30011,
    },
    {
        "id": "confident",
        "prompt": (
            "h0lly, close-up headshot portrait, confident empowered expression, "
            "strong direct gaze straight into camera, slight self-assured smile, "
            "chin slightly raised, relaxed but powerful posture, "
            "sharp crisp lighting, professional power portrait, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30012,
    },
    {
        "id": "intimate",
        "prompt": (
            "h0lly, close-up headshot portrait, soft intimate tender expression, "
            "heavy-lidded bedroom eyes with warm loving gaze, "
            "slight soft smile, flushed cheeks with warm pink glow, "
            "lips slightly parted, vulnerable and close, "
            "warm golden candlelight lighting, romantic atmosphere, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30013,
    },
    {
        "id": "passionate",
        "prompt": (
            "h0lly, close-up headshot portrait, passionate intense expression, "
            "fierce hungry gaze with dilated pupils, lips parted and slightly swollen, "
            "flushed face and chest, rapid breathing visible, "
            "intense emotional desire in eyes, dramatic warm red-toned lighting, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30014,
    },

    # ── Intimate / Arousal Spectrum (6) ─────────────────────────────────────────
    {
        "id": "aroused",
        "prompt": (
            "h0lly, close-up headshot portrait, visibly aroused expression, "
            "heavy-lidded eyes with dilated pupils gazing with desire, "
            "flushed cheeks with deep pink blush spreading to ears, "
            "slightly parted lips with quickened breath, "
            "soft focus dreamy haze, warm flushed skin tone, "
            "intimate close framing, soft warm ambient lighting, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30015,
    },
    {
        "id": "pre-orgasm",
        "prompt": (
            "h0lly, close-up headshot portrait, building to climax expression, "
            "eyes squeezed tightly shut with visible tension, "
            "biting lower lip hard, face deeply flushed red-pink, "
            "brows furrowed in concentrated pleasure, "
            "tension visible in jaw and neck, beads of sweat on forehead, "
            "dramatic warm intense lighting, intimate close framing, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30016,
    },
    {
        "id": "orgasm",
        "prompt": (
            "h0lly, close-up headshot portrait, full orgasmic climax expression, "
            "head thrown back slightly, eyes rolled back or tightly shut, "
            "mouth wide open in ecstasy, face and chest deeply flushed crimson, "
            "tears of pleasure at corners of eyes, "
            "every muscle in face expressing pure release, "
            "dramatic intense warm lighting, intimate close framing, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30017,
    },
    {
        "id": "post-orgasm",
        "prompt": (
            "h0lly, close-up headshot portrait, dreamy satisfied afterglow expression, "
            "half-closed eyes with heavy lids, blissful lazy smile, "
            "still-flushed cheeks fading to soft pink, "
            "completely relaxed face, peaceful satisfied look, "
            "soft dreamy unfocused gaze, gentle satisfied breathing, "
            "soft warm diffused lighting like morning light, "
            "centered framing from shoulders up, clean neutral background, "
            "shallow depth of field, professional portrait photography, 85mm lens"
        ),
        "seed": 30018,
    },
    {
        "id": "shy",
        "prompt": (
            "h0lly, close-up headshot portrait, shy embarrassed expression, "
            "eyes looking down and slightly away from camera, "
            "warm pink blush spreading across cheeks and nose bridge, "
            "small nervous self-conscious smile, "
            "slightly tucked chin, hair partially falling in front of face, "
            "soft diffused gentle lighting, centered framing from shoulders up, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30019,
    },
    {
        "id": "playful",
        "prompt": (
            "h0lly, close-up headshot portrait, playful cheeky expression, "
            "sticking tongue out slightly, one eye winking, "
            "big bright mischievous grin, sparkling eyes full of fun, "
            "energetic animated face, tousled hair, "
            "bright vibrant lighting, centered framing from shoulders up, "
            "clean neutral background, shallow depth of field, "
            "professional portrait photography, 85mm lens"
        ),
        "seed": 30020,
    },
]


def generate_avatar(shot: dict, retry=0):
    """Generate a single avatar image."""
    payload = {
        "prompt": shot["prompt"],
        "width": SIZE,
        "height": SIZE,
        "seed": shot["seed"],
        "num_inference_steps": 4,
        "guidance_scale": 4.0,
        "format": "jpeg",
    }

    label = shot["id"]
    print(f"\n  [{label}] seed={shot['seed']} {SIZE}x{SIZE}")

    try:
        resp = requests.post(ENDPOINT, json=payload, timeout=180)

        if resp.status_code != 200:
            print(f"    HTTP {resp.status_code}: {resp.text[:200]}")
            if retry < 2:
                print(f"    Retrying ({retry + 1}/2)...")
                time.sleep(8)
                return generate_avatar(shot, retry + 1)
            return False

        out_path = os.path.join(OUTPUT_DIR, f"{label}.jpg")
        with open(out_path, "wb") as f:
            f.write(resp.content)

        size_kb = len(resp.content) / 1024
        model = resp.headers.get("X-Model", "unknown")
        baked = resp.headers.get("X-Baked", "none")
        print(f"    Saved {out_path} ({size_kb:.0f} KB) [{model}] baked=[{baked}]")
        return True

    except requests.exceptions.Timeout:
        print(f"    Timeout (180s)")
        if retry < 2:
            print(f"    Retrying ({retry + 1}/2)...")
            time.sleep(15)
            return generate_avatar(shot, retry + 1)
        return False

    except Exception as e:
        print(f"    Error: {e}")
        if retry < 2:
            print(f"    Retrying ({retry + 1}/2)...")
            time.sleep(8)
            return generate_avatar(shot, retry + 1)
        return False


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("  Holly Face V3.0 — Avatar Generation")
    print("=" * 60)
    print(f"  Endpoint: {ENDPOINT}")
    print(f"  Output:   {OUTPUT_DIR}/")
    print(f"  Size:     {SIZE}x{SIZE} JPEG")
    print(f"  Total:    {len(AVATAR_SHOTS)} avatars")
    print(f"  Model:    FLUX.2 Klein 9B + baked LoRAs")
    print()

    # Health check
    print("  Health check...")
    try:
        health_url = ENDPOINT.replace("generate-holly", "holly-health")
        health = requests.get(health_url, timeout=15)
        if health.status_code == 200:
            data = health.json()
            print(f"    Status: {data.get('status', 'unknown')}")
            print(f"    Model:  {data.get('model', 'unknown')}")
            if data.get("startup_error"):
                print(f"    Startup error: {data['startup_error']}")
                print("    Endpoint NOT ready. Deploy first:")
                print("      modal deploy services/modal-media/image_generate_flux2klein.py")
                return
            if data.get("status") != "healthy":
                print("    Model not loaded yet. Wait for cold start or redeploy.")
                return
        else:
            print(f"    Health returned {health.status_code}, proceeding anyway...")
    except Exception as e:
        print(f"    Health check failed: {e}")
        print("    Proceeding anyway...")

    # Backup existing avatars
    backup_dir = os.path.join(OUTPUT_DIR, "v2-backup")
    if not os.path.exists(backup_dir):
        existing = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.jpg')]
        if existing:
            os.makedirs(backup_dir, exist_ok=True)
            for f in existing:
                src = os.path.join(OUTPUT_DIR, f)
                dst = os.path.join(backup_dir, f)
                with open(src, 'rb') as s, open(dst, 'wb') as d:
                    d.write(s.read())
            print(f"\n  Backed up {len(existing)} existing avatars to {backup_dir}/")

    # Generate all avatars
    results = {"success": 0, "failed": 0}
    start = time.time()

    for i, shot in enumerate(AVATAR_SHOTS):
        print(f"\n[{i+1}/{len(AVATAR_SHOTS)}]", end="")
        ok = generate_avatar(shot)
        if ok:
            results["success"] += 1
        else:
            results["failed"] += 1

    elapsed = time.time() - start

    print("\n" + "=" * 60)
    print(f"  Done in {elapsed:.0f}s ({elapsed/60:.1f} min)")
    print(f"  Success: {results['success']}")
    print(f"  Failed:  {results['failed']}")
    print(f"  Output:  {OUTPUT_DIR}/")
    print("=" * 60)

    if results["success"] > 0:
        print("\n  Next steps:")
        print("  1. Review all 20 avatars for consistency and quality")
        print("  2. Check: same face (Holly), correct emotion expression, clean crop")
        print("  3. Run: git add public/avatars/ && git commit")
        print("  4. Deploy to push avatars to production")

    if results["failed"] > 0:
        print(f"\n  {results['failed']} avatars failed. Re-run to regenerate those.")


if __name__ == "__main__":
    main()
