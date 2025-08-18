const { DateTime } = require("luxon");
const Image = require('@11ty/eleventy-img');
const fs = require('fs');
const path = require('path');

module.exports = function(eleventyConfig) {
  // Passthrough static assets
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "admin": "admin" });
  // JS assets (gallery, theme-related scripts, admin dashboards, etc.)
  // Passthrough JS assets
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });

  // Collections
  eleventyConfig.addCollection("artworks", (collection) => {
    return collection.getFilteredByGlob("src/artworks/*.md").sort((a, b) => {
      return (b.data.date || 0) - (a.data.date || 0);
    });
  });

  eleventyConfig.addCollection("lessons", (collection) => {
    return collection.getFilteredByGlob("src/lessons/*.md").sort((a, b) => {
      return new Date(a.data.date) - new Date(b.data.date);
    });
  });

  // Filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    try {

      return DateTime.fromJSDate(new Date(dateObj)).toFormat("dd LLL yyyy, HH:mm");
    } catch {
      return dateObj;
    }
  });

  eleventyConfig.addFilter("date", (dateObj) => {
    try {
      return DateTime.fromJSDate(new Date(dateObj)).toFormat("yyyy");
    } catch {
      return new Date().getFullYear();
    }
  });

  // Minimal XML escape filter (used in feed.njk)
  eleventyConfig.addFilter("xml", (value) => {
    if(value === undefined || value === null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  });

  // Image shortcode (updated path resolution + graceful fallback + placeholder)
  eleventyConfig.addNunjucksAsyncShortcode('optImg', async function(src, alt = '', widths = [400, 800], formats = ['webp','jpeg']){
    try {
      if(!src) return '';
      let original = src;
      // If starts with / treat as under ./src
      if(src.startsWith('/')) {
        original = path.join('src', src); // e.g. /images/foo.jpg -> src/images/foo.jpg
      }
      if(!fs.existsSync(original)) {
        // Fallback: output plain img tag (maybe remote URL or missing during draft)
        return `<img src="${src}" alt="${alt}">`;
      }
      // Ensure a tiny width for placeholder (add 24 if not present)
      const uniqueWidths = Array.from(new Set([24, ...widths])).sort((a,b)=>a-b);
      const metadata = await Image(original, {
        widths: uniqueWidths,
        formats,
        urlPath: '/images/optimized/',
        outputDir: 'dist/images/optimized/'
      });
      const firstFormatKey = Object.keys(metadata)[0];
      const smallest = metadata[firstFormatKey][0]; // should be width 24
      let placeholderDataUri = '';
      try {
        const buf = fs.readFileSync(smallest.outputPath);
        placeholderDataUri = `data:${smallest.sourceType};base64,${buf.toString('base64')}`;
      } catch {}
      const sources = Object.values(metadata).map(imageFormat => {
        return `<source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => entry.srcset).join(', ')}">`;
      }).join('\n');
      const largest = metadata[firstFormatKey][metadata[firstFormatKey].length -1];
      const styleBg = placeholderDataUri ? `background:#111 center/cover no-repeat url('${placeholderDataUri}');` : 'background:#111';
  // Removed inline onload handler for CSP compliance; JS will attach load listeners to add 'loaded' class
  return `<picture class="blur-wrapper" style="${styleBg}">${sources}<img src="${largest.url}" width="${largest.width}" height="${largest.height}" alt="${alt}" loading="lazy" decoding="async" class="blur-up" data-blur="1"></picture>`;
    } catch(e) {
      console.warn('optImg error for', src, e.message);
      return `<img src="${src}" alt="${alt}">`;
    }
  });

  // Sitemap generation after build
  eleventyConfig.on('afterBuild', () => {
    const dist = 'dist';
    const base = process.env.SITE_URL || '';
    function walk(dir){
      return fs.readdirSync(dir).flatMap(f => {
        const p = dir + '/' + f;
        if(fs.statSync(p).isDirectory()) return walk(p);
        if(p.endsWith('.html')) return [p];
        return [];
      });
    }
    const pages = walk(dist).map(p => p.replace(/^dist/, ''));
    const urls = pages.map(u => `<url><loc>${base}${u.replace(/index\.html$/, '')}</loc></url>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
    fs.writeFileSync(dist + '/sitemap.xml', xml);
    fs.writeFileSync(dist + '/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml`);
  });

  return {
    dir: { input: "src", output: "dist", includes: "layouts" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};