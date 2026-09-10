const DATA_API_URL='https://ep-dawn-dawn-a5y0y7ou.apirest.us-east-2.aws.neon.tech/anstay/rest/v1';

export function send(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.end(JSON.stringify(body));
}

export function body(req){
  if(req.body==null)return {};
  if(typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  const raw=Buffer.isBuffer(req.body)?req.body.toString('utf8'):String(req.body||'');
  return raw?JSON.parse(raw):{};
}

export function date(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):null}
export function posInt(v,d=1){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>0?n:d}
export function nonnegInt(v){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>=0?n:0}
export function cleanCode(v,d=''){return String(v||d).trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,32)}
export function cleanText(v,max=500){return String(v||'').trim().slice(0,max)}

export async function rpc(name,args){
  const r=await fetch(`${DATA_API_URL}/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(args)});
  const text=await r.text();
  let data;try{data=text?JSON.parse(text):null}catch{data={error:'invalid_data_api_response',detail:text.slice(0,200)}}
  if(!r.ok){const e=new Error(data?.message||data?.details||data?.error||`data_api_${r.status}`);e.status=r.status;e.data=data;throw e}
  return data;
}

export function fail(res,e){
  const msg=String(e?.message||e||'').slice(0,220);
  const status=e?.status&&e.status>=400&&e.status<600?e.status:500;
  send(res,status,{ok:false,error:'website_booking_api_error',message:msg});
}
