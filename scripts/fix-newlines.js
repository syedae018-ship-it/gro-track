const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const allFiles = [...walk('./app'), ...walk('./components')];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('import { useAuth } from "@/hooks/use-auth"export')) {
    content = content.replace('import { useAuth } from "@/hooks/use-auth"export', 'import { useAuth } from "@/hooks/use-auth"\nexport');
    changed = true;
  }
  
  if (content.includes('import { useAuth } from "@/hooks/use-auth"function')) {
    content = content.replace('import { useAuth } from "@/hooks/use-auth"function', 'import { useAuth } from "@/hooks/use-auth"\nfunction');
    changed = true;
  }
  
  if (content.includes('import { useAuth } from "@/hooks/use-auth"const')) {
    content = content.replace('import { useAuth } from "@/hooks/use-auth"const', 'import { useAuth } from "@/hooks/use-auth"\nconst');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed newline in ${file}`);
  }
});
