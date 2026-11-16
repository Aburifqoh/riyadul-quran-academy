const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/almuqri\.com/gi, 'riyadualquran.com')
    .replace(/Almuqri/g, "Riyadul Qur'an")
    .replace(/Al-Muqri/g, "Riyadul Qur'an")
    .replace(/almuqri/g, "riyadualquran");
    
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.css') || filePath.endsWith('.json') || filePath.endsWith('.md')) {
      replaceInFile(filePath);
    }
  }
}

walk('c:\\Users\\Abu Rifqoh\\.antigravity\\almuqri\\riyadualquran-academy\\src');
walk('c:\\Users\\Abu Rifqoh\\.antigravity\\almuqri\\riyadualquran-academy\\public');
