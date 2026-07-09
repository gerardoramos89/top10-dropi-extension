// Build script: produces a minified dist/ copy of the extension, ready to zip
// and upload to the Chrome Web Store. Source files (popup.js, popup.css,
// background.js) are left untouched for editing — this only writes dist/.
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const JS_FILES = ['popup.js', 'background.js'];
const CSS_FILES = ['popup.css'];
const COPY_AS_IS = ['popup.html', 'manifest.json', 'icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];

async function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  for (const file of JS_FILES) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const result = await minify(src, {
      mangle: true,
      compress: true,
      format: { comments: false }
    });
    if (result.error) throw result.error;
    fs.writeFileSync(path.join(DIST, file), result.code);
    const before = Buffer.byteLength(src);
    const after = Buffer.byteLength(result.code);
    console.log(`${file}: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
  }

  const cleanCss = new CleanCSS({ level: 2 });
  for (const file of CSS_FILES) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const result = cleanCss.minify(src);
    if (result.errors.length) throw new Error(result.errors.join('\n'));
    fs.writeFileSync(path.join(DIST, file), result.styles);
    const before = Buffer.byteLength(src);
    const after = Buffer.byteLength(result.styles);
    console.log(`${file}: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
  }

  for (const file of COPY_AS_IS) {
    fs.copyFileSync(path.join(ROOT, file), path.join(DIST, file));
  }

  console.log(`\nListo: ${DIST}`);
  console.log('Comprime el contenido de dist/ (no la carpeta en sí) en un .zip para subir a la Chrome Web Store.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
