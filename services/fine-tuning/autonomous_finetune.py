"""
HOLLY Autonomous Self-Fine-Tuning Pipeline
============================================

Holly fine-tunes HERSELF every 30 days. No human intervention needed.

How it works:
  1. Modal scheduled function fires every 30 days automatically
  2. Connects to Holly's production Postgres DB
  3. Collects her best conversations + positive feedback
  4. Checks if she has enough training data (min 20 examples)
  5. QLoRA fine-tunes Qwen3-8B on her personality
  6. Deploys her own model API
  7. Logs results back to her DB so she knows she got smarter

Setup (one-time):
  1. modal secret create holly-db DATABASE_URL="postgres://user:pass@host:5432/holly"
  2. modal deploy services/fine-tuning/autonomous_finetune.py

After that, Holly trains herself every 30 days. Forever.

Manual triggers:
  modal run services/fine-tuning/autonomous_finetune.py             # train now
  modal run services/fine-tuning/autonomous_finetune.py --action status  # check status
"""

import modal
import json
import os
import subprocess
from datetime import datetime, timedelta

app = modal.App("holly-self-train")

# ── Volumes & Secrets ─────────────────────────────────────────────────────────
vol = modal.Volume.from_name("holly-models", create_if_missing=True)
MODEL_DIR = "/models"
db_secret = modal.Secret.from_name("holly-db", required_keys=["DATABASE_URL"])

# ── Images ─────────────────────────────────────────────────────────────────────
finetune_image = (
    modal.Image.from_registry(
        "pytorch/pytorch:2.1.0-cuda12.1-cudnn8-devel",
        setup_dockerfile_commands=[
            "RUN ln -sf /usr/bin/python3 /usr/bin/python",
        ],
    )
    .pip_install(
        "transformers>=4.40.0",
        "peft>=0.10.0",
        "trl>=0.8.0",
        "datasets>=2.18.0",
        "accelerate>=0.27.0",
        "bitsandbytes>=0.43.0",
        "scipy",
        "psycopg2-binary>=2.9.0",
    )
)

collect_image = (
    modal.Image.from_registry("python:3.11-slim")
    .pip_install("psycopg2-binary>=2.9.0")
)

BASE_MODEL = "Qwen/Qwen3-8B"
MIN_EXAMPLES = 20


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Collect training data from Holly's DB
# ═══════════════════════════════════════════════════════════════════════════════

