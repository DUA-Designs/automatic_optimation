// js/add-font-display-swap.js
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const projectRoot = path.resolve(".");
const cssFiles = glob.sync("css/**/*.css", {
  cwd: projectRoot,
  absolute: true,
});

cssFiles.forEach((file) => {
  let css = fs.readFileSync(file, "utf8");
  // Add font-display: swap if not present inside @font-face blocks
  const updatedCss = css.replace(/@font-face\s*{[^}]*}/g, (match) => {
    if (!/font-display\s*:/i.test(match)) {
      return match.replace(/}/, "  font-display: swap;\n}");
    }
    return match;
  });

  if (updatedCss !== css) {
    fs.writeFileSync(file, updatedCss, "utf8");
    console.log(`Added font-display: swap in ${file}`);
  }
});
