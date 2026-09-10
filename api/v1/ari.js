import { cleanVillaCode, handleOptions, method, requireGatewayKey, sendJson, setCors, validDate } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
function daysBetween(a,b){return Math.ceil((new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z'))/86400000)}
function addDay(s,n){const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['GET']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const villaCode=cleanVillaCode(req.query?.villa_code),from=String(req.query?.from||''),to=String(req.query?.to||'');
  if(!villaCode||!validDate(from)||!validDate(to)||to<from)return sendJson(res,422,{error:'invalid_request'});
  const span=daysBetween(from,to); if(span<0||span>93)return sendJson(res,422,{error:'date_range_too_large',message:'ARI v1 tối đa 93 ngày/lần.'});
  try{
    const sql=getSql(),villa=await sql`SELECT id,code,name FROM villas WHERE code=${villaCode} AND active=true LIMIT 1`;
    if(!villa.length)return sendJson(res,404,{error:'villa_not_found'});
    const rows=await sql`SELECT check_in_date::text AS check_in,check_out_date::text AS check_out FROM bookings WHERE villa_id=${villa[0].id} AND status IN ('confirmed','staying') AND check_in_date <= ${to}::date AND check_out_date > ${from}::date`;
    const inventory=[]; for(let i=0;i<=span;i++){const date=addDay(from,i);const blocked=rows.some(b=>date>=b.check_in&&date<b.check_out);inventory.push({date,units_available:blocked?0:1,closed:blocked,rate:null,currency:'VND'});}
    sendJson(res,200,{villa:{code:villa[0].code,name:villa[0].name},from,to,pricing_status:'rate_module_not_configured',inventory});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
