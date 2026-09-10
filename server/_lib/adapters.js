const DEFINITIONS={
  BOOKING_COM:{name:'Booking.com',urlEnv:'ANSTAY_BOOKING_COM_ADAPTER_URL',tokenEnv:'ANSTAY_BOOKING_COM_TOKEN'},
  AGODA:{name:'Agoda',urlEnv:'ANSTAY_AGODA_ADAPTER_URL',tokenEnv:'ANSTAY_AGODA_TOKEN'},
  AIRBNB:{name:'Airbnb',urlEnv:'ANSTAY_AIRBNB_ADAPTER_URL',tokenEnv:'ANSTAY_AIRBNB_TOKEN'},
  TRAVELOKA:{name:'Traveloka',urlEnv:'ANSTAY_TRAVELOKA_ADAPTER_URL',tokenEnv:'ANSTAY_TRAVELOKA_TOKEN'}
};

function def(code){return DEFINITIONS[String(code||'').trim().toUpperCase()]||null}
export function adapterReadiness(code){
  const c=String(code||'').trim().toUpperCase(),d=def(c);
  if(!d)return {channel:c,supported:false,configured:false,name:c};
  const endpoint=String(process.env[d.urlEnv]||'').trim(),token=String(process.env[d.tokenEnv]||'').trim();
  return {channel:c,name:d.name,supported:true,configured:Boolean(endpoint&&token),endpointConfigured:Boolean(endpoint),credentialConfigured:Boolean(token),capabilities:['availability','rates','restrictions','reservations','cancellations','payouts']};
}
export function adapterCatalog(){return Object.keys(DEFINITIONS).map(adapterReadiness)}

export async function dispatchToAdapter(item){
  const c=String(item.channel_code||'').toUpperCase(),d=def(c),ready=adapterReadiness(c);
  if(!d)return {ok:false,skipped:true,error:'adapter_not_supported'};
  if(!ready.configured)return {ok:false,skipped:true,error:'adapter_not_configured'};
  const endpoint=String(process.env[d.urlEnv]).trim(),token=String(process.env[d.tokenEnv]).trim();
  const payload={
    event_id:`anstay-outbox-${item.id}`,
    event_type:item.event_type,
    channel:c,
    mapping:{property_id:item.external_property_id||null,room_id:item.external_room_id||null,rate_plan_id:item.external_rate_plan_id||null},
    data:item.payload||{}
  };
  let response;
  try{
    response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'X-ANSTAY-Channel':c,'X-ANSTAY-Event':String(item.event_type||''),'X-ANSTAY-Idempotency-Key':String(item.id)},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
  }catch(e){return {ok:false,error:'adapter_network_error',message:String(e?.message||e).slice(0,300)}}
  const text=(await response.text()).slice(0,2000);let body=text;try{body=text?JSON.parse(text):null}catch{}
  if(!response.ok)return {ok:false,error:'adapter_http_error',status:response.status,message:typeof body==='string'?body.slice(0,300):JSON.stringify(body).slice(0,300)};
  return {ok:true,status:response.status,response:body};
}
