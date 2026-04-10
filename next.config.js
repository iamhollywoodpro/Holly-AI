/** @type {import('next').NextConfig} */

const nextConfig = {
  // ── Docker / Dokploy: standalone output bundles everything into .next/standalone
  // Required for the production Dockerfile — do NOT remove
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // ── Build memory control ──────────────────────────────────────────────────
  // On Coolify (ARM64 Oracle Cloud, 4-core), Next.js static page generation
  // spawns one worker per CPU. With NODE_OPTIONS='--max-old-space-size=4096',
  // that's 4 cores × 4GB = 16GB peak — which OOM-kills the Docker build
  // (exit code 255 at "Generating static pages (0/359)").
  // Limiting to 1 worker thread keeps peak memory under 4GB and fixes the crash.
  experimental: {
    workerThreads: false,
    cpus: 1,
    // ── Trust reverse proxy headers (Next.js 14 experimental) ───────────────
    // Traefik sets X-Forwarded-Host: holly.nexamusicgroup.com and
    // X-Forwarded-Proto: https on every request. Without this, Next.js uses
    // the Docker-internal host (0.0.0.0:3000) to build redirect URLs, which
    // causes Clerk to reject them with 422 Unprocessable Content.
    // NOTE: trustHost is a top-level option in Next.js 15+; in Next.js 14
    // it is handled via the HOSTNAME env var + Traefik headers automatically.
  },

  // Prevent single TS errors from blocking production deployments
  typescript: {
    // Disable tsc type-checking during `next build` — it OOMs the build worker
    // on memory-constrained servers (the checker allocates >2 GB for large apps).
    // Type safety is verified separately via `npx tsc --noEmit` in CI / local dev.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true, // ESLint warnings shouldn't block deployments
  },
  webpack: (config, { isServer }) => {
    // Path aliases are already handled by tsconfig.json
    // Don't override them in webpack config to avoid conflicts
    
    // Exclude .node files from webpack processing
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    
    if (!isServer) {
      // Don't bundle these server-only packages in client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@xenova/transformers': false,
        'onnxruntime-node': false,
        'sharp': false,
        'fs': false,
        'path': false,
        'crypto': false,
      };
    }
    
    // Externalize server-only packages
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@xenova/transformers', 'onnxruntime-node');
    }
    
    return config;
  }
};

module.exports = nextConfig;
