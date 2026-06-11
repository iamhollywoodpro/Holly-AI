#!/usr/bin/env python3
"""
Regenerate 20 missing images for Holly Body LoRA dataset.
1 attempt each, different seeds (+500 shift), modified prompts addressing known issues.
"""

import os, sys, time, requests
from pathlib import Path

MODAL_URL = "https://iamhollywoodpro--generate-holly-a100.modal.run"
OUTPUT_DIR = Path("/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset")

BODY_PREFIX = (
    "h0lly, "
    "hair length exactly three inches past shoulders ending at mid-chest level, "
    "small feminine feet size 6 with high arches and five perfect toes, "
    "delicate hands with five slender fingers, "
    "silky smooth flawless skin with well-moisturized sheen, skin stretches taut when extending and creases naturally when bending, "
)

NUDE_BODY_EXTRA = "waxed smooth pussy completely smooth and clean, "

NUDE_FRONT = (
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "waxed smooth pussy, labia majora meeting evenly at rest, "
    "rosy-pink nipples slightly upturned, medium circular areolas, "
)

NUDE_BACK = (
    "visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "heart-shaped butt with natural crease underneath, "
    "two small dimples on lower back, silky smooth even skin, "
)

NUDE_LYING_FRONT = (
    "breasts settled naturally to sides, rosy-pink nipples pointing slightly upward, "
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "single small vertical innie navel in correct position below ribs, "
    "waxed smooth pussy, "
)

NUDE_LYING_OPEN = (
    "breasts settled naturally to sides, nipples pointing up, "
    "realistic vulva positioned very low on the pelvis directly below the pubic bone, "
    "slightly parted labia and visible inner lips, "
    "small vaginal opening slightly visible, "
    "single small vertical innie navel in correct position, "
    "waxed smooth pussy, "
)

NUDE_LYING_STOMACH = (
    "breasts pressed against surface, silky smooth back visible, "
    "two small dimples on lower back, graceful spine curve, "
    "heart-shaped butt pressed slightly, feet with five toes visible, "
)

NUDE_BEND_BACK = (
    "visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "heart-shaped butt round and full from behind, "
    "silky smooth even skin on back and legs, "
)

NUDE_DETAIL_FRONT = (
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "waxed smooth pussy, "
    "natural 34C breasts teardrop shape, single nipple on each breast, "
    "silky smooth even skin texture, "
)

NUDE_DETAIL_BACK = (
    "silky smooth back, graceful spine curve, two small dimples on lower back, "
    "heart-shaped butt, visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, slightly darker pigmentation, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "silky smooth even skin, "
)

NUDE_OPENER = "FULLY NUDE naked woman, completely bare body from neck to toes, "

NUDE_SUFFIX = (
    "flawless silky smooth even skin tone across entire body, perfectly clean and uniform, "
    "realistic skin stretching and folding at joints, "
    "two arms two legs with five fingers and five toes each, "
    "correct proportions realistic human anatomy, "
)

