#!/usr/bin/env node
// Creates prism-colour-picker.zip from the dist folder for Chrome Web Store submission
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const zipPath = join(root, 'prism-colour-picker.zip');

if (!existsSync(distDir)) {
  console.error('❌ dist/ not found — run "npm run build" first');
  process.exit(1);
}

if (existsSync(zipPath)) unlinkSync(zipPath);

try {
  // Use PowerShell Compress-Archive on Windows, zip on Unix
  if (process.platform === 'win32') {
    execSync(
      `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}'"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit', shell: true });
  }
  console.log(`✓ Created prism-colour-picker.zip`);
} catch (e) {
  console.error('❌ Zip failed:', e.message);
  process.exit(1);
}
