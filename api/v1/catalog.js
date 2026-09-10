import { handleOptions, method, requireGatewayKey, sendJson, setCors } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return; setCors(req,res);
  if(!method(req,res,['GET']))return;
  if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  try{const sql=getSql();const rows=await sql`SELECT code,name FROM villas WHERE active=true ORDER BY id`;sendJson(res,200,{data:rows});}
  catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
