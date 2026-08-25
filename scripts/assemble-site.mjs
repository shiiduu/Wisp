// Combines apps/landing/dist (site root) and apps/mockup/dist (site
// root's /mockup subdir) into a single ./dist ready for GitHub Pages.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const outDir = join(root, 'dist');
const landingDist = join(root, 'apps/landing/dist');
const mockupDist = join(root, 'apps/mockup/dist');

if (!existsSync(landingDist) || !existsSync(mockupDist)) {
  console.error('Build apps/landing and apps/mockup before assembling the site.');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(landingDist, outDir, { recursive: true });
cpSync(mockupDist, join(outDir, 'mockup'), { recursive: true });

console.log(`Assembled static site at ${outDir}`);
