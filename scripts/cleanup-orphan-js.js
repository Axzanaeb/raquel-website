const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname,'..','src','assets','js');
const distDir = path.join(__dirname,'..','dist','assets','js');
if(!fs.existsSync(distDir)) process.exit(0);
const srcNames = new Set(fs.readdirSync(srcDir));
for(const f of fs.readdirSync(distDir)){
  if(!srcNames.has(f)){
    fs.unlinkSync(path.join(distDir,f));
    console.log('[cleanup] removed orphan', f);
  }
}
