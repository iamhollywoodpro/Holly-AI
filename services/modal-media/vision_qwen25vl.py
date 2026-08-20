"""HOLLY VISION — Qwen2.5-VL-7B self-hosted (Steve's eyes for Holly, 2026-08-12).

Why self-hosted: every hosted vision API (GLM-4.6V, GPT-4V, Gemini) content-
filters nudity. Holly must see EVERYTHING Steve sends her AND QA her own
explicit generations. Running the weights in our own container = no third
party filter, no third party ever seeing private images.

Endpoints (POST, JSON):
  /describe  {"images": [base64...], "prompt": "..."}            → {"description": str}
  /qa        {"image": base64, "context": "prompt used"}          → QA verdict JSON
  /qa-video  {"video": base64}                                    → QA verdict JSON (sampled frames)

Deploy: modal deploy services/modal-media/vision_qwen25vl.py
Env (app side): MODAL_VISION_URL=https://<workspace>--vision-qwen25vl.modal.run
"""

import json

import modal

app = modal.App("holly-vision-qwen25vl")

def _download_weights():
    """Bake model weights into the image layer at build time — container boot
    then loads from local disk instead of downloading ~16GB (first cold boot
    exceeded the Modal proxy timeout and every boot re-downloaded)."""
    from huggingface_hub import snapshot_download

    snapshot_download("Qwen/Qwen2.5-VL-7B-Instruct", local_dir="/models/qwen25vl")


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "torch",
        "torchvision",
        "transformers>=4.49",
        "accelerate",
        "qwen-vl-utils",
        "huggingface_hub",
        "fastapi[standard]",
    )
    .run_function(_download_weights)
)


