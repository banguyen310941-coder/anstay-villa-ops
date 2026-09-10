import { randomUUID } from 'node:crypto';
import { cleanVillaCode, handleOptions, method, parseBody, requireGatewayKey, sendJson, setCors, validDate } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
import { addDays, dateSpanInclusive, normalizeChannel, normalizeRatePlan, resolvePricing } from '../_lib/pricing.js';
function intParam(v,d=1){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>0?n:d}
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['POST']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  try{
    const body=parseBody(req),villaCode=cleanVillaCode(body.villa_code),checkIn=String(body.check_in||''),checkOut=String(body.check_out||''),channelCode=normalizeChannel(body.channel||req.headers['x-anstay-channel']||'WEBSITE'),ratePlanCode=normalizeRatePlan(body.rate_plan||'BAR'),guests=intParam(body.guests,1);
    if(!villaCode||!validDate(checkIn)||!validDate(checkOut)||checkOut<=checkIn)return sendJson(res,422,{error:'invalid_request'});
    const nights=dateSpanInclusive(checkIn,addDays(checkOut,-1));if(nights<1||nights>31)return sendJson(res,422,{error:'invalid_stay_length'});
    const sql=getSql(),pricing=await resolvePricing(sql,{villaCode,from:checkIn,to:addDays(checkOut,-1),channelCode,ratePlanCode});
    if(pricing.error){const status=pricing.error==='villa_not_found'?404:pricing.error==='channel_mapping_not_configured'?409:422;return sendJson(res,status,pricing)}
    if(pricing.villa.max_guests&&guests>Number(pricing.villa.max_guests))return sendJson(res,409,{error:'capacity_exceeded',max_guests:Number(pricing.villa.max_guests)});
    const first=pricing.inventory[0];if(first?.closed_to_arrival)return sendJson(res,409,{error:'closed_to_arrival'});if(nights<Number(first?.min_stay||1))return sendJson(res,409,{error:'minimum_stay_not_met',minimum_stay:Number(first.min_stay)});
    const unavailable=pricing.inventory.filter(x=>!x.sellable);if(unavailable.length)return sendJson(res,409,{error:'not_sellable',dates:unavailable.map(x=>x.date)});
    const total=pricing.inventory.reduce((n,x)=>n+Number(x.rate||0),0),token=randomUUID(),minutes=Math.min(20,Math.max(5,Number(body.hold_minutes||10)));
    const rows=await sql`INSERT INTO booking_holds(hold_token,villa_id,channel_code,rate_plan_code,check_in_date,check_out_date,guests,quoted_total,currency,expires_at) VALUES (${token},${pricing.villa.id},${channelCode},${ratePlanCode},${checkIn}::date,${checkOut}::date,${guests},${total},${pricing.plan.currency||'VND'},now()+(${minutes}::text||' minutes')::interval) RETURNING hold_token,check_in_date::text AS check_in,check_out_date::text AS check_out,guests,quoted_total,currency,expires_at`;
    sendJson(res,201,{hold:rows[0],villa:{code:pricing.villa.code,name:pricing.villa.name},channel:channelCode,rate_plan:ratePlanCode});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
