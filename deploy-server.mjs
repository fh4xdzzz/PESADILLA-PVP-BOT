import { readFileSync } from 'node:fs';
import { SparkedHost } from './src/sparkedhost.js';

const sh = new SparkedHost(process.env.SH_KEY, '945ea74c');

const files = [
  'index.js',
  'package.json',
  'package-lock.json',
  '.env',
  'src/index.js',
  'src/commands.js',
  'src/config.js',
  'src/deploy-commands.js',
  'src/handlers.js',
  'src/roblox.js',
  'src/sparkedhost.js',
];

for (const f of files) {
  try {
    await sh.writeFile(f, readFileSync(f, 'utf8'));
    console.log('OK', f);
  } catch (err) {
    console.log('FAIL', f, '-', err.message);
  }
}
