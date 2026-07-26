/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,

  /**
   * Let the Anthropic SDK bundle for the browser.
   *
   * The SDK's entry point imports `node:path` from its credential resolver — the
   * code that reads an `ant auth login` profile off disk. A browser never takes
   * that path (the MENTOR agent panel passes an explicit key), but webpack still
   * has to resolve the import, and it refuses a bare `node:` scheme.
   *
   * So: strip the scheme, then resolve those builtins to nothing. Two steps
   * because they fix two different failures — the plugin turns `node:path` into
   * `path`, and the fallback turns `path` into an empty module instead of a
   * "can't resolve" error. This is client-only; nothing here changes how the
   * canvas or the Python backend behave.
   */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: false,
        fs: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
