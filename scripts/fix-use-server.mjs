import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, '..', 'app');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(appDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if the file has a use server directive not at the very top
    const useServerRegex = /^[\s\S]*?(["']use server["'])/;
    const match = content.match(useServerRegex);
    
    if (match && match[1]) {
      // If the file doesn't already start exactly with "use server"
      if (!content.trimStart().startsWith('"use server"') && !content.trimStart().startsWith("'use server'")) {
        // Remove all occurrences of "use server" / 'use server'
        content = content.replace(/(["']use server["'];?)/g, '');
        // Prepend it
        content = `"use server"\n\n` + content.trimStart();
        
        fs.writeFileSync(filePath, content);
        console.log(`Fixed "use server" in ${filePath}`);
      }
    }
  }
});
