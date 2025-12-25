#!/usr/bin/env python3
"""
HOLLY Voice Generator - Maya1 TTS Integration
Self-hosted voice generation for HOLLY AI with emotional intelligence
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from snac import SNAC
import soundfile as sf
import numpy as np
from typing import Optional, List
import os
import hashlib
from pathlib import Path

# Maya1 Token IDs
CODE_START_TOKEN_ID = 128257
CODE_END_TOKEN_ID = 128258
CODE_TOKEN_OFFSET = 128266
SNAC_MIN_ID = 128266
SNAC_MAX_ID = 156937
SNAC_TOKENS_PER_FRAME = 7

SOH_ID = 128259
EOH_ID = 128260
SOA_ID = 128261
BOS_ID = 128000
TEXT_EOT_ID = 128009

# HOLLY's Signature Voice Profile
HOLLY_VOICE_DESCRIPTION = (
    "Female voice in her 30s with an American accent. "
    "Confident, intelligent, warm tone with clear diction. "
    "Professional yet friendly, conversational pacing."
)


class HollyVoiceGenerator:
    """Generate HOLLY's voice using Maya1 TTS"""
    
    def __init__(self, model_name: str = "maya-research/maya1", enable_cache: bool = True):
        print("🔧 Initializing HOLLY Voice Generator...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"   Device: {self.device}")
        
        # Voice cache setup
        self.enable_cache = enable_cache
        self.cache_dir = Path("/tmp/holly_voice_cache")
        if self.enable_cache:
            self.cache_dir.mkdir(exist_ok=True)
            print(f"🗄️  Voice cache enabled: {self.cache_dir}")
        
        # Load Maya1 model
        print("📦 Loading Maya1 model...")
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True
        )
        
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            trust_remote_code=True
        )
        print(f"   ✅ Model loaded: {len(self.tokenizer)} tokens")
        
        # Load SNAC audio decoder
        print("🎵 Loading SNAC audio decoder (24kHz)...")
        self.snac_model = SNAC.from_pretrained("hubertsiuzdak/snac_24khz").eval()
        if torch.cuda.is_available():
            self.snac_model = self.snac_model.to("cuda")
        print("   ✅ SNAC decoder loaded")
        
        print("✨ HOLLY Voice Generator ready!\n")
    
    def build_prompt(self, description: str, text: str) -> str:
        """Build formatted prompt for Maya1"""
        soh_token = self.tokenizer.decode([SOH_ID])
        eoh_token = self.tokenizer.decode([EOH_ID])
        soa_token = self.tokenizer.decode([SOA_ID])
        sos_token = self.tokenizer.decode([CODE_START_TOKEN_ID])
        eot_token = self.tokenizer.decode([TEXT_EOT_ID])
        bos_token = self.tokenizer.bos_token
        
        formatted_text = f'<description="{description}"> {text}'
        
        prompt = (
            soh_token + bos_token + formatted_text + eot_token +
            eoh_token + soa_token + sos_token
        )
        
        return prompt
    
    def extract_snac_codes(self, token_ids: List[int]) -> List[int]:
        """Extract SNAC codes from generated tokens"""
        try:
            eos_idx = token_ids.index(CODE_END_TOKEN_ID)
        except ValueError:
            eos_idx = len(token_ids)
        
        snac_codes = [
            token_id for token_id in token_ids[:eos_idx]
            if SNAC_MIN_ID <= token_id <= SNAC_MAX_ID
        ]
        
        return snac_codes
    
    def unpack_snac_from_7(self, snac_tokens: List[int]) -> List[List[int]]:
        """Unpack 7-token SNAC frames to 3 hierarchical levels"""
        if snac_tokens and snac_tokens[-1] == CODE_END_TOKEN_ID:
            snac_tokens = snac_tokens[:-1]
        
        frames = len(snac_tokens) // SNAC_TOKENS_PER_FRAME
        snac_tokens = snac_tokens[:frames * SNAC_TOKENS_PER_FRAME]
        
        if frames == 0:
            return [[], [], []]
        
        l1, l2, l3 = [], [], []
        
        for i in range(frames):
            slots = snac_tokens[i*7:(i+1)*7]
            l1.append((slots[0] - CODE_TOKEN_OFFSET) % 4096)
            l2.extend([
                (slots[1] - CODE_TOKEN_OFFSET) % 4096,
                (slots[4] - CODE_TOKEN_OFFSET) % 4096,
            ])
            l3.extend([
                (slots[2] - CODE_TOKEN_OFFSET) % 4096,
                (slots[3] - CODE_TOKEN_OFFSET) % 4096,
                (slots[5] - CODE_TOKEN_OFFSET) % 4096,
                (slots[6] - CODE_TOKEN_OFFSET) % 4096,
            ])
        
        return [l1, l2, l3]
    
    def generate(
        self,
        text: str,
        description: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.4,
        top_p: float = 0.9
    ) -> np.ndarray:
        """
        Generate HOLLY's voice from text
        
        Args:
            text: Text to synthesize
            description: Voice description (defaults to HOLLY's signature voice)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (lower = more consistent)
            top_p: Nucleus sampling threshold
        
        Returns:
            Audio waveform as numpy array (24kHz)
        """
        if description is None:
            description = HOLLY_VOICE_DESCRIPTION
        
        # Check cache first
        if self.enable_cache:
            cache_key = self._get_cache_key(text, description, temperature, top_p)
            cached_audio = self._load_from_cache(cache_key)
            if cached_audio is not None:
                print(f"⚡ Cache hit! Loading pre-generated audio")
                return cached_audio
        
        print(f"🎤 Generating HOLLY's voice...")
        print(f"   Text: {text[:100]}{'...' if len(text) > 100 else ''}")
        
        # Build prompt
        prompt = self.build_prompt(description, text)
        
        # Tokenize
        inputs = self.tokenizer(prompt, return_tensors="pt")
        if torch.cuda.is_available():
            inputs = {k: v.to("cuda") for k, v in inputs.items()}
        
        # Generate tokens
        print(f"   Generating tokens...")
        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                min_new_tokens=28,  # At least 4 SNAC frames
                temperature=temperature,
                top_p=top_p,
                repetition_penalty=1.1,
                do_sample=True,
                eos_token_id=CODE_END_TOKEN_ID,
                pad_token_id=self.tokenizer.pad_token_id,
            )
        
        # Extract generated tokens
        generated_ids = outputs[0, inputs['input_ids'].shape[1]:].tolist()
        print(f"   Generated {len(generated_ids)} tokens")
        
        # Extract SNAC codes
        snac_tokens = self.extract_snac_codes(generated_ids)
        print(f"   Extracted {len(snac_tokens)} SNAC tokens")
        
        if len(snac_tokens) < 7:
            raise ValueError(f"Not enough SNAC tokens generated: {len(snac_tokens)} < 7")
        
        # Unpack to 3 hierarchical levels
        levels = self.unpack_snac_from_7(snac_tokens)
        frames = len(levels[0])
        print(f"   Unpacked {frames} frames")
        
        # Convert to tensors
        codes_tensor = [
            torch.tensor(level, dtype=torch.long, device=self.device).unsqueeze(0)
            for level in levels
        ]
        
        # Decode to audio
        print(f"   Decoding to audio...")
        with torch.inference_mode():
            z_q = self.snac_model.quantizer.from_codes(codes_tensor)
            audio = self.snac_model.decoder(z_q)[0, 0].cpu().numpy()
        
        # Save to cache
        if self.enable_cache:
            self._save_to_cache(cache_key, audio)
        
        # Trim warmup samples
        if len(audio) > 2048:
            audio = audio[2048:]
        
        duration_sec = len(audio) / 24000
        print(f"   ✅ Audio generated: {len(audio)} samples ({duration_sec:.2f}s)")
        
        return audio
    
    def save_audio(self, audio: np.ndarray, output_path: str):
        """Save audio to WAV file"""
        sf.write(output_path, audio, 24000)
        print(f"💾 Audio saved: {output_path}")
    
    def _get_cache_key(self, text: str, description: str, temperature: float, top_p: float) -> str:
        """Generate cache key from generation parameters"""
        key_string = f"{text}|{description}|{temperature}|{top_p}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _load_from_cache(self, cache_key: str) -> Optional[np.ndarray]:
        """Load audio from cache if available"""
        cache_file = self.cache_dir / f"{cache_key}.npy"
        if cache_file.exists():
            try:
                return np.load(cache_file)
            except Exception as e:
                print(f"⚠️  Cache load failed: {e}")
                return None
        return None
    
    def _save_to_cache(self, cache_key: str, audio: np.ndarray):
        """Save audio to cache"""
        cache_file = self.cache_dir / f"{cache_key}.npy"
        try:
            np.save(cache_file, audio)
            print(f"🗄️  Cached audio for future use")
        except Exception as e:
            print(f"⚠️  Cache save failed: {e}")
    
    def clear_cache(self):
        """Clear all cached audio files"""
        if self.cache_dir.exists():
            import shutil
            shutil.rmtree(self.cache_dir)
            self.cache_dir.mkdir(exist_ok=True)
            print("🧹 Voice cache cleared")
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        if not self.cache_dir.exists():
            return {"enabled": False}
        
        cache_files = list(self.cache_dir.glob("*.npy"))
        total_size_mb = sum(f.stat().st_size for f in cache_files) / (1024 * 1024)
        
        return {
            "enabled": self.enable_cache,
            "cached_phrases": len(cache_files),
            "total_size_mb": round(total_size_mb, 2),
            "cache_dir": str(self.cache_dir)
        }


def main():
    """Test HOLLY voice generation"""
    print("=" * 80)
    print("🎙️  HOLLY VOICE GENERATOR - MAYA1 TTS TEST")
    print("=" * 80)
    print()
    
    # Initialize generator
    generator = HollyVoiceGenerator()
    
    # Test samples with HOLLY's personality
    test_samples = [
        "Hello Hollywood! I'm HOLLY, your AI developer and creative partner.",
        "Great work on that deployment, Hollywood! The code looks solid.",
        "Let me analyze this for you. I see a few optimization opportunities here.",
    ]
    
    for i, text in enumerate(test_samples, 1):
        print(f"\n{'=' * 80}")
        print(f"Sample {i}/{len(test_samples)}")
        print('=' * 80)
        
        # Generate audio
        audio = generator.generate(text)
        
        # Save audio
        output_path = f"holly_test_{i}.wav"
        generator.save_audio(audio, output_path)
        print()
    
    print("=" * 80)
    print("✨ HOLLY VOICE TEST COMPLETE!")
    print("=" * 80)


if __name__ == "__main__":
    main()
