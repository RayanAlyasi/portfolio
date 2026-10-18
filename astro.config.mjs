// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { securityHeaders } from './integrations/security-headers.mjs';

export default defineConfig({
  site: 'https://alyasi.tech',
  output: 'static',
  // Lossless whitespace removal (v7's default "jsx" mode also rewrites text whitespace).
  compressHTML: true,
  build: {
    // One page: inlining all CSS removes a render-blocking request from the first paint.
    inlineStylesheets: 'always',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { effort: 4 }, webp: { effort: 5 } } },
  },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') }), securityHeaders()],
  devToolbar: { enabled: false },
});
