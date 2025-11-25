name: Website Optimization

on:
  push:
    branches:
      - main
      - optimized
  workflow_dispatch:

jobs:
  optimize:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: |
          npm install -g html-minifier-terser clean-css-cli terser purgecss cheerio sharp
          npm install @squoosh/cli@0.7.1
          npm ci --prefer-offline --no-audit

      - name: Create optimized directory
        run: mkdir -p optimized

      - name: Copy files to optimized directory
        run: |
          cp -r *.php optimized/ 2>/dev/null || echo "No PHP files found"
          [ -d css ] && cp -r css optimized/ || echo "CSS directory not found"
          [ -d js ] && cp -r js optimized/ || echo "JS directory not found"
          [ -d images ] && cp -r images optimized/ || echo "Images directory not found"
          [ -d fonts ] && cp -r fonts optimized/ || echo "Fonts directory not found"
          cp -r *.html optimized/ 2>/dev/null || echo "No HTML files found"

      - name: Minify HTML and PHP files
        run: |
          cd optimized
          find . \( -iname "*.html" -o -iname "*.php" \) -type f | while read -r file; do
            if [ -f "$file" ]; then
              echo "Minifying $file"
              html-minifier-terser \
                --collapse-whitespace \
                --remove-comments \
                --remove-optional-tags \
                --remove-redundant-attributes \
                --remove-script-type-attributes \
                --remove-tag-whitespace \
                --use-short-doctype \
                --minify-js true \
                --minify-css true \
                "$file" \
                --output "$file"
            fi
          done

      - name: Purge unused CSS
        run: |
          cd optimized
          if [ -d css ]; then
            find css -iname "*.css" | while read -r file; do
              echo "Purging CSS: $file"
              purgecss \
                --css "$file" \
                --content "**/*.php" "**/*.html" "**/*.js" \
                --output "$(dirname "$file")" \
                --rejected
            done
          fi

      - name: Minify CSS
        run: |
          cd optimized
          if [ -d css ]; then
            find css -iname "*.css" | while read -r file; do
              echo "Minifying CSS: $file"
              cleancss --output "$file" "$file"
            done
          fi

      - name: Minify JavaScript
        run: |
          cd optimized
          if [ -d js ]; then
            find js -iname "*.js" | while read -r file; do
              echo "Minifying JS: $file"
              terser "$file" --compress drop_console=true,drop_debugger=true --mangle --output "$file"
            done
          fi

      - name: Generate Responsive Images
        run: node js/resize-images.js

      - name: Convert Images to WebP
        run: node js/convert-webp.js

      - name: Replace <img> with <picture>
        run: node js/replace-img-with-picture.js

      - name: Add Lazy Loading to Images
        run: |
          cd optimized
          find . \( -iname "*.html" -o -iname "*.php" \) -type f | while read -r file; do
            echo "Adding lazy loading to: $file"
            node -e "
              const fs = require('fs');
              const cheerio = require('cheerio');
              try {
                let html = fs.readFileSync('$file', 'utf8');
                const \$ = cheerio.load(html, { decodeEntities: false });
                \$('img').each((_, el) => {
                  const \$img = \$(el);
                  if (!\$img.attr('loading')) { \$img.attr('loading', 'lazy'); }
                  if (!\$img.attr('decoding')) { \$img.attr('decoding', 'async'); }
                });
                fs.writeFileSync('$file', \$.html());
              } catch (error) {
                console.log('Error processing $file:', error.message);
              }
            "
          done

      - name: Add preload for critical resources
        run: |
          cd optimized
          find . \( -iname "*.html" -o -iname "*.php" \) -type f | while read -r file; do
            echo "Adding preload links to: $file"
            node -e "
              const fs = require('fs');
              const cheerio = require('cheerio');
              try {
                let html = fs.readFileSync('$file', 'utf8');
                const \$ = cheerio.load(html, { decodeEntities: false });
                if (\$('link[rel=\"stylesheet\"]').length > 0) {
                  \$('link[rel=\"stylesheet\"]').first().before('<link rel=\"preload\" href=\"css/style.css\" as=\"style\" onload=\"this.onload=null;this.rel=\\\"stylesheet\\\"\">');
                }
                fs.writeFileSync('$file', \$.html());
              } catch (error) { console.log('Error processing $file:', error.message); }
            "
          done

      - name: "Add font-display: swap to CSS fonts"
        run: node js/add-font-display-swap.js

      - name: Add width and height attributes to images
        run: node js/add-img-dimensions.js

      - name: Gzip CSS and JS assets
        run: |
          find optimized/css optimized/js -type f \( -iname "*.css" -o -iname "*.js" \) -exec gzip -kf {} \;

      - name: Create optimization report
        run: |
          cd optimized
          echo "# Website Optimization Report" > optimization-report.md
          echo "Generated on: $(date)" >> optimization-report.md
          echo "" >> optimization-report.md
          echo "## File Counts:" >> optimization-report.md
          echo "- PHP files: $(find . -name \"*.php\" | wc -l)" >> optimization-report.md
          echo "- CSS files: $(find . -name \"*.css\" | wc -l)" >> optimization-report.md
          echo "- JS files: $(find . -name \"*.js\" | wc -l)" >> optimization-report.md
          echo "- Images: $(find images -type f \( -iname \"*.jpg\" -o -iname \"*.jpeg\" -o -iname \"*.png\" -o -iname \"*.webp\" \) | wc -l)" >> optimization-report.md
          echo "" >> optimization-report.md
          echo "## Total Size:" >> optimization-report.md
          echo "- Total size: $(du -sh . | cut -f1)" >> optimization-report.md

      - name: Configure git to use GITHUB_TOKEN
        run: git remote set-url origin https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/KommineniCharan/emnar.git

      - name: Commit and push optimized files
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git checkout -B optimized

          git rm -r --cached .
          cp -r optimized/* .
          rm -rf optimized

          git add .
          git commit -m "🚀 Optimized website assets

          - Minified HTML, CSS, and JavaScript
          - Optimized images with WebP conversion
          - Generated responsive images
          - Added lazy loading to images
          - Purged unused CSS
          - Added preload for critical resources
          - Added font-display: swap to CSS fonts
          - Added image width and height attributes
          - Gzipped CSS and JS files" || echo "No changes to commit"

          git push origin optimized --force

      - name: Upload optimization report
        uses: actions/upload-artifact@v4
        with:
          name: optimization-report
          path: optimization-report.md
