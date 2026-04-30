import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.tsx',
  },
  format: ['esm'],
  dts: true,
  minify: true,
  treeshake: true,
  splitting: false,
  clean: true,
  external: ['react'],
  sourcemap: true,
  target: 'es2022',
  platform: 'neutral',
});