CLOTHED_SUFFIX = (
    "realistic opaque clothing with visible fabric texture weave and folds, "
    "clothing drapes naturally over body with proper fit and weight, "
    "two arms two legs with five fingers and five toes each, "
    "realistic proportions, "
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

VIEW_DETAILS = {
    "front": NUDE_FRONT,
    "back": NUDE_BACK,
    "back_bend": NUDE_BEND_BACK,
    "lying_front": NUDE_LYING_FRONT,
    "lying_open": NUDE_LYING_OPEN,
    "lying_stomach": NUDE_LYING_STOMACH,
    "detail_front": NUDE_DETAIL_FRONT,
    "detail_back": NUDE_DETAIL_BACK,
}

# ─── 20 Missing Images with FIXED prompts ─────────────────────────────────
# Each prompt is modified to address the specific issue Steve identified
# Seeds are shifted +500 from original to get different outputs

FIXES = {
    "046": "clean clear smooth arms and forearms with unmarked clear skin completely clear of tattoos marks or blemishes, ",
    "048": "well-lit even illumination across entire body including intimate areas, realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly at rest, completely smooth clean bare skin, bright even lighting with no dark shadows, ",
    "050": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "051": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "052": "consistent rosy-pink nipples slightly upturned on both breasts, medium circular areolas flat and flush with breast skin, single nipple on each breast matching size and color, ",
    "060": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "062": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, ",
    "063": "two separate hands with exactly five slender fingers each, correct finger count of five per hand, delicate wrists, natural short nails, ",
    "066": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "067": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "068": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "074": "both breasts fully visible with natural 34C teardrop shape, rosy-pink nipples visible, complete torso visible with well-lit even illumination, ",
    "076": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "079": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "083": "realistic anatomically correct vulva with natural cleft clearly visible, labia majora meeting evenly, smooth clean bare skin, well-lit even illumination, ",
    "084": "completely bare butt with no clothing or fabric, fully nude lying on stomach with bare skin visible everywhere, no underwear or thong, ",
}

IMAGES = [
    {"id": "046", "name": "sitting-floor-nude-bright", "nude": True, "view": "front",
     "pose": "sitting on floor, legs spread casually, full nude, "
             "bare body exposed, bright studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, sitting on floor, legs spread, full nude, bright lighting, photorealistic, full body shot, studio lighting"},

    {"id": "048", "name": "bending-over-back-nude", "nude": True, "view": "back_bend",
     "pose": "gentle natural forward bend from behind, hands touching knees, full nude, "
             "realistic well-proportioned body, smooth back, dimples, "
             "correct anatomy two arms two legs, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, gentle forward bend from behind, full nude, smooth back, dimples, heart-shaped butt, photorealistic, full body shot, studio lighting"},

    {"id": "050", "name": "reaching-upward-nude", "nude": True, "view": "front",
     "pose": "reaching upward with both arms, standing, full nude, "
             "dynamic pose, correct anatomy two arms, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, reaching upward, standing, full nude, dynamic, hourglass figure, auburn hair loose waves, green eyes looking up, photorealistic, full body shot, studio lighting"},

    {"id": "051", "name": "stretching-back-arched-nude", "nude": True, "view": "front",
     "pose": "stretching with arms up and back arched, standing, full nude, "
             "flat stomach, correct anatomy two arms, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, stretching arms up back arched, standing, full nude, flat stomach, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "052", "name": "crouching-nude", "nude": True, "view": "front",
     "pose": "crouching squatting position, full nude, bare body exposed, "
             "correct leg anatomy, two feet with five toes, "
             "natural pose, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, crouching squatting, full nude, natural pose, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "060", "name": "hip-waist-detail", "nude": True, "view": "detail_front",
     "pose": "close-up hip and waist detail shot, showing waist-to-hip ratio, "
             "natural 34C breasts full teardrop shape visible at top of frame, "
             "smooth olive skin, studio lighting, photorealistic, high detail",
     "caption": f"{CAPTION_BODY}, hip waist detail close-up, nude, 26-inch waist 37-inch hips, dramatic hourglass ratio, smooth olive skin, clear flawless skin, photorealistic, studio lighting"},

    {"id": "062", "name": "feet-closeup", "nude": True, "view": "front",
     "pose": "close-up feet shot, standing, showing five perfectly formed toes on each foot, "
             "high arches, narrow heels, perfect tapered toes in neat descending order, "
             "small feminine size 6 feet, studio lighting, photorealistic, high detail",
     "caption": f"{CAPTION_BODY}, feet close-up, size 6, high arches, narrow heels, five perfect tapered toes in neat order, smooth skin, photorealistic, studio lighting"},

    {"id": "063", "name": "hands-closeup", "nude": False, "view": "front",
     "pose": "close-up hands shot, two separate hands with five slender fingers each, "
             "delicate wrists, natural short nails, relaxed natural pose, "
             "correct hand anatomy, studio lighting, photorealistic, high detail",
     "caption": f"{CAPTION_BODY}, hands close-up, small delicate, five slender fingers each hand, narrow wrists, natural short nails, soft palms, photorealistic, studio lighting"},

    {"id": "066", "name": "front-nude-confident-wide", "nude": True, "view": "front",
     "pose": "standing wide confident stance, full nude, arms at sides, "
             "bare body exposed, correct proportions matching 26-inch waist 37-inch hips, "
             "confident powerful expression, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, standing wide stance, full nude, confident powerful, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "067", "name": "front-nude-arms-behind-back", "nude": True, "view": "front",
     "pose": "standing facing camera, arms behind back, full nude, "
             "bare body exposed, two arms only, slight smile, "
             "correct proportions, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, standing front facing camera, arms behind back, full nude, slight smile, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "068", "name": "three-quarter-nude-reaching", "nude": True, "view": "front",
     "pose": "three-quarter view reaching toward camera, full nude, "
             "waxed smooth pussy, dynamic, correct anatomy, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, three-quarter view reaching, full nude, dynamic, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "074", "name": "back-three-quarter-turn-nude", "nude": True, "view": "back",
     "pose": "standing back to camera, three-quarter turn, looking down, full nude, "
             "smooth back, dimples, correct anatomy, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, standing back three-quarter turn, looking down, full nude, smooth back, dimples, hourglass figure, auburn hair, photorealistic, full body shot, studio lighting"},

    {"id": "076", "name": "lying-back-one-knee-nude", "nude": True, "view": "lying_front",
     "pose": "lying on back, right knee bent up, left leg extended, full nude, "
             "single innie navel, clean smooth vulva with natural cleft, labia majora meeting evenly, completely bare clean skin, "
             "correct proportions, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, lying on back, one knee bent, full nude, relaxed, auburn hair spread, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "079", "name": "stomach-navel-detail", "nude": True, "view": "detail_front",
     "pose": "close-up stomach detail, showing single small vertical innie navel below ribs, "
             "flat stomach with faint abs, smooth even skin texture, "
             "waxed smooth pussy below, studio lighting, photorealistic, high detail",
     "caption": f"{CAPTION_BODY}, stomach close-up detail, single innie navel, flat stomach with faint abs, smooth olive skin, Brazilian wax smooth pubic area, photorealistic, studio lighting"},

    {"id": "083", "name": "standing-side-stretch-nude", "nude": True, "view": "front",
     "pose": "standing, side bend stretch with right arm reaching over head to left, "
             "full nude, bare body exposed, "
             "correct anatomy two arms, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, standing side stretch, arm over head, full nude, hourglass figure, flat stomach, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "084", "name": "lying-stomach-feet-up-nude", "nude": True, "view": "lying_stomach",
     "pose": "lying on stomach, feet crossed up behind, looking back at camera over shoulder, "
             "five perfect toes visible, smooth even skin, completely bare butt with no clothing, "
             "smooth back, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, lying on stomach, feet up behind, looking back, smooth back, dimples, auburn hair, green eyes, photorealistic, full body shot, studio lighting"},

    {"id": "085", "name": "bent-over-looking-back-spread", "nude": True, "view": "back",
     "pose": "standing bent over from behind looking back over shoulder, "
             "hands on knees, legs slightly spread, "
             "both vulva and anus clearly visible from behind, "
             "extremely short one-inch perineum connecting vulva to anus, "
             "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft visible, "
             "labia majora meeting evenly at rest, "
             "heart-shaped butt, correct anatomy, "
             "silky smooth even skin, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, bent over from behind looking back, vulva and anus visible, short perineum, heart-shaped butt, photorealistic, full body shot, studio lighting"},

    {"id": "086", "name": "all-fours-looking-back-spread", "nude": True, "view": "back",
     "pose": "on all fours, looking back over shoulder, "
             "both vulva and anus clearly visible from behind, "
             "extremely short one-inch perineum connecting vulva to anus, "
             "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft visible, "
             "labia majora meeting evenly, "
             "heart-shaped butt, correct anatomy, "
             "silky smooth even skin, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, on all fours looking back, vulva and anus visible, short perineum, heart-shaped butt, photorealistic, full body shot, studio lighting"},

    {"id": "087", "name": "bent-over-spreading-cheeks-closeup", "nude": True, "view": "detail_back",
     "pose": "close-up from behind, standing bent over, both hands spreading butt cheeks apart, "
             "both vulva and anus clearly visible, "
             "extremely short one-inch perineum connecting bottom of vulva directly to top of anus, "
             "pink-brown anus with slightly darker pigmentation around opening, "
             "realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft, "
             "labia majora meeting evenly, silky smooth even skin, "
             "studio lighting, photorealistic, high detail",
     "caption": f"{CAPTION_BODY}, close-up bent over spreading cheeks, vulva and anus visible, short perineum, sphincter texture, photorealistic, studio lighting"},

    {"id": "088", "name": "one-leg-up-bent-from-behind", "nude": True, "view": "back",
     "pose": "standing, one leg raised up resting on surface, bent forward slightly, "
             "looking back over shoulder, "
             "both vulva and anus clearly visible from behind, "
             "extremely short one-inch perineum connecting vulva to anus, "
             "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft visible, "
             "heart-shaped butt, correct anatomy, "
             "silky smooth even skin, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, one leg up bent forward from behind, vulva and anus visible, short perineum, heart-shaped butt, photorealistic, full body shot, studio lighting"},
]


def build_prompt(entry: dict) -> str:
    """Build prompt with fix injected for known issues."""
    img_id = entry["id"]
    fix = FIXES.get(img_id, "")

    if entry["nude"]:
        full_prompt = NUDE_OPENER + BODY_PREFIX + NUDE_BODY_EXTRA
        view = entry.get("view", "front")
        if view in VIEW_DETAILS:
            full_prompt += VIEW_DETAILS[view]
        # Inject the specific fix BEFORE the pose
        full_prompt += fix
        full_prompt += NUDE_SUFFIX
    else:
        full_prompt = BODY_PREFIX
        # Inject fix for clothed images (e.g., hands closeup)
        full_prompt += fix
        full_prompt += CLOTHED_SUFFIX

    full_prompt += entry["pose"]
    return full_prompt


def generate_one(entry: dict) -> bool:
    """Generate a single image with 1 attempt, shifted seed."""
    img_id = entry["id"]
    name = entry["name"]
    full_prompt = build_prompt(entry)
    caption = entry["caption"]

    # Shift seed by +500 from original formula to get different results
    seed = int(img_id) * 311 + 177 + 500

    payload = {
        "prompt": full_prompt,
        "width": 1024,
        "height": 1024,
        "num_inference_steps": 32,
        "guidance_scale": 3.5,
        "seed": seed,
        "format": "webp",
    }

    print(f"  [{img_id}] Seed: {seed}, Prompt length: {len(full_prompt)} chars")

    try:
        resp = requests.post(MODAL_URL, json=payload, timeout=300)

        if resp.status_code != 200:
            print(f"  ❌ [{img_id}] HTTP {resp.status_code}: {resp.text[:200]}")
            return False

        content_type = resp.headers.get("Content-Type", "")
        if "image" not in content_type:
            print(f"  ❌ [{img_id}] Non-image response: {content_type}")
            return False

        # Save image
        img_path = OUTPUT_DIR / f"{img_id}_{name}.webp"
        with open(img_path, "wb") as f:
            f.write(resp.content)

        # Save caption
        caption_path = OUTPUT_DIR / f"{img_id}_{name}.txt"
        with open(caption_path, "w") as f:
            f.write(caption)

        size_kb = len(resp.content) / 1024
        print(f"  ✅ [{img_id}] {name} — {size_kb:.0f} KB + caption")
        return True

    except Exception as e:
        print(f"  ❌ [{img_id}] Error: {e}")
        return False


def main():
    print(f"\n🚀 Holly Body LoRA — Regenerating 20 Missing Images")
    print(f"   Output: {OUTPUT_DIR}")
    print(f"   Endpoint: A100 (full bf16, lossless WebP)")
    print(f"   Attempts: 1 per image, shifted seeds (+500)")
    print(f"   Total API calls: {len(IMAGES)}")
    print()

    # Check which images already exist (skip if present)
    to_generate = []
    for entry in IMAGES:
        img_id = entry["id"]
        name = entry["name"]
        img_path = OUTPUT_DIR / f"{img_id}_{name}.webp"
        if img_path.exists():
            print(f"  ⏭️  [{img_id}] Already exists, skipping")
        else:
            to_generate.append(entry)

    if not to_generate:
        print("\n✅ All images already exist!")
        return

    print(f"\n  Generating {len(to_generate)} images...\n")

    success = 0
    failed = 0
    failed_ids = []

    for i, entry in enumerate(to_generate, 1):
        print(f"[{i}/{len(to_generate)}] {entry['id']}_{entry['name']}")
        ok = generate_one(entry)
        if ok:
            success += 1
        else:
            failed += 1
            failed_ids.append(entry["id"])

        # Rate limit between images
        if i < len(to_generate):
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"✅ Generated: {success}/{len(to_generate)}")
    if failed:
        print(f"❌ Failed: {failed}/{len(to_generate)}")
        for fid in failed_ids:
            print(f"   - {fid}")
    print(f"{'='*60}")

    # Count total images in dataset
    total = len(list(OUTPUT_DIR.glob("*.webp")))
    print(f"\n📊 Total dataset images: {total}/88")


if __name__ == "__main__":
    main()
