"""
HOLLY Fine-Tuning Pipeline — Phase 7

Uses Modal's free GPU credits ($30/month) to QLoRA fine-tune
Qwen 3 8B on Holly's best conversations.

Usage:
  modal run services/fine-tuning/finetune_holly.py
  # or for scheduled monthly runs:
  modal deploy services/fine-tuning/finetune_holly.py

Steps:
  1. Upload training data (JSONL from collect_training_data.ts)
  2. Format as instruction dataset
  3. QLoRA fine-tune with 4-bit quantization
  4. Export LoRA adapter
  5. Save to Modal volume (downloadable to Oracle server)
"""

import modal
import json
import os
from datetime import datetime

app = modal.App("holly-finetune")

# Modal volumes for persistent storage
vol = modal.Volume.from_name("holly-models", create_if_missing=True)
MODEL_DIR = "/models"

# Fine-tuning image with required packages
finetune_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.0-devel-ubuntu22.04")
    .pip_install(
        "torch>=2.1.0",
        "transformers>=4.40.0",
        "peft>=0.10.0",
        "trl>=0.8.0",
        "datasets>=2.18.0",
        "accelerate>=0.27.0",
        "bitsandbytes>=0.43.0",
        "scipy",
    )
)

# Base model
BASE_MODEL = "Qwen/Qwen3-8B"
ADAPTER_NAME = "holly-lora-v1"


@app.function(
    image=finetune_image,
    gpu="T4",  # Free tier GPU
    volumes={MODEL_DIR: vol},
    timeout=3600,  # 1 hour max
    memory=16384,
)
def finetune(training_data_path: str = None):
    """Run QLoRA fine-tuning on Holly's collected training data."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from datasets import Dataset
    from trl import SFTTrainer
    from bitsandbytes import BitsAndBytesConfig

    print(f"[FineTune] 🔧 Starting fine-tuning with QLoRA")
    print(f"[FineTune] GPU: {torch.cuda.get_device_name(0)}")
    print(f"[FineTune] VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

    # 1. Load training data
    if training_data_path and os.path.exists(training_data_path):
        data_file = training_data_path
    else:
        # Look for latest training file in volume
        data_dir = os.path.join(MODEL_DIR, "training-data")
        if not os.path.exists(data_dir):
            print("[FineTune] ❌ No training data found. Run collect_training_data.ts first.")
            return None
        files = sorted([f for f in os.listdir(data_dir) if f.endswith('.jsonl')])
        if not files:
            print("[FineTune] ❌ No JSONL files found.")
            return None
        data_file = os.path.join(data_dir, files[-1])

    print(f"[FineTune] 📚 Loading: {data_file}")

    with open(data_file, 'r') as f:
        raw_examples = [json.loads(line) for line in f if line.strip()]

    print(f"[FineTune] Loaded {len(raw_examples)} examples")

    if len(raw_examples) < 10:
        print("[FineTune] ❌ Need at least 10 examples for fine-tuning")
        return None

    # 2. Format as instruction dataset
    def format_example(ex):
        return {
            "text": f"<|im_start|>system\n{ex['system']}<|im_end|>\n"
                    f"<|im_start|>user\n{ex['instruction']}<|im_end|>\n"
                    f"<|im_start|>assistant\n{ex['output']}<|im_end|>"
        }

    formatted = [format_example(ex) for ex in raw_examples]
    dataset = Dataset.from_list(formatted)

    # Split into train/eval
    split = dataset.train_test_split(test_size=0.1, seed=42)
    train_ds = split["train"]
    eval_ds = split["test"]

    print(f"[FineTune] Train: {len(train_ds)}, Eval: {len(eval_ds)}")

    # 3. Load model with 4-bit quantization
    print("[FineTune] Loading base model with 4-bit quantization...")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
    )

    model = prepare_model_for_kbit_training(model)

    # 4. Configure LoRA
    lora_config = LoraConfig(
        r=16,  # Rank
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    trainable, total = model.get_nb_trainable_parameters()
    print(f"[FineTune] Trainable: {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")

    # 5. Training arguments
    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    output_dir = os.path.join(MODEL_DIR, f"holly-adapter-{timestamp}")

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=50,
        save_strategy="steps",
        save_steps=50,
        save_total_limit=2,
        bf16=True,
        gradient_checkpointing=True,
        max_grad_norm=1.0,
        report_to="none",
    )

    # 6. Train
    print("[FineTune] 🚀 Starting training...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        args=training_args,
        max_seq_length=2048,
        dataset_text_field="text",
    )

    trainer.train()

    # 7. Save adapter
    adapter_path = os.path.join(MODEL_DIR, f"holly-lora-{timestamp}")
    trainer.model.save_pretrained(adapter_path)
    tokenizer.save_pretrained(adapter_path)

    # Save metadata
    metadata = {
        "base_model": BASE_MODEL,
        "adapter_name": ADAPTER_NAME,
        "timestamp": timestamp,
        "training_examples": len(train_ds),
        "eval_examples": len(eval_ds),
        "lora_rank": 16,
        "lora_alpha": 32,
        "epochs": 3,
        "avg_quality": sum(ex.get('quality_score', 0.5) for ex in raw_examples) / len(raw_examples),
    }

    with open(os.path.join(adapter_path, "holly-metadata.json"), 'w') as f:
        json.dump(metadata, f, indent=2)

    vol.commit()

    print(f"[FineTune] ✅ Adapter saved to: {adapter_path}")
    print(f"[FineTune] 📊 Metadata: {json.dumps(metadata, indent=2)}")

    return {"adapter_path": adapter_path, "metadata": metadata}


@app.function(
    image=finetune_image,
    volumes={MODEL_DIR: vol},
    timeout=300,
)
def list_adapters():
    """List all saved LoRA adapters."""
    adapters = []
    for name in os.listdir(MODEL_DIR):
        if name.startswith("holly-lora-"):
            metadata_path = os.path.join(MODEL_DIR, name, "holly-metadata.json")
            if os.path.exists(metadata_path):
                with open(metadata_path) as f:
                    adapters.append(json.load(f))
            else:
                adapters.append({"name": name, "status": "incomplete"})
    return adapters


@app.local_entrypoint()
def main(action: str = "finetune", data: str = None):
    if action == "finetune":
        result = finetune.remote(training_data_path=data)
        if result:
            print(f"\n✅ Fine-tuning complete!")
            print(f"Adapter: {result['adapter_path']}")
    elif action == "list":
        adapters = list_adapters.remote()
        print(f"\n📚 Saved adapters ({len(adapters)}):")
        for a in adapters:
            print(f"  • {a.get('adapter_name', a.get('name', 'unknown'))} — {a.get('timestamp', 'unknown')}")
    else:
        print("Usage: modal run finetune_holly.py --action [finetune|list] --data [path]")