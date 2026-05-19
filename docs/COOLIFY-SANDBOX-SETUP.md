# Builder Sandbox — Coolify Docker Setup

## Overview

The HOLLY Builder sandbox can run code in isolated Docker containers for safety. This requires mounting the Docker socket into the HOLLY container.

## Option A: Docker Socket (Recommended for single-app servers)

### In Coolify UI:
1. Navigate to your HOLLY application
2. Go to **Configuration**
3. Find **Volumes** section
4. Click **Add Volume**
5. Set:
   - **Host Path:** `/var/run/docker.sock`
   - **Container Path:** `/var/run/docker.sock`
6. Add environment variable:
   - **Key:** `SANDBOX_PROVIDER`
   - **Value:** `docker`
7. Save and **Redeploy**

### Security Note
Mounting the Docker socket gives the container full Docker daemon access. Only do this on a server where HOLLY is the primary (or only) service. If you share the server with other critical services, use Option B instead.

## Option B: Local Provider (Default, No Docker)

If you don't mount the Docker socket, the sandbox automatically uses the local provider:
- Code runs in `/tmp/holly-builder/<session-id>/`
- Processes are managed via PID tracking
- No container isolation, but zero configuration required

To explicitly set this:
- **Key:** `SANDBOX_PROVIDER`
- **Value:** `local`

## Verification

After configuring Docker mode, check the health endpoint:
```
curl https://your-holly-url/api/health
```

The response should include `"sandbox": "docker"` if the Docker socket is properly mounted.

## Troubleshooting

### "Cannot connect to Docker daemon"
The Docker socket is not mounted. Verify the volume mount in Coolify configuration.

### "permission denied while trying to connect"
The container user doesn't have Docker group access. Add to your Dockerfile:
```dockerfile
RUN addgroup --system --gid 999 docker && adduser nextjs docker
```

### Sandbox falls back to local
Check container logs for Docker connection errors. The system automatically falls back to local when Docker is unavailable.
