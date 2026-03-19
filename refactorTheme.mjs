import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const classMap = {
  // Backgrounds
  'bg-zinc-950': 'bg-slate-50 dark:bg-zinc-950',
  'bg-zinc-900': 'bg-white dark:bg-zinc-900',
  'bg-zinc-800': 'bg-slate-100 dark:bg-zinc-800',
  'bg-zinc-950/50': 'bg-slate-50/50 dark:bg-zinc-950/50',
  'bg-zinc-950/80': 'bg-white/80 dark:bg-zinc-950/80',
  'bg-zinc-900/50': 'bg-white/50 dark:bg-zinc-900/50',
  'bg-zinc-900/60': 'bg-white/60 dark:bg-zinc-900/60',
  'bg-zinc-900/80': 'bg-white/80 dark:bg-zinc-900/80',
  'bg-white/5': 'bg-slate-100 dark:bg-white/5',
  'bg-white/10': 'bg-slate-200 dark:bg-white/10',
  'bg-white/[0.02]': 'bg-slate-50 dark:bg-white/[0.02]',
  'hover:bg-white/5': 'hover:bg-slate-100 dark:hover:bg-white/5',
  'hover:bg-white/10': 'hover:bg-slate-200 dark:hover:bg-white/10',

  // Texts
  'text-white': 'text-slate-900 dark:text-white',
  'text-slate-200': 'text-slate-800 dark:text-slate-200',
  'text-slate-300': 'text-slate-700 dark:text-slate-300',
  'text-slate-400': 'text-slate-500 dark:text-slate-400',
  'text-slate-500': 'text-slate-400 dark:text-slate-500', 
  'hover:text-white': 'hover:text-slate-900 dark:hover:text-white',
  'hover:text-slate-200': 'hover:text-slate-800 dark:hover:text-slate-200',

  // Borders
  'border-white/5': 'border-slate-200 dark:border-white/5',
  'border-white/10': 'border-slate-300 dark:border-white/10',
  'border-white/20': 'border-slate-400 dark:border-white/20',
  'hover:border-white/20': 'hover:border-slate-400 dark:hover:border-white/20',
  'hover:border-white/10': 'hover:border-slate-300 dark:hover:border-white/10',
  
  // Shadows
  'shadow-black/50': 'shadow-slate-200/50 dark:shadow-black/50',
};

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function replaceClassesInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;

  Object.keys(classMap).forEach(key => {
    // This regex looks for the class bounded by whitespace, quotes, or backticks
    const re = new RegExp(`(?<=['"\\\`\\s])${escapeRegExp(key)}(?=['"\\\`\\s])`, 'g');
    newContent = newContent.replace(re, classMap[key]);
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated: ${path.basename(filePath)}`);
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      replaceClassesInFile(fullPath);
    }
  }
}

console.log('Starting class replacement...');
scanDir(path.join(__dirname, 'src', 'components'));
replaceClassesInFile(path.join(__dirname, 'src', 'App.jsx'));
console.log('Done!');
