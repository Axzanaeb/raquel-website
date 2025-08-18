const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname,'..','dist');
function walk(dir){
  return fs.readdirSync(dir).flatMap(f=>{
    const p = path.join(dir,f);
    const st = fs.statSync(p);
    if(st.isDirectory()) return walk(p);
    return [p];
  });
}
const files = walk(dist).map(p=>p.replace(dist+'/',''));
const js = files.filter(f=>f.startsWith('assets/js/'));
console.log('[postbuild] JS assets:', js);
console.log('[postbuild] Total files:', files.length);
