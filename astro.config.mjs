import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://techcamargo.com.br',
  compressHTML: true,
  server: {
    port: 4321
  }
});
