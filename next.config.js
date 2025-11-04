/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle these server-only packages in client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@xenova/transformers': false,
        'onnxruntime-node': false,
        'sharp': false
      };
    }
    return config;
  }
};

module.exports = nextConfig;
