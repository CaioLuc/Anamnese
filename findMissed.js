const fs = require('fs');
const path = require('path');
function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/[\w-\/\[\]\.]+/g) || [];
      const missed = Object.values(matches).filter(m => (m.includes('zinc') || m.includes('white') || m === 'text-slate-300' || m === 'text-slate-400' || m === 'text-slate-200' || m === 'bg-black') && !m.includes('dark:'));
      if (missed.length > 0) {
        console.log('\n---', fullPath, '---');
        console.log([...new Set(missed)].join(', '));
      }
    }
  }
}
scanDir('./src');
