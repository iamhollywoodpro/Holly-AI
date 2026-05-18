/** @type {import('next').NextConfig} */

const nextConfig = {
  // ── Clerk SDK internal proxy rewrites ──────────────────────────────────────
  // The @clerk/backend SDK makes internal proxy requests to /clerk_XXXXX paths.
  // Without CLERK_PROXY_URL set, these go to the app root instead of /api/clerk/.
  // This rewrite catches them and routes through the existing Clerk proxy.
  // The middleware also handles this, but this is a safety net.
  async rewrites() {
    return [
      {
        source: '/clerk_:id(.*)',
        destination: '/api/clerk/clerk_:id',
      },
    ];
  },

  // ── Standalone output — always on (required for Docker runner image)
  // .next/standalone bundles everything needed to run without node_modules
  // Do NOT make this conditional — DOCKER_BUILD env var is not reliable at build time
  output: 'standalone',

  // ── Build memory control ──────────────────────────────────────────────────
  // On Coolify (ARM64 Oracle Cloud, 4-core), Next.js static page generation
  // spawns one worker per CPU. With NODE_OPTIONS='--max-old-space-size=4096',
  // that's 4 cores × 4GB = 16GB peak — which OOM-kills the Docker build
  // (exit code 255 at "Generating static pages (0/369)").
  // Limiting to 1 worker thread keeps peak memory under 4GB and fixes the crash.
  // Abort static page generation after 60s per page (prevents hanging)
  staticPageGenerationTimeout: 60,

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
    
    // Externalize server-only packages (native addons must not be bundled)
    if (isServer) {
      config.externals = config.externals || [];
      // node-pty: native addon (.node binary) — must be external so webpack
      // doesn't try to bundle it. The terminal-registry.ts uses dynamic require()
      // inside try/catch so missing binding degrades gracefully to REST terminal.
      // ws: WebSocket library used by server.ts — must not be bundled into Next.js output
      config.externals.push('@xenova/transformers', 'onnxruntime-node', 'node-pty', 'ws');
    }
    
    return config;
  }
};

module.exports = nextConfig;
