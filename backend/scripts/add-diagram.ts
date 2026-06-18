/**
 * Helper CLI interactivo para agregar un diagrama al portafolio.
 *
 *   pnpm script:diagram:add <ruta-al-svg-o-png> [--project <projectId>]
 *
 * Qué hace:
 *   1. Lee el archivo de entrada (SVG o imagen).
 *   2. Sanitiza el SVG (quita color-scheme y otros anti-patrones).
 *   3. Pregunta proyecto (autocomplete contra manifest + carpetas existentes).
 *   4. Pregunta caption ES y EN.
 *   5. Calcula próximo orden (max NN existente + 1) y slug del filename.
 *   6. Copia a frontend/public/diagrams/<carpeta>/<NN>-<slug>.<ext>.
 *   7. Actualiza captions.json del proyecto con la entrada nueva.
 *   8. Imprime instrucción para correr sync-diagrams si querés ver el resultado.
 *
 * No edita projects.ts ni diagrams.json. Eso lo hace sync-diagrams.ts.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { loadManifest, REPO_ROOT_PATH } from './lib/github.js';
import { sanitizeSvg } from './lib/svg-sanitize.js';

const FOLDER_ALIASES: Record<string, string> = { dev1: 'portfolio' };

function projectIdToFolder(projectId: string): string {
  return FOLDER_ALIASES[projectId] ?? projectId;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function nextOrderForDir(dir: string): string {
  if (!existsSync(dir)) return '01';
  const existing = readdirSync(dir);
  let max = 0;
  for (const name of existing) {
    const m = /^(\d{2})-/.exec(name);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return String(max + 1).padStart(2, '0');
}

function parseArgs(argv: string[]): { sourcePath: string; projectIdFlag?: string } {
  const args = argv.slice(2);
  let sourcePath: string | undefined;
  let projectIdFlag: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--project' || a === '-p') {
      projectIdFlag = args[++i];
    } else if (!sourcePath) {
      sourcePath = a;
    }
  }
  if (!sourcePath) {
    console.error('Uso: pnpm script:diagram:add <ruta-al-archivo> [--project <projectId>]');
    process.exit(1);
  }
  return { sourcePath: resolve(sourcePath), projectIdFlag };
}

async function main(): Promise<void> {
  const { sourcePath, projectIdFlag } = parseArgs(process.argv);

  if (!existsSync(sourcePath)) {
    console.error(`No existe el archivo: ${sourcePath}`);
    process.exit(1);
  }

  const ext = extname(sourcePath).toLowerCase();
  const supported = ['.svg', '.png', '.jpg', '.jpeg'];
  if (!supported.includes(ext)) {
    console.error(`Extensión ${ext} no soportada. Usar uno de: ${supported.join(', ')}`);
    process.exit(1);
  }

  const manifest = loadManifest();
  const knownProjectIds = Object.keys(manifest);
  const rl = createInterface({ input, output });

  try {
    // 1. Resolver proyecto
    let projectId = projectIdFlag;
    if (!projectId) {
      console.log('Proyectos disponibles:', knownProjectIds.join(', '));
      projectId = (await rl.question('Project ID: ')).trim();
    }
    if (!projectId) {
      console.error('Project ID requerido.');
      process.exit(1);
    }
    if (!knownProjectIds.includes(projectId)) {
      const confirm = await rl.question(
        `"${projectId}" no está en el manifest. ¿Continuar igual? [s/N] `,
      );
      if (confirm.trim().toLowerCase() !== 's') {
        console.log('Cancelado.');
        return;
      }
    }

    // 2. Pedir captions
    const captionEs = (await rl.question('Caption ES: ')).trim();
    const captionEn = (await rl.question('Caption EN: ')).trim();
    if (!captionEs || !captionEn) {
      console.error('Captions ES y EN son requeridos.');
      process.exit(1);
    }

    // 3. Resolver carpeta destino (con alias si aplica)
    const folder = projectIdToFolder(projectId);
    const destDir = join(REPO_ROOT_PATH, 'frontend', 'public', 'diagrams', folder);
    mkdirSync(destDir, { recursive: true });

    // 4. Calcular nombre destino
    const order = nextOrderForDir(destDir);
    const baseName = basename(sourcePath, ext);
    const slug = slugify(baseName);
    const destFilename = `${order}-${slug}${ext}`;
    const destPath = join(destDir, destFilename);

    // 5. Copiar (sanitizando si es SVG)
    if (ext === '.svg') {
      const source = readFileSync(sourcePath, 'utf8');
      const { sanitized, changes } = sanitizeSvg(source);
      writeFileSync(destPath, sanitized, 'utf8');
      if (changes.length > 0) {
        console.log(`✓ Sanitizado: ${changes.join(', ')}`);
      }
    } else {
      copyFileSync(sourcePath, destPath);
    }
    console.log(`✓ Guardado en frontend/public/diagrams/${folder}/${destFilename}`);

    // 6. Actualizar captions.json
    const captionsPath = join(destDir, 'captions.json');
    let captions: Record<string, { es: string; en: string }> = {};
    if (existsSync(captionsPath)) {
      try {
        captions = JSON.parse(readFileSync(captionsPath, 'utf8'));
      } catch {
        console.warn('captions.json existente no parsea, se va a reescribir.');
        captions = {};
      }
    }
    captions[destFilename] = { es: captionEs, en: captionEn };
    writeFileSync(captionsPath, JSON.stringify(captions, null, 2) + '\n', 'utf8');
    console.log(`✓ Actualizado captions.json`);

    console.log('\nListo. Próximos pasos:');
    console.log('  • Local: pnpm script:diagrams   (regenera el índice)');
    console.log('  • CI: git add + commit + push   (el workflow lo indexa)');
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
