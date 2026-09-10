const BACKEND_URL='https://br-jolly-rice-a5k1z7i5-anstayweb.compute.c-1.us-east-2.aws.neon.tech';

export function send(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.end(JSON.stringify(body));
}
export function body(req){if(req.body==null)return {};if(typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;const raw=Buffer.isBuffer(req.body)?req.body.toString('utf8'):String(req.body||'');return raw?JSON.parse(raw):{}}
export function date(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):null}
export function posInt(v,d=1){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>0?n:d}
export function nonnegInt(v){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>=0?n:0}
export function cleanCode(v,d=''){return String(v||d).trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,32)}
export function cleanText(v,max=500){return String(v||'').trim().slice(0,max)}

function spec(name,a){
  if(name==='public_web_search')return {path:'search',method:'GET',query:{check_in:a.p_check_in,check_out:a.p_check_out,guests:a.p_guests,channel:a.p_channel,rate_plan:a.p_rate_plan}};
  if(name==='public_web_quote')return {path:'quote',method:'GET',query:{villa:a.p_villa_code,check_in:a.p_check_in,check_out:a.p_check_out,guests:a.p_guests,extra_adults:a.p_extra_adults,children_6_12:a.p_children_6_12,children_under_6:a.p_children_under_6,channel:a.p_channel,rate_plan:a.p_rate_plan}};
  if(name==='public_web_create_hold')return {path:'hold',method:'POST',body:{villa_code:a.p_villa_code,check_in:a.p_check_in,check_out:a.p_check_out,guests:a.p_guests,extra_adults:a.p_extra_adults,children_6_12:a.p_children_6_12,children_under_6:a.p_children_under_6,channel:a.p_channel,rate_plan:a.p_rate_plan,hold_minutes:a.p_minutes}};
  if(name==='public_web_create_request')return {path:'request',method:'POST',body:{hold_token:a.p_hold_token,guest_name:a.p_guest_name,guest_email:a.p_guest_email,guest_phone:a.p_guest_phone,guest_note:a.p_guest_note}};
  if(name==='public_web_request_status')return {path:'status',method:'GET',query:{code:a.p_request_code,email:a.p_guest_email}};
  throw new Error('unsupported_public_rpc');
}
export async function rpc(name,args){
  const s=spec(name,args||{}),q=new URLSearchParams();for(const [k,v] of Object.entries(s.query||{}))if(v!=null)q.set(k,String(v));
  const url=`${BACKEND_URL}/${s.path}${q.size?'?'+q:''}`;
  const r=await fetch(url,{method:s.method,headers:{'Accept':'application/json',...(s.body?{'Content-Type':'application/json'}:{})},body:s.body?JSON.stringify(s.body):undefined});
  const text=await r.text();let data;try{data=text?JSON.parse(text):null}catch{data={error:'invalid_booking_backend_response',detail:text.slice(0,200)}}
  if(!r.ok){const e=new Error(data?.message||data?.error||`booking_backend_${r.status}`);e.status=r.status;e.data=data;throw e}return data;
}
export function fail(res,e){const msg=String(e?.message||e||'').slice(0,220);const status=e?.status&&e.status>=400&&e.status<600?e.status:500;send(res,status,{ok:false,error:'website_booking_api_error',message:msg})}
