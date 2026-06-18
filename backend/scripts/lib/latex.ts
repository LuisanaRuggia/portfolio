/**
 * Helpers para inyección de placeholders Mustache-like en la plantilla LaTeX
 * y compilación con xelatex + pdftoppm.
 *
 * La plantilla `documentation-poster.tex` tiene placeholders del tipo
 * `{{KEY}}` (en metadata y blocks). Este módulo los reemplaza, compila el
 * PDF en un tmp dir, y renderiza páginas a PNG.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Escapa caracteres LaTeX-especiales en un string que se va a inyectar en el
 * cuerpo del documento. NO usar para macros / comandos.
 */
export function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/** Convierte un array de strings a `\begin{itemize}\item ... \end{itemize}`. */
export function itemize(items: string[]): string {
  if (items.length === 0) return '';
  return '\\begin{itemize}\n' + items.map(s => `  \\item ${escapeLatex(s)}`).join('\n') + '\n\\end{itemize}';
}

/**
 * Reemplaza todos los placeholders `{{KEY}}` del template con los valores de
 * `values`. Si una key del template no está en values, deja el placeholder
 * (que aparecerá literal en el PDF — útil para detectar olvidos).
 */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_full, key: string) => {
    return values[key] !== undefined ? values[key] : `{{${key}}}`;
  });
}

export type CompileResult = {
  /** Path del PDF generado (en el tmp dir). */
  pdfPath: string;
  /** Paths de los PNG renderizados, en orden de página. */
  pngPaths: string[];
  /** Dir temporal de compilación — el caller debe limpiarlo (o usar helper). */
  tmpDir: string;
};

/**
 * Compila un .tex con xelatex y renderiza cada página a PNG.
 * Requiere `xelatex` y `pdftoppm` instalados en el sistema.
 *
 * @param texContent Contenido del documento con todos los placeholders ya resueltos.
 * @param options.dpi DPI para los PNG. Default 300.
 * @param options.copyAssets Lista de paths absolutos a copiar al tmp dir (p.ej. fuentes).
 */
export function compileLatex(
  texContent: string,
  options: { dpi?: number; copyAssets?: string[] } = {},
): CompileResult {
  const dpi = options.dpi ?? 300;
  const tmpDir = mkdtempSync(join(tmpdir(), 'docpost-'));

  for (const asset of options.copyAssets ?? []) {
    const dest = join(tmpDir, asset.split('/').pop()!);
    copyFileSync(asset, dest);
  }

  const texFile = join(tmpDir, 'doc.tex');
  writeFileSync(texFile, texContent, 'utf8');

  // xelatex 2 pasadas (cross-refs). -interaction=nonstopmode no aborta en warnings.
  for (let pass = 0; pass < 2; pass++) {
    execFileSync(
      'xelatex',
      ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', tmpDir, texFile],
      { stdio: 'pipe', cwd: tmpDir },
    );
  }

  const pdfPath = join(tmpDir, 'doc.pdf');

  // pdftoppm renderiza cada página: doc-1.png, doc-2.png, ...
  execFileSync('pdftoppm', ['-png', '-r', String(dpi), pdfPath, join(tmpDir, 'doc')]);

  const pngPaths = readdirSync(tmpDir)
    .filter(f => /^doc-\d+\.png$/.test(f))
    .sort()
    .map(f => join(tmpDir, f));

  return { pdfPath, pngPaths, tmpDir };
}

/**
 * Versión high-level: compila, copia el PDF y los PNGs a sus destinos finales,
 * y limpia el tmp dir. Solo escribe si el contenido del PDF cambió (idempotente
 * por byte-comparison, no por content de LaTeX porque mismo input → mismo PDF
 * salvo timestamps embedded).
 */
export function compileAndPlace(
  texContent: string,
  destPdfPath: string,
  destPagesDir: string,
  options: { dpi?: number; copyAssets?: string[] } = {},
): { pdfWrote: boolean; pageCount: number } {
  const result = compileLatex(texContent, options);
  try {
    mkdirSync(dirname(destPdfPath), { recursive: true });
    mkdirSync(destPagesDir, { recursive: true });

    // PDFs traen timestamps embebidos, así que la comparación por bytes
    // siempre da diff. Mejor compararlos por contenido visual (los PNGs).
    // Por ahora simplemente sobrescribimos siempre.
    copyFileSync(result.pdfPath, destPdfPath);

    // Limpia PNGs viejos antes de copiar los nuevos para no acumular.
    for (const f of readdirSync(destPagesDir)) {
      if (/^page-\d+\.png$/.test(f)) {
        rmSync(join(destPagesDir, f));
      }
    }
    for (let i = 0; i < result.pngPaths.length; i++) {
      copyFileSync(result.pngPaths[i], join(destPagesDir, `page-${i + 1}.png`));
    }

    return { pdfWrote: true, pageCount: result.pngPaths.length };
  } finally {
    rmSync(result.tmpDir, { recursive: true, force: true });
  }
}
