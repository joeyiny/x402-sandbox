import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  shims: true,
  // Bundle all internal packages
  noExternal: [
    '@x402-sandbox/facilitator',
    '@x402-sandbox/types',
    '@x402-sandbox/x402-server'
  ],
  platform: 'node',
  target: 'node18',
});
