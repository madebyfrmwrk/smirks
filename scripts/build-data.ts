/**
 * Reads source SVGs from ~/Desktop/smirks-faces, snaps each rect-equivalent
 * subpath to a clean 16x16 grid (32px cells in a 512x512 viewBox), and writes:
 *   - src/data/eyes.ts and src/data/mouths.ts (packed Uint8Array bitmaps)
 *   - scripts/diff/index.html (one file showing all variants raw vs quantized)
 *
 * Fails loud if any subpath's max edge displacement exceeds DISPLACEMENT_GATE
 * pixels — the user must redraw that variant in Figma on a clean grid.
 *
 * See CLAUDE.md "The grid" section.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SOURCE_DIR = join(homedir(), 'Desktop', 'smirks-faces');
const DATA_DIR = join(REPO_ROOT, 'src', 'data');
const DIFF_DIR = join(REPO_ROOT, 'scripts', 'diff');

const VIEWBOX = 512;
const CELL = 32;
const GRID = 16;
/** Half a cell. Exceed this on any edge and the script aborts. */
const DISPLACEMENT_GATE = CELL / 2;

type Rect = { x: number; y: number; w: number; h: number };
type Variant = {
  filename: string;
  index: number;
  rawPath: string;
  rects: Rect[];
  snapped: Rect[];
  bitmap: Uint8Array;
  maxDisplacement: number;
};

// ---------- SVG path parsing ----------

function tokenizePath(d: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  const re = /([MmHhVvZzLl])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  for (const match of d.matchAll(re)) {
    if (match[1] !== undefined) tokens.push(match[1]);
    else if (match[2] !== undefined) tokens.push(Number.parseFloat(match[2]));
  }
  return tokens;
}

function parseRectsFromPath(d: string): Rect[] {
  const tokens = tokenizePath(d);
  let px = 0;
  let py = 0;
  let sx = 0;
  let sy = 0;
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  let subpathOpen = false;
  let cmd: string | null = null;
  const rects: Rect[] = [];

  const startSubpath = () => {
    minX = px;
    maxX = px;
    minY = py;
    maxY = py;
    sx = px;
    sy = py;
    subpathOpen = true;
  };
  const closeSubpath = () => {
    if (subpathOpen) {
      rects.push({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
      subpathOpen = false;
    }
    px = sx;
    py = sy;
  };
  const visit = (x: number, y: number) => {
    px = x;
    py = y;
    if (subpathOpen) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (typeof t === 'string') {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') closeSubpath();
      continue;
    }
    if (cmd === 'M' || cmd === 'm') {
      const x = tokens[i++] as number;
      const y = tokens[i++] as number;
      if (cmd === 'M') visit(x, y);
      else visit(px + x, py + y);
      startSubpath();
      cmd = cmd === 'M' ? 'L' : 'l';
    } else if (cmd === 'H') {
      visit(tokens[i++] as number, py);
    } else if (cmd === 'h') {
      visit(px + (tokens[i++] as number), py);
    } else if (cmd === 'V') {
      visit(px, tokens[i++] as number);
    } else if (cmd === 'v') {
      visit(px, py + (tokens[i++] as number));
    } else if (cmd === 'L') {
      const x = tokens[i++] as number;
      const y = tokens[i++] as number;
      visit(x, y);
    } else if (cmd === 'l') {
      const dx = tokens[i++] as number;
      const dy = tokens[i++] as number;
      visit(px + dx, py + dy);
    } else {
      i++;
    }
  }
  return rects;
}

// ---------- SVG file processing ----------

const FOREGROUND_PATH_RE = /<path[^>]*fill="#000"[^>]*\bd="([^"]+)"/i;

function readForegroundPath(filename: string): string {
  const svg = readFileSync(join(SOURCE_DIR, filename), 'utf8');
  const m = FOREGROUND_PATH_RE.exec(svg);
  if (!m || m[1] === undefined) {
    throw new Error(`No <path fill="#000" d="…"/> found in ${filename}`);
  }
  return m[1];
}

// ---------- Quantization ----------

function snap(value: number): number {
  return Math.round(value / CELL) * CELL;
}

