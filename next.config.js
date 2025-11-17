/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node']
  },
  webpack: (config, { isServer }) => {
    // Add path alias resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    
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
