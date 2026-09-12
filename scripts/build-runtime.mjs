import {readFile,writeFile} from 'node:fs/promises';

const parts=[
  'main-0.txt','main-1.txt','main-2.txt','main-3a.txt','main-3b.txt','main-4a.txt','main-4b.txt',
  'main-5.txt','main-6.txt','main-7.txt','main-8.txt','main-9.txt','main-10.txt','main-11.txt',
  'main-12.txt','main-13.txt','main-14.txt','main-15.txt','main-16.txt','main-17.txt','main-18.txt',
  'main-19.txt','main-20.txt','main-21.txt','main-22.txt','main-23.txt','main-24.txt','main-25.txt','main-26.txt'
];
const chunks=[];
for(const part of parts){
  const content=await readFile(new URL('../public/parts/'+part,import.meta.url),'utf8');
  chunks.push(`/* ${part} */\n${content}\n`);
}
await writeFile(new URL('../public/runtime-source.txt',import.meta.url),chunks.join(''),'utf8');
console.log(`Built consolidated runtime from ${parts.length} parts`);
