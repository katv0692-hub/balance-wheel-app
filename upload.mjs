// Upload built frontend to Supabase Storage
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'balance-wheel';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DIST_DIR = join(process.cwd(), 'frontend', 'dist');

async function uploadFile(localPath, remotePath) {
  const file = readFileSync(localPath);
  const ext = extname(localPath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`❌ ${remotePath}: ${error.message}`);
  } else {
    console.log(`✅ ${remotePath} (${file.length} bytes)`);
  }
}

async function uploadDir(dir, prefix = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const localPath = join(dir, entry.name);
    const remotePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await uploadDir(localPath, remotePath);
    } else {
      await uploadFile(localPath, remotePath);
    }
  }
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    console.error('dist/ not found. Run `npx vite build` first.');
    process.exit(1);
  }

  console.log(`Uploading from ${DIST_DIR} to bucket "${BUCKET}"...`);
  await uploadDir(DIST_DIR);
  console.log('\n✅ Done! Files uploaded to Supabase Storage.');
  console.log(`Public URL: ${supabaseUrl}/storage/v1/object/public/${BUCKET}/index.html`);
}

main();
