#!/usr/bin/env node
// Simple build validation: check generated HTML files for basic issues & broken internal links.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
let hadError = false;

function walk(dir){
  return fs.readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if(st.isDirectory()) return walk(p);
    if(p.endsWith('.html')) return [p];
    return [];
  });
}

if(!fs.existsSync(dist)) {
  console.error('dist not found – run build first');
  process.exit(1);
}

const htmlFiles = walk(dist);
const internalLinks = [];

// Critical JS assets that pages rely on (avoid production 404 regressions)
const requiredJs = [
  'assets/js/gallery.js',
  'assets/js/lessons.js',
  'assets/js/blur-up.js'
];
requiredJs.forEach(f => {
  const p = path.join(dist, f);
  if(!fs.existsSync(p)) {
    console.error('Missing required asset:', f);
    hadError = true;
  }
});

htmlFiles.forEach(file => {
  const rel = file.replace(dist,'');
  const html = fs.readFileSync(file, 'utf8');
  // Basic checks
  if(!html.includes('<meta charset')) {
    console.warn('Missing meta charset in', rel);
  }
  // Collect internal hrefs
  const linkRe = /href="(\/[^"#?]+)"/g; // crude
  let m;
  while((m = linkRe.exec(html))) {
    const href = m[1];
    if(!href.endsWith('.jpg') && !href.endsWith('.png') && !href.endsWith('.webp')) {
      internalLinks.push(href);
    }
  }
});

// Deduplicate and verify existence
const uniqueLinks = Array.from(new Set(internalLinks));
uniqueLinks.forEach(href => {
  // Map /path to dist/path/index.html or dist/path.html
  let target = path.join(dist, href.replace(/\/$/, '/index.html'));
  if(!fs.existsSync(target)) {
    // try .html variant
    if(!href.endsWith('/')) {
      const alt = path.join(dist, href + '.html');
      if(fs.existsSync(alt)) return; else {
        console.error('Broken link:', href);
        hadError = true;
      }
    } else {
      console.error('Broken link:', href);
      hadError = true;
    }
  }
});

if(hadError) {
  console.error('Validation failed');
  process.exit(2);
} else {
  console.log('Validation passed');
}
