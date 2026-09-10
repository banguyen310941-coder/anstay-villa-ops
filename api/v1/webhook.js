import {createHash} from 'node:crypto';
import {cleanChannel,handleOptions,method,parseBody,requireGatewayKey,sendJson,setCors} from '../_lib/http.js';
import {databaseConfigured,getSql} from '../_lib/db.js';
import {cancelReservation,createReservation,mapReservationError,updateReservation} from '../_lib/reservations.js';

function eventKey(body){
  const given=String(body.event_id||body.id||'').trim();
  if(given)return given.slice(0,180);
  return 'hash-'+createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0,40);
}

export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['POST']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const body=parseBody(req),event=String(body.type||body.event||'').toLowerCase(),channel=cleanChannel(body.channel||req.headers['x-anstay-channel']),externalEventId=eventKey(body),payload={...(body.reservation||body.data||{}),channel};
  if(!channel)return sendJson(res,422,{error:'channel_required'});
  const dbChannel=channel.toUpperCase(),sql=getSql();let inboxId=null;
  try{
    const inserted=await sql`INSERT INTO channel_inbox_events(channel_code,external_event_id,event_type,payload,status) VALUES(${dbChannel},${externalEventId},${event||'unknown'},${JSON.stringify(body)}::jsonb,'received') ON CONFLICT(channel_code,external_event_id) DO NOTHING RETURNING id`;
    if(inserted.length)inboxId=inserted[0].id;
    else{
      const prev=await sql`SELECT id,status,result,last_error FROM channel_inbox_events WHERE channel_code=${dbChannel} AND external_event_id=${externalEventId} LIMIT 1`;
      if(prev[0]?.status==='processed'||prev[0]?.status==='ignored')return sendJson(res,200,{ok:true,duplicate:true,event_id:externalEventId,event,channel,result:prev[0].result||null});
      inboxId=prev[0]?.id||null;
      if(inboxId)await sql`UPDATE channel_inbox_events SET status='received',last_error=NULL WHERE id=${inboxId}`;
    }
    let result;
    if(['reservation.created','booking.created','reservation.new'].includes(event))result=await createReservation(payload);
    else if(['reservation.updated','booking.updated'].includes(event))result=await updateReservation(payload);
    else if(['reservation.cancelled','reservation.canceled','booking.cancelled','booking.canceled'].includes(event))result=await cancelReservation(payload);
    else{
      if(inboxId)await sql`UPDATE channel_inbox_events SET status='ignored',result=${JSON.stringify({unsupported_event:event})}::jsonb,processed_at=now() WHERE id=${inboxId}`;
      return sendJson(res,422,{error:'unsupported_event',event_id:externalEventId,supported:['reservation.created','reservation.updated','reservation.cancelled']});
    }
    if(inboxId)await sql`UPDATE channel_inbox_events SET status='processed',result=${JSON.stringify(result)}::jsonb,processed_at=now() WHERE id=${inboxId}`;
    const booking=result?.booking||{};
    await sql`INSERT INTO channel_sync_events(channel_id,villa_id,direction,event_type,status,external_id,message) SELECT c.id,${booking.villa_id||null},'inbound',${event},'processed',${externalEventId},${String(result?.action||'processed')} FROM sales_channels c WHERE c.code=${dbChannel} LIMIT 1`;
    return sendJson(res,200,{ok:true,event_id:externalEventId,event,channel,result});
  }catch(e){
    const msg=String(e?.message||e).slice(0,900);
    if(inboxId)try{await sql`UPDATE channel_inbox_events SET status='failed',last_error=${msg},processed_at=now() WHERE id=${inboxId}`}catch{}
    const x=mapReservationError(e);return sendJson(res,x.status,{error:x.code,message:x.message,event_id:externalEventId,...(x.detail?{detail:x.detail}:{})});
  }
}
