import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'migrations');

// Read all migration files
const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.js') && !file.includes('fix-migrations'));

console.log(`Found ${files.length} migration files`);

files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has describeTable check
  if (content.includes('describeTable')) {
    console.log(`✓ ${file} - already has checks`);
    return;
  }
  
  // Pattern to match addColumn calls - look for the full pattern
  const addColumnPattern = /(\s+)(await\s+queryInterface\.addColumn\([^,]+,\s*'([^']+)',\s*\{[^}]+\}\);)/g;
  
  let matches = [];
  let match;
  while ((match = addColumnPattern.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      indentation: match[1],
      statement: match[2],
      columnName: match[3]
    });
  }
  
  if (matches.length === 0) {
    console.log(`- ${file} - no addColumn calls found`);
    return;
  }
  
  // Find the up function
  const upFunctionMatch = content.match(/(export\s+(?:async\s+)?function\s+up|export\s+const\s+up\s*=\s*async)\s*\([^)]+\)\s*(?:=>)?\s*\{/);
  
  if (!upFunctionMatch) {
    console.log(`! ${file} - couldn't find up function`);
    return;
  }
  
  // Extract table name from the first addColumn call
  const tableMatch = matches[0].statement.match(/addColumn\('([^']+)'/);
  if (!tableMatch) {
    console.log(`! ${file} - couldn't extract table name`);
    return;
  }
  
  const tableName = tableMatch[1];
  const upFunctionStart = upFunctionMatch.index + upFunctionMatch[0].length;
  
  // Build the check for all columns
  let columnChecks = matches.map(m => `!tableDescription.${m.columnName}`).join(' && ');
  
  // Build the new statements with proper indentation
  const baseIndent = matches[0].indentation;
  const innerIndent = baseIndent + '  ';
  
  let newStatements = matches.map(m => innerIndent + m.statement.trim()).join('\n');
  
  // Create the new code block
  const describeTableCode = `\n${baseIndent}const tableDescription = await queryInterface.describeTable('${tableName}');\n${baseIndent}\n${baseIndent}if (${columnChecks}) {\n${newStatements}\n${baseIndent}}`;
  
  // Replace all the original addColumn statements
  let newContent = content;
  matches.forEach(m => {
    newContent = newContent.replace(m.fullMatch, '');
  });
  
  // Insert the new code after the up function opening brace
  newContent = newContent.slice(0, upFunctionStart) + describeTableCode + newContent.slice(upFunctionStart);
  
  // Clean up extra blank lines
  newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✓ ${file} - fixed ${matches.length} addColumn call(s)`);
});

console.log('\nDone!');
