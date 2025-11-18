/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add path alias resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    
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
