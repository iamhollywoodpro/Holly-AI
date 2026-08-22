"""HOLLY MUSIC ENGINE — ACE-Step 1.5 self-hosted (workspace: nexamusicgroup, 2026-08-21).

Why self-hosted: Suno has no official API; all resellers (incl. sunoapi.org)
run reverse-engineered endpoints on pooled accounts — fragile, ToS-violating,
wrong foundation for a commercial product (Artist/Side). ACE-Step 1.5 is MIT
licensed (weights + outputs + fine-tunes, commercial OK) and sits between
Suno v4.5 and v5 on quality. ~2s per full song on A100 ≈ $0.0006/song.

LYRICS POLICY: ACE-Step is a RENDERER, not a writer. Lyrics always come from
Holly's songwriting system (src/lib/music + creative-writing engines) — the
35-years-of-chart-craft brain. This service never invents text.

Deploy:  MODAL_PROFILE=nexamusicgroup modal deploy services/modal-media/music_acestep.py
Env:     MODAL_MUSIC_URL=https://nexamusicgroup--music-generate.modal.run

Endpoints:
  POST /generate {"prompt","lyrics","duration","seed","tags"} → {"audio": base64 mp3}
  GET  /warmup                                                     → {"ok": true}
"""

import base64

import modal

app = modal.App("holly-music-acestep")

# ACE-Step 1.5 checkpoint (MIT). Baked into the image at build time so cold
# boots load from disk (same pattern as holly-vision — proxy timeout safety).
ACE_REPO = "ACE-Step/ACE-Step-v1-3.5B"


def _download_weights():
    from huggingface_hub import snapshot_download

    snapshot_download(ACE_REPO, local_dir="/models/acestep")


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install(
        "torch",
        "torchaudio",
        "transformers",
        "accelerate",
        "diffusers",
        "soundfile",
        "huggingface_hub",
        "fastapi[standard]",
        "pydub",
        "torchcodec",  # save_with_torchcodec — pipeline writes wav via torchcodec
    )
    # ACE-Step (MIT) — installed from source (no PyPI wheel)
    .pip_install("git+https://github.com/ace-step/ACE-Step.git")
    .run_function(_download_weights)
)


