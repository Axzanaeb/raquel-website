const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier');

const dist = path.join(__dirname, '..', 'dist');

function walk(dir){
  for(const f of fs.readdirSync(dir)){
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if(stat.isDirectory()) walk(p);
    else if(p.endsWith('.html')){
      const original = fs.readFileSync(p, 'utf8');
      const out = minify(original, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        minifyCSS: true,
        minifyJS: true
      });
      fs.writeFileSync(p, out);
    }
  }
}
walk(dist);
console.log('HTML minified');
