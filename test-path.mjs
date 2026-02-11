import path from 'path';

console.log('process.cwd():', process.cwd());
console.log('__dirname (simulated):', path.resolve('.'));

const DATA_DIR1 = path.join(process.cwd(), 'data');
console.log('DATA_DIR (process.cwd):', DATA_DIR1);

import { fileURLToPath } from 'url';
const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), '..');
const DATA_DIR2 = path.join(PROJECT_ROOT, 'data');
console.log('DATA_DIR (import.meta.url):', DATA_DIR2);
