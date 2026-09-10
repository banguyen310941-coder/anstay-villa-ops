import {cleanCode,date,fail,posInt,rpc,send} from './_lib.js';
export default async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
  const cin=date(req.query?.check_in),cout=date(req.query?.check_out),guests=posInt(req.query?.guests,1),channel=cleanCode(req.query?.channel,'WEBSITE'),ratePlan=cleanCode(req.query?.rate_plan,'BAR');
  if(!cin||!cout||cout<=cin)return send(res,422,{ok:false,error:'invalid_dates'});
  try{return send(res,200,await rpc('public_web_search',{p_check_in:cin,p_check_out:cout,p_guests:guests,p_channel:channel,p_rate_plan:ratePlan}))}catch(e){return fail(res,e)}
}
