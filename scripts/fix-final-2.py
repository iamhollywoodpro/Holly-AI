#!/usr/bin/env python3
"""Fix 2 remaining images: 045 (third hand) and 084 (4 toes)"""

import time, requests
from pathlib import Path

MODAL_URL = "https://iamhollywoodpro--generate-holly-a100.modal.run"
OUTPUT_DIR = Path("/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset")

BODY_PREFIX = (
    "h0lly, "
    "hair length exactly three inches past shoulders ending at mid-chest level, "
    "small feminine feet size 6 with high arches and five perfect toes, "
    "delicate hands with five slender fingers, "
    "silky smooth flawless skin with well-moisturized sheen, "
)

CAPTION_BODY = (
    "h0lly-body, olive skin tone, 5'4\" petite frame, hourglass figure, "
    "26-inch waist, 37-inch hips, flat stomach with faint abs, "
    "natural 34C breasts teardrop shape, plump round heart-shaped butt, "
    "clear flawless smooth skin, Brazilian wax smooth pubic area, "
    "small feminine feet with five perfect toes, "
    "delicate hands with five slender fingers, "
    "shapely legs, two small dimples on lower back"
)

CLOTHED_SUFFIX = (
    "realistic opaque clothing with visible fabric texture weave and folds, "
    "clothing drapes naturally over body with proper fit and weight, "
    "two arms two legs with five fingers and five toes each, "
    "realistic proportions, "
)

IMAGES = [
    # 045 — Third hand. EXPLICIT two hands only.
    {
        "id": "045", "name": "lying-back-lingerie",
        "prompt": (
            f"{BODY_PREFIX}"
            "lying on back on silk sheets, wearing red lace bra and matching red lace bottoms, "
            "exactly two hands total and no extra hands, left hand resting on stomach and right hand resting at side on the sheet, "
            "both legs extended naturally in correct anatomical position with knees slightly bent, "
            "legs pointing forward in natural relaxed position, "
            "complete body visible from head to toe, "
            "two arms only with exactly two hands, "
            "soft warm lighting, bedroom, full body shot, photorealistic"
        ),
        "caption": f"{CAPTION_BODY}, lying on back on silk sheets, red lace lingerie set, "
                   "soft warm lighting, hourglass figure, auburn hair spread, green eyes, photorealistic, full body shot, warm lighting",
        "seed": 15172 + 2000,  # New seed
    },

    # 084 — 4 toes / unnatural toes. EXPLICIT five separate toes.
    {
        "id": "084", "name": "lying-stomach-feet-up-nude",
        "prompt": (
            "FULLY NUDE naked woman, completely bare body from neck to toes, no clothing no fabric no straps, bare skin visible everywhere, "
            f"{BODY_PREFIX}"
            "waxed smooth pussy completely smooth and clean, "
            "breasts pressed against surface, silky smooth back visible, "
            "two small dimples on lower back, graceful spine curve, "
            "gluteal cleft begins directly below the two sacral dimples on lower back and ends exactly at the top of the anus, "
            "heart-shaped butt pressed slightly, completely bare butt with no clothing, "
            "five perfectly formed separate distinct toes on each foot with perfect tapered descending order, "
            "big toe is the largest with each subsequent toe slightly smaller, "
            "each foot clearly shows exactly five individual toes, "
            "lying on stomach, feet crossed up behind, looking back at camera over shoulder, "
            "smooth back, studio lighting, full body shot, photorealistic"
        ),
        "caption": f"{CAPTION_BODY}, lying on stomach, feet up behind, looking back, "
                   "smooth back, dimples, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
        "seed": 27301 + 2000,  # New seed
    },
]


def generate_one(entry):
    resp = requests.post(MODAL_URL, json={
        "prompt": entry["prompt"],
        "width": 1024, "height": 1024,
        "num_inference_steps": 32,
        "guidance_scale": 3.5,
        "seed": entry["seed"],
        "format": "webp",
    }, timeout=300)

    if resp.status_code != 200:
        print(f"  ❌ [{entry['id']}] HTTP {resp.status_code}")
        return False
    if "image" not in resp.headers.get("Content-Type", ""):
        print(f"  ❌ [{entry['id']}] Non-image")
        return False

    img_path = OUTPUT_DIR / f"{entry['id']}_{entry['name']}.webp"
    with open(img_path, "wb") as f:
        f.write(resp.content)

    cap_path = OUTPUT_DIR / f"{entry['id']}_{entry['name']}.txt"
    with open(cap_path, "w") as f:
        f.write(entry["caption"])

    print(f"  ✅ [{entry['id']}] {entry['name']} — {len(resp.content)/1024:.0f} KB")
    return True


for entry in IMAGES:
    print(f"Fixing {entry['id']}_{entry['name']}...")
    generate_one(entry)
    time.sleep(3)

print("\nDone fixing 2 images.")
