import {handleOptions,method,parseBody,requireGatewayKey,sendJson,setCors} from '../_lib/http.js';
import {databaseConfigured,getSql} from '../_lib/db.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['GET','PATCH']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  try{
    const sql=getSql();
    if(req.method==='GET'){
      const limit=Math.min(100,Math.max(1,Number(req.query?.limit||50)));
      const channel=String(req.query?.channel||'').trim().toUpperCase();
      const rows=channel?await sql`SELECT o.id,o.booking_id,o.villa_id,o.channel_code,o.event_type,o.payload,o.status,o.attempts,o.next_attempt_at,o.created_at,m.external_property_id,m.external_room_id,m.external_rate_plan_id FROM channel_sync_outbox o LEFT JOIN sales_channels c ON c.code=o.channel_code LEFT JOIN channel_mappings m ON m.channel_id=c.id AND m.villa_id=o.villa_id AND m.active=true WHERE o.status='pending' AND o.next_attempt_at<=now() AND o.channel_code=${channel} ORDER BY o.created_at LIMIT ${limit}`:await sql`SELECT o.id,o.booking_id,o.villa_id,o.channel_code,o.event_type,o.payload,o.status,o.attempts,o.next_attempt_at,o.created_at,m.external_property_id,m.external_room_id,m.external_rate_plan_id FROM channel_sync_outbox o LEFT JOIN sales_channels c ON c.code=o.channel_code LEFT JOIN channel_mappings m ON m.channel_id=c.id AND m.villa_id=o.villa_id AND m.active=true WHERE o.status='pending' AND o.next_attempt_at<=now() ORDER BY o.created_at LIMIT ${limit}`;
      return sendJson(res,200,{items:rows,count:rows.length});
    }
    const b=parseBody(req),id=Number(b.id),status=String(b.status||'').toLowerCase(),error=String(b.error||'').slice(0,1000);
    if(!Number.isInteger(id)||id<=0||!['sent','failed','pending'].includes(status))return sendJson(res,422,{error:'invalid_ack'});
    const rows=await sql`UPDATE channel_sync_outbox SET status=${status},attempts=attempts+1,last_error=${status==='failed'?(error||'adapter_failed'):null},sent_at=${status==='sent'?new Date().toISOString():null}::timestamptz,next_attempt_at=CASE WHEN ${status}='failed' THEN now()+least(interval '60 minutes',interval '5 minutes'*(attempts+1)) WHEN ${status}='pending' THEN now() ELSE next_attempt_at END,updated_at=now() WHERE id=${id} RETURNING id,channel_code,event_type,status,attempts,next_attempt_at,sent_at,last_error`;
    if(!rows.length)return sendJson(res,404,{error:'outbox_item_not_found'});
    return sendJson(res,200,rows[0]);
  }catch(e){return sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,220)})}
}
