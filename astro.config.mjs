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
    // Slide pages as exhibit-b.html, so /exhibit-b is served as is (nginx tries $uri.html) with no redirect.
    format: 'file',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { effort: 4 }, webp: { effort: 5 } } },
  },
  // Only the home page: the slide pages (src/pages/[slide].astro) name it as their canonical page.
  integrations: [sitemap({ filter: (page) => new URL(page).pathname === '/' }), securityHeaders()],
  devToolbar: { enabled: false },
});