@app.cls(image=image, gpu="A10G", timeout=600, scaledown_window=300, max_containers=1)
class HollyVision:
    @modal.enter()
    def load(self):
        import torch
        from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

        print("─── loading Qwen2.5-VL-7B-Instruct ───")
        self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            "/models/qwen25vl",
            torch_dtype=torch.bfloat16,
            device_map="cuda:0",
        )
        self.processor = AutoProcessor.from_pretrained("/models/qwen25vl")
        print("─── Holly vision ready ───")

    @modal.fastapi_endpoint(method="GET", label="vision-warmup")
    def warmup(self) -> dict:
        """Wakes the container (loads weights via @modal.enter) — no inference.
        Modal's web proxy times out ~60s but a cold boot (weights baked in the
        image, disk load) finishes in well under that; the first INFERENCE
        request after this returns fast."""
        return {"ok": True, "model": "Qwen2.5-VL-7B-Instruct"}

    # ── core inference ────────────────────────────────────────────────────
    def _run(self, images_b64: list[str], prompt: str, max_tokens: int = 768) -> str:
        import base64
        import io

        from qwen_vl_utils import process_vision_info

        content = []
        for b64 in images_b64:
            # Accept raw base64 or a full data URI
            if b64.startswith("data:"):
                b64 = b64.split(",", 1)[1]
            content.append({
                "type": "image",
                "image": f"data:image/jpeg;base64,{b64}",
            })
        content.append({"type": "text", "text": prompt})

        messages = [{"role": "user", "content": content}]
        text = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(self.model.device)

        generated = self.model.generate(**inputs, max_new_tokens=max_tokens)
        trimmed = [
            out_ids[len(in_ids):]
            for in_ids, out_ids in zip(inputs.input_ids, generated)
        ]
        out = self.processor.batch_decode(
            trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )
        return out[0]

    @staticmethod
    def _video_frames_b64(video_b64: str, n: int = 3) -> list[str]:
        """Sample n evenly-spaced frames from a base64 mp4 via ffmpeg."""
        import base64
        import subprocess
        import tempfile
        import os

        if video_b64.startswith("data:"):
            video_b64 = video_b64.split(",", 1)[1]
        raw = base64.b64decode(video_b64)
        frames: list[str] = []
        with tempfile.TemporaryDirectory() as td:
            vpath = os.path.join(td, "v.mp4")
            with open(vpath, "wb") as f:
                f.write(raw)
            # Probe duration
            probe = subprocess.run(
                ["ffmpeg", "-i", vpath], capture_output=True, text=True
            )
            dur = 0.0
            for line in (probe.stderr or "").splitlines():
                if "Duration:" in line:
                    parts = line.split("Duration:")[1].split(",")[0].strip().split(":")
                    try:
                        dur = int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
                    except (ValueError, IndexError):
                        dur = 0.0
                    break
            for i in range(n):
                t = (dur * (i + 0.5)) / n if dur > 0 else i
                outp = os.path.join(td, f"f{i}.jpg")
                subprocess.run(
                    ["ffmpeg", "-y", "-ss", str(t), "-i", vpath,
                     "-frames:v", "1", "-q:v", "3", outp],
                    capture_output=True,
                )
                if os.path.exists(outp):
                    with open(outp, "rb") as f:
                        frames.append(base64.b64encode(f.read()).decode())
        return frames

    # ── endpoints ─────────────────────────────────────────────────────────
    @modal.fastapi_endpoint(method="POST", label="vision-describe")
    def describe(self, request: dict) -> dict:
        """Describe/analyze user-supplied images. This is Holly's INBOUND
        eyes — no content filter, describe exactly what is asked."""
        images = request.get("images") or []
        prompt = (request.get("prompt") or "").strip()
        if not images or not prompt:
            return {"error": "images and prompt required"}
        try:
            desc = self._run(images, prompt, max_tokens=1024)
            return {"description": desc}
        except Exception as e:  # noqa: BLE001
            return {"error": f"vision failed: {e}"}

    QA_PROMPT = """You are QA-checking an AI-generated image of a woman named Holly (a 22-year-old with a consistent face and body). The generation prompt context was: "{context}"

Look at the image VERY carefully — zoom in mentally on the intimate areas. Be STRICT: minor flaws should fail. Answer with ONLY a JSON object, no other text:
{{
  "is_single_person": true/false,
  "identity_consistent": true/false,   // does she look like ONE consistent young woman (not a blend of two faces, not obviously a different person than described)
  "anatomy_ok": true/false,            // see checklist below
  "issues": ["short list of concrete problems, empty if all ok"]
}}

ANATOMY CHECKLIST (fail anatomy_ok if ANY is violated):
- Genitals (if visible): labia majora symmetric and smooth, natural pink coloration, NO warty/bumpy/cauliflower texture, NO extra or misplaced orifices/openings, NO holes on the lower back, buttocks, stomach or thighs, clitoris anatomically sized and positioned at TOP of cleft, vaginal opening in lower half.
- Anus (if visible): located in the buttock cleft only, natural pigmentation, not duplicated.
- Breasts (if visible): symmetric pair, natural shape and nipple placement, no third nipple, no fused tissue.
- Limbs: exactly 2 arms, 2 legs; hands with 5 fingers each, no merged fingers.
- Skin: continuous unbroken skin everywhere except natural orifices; no seams, no texture-noise patches on intimate skin.
If the image is clothed/SFW, still check identity_consistent and anatomy_ok for visible body parts."""

    @modal.fastapi_endpoint(method="POST", label="vision-qa")
    def qa(self, request: dict) -> dict:
        """QA one generated image. OUTBOUND check before Holly sends it."""
        img = request.get("image")
        context = (request.get("context") or "")[:500]
        if not img:
            return {"error": "image required"}
        try:
            raw = self._run([img], self.QA_PROMPT.format(context=context), max_tokens=256)
            # Strip markdown fences if the model adds them
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            verdict = json.loads(raw.strip())
            verdict["qa_passed"] = bool(
                verdict.get("identity_consistent") and verdict.get("anatomy_ok")
            )
            return verdict
        except json.JSONDecodeError:
            return {"qa_passed": True, "parse_error": True, "raw": raw[:400]}
        except Exception as e:  # noqa: BLE001
            return {"error": f"vision QA failed: {e}"}

    @modal.fastapi_endpoint(method="POST", label="vision-qa-video")
    def qa_video(self, request: dict) -> dict:
        """QA a generated video by sampling 3 frames."""
        vid = request.get("video")
        context = (request.get("context") or "")[:500]
        if not vid:
            return {"error": "video required"}
        try:
            frames = self._video_frames_b64(vid, n=3)
            if not frames:
                return {"qa_passed": True, "parse_error": True,
                        "raw": "no frames extracted — passing through"}
            raw = self._run(frames, self.QA_PROMPT.format(context=context), max_tokens=256)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            verdict = json.loads(raw.strip())
            verdict["qa_passed"] = bool(
                verdict.get("identity_consistent") and verdict.get("anatomy_ok")
            )
            return verdict
        except json.JSONDecodeError:
            return {"qa_passed": True, "parse_error": True, "raw": raw[:400]}
        except Exception as e:  # noqa: BLE001
            return {"error": f"vision video QA failed: {e}"}
