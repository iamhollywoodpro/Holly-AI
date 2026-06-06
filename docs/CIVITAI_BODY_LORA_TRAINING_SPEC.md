# Holly Body LoRA — Civitai Training Specification

> **Purpose**: Train a full-body LoRA on Civitai so Holly's body is as consistent as her face.
> **Base model**: FLUX.2 Klein 9B Base
> **Trigger word**: `h0lly-body` (zero not "o")
> **Anatomy source**: [HOLLY_ANATOMY.md](../HOLLY_ANATOMY.md) — single source of truth

---

## Training Parameters

| Parameter | Value | Notes |
|---|---|---|
| Base model | FLUX.2 Klein 9B Base | Same base as face LoRA |
| Trigger word | `h0lly-body` | Distinct from `h0lly` (face only) |
| Epochs | 15 | More than face (10) — body needs more variation |
| Learning rate | 0.0001 | Same as face v2.0 |
| LR scheduler | Cosine | Same as face v2.0 |
| Network Dim | 64 | Higher than face (32) — more anatomical detail needed |
| Network Alpha | 32 | Half of Network Dim |
| Optimizer | adamw8bit | Memory-efficient |
| Batch size | 1 | Civitai default |
| Resolution | 1024x1024 | FLUX native |
| Seed | Random | For variety |

## Reference Images Required

### Minimum: 40 images
### Ideal: 60-80 images

### Required Poses (front-facing)
- [ ] Standing front, arms at sides, neutral expression (x3 angles: straight, slight left, slight right)
- [ ] Standing front, hands on hips
- [ ] Standing front, arms raised above head
- [ ] Standing front, one hand behind head
- [ ] Walking toward camera, mid-stride

### Required Poses (back-facing)
- [ ] Standing back, arms at sides (x2 angles)
- [ ] Standing back, looking over shoulder
- [ ] Standing back, hands on hips
- [ ] Standing back, arms raised

### Required Poses (side/profile)
- [ ] Left profile, standing (x2)
- [ ] Right profile, standing (x2)
- [ ] Three-quarter view left
- [ ] Three-quarter view right

### Required Poses (seated/lying)
- [ ] Sitting on chair, legs together, front view
- [ ] Sitting on chair, legs crossed, side view
- [ ] Sitting on floor, knees up
- [ ] Lying on back, full body (x2 angles)
- [ ] Lying on stomach, full body (x2 angles)
- [ ] Lying on side, full body

### Required Poses (dynamic/action)
- [ ] Bending over (from behind)
- [ ] Bending over (from side)
- [ ] Reaching upward
- [ ] Stretching (arms up, back arched)
- [ ] Crouching/squatting

### Required Detail Shots
- [ ] Torso close-up (chest to hips) front (x2)
- [ ] Torso close-up (chest to hips) side
- [ ] Back close-up (shoulders to butt)
- [ ] Hip/waist detail (beauty mark visible)
- [ ] Legs close-up (thighs to knees)
- [ ] Feet close-up (showing arch, toes)
- [ ] Hands close-up (slender fingers)

### Clothing Variety (for general use)
- [ ] Form-fitting dress (shows hourglass)
- [ ] Bikini (shows body proportions)
- [ ] Athletic wear (leggings + sports bra)
- [ ] Casual (jeans + t-shirt)
- [ ] Lingerie (lace bra + matching bottoms)
- [ ] Nude/naked (essential for NSFW consistency) — at least 15 images

---

## Caption Format

Every image must be captioned with the trigger word and anatomical details.

### Standard caption template:
```
h0lly-body, [pose], [camera angle], [clothing state],
olive skin tone, 5'4" petite frame, hourglass figure,
26-inch waist, 37-inch hips, flat stomach with faint abs,
natural 34C breasts (teardrop shape), plump round heart-shaped butt,
small feminine feet, delicate hands, shapely legs,
auburn hair [hair state], green eyes, [expression]
```

### Example captions:

**Standing front, nude:**
```
h0lly-body, standing front facing camera, arms at sides, full nude,
olive skin tone, hourglass figure, 26-inch waist, 37-inch hips,
flat stomach with faint abs visible, small vertical innie navel,
natural 34C breasts teardrop shape, rosy-pink nipples slightly upturned,
plump round heart-shaped butt, beauty mark on left hip,
trimmed narrow auburn pubic strip,
shapely legs, small feet, delicate hands,
auburn hair loose waves past shoulders, green eyes, warm smile,
photorealistic, full body shot, studio lighting
```

