'''
ostris/ai-toolkit on https://modal.com — updated for Modal 1.4.x API

Run training:
  modal run run_modal.py --config-file-list-str=config/holly_zimage_v1.yml
'''

import os
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
import sys
import modal
from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, "/root/ai-toolkit")
os.environ['DISABLE_TELEMETRY'] = 'YES'

# Volume for model outputs
model_volume = modal.Volume.from_name("flux-lora-models", create_if_missing=True)
MOUNT_DIR = "/root/ai-toolkit/modal_output"

# Image with all deps + local ai-toolkit code + dataset mounted
# Note: add_local_dir with copy=True so requirements.txt is available for pip install
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .add_local_dir("/tmp/ai-toolkit", remote_path="/root/ai-toolkit", copy=True)
    # Use AI Toolkit's own requirements files (properly pinned versions)
    # + torchaudio (imported by config_modules but missing from requirements)
    .run_commands(
        "pip install -r /root/ai-toolkit/requirements.txt torchaudio tiktoken",
    )
)

app = modal.App(name="holly-zimage-lora-training", image=image, volumes={MOUNT_DIR: model_volume})

if os.environ.get("DEBUG_TOOLKIT", "0") == "1":
    import torch
    torch.autograd.set_detect_anomaly(True)

import argparse

def print_end_message(jobs_completed, jobs_failed):
    failure_string = f"{jobs_failed} failure{'' if jobs_failed == 1 else 's'}" if jobs_failed > 0 else ""
    completed_string = f"{jobs_completed} completed job{'' if jobs_completed == 1 else 's'}"
    print("")
    print("========================================")
    print("Result:")
    if len(completed_string) > 0:
        print(f" - {completed_string}")
    if len(failure_string) > 0:
        print(f" - {failure_string}")
    print("========================================")


@app.function(
    gpu="A100",
    timeout=7200,
)
def main(config_file_list_str: str, recover: bool = False, name: str = None):
    # Import inside the function so it runs in the Modal container, not locally
    from toolkit.job import get_job

    config_file_list = config_file_list_str.split(",")
    jobs_completed = 0
    jobs_failed = 0

    print(f"Running {len(config_file_list)} job{'' if len(config_file_list) == 1 else 's'}")

    for config_file in config_file_list:
        try:
            job = get_job(config_file, name)
            job.config['process'][0]['training_folder'] = MOUNT_DIR
            os.makedirs(MOUNT_DIR, exist_ok=True)
            print(f"Training outputs will be saved to: {MOUNT_DIR}")
            job.run()
            model_volume.commit()
            job.cleanup()
            jobs_completed += 1
        except Exception as e:
            print(f"Error running job: {e}")
            import traceback
            traceback.print_exc()
            jobs_failed += 1
            if not recover:
                print_end_message(jobs_completed, jobs_failed)
                raise e

    print_end_message(jobs_completed, jobs_failed)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        'config_file_list',
        nargs='+',
        type=str,
        help='Config file(s)',
    )
    parser.add_argument('-r', '--recover', action='store_true')
    parser.add_argument('-n', '--name', type=str, default=None)
    args = parser.parse_args()
    config_file_list_str = ",".join(args.config_file_list)
    main.call(config_file_list_str=config_file_list_str, recover=args.recover, name=args.name)
# build trigger Thu Jul 16 15:17:49 EDT 2026
