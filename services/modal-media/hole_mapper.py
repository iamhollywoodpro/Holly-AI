"""
Hole Mapping — creates colored region overlays on reference photos
to guide ControlNet on WHERE insertions should go.

Red circle  = pussy hole (vaginal opening)
Blue circle = asshole (anal opening)
Green circle = mouth

The overlay is blended onto the reference photo at the correct anatomical
position, determined by the body pose in the image. ControlNet sees both
the photo structure AND the colored markers, so it knows exactly where
things should go.

This runs on Modal (where the volume + reference photos live).
"""

import modal

app = modal.App("hole-mapper")

vol = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install("pillow", "numpy", "opencv-python-headless")
)


# Hole colors (bright, saturated — easy for ControlNet to detect)
HOLE_COLORS = {
    "pussy": (255, 0, 0),    # Red
    "ass": (0, 0, 255),      # Blue
    "mouth": (0, 255, 0),    # Green
}

# Hole radius relative to image size
HOLE_RADIUS_RATIO = 0.06  # 6% of image width


@app.function(image=image, volumes={"/lora": vol}, timeout=120, memory=4096)
def create_hole_mapped_image(
    reference_path: str,
    target_hole: str,
    output_path: str = None,
) -> str:
    """Create a hole-mapped version of a reference photo.
    
    Args:
        reference_path: path on volume to the reference photo (e.g. "action-refs/01_dildo_pussy/01_dildo_pussy.webp")
        target_hole: "pussy", "ass", or "mouth"
        output_path: where to save the mapped image (defaults to same dir with .holes.png suffix)
    
    Returns:
        The output path on the volume.
    """
    from PIL import Image, ImageDraw
    import numpy as np
    import os
    
    full_input = f"/lora/{reference_path}"
    
    if not os.path.exists(full_input):
        raise FileNotFoundError(f"Reference not found: {full_input}")
    
    # Load the reference photo
    photo = Image.open(full_input).convert("RGB")
    w, h = photo.size
    
    # Determine output path
    if not output_path:
        base = reference_path.rsplit(".", 1)[0]
        ext = reference_path.rsplit(".", 1)[1]
        output_path = f"{base}.holes.png"
    
    full_output = f"/lora/{output_path}"
    os.makedirs(os.path.dirname(full_output), exist_ok=True)
    
    # Find the hole position using skin detection + body proportion heuristics
    hole_pos = find_hole_position(photo, target_hole)
    
    if hole_pos is None:
        # Fallback: can't find position, return original photo unchanged
        print(f"⚠️ Could not determine {target_hole} position — returning original photo")
        photo.save(full_output)
        vol.commit()
        return output_path
    
    cx, cy = hole_pos
    radius = int(w * HOLE_RADIUS_RATIO)
    
    print(f"🎯 Hole map: {target_hole} at ({cx}, {cy}) radius={radius} on {w}x{h} image")
    
    # Draw a colored semi-transparent circle at the hole position
    # We use a blend so ControlNet can see both the photo AND the marker
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    color = HOLE_COLORS.get(target_hole, (255, 0, 0))
    
    # Draw filled circle with alpha
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        fill=(color[0], color[1], color[2], 160),  # Semi-transparent
    )
    
    # Draw a ring (outline) at full opacity for stronger signal
    ring_width = max(3, radius // 4)
    draw.ellipse(
        [cx - radius - ring_width, cy - radius - ring_width,
         cx + radius + ring_width, cy + radius + ring_width],
        outline=(color[0], color[1], color[2], 255),
        width=ring_width,
    )
    
    # Composite the overlay onto the photo
    photo_rgba = photo.convert("RGBA")
    result = Image.alpha_composite(photo_rgba, overlay)
    result.convert("RGB").save(full_output)
    
    vol.commit()
    print(f"✅ Hole-mapped image saved: {output_path}")
    return output_path


def find_hole_position(photo, target_hole):
    """Find the pixel position of the target hole on the photo.
    
    Uses skin detection + body proportion heuristics.
    Returns (x, y) or None if can't determine.
    """
    import numpy as np
    
    img_array = np.array(photo)
    h, w = img_array.shape[:2]
    
    if target_hole == "mouth":
        # Mouth is typically in the upper third, center horizontally
        return (w // 2, int(h * 0.25))
    
    if target_hole == "pussy":
        # Pussy is typically in the lower-center of the image for most poses:
        # - Lying on back with legs spread: lower third, center
        # - Sitting with legs spread: lower third, slightly right
        # - Standing: lower quarter, center
        # Use the region with most skin pixels in the lower third
        
        lower_third = img_array[int(h * 0.6):, :]
        skin_mask = detect_skin(lower_third)
        
        if skin_mask.sum() > 100:
            # Find the centroid of skin pixels in the lower third
            ys, xs = np.where(skin_mask)
            cx = int(np.median(xs))
            cy = int(h * 0.6 + np.median(ys))
            return (cx, cy)
        
        # Fallback: lower center
        return (w // 2, int(h * 0.75))
    
    if target_hole == "ass":
        # Ass is typically lower-center but HIGHER than pussy for bent-over poses
        # For bent over: middle-lower region, center
        # For lying face down: lower-center
        
        middle_region = img_array[int(h * 0.4):int(h * 0.8), :]
        skin_mask = detect_skin(middle_region)
        
        if skin_mask.sum() > 100:
            ys, xs = np.where(skin_mask)
            cx = int(np.median(xs))
            cy = int(h * 0.4 + np.median(ys))
            return (cx, cy)
        
        # Fallback: center-lower
        return (w // 2, int(h * 0.65))
    
    return None


def detect_skin(img_region):
    """Detect skin pixels using YCbCr color space.
    Returns a boolean mask where True = skin pixel.
    """
    import numpy as np
    
    if len(img_region.shape) != 3:
        return np.zeros(img_region.shape[:2], dtype=bool)
    
    r, g, b = img_region[:,:,0], img_region[:,:,1], img_region[:,:,2]
    
    # RGB skin detection rules (rule-of-thumb)
    skin_mask = (
        (r > 95) & (g > 40) & (b > 20) &
        (r > g) & (r > b) &
        (np.abs(r - g) > 15) &
        (np.maximum(r, np.maximum(g, b)) - np.minimum(r, np.minimum(g, b)) > 15)
    )
    
    return skin_mask


@app.function(image=image, volumes={"/lora": vol}, timeout=600, memory=4096)
def batch_create_hole_maps():
    """Create hole-mapped versions of all reference photos in a single container.
    
    For pussy-target categories: add red circle
    For ass-target categories: add blue circle
    For oral categories: add green circle
    """
    from PIL import Image, ImageDraw
    import numpy as np
    import os
    from pathlib import Path
    
    refs_dir = Path("/lora/action-refs")
    if not refs_dir.exists():
        return {"error": "action-refs not found"}
    
    # Map categories to target holes
    CATEGORY_HOLES = {
        "01_dildo_pussy": "pussy",
        "02_fingering_pussy": "pussy",
        "03_masturbating": "pussy",
        "04_spreading": "pussy",
        "05_anal_fingering": "ass",
        "06_anal_dildo": "ass",
        "07_food_insertion": "pussy",
        "08_oral": "mouth",
        "09_squirting": "pussy",
        "10_fisting_pussy": "pussy",
        "11_fisting_anal": "ass",
        "14_anal_beads": "ass",
        "16_object_insertion": "pussy",
        "17_bent_over": "ass",
    }
    
    created = 0
    skipped = 0
    failed = 0
    
    for category_dir in sorted(refs_dir.iterdir()):
        if not category_dir.is_dir():
            continue
        
        category = category_dir.name
        target_hole = CATEGORY_HOLES.get(category)
        
        if not target_hole:
            continue
        
        print(f"\n📂 {category} → {target_hole}")
        
        for photo_file in sorted(category_dir.iterdir()):
            if photo_file.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
                continue
            if '.holes.' in photo_file.name or '.txt' in photo_file.name:
                continue
            
            try:
                photo = Image.open(photo_file).convert("RGB")
                w, h = photo.size
                radius = int(w * HOLE_RADIUS_RATIO)
                color = HOLE_COLORS.get(target_hole, (255, 0, 0))
                
                hole_pos = find_hole_position(photo, target_hole)
                if hole_pos is None:
                    photo.save(str(photo_file).rsplit('.', 1)[0] + '.holes.png')
                    created += 1
                    continue
                
                cx, cy = hole_pos
                overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
                draw = ImageDraw.Draw(overlay)
                draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                             fill=(color[0], color[1], color[2], 160))
                ring_width = max(3, radius // 4)
                draw.ellipse([cx - radius - ring_width, cy - radius - ring_width,
                              cx + radius + ring_width, cy + radius + ring_width],
                             outline=(color[0], color[1], color[2], 255), width=ring_width)
                
                result = Image.alpha_composite(photo.convert("RGBA"), overlay)
                out_path = str(photo_file).rsplit('.', 1)[0] + '.holes.png'
                result.convert("RGB").save(out_path)
                created += 1
                print(f"  ✅ {photo_file.name} → {target_hole} at ({cx},{cy})")
            except Exception as e:
                print(f"  ❌ {photo_file.name}: {e}")
                failed += 1
    
    vol.commit()
    return {"created": created, "skipped": skipped, "failed": failed}


@app.local_entrypoint()
def main():
    print("═══ Hole Mapping Batch ═══")
    print("Creating colored overlays on all reference photos")
    print("Red=pussy, Blue=ass, Green=mouth")
    print("")
    
    result = batch_create_hole_maps.remote()
    
    print(f"\n═══ Results ═══")
    for k, v in result.items():
        print(f"  {k}: {v}")