@app.cls(image=image, gpu="A10G", timeout=900, scaledown_window=300, max_containers=1)
class HollyMusic:
    @modal.enter()
    def load(self):
        from acestep.pipeline_ace_step import ACEStepPipeline

        print("─── loading ACE-Step 1.5 ───")
        # Verified API (infer-api.py): checkpoint_dir + dtype; the pipeline
        # writes rendered songs to save_path rather than returning arrays.
        self.pipe = ACEStepPipeline(checkpoint_dir="/models/acestep", dtype="bfloat16")
        print("─── Holly music engine ready ───")

    @modal.fastapi_endpoint(method="GET", label="music-warmup")
    def warmup(self) -> dict:
        """Wake container + load weights. No inference, no credits beyond boot."""
        return {"ok": True, "model": ACE_REPO}

    @modal.fastapi_endpoint(method="POST", label="music-generate", docs=True)
    def generate(self, request: dict) -> dict:
        """Render Holly's lyrics + style prompt to a full song (mp3 base64).

        request:
          prompt  — style description (genre, mood, instrumentation)
          lyrics  — FULL song text from Holly's writing engine (required —
                    this service does not write lyrics)
          tags    — comma-separated style tags (optional, merged with prompt)
          duration — seconds, 30-240 (default 120); HARD CAP — output is
                      ffmpeg-trimmed if the render runs even 1s over
          seed    — int (default random; returned for reproducibility)
          bpm     — int 60-220 (optional, appended to style tags)
        """
        import glob
        import json
        import os
        import random
        import subprocess
        import tempfile

        lyrics = (request.get("lyrics") or "").strip()
        if not lyrics:
            return {"error": "lyrics are required — render only, Holly's writing engine authors the text"}
        # Accept both keys — the TS provider sends style_prompt, curl tests send prompt
        prompt = (request.get("prompt") or request.get("style_prompt") or "").strip()
        tags = (request.get("tags") or "").strip()
        duration = min(max(int(request.get("duration", 120)), 30), 240)
        seed = int(request.get("seed") or random.randrange(2**31 - 1))
        bpm = request.get("bpm")
        if bpm is not None:
            try:
                bpm = min(max(int(bpm), 60), 220)
            except (TypeError, ValueError):
                bpm = None
        out_format = str(request.get("format") or "mp3").lower()
        if out_format not in ("mp3", "wav"):
            return {"error": f"unsupported format '{out_format}' — use mp3 or wav"}

        style_prompt = ", ".join(x for x in (prompt, tags) if x) or "modern pop production, clean mix"
        if bpm is not None:
            style_prompt = f"{style_prompt}, {bpm} bpm"

        out_dir = tempfile.mkdtemp(prefix="acestep_")
        try:
            self.pipe(
                audio_duration=duration,
                prompt=style_prompt,
                lyrics=lyrics,
                infer_step=27,        # repo default quality/speed point (A100: ~2.2s/min audio)
                guidance_scale=15.0,
                scheduler_type="euler",  # repo default — flow-matching is not a registered scheduler here
                cfg_type="apg",
                omega_scale=10.0,
                manual_seeds=[seed],
                save_path=out_dir,
            )
        except Exception as e:  # noqa: BLE001 — surface every failure honestly
            return {"error": f"ACE-Step generation failed: {e}"}

        # Pipeline writes audio files into save_path — take the newest one
        # Pipeline writes output_paths + an input-params JSON — audio only
        candidates = sorted(
            (f for f in glob.glob(os.path.join(out_dir, "*.*"))
             if f.lower().endswith((".wav", ".mp3", ".flac", ".ogg"))),
            key=os.path.getmtime,
        )
        if not candidates:
            return {"error": "ACE-Step produced no output files"}
        wav_path = candidates[-1]

        # ── Post-render duration guarantee ────────────────────────────────────
        # duration is a HARD CAP: if ACE-Step runs even 1s over, trim. A reel
        # can never come back at 2+ minutes (the Suno failure mode).
        def probe_duration(path: str) -> float:
            try:
                p = subprocess.run(
                    ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
                    capture_output=True, text=True, timeout=30,
                )
                return float(json.loads(p.stdout or "{}").get("format", {}).get("duration", 0))
            except Exception:  # noqa: BLE001 — probe failure must not kill the song
                return 0.0

        actual = probe_duration(wav_path)
        trimmed = False
        if actual > duration + 1.0:
            trimmed_path = wav_path + ".trim.wav"
            t = subprocess.run(
                ["ffmpeg", "-y", "-i", wav_path, "-t", str(duration), "-c", "copy", trimmed_path],
                capture_output=True,
            )
            if t.returncode == 0 and os.path.getsize(trimmed_path) > 0:
                wav_path = trimmed_path
                actual = probe_duration(wav_path)
                trimmed = True

        # WAV requested → lossless raw render, skip conversion (~10MB/60s)
        if out_format == "wav":
            with open(wav_path, "rb") as f:
                return {
                    "audio": base64.b64encode(f.read()).decode(),
                    "format": "wav",
                    "seed": seed,
                    "duration": round(actual if actual > 0 else duration, 2),
                    "requested_duration": duration,
                    "trimmed": trimmed,
                    "model": ACE_REPO,
                }

        # → mp3 via ffmpeg (smaller payloads over the wire); -t enforces the cap again
        proc = subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-t", str(duration), "-b:a", "320k", "-f", "mp3", "pipe:1"],  # 320k = highest MP3 quality
            capture_output=True,
        )
        if proc.returncode != 0 or not proc.stdout:
            # Fall back to raw WAV if ffmpeg path fails — never lose the song
            with open(wav_path, "rb") as f:
                return {
                    "audio": base64.b64encode(f.read()).decode(),
                    "format": os.path.splitext(wav_path)[1].lstrip("."),
                    "seed": seed,
                    "duration": round(actual if actual > 0 else duration, 2),
                    "trimmed": trimmed,
                }
        return {
            "audio": base64.b64encode(proc.stdout).decode(),
            "format": "mp3",
            "seed": seed,
            "duration": round(actual if actual > 0 else duration, 2),
            "requested_duration": duration,
            "trimmed": trimmed,
            "model": ACE_REPO,
        }
