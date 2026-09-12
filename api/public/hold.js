import {body,cleanCode,cors,date,fail,nonnegInt,posInt,rpc,send} from './_lib.js';
export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method!=='POST')return send(res,405,{ok:false,error:'method_not_allowed'});
  try{
    const b=body(req),villa=cleanCode(b.villa_code),cin=date(b.check_in),cout=date(b.check_out),guests=posInt(b.guests,1),minutes=Math.min(20,Math.max(5,posInt(b.hold_minutes,10)));
    if(!villa||!cin||!cout||cout<=cin)return send(res,422,{ok:false,error:'invalid_request'});
    const data=await rpc('public_web_create_hold',{p_villa_code:villa,p_check_in:cin,p_check_out:cout,p_guests:guests,p_extra_adults:nonnegInt(b.extra_adults),p_children_6_12:nonnegInt(b.children_6_12),p_children_under_6:nonnegInt(b.children_under_6),p_channel:cleanCode(b.channel,'WEBSITE'),p_rate_plan:cleanCode(b.rate_plan,'BAR'),p_minutes:minutes});
    return send(res,data?.ok?201:409,data);
  }catch(e){return fail(res,e)}
}
