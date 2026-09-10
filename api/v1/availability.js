import { cleanVillaCode, handleOptions, method, requireGatewayKey, sendJson, setCors, validDate } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return; setCors(req,res);
  if(!method(req,res,['GET']))return;
  if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const villaCode=cleanVillaCode(req.query?.villa_code),checkIn=String(req.query?.check_in||''),checkOut=String(req.query?.check_out||'');
  if(!villaCode||!validDate(checkIn)||!validDate(checkOut)||checkOut<=checkIn)return sendJson(res,422,{error:'invalid_request',message:'Cần villa_code, check_in, check_out hợp lệ.'});
  try{
    const sql=getSql(); const villa=await sql`SELECT id,code,name FROM villas WHERE code=${villaCode} AND active=true LIMIT 1`;
    if(!villa.length)return sendJson(res,404,{error:'villa_not_found'});
    const conflict=await sql`SELECT count(*)::int AS count FROM bookings WHERE villa_id=${villa[0].id} AND status IN ('confirmed','staying') AND check_in_date < ${checkOut}::date AND check_out_date > ${checkIn}::date`;
    sendJson(res,200,{villa:{code:villa[0].code,name:villa[0].name},check_in:checkIn,check_out:checkOut,available:Number(conflict[0]?.count||0)===0,units_available:Number(conflict[0]?.count||0)===0?1:0});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
