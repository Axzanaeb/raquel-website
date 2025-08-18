const fs = require('fs');
const path = require('path');

module.exports = function(eleventyConfig) {
  // Passthrough static assets (limit to what we actually use)
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "admin": "admin" });
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
  const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  eleventyConfig.addFilter("readableDate", (d) => {
    try { return fmt.format(new Date(d)); } catch { return d; }
  });
  eleventyConfig.addFilter("date", (d) => {
    try { return new Date(d).getFullYear(); } catch { return new Date().getFullYear(); }
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