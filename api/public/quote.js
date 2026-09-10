import {cleanCode,date,fail,nonnegInt,posInt,rpc,send} from './_lib.js';
export default async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
  const villa=cleanCode(req.query?.villa),cin=date(req.query?.check_in),cout=date(req.query?.check_out),guests=posInt(req.query?.guests,1),extraAdults=nonnegInt(req.query?.extra_adults),children612=nonnegInt(req.query?.children_6_12),childrenUnder6=nonnegInt(req.query?.children_under_6),channel=cleanCode(req.query?.channel,'WEBSITE'),ratePlan=cleanCode(req.query?.rate_plan,'BAR');
  if(!villa||!cin||!cout||cout<=cin)return send(res,422,{ok:false,error:'invalid_request'});
  try{return send(res,200,await rpc('public_web_quote',{p_villa_code:villa,p_check_in:cin,p_check_out:cout,p_guests:guests,p_extra_adults:extraAdults,p_children_6_12:children612,p_children_under_6:childrenUnder6,p_channel:channel,p_rate_plan:ratePlan}))}catch(e){return fail(res,e)}
}
