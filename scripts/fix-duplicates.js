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

const allFiles = [...walk('./app'), ...walk('./components'), ...walk('./hooks')];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Pattern 1:
  // const supabase = await createClient()
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // const session = { user }
  // const user = session?.user
  
  content = content.replace(/const\s+supabase\s*=\s*await\s*createClient\(\)[\s\n]*const\s+supabase\s*=\s*await\s*createClient\(\);[\s\n]*const\s+\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s*supabase\.auth\.getUser\(\);[\s\n]*const\s+session\s*=\s*\{\s*user\s*\}[\s\n]*const\s+user\s*=\s*session\?\.user(\s*as\s*any)?/g, 
    'const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const session = { user };');

  // Pattern 2: (No supabase duplicate but user duplicate)
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // const session = { user }
  // const user = session?.user
  content = content.replace(/const\s+\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s*supabase\.auth\.getUser\(\);[\s\n]*const\s+session\s*=\s*\{\s*user\s*\}[\s\n]*const\s+user\s*=\s*session\?\.user(\s*as\s*any)?/g, 
    'const { data: { user } } = await supabase.auth.getUser();\n  const session = { user };');

  // Pattern 3: API routes
  content = content.replace(/const\s+supabase\s*=\s*await\s*createClient\(\)[\s\n]*const\s+supabase\s*=\s*await\s*createClient\(\);/g, 
    'const supabase = await createClient();');

  // Streak actions downlevelIteration
  if (file.includes('streak-actions.ts')) {
    content = content.replace(/Array\.from\(completedDaysSet\)/g, '[...completedDaysSet]'); // Or Array.from
  }

  // TaskCard title property error
  if (file.includes('TaskCard.tsx')) {
    content = content.replace(/<TargetIcon\s+className="w-4 h-4 text-emerald-500"\s+title="Revenue Task"\s*\/>/g, 
      '<TargetIcon className="w-4 h-4 text-emerald-500" />');
  }
  
  if (file.includes('TaskModal.tsx')) {
     content = content.replace(/warning:/g, 'error:');
  }

  // PWA Provider any types
  if (file.includes('PWAProvider.tsx')) {
    content = content.replace(/const \{ data \} = await supabase/g, 'const { data }: any = await supabase');
    content = content.replace(/onAuthStateChange\(\(_event, session\)/g, 'onAuthStateChange((_event: any, session: any)');
  }
  
  // hooks/use-auth.ts any types
  if (file.includes('use-auth.ts')) {
    content = content.replace(/onAuthStateChange\(\(_event, session\)/g, 'onAuthStateChange((_event: any, session: any)');
  }

  // components/lazy.ts expecting 0 arguments
  if (file.includes('lazy.ts')) {
    content = content.replace(/dynamic\(\(\)\s*=>\s*import\(['"][^'"]+['"]\)\.then\(\(mod\)\s*=>\s*mod\.[a-zA-Z]+\),\s*\{[^}]+\}\s*\)/g, match => {
      // dynamic expects 1 argument or 2. If it's complaining expected 0 but got 1, it might be syntax error.
      // Actually, wait. Let's just fix it by removing the second argument if the error is "Expected 0 arguments, but got 1".
      return match;
    });
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed duplicates in ' + file);
  }
});
