import { createClient } from '@neondatabase/neon-js';

const AUTH_URL='https://ep-dawn-dawn-a5y0y7ou.neonauth.us-east-2.aws.neon.tech/anstay/auth';
const DATA_API_URL='https://ep-dawn-dawn-a5y0y7ou.apirest.us-east-2.aws.neon.tech/anstay/rest/v1';
const neon=createClient({auth:{url:AUTH_URL,allowAnonymous:true},dataApi:{url:DATA_API_URL}});

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

export async function rpc(name,args){
  const {data,error}=await neon.rpc(name,args||{});
  if(error){const e=new Error(error.message||error.details||error.code||'public_rpc_failed');e.status=400;e.data=error;throw e}
  return data;
}
export function fail(res,e){const msg=String(e?.message||e||'').slice(0,220);const status=e?.status&&e.status>=400&&e.status<600?e.status:500;send(res,status,{ok:false,error:'website_booking_api_error',message:msg})}
