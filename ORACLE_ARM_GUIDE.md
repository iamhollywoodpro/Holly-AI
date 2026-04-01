# Getting the Oracle Cloud ARM Free Tier (4 OCPU / 24 GB / 200 GB) — Complete Guide

> **TL;DR** Oracle's `VM.Standard.A1.Flex` is genuinely free forever, but capacity is heavily contested.  
> After 8 months of manual attempts you need **automation**. This guide gives you 5 escalating strategies  
> from "easiest" to "nuclear option". Most people succeed with Strategy 2 or 3 within days.

---

## Why Is It So Hard?

Oracle gives **free** instances so popular they're perpetually "Out of host capacity".  
The trick: Oracle **adds capacity in small bursts at random times** (often middle of the night).  
If you manually check → you'll always miss the window.  
The solution: **automate the retry** so your script is already submitting the request the moment capacity appears.

---

## Strategy 1 — Try Different Regions (5 minutes, no code)

You can only have **one home region** — but you can subscribe to additional regions  
(though free-tier users are limited to 1 subscribed region total).  

**Regions reported to have capacity more often** (as of early 2026, changes frequently):

| Region | Code | Notes |
|--------|------|-------|
| **Sao Paulo** | `sa-saopaulo-1` | Often has capacity |
| **Monterrey** | `mx-monterrey-1` | Newer region, less contested |
| **Jerusalem** | `il-jerusalem-1` | Newer region |
| **Marseille** | `eu-marseille-1` | Sometimes available |
| **Singapore** | `ap-singapore-1` | Variable |
| **Chicago** | `us-chicago-1` | Variable |

**How to try a different region:**
1. OCI Console → top-right region selector → **Manage Regions** → Subscribe to another region  
2. Wait ~15 minutes for it to activate  
3. Try launching `VM.Standard.A1.Flex` in the new region  

> ⚠️ **WARNING**: If you can't change your home region and already have a home region set,  
> your Always Free resources (including the ARM instance) must stay in your home region.  
> If your home region has no capacity, you need Strategy 2+.

---

## Strategy 2 — Upgrade to Pay As You Go (PAYG) — MOST EFFECTIVE

**This is the #1 recommended fix.** Oracle gives PAYG users **priority access to capacity**.

**Steps:**
1. OCI Console → top-right profile → **Upgrade to Pay As You Go**
2. Add a credit card (you **will not be charged** for Always Free resources)
3. **Immediately** set up a $0.01 budget alert:  
   OCI Console → Billing → Budgets → Create Budget → $0.01 monthly → enable email alert
4. Try launching `VM.Standard.A1.Flex` again

**Why it works:** Oracle prioritises PAYG tenancies for capacity.  
**Cost risk:** $0 as long as you only use Always Free resources.  
**Success rate:** High — most users report getting the instance within 24-48 hours after upgrading.

---

## Strategy 3 — Auto-Retry Script via GitHub Actions (FREE, no server needed)

The **hitrov/oci-arm-host-capacity** script runs in GitHub Actions and retries the API call  
every ~10 minutes, 24/7, until it succeeds. When Oracle adds capacity, your script grabs it instantly.

### Step-by-step setup:

#### 3a. Generate an OCI API Key
1. OCI Console → top-right profile → **My Profile** → **API Keys** → **Add API Key**
2. Select "Generate API Key Pair" → **Download Private Key** → **Add**
3. Copy the config preview — you'll need these values:
   - `user`  
   - `fingerprint`  
   - `tenancy`  
   - `region`

