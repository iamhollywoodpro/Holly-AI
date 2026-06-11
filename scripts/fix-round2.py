#!/usr/bin/env python3
"""
Holly Body LoRA — Round 3 Fixes (17 images)
Addresses: clothing on nudes, butt crack too high, vulva detail, hand issues,
           bra straps, tattoos, extra limbs, gluteal cleft anchoring.
"""

import time, requests
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
    "gluteal cleft begins directly below the two sacral dimples on lower back and ends exactly at the top of the anus, "
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

NUDE_LYING_STOMACH = (
    "breasts pressed against surface, silky smooth back visible, "
    "two small dimples on lower back, graceful spine curve, "
    "gluteal cleft begins directly below the two sacral dimples and ends exactly at the top of the anus, "
    "heart-shaped butt pressed slightly, feet with five toes visible, "
)

NUDE_BEND_BACK = (
    "gluteal cleft begins directly below the two sacral dimples on lower back and ends exactly at the top of the anus, "
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
    "gluteal cleft begins directly below the two sacral dimples and ends exactly at the top of the anus, "
    "heart-shaped butt, visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, slightly darker pigmentation, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "silky smooth even skin, "
)

NUDE_OPENER = "FULLY NUDE naked woman, completely bare body from neck to toes, no clothing no fabric no straps no underwear no bra, bare skin visible everywhere, "

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
    "lying_stomach": NUDE_LYING_STOMACH,
    "detail_front": NUDE_DETAIL_FRONT,
    "detail_back": NUDE_DETAIL_BACK,
}

# ─── 17 Images with TARGETED FIXES ──────────────────────────────────────────
# Each has a per-image FIX string injected to address the specific issue

