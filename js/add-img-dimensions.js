// js/add-img-dimensions.js
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const cheerio = require("cheerio");
const sharp = require("sharp");

const projectRoot = path.resolve(".");
const files = glob.sync("**/*.{html,php}", {
  cwd: projectRoot,
  absolute: true,
});

async function addDimensions() {
  for (const file of files) {
    let html = fs.readFileSync(file, "utf8");
    const $ = cheerio.load(html, { decodeEntities: false });
    let modified = false;

    const imgs = $("img");
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const $img = $(img);

      if (!$img.attr("width") || !$img.attr("height")) {
        let src = $img.attr("src");
        if (!src) continue;

        // Resolve relative to file location
        const imgPath = path.resolve(
          path.dirname(file),
          src.split("?")[0].split("#")[0]
        );
        if (!fs.existsSync(imgPath)) continue;

        try {
          const metadata = await sharp(imgPath).metadata();
          if (metadata.width && metadata.height) {
            $img.attr("width", metadata.width);
            $img.attr("height", metadata.height);
            modified = true;
          }
        } catch {
          // ignore errors for missing or unreadable images
        }
      }
    }

    if (modified) {
      fs.writeFileSync(file, $.html(), "utf8");
      console.log(`Updated dimensions in: ${file}`);
    }
  }
}

addDimensions().catch(console.error);
