const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const zipFile = path.join(rootDir, 'datadock-deployment.zip');
const tempDir = path.join(rootDir, '.deploy-stage');

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

fs.mkdirSync(tempDir, { recursive: true });

const excludeList = new Set([
  'node_modules',
  '.next',
  '.git',
  '.deploy-stage',
  'datadock-deployment.zip',
  'brag-output',
  'backups',
  '.agents',
  '.env.local',
  'tsconfig.tsbuildinfo',
  '.DS_Store',
]);

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeList.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Staging files...');
copyDir(rootDir, tempDir);

console.log('Creating zip archive...');
// Use Windows tar.exe to create zip with correct paths
try {
  execSync(`tar.exe -a -c -f "${zipFile}" *`, { cwd: tempDir, stdio: 'inherit' });
} catch (e) {
  // Fallback to powershell Compress-Archive
  execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
}

fs.rmSync(tempDir, { recursive: true, force: true });

const stat = fs.statSync(zipFile);
console.log(`✓ Deployment archive created: datadock-deployment.zip (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
