const fs = require('fs');
const path = require('path');

// Define all folders and their subfolders to scan
const foldersToCache = [
  '', // root HTML and root files
  'audio',
  'css',
  'css/fontawesome',
  'css/fontawesome/css',
  'css/fontawesome/webfonts',
  'HTML',
  'image',
  'images',
  'js',
  'libs',
  'libs/fonts',
  'libs/fonts/inter',
  'src',
  'styles'
];

// File extensions to include
const fileExtensions = ['.html', '.css', '.js', '.json', '.ico', '.png', '.jpg', '.jpeg', '.woff2', '.wav', '.mp3', '.webmanifest', '.txt'];

// Files/folders to ignore
const ignorePatterns = [
  'node_modules',
  'generate-cache.js',
  'cache-list.txt',
  '.git',
  'supabase',
  'tootimageage'
];

function getAllFiles(dirPath, arrayOfFiles, basePath = '') {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  arrayOfFiles = arrayOfFiles || [];
  
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    const relativePath = basePath ? path.join(basePath, file) : file;
    
    // Check if file/folder should be ignored
    if (ignorePatterns.some(pattern => fullPath.includes(pattern))) {
      return;
    }
    
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, relativePath);
    } else {
      // Check if file extension is allowed
      const ext = path.extname(file).toLowerCase();
      if (fileExtensions.includes(ext) || !ext) {
        // For root files, don't add any prefix
        const outputPath = dirPath === '.' ? file : relativePath.replace(/\\/g, '/');
        arrayOfFiles.push(outputPath);
      }
    }
  });
  
  return arrayOfFiles;
}

// Also scan specific root files that might not be in folders
function getRootFiles() {
  const rootFiles = [];
  const rootItems = fs.readdirSync('.');
  
  rootItems.forEach(item => {
    const fullPath = path.join('.', item);
    if (fs.statSync(fullPath).isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (fileExtensions.includes(ext) && !ignorePatterns.includes(item)) {
        rootFiles.push(item);
      }
    }
  });
  
  return rootFiles;
}

console.log('🔍 Scanning directories...\n');

let allFiles = [];

// Scan each folder
foldersToCache.forEach(folder => {
  const folderPath = folder === '' ? '.' : folder;
  if (fs.existsSync(folderPath)) {
    console.log(`📁 Scanning: ${folderPath || 'root'}`);
    allFiles = getAllFiles(folderPath, allFiles, folder === '' ? '' : folder);
  } else {
    console.log(`⚠️  Folder not found: ${folderPath}`);
  }
});

// Add root files that weren't captured
const rootFiles = getRootFiles();
rootFiles.forEach(file => {
  if (!allFiles.includes(file)) {
    allFiles.push(file);
  }
});

// Remove duplicates and sort
allFiles = [...new Set(allFiles)].sort();

// Generate the output
const output = `// Auto-generated cache list - ${new Date().toLocaleString()}
const ASSETS_TO_CACHE = [
${allFiles.map(file => `  '${file}',`).join('\n')}
];

// Total files: ${allFiles.length}
`;

// Save to file
fs.writeFileSync('cache-list.txt', output, 'utf8');

console.log(`\n✅ Success! Saved ${allFiles.length} files to cache-list.txt`);
console.log('\n📋 First 10 files:');
allFiles.slice(0, 10).forEach(file => console.log(`   - ${file}`));
if (allFiles.length > 10) console.log(`   ... and ${allFiles.length - 10} more`);