import { cleanVillaCode, handleOptions, method, requireGatewayKey, sendJson, setCors, validDate } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
import { addDays, dateSpanInclusive, normalizeChannel, normalizeRatePlan, resolvePricing } from '../_lib/pricing.js';
function intParam(v){const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.floor(n):0}
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['GET']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const villaCode=cleanVillaCode(req.query?.villa_code),checkIn=String(req.query?.check_in||''),checkOut=String(req.query?.check_out||''),channelCode=normalizeChannel(req.query?.channel||req.headers['x-anstay-channel']||'WEBSITE'),ratePlanCode=normalizeRatePlan(req.query?.rate_plan||'BAR'),extraAdults=intParam(req.query?.extra_adults),children612=intParam(req.query?.children_6_12),childrenUnder6=intParam(req.query?.children_under_6);
  if(!villaCode||!validDate(checkIn)||!validDate(checkOut)||checkOut<=checkIn)return sendJson(res,422,{error:'invalid_request'});
  const nights=dateSpanInclusive(checkIn,addDays(checkOut,-1));if(nights<1||nights>31)return sendJson(res,422,{error:'invalid_stay_length',message:'Quote v1 hỗ trợ 1–31 đêm.'});
  try{
    const sql=getSql(),pricing=await resolvePricing(sql,{villaCode,from:checkIn,to:addDays(checkOut,-1),channelCode,ratePlanCode});
    if(pricing.error){const status=pricing.error==='villa_not_found'?404:pricing.error==='channel_mapping_not_configured'?409:422;return sendJson(res,status,pricing)}
    const arrival=pricing.inventory[0];
    if(arrival?.closed_to_arrival)return sendJson(res,409,{error:'closed_to_arrival',date:checkIn});
    if(nights<Number(arrival?.min_stay||1))return sendJson(res,409,{error:'minimum_stay_not_met',minimum_stay:Number(arrival.min_stay),nights});
    const unavailable=pricing.inventory.filter(x=>!x.sellable);
    if(unavailable.length)return sendJson(res,409,{error:'not_sellable',dates:unavailable.map(x=>({date:x.date,blocked_by_booking:x.blocked_by_booking,stop_sell:x.stop_sell,published:x.published,rate:x.rate}))});
    const nightly=pricing.inventory.map(x=>({date:x.date,rate:x.rate,currency:x.currency})),roomSubtotal=nightly.reduce((n,x)=>n+Number(x.rate||0),0);
    const surchargeRows=await sql`SELECT extra_adult_price,child_6_12_price,child_under_6_price,charge_basis,currency,note FROM villa_guest_surcharges WHERE villa_id=${pricing.villa.id} LIMIT 1`;
    const s=surchargeRows[0]||{extra_adult_price:0,child_6_12_price:0,child_under_6_price:0,charge_basis:'manual',currency:'VND',note:null};
    const unit=Number(s.extra_adult_price||0)*extraAdults+Number(s.child_6_12_price||0)*children612+Number(s.child_under_6_price||0)*childrenUnder6,hasExtra=extraAdults+children612+childrenUnder6>0;
    let surchargeTotal=0,requiresManual=false;
    if(hasExtra&&s.charge_basis==='per_night')surchargeTotal=unit*nights;else if(hasExtra&&s.charge_basis==='per_stay')surchargeTotal=unit;else if(hasExtra&&s.charge_basis==='manual'){surchargeTotal=null;requiresManual=true}
    const grandTotal=surchargeTotal==null?null:roomSubtotal+surchargeTotal;
    sendJson(res,200,{villa:{code:pricing.villa.code,name:pricing.villa.name},channel:{code:pricing.channel.code,name:pricing.channel.name},rate_plan:{code:pricing.plan.code,name:pricing.plan.name},check_in:checkIn,check_out:checkOut,nights,nightly,room_subtotal:roomSubtotal,surcharge:{basis:s.charge_basis||'manual',extra_adult_price:Number(s.extra_adult_price||0),child_6_12_price:Number(s.child_6_12_price||0),child_under_6_price:Number(s.child_under_6_price||0),extra_adults:extraAdults,children_6_12:children612,children_under_6:childrenUnder6,calculated_total:surchargeTotal,note:s.note||null},grand_total:grandTotal,currency:pricing.plan.currency||'VND',requires_manual_surcharge_confirmation:requiresManual});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
