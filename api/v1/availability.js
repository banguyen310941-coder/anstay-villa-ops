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
    const [bookings,blocks,holds]=await Promise.all([
      sql`SELECT count(*)::int AS count FROM bookings WHERE villa_id=${villa[0].id} AND status IN ('confirmed','staying') AND check_in_date < ${checkOut}::date AND check_out_date > ${checkIn}::date`,
      sql`SELECT id,block_type,start_date::text AS start_date,end_date::text AS end_date,note FROM availability_blocks WHERE villa_id=${villa[0].id} AND active=true AND start_date < ${checkOut}::date AND end_date >= ${checkIn}::date ORDER BY start_date LIMIT 20`,
      sql`SELECT count(*)::int AS count FROM booking_holds WHERE villa_id=${villa[0].id} AND status='active' AND expires_at>now() AND check_in_date < ${checkOut}::date AND check_out_date > ${checkIn}::date`
    ]);
    const bookingCount=Number(bookings[0]?.count||0),holdCount=Number(holds[0]?.count||0),available=bookingCount===0&&holdCount===0&&blocks.length===0;
    sendJson(res,200,{villa:{code:villa[0].code,name:villa[0].name},check_in:checkIn,check_out:checkOut,available,units_available:available?1:0,conflicts:{bookings:bookingCount,holds:holdCount,blocks:blocks.map(b=>({type:b.block_type,start_date:b.start_date,end_date:b.end_date,note:b.note||null}))}});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
