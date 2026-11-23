import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const ROOT_DIR =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

function collectReferencedAistudioAssets(rootDir: string): Set<string> {
  const referenced = new Set<string>();
  const pattern = /assets\/aistudio\/([^"'`\s)?#]+)/g;
  const scanFile = (filePath: string) => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      referenced.add(decodeURIComponent(match[1]));
    }
  };
  const walkDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (/\.(ts|tsx|js|jsx|json|css|html)$/i.test(entry.name)) {
        scanFile(full);
      }
    }
  };

  walkDir(path.join(rootDir, 'src'));
  scanFile(path.join(rootDir, 'index.html'));
  scanFile(path.join(rootDir, 'public', 'manifest.json'));
  return referenced;
}

export default defineConfig(({ mode }) => {
  let outDir = 'dist';
  // Root '/' base ensures assets load correctly on any SPA route (/admin, /crm, /fortnews)
  // on domain roots (fortmidia.com.br, fortnews.com.br). Override via VITE_BASE_PATH if deploying to a subfolder.
  const basePath = process.env.VITE_BASE_PATH || '/';

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-and-prune-dist-assets',
        apply: 'build',
        configResolved(resolved) {
          outDir = resolved.build.outDir || 'dist';
        },
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(ROOT_DIR, outDir);
          const srcAssets = path.resolve(ROOT_DIR, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }

          // Remove unreferenced reference attachments (PDFs/MP4s) from dist/assets/aistudio
          // so FTPS/SSH/ZIP deployments stay lean without deleting originals from public/.
          const distAistudio = path.join(distDir, 'assets', 'aistudio');
          if (fs.existsSync(distAistudio)) {
            const referenced = collectReferencedAistudioAssets(ROOT_DIR);
            if (referenced.size > 0) {
              for (const entry of fs.readdirSync(distAistudio, { withFileTypes: true })) {
                if (entry.isFile() && !referenced.has(entry.name)) {
                  fs.unlinkSync(path.join(distAistudio, entry.name));
                }
              }
            }
          }
        },
      },
    ],
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(
        process.env.VITE_APP_ENV || (mode === 'production' ? 'production' : 'development')
      ),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        process.env.VITE_API_BASE_URL || '/api'
      ),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(
        process.env.VITE_GOOGLE_MAPS_API_KEY || ''
      ),
      'import.meta.env.VITE_APP_TARGET': JSON.stringify(
        process.env.VITE_APP_TARGET || 'all'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(ROOT_DIR, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
