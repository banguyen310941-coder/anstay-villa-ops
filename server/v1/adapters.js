import {adapterCatalog} from '../_lib/adapters.js';
import {handleOptions,method,requireGatewayKey,sendJson,setCors} from '../_lib/http.js';
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['GET']))return;if(!requireGatewayKey(req,res))return;
  return sendJson(res,200,{adapters:adapterCatalog()});
}
