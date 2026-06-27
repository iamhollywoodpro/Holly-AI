# Holly Face v3 LoRA Dataset

**Created:** 2026-06-27
**Purpose:** Train a stronger face LoRA that produces avatar-quality faces at lower weight (0.6-0.7), so it stacks cleanly with body v2.5 @ 1.15 without distorting facial geometry.

## Composition

| Source | Count | Resolution | Filename pattern |
|--------|-------|------------|------------------|
| Emotion avatars | 20 | 768x768 | `{emotion}.jpg` (angry, aroused, confident, default, flirty, frustrated, happy, in-love, intimate, naughty, orgasm, passionate, playful, post-orgasm, pre-orgasm, sad, shy, sleepy, surprised, thinking) |
| Pose face crops | 8 | 768x768 | `pose_{name}.jpg` (athletic, beach-bikini, casual-standing, cozy-sweater, elegant-dress, intimate-lingerie, playful-shorts, professional) |
| **Total** | **28** | | |

## Source attribution

- **Emotion avatars** — copied as-is from `public/avatars/{emotion}.jpg`. These were generated on the L4 endpoint with avatar recipe (768x768 close-up headshot, 85mm lens language, fixed seeds 30001-30020). See `scripts/generate-holly-avatars-v3.py` for the original generation recipe.
- **Pose face crops** — cropped from `public/avatars/poses/{name}.jpg` via OpenCV Haar cascade (frontal + profile). Crop factor 3.0x face width, centered. See `scripts/crop-face-v3-dataset.py`.

## Caption strategy

Every image has a paired `.txt` file with the same basename. Captions:

1. **Start with `h0lly` trigger word** — binds identity to this token so the LoRA fires when the prompt contains `h0lly`.
2. **Describe expression/lighting/camera only** — never identity attributes (hair color, eye color, body type). The LoRA learns identity from the IMAGES, not from caption words. This is the same strategy that produced the working v2 LoRA.
3. **Vary phrasing** across the dataset so the LoRA generalizes instead of memorizing a fixed prompt template.
4. **20-35 words per caption** — FLUX tokenizer sweet spot.

See `scripts/caption-face-v3-dataset.py` for the full caption map.

## Why these images

The emotion avatars are the **gold-standard face reference** — they are the faces Steve approved as "this is what Holly should look like." Training on them bakes that exact face geometry into the LoRA.

The pose face crops add diversity: 8 additional angles, lighting setups, and expressions drawn from full-body shots. This prevents the LoRA from overfitting to a single headshot framing.

## Training parameters (proposed — pending Steve's approval)

| Param | Value | Rationale |
|-------|-------|-----------|
| Rank | 64 | v2 was rank 16 and produced a weak LoRA that couldn't dominate at low weight. 4x rank gives the adapter more capacity to encode face geometry. |
| Alpha | 32 | Standard practice: alpha = rank / 2 for stable training. |
| Resolution | 768x768 | Matches avatar generation resolution (no upscaling artifacts). |
| Steps | ~2500 | 28 imgs × ~80 epochs ÷ batch 1 ≈ 2200. Rounded up. |
| Batch size | 1 (effective 2 via grad accum) | Small dataset needs small batch + grad accumulation for stable gradients. |
| Learning rate | 1e-4 | Standard FLUX LoRA rate. |
| LR schedule | Cosine + 200 warmup | Warmup prevents early divergence; cosine decay settles weights at end. |
| Base model | FLUX.2 Klein 9B BF16 | Same as inference — eliminates train/inference mismatch. |
| Target modules | QKV + output projections in transformer attention | Standard FLUX LoRA targets used by BFL ai-toolkit. |

**Estimated cost:** ~$5-8 on Modal A100 (30-40 min training).
**Expected output:** `holly-face-v3.safetensors` (~250-400 MB).

## Training path options

Three options for actually running the training — **Steve to pick one before we spend any money**.

### Path A — Diffusers official trainer (RECOMMENDED)

Use HuggingFace's `train_dreambooth_lora_flux.py` reference trainer. Pros:
- Battle-tested flow-matching implementation
- Output format natively compatible with `pipe.load_lora_weights()`
- Maintained by HuggingFace

Cons:
- Hardcoded for `FluxPipeline` — needs a patch to use `Flux2KleinPipeline`
- More setup complexity than a custom loop

### Path B — Custom training script (CHEAPER, RISKIER)

Use `services/fine-tuning/train_holly_face_v3.py` (draft). Pros:
- Single Modal file, no external dependencies
- Already loaded with the right hyperparameters

Cons:
- **Currently has 4 known issues vs the diffusers reference** (see script docstring warning)
- Hand-rolls flow-matching loss — may produce a suboptimal LoRA
- Custom save format may not load cleanly into the A100 endpoint

### Path C — BFL ai-toolkit

Use Black Forest Labs' official ai-toolkit. Pros:
- Purpose-built for FLUX LoRAs
- Most reliable path to a working LoRA

Cons:
- New external dependency + Modal image setup
- More code to integrate

## Files

```
holly-face-v3-dataset/
├── README.md                          ← this file
├── images/                            ← 28 images + 28 caption .txt files
│   ├── angry.jpg
│   ├── angry.txt
│   ├── ...
│   └── pose_professional.txt
└── (training output goes to Modal volume, not here)
```

Scripts that built this dataset:
- `scripts/crop-face-v3-dataset.py` — Haar cascade face cropper for pose avatars
- `scripts/caption-face-v3-dataset.py` — Per-image caption generator

Training script (draft, pending validation):
- `services/fine-tuning/train_holly_face_v3.py` — Modal A100 trainer, see "Path B" caveats
