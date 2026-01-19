/**
 * Generate TypeScript declaration files for CSS modules
 * 
 * This script scans for all .css files in src/ and creates corresponding
 * .css.d.ts files with proper type declarations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSS module type declaration template
const CSS_TYPE_DECLARATION = `declare const styles: { readonly [key: string]: string };
export default styles;
`;

/**
 * Recursively find all CSS files in a directory
 */
function findCSSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findCSSFiles(filePath, fileList);
    } else if (file.endsWith('.css') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Generate .d.ts file for a CSS file
 */
function generateTypeDeclaration(cssFilePath) {
  const dtsFilePath = cssFilePath + '.d.ts';
  
  // Check if .d.ts file already exists
  if (fs.existsSync(dtsFilePath)) {
    console.log(`Skipping ${dtsFilePath} (already exists)`);
    return;
  }

  // Write the type declaration
  fs.writeFileSync(dtsFilePath, CSS_TYPE_DECLARATION, 'utf8');
  console.log(`Created ${dtsFilePath}`);
}

/**
 * Main execution
 */
function main() {
  const srcDir = path.join(__dirname, 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('Error: src directory not found');
    process.exit(1);
  }

  console.log('Scanning for CSS files...');
  const cssFiles = findCSSFiles(srcDir);
  
  console.log(`Found ${cssFiles.length} CSS files`);
  console.log('Generating type declarations...\n');

  cssFiles.forEach(generateTypeDeclaration);

  console.log(`\nDone! Generated type declarations for ${cssFiles.length} CSS files.`);
}

main();
