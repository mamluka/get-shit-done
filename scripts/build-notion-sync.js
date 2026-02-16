#!/usr/bin/env node
/**
 * Bundle bin/notion-sync.js + all deps into a single file for installation.
 * Output: get-shit-done/bin/notion-sync.js
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ENTRY = path.join(__dirname, '..', 'bin', 'notion-sync.js');
const OUTPUT = path.join(__dirname, '..', 'get-shit-done', 'bin', 'notion-sync.js');

async function build() {
  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Bundling bin/notion-sync.js...');

  // Plugin to strip shebangs from source files (esbuild banner adds its own)
  const stripShebang = {
    name: 'strip-shebang',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        let contents = fs.readFileSync(args.path, 'utf8');
        if (contents.startsWith('#!')) {
          contents = contents.replace(/^#![^\n]*\n/, '');
          return { contents, loader: 'js' };
        }
        return null; // let esbuild handle it normally
      });
    },
  };

  await esbuild.build({
    entryPoints: [ENTRY],
    outfile: OUTPUT,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    banner: { js: '#!/usr/bin/env node' },
    plugins: [stripShebang],
    logLevel: 'info',
  });

  // Make executable
  fs.chmodSync(OUTPUT, 0o755);

  console.log(`\n→ ${OUTPUT}`);
  console.log('Build complete.');
}

build().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
