import { cleanChannel, handleOptions, method, parseBody, requireGatewayKey, sendJson, setCors } from '../_lib/http.js';
import { databaseConfigured } from '../_lib/db.js';
import { cancelReservation, createReservation, mapReservationError, updateReservation } from '../_lib/reservations.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['POST']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  try{
    const body=parseBody(req),event=String(body.type||body.event||'').toLowerCase(),channel=cleanChannel(body.channel||req.headers['x-anstay-channel']),payload={...(body.reservation||body.data||{}),channel};
    if(!channel)return sendJson(res,422,{error:'channel_required'});
    let result;
    if(['reservation.created','booking.created','reservation.new'].includes(event))result=await createReservation(payload);
    else if(['reservation.updated','booking.updated'].includes(event))result=await updateReservation(payload);
    else if(['reservation.cancelled','reservation.canceled','booking.cancelled','booking.canceled'].includes(event))result=await cancelReservation(payload);
    else return sendJson(res,422,{error:'unsupported_event',supported:['reservation.created','reservation.updated','reservation.cancelled']});
    sendJson(res,200,{event_id:body.event_id||body.id||null,event,channel,result});
  }catch(e){const x=mapReservationError(e);sendJson(res,x.status,{error:x.code,message:x.message,...(x.detail?{detail:x.detail}:{})});}
}
