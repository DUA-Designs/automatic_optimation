#!/usr/bin/env node

/*
  prune-unused-images.js
  - Scans code files for references to images
  - Computes which files under <root>/images are unused
  - By default moves unused images to <root>/_unused_images (preserving structure)
  - With --delete, permanently deletes unused images
  - Writes a report JSON to <root>/prune-report.json

  Usage:
    node js/prune-unused-images.js --root optimized            # move unused to _unused_images
    node js/prune-unused-images.js --root optimized --delete   # delete unused images
*/

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { root: process.cwd(), delete: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--root') {
      parsed.root = args[i + 1];
      i += 1;
    } else if (arg === '--delete') {
      parsed.delete = true;
    }
  }
  return parsed;
}

function isTextFile(filePath) {
  const textExts = new Set(['.php', '.html', '.htm', '.css', '.js', '.json', '.md', '.txt']);
  return textExts.has(path.extname(filePath).toLowerCase());
}

function isImageFile(filePath) {
  const imgExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif']);
  return imgExts.has(path.extname(filePath).toLowerCase());
}

function walkDir(dirPath, collectPredicate) {
  /** Returns array of absolute file paths matching collectPredicate */
  const stack = [dirPath];
  const results = [];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (_e) {
      continue;
    }
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and .git and _unused_images folders
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '_unused_images') {
          continue;
        }
        stack.push(abs);
      } else if (entry.isFile()) {
        if (!collectPredicate || collectPredicate(abs)) {
          results.push(abs);
        }
      }
    }
  }
  return results;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_e) {
    return '';
  }
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main() {
  const { root, delete: shouldDelete } = parseArgs();
  const normalizedRoot = path.resolve(root);
  const imagesRoot = path.join(normalizedRoot, 'images');

  if (!fs.existsSync(imagesRoot)) {
    console.log(`No images directory found at: ${imagesRoot}`);
    process.exit(0);
  }

  const allCodeFiles = walkDir(normalizedRoot, (p) => isTextFile(p));
  const allImageFiles = walkDir(imagesRoot, (p) => isImageFile(p));

  // Build a map from basename -> [absPaths]
  const basenameToPaths = new Map();
  for (const imgAbs of allImageFiles) {
    const base = path.basename(imgAbs).toLowerCase();
    if (!basenameToPaths.has(base)) basenameToPaths.set(base, []);
    basenameToPaths.get(base).push(imgAbs);
  }

  // Extract referenced image paths from code
  const referencedAbsPaths = new Set();
  const ambiguousBasenames = new Set();

  const imageRefRegex = /[A-Za-z0-9_\-./%]+\.(?:png|jpe?g|gif|svg|webp|avif)/gi;

  for (const codeFile of allCodeFiles) {
    const content = readFileSafe(codeFile);
    if (!content) continue;

    const matches = content.match(imageRefRegex) || [];
    for (let rawRef of matches) {
      try {
        rawRef = decodeURIComponent(rawRef);
      } catch (_e) {
        // ignore decode errors, use raw
      }
      const normalizedRef = rawRef.replace(/\\/g, '/');

      // Strategy 1: direct path under images/
      let candidateAbs = null;
      if (normalizedRef.includes('images/')) {
        // Strip possible leading / or ./
        let rel = normalizedRef.replace(/^\.{0,2}\//, '');
        const idx = rel.indexOf('images/');
        if (idx >= 0) {
          rel = rel.slice(idx); // start at images/
        }
        candidateAbs = path.join(normalizedRoot, rel);
        if (fs.existsSync(candidateAbs)) {
          referencedAbsPaths.add(path.resolve(candidateAbs));
          continue;
        }
      }

      // Strategy 2: by basename (only if unambiguous)
      const base = path.basename(normalizedRef).toLowerCase();
      const candidates = basenameToPaths.get(base);
      if (candidates && candidates.length === 1) {
        referencedAbsPaths.add(path.resolve(candidates[0]));
      } else if (candidates && candidates.length > 1) {
        ambiguousBasenames.add(base);
      }
    }
  }

  const allImageSet = new Set(allImageFiles.map((p) => path.resolve(p)));
  const usedImages = Array.from(referencedAbsPaths);
  const unusedImages = Array.from(allImageSet).filter((p) => !referencedAbsPaths.has(p));

  const report = {
    root: normalizedRoot,
    totals: {
      codeFiles: allCodeFiles.length,
      imageFiles: allImageFiles.length,
      used: usedImages.length,
      unused: unusedImages.length,
      ambiguousBasenameCount: ambiguousBasenames.size,
    },
    ambiguousBasenames: Array.from(ambiguousBasenames).sort(),
    usedImages: usedImages.sort(),
    unusedImages: unusedImages.sort(),
  };

  const reportPath = path.join(normalizedRoot, 'prune-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  if (unusedImages.length === 0) {
    console.log('No unused images found.');
    console.log(`Report: ${reportPath}`);
    return;
  }

  if (shouldDelete) {
    for (const abs of unusedImages) {
      try {
        fs.unlinkSync(abs);
      } catch (_e) {
        // ignore delete errors
      }
    }
    console.log(`Deleted ${unusedImages.length} unused images.`);
  } else {
    const quarantineRoot = path.join(normalizedRoot, '_unused_images');
    for (const abs of unusedImages) {
      const relFromRoot = path.relative(normalizedRoot, abs);
      const dest = path.join(quarantineRoot, relFromRoot);
      ensureDirSync(path.dirname(dest));
      try {
        fs.renameSync(abs, dest);
      } catch (_e) {
        // Fallback to copy+unlink if rename cross-device fails
        try {
          fs.copyFileSync(abs, dest);
          fs.unlinkSync(abs);
        } catch (__e) {
          // ignore
        }
      }
    }
    console.log(`Moved ${unusedImages.length} unused images to: ${path.join(normalizedRoot, '_unused_images')}`);
  }

  console.log(`Report: ${reportPath}`);
}

main();
