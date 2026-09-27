import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'http://techcamargo.com.br',
  compressHTML: true,
  server: {
    host: true,
    port: 4321
  }
});
