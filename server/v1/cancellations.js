import { handleOptions, method, parseBody, requireGatewayKey, sendJson, setCors } from '../_lib/http.js';
import { databaseConfigured } from '../_lib/db.js';
import { cancelReservation, mapReservationError } from '../_lib/reservations.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['POST']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  try{sendJson(res,200,await cancelReservation(parseBody(req)));}
  catch(e){const x=mapReservationError(e);sendJson(res,x.status,{error:x.code,message:x.message,...(x.detail?{detail:x.detail}:{})});}
}
