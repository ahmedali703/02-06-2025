/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // Add global polyfill for Edge Runtime
    config.plugins.push(
      new webpack.DefinePlugin({
        global: isServer ? 'globalThis' : 'window',
      })
    );

    // Exclude Node-specific modules
    config.externals = config.externals || [];
    config.externals.push(
      'oracledb',
      'dns',
      'tls',
      'net',
      'readline',
      'oci-secrets',
      'oci-common',
      'oci-objectstorage',
      '@azure/identity',
      '@azure/keyvault-secrets',
      'fs',
      'child_process',
      'worker_threads'
    );

    // Adjust Node.js polyfill configuration
    config.node = {
      ...config.node,
      global: isServer, // Only enable global for server builds
      __filename: isServer,
      // __dirname: isServer,
    };

    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@azure/identity': false,
        '@azure/keyvault-secrets': false,
        'oci-common': false,
        'oci-objectstorage': false,
        'oci-secrets': false,
        oracledb: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;