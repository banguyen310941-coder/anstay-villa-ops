import { createClient } from '@neondatabase/neon-js';

const parts=['/parts/main-0.txt','/parts/main-1.txt','/parts/main-2.txt','/parts/main-3a.txt','/parts/main-3b.txt','/parts/main-4a.txt','/parts/main-4b.txt','/parts/main-5.txt','/parts/main-6.txt','/parts/main-7.txt','/parts/main-8.txt','/parts/main-9.txt','/parts/main-10.txt'];
try {
  const responses=await Promise.all(parts.map(url=>fetch(url,{cache:'no-store'})));
  for(const r of responses) if(!r.ok) throw new Error(`Không tải được ${r.url}: ${r.status}`);
  let source=(await Promise.all(responses.map(r=>r.text()))).join('');
  source=source.replace("import { createClient } from '@neondatabase/neon-js';",'');
  new Function('createClient',source)(createClient);
} catch (error) {
  console.error(error);
  const msg=document.getElementById('authMsg');
  if(msg){msg.textContent='Không khởi tạo được ứng dụng: '+(error?.message||error);msg.classList.add('error')}
}
