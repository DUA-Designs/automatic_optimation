// resize-images.js
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const sharp = require('sharp');
const glob = require('glob');
const mkdirp = require('mkdirp');

const sizes = [320, 480, 768, 1024, 1440];
const qualityJpeg = 82;
const qualityWebp = 80;

// UPDATED 👇
const imageGlob = '**/{img,images}/**/*.+(jpg|jpeg|png|JPG|JPEG|PNG)';

function log(...args) { console.log('[resize-images]', ...args); }

async function processFile(file) {
  const abs = path.resolve(file);
  const dir = path.dirname(abs);
  const base = path.basename(abs, path.extname(abs));

  await Promise.all(
    sizes.map(async size => {
      const outDir = path.join(dir, `${size}w`);
      await mkdirp(outDir);

      const jpgOut = path.join(outDir, `${base}_${size}w.jpg`);
      const pngOut = path.join(outDir, `${base}_${size}w.png`);
      const webpOut = path.join(outDir, `${base}_${size}w.webp`);

      // JPG output
      try {
        if (!fsSync.existsSync(jpgOut)) {
          await sharp(abs)
            .resize({ width: size, withoutEnlargement: true })
            .jpeg({ quality: qualityJpeg, mozjpeg: true })
            .toFile(jpgOut);
        }
      } catch {
        if (!fsSync.existsSync(pngOut)) {
          await sharp(abs)
            .resize({ width: size, withoutEnlargement: true })
            .png({ quality: qualityJpeg })
            .toFile(pngOut);
        }
      }

      // WEBP output
      if (!fsSync.existsSync(webpOut)) {
        await sharp(abs)
          .resize({ width: size, withoutEnlargement: true })
          .webp({ quality: qualityWebp })
          .toFile(webpOut);
      }
    })
  );
}

function collectFiles() {
  return new Promise((resolve, reject) => {
    glob(imageGlob, { nodir: true }, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });
}

(async function main() {
  const files = await collectFiles();
  if (!files.length) return log('No images found.');
  log(`Found ${files.length} images.`);

  const concurrency = 6;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    await Promise.all(batch.map(processFile));
  }

  log('Done.');
})();
