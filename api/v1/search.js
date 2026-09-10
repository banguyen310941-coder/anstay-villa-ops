import { handleOptions, method, requireGatewayKey, sendJson, setCors, validDate } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
import { addDays, dateSpanInclusive, normalizeChannel, normalizeRatePlan, resolvePricing } from '../_lib/pricing.js';
function intParam(v,d=1){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>0?n:d}
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['GET']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const checkIn=String(req.query?.check_in||''),checkOut=String(req.query?.check_out||''),channelCode=normalizeChannel(req.query?.channel||req.headers['x-anstay-channel']||'WEBSITE'),ratePlanCode=normalizeRatePlan(req.query?.rate_plan||'BAR'),guests=intParam(req.query?.guests,1);
  if(!validDate(checkIn)||!validDate(checkOut)||checkOut<=checkIn)return sendJson(res,422,{error:'invalid_request'});
  const nights=dateSpanInclusive(checkIn,addDays(checkOut,-1));if(nights<1||nights>31)return sendJson(res,422,{error:'invalid_stay_length'});
  try{
    const sql=getSql(),villas=await sql`SELECT code,name FROM villas WHERE active=true ORDER BY id`,results=[];
    for(const v of villas){
      const p=await resolvePricing(sql,{villaCode:v.code,from:checkIn,to:addDays(checkOut,-1),channelCode,ratePlanCode});
      if(p.error){results.push({villa:{code:v.code,name:v.name},sellable:false,reason:p.error});continue}
      if(p.villa.max_guests&&guests>Number(p.villa.max_guests)){results.push({villa:{code:v.code,name:v.name},sellable:false,reason:'capacity_exceeded',max_guests:Number(p.villa.max_guests)});continue}
      const first=p.inventory[0],blocked=p.inventory.filter(x=>!x.sellable);
      if(first?.closed_to_arrival){results.push({villa:{code:v.code,name:v.name},sellable:false,reason:'closed_to_arrival'});continue}
      if(nights<Number(first?.min_stay||1)){results.push({villa:{code:v.code,name:v.name},sellable:false,reason:'minimum_stay_not_met',minimum_stay:Number(first.min_stay)});continue}
      if(blocked.length){results.push({villa:{code:v.code,name:v.name},sellable:false,reason:'not_sellable',blocked_dates:blocked.map(x=>x.date)});continue}
      const roomTotal=p.inventory.reduce((n,x)=>n+Number(x.rate||0),0);
      results.push({villa:{code:v.code,name:v.name},sellable:true,max_guests:p.villa.max_guests==null?null:Number(p.villa.max_guests),nights,room_total:roomTotal,currency:p.plan.currency||'VND',rate_plan:p.plan.code,channel:p.channel.code,nightly:p.inventory.map(x=>({date:x.date,rate:x.rate}))});
    }
    sendJson(res,200,{check_in:checkIn,check_out:checkOut,guests,channel:channelCode,rate_plan:ratePlanCode,results});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