#### 3b. Get the Instance Launch Parameters
1. OCI Console → Compute → Instances → **Create Instance**
2. Change Shape → **Ampere** → `VM.Standard.A1.Flex` → 4 OCPU / 24 GB
3. Open **browser DevTools** (F12) → Network tab
4. Click **Create** (it will fail with "Out of capacity" — that's expected)
5. In DevTools, find the red `/instances` API call → right-click → **Copy as cURL**
6. Paste into a text editor and find:
   - `subnetId` → this is your `OCI_SUBNET_ID`
   - `imageId` → this is your `OCI_IMAGE_ID`
   - `availabilityDomain` → note this value

> **Tip:** If you have no subnet yet, first create a free `VM.Standard.E2.1.Micro`  
> instance (AMD, also free) — this creates the VCN/subnet you need.

#### 3c. Fork and Configure the Script

```bash
# Fork this repo on GitHub:
# https://github.com/hitrov/oci-arm-host-capacity
```

Go to your fork's **Settings → Secrets and variables → Actions → New repository secret**  
and add these secrets ONE BY ONE:

| Secret Name | Where to find it |
|-------------|-----------------|
| `OCI_REGION` | From config preview (e.g. `us-ashburn-1`) |
| `OCI_USER_ID` | From config preview (`ocid1.user.oc1...`) |
| `OCI_TENANCY_ID` | From config preview (`ocid1.tenancy.oc1...`) |
| `OCI_KEY_FINGERPRINT` | From config preview (e.g. `xx:xx:xx:...`) |
| `OCI_PRIVATE_KEY_FILENAME` | Public URL to your .pem file (see note below) |
| `OCI_SUBNET_ID` | From DevTools cURL copy |
| `OCI_IMAGE_ID` | From DevTools cURL copy |
| `OCI_SSH_PUBLIC_KEY` | Contents of `~/.ssh/id_rsa.pub` |
| `OCI_OCPUS` | `4` |
| `OCI_MEMORY_IN_GBS` | `24` |
| `OCI_MAX_INSTANCES` | `1` |

**For the private key** — upload the `.pem` file to an OCI Object Storage bucket  
and create a "Pre-Authenticated Request" URL. Use that URL as `OCI_PRIVATE_KEY_FILENAME`.

#### 3d. Enable the GitHub Actions Workflow

In your fork, edit `.github/workflows/tests.yml` to add a scheduled trigger:

```yaml
on:
  schedule:
    - cron: '*/10 * * * *'   # every 10 minutes
  workflow_dispatch:          # allow manual trigger
```

> ⚠️ **IMPORTANT**: Per GitHub Terms of Service, automated workflows must relate to  
> the software in the repository. After you successfully get your instance, **immediately**  
> delete the workflow file or disable it.

#### 3e. Monitor Success

- Go to your fork → **Actions** tab → watch the runs
- When it succeeds, you'll see a big JSON response (not an error)
- Log into OCI Console → Compute → Instances to confirm your new ARM instance is there
- Assign a public IP: Instance Details → Attached VNICs → IPv4 Addresses → Edit → Ephemeral

---

## Strategy 4 — OCI CLI Cron on Your Local Machine

If you have a PC/Mac that stays on, run the retry locally:

```bash
# Install OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Configure it
oci setup config

# Set variables
export C="ocid1.tenancy.oc1..YOUR_TENANCY_ID"
export A="YOUR_AVAILABILITY_DOMAIN"   # e.g. "FeVO:US-ASHBURN-AD-1"
export S="ocid1.subnet.oc1..YOUR_SUBNET_ID"
export I="ocid1.image.oc1..YOUR_IMAGE_ID"   # Ubuntu 22.04 for ARM

# Create shape config files
cat > /tmp/shapeConfig.json << 'EOF'
{"ocpus": 4, "memoryInGBs": 24}
EOF

cat > /tmp/instanceOptions.json << 'EOF'
{"areLegacyImdsEndpointsDisabled": false}
EOF

cat > /tmp/availabilityConfig.json << 'EOF'
{"recoveryAction": "RESTORE_INSTANCE"}
EOF

# Create the retry script
cat > ~/oracle-retry.sh << 'SCRIPT'
#!/bin/bash
export C="ocid1.tenancy.oc1..YOUR_TENANCY_ID"
export A="YOUR_AVAILABILITY_DOMAIN"
export S="ocid1.subnet.oc1..YOUR_SUBNET_ID"
export I="ocid1.image.oc1..YOUR_IMAGE_ID"

# Check if instance already exists
EXISTING=$(oci compute instance list --compartment-id $C --shape VM.Standard.A1.Flex --lifecycle-state RUNNING 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data.get('data', [])))" 2>/dev/null || echo "0")

if [ "$EXISTING" -ge "1" ]; then
  echo "$(date): Instance already exists! Stopping retries."
  exit 0
fi

echo "$(date): Attempting to create instance..."
oci compute instance launch \
  --availability-domain "$A" \
  --compartment-id "$C" \
  --shape VM.Standard.A1.Flex \
  --subnet-id "$S" \
  --assign-public-ip true \
  --display-name holly-server \
  --image-id "$I" \
  --shape-config file:///tmp/shapeConfig.json \
  --instance-options file:///tmp/instanceOptions.json \
  --availability-config file:///tmp/availabilityConfig.json \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
  2>&1

SCRIPT

chmod +x ~/oracle-retry.sh

# Add to crontab — run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/oracle-retry.sh >> ~/oracle-retry.log 2>&1") | crontab -

echo "Cron job added. Check ~/oracle-retry.log for progress."
```

---

## Strategy 5 — Python Telegram Bot with Auto-Retry + Notifications

This is the "nuclear option" — runs 24/7 on any cheap server (or even your NAS),  
retries every 2 minutes, and sends you a Telegram message when it succeeds:

```python
#!/usr/bin/env python3
"""
Oracle ARM Auto-Claimer with Telegram notifications
Requirements: pip install oci requests python-dotenv
"""
import oci
import time
import requests
import os
from datetime import datetime

# ── Config ────────────────────────────────────────────────
OCI_COMPARTMENT_ID = "ocid1.tenancy.oc1..YOUR_TENANCY_ID"
OCI_AVAILABILITY_DOMAIN = "YOUR_AD"  # e.g. "aaaa:US-ASHBURN-AD-1"
OCI_SUBNET_ID = "ocid1.subnet.oc1..YOUR_SUBNET_ID"
OCI_IMAGE_ID = "ocid1.image.oc1..YOUR_IMAGE_ID"
SSH_PUBLIC_KEY = open(os.path.expanduser("~/.ssh/id_rsa.pub")).read().strip()

TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"  # from @BotFather
TELEGRAM_CHAT_ID = "YOUR_CHAT_ID"      # from @userinfobot

RETRY_INTERVAL_SECONDS = 120  # 2 minutes
# ─────────────────────────────────────────────────────────


def send_telegram(message: str):
    """Send a Telegram notification."""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message}, timeout=10)
    except Exception as e:
        print(f"Telegram error: {e}")


def get_existing_arm_instances(compute_client):
    """Check if ARM instance already exists."""
    try:
        instances = oci.pagination.list_call_get_all_results(
            compute_client.list_instances,
            OCI_COMPARTMENT_ID,
            shape="VM.Standard.A1.Flex",
            lifecycle_state="RUNNING"
        ).data
        return instances
    except Exception:
        return []


def try_launch_instance(compute_client):
    """Attempt to launch the ARM instance."""
    try:
        launch_details = oci.core.models.LaunchInstanceDetails(
            availability_domain=OCI_AVAILABILITY_DOMAIN,
            compartment_id=OCI_COMPARTMENT_ID,
            shape="VM.Standard.A1.Flex",
            shape_config=oci.core.models.LaunchInstanceShapeConfigDetails(
                ocpus=4,
                memory_in_gbs=24
            ),
            subnet_id=OCI_SUBNET_ID,
            image_id=OCI_IMAGE_ID,
            display_name="holly-server",
            metadata={"ssh_authorized_keys": SSH_PUBLIC_KEY},
            instance_options=oci.core.models.InstanceOptions(
                are_legacy_imds_endpoints_disabled=False
            ),
            availability_config=oci.core.models.LaunchInstanceAvailabilityConfigDetails(
                recovery_action="RESTORE_INSTANCE"
            ),
        )
        response = compute_client.launch_instance(launch_details)
        return response.data, None
    except oci.exceptions.ServiceError as e:
        return None, e


def main():
    print("🚀 Oracle ARM Auto-Claimer starting...")
    send_telegram("🚀 Oracle ARM auto-claimer started! I'll notify you when the instance is created.")

    # Load OCI config from ~/.oci/config
    config = oci.config.from_file()
    compute_client = oci.core.ComputeClient(config)

    attempt = 0
    while True:
        attempt += 1
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Check if already exists
        existing = get_existing_arm_instances(compute_client)
        if existing:
            msg = f"✅ ARM instance already exists! {existing[0].display_name} is RUNNING."
            print(f"{now}: {msg}")
            send_telegram(msg)
            break

        # Try to launch
        instance, error = try_launch_instance(compute_client)

        if instance:
            msg = (
                f"🎉 SUCCESS! Oracle ARM instance created!\n"
                f"Name: {instance.display_name}\n"
                f"OCID: {instance.id}\n"
                f"State: {instance.lifecycle_state}\n"
                f"Shape: 4 OCPU / 24 GB RAM\n\n"
                f"Now assign a public IP in the OCI Console!"
            )
            print(f"{now}: {msg}")
            send_telegram(msg)
            break
        else:
            error_code = error.code if hasattr(error, 'code') else str(error)
            if error_code in ("LimitExceeded",):
                # Already at max instances
                msg = "✅ Limit exceeded — you already have the max instances! Check OCI Console."
                print(f"{now}: {msg}")
                send_telegram(msg)
                break
            else:
                print(f"{now}: Attempt #{attempt} — {error_code}. Retrying in {RETRY_INTERVAL_SECONDS}s...")

        time.sleep(RETRY_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
```

**Setup:**
```bash
pip install oci requests
# Configure OCI CLI first: oci setup config
python3 oracle-claimer.py
# Or run as background process:
nohup python3 oracle-claimer.py > oracle-claimer.log 2>&1 &
```

**Get a free Telegram bot:**
1. Message `@BotFather` on Telegram → `/newbot` → follow prompts → get token
2. Message `@userinfobot` → get your chat ID

---

## What to Do After You Get the Instance

### 1. Assign a Public IP
OCI Console → Compute → Instances → your instance  
→ Attached VNICs → your VNIC name  
→ IPv4 Addresses → Edit → **Ephemeral** → Update

### 2. Open Firewall Ports
OCI Console → Networking → Virtual Cloud Networks → your VCN  
→ Security Lists → Default Security List → Add Ingress Rules:

| Source CIDR | Protocol | Port | Use |
|-------------|----------|------|-----|
| `0.0.0.0/0` | TCP | 22 | SSH |
| `0.0.0.0/0` | TCP | 80 | HTTP |
| `0.0.0.0/0` | TCP | 443 | HTTPS |
| `0.0.0.0/0` | TCP | 3000 | Dokploy dashboard |

Also open the OS firewall inside the instance:
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save   # Ubuntu 22.04
```

### 3. Install Dokploy + Deploy Holly
Follow `DEPLOY.md` steps 2–6.  
**Summary:**
```bash
ssh ubuntu@YOUR_PUBLIC_IP
curl -sSL https://dokploy.com/install.sh | sh
# Open http://YOUR_PUBLIC_IP:3000 in browser
# Connect GitHub → Holly-AI → docker-compose.yml → add env vars → Deploy
```

### 4. Stop Your Retry Script!
Once the instance is created:
- **GitHub Actions**: delete or disable the workflow file immediately
- **Local cron**: `crontab -e` → remove the oracle-retry line
- **Python script**: `kill` the process

---

## Prevent Oracle from Reclaiming Your Instance

Oracle can reclaim **idle** Always Free instances. Prevent this:

```bash
# Keep the instance active — run this on the server
# Add to crontab: */30 * * * * (every 30 min)

cat > ~/keep-alive.sh << 'EOF'
#!/bin/bash
# Minimal CPU activity to prevent idle detection
dd if=/dev/urandom of=/dev/null bs=1M count=100 2>/dev/null
curl -s http://localhost:3000/api/health > /dev/null 2>&1 || true
echo "$(date): keep-alive ping" >> ~/keep-alive.log
EOF

chmod +x ~/keep-alive.sh
(crontab -l 2>/dev/null; echo "*/30 * * * * ~/keep-alive.sh") | crontab -
```

> Oracle's reclamation threshold: CPU usage below 10% for 7 consecutive days.  
> Holly's crons (every 2 hours) should keep it well above this threshold naturally.

---

## Quick Comparison: Oracle ARM vs Paid Alternatives

| | Oracle ARM (free) | Hetzner CX32 (~$6/mo) | Contabo VPS 1 (~$4/mo) |
|--|--|--|--|
| **CPU** | 4 OCPU (ARM) | 4 vCPU (x86) | 4 vCPU (x86) |
| **RAM** | 24 GB | 8 GB | 6 GB |
| **Storage** | 200 GB | 80 GB | 100 GB |
| **Bandwidth** | 10 TB/mo | 20 TB/mo | Unmetered |
| **Cost** | $0 forever | ~$6/mo | ~$4/mo |
| **Availability** | Hard to get | Instant | Instant |
| **ARM compat.** | Need ARM Docker images | x86 only | x86 only |
| **Best for** | Free forever / patient | Best value paid | Cheapest paid |

### Decision Matrix

```
You need it TODAY and can spend ~$5/mo?
  → Hetzner CX32 (best value, instant, Coolify works perfectly)

You want completely free and can wait a few days/weeks?
  → Upgrade Oracle to PAYG (free, just needs card) + run Strategy 3

You want completely free and can wait weeks/months?
  → Run Strategy 3 or 4, keep trying

You have a Telegram and a spare computer?
  → Strategy 5 (Python bot, most hands-off)
```

---

## Recommended Action Plan for Holly

Given you've tried for 8 months manually:

**Day 1 (30 min):**
1. ✅ Upgrade Oracle account to **Pay As You Go** (set $0.01 budget alert first)
2. ✅ Immediately retry creating `VM.Standard.A1.Flex` after upgrading

**If still failing (Day 2):**
3. ✅ Fork `hitrov/oci-arm-host-capacity` and set up **Strategy 3** (GitHub Actions)
4. ✅ Let it run for 48–72 hours

**If still failing after 1 week:**
5. ✅ Deploy Holly on **Hetzner CX32** ($6/mo) using Coolify right now — don't wait  
6. ✅ Keep the auto-retry running in the background  
7. ✅ When Oracle ARM finally comes through, migrate from Hetzner for free

> 💡 **The real answer:** Don't let chasing "free" block you from shipping.  
> At $6/mo, Hetzner CX32 gives you more RAM/CPU than Vercel Pro ($20/mo)  
> and no deployment limits. It's the pragmatic choice while Oracle ARM stays unavailable.

---

## Resources

| Link | What it is |
|------|-----------|
| https://cloud.oracle.com/free | Sign up for Oracle free tier |
| https://github.com/hitrov/oci-arm-host-capacity | PHP auto-retry script (GitHub Actions) |
| https://docs.oracle.com/en-us/iaas/Content/API/Concepts/cliconcepts.htm | OCI CLI docs |
| https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/troubleshooting-out-of-host-capacity.htm | Oracle's official troubleshooting |
| https://hetzner.com/cloud | Hetzner VPS (best paid fallback) |
| https://coolify.io | Free self-hosted Heroku/Vercel alternative |
| DEPLOY.md | Holly deployment guide (in this repo) |
