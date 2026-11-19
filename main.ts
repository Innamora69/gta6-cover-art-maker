// Vice Cover Studio — the entrypoint for gta6-cover-art-01 (Node 22, standard
// library only). The app itself is plain static files under app/: index.html plus
// its ES modules, local font and sample photos, no build step and no network
// request. This program hands it in: it copies app/ and screenshots/ from beside
// this file into the output directory and writes /output/dossier.json with the
// vendored make.fun library, so the scorer can rebuild the same dossier byte
// for byte. Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's gate: app/ at most 993 entries / 48 MiB, a path
// under app/ at most 1000 bytes, at most 4 screenshots of at most 256 KiB each.
// Only text_max_bytes shapes the dossier bytes; the other caps make this program
// fail exactly where the scorer would refuse the entry.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