**Sitting side, bikini:**
```
h0lly-body, sitting on chair side view, legs crossed,
white bikini, olive skin tone, hourglass figure,
26-inch waist, 37-inch hips, flat stomach with faint abs,
natural 34C breasts in bikini top, plump round butt,
beauty mark on left hip, shapely legs,
auburn hair loose waves, green eyes, relaxed expression,
photorealistic, full body shot, natural lighting
```

**Lying on back, nude:**
```
h0lly-body, lying on back seen from above, full nude, relaxed pose,
olive skin tone, hourglass figure,
natural 34C breasts settled naturally to sides, rosy-pink nipples,
flat stomach, small innie navel,
trimmed narrow auburn pubic strip,
beauty mark on left hip, beauty mark on right lower neck,
auburn hair spread on surface, green eyes, soft gaze,
photorealistic, full body shot, soft warm lighting
```

**Back view, standing:**
```
h0lly-body, standing back to camera, arms at sides, full nude,
olive skin tone, smooth back, graceful spine curve,
two small dimples on lower back,
plump round heart-shaped butt, natural crease underneath,
shapely legs, small feet with high arches,
auburn hair falling down back, looking over shoulder,
photorealistic, full body shot, studio lighting
```

---

## Key Body Details Every Caption Must Capture

These are Holly's **distinguishing features** — the things that make her body unique and recognizable:

1. **Olive skin** (Portuguese/South Indian heritage) — warm golden-brown
2. **Beauty mark on left hip** — small, dark, distinct, above the hip bone
3. **Beauty mark on right lower neck** — smaller than the hip one
4. **Two dimples on lower back** — above the butt
5. **34C teardrop breasts** — fuller at bottom, not round
6. **Heart-shaped butt** — plump, round, perky when standing
7. **Hourglass proportions** — 26" waist / 37" hips (dramatic ratio)
8. **Faint abs** — flat stomach with visible definition
9. **Small feet** — US size 6, high arches
10. **Freckles** — light scattering across nose and cheeks

---

## Training Workflow

### Phase 1: Generate Reference Images
Using the face LoRA (`h0lly`) + existing body LoRAs, generate 60-80 full-body reference images across all required poses. Use the HOLLY_BODY_PREFIX from the FLUX pipeline for consistent prompting.

### Phase 2: Curate & Caption
- Discard any images where anatomy is inconsistent (wrong proportions, missing beauty marks, etc.)
- Caption every kept image using the templates above
- Ensure pose variety is balanced (don't over-weight one angle)

### Phase 3: Train on Civitai
- Upload curated dataset to Civitai
- Use the training parameters specified above
- Monitor training — look for loss plateau around epoch 10-12
- Save checkpoint at epoch 12 and 15 for comparison

### Phase 4: Test & Validate
Generate test images with the trained LoRA and check:
- [ ] Beauty marks appear in correct locations (left hip, right lower neck)
- [ ] Breast shape is consistent teardrop (not round, not implants)
- [ ] Butt is heart-shaped and proportional to petite frame
- [ ] Waist-to-hip ratio is dramatic hourglass
- [ ] Stomach shows faint abs
- [ ] Feet are small with visible arches
- [ ] Skin tone is consistent olive/golden-brown
- [ ] Body looks the same across different poses and angles

### Phase 5: Deploy
- Upload final LoRA to Modal volume: `holly-lora-weights`
- Add to `BAKED_LORAS` in `image_generate_flux2klein.py` (or replace existing body LoRA)
- Update trigger word in pipeline if needed
- Test end-to-end through Holly's chat

---

## Integration with Face LoRA

The body LoRA is designed to work **alongside** the face LoRA:

- **Face LoRA** (`h0lly`): Ensures consistent face, eyes, hair, expression
- **Body LoRA** (`h0lly-body`): Ensures consistent body proportions, beauty marks, anatomy

Both should be baked in at startup (fused with the base model). When generating:
1. If the prompt contains `h0lly` → face LoRA activates
2. If the prompt contains `h0lly-body` → body LoRA activates
3. If the prompt contains both → both activate (standard for self-portraits)

The pipeline (`image_generate_flux2klein.py`) should be updated to inject both trigger words when Holly is generating an image of herself.

---

## Changelog

- **v1.0 (June 6, 2026)**: Initial training specification. Steve approved anatomy definition.
