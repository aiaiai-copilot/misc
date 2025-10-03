#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Recursively find all .ts files in a directory
 */
async function findTsFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      await findTsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Add .js extension to relative imports that don't have an extension
 */
function fixImports(content) {
  // Match import/export statements with relative paths
  // Patterns:
  // - import ... from './path'
  // - import ... from '../path'
  // - export ... from './path'
  // - export ... from '../path'

  // Use DOTALL flag to match across multiple lines
  return content.replace(
    /((?:import|export)[\s\S]*?from\s+['"])(\.\.[\/][\w\-\.\/]*|\.\/[\w\-\.\/]*)(?<!\.js|\.json|\.mjs|\.cjs)(['"])/g,
    '$1$2.js$3'
  );
}

/**
 * Process a single TypeScript file
 */
async function processFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const fixed = fixImports(content);

  if (content !== fixed) {
    await writeFile(filePath, fixed, 'utf-8');
    return { path: filePath, changed: true };
  }

  return { path: filePath, changed: false };
}

/**
 * Main function
 */
async function main() {
  const packagesDir = join(__dirname, 'packages');
  console.log('🔍 Finding TypeScript files...');

  const files = await findTsFiles(packagesDir);
  console.log(`📁 Found ${files.length} TypeScript files\n`);

  console.log('🔧 Processing files...');
  const results = await Promise.all(files.map(processFile));

  const changed = results.filter(r => r.changed);
  const unchanged = results.filter(r => !r.changed);

  console.log(`\n✅ Processed ${results.length} files:`);
  console.log(`   - ${changed.length} files modified`);
  console.log(`   - ${unchanged.length} files unchanged`);

  if (changed.length > 0) {
    console.log('\n📝 Modified files:');
    changed.forEach(r => console.log(`   - ${r.path.replace(packagesDir, 'packages')}`));
  }
}

main().catch(console.error);