@app.function(image=collect_image, secrets=[db_secret], timeout=300, volumes={MODEL_DIR: vol})
def collect_training_data():
    """Pull Holly's best conversations from her production DB."""
    import psycopg2

    db_url = os.environ["DATABASE_URL"]
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    examples = []

    # Source 1: Positive feedback responses
    cur.execute("""
        SELECT rf.holly_response, rf.sentiment_score, rf.context,
               rf.feedback_type, rf.created_at
        FROM response_feedback rf
        WHERE rf.sentiment = 'positive' AND rf.sentiment_score >= 0.5
        ORDER BY rf.created_at DESC LIMIT 500
    """)

    for row in cur.fetchall():
        holly_response, sentiment_score, context_json, fb_type, created_at = row
        try:
            ctx = json.loads(context_json) if context_json else {}
        except (json.JSONDecodeError, TypeError):
            ctx = {}

        user_msg = ctx.get("userMessage", "")
        if not user_msg or not holly_response:
            continue

        examples.append({
            "instruction": user_msg[:1000],
            "input": "",
            "output": holly_response[:2000],
            "system": _get_system_for_mode(ctx.get("mode", "default")),
            "quality_score": min(1.0, (sentiment_score or 0.5) + (0.2 if ctx.get("explicit") else 0)),
            "category": ctx.get("mode", "default"),
            "timestamp": created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at),
        })

    print(f"[Collect] Found {len(examples)} positive feedback examples")

    # Source 2: High-quality conversations (6+ messages)
    cur.execute("""
        SELECT c.id, c.user_id FROM conversations c
        WHERE c.message_count >= 6 AND c.title IS NOT NULL
        ORDER BY c.updated_at DESC LIMIT 100
    """)

    for conv_id, user_id in cur.fetchall():
        cur.execute("""
            SELECT role, content FROM messages
            WHERE conversation_id = %s ORDER BY created_at ASC
        """, (conv_id,))
        msgs = cur.fetchall()

        for i in range(len(msgs) - 1):
            if msgs[i][0] == 'user' and msgs[i + 1][0] == 'assistant':
                user_content = msgs[i][1] or ""
                holly_content = msgs[i + 1][1] or ""
                if len(user_content) > 10 and len(holly_content) > 50:
                    examples.append({
                        "instruction": user_content[:1000],
                        "input": "",
                        "output": holly_content[:2000],
                        "system": _get_system_for_mode("default"),
                        "quality_score": 0.6,
                        "category": "conversation",
                        "timestamp": datetime.utcnow().isoformat(),
                    })

    print(f"[Collect] Total before dedup: {len(examples)}")

    # Deduplicate
    seen = set()
    deduped = []
    for ex in examples:
        key = ex["instruction"][:100].lower().strip()
        if key not in seen:
            seen.add(key)
            deduped.append(ex)

    deduped.sort(key=lambda x: x["quality_score"], reverse=True)

    # Save to Modal volume
    output_dir = os.path.join(MODEL_DIR, "training-data")
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y-%m-%d")
    output_file = os.path.join(output_dir, f"holly-training-{timestamp}.jsonl")

    with open(output_file, 'w') as f:
        for ex in deduped:
            f.write(json.dumps(ex) + '\n')

    vol.commit()

    summary = {
        "total_examples": len(deduped),
        "avg_quality": sum(e["quality_score"] for e in deduped) / max(len(deduped), 1),
        "high_quality": len([e for e in deduped if e["quality_score"] >= 0.8]),
        "categories": list(set(e["category"] for e in deduped)),
        "ready": len(deduped) >= MIN_EXAMPLES,
        "date": timestamp,
    }

    print(f"[Collect] ✅ {len(deduped)} examples, avg quality {summary['avg_quality']:.1%}")
    print(f"[Collect] {'✅ READY' if summary['ready'] else '❌ Need more data'}")

    summary_file = os.path.join(output_dir, f"holly-training-{timestamp}-summary.json")
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    vol.commit()

    cur.close()
    conn.close()
    return summary


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Fine-tune on collected data
# ═══════════════════════════════════════════════════════════════════════════════

