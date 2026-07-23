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

const targetString = 'const { data: { user } } = await supabase.auth.getUser();';

walkDir(appDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(targetString) || content.includes('supabase.auth.getUser()')) {
      // For getSecureClient in dashboard-data.ts
      if (filePath.includes('dashboard-data.ts')) {
        content = content.replace(
          /const getSecureClient = async \(\) => {[\s\S]*?return { supabase: createClient\(supabaseUrl, supabaseServiceKey\), user: session.user }/g,
          `import { getServerSession } from "next-auth/next"\nimport { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"\n\nconst getSecureClient = async () => {\n  const session = await getServerSession(authOptions);\n  if (!session?.user) throw new Error("Unauthorized");\n  return { supabase: createClient(supabaseUrl, supabaseServiceKey), user: session.user }`
        );
      } else {
        // Add imports if missing
        if (!content.includes('getServerSession')) {
            content = `import { getServerSession } from "next-auth/next"\nimport { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"\n` + content;
        }

        // Standard replacement for all other actions
        content = content.replace(
          /const \{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await supabase\.auth\.getUser\(\);?/g,
          'const session = await getServerSession(authOptions);\n  const user = session?.user as any;'
        );
      }
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  }
});
