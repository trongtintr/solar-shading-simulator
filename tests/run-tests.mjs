// Runs the validation suite (solar reference cases + analytical shading cases) in Node.
import { runValidation } from '../src/tests.mjs';
const R = runValidation();
for (const r of R) console.log(`${r.pass ? 'PASS' : 'FAIL'}  [${r.group}] ${r.name}  expected ${(+r.expected).toFixed(4)}  got ${(+r.got).toFixed(4)}  (±${r.tol})`);
const failed = R.filter(r => !r.pass).length;
console.log(`\n${R.length - failed}/${R.length} passed`);
process.exit(failed ? 1 : 0);
