const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(/'(.*?)Riyadul Qur'an(.*?)'/g, '"$1Riyadul Qur\'an$2"');
  // Also fix cases where it might be `Admin <admin@Riyadul Qur'an>` which makes no sense, but wait, the domain is riyadualquran.com
  // The error was mostly: 'Title | Riyadul Qur'an' -> "Title | Riyadul Qur'an"
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed quotes in ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      replaceInFile(filePath);
    }
  }
}

walk('c:\\Users\\Abu Rifqoh\\.antigravity\\riyadualquran-academy\\src');
