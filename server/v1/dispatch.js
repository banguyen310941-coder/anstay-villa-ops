import {dispatchToAdapter} from '../_lib/adapters.js';
import {databaseConfigured,getSql} from '../_lib/db.js';
import {handleOptions,method,parseBody,requireGatewayKey,sendJson,setCors} from '../_lib/http.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['POST']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const b=parseBody(req),channel=String(b.channel||'').trim().toUpperCase(),limit=Math.min(20,Math.max(1,Number(b.limit||10)));
  const sql=getSql();
  try{
    const rows=channel?await sql`SELECT o.*,m.external_property_id,m.external_room_id,m.external_rate_plan_id,c.id AS channel_id FROM channel_sync_outbox o LEFT JOIN sales_channels c ON c.code=o.channel_code LEFT JOIN channel_mappings m ON m.channel_id=c.id AND m.villa_id=o.villa_id AND m.active=true WHERE o.status='pending' AND o.next_attempt_at<=now() AND o.channel_code=${channel} ORDER BY o.created_at LIMIT ${limit}`:await sql`SELECT o.*,m.external_property_id,m.external_room_id,m.external_rate_plan_id,c.id AS channel_id FROM channel_sync_outbox o LEFT JOIN sales_channels c ON c.code=o.channel_code LEFT JOIN channel_mappings m ON m.channel_id=c.id AND m.villa_id=o.villa_id AND m.active=true WHERE o.status='pending' AND o.next_attempt_at<=now() ORDER BY o.created_at LIMIT ${limit}`;
    const results=[];
    for(const item of rows){
      if(!item.external_property_id||!item.external_room_id){results.push({id:item.id,channel:item.channel_code,ok:false,skipped:true,error:'mapping_incomplete'});continue}
      const r=await dispatchToAdapter(item);
      if(r.skipped){results.push({id:item.id,channel:item.channel_code,...r});continue}
      if(r.ok){
        await sql`UPDATE channel_sync_outbox SET status='sent',attempts=attempts+1,last_error=NULL,sent_at=now(),updated_at=now() WHERE id=${item.id}`;
        await sql`INSERT INTO channel_sync_events(channel_id,villa_id,direction,event_type,status,external_id,message) VALUES(${item.channel_id},${item.villa_id},'outbound',${item.event_type},'sent',${String(item.id)},'Adapter accepted event')`;
      }else{
        const err=String(r.message||r.error||'adapter_failed').slice(0,900);
        await sql`UPDATE channel_sync_outbox SET status='failed',attempts=attempts+1,last_error=${err},next_attempt_at=now()+least(interval '60 minutes',interval '5 minutes'*(attempts+1)),updated_at=now() WHERE id=${item.id}`;
        await sql`INSERT INTO channel_sync_events(channel_id,villa_id,direction,event_type,status,external_id,message) VALUES(${item.channel_id},${item.villa_id},'outbound',${item.event_type},'failed',${String(item.id)},${err})`;
      }
      results.push({id:item.id,channel:item.channel_code,...r});
    }
    return sendJson(res,200,{ok:true,processed:results.filter(x=>!x.skipped).length,skipped:results.filter(x=>x.skipped).length,results});
  }catch(e){return sendJson(res,500,{error:'dispatch_failed',message:String(e?.message||e).slice(0,300)})}
}
