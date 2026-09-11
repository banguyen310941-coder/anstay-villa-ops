import {readFile} from 'node:fs/promises';

let source=await readFile(new URL('../public/runtime-source.txt',import.meta.url),'utf8');
source=source.replace("import { createClient } from '@neondatabase/neon-js';",'');
new Function('createClient',source);
console.log('Syntax-checked consolidated ANSTAY runtime source');
