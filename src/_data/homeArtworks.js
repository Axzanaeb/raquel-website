const fs = require('fs');
const path = require('path');

// Lightweight front matter parser (expects simple YAML key: value pairs, no nesting except strings)
function parseFrontMatter(raw){
  if(!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if(end === -1) return { data: {}, body: raw };
  const fmBlock = raw.substring(3, end).trim();
  const body = raw.substring(end + 4).trim();
  const data = {};
  fmBlock.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if(m){
      let val = m[2].trim();
      if(val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1);
      if(val.startsWith("'") && val.endsWith("'")) val = val.slice(1,-1);
      data[m[1]] = val;
    }
  });
  return { data, body };
}

module.exports = () => {
  const dir = path.join(__dirname, '..', 'artworks');
  if(!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const entries = files.map(f => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const { data } = parseFrontMatter(raw);
    const date = new Date(data.date || 0).getTime();
    return {
      url: `/artworks/${f.replace(/\.md$/, '')}/`,
      data: {
        title: data.title || f,
        category: data.category || 'art',
        image: data.image || '',
        alt: data.alt || data.title || f,
        date
      }
    };
  });
  // Sort newest first
  entries.sort((a,b) => b.data.date - a.data.date);
  return entries.slice(0,6);
};
