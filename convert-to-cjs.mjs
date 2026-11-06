import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = './src';

function convertFile(filePath) {
  let content = readFileSync(filePath, 'utf8');

  // Convert imports
  content = content.replace(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g, (match, imports, module) => {
    const names = imports.trim();
    if (names.startsWith('{') && names.endsWith('}')) {
      // Named imports: import { a, b } from 'x' -> const { a, b } = require('x')
      return `const ${names} = require('${module}');`;
    } else if (names.includes('* as')) {
      // Namespace: import * as x from 'y' -> const x = require('y')
      return `const ${names.replace('* as ', '')} = require('${module}');`;
    } else {
      // Default: import x from 'y' -> const x = require('y')
      return `const ${names} = require('${module}');`;
    }
  });

  // Convert exports
  content = content.replace(/export\s+const\s+(\w+)\s*=/g, 'module.exports.$1 =');
  content = content.replace(/export\s+async\s+function\s+(\w+)/g, 'module.exports.$1 = async function');
  content = content.replace(/export\s+function\s+(\w+)/g, 'module.exports.$1 = function');
  content = content.replace(/export\s+class\s+(\w+)/g, 'module.exports.$1 = class');
  content = content.replace(/export\s+{([^}]+)}/g, (match, names) => {
    return `module.exports = { ${names} };`;
  });
  content = content.replace(/export\s+default\s+([\s\S]*?);/g, 'module.exports = $1;');

  writeFileSync(filePath, content);
  console.log('Converted:', filePath);
}

function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      convertFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Done converting to CommonJS');
