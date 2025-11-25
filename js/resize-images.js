const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const sizes = [320, 480, 640, 768, 1024, 1280, 1920];

// Get absolute path to the current project directory
const projectRoot = path.resolve(".");

// Find all images inside any `images` folder in the project
glob
  .sync("**/images/**/*.{jpg,jpeg,png}", {
    cwd: projectRoot,
    nodir: true,
    absolute: false, // keep relative for output naming
  })
  .forEach((relativePath) => {
    const ext = path.extname(relativePath).toLowerCase();
    const baseName = path.basename(relativePath, ext);
    const dir = path.dirname(relativePath);
    const absInputPath = path.join(projectRoot, relativePath); // ✅ absolute path for sharp

    sizes.forEach((size) => {
      const outputDir = path.join(projectRoot, dir, `${size}w`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      sharp(absInputPath)
        .resize(size)
        .toFile(path.join(outputDir, `${baseName}_${size}w${ext}`))
        .then(() => {
          console.log(`Created: ${outputDir}/${baseName}_${size}w${ext}`);
        })
        .catch((err) => console.error("Error processing", absInputPath, err));
    });
  });
