import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixContrastInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // 1. Fix text-white in colored backgrounds
  // We look for className="..." that contains a color bg class and also text-slate-900 dark:text-white
  // Since regex can be complex across multiple lines of a className string, we do it in a loop
  
  // A simpler way: Find all className attributes, parse them, modify, and replace.
  const classRex = /className=(['"`])(.*?)\1/gs;
  content = content.replace(classRex, (match, quote, classes) => {
    let cls = classes;
    
    // Check if it's a solid/gradient colored background
    const hasColoredBg = /(bg-(indigo|red|green|emerald|blue|amber|yellow|cyan|rose|pink|purple|fuchsia|violet)-[4567]00|bg-gradient-to|bg-black)/.test(cls);
    
    if (hasColoredBg) {
      // Revert text color on colored backgrounds back to text-white
      cls = cls.replace(/text-slate-900 dark:text-white/g, 'text-white');
      cls = cls.replace(/text-slate-800 dark:text-slate-200/g, 'text-white');
      cls = cls.replace(/text-slate-700 dark:text-slate-300/g, 'text-white');
    }

    // Fix the duplicate bugs and weak gray contrasts everywhere
    cls = cls.replace(/text-slate-400 dark:text-slate-500 dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');
    cls = cls.replace(/dark:text-slate-500 dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');
    
    cls = cls.replace(/text-slate-500 dark:text-slate-400 dark:text-slate-500/g, 'text-slate-500 dark:text-slate-400');
    cls = cls.replace(/text-slate-400 dark:text-slate-500/g, 'text-slate-600 dark:text-slate-400');

    return `className=${quote}${cls}${quote}`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed contrast: ${path.basename(filePath)}`);
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      fixContrastInFile(fullPath);
    }
  }
}

console.log('Starting contrast fix...');
scanDir(path.join(__dirname, 'src', 'components'));
fixContrastInFile(path.join(__dirname, 'src', 'App.jsx'));
console.log('Done!');
