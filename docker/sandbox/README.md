# HOLLY AI Cloud Sandbox — Docker Setup Guide

## Overview

The cloud sandbox system wraps each builder session in an isolated Docker container. Containers are created, managed, and destroyed by `CloudSandboxManager` in `src/lib/builder/cloud-sandbox.ts`.

## Building the Sandbox Image

```bash
# From project root
docker build -f docker/sandbox/Dockerfile.sandbox -t holly-sandbox:latest .
```

Verify the image:

```bash
docker run --rm holly-sandbox:latest node --version
# v20.x.x
```

## Docker Socket Mounting

The HOLLY server needs access to the Docker daemon to manage containers. Mount the Docker socket when running the server container:

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 3000:3000 \
  holly-server
```

For Docker Compose, add to your `docker-compose.yml`:

```yaml
services:
  holly:
    image: holly-server
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - SANDBOX_PROVIDER=cloud
```

### Remote Docker Daemon

Set the `DOCKER_HOST` environment variable to connect to a remote Docker daemon:

```bash
export DOCKER_HOST=tcp://remote-docker:2376
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH=/path/to/certs
```

## Configuration

Environment variables for tuning resource limits:

| Variable | Default | Description |
|---|---|---|
| `HOLLY_SANDBOX_IMAGE` | `holly-sandbox:latest` | Docker image to use |
| `HOLLY_SANDBOX_MEMORY` | `512m` | Memory limit per container |
| `HOLLY_SANDBOX_CPU_QUOTA` | `100000` | CPU quota (100000 = 1 full CPU) |
| `HOLLY_SANDBOX_DISK` | `10g` | Disk limit per container (requires overlay2 + xfs) |
| `HOLLY_SANDBOX_PIDS` | `200` | Max processes per container |
| `HOLLY_SANDBOX_IDLE_TIMEOUT_MS` | `1800000` | Idle timeout before cleanup (30 min) |
| `HOLLY_SANDBOX_CLEANUP_INTERVAL_MS` | `300000` | Cleanup sweep interval (5 min) |

## Security Considerations

### Container Isolation

- Each container runs as a non-root user (`builder`, UID 1000)
- Containers are on isolated Docker networks (or `--network=none` by default)
- Resource limits prevent resource exhaustion attacks
- PID limits prevent fork bombs

### Docker Socket Security

Mounting `/var/run/docker.sock` grants the host container full Docker daemon access. Mitigate by:

1. **Use Docker Socket Proxy** — Place [tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) in front:
   ```yaml
   services:
     docker-proxy:
       image: tecnativa/docker-socket-proxy
       environment:
         CONTAINERS: 1
         IMAGES: 1
         NETWORKS: 1
         POST: 1
         EXEC: 1
         VOLUMES: 0
         ALLOW_RESTARTS: 0
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock:ro

     holly:
       environment:
         DOCKER_HOST: tcp://docker-proxy:2375
   ```

2. **Use rootless Docker** — Run the Docker daemon in rootless mode to limit privilege escalation.

3. **Use Podman** — Podman's rootless mode provides stronger isolation by default.

### Network Isolation

By default, sandbox containers start with `--network=none`. When a dev server is needed via `startDevServer()`, a dedicated Docker bridge network is created for that container. Containers cannot communicate with each other.

## Resource Limits Tuning

### Memory

Increase for memory-intensive builds (e.g., Next.js with large bundles):

```bash
export HOLLY_SANDBOX_MEMORY=1g
```

### CPU

For faster builds, allow more CPU. Reduce to throttle:

```bash
# 0.5 CPU
export HOLLY_SANDBOX_CPU_QUOTA=50000

# 2 CPUs
export HOLLY_SANDBOX_CPU_QUOTA=200000
```

### Disk

Disk limits require the `overlay2` storage driver with an `xfs` backing filesystem with `pquota` mount option. If your system doesn't support this, remove the disk limit by setting:

```bash
export HOLLY_SANDBOX_DISK=
```

### Idle Timeout

Reduce for cost-sensitive deployments, increase for longer sessions:

```bash
# 10 minute idle timeout
export HOLLY_SANDBOX_IDLE_TIMEOUT_MS=600000

# 1 hour idle timeout
export HOLLY_SANDBOX_IDLE_TIMEOUT_MS=3600000
```

## Fallback Behavior

When Docker is not available (e.g., local development without Docker), the system falls back to the existing local sandbox at `src/lib/builder/sandbox.ts`. This uses the host filesystem directly under `/tmp/holly-builder/`.

To explicitly choose the provider:

```bash
# Force local
export SANDBOX_PROVIDER=local

# Force Docker (errors if unavailable)
export SANDBOX_PROVIDER=cloud
```

## Monitoring

Check running sandbox containers:

```bash
docker ps --filter label=holly.sandbox=true
```

Inspect a specific sandbox:

```bash
docker inspect holly-sandbox-<sessionId>
```

View resource usage:

```bash
docker stats --no-stream $(docker ps -q --filter label=holly.sandbox=true)
```