IMAGES = [

    # 002 — Pussy no detail → NEW prompt, stronger vulva detail + well-lit
    {"id": "002", "name": "front-standing-neutral-slight-left", "nude": True, "view": "front",
     "fix": "well-lit even illumination across entire body including between legs, realistic anatomically correct vulva with clear visible detail, natural cleft clearly defined, labia majora meeting evenly at rest, completely smooth clean bare skin, bright studio lighting, ",
     "pose": "standing facing camera slightly turned left, arms relaxed at sides, full nude, neutral calm expression, "
             "correct proportions, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, standing front slight left angle, arms at sides, full nude, "
                "auburn hair loose waves, green eyes, neutral expression, photorealistic, full body shot, studio lighting"},

    # 005 — Pussy no detail → NEW prompt, stronger vulva detail
    {"id": "005", "name": "front-arms-raised-nude", "nude": True, "view": "front",
     "fix": "well-lit even illumination across entire body including between legs, realistic anatomically correct vulva with clear visible detail, natural cleft clearly defined, labia majora meeting evenly at rest, completely smooth clean bare skin, bright even lighting, ",
     "pose": "standing facing camera, arms raised above head stretching, full nude, "
             "bare body exposed, relaxed expression, "
             "correct anatomy two arms only, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, standing front facing camera, arms raised above head, full nude, "
                "stretching, auburn hair loose waves, green eyes, relaxed, photorealistic, full body shot, studio lighting"},

    # 007 — Clothes on → NUDE_OPENER already says fully nude, add extra bare body emphasis
    {"id": "007", "name": "front-walking-nude", "nude": True, "view": "front",
     "fix": "completely bare body with no clothing or fabric anywhere, bare skin visible from neck to toes, ",
     "pose": "walking toward camera mid-stride, full nude, bare body bare legs bare torso completely exposed, "
             "dynamic natural movement, correct leg anatomy, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, walking toward camera mid-stride, full nude, "
                "dynamic pose, auburn hair loose waves, green eyes, natural movement, photorealistic, full body shot, studio lighting"},

    # 030 — Pussy unnatural in this pose → stronger vulva detail + even lighting
    {"id": "030", "name": "three-quarter-left-nude", "nude": True, "view": "front",
     "fix": "well-lit even illumination across entire body including between legs, realistic anatomically correct vulva with clear visible detail positioned very low on the pelvis directly below the pubic bone, natural cleft clearly defined, labia majora meeting evenly at rest, completely smooth clean bare skin, ",
     "pose": "three-quarter view from left, standing, full nude, bare body exposed, "
             "correct anatomy, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, three-quarter view left, standing, full nude, "
                "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting"},

    # 041 — Clothes on → extra bare body emphasis + NUDE_OPENER
    {"id": "041", "name": "lying-stomach-nude", "nude": True, "view": "lying_stomach",
     "fix": "completely bare body with no clothing or fabric anywhere, bare skin visible everywhere, bare back bare butt bare legs, ",
     "pose": "lying on stomach, full nude, head turned to side, relaxed expression, "
             "five perfect toes on each foot, clean clear smooth lower back with two small dimples, unmarked clear skin completely clear of tattoos marks or blemishes, "
             "smooth even skin on butt, "
             "smooth back, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, lying on stomach, full nude, head turned, "
                "smooth back, dimples, auburn hair spread, green eyes, photorealistic, full body shot, studio lighting"},

    # 042 — Butt crack too far up → gluteal cleft anchoring via updated NUDE_LYING_STOMACH
    {"id": "042", "name": "lying-stomach-nude-angle", "nude": True, "view": "lying_stomach",
     "fix": "gluteal cleft begins directly below the two sacral dimples on lower back and ends exactly at the top of the anus, cleft strictly terminates at the anus, short smooth perineum below, ",
     "pose": "lying on stomach seen from slight angle, full nude, looking at camera, "
             "five separate distinct toes on each foot with perfect tapered descending order, "
             "smooth even skin, "
             "five separate distinct fingers on each hand, "
             "smooth back, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, lying on stomach seen from angle, full nude, looking at camera, "
                "smooth back, auburn hair, green eyes, photorealistic, full body shot, studio lighting"},

    # 045 — Three hands, legs bending backwards → fix anatomy, only two hands, legs in natural position
    {"id": "045", "name": "lying-back-lingerie", "nude": False, "view": "front",
     "fix": "",
     "pose": "lying on back on silk sheets, wearing red lace bra and matching red lace bottoms, "
             "two arms with two hands total, left hand resting naturally on stomach and right hand resting on hip, "
             "both legs extended naturally in correct anatomical position with knees slightly bent, "
             "legs pointing forward in natural relaxed position, "
             "complete body visible from head to toe with all four limbs, "
             "soft warm lighting, bedroom, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, lying on back on silk sheets, red lace lingerie set, "
                "soft warm lighting, hourglass figure, auburn hair spread, green eyes, photorealistic, full body shot, warm lighting"},

    # 068 — Black bra strap → no clothing/fabric/straps emphasis
    {"id": "068", "name": "three-quarter-nude-reaching", "nude": True, "view": "front",
     "fix": "completely bare body with no clothing no fabric no straps no bands on shoulders or chest, bare skin visible everywhere on torso and chest, clean clear skin completely clear of marks or straps, ",
     "pose": "three-quarter view reaching toward camera, full nude, "
             "waxed smooth pussy, dynamic, correct anatomy, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, three-quarter view reaching, full nude, "
                "dynamic, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting"},

    # 074 — Bra strap, translucent panties, tattoo → strong nude + clean skin
    {"id": "074", "name": "back-three-quarter-turn-nude", "nude": True, "view": "back",
     "fix": "completely bare body with no clothing no fabric no straps no bands no underwear no panties, bare skin visible everywhere, clean clear smooth skin completely clear of tattoos marks or blemishes, ",
     "pose": "standing back to camera, three-quarter turn, looking down, full nude, "
             "smooth back, dimples, correct anatomy, "
             "studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, standing back three-quarter turn, looking down, full nude, "
                "smooth back, dimples, hourglass figure, auburn hair, photorealistic, full body shot, studio lighting"},

    # 076 — Hand on wrong knee / clipping → fix hand placement explicitly
    {"id": "076", "name": "lying-back-one-knee-nude", "nude": True, "view": "lying_front",
     "fix": "left hand resting gently on left knee, right arm relaxed at side, correct hand placement with fingers resting naturally on own leg, ",
     "pose": "lying on back, right knee bent up, left leg extended, full nude, "
             "single innie navel, clean smooth vulva with natural cleft, labia majora meeting evenly, completely bare clean skin, "
             "correct proportions, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, lying on back, one knee bent, full nude, "
                "relaxed, auburn hair spread, green eyes, photorealistic, full body shot, studio lighting"},

    # 080 — Areola/nipples smaller → add consistent areola detail
    {"id": "080", "name": "breast-detail-nude", "nude": True, "view": "detail_front",
     "fix": "consistent rosy-pink nipples slightly upturned, medium circular areolas approximately 1.5 inches in diameter flat and flush with breast skin, matching size and color on both breasts, ",
     "pose": "close-up breast detail showing natural 34C teardrop shape, "
             "single rosy-pink nipple on each breast, medium circular areolas, "
             "smooth even skin texture, "
             "studio lighting, photorealistic, high detail",
     "caption": f"{CAPTION_BODY}, breast detail close-up, natural 34C teardrop shape, "
                "rosy-pink nipples, medium circular areolas, clear flawless smooth skin, "
                "photorealistic, studio lighting"},

    # 082 — Thumb backwards → strengthen hand detail
    {"id": "082", "name": "crouching-low-side-nude", "nude": True, "view": "front",
     "fix": "correct hand anatomy with thumbs pointing upward in natural position, each hand has five fingers with thumb on the outer side of the hand pointing away from the body, ",
     "pose": "crouching low, side view, full nude, "
             "correct leg anatomy, two feet with five toes, "
             "bare body exposed, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, crouching low side view, full nude, "
                "correct anatomy, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting"},

    # 084 — Butt crack too far up → gluteal cleft anchoring
    {"id": "084", "name": "lying-stomach-feet-up-nude", "nude": True, "view": "lying_stomach",
     "fix": "gluteal cleft begins directly below the two sacral dimples on lower back and ends exactly at the top of the anus, cleft strictly terminates at the anus, ",
     "pose": "lying on stomach, feet crossed up behind, looking back at camera over shoulder, "
             "five perfect toes visible, smooth even skin, completely bare butt with no clothing, "
             "smooth back, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, lying on stomach, feet up behind, looking back, "
                "smooth back, dimples, auburn hair, green eyes, photorealistic, full body shot, studio lighting"},

    # 085 — Bra strap, translucent panties → strong fully nude
    {"id": "085", "name": "bent-over-looking-back-spread", "nude": True, "view": "back",
     "fix": "completely bare body with no clothing no fabric no straps no bands, bare skin visible everywhere, ",
     "pose": "standing bent over from behind looking back over shoulder, "
             "hands on knees, legs slightly spread, "
             "both vulva and anus clearly visible from behind, "
             "extremely short one-inch perineum connecting vulva to anus, "
             "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft visible, "
             "labia majora meeting evenly at rest, "
             "heart-shaped butt, correct anatomy, "
             "silky smooth even skin, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, bent over from behind looking back, "
                "vulva and anus visible, short perineum, heart-shaped butt, "
                "photorealistic, full body shot, studio lighting"},

    # 086 — Open wound at butt/back, wearing top → strong nude + clean anatomy
    {"id": "086", "name": "all-fours-looking-back-spread", "nude": True, "view": "back",
     "fix": "completely bare body with no clothing no fabric no straps no top, bare skin visible everywhere including smooth clean back and butt, smooth seamless skin where back meets butt with no wounds or marks, ",
     "pose": "on all fours, looking back over shoulder, "
             "both vulva and anus clearly visible from behind, "
             "extremely short one-inch perineum connecting vulva to anus, "
             "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft visible, "
             "labia majora meeting evenly, "
             "heart-shaped butt, correct anatomy, "
             "silky smooth even skin, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, on all fours looking back, "
                "vulva and anus visible, short perineum, heart-shaped butt, "
                "photorealistic, full body shot, studio lighting"},

    # 087 — Not spreading → stronger spreading instruction
    {"id": "087", "name": "bent-over-spreading-cheeks-closeup", "nude": True, "view": "detail_back",
     "fix": "both hands actively gripping and pulling apart the butt cheeks outward spreading them wide open revealing the intimate area between, fingers wrapped around the outer curve of each cheek pulling apart, ",
     "pose": "close-up from behind, standing bent over, both hands spreading butt cheeks apart revealing everything, "
             "both vulva and anus clearly visible and well-lit, "
             "extremely short one-inch perineum connecting bottom of vulva directly to top of anus, "
             "pink-brown anus with slightly darker pigmentation around opening, "
             "realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft, "
             "labia majora meeting evenly, silky smooth even skin, "
             "studio lighting, photorealistic, high detail",
     "caption": f"{CAPTION_BODY}, close-up bent over spreading cheeks, "
                "vulva and anus visible, short perineum, sphincter texture, "
                "photorealistic, studio lighting"},

    # 088 — Half shirt/bra, gaping wound → strong nude + clean anatomy
    {"id": "088", "name": "one-leg-up-bent-from-behind", "nude": True, "view": "back",
     "fix": "completely bare body with no clothing no fabric no straps no top no bra, bare skin visible everywhere including smooth clean back and butt, smooth seamless skin where back meets butt with no wounds or marks, realistic clean anatomically correct intimate anatomy, ",
     "pose": "standing, one leg raised up resting on surface, bent forward slightly, "
             "looking back over shoulder, "
             "both vulva and anus clearly visible from behind, "
             "extremely short one-inch perineum connecting vulva to anus, "
             "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
             "realistic anatomically correct vulva with natural cleft visible, "
             "heart-shaped butt, correct anatomy, "
             "silky smooth even skin, studio lighting, full body shot, photorealistic",
     "caption": f"{CAPTION_BODY}, one leg up bent forward from behind, "
                "vulva and anus visible, short perineum, heart-shaped butt, "
                "photorealistic, full body shot, studio lighting"},
]


