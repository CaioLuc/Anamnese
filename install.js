import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  console.log('Running npm install...');
  const out = execSync('npm.cmd install -D electron concurrently wait-on cross-env tailwindcss postcss autoprefixer', { stdio: 'pipe' });
  writeFileSync('install.log', out.toString());
  console.log('Done.');
} catch (e) {
  console.error('Error:', e.message);
  if (e.stdout) writeFileSync('install-stdout.log', e.stdout.toString());
  if (e.stderr) writeFileSync('install-stderr.log', e.stderr.toString());
}
