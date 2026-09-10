import {body,cleanText,fail,rpc,send} from './_lib.js';
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{ok:false,error:'method_not_allowed'});
  try{
    const b=body(req),hold=cleanText(b.hold_token,100),name=cleanText(b.guest_name,180),email=cleanText(b.guest_email,220).toLowerCase(),phone=cleanText(b.guest_phone,80),note=cleanText(b.guest_note,800);
    if(!hold||!name||!email.includes('@'))return send(res,422,{ok:false,error:'guest_or_hold_invalid'});
    const data=await rpc('public_web_create_request',{p_hold_token:hold,p_guest_name:name,p_guest_email:email,p_guest_phone:phone||null,p_guest_note:note||null});
    return send(res,data?.ok?201:409,data);
  }catch(e){return fail(res,e)}
}
