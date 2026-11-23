#!/usr/bin/env node
/**
 * Compila o FortMidiaCrm para produção (Vite) e empacota o conteúdo de dist/
 * (index.html, .htaccess, assets/, etc.) diretamente na raiz de:
 *   release/fortmidia-cpanel-dist.zip
 *
 * Uso:
 *   npm run build:zip
 *
 * Basta subir o arquivo release/fortmidia-cpanel-dist.zip no Gerenciador de Arquivos
 * do cPanel dentro de /home/fo181274/fortmidia.com.br e clicar em "Extract".
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const RELEASE_DIR = path.join(ROOT, 'release');
const ZIP_OUTPUT = path.join(RELEASE_DIR, 'fortmidia-cpanel-dist.zip');

// 1. Executa build de produção com base '/' para rotas SPA
console.log('[FortMídia Build] Compilando aplicação para produção (VITE_BASE_PATH=/)...');
execSync('npm run build', {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_APP_ENV: process.env.VITE_APP_ENV || 'production',
    VITE_BASE_PATH: process.env.VITE_BASE_PATH || '/',
  },
});

// 2. Garante presença de index.html e .htaccess na raiz de dist/
const indexPath = path.join(DIST_DIR, 'index.html');
const htaccessPath = path.join(DIST_DIR, '.htaccess');
const publicHtaccess = path.join(ROOT, 'public', '.htaccess');

if (!fs.existsSync(indexPath)) {
  throw new Error('Falha no build: dist/index.html não foi gerado.');
}
if (!fs.existsSync(htaccessPath) && fs.existsSync(publicHtaccess)) {
  fs.copyFileSync(publicHtaccess, htaccessPath);
}
if (!fs.existsSync(htaccessPath)) {
  throw new Error('Falha no build: dist/.htaccess não encontrado.');
}

// 3. Coleta recursivamente todos os arquivos de dist/ (incluindo dotfiles como .htaccess)
function collectFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, baseDir));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).split(path.sep).join('/');
      files.push({ full, rel });
    }
  }
  return files;
}

// 4. Empacotador ZIP puro em Node.js (zero dependências externas, compatível com Linux/macOS/Windows)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(date) {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, date.getFullYear()) - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function buildZipBuffer(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = toDosTimeDate(new Date());

  for (const file of files) {
    const rawData = fs.readFileSync(file.full);
    const compressed = zlib.deflateRawSync(rawData, { level: 6 });
    const useDeflate = compressed.length < rawData.length;
    const payload = useDeflate ? compressed : rawData;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(rawData);
    const nameBuf = Buffer.from(file.rel, 'utf8');

    // Local File Header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(now.dosTime, 10);
    localHeader.writeUInt16LE(now.dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, payload);

    // Central Directory Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(now.dosTime, 12);
    centralHeader.writeUInt16LE(now.dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

fs.mkdirSync(RELEASE_DIR, { recursive: true });
const files = collectFiles(DIST_DIR);
const zipBuffer = buildZipBuffer(files);
fs.writeFileSync(ZIP_OUTPUT, zipBuffer);

const sizeMb = (zipBuffer.length / (1024 * 1024)).toFixed(2);
console.log(
  `[FortMídia Build] Pacote pronto: release/fortmidia-cpanel-dist.zip (${files.length} arquivos, ${sizeMb} MB)`
);
console.log(
  '[FortMídia Build] Suba e extraia diretamente dentro de /home/fo181274/fortmidia.com.br (index.html e .htaccess já ficam na raiz).'
);
