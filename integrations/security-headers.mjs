// Writes the _headers file after the build (scripts/deploy/nginx-config.mjs turns it into nginx config), so the content security policy
// always matches the analytics host configured for that build (PUBLIC_UMAMI_HOST).
import { writeFile } from 'node:fs/promises';

/** @returns {import('astro').AstroIntegration} */
export function securityHeaders() {
  return {
    name: 'security-headers',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const umami = (process.env.PUBLIC_UMAMI_HOST || '').replace(/\/$/, '');
        const extra = umami ? ` ${umami}` : '';
        const csp = [
          "default-src 'self'",
          `script-src 'self'${extra}`,
          `connect-src 'self'${extra}`,
          "img-src 'self' data:",
          "media-src 'self'",
          // Inline styles: the page's CSS is inlined at build time and the animation system uses style attributes.
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self'",
          // Only this site and the Umami dashboard (heatmap overlay) may frame the page.
          `frame-ancestors 'self'${extra}`,
          "base-uri 'self'",
          "form-action 'none'",
          "object-src 'none'",
          'upgrade-insecure-requests',
        ].join('; ');
        const headers = `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
  Cross-Origin-Opener-Policy: same-origin

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/cv/*
  Cache-Control: public, max-age=3600

/llms.txt
  Content-Type: text/markdown; charset=utf-8
`;
        await writeFile(new URL('_headers', dir), headers);
        logger.info(`_headers written (analytics host: ${umami || 'none'})`);
      },
    },
  };
}
