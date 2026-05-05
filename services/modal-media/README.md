# HOLLY Modal Media Services

**GPU-powered image and video generation using your Modal.com $30/mo free credits.**

---

## Services

| Service | File | GPU | Model | Cost | Quality |
|---------|------|-----|-------|------|---------|
| **Image** | `image_generate.py` | T4 | FLUX.1-schnell | ~$0.0001/img | Excellent |
| **Video** | `video_generate.py` | A10G | CogVideoX-5B | ~$0.028/video | Excellent |

---

## Step 1: Create HuggingFace secret on Modal

FLUX.1-schnell and CogVideoX-5B need a HF token to download weights.
Your existing free HF token works fine.

```bash
modal secret create huggingface-secret HF_TOKEN=hf_yourtoken
```

---

## Step 3: Deploy image generation

```bash
cd services/modal-media
modal deploy image_generate.py
```

Modal will print your endpoint URL:
```
https://iamhollywoodpro--holly-image-generate.modal.run
```

Set in Coolify: `MODAL_IMAGE_URL=https://iamhollywoodpro--holly-image-generate.modal.run`

---

## Step 4: Deploy video generation (optional — uses more credits)

```bash
cd services/modal-media
modal deploy video_generate.py
```

Modal will print your endpoint URL:
```
https://iamhollywoodpro--holly-video-generate.modal.run
```

Set in Coolify: `MODAL_VIDEO_URL=https://iamhollywoodpro--holly-video-generate.modal.run`

---

## How Holly uses these services

`src/lib/ai/media-generator.ts` checks these env vars:

```
MODAL_IMAGE_URL=https://...  → Holly uses Modal for images (best quality)
MODAL_VIDEO_URL=https://...  → Holly uses Modal for video (excellent quality)
```

**Without** these vars set, Holly falls back to Pollinations (always free, decent quality).

---

## Cost breakdown

### Image (T4, $0.000164/s)
| Usage | Daily cost | Monthly cost |
|-------|------------|--------------|
| 100 images/day | $0.01 | $0.30 |
| 1,000 images/day | $0.10 | $3.00 |
| Free credit covers | — | **100,000+ images/mo** |

### Video (A10G, $0.000306/s)
| Usage | Daily cost | Monthly cost |
|-------|------------|--------------|
| 5 videos/day | $0.14 | $4.20 |
| 20 videos/day | $0.56 | $16.80 |
| Free credit covers | — | **~1,000 videos/mo at 5/day** |

> Monitor usage at https://modal.com/apps to stay within $30/mo free credits.
> Set a spend alert in Modal account settings.

---

## API reference

### Image endpoint
```
POST MODAL_IMAGE_URL/generate
{
  "prompt": "A cinematic sunset over Los Angeles",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 4,
  "seed": 42,
  "format": "jpeg"
}
→ Returns: image/jpeg binary
```

### Video endpoint
```
POST MODAL_VIDEO_URL/generate
{
  "prompt": "A music artist performing on stage with dramatic lighting",
  "duration": 5,
  "fps": 8,
  "width": 480,
  "height": 320,
  "num_inference_steps": 50
}
→ Returns: video/mp4 binary
```

### Health check
```
GET MODAL_IMAGE_URL/health  → {"status": "healthy", "model": "FLUX.1-schnell", ...}
GET MODAL_VIDEO_URL/health  → {"status": "healthy", "model": "CogVideoX-5B", ...}
```

---

## Licences
- FLUX.1-schnell: **Apache-2.0** ✅ commercial-safe
- CogVideoX-5B: **Apache-2.0** ✅ commercial-safe
