import {readFile} from 'node:fs/promises';
const loader=await readFile(new URL('../loader.js',import.meta.url),'utf8');
const paths=[...loader.matchAll(/'\/(parts\/[^']+)'/g)].map(m=>m[1]);
if(!paths.length)throw new Error('No runtime parts found in loader.js');
let source='';for(const p of paths)source+=await readFile(new URL('../public/'+p,import.meta.url),'utf8');
source=source.replace("import { createClient } from '@neondatabase/neon-js';",'');
new Function('createClient',source);
console.log(`Syntax-checked ${paths.length} ANSTAY runtime parts`);
