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

  // Server-side replacements
  if (content.includes('getServerSession')) {
    // Remove imports
    content = content.replace(/import\s*{\s*getServerSession\s*}\s*from\s*['"]next-auth\/next['"]\s*;?/g, '');
    content = content.replace(/import\s*{\s*authOptions\s*}\s*from\s*['"]@\/app\/api\/auth\/\[\.\.\.nextauth\]\/auth-options['"]\s*;?/g, '');
    
    // Add createClient if not present
    if (!content.includes('createClient')) {
      content = 'import { createClient } from "@/lib/supabase/server"\n' + content;
    }
    
    // Replace session getter
    // Case 1: const session = await getServerSession(authOptions)
    content = content.replace(/const\s+session\s*=\s*await\s*getServerSession\(authOptions\)/g, 
      'const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const session = { user }');
      
    // Case 2: const session = await getServerSession()
    content = content.replace(/const\s+session\s*=\s*await\s*getServerSession\(\)/g, 
      'const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const session = { user }');
    
    changed = true;
  }

  // Client-side replacements
  if (content.includes('useSession')) {
    content = content.replace(/import\s*{\s*useSession\s*}\s*from\s*['"]next-auth\/react['"]\s*;?/g, 
      'import { useAuth } from "@/hooks/use-auth"');
    
    content = content.replace(/useSession\(\)/g, 'useAuth()');
    changed = true;
  }

  // NextAuth imports leftover
  if (content.includes('next-auth')) {
     content = content.replace(/import.*?from\s*['"]next-auth.*?['"];?/g, '');
     changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
