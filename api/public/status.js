import {cleanText,fail,rpc,send} from './_lib.js';
export default async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
  const code=cleanText(req.query?.code,80).toUpperCase(),email=cleanText(req.query?.email,220).toLowerCase();
  if(!code||!email.includes('@'))return send(res,422,{ok:false,error:'invalid_request'});
  try{const data=await rpc('public_web_request_status',{p_request_code:code,p_guest_email:email});return send(res,data?.ok?200:404,data)}catch(e){return fail(res,e)}
}
