const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const sizes = [320, 480, 640, 768,1024, 1280, 1920];

function processHTMLorPHP(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(html, { decodeEntities: false });

  $("img").each((_, el) => {
    const $img = $(el);
    const src = $img.attr("src");

    if (!src || src.includes("data:")) return; // Skip inline images

    const ext = path.extname(src).toLowerCase();
    const baseName = path.basename(src, ext);
    const dirName = path.dirname(src);

    const picture = $("<picture></picture>");

    // Only WebP sources
    sizes.forEach((size) => {
      picture.append(
        `<source srcset="${dirName}/${size}w/${baseName}_${size}w.webp" media="(max-width: ${size}px)" type="image/webp">`
      );
    });

    // Fallback <img> using WebP
    const imgFallback = $img.clone();
    imgFallback.attr("src", `${dirName}/${baseName}.webp`);
    picture.append(imgFallback);

    $img.replaceWith(picture);
  });

  fs.writeFileSync(filePath, $.html(), "utf8");
  console.log(`✅ Updated <img> tags in ${filePath}`);
}

function processCSS(filePath) {
  let css = fs.readFileSync(filePath, "utf8");

  css = css.replace(
    /(background(?:-image)?\s*:\s*)([^;]+)(;?)/gi,
    (match, prefix, value, suffix) => {
      // Split by commas to handle multiple backgrounds
      const parts = value.split(/\s*,\s*/).map((bg) => {
        const urlMatch = /url\(["']?([^"')]+)["']?\)/i.exec(bg);
        if (!urlMatch) return bg; // No URL, leave as is

        const imgPath = urlMatch[1];
        const ext = path.extname(imgPath).toLowerCase();
        const baseName = path.basename(imgPath, ext);
        const dirName = path.dirname(imgPath);

        // Create WebP sources
        const webpSet = sizes
          .map(
            (size) =>
              `url("${dirName}/${size}w/${baseName}_${size}w.webp") ${size}w`
          )
          .join(", ");

        // Create fallback original format sources
        const fallbackSet = sizes
          .map(
            (size) =>
              `url("${dirName}/${size}w/${baseName}_${size}w${ext}") ${size}w`
          )
          .join(", ");

        // Return image-set() syntax with both formats
        return `
${prefix}${bg}${suffix}
${prefix}-webkit-image-set(${webpSet}); 
${prefix}image-set(${webpSet});
${prefix}-webkit-image-set(${fallbackSet});
${prefix}image-set(${fallbackSet});
`;
      });

      return parts.join(", ");
    }
  );

  fs.writeFileSync(filePath, css, "utf8");
  console.log(`🎨 Updated background images in ${filePath}`);
}

function walk(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (/\.(php|html)$/i.test(file)) {
      processHTMLorPHP(fullPath);
    } else if (/\.css$/i.test(file)) {
      processCSS(fullPath);
    }
  });
}

walk(path.resolve(__dirname, "..")); // Start scanning from project root