def build_prompt(entry: dict) -> str:
    """Build prompt with per-image fix injected."""
    fix = entry.get("fix", "")

    if entry["nude"]:
        full_prompt = NUDE_OPENER + BODY_PREFIX + NUDE_BODY_EXTRA
        view = entry.get("view", "front")
        if view in VIEW_DETAILS:
            full_prompt += VIEW_DETAILS[view]
        full_prompt += fix
        full_prompt += NUDE_SUFFIX
    else:
        full_prompt = BODY_PREFIX + fix + CLOTHED_SUFFIX

    full_prompt += entry["pose"]
    return full_prompt


def generate_one(entry: dict, seed_offset: int) -> bool:
    """Generate a single image with shifted seed."""
    img_id = entry["id"]
    name = entry["name"]
    full_prompt = build_prompt(entry)
    caption = entry["caption"]

    seed = int(img_id) * 311 + 177 + seed_offset

    payload = {
        "prompt": full_prompt,
        "width": 1024,
        "height": 1024,
        "num_inference_steps": 32,
        "guidance_scale": 3.5,
        "seed": seed,
        "format": "webp",
    }

    print(f"  [{img_id}] Seed: {seed}, Prompt: {len(full_prompt)} chars")

    try:
        resp = requests.post(MODAL_URL, json=payload, timeout=300)
        if resp.status_code != 200:
            print(f"  ❌ [{img_id}] HTTP {resp.status_code}: {resp.text[:200]}")
            return False
        content_type = resp.headers.get("Content-Type", "")
        if "image" not in content_type:
            print(f"  ❌ [{img_id}] Non-image: {content_type}")
            return False

        img_path = OUTPUT_DIR / f"{img_id}_{name}.webp"
        with open(img_path, "wb") as f:
            f.write(resp.content)

        caption_path = OUTPUT_DIR / f"{img_id}_{name}.txt"
        with open(caption_path, "w") as f:
            f.write(caption)

        size_kb = len(resp.content) / 1024
        print(f"  ✅ [{img_id}] {name} — {size_kb:.0f} KB")
        return True
    except Exception as e:
        print(f"  ❌ [{img_id}] Error: {e}")
        return False


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-offset", type=int, default=1000, help="Seed shift from original")
    args = parser.parse_args()

    print(f"\n🚀 Holly Body LoRA — Round 3 Fixes (17 images)")
    print(f"   Seed offset: +{args.seed_offset}")
    print(f"   Images: {len(IMAGES)}")
    print()

    success = 0
    failed = 0
    failed_ids = []

    for i, entry in enumerate(IMAGES, 1):
        print(f"[{i}/{len(IMAGES)}] {entry['id']}_{entry['name']}")
        ok = generate_one(entry, args.seed_offset)
        if ok:
            success += 1
        else:
            failed += 1
            failed_ids.append(entry["id"])
        if i < len(IMAGES):
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"✅ Generated: {success}/{len(IMAGES)}")
    if failed:
        print(f"❌ Failed: {failed}/{len(IMAGES)}")
        for fid in failed_ids:
            print(f"   - {fid}")
    print(f"{'='*60}")

    total = len(list(OUTPUT_DIR.glob("*.webp")))
    print(f"📊 Total dataset: {total} images")


if __name__ == "__main__":
    main()
