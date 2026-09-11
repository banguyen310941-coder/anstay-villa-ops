import { createClient } from '@neondatabase/neon-js';

try {
  const response=await fetch('/runtime-source.txt',{cache:'no-store'});
  if(!response.ok) throw new Error(`Không tải được ${response.url}: ${response.status}`);
  let source=await response.text();
  source=source.replace("import { createClient } from '@neondatabase/neon-js';",'');
  new Function('createClient',source)(createClient);
} catch (error) {
  console.error(error);
  const msg=document.getElementById('authMsg');
  if(msg){msg.textContent='Không khởi tạo được ứng dụng: '+(error?.message||error);msg.classList.add('error')}
}