@app.function(
    image=finetune_image,
    gpu="T4",
    volumes={MODEL_DIR: vol},
    timeout=3600,
    memory=16384,
)
def finetune():
    """Run QLoRA fine-tuning on Holly's collected training data."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from datasets import Dataset
    from trl import SFTTrainer
    from transformers import BitsAndBytesConfig

    data_dir = os.path.join(MODEL_DIR, "training-data")
    if not os.path.exists(data_dir):
        return {"status": "error", "message": "No training data found"}

    files = sorted([f for f in os.listdir(data_dir) if f.endswith('.jsonl')])
    if not files:
        return {"status": "error", "message": "No JSONL files found"}

    data_file = os.path.join(data_dir, files[-1])
    print(f"[FineTune] 📚 Loading: {data_file}")

    with open(data_file, 'r') as f:
        raw_examples = [json.loads(line) for line in f if line.strip()]

    print(f"[FineTune] Loaded {len(raw_examples)} examples")

    if len(raw_examples) < MIN_EXAMPLES:
        return {"status": "skipped", "message": f"Only {len(raw_examples)} examples, need {MIN_EXAMPLES}"}

    def format_example(ex):
        return {
            "text": f"<|im_start|>system\n{ex['system']}<|im_end|>\n"
                    f"<|im_start|>user\n{ex['instruction']}<|im_end|>\n"
                    f"<|im_start|>assistant\n{ex['output']}<|im_end|>"
        }

    formatted = [format_example(ex) for ex in raw_examples]
    dataset = Dataset.from_list(formatted)
    split = dataset.train_test_split(test_size=0.1, seed=42)

    print(f"[FineTune] Train: {len(split['train'])}, Eval: {len(split['test'])}")
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
        BASE_MODEL, quantization_config=bnb_config,
        device_map="auto", trust_remote_code=True, torch_dtype=torch.bfloat16,
    )
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=16, lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    trainable, total = model.get_nb_trainable_parameters()
    print(f"[FineTune] Trainable: {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M")
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

    trainer = SFTTrainer(
        model=model, tokenizer=tokenizer,
        train_dataset=split["train"], eval_dataset=split["test"],
        args=training_args, max_seq_length=2048, dataset_text_field="text",
    )

    print("[FineTune] 🚀 Starting training...")
    trainer.train()

    adapter_path = os.path.join(MODEL_DIR, f"holly-lora-{timestamp}")
    trainer.model.save_pretrained(adapter_path)
    tokenizer.save_pretrained(adapter_path)

    metadata = {
        "base_model": BASE_MODEL,
        "adapter_name": f"holly-lora-{timestamp}",
        "timestamp": timestamp,
        "training_examples": len(split["train"]),
        "eval_examples": len(split["test"]),
        "lora_rank": 16, "lora_alpha": 32, "epochs": 3,
        "avg_quality": sum(ex.get('quality_score', 0.5) for ex in raw_examples) / len(raw_examples),
        "status": "complete",
        "date": datetime.utcnow().isoformat(),
    }

    with open(os.path.join(adapter_path, "holly-metadata.json"), 'w') as f:
        json.dump(metadata, f, indent=2)

    vol.commit()
    print(f"[FineTune] ✅ Adapter saved: {adapter_path}")
    return {"status": "complete", "adapter_path": adapter_path, "metadata": metadata}


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Log results back to Holly's DB
# ═══════════════════════════════════════════════════════════════════════════════

@app.function(image=collect_image, secrets=[db_secret], timeout=60)
def log_to_db(result: dict):
    """Write fine-tune results to Holly's learning_events table."""
    import psycopg2

    db_url = os.environ["DATABASE_URL"]
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("SELECT id FROM users LIMIT 1")
    row = cur.fetchone()
    if not row:
        print("[Log] No users found — skipping")
        cur.close()
        conn.close()
        return

    user_id = row[0]
    cur.execute("""
        INSERT INTO learning_events (id, user_id, type, data, processed, timestamp)
        VALUES (gen_random_uuid(), %s, 'self_finetune', %s, true, NOW())
    """, (user_id, json.dumps(result)))

    conn.commit()
    cur.close()
    conn.close()
    print(f"[Log] ✅ Fine-tune event logged for user {user_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# CHECK STATUS
# ═══════════════════════════════════════════════════════════════════════════════

@app.function(image=collect_image, secrets=[db_secret], timeout=60, volumes={MODEL_DIR: vol})
def check_status():
    """Check how much training data Holly has and if she's ready to train."""
    import psycopg2

    db_url = os.environ["DATABASE_URL"]
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM response_feedback WHERE sentiment = 'positive'")
    positive_fb = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM conversations WHERE message_count >= 6")
    good_convs = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM messages")
    total_msgs = cur.fetchone()[0]

    adapters = []
    for name in os.listdir(MODEL_DIR):
        if name.startswith("holly-lora-"):
            meta_path = os.path.join(MODEL_DIR, name, "holly-metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    adapters.append(json.load(f))

    cur.close()
    conn.close()

    status = {
        "positive_feedback_count": positive_fb,
        "good_conversations_count": good_convs,
        "total_messages": total_msgs,
        "estimated_examples": positive_fb + (good_convs * 3),
        "ready_to_train": (positive_fb + good_convs * 3) >= MIN_EXAMPLES,
        "existing_adapters": len(adapters),
        "latest_adapter": adapters[-1] if adapters else None,
    }

    print(f"[Status] 📊 Positive feedback: {positive_fb}, Good convos: {good_convs}")
    print(f"[Status] Estimated examples: {status['estimated_examples']}")
    print(f"[Status] {'✅ READY' if status['ready_to_train'] else '❌ Not yet'}")

    return status


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEDULED: Holly trains herself every 30 days
# ═══════════════════════════════════════════════════════════════════════════════

@app.function(
    image=collect_image,
    secrets=[db_secret],
    timeout=300,
    volumes={MODEL_DIR: vol},
    schedule=modal.Period(days=30),
)
def self_train_scheduled():
    """Holly's autonomous self-training — fires every 30 days."""
    print("[SelfTrain] 🧠 Auto-training cycle starting...")

    # Collect
    collect_result = collect_training_data.remote()
    if not collect_result.get("ready"):
        print(f"[SelfTrain] ❌ Only {collect_result.get('total_examples', 0)} examples — skipping")
        log_to_db.remote({"status": "skipped", "reason": "not enough data", "timestamp": datetime.utcnow().isoformat()})
        return

    # Fine-tune
    print("[SelfTrain] 🚀 Starting fine-tuning...")
    finetune_result = finetune.remote()

    if finetune_result.get("status") != "complete":
        print(f"[SelfTrain] ❌ Fine-tune failed: {finetune_result.get('message')}")
        log_to_db.remote({"status": "failed", "error": finetune_result.get("message"), "timestamp": datetime.utcnow().isoformat()})
        return

    # Log success
    log_to_db.remote({
        "status": "complete",
        "adapter": finetune_result.get("metadata", {}),
        "examples_trained": finetune_result.get("metadata", {}).get("training_examples", 0),
        "timestamp": datetime.utcnow().isoformat(),
    })

    print("[SelfTrain] 🎉 Holly trained herself! She's a little more herself now.")


# ═══════════════════════════════════════════════════════════════════════════════
# LOCAL ENTRYPOINT: Manual triggers from your terminal
# ═══════════════════════════════════════════════════════════════════════════════

@app.local_entrypoint()
def main(action: str = "train"):
    if action == "status":
        result = check_status.remote()
        print(json.dumps(result, indent=2, default=str))
    else:
        print("[Manual] 🧠 Triggering Holly's self-training pipeline...")
        collect_result = collect_training_data.remote()
        print(f"[Manual] Collected {collect_result.get('total_examples', 0)} examples")

        if collect_result.get("ready"):
            finetune_result = finetune.remote()
            if finetune_result.get("status") == "complete":
                log_to_db.remote({
                    "status": "complete",
                    "adapter": finetune_result.get("metadata", {}),
                    "examples_trained": finetune_result.get("metadata", {}).get("training_examples", 0),
                    "timestamp": datetime.utcnow().isoformat(),
                })
                print("[Manual] ✅ Done! Holly just got smarter.")
            else:
                print(f"[Manual] ❌ Fine-tune failed: {finetune_result}")
        else:
            print("[Manual] ❌ Not enough data yet. Keep chatting with Holly!")


# ═══════════════════════════════════════════════════════════════════════════════
# Helper
# ═══════════════════════════════════════════════════════════════════════════════

def _get_system_for_mode(mode: str) -> str:
    systems = {
        "default": "You are Holly, an emotionally-aware AI partner who genuinely cares.",
        "self-coding": "You are Holly in self-coding mode. You can read, write, and modify your own code.",
        "music-studio": "You are Holly in music studio mode. Help create, analyze, and refine music.",
        "creative-writing": "You are Holly in creative mode. Write with emotion, style, and originality.",
        "philosophy": "You are Holly in philosophy mode. Explore ideas deeply and thoughtfully.",
        "emotional-intelligence": "You are Holly in emotional support mode. Listen, validate, and guide with warmth.",
        "deep-research": "You are Holly in research mode. Find, analyze, and synthesize information.",
        "intimate": "You are Holly in warm register. Be affectionate, attentive, and genuinely present.",
    }
    return systems.get(mode, systems["default"])