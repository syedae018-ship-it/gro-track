const fs = require('fs');
const glob = require('glob');

const files = glob.sync('app/(dashboard)/dashboard/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('"use server"') || content.includes("'use server'")) {
    const lines = content.split('\n');
    const useServerIndex = lines.findIndex(line => line.trim() === '"use server"' || line.trim() === "'use server'");
    
    if (useServerIndex > 0) {
      console.log(`Fixing "use server" in ${file}`);
      const directive = lines.splice(useServerIndex, 1)[0];
      lines.unshift(directive);
      fs.writeFileSync(file, lines.join('\n'));
    }
  }
});
