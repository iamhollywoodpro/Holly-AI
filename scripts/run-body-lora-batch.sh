#!/bin/bash
# Body LoRA Dataset Batch Runner
# Runs generation in small batches to survive sandbox kills
# Each batch: 1 image × 1 attempt = ~1 API call = ~1 min
#
# Usage: bash scripts/run-body-lora-batch.sh [start_id]
# Example: bash scripts/run-body-lora-batch.sh 3    # resume from image 3

LOG="/tmp/body-lora-v2-batch.log"
SCRIPT="scripts/generate-body-lora-dataset.py"
BATCH_SIZE=1
ATTEMPTS=1
TOTAL=84

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"
echo "Holly Body LoRA Batch Runner — $(date)" | tee -a "$LOG"
echo "Batch size: $BATCH_SIZE | Attempts: $ATTEMPTS | Total: $TOTAL" | tee -a "$LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"

# Find starting point
START=${1:-1}

# Check which images already exist and find the first missing one
if [ "$START" -eq 1 ]; then
    for i in $(seq -f "%03g" 1 $TOTAL); do
        if ! ls holly-body-lora-dataset/${i}_*.webp 2>/dev/null | grep -q .; then
            START=$((10#$i))
            echo "Resuming from first missing image: $START" | tee -a "$LOG"
            break
        fi
    done
fi

COUNT=0
SUCCESS=0
FAIL=0

for i in $(seq $START $BATCH_SIZE $TOTAL); do
    END=$((i + BATCH_SIZE - 1))
    if [ $END -gt $TOTAL ]; then
        END=$TOTAL
    fi

    # Check if all images in this batch already exist
    ALL_EXIST=true
    for j in $(seq $i $END); do
        ID=$(printf "%03d" $j)
        if ! ls holly-body-lora-dataset/${ID}_*.webp 2>/dev/null | grep -q .; then
            ALL_EXIST=false
            break
        fi
    done

    if [ "$ALL_EXIST" = true ]; then
        echo "[$(date +%H:%M:%S)] Batch $i-$END: already exists, skipping" | tee -a "$LOG"
        continue
    fi

    BATCH_START=$(date +%s)
    echo "[$(date +%H:%M:%S)] Generating batch $i-$END..." | tee -a "$LOG"

    PYTHONUNBUFFERED=1 python3 -u "$SCRIPT" --start $i --count $BATCH_SIZE --attempts $ATTEMPTS 2>&1 | tee -a "$LOG"

    EXIT=$?
    BATCH_END=$(date +%s)
    ELAPSED=$((BATCH_END - BATCH_START))

    if [ $EXIT -eq 0 ]; then
        echo "[$(date +%H:%M:%S)] ✅ Batch $i-$END done (${ELAPSED}s)" | tee -a "$LOG"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "[$(date +%H:%M:%S)] ❌ Batch $i-$END failed (${ELAPSED}s)" | tee -a "$LOG"
        FAIL=$((FAIL + 1))
    fi

    COUNT=$((COUNT + 1))

    # Small pause between batches
    sleep 2
done

echo "" | tee -a "$LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"
echo "DONE — $(date)" | tee -a "$LOG"
echo "Batches run: $COUNT | Success: $SUCCESS | Fail: $FAIL" | tee -a "$LOG"

# Count final images
FINAL=$(ls holly-body-lora-dataset/*.webp 2>/dev/null | wc -l | tr -d ' ')
echo "Total images: $FINAL / $TOTAL" | tee -a "$LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"
