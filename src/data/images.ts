import type { ImageMetadata } from 'astro';

// Every image in src/assets/img, keyed by file name (e.g. "talk" for talk.webp).
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/img/*.{webp,png,jpg}', { eager: true });

export const images: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(files).map(([path, mod]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), mod.default]),
);

// Screenshots and documents keep fine detail, so they get larger widths than photos.
const DETAILED = new Set(['argoApp', 'labArch', 'labCron', 'labSec', 'labPort', 'labMotd', 'wa0', 'wa1', 'wa2', 'cleanrrShot', 'cv']);

export function widthsFor(name: string): number[] {
  if (name === 'cv') return [800, 1200, 1571];
  if (DETAILED.has(name)) return [800, 1200, 1600, 2400];
  return [400, 640, 960, 1280];
}

export function getImageOrThrow(name: string): ImageMetadata {
  const img = images[name];
  if (!img) throw new Error(`Unknown image "${name}". Add it to src/assets/img.`);
  return img;
}
