// Combines apps/landing/dist (site root) and apps/mockup/dist (site
// root's /mockup subdir) into a single ./dist ready for GitHub Pages.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const outDir = join(root, 'dist');
const landingDist = join(root, 'apps/landing/dist');
const selectDist = join(root, 'apps/select/dist');
const mockupDist = join(root, 'apps/mockup/dist');
const riotTxt = join(root, 'riot.txt');

if (!existsSync(landingDist) || !existsSync(selectDist) || !existsSync(mockupDist)) {
  console.error('Build apps/landing, apps/select and apps/mockup before assembling the site.');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(landingDist, outDir, { recursive: true });
cpSync(selectDist, join(outDir, 'select'), { recursive: true });
cpSync(mockupDist, join(outDir, 'mockup'), { recursive: true });

// riot.txt lives at the repo root for visibility alongside CLAUDE.md /
// PLAYBOOK.md, but must be served from the site root — apps/landing's
// Vite build only auto-copies its own public/, not arbitrary repo-root
// files, so copy it explicitly.
if (!existsSync(riotTxt)) {
  console.error('riot.txt not found at repo root — required for domain verification.');
  process.exit(1);
}
cpSync(riotTxt, join(outDir, 'riot.txt'));

console.log(`Assembled static site at ${outDir}`);
