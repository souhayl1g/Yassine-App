#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class CJSToESMConverter {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      excludeDirs: ['node_modules', '.git', 'dist', 'build'],
      fileExtensions: ['.js', '.mjs'],
      ...options
    };
  }

  // Transform CommonJS patterns to ES6 modules
  transformCode(code, filePath) {
    let transformed = code;
    const changes = [];

    // Track import statements to avoid duplicates
    const imports = new Set();
    const namedImports = new Map();

    // 1. Transform require() statements
    // Handle: import express from 'express';
    transformed = transformed.replace(
      /const\s+(\w+)\s*=\s*require\(['"`]([^'"`]+)['"`]\);?/g,
      (match, varName, moduleName) => {
        const importStatement = `import ${varName} from '${moduleName}';`;
        imports.add(importStatement);
        changes.push(`import '${moduleName}'; -> import ${varName}`);
        return importStatement;
      }
    );

    // Handle: import { something } from 'module';
    transformed = transformed.replace(
      /const\s+\{([^}]+)\}\s*=\s*require\(['"`]([^'"`]+)['"`]\);?/g,
      (match, destructured, moduleName) => {
        const cleanDestructured = destructured.replace(/\s+/g, ' ').trim();
        const importStatement = `import { ${cleanDestructured} } from '${moduleName}';`;
        imports.add(importStatement);
        changes.push(`import '${moduleName}'; destructured -> import { ${cleanDestructured} }`);
        return importStatement;
      }
    );

    // Handle: import variable from 'module';.property;
    transformed = transformed.replace(
      /const\s+(\w+)\s*=\s*require\(['"`]([^'"`]+)['"`]\)\.(\w+);?/g,
      (match, varName, moduleName, property) => {
        const importStatement = `import { ${property} as ${varName} } from '${moduleName}';`;
        imports.add(importStatement);
        changes.push(`import '${moduleName}';.${property} -> import { ${property} as ${varName} }`);
        return importStatement;
      }
    );

    // Handle: require() without assignment (side effects)
    transformed = transformed.replace(
      /require\(['"`]([^'"`]+)['"`]\);?/g,
      (match, moduleName) => {
        const importStatement = `import '${moduleName}';`;
        imports.add(importStatement);
        changes.push(`import '${moduleName}'; side-effect -> import '${moduleName}'`);
        return importStatement;
      }
    );

    // 2. Transform module.exports
    // Handle: export default something;
    transformed = transformed.replace(
      /module\.exports\s*=\s*([^;]+);?/g,
      (match, exported) => {
        changes.push(`module.exports -> export default`);
        return `export default ${exported};`;
      }
    );

    // Handle: export const property = something;
    transformed = transformed.replace(
      /module\.exports\.(\w+)\s*=\s*([^;]+);?/g,
      (match, property, value) => {
        changes.push(`module.exports.${property} -> export const ${property}`);
        return `export const ${property} = ${value};`;
      }
    );

    // 3. Transform exports.property
    transformed = transformed.replace(
      /exports\.(\w+)\s*=\s*([^;]+);?/g,
      (match, property, value) => {
        changes.push(`exports.${property} -> export const ${property}`);
        return `export const ${property} = ${value};`;
      }
    );

    // 4. Handle __dirname and __filename (ES modules don't have these)
    if (transformed.includes('__dirname') || transformed.includes('__filename')) {
      const esmDirname = `import { fileURLToPath } from 'url';\nimport { dirname } from 'path';\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n\n`;
      
      if (!transformed.includes('fileURLToPath')) {
        transformed = esmDirname + transformed;
        changes.push('Added __dirname/__filename ES module equivalents');
      }
    }

    return { transformed, changes };
  }

  // Check if file should be processed
  shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    return this.options.fileExtensions.includes(ext);
  }

  // Check if directory should be excluded
  shouldExcludeDir(dirName) {
    return this.options.excludeDirs.includes(dirName);
  }

  // Process a single file
  async processFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      
      // Skip if file doesn't contain CommonJS patterns
      if (!content.includes('require(') && 
          !content.includes('module.exports') && 
          !content.includes('exports.')) {
        return null;
      }

      const { transformed, changes } = this.transformCode(content, filePath);

      if (changes.length === 0) {
        return null;
      }

      if (!this.options.dryRun) {
        await writeFile(filePath, transformed, 'utf8');
      }

      return {
        filePath,
        changes,
        originalSize: content.length,
        transformedSize: transformed.length
      };
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
      return null;
    }
  }

  // Recursively process directory
  async processDirectory(dirPath) {
    const results = [];
    
    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          if (!this.shouldExcludeDir(entry)) {
            const subResults = await this.processDirectory(fullPath);
            results.push(...subResults);
          }
        } else if (stats.isFile() && this.shouldProcessFile(fullPath)) {
          const result = await this.processFile(fullPath);
          if (result) {
            results.push(result);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error.message);
    }

    return results;
  }

  // Main conversion method
  async convert(targetPath) {
    const startTime = Date.now();
    const targetStats = await stat(targetPath);
    
    let results = [];

    if (targetStats.isDirectory()) {
      results = await this.processDirectory(targetPath);
    } else if (targetStats.isFile()) {
      const result = await this.processFile(targetPath);
      if (result) {
        results.push(result);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Print summary
    console.log('\n=== CommonJS to ES6 Module Conversion Summary ===');
    console.log(`Target: ${targetPath}`);
    console.log(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Files processed: ${results.length}`);

    if (results.length > 0) {
      console.log('\n--- Transformed Files ---');
      results.forEach(result => {
        console.log(`\n📁 ${result.filePath}`);
        console.log(`   Size: ${result.originalSize} → ${result.transformedSize} bytes`);
        console.log(`   Changes:`);
        result.changes.forEach(change => {
          console.log(`   ✓ ${change}`);
        });
      });

      console.log('\n--- Next Steps ---');
      console.log('1. Update your package.json to include "type": "module"');
      console.log('2. Consider changing file extensions from .js to .mjs if needed');
      console.log('3. Test your application thoroughly');
      console.log('4. Update any remaining dynamic require() calls manually');
    } else {
      console.log('\n✨ No CommonJS patterns found to convert!');
    }

    return results;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
CommonJS to ES6 Module Converter

Usage: node cjs-to-esm-converter.js [path] [options]

Arguments:
  path              Target file or directory (default: current directory)

Options:
  --dry-run, -d     Preview changes without modifying files
  --verbose, -v     Show detailed output
  --help, -h        Show this help message

Examples:
  node cjs-to-esm-converter.js                    # Convert current directory
  node cjs-to-esm-converter.js ./src --dry-run    # Preview changes in src folder
  node cjs-to-esm-converter.js app.js             # Convert single file
    `);
    return;
  }

  const targetPath = args.find(arg => !arg.startsWith('--')) || '.';
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  console.log('🔄 Starting CommonJS to ES6 Module conversion...\n');

  const converter = new CJSToESMConverter(options);
  
  try {
    await converter.convert(targetPath);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CJSToESMConverter;
