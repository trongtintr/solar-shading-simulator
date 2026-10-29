// Bundles src/ into a single self-contained index.html (repo root).
// Usage: node scripts/build.mjs [output]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => readFileSync(join(root, 'src', f), 'utf8');
const noImports = t => t.split('\n').filter(l => !/^import\s/.test(l)).join('\n');
const noExports = t => t.replace(/^export /gm, '');
const app = rd('app.js');
const imports = app.split('\n').filter(l => /^import\s/.test(l)).join('\n');
const code = [imports, noExports(noImports(rd('core.mjs'))), noExports(noImports(rd('tests.mjs'))), noImports(app)].join('\n');
const out = process.argv[2] || join(root, 'index.html');
writeFileSync(out, rd('shell.html').replace('/*__CODE__*/', () => code));
console.log(`Built ${out} (${(code.length / 1024).toFixed(0)} kB of script)`);