function snapRect(r: Rect): { snapped: Rect; displacement: number } {
  const x0 = snap(r.x);
  const y0 = snap(r.y);
  const x1 = snap(r.x + r.w);
  const y1 = snap(r.y + r.h);
  const displacement = Math.max(
    Math.abs(r.x - x0),
    Math.abs(r.y - y0),
    Math.abs(r.x + r.w - x1),
    Math.abs(r.y + r.h - y1),
  );
  return {
    snapped: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    displacement,
  };
}

function rectsToBitmap(rects: Rect[]): Uint8Array {
  // Bitmap layout (must match src/render.ts isCellSet):
  //   row r at bytes r*2 and r*2+1; bit (7 - (x%8)) of byte (y*2 + (x>>3)).
  const bm = new Uint8Array(GRID * 2);
  for (const r of rects) {
    if (r.w <= 0 || r.h <= 0) continue;
    const x0 = r.x / CELL;
    const y0 = r.y / CELL;
    const x1 = (r.x + r.w) / CELL;
    const y1 = (r.y + r.h) / CELL;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (x < 0 || x >= GRID || y < 0 || y >= GRID) continue;
        const byteIdx = y * 2 + (x >>> 3);
        const bit = 1 << (7 - (x & 7));
        bm[byteIdx] = (bm[byteIdx] ?? 0) | bit;
      }
    }
  }
  return bm;
}

// ---------- Rendering helpers (for the diff page) ----------

function rectsToSvg(rects: Rect[], fill: string): string {
  return rects
    .filter((r) => r.w > 0 && r.h > 0)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${fill}"/>`)
    .join('');
}

function bitmapToCssGrid(bm: Uint8Array): string {
  const cells: string[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const byte = bm[y * 2 + (x >>> 3)] ?? 0;
      const filled = (byte & (1 << (7 - (x & 7)))) !== 0;
      cells.push(`<i class="${filled ? 'on' : 'off'}"></i>`);
    }
  }
  return `<div class="grid">${cells.join('')}</div>`;
}

// ---------- Code emission ----------

function emitDataModule(name: string, variants: Variant[]): string {
  const arrayLiterals = variants
    .map((v) => {
      const bytes = Array.from(v.bitmap)
        .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
        .join(', ');
      return `  // ${v.filename}\n  Uint8Array.from([${bytes}]),`;
    })
    .join('\n');
  return `// Generated by scripts/build-data.ts — do not hand-edit.
// Source: ~/Desktop/smirks-faces/${name === 'EYES' ? 'eyes-*.svg' : 'mouth-*.svg'}
// Each entry is a 32-byte (256-bit) bitmap representing a 16x16 grid.
// See src/render.ts for the bit layout.

export const ${name}: readonly Uint8Array[] = [
${arrayLiterals}
];
`;
}

// ---------- Diff page ----------

