import { cleanVillaCode, handleOptions, method, requireGatewayKey, sendJson, setCors, validDate } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
import { dateSpanInclusive, normalizeChannel, normalizeRatePlan, resolvePricing } from '../_lib/pricing.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['GET']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const villaCode=cleanVillaCode(req.query?.villa_code),from=String(req.query?.from||''),to=String(req.query?.to||''),channelCode=normalizeChannel(req.query?.channel||req.headers['x-anstay-channel']||'WEBSITE'),ratePlanCode=normalizeRatePlan(req.query?.rate_plan||'BAR');
  if(!villaCode||!validDate(from)||!validDate(to)||to<from)return sendJson(res,422,{error:'invalid_request'});
  const span=dateSpanInclusive(from,to);if(span<1||span>93)return sendJson(res,422,{error:'date_range_too_large',message:'ARI v1 tối đa 93 ngày/lần.'});
  try{
    const result=await resolvePricing(getSql(),{villaCode,from,to,channelCode,ratePlanCode});
    if(result.error){const status=result.error==='villa_not_found'?404:result.error==='channel_mapping_not_configured'?409:422;return sendJson(res,status,result)}
    sendJson(res,200,{villa:{code:result.villa.code,name:result.villa.name},channel:{code:result.channel.code,name:result.channel.name},rate_plan:{code:result.plan.code,name:result.plan.name},from,to,pricing_status:result.pricing_status,inventory:result.inventory});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
