import { handleOptions, method, requireGatewayKey, sendJson, setCors } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['GET']))return;
  if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  try{
    const sql=getSql();
    const [villas,channels,ratePlans,mappings]=await Promise.all([
      sql`SELECT v.code,v.name,p.max_guests,p.standard_guests,p.check_in_time::text AS check_in_time,p.check_out_time::text AS check_out_time,p.same_day_booking FROM villas v LEFT JOIN villa_booking_policies p ON p.villa_id=v.id WHERE v.active=true ORDER BY v.id`,
      sql`SELECT code,name,channel_type,currency FROM sales_channels WHERE active=true ORDER BY id`,
      sql`SELECT code,name,currency,default_min_stay FROM rate_plans WHERE active=true ORDER BY id`,
      sql`SELECT c.code AS channel_code,v.code AS villa_code,r.code AS rate_plan_code,m.external_property_id,m.external_room_id,m.external_rate_plan_id,m.rate_adjustment_pct,m.rate_adjustment_flat FROM channel_mappings m JOIN sales_channels c ON c.id=m.channel_id JOIN villas v ON v.id=m.villa_id JOIN rate_plans r ON r.id=m.rate_plan_id WHERE m.active=true ORDER BY c.id,v.id,r.id`
    ]);
    sendJson(res,200,{villas,channels,rate_plans:ratePlans,mappings});
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
