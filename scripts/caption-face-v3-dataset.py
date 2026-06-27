#!/usr/bin/env python3
"""
Generate captions for Holly Face v3 LoRA training dataset.

Caption strategy:
  - Trigger word `h0lly` in every caption (so the LoRA binds identity to it)
  - Describe expression/pose/lighting/camera — NOT identity attributes
    (the LoRA learns identity from the IMAGES, not from caption words)
  - Vary phrasing across the dataset so the LoRA generalizes
  - 20-35 words per caption (FLUX tokenizer sweet spot)

Mapping:
  - 20 emotion avatars (angry.jpg, happy.jpg, ...) — expression-led captions
  - 8 pose face crops (pose_*.jpg) — pose/context-led captions

Each image gets a .txt file with the same basename as the .jpg.
"""

import os
from pathlib import Path

DATASET_DIR = "holly-face-v3-dataset/images"

# Caption templates for each emotion avatar.
# Captions describe ONLY expression, lighting, framing — identity comes from
# the images themselves. This is the same strategy that produced the v2 LoRA.
EMOTION_CAPTIONS = {
    "angry":        "h0lly, close-up headshot portrait, angry fierce expression, intense narrowed eyes, furrowed brows, jaw clenched, dramatic side lighting, sharp focus on face",
    "aroused":      "h0lly, close-up headshot portrait, aroused expression, heavy-lidded eyes with dilated pupils, flushed cheeks, parted lips, soft warm lighting, intimate close framing",
    "confident":    "h0lly, close-up headshot portrait, confident empowered expression, strong direct gaze, slight self-assured smile, chin slightly raised, sharp crisp lighting",
    "default":      "h0lly, close-up headshot portrait, neutral calm expression with subtle warmth in her eyes, relaxed face, lips gently closed with hint of smile, soft studio lighting, clean background",
    "flirty":       "h0lly, close-up headshot portrait, flirty playful expression, half-smile with one corner of mouth raised, one eyebrow slightly arched, knowing seductive look, soft warm golden lighting",
    "frustrated":   "h0lly, close-up headshot portrait, frustrated annoyed expression, furrowed brows with visible crease between eyebrows, tight-lipped, narrowed eyes, harsh directional lighting",
    "happy":        "h0lly, close-up headshot portrait, genuinely happy wide smile showing teeth, eyes crinkled with joy, cheeks slightly raised, radiant positive energy, bright natural lighting",
    "in-love":      "h0lly, close-up headshot portrait, deeply in love expression, soft dreamy adoring gaze, gentle loving smile, slightly flushed cheeks, soft warm romantic lighting",
    "intimate":     "h0lly, close-up headshot portrait, soft intimate tender expression, heavy-lidded bedroom eyes, slight soft smile, flushed cheeks with warm pink glow, warm golden candlelight",
    "naughty":      "h0lly, close-up headshot portrait, naughty mischievous expression, sly knowing smirk, eyes narrowed with playful deviousness, one eyebrow raised, warm sultry lighting",
    "orgasm":       "h0lly, close-up headshot portrait, full orgasmic climax expression, head thrown back, eyes tightly shut, mouth wide open in ecstasy, face and chest deeply flushed, dramatic intense lighting",
    "passionate":   "h0lly, close-up headshot portrait, passionate intense expression, fierce hungry gaze, lips parted and slightly swollen, flushed face, dramatic warm red-toned lighting",
    "playful":      "h0lly, close-up headshot portrait, playful cheeky expression, tongue out slightly, one eye winking, big mischievous grin, sparkling eyes full of fun, bright vibrant lighting",
    "post-orgasm":  "h0lly, close-up headshot portrait, dreamy satisfied afterglow expression, half-closed heavy lids, blissful lazy smile, soft dreamy unfocused gaze, soft warm diffused morning light",
    "pre-orgasm":   "h0lly, close-up headshot portrait, building to climax expression, eyes squeezed shut, biting lower lip, face deeply flushed red-pink, brows furrowed in concentrated pleasure, dramatic warm lighting",
    "sad":          "h0lly, close-up headshot portrait, sad expression with downcast eyes, slightly furrowed brows, lips slightly parted and downturned, glossy eyes almost tearing up, soft diffused cool lighting",
    "shy":          "h0lly, close-up headshot portrait, shy embarrassed expression, eyes looking down and slightly away, warm pink blush across cheeks, small nervous smile, hair partially falling in front of face, soft diffused gentle lighting",
    "sleepy":       "h0lly, close-up headshot portrait, sleepy drowsy expression, heavy-lidded half-closed eyes, soft relaxed face, lips slightly parted, slightly messy hair, soft warm dim bedroom lighting",
    "surprised":    "h0lly, close-up headshot portrait, genuinely surprised expression, wide open eyes, raised eyebrows, mouth slightly open in O shape, bright even lighting",
    "thinking":     "h0lly, close-up headshot portrait, thoughtful contemplative expression, eyes looking slightly upward, one eyebrow slightly raised, lips pressed together in concentration, slight head tilt, soft even lighting",
}

# Captions for face crops from pose avatars. These were cropped from full-body
# shots so the framing is wider (head + shoulders + sometimes chest visible).
# Caption reflects the original pose context.
POSE_CAPTIONS = {
    "pose_athletic":           "h0lly, close-up portrait, athletic casual pose, relaxed confident expression, natural daylight, fresh outdoor lighting",
    "pose_beach-bikini":       "h0lly, close-up portrait, beach setting, relaxed carefree expression, bright sunlight with golden hour warmth",
    "pose_casual-standing":    "h0lly, close-up portrait, casual standing pose, neutral relaxed expression, soft natural indoor lighting",
    "pose_cozy-sweater":       "h0lly, close-up portrait, wearing cozy sweater, warm soft expression, gentle indoor lighting, autumn atmosphere",
    "pose_elegant-dress":      "h0lly, close-up portrait, elegant evening setting, sophisticated composed expression, soft cinematic lighting",
    "pose_intimate-lingerie":  "h0lly, close-up portrait, intimate bedroom setting, soft seductive expression, warm dim romantic lighting",
    "pose_playful-shorts":     "h0lly, close-up portrait, playful casual shorts outfit, cheeky grin, bright energetic lighting",
    "pose_professional":       "h0lly, close-up portrait, professional business attire, confident composed expression, crisp office lighting",
}


def main():
    out_dir = Path("holly-face-v3-dataset/captions")
    out_dir.mkdir(parents=True, exist_ok=True)

    img_dir = Path(DATASET_DIR)
    images = sorted([p for p in img_dir.iterdir() if p.suffix == '.jpg'])

    written = 0
    skipped = 0
    for img_path in images:
        stem = img_path.stem  # e.g., "default" or "pose_athletic"

        if stem.startswith("pose_"):
            caption = POSE_CAPTIONS.get(stem)
        else:
            caption = EMOTION_CAPTIONS.get(stem)

        if not caption:
            print(f"  ⚠️ No caption for {stem}, skipping")
            skipped += 1
            continue

        # Training caption files use the SAME basename as the image
        # (FLUX training scripts look for image.jpg + image.txt)
        txt_path = img_dir / f"{stem}.txt"
        txt_path.write_text(caption + "\n", encoding='utf-8')
        written += 1
        print(f"  ✅ {stem}.txt")

    print(f"\n{written} captions written, {skipped} skipped")
    print(f"Captions saved alongside images in {DATASET_DIR}/")


if __name__ == "__main__":
    main()