function buildDiffPage(eyes: Variant[], mouths: Variant[]): string {
  const renderRow = (v: Variant) => {
    const dispClass = v.maxDisplacement > 0 ? 'warn' : 'ok';
    return `
    <tr>
      <th>${v.filename}</th>
      <td>
        <svg viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="160" height="160">
          <rect width="${VIEWBOX}" height="${VIEWBOX}" fill="#fff"/>
          ${rectsToSvg(v.rects, '#000')}
        </svg>
      </td>
      <td>
        <svg viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="160" height="160" shape-rendering="crispEdges">
          <rect width="${VIEWBOX}" height="${VIEWBOX}" fill="#fff"/>
          ${rectsToSvg(v.snapped, '#000')}
        </svg>
      </td>
      <td>${bitmapToCssGrid(v.bitmap)}</td>
      <td class="metrics">
        <div class="${dispClass}">max displacement: ${v.maxDisplacement.toFixed(1)}px</div>
        <div>rects in: ${v.rects.length}</div>
        <div>rects out: ${v.snapped.filter((r) => r.w > 0 && r.h > 0).length}</div>
      </td>
    </tr>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>smirks build:data diff</title>
<style>
  :root {
    color-scheme: light dark;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  body { margin: 0; padding: 24px; background: #fafafa; color: #111; }
  h1 { margin: 0 0 8px; font-size: 20px; }
  .meta { color: #666; margin-bottom: 24px; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 32px; }
  th, td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: middle; text-align: center; }
  th { font-weight: 500; text-align: left; width: 12ch; }
  thead th { background: #f0f0f0; text-align: center; }
  thead th:first-child { text-align: left; }
  svg { display: block; margin: 0 auto; border: 1px solid #ddd; background: #fff; }
  .grid {
    display: inline-grid;
    grid-template-columns: repeat(${GRID}, 10px);
    grid-template-rows: repeat(${GRID}, 10px);
    border: 1px solid #ddd;
    background: #fff;
  }
  .grid i { display: block; }
  .grid i.on { background: #000; }
  .grid i.off { background: transparent; }
  .metrics { font-family: ui-monospace, monospace; font-size: 12px; text-align: left; }
  .metrics div { margin: 2px 0; }
  .ok { color: #0a7d3a; }
  .warn { color: #b54708; }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; }
    th, td { border-color: #2a2a2a; }
    thead th { background: #1a1a1a; }
    svg, .grid { border-color: #333; }
    .ok { color: #4ade80; }
    .warn { color: #facc15; }
  }
</style>
</head>
<body>
<h1>smirks build:data diff</h1>
<div class="meta">
  Generated ${new Date().toISOString()} · displacement gate: ${DISPLACEMENT_GATE}px ·
  cell size: ${CELL}px · grid: ${GRID}×${GRID} · viewBox: ${VIEWBOX}×${VIEWBOX}
</div>

<h2>Eyes (${eyes.length})</h2>
<table>
  <thead><tr>
    <th>variant</th><th>raw source</th><th>quantized</th><th>bitmap</th><th>metrics</th>
  </tr></thead>
  <tbody>${eyes.map(renderRow).join('')}</tbody>
</table>

<h2>Mouths (${mouths.length})</h2>
<table>
  <thead><tr>
    <th>variant</th><th>raw source</th><th>quantized</th><th>bitmap</th><th>metrics</th>
  </tr></thead>
  <tbody>${mouths.map(renderRow).join('')}</tbody>
</table>
</body>
</html>
`;
}

// ---------- Main ----------

function processGroup(prefix: 'eyes' | 'mouth'): Variant[] {
  const filenames = readdirSync(SOURCE_DIR)
    .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.svg'))
    .sort((a, b) => {
      const na = Number.parseInt(a.match(/-(\d+)\.svg$/)?.[1] ?? '0', 10);
      const nb = Number.parseInt(b.match(/-(\d+)\.svg$/)?.[1] ?? '0', 10);
      return na - nb;
    });

  return filenames.map((filename, index) => {
    const rawPath = readForegroundPath(filename);
    const rects = parseRectsFromPath(rawPath);
    const snappedResults = rects.map(snapRect);
    const snapped = snappedResults.map((s) => s.snapped);
    const maxDisplacement = snappedResults.reduce((m, s) => Math.max(m, s.displacement), 0);
    const bitmap = rectsToBitmap(snapped);
    return { filename, index, rawPath, rects, snapped, bitmap, maxDisplacement };
  });
}

function main(): void {
  console.log(`reading source from ${SOURCE_DIR}`);
  const eyes = processGroup('eyes');
  const mouths = processGroup('mouth');

  const failures = [...eyes, ...mouths].filter((v) => v.maxDisplacement > DISPLACEMENT_GATE);
  if (failures.length > 0) {
    for (const f of failures) {
      console.error(
        `  ✗ ${f.filename}: max displacement ${f.maxDisplacement.toFixed(1)}px > gate ${DISPLACEMENT_GATE}px`,
      );
    }
    throw new Error(
      `build:data: ${failures.length} variant(s) exceed the displacement gate. ` +
        `Redraw the offending variant(s) in Figma on a clean ${CELL}px grid.`,
    );
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, 'eyes.ts'), emitDataModule('EYES', eyes), 'utf8');
  writeFileSync(join(DATA_DIR, 'mouths.ts'), emitDataModule('MOUTHS', mouths), 'utf8');
  console.log(`  ✓ wrote ${eyes.length} eyes -> src/data/eyes.ts`);
  console.log(`  ✓ wrote ${mouths.length} mouths -> src/data/mouths.ts`);

  mkdirSync(DIFF_DIR, { recursive: true });
  const diffPath = join(DIFF_DIR, 'index.html');
  writeFileSync(diffPath, buildDiffPage(eyes, mouths), 'utf8');
  console.log(`  ✓ diff page: ${diffPath}`);
}

main();
