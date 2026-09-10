import { gatewayKeyConfigured, icalTokenConfigured, sendJson } from '../_lib/http.js';
import { databaseConfigured } from '../_lib/db.js';

export default function handler(req,res){
  if(req.method!=='GET') return sendJson(res,405,{error:'method_not_allowed'});
  sendJson(res,200,{
    service:'ANSTAY Integration Gateway',
    version:'1.4.0',
    status:'ready',
    api_version:'v1',
    server_time:new Date().toISOString(),
    configuration:{
      api_key:gatewayKeyConfigured()?'configured':'sealed',
      server_database:databaseConfigured()?'configured':'sealed',
      ical_token:icalTokenConfigured()?'configured':'sealed'
    },
    pricing:{engine:'rate_calendar',published_only:true,zero_rate_sellable:false},
    availability:{owner_blocks:true,maintenance_blocks:true,temporary_holds:true,capacity_policy:true},
    website_booking:{public_request_flow:true,manual_confirmation:true,automatic_payment_provider:false},
    outbound_sync:{outbox:true,adapter_delivery:'sealed_until_credentials'},
    ports:{
      catalog:'/api/v1/catalog',availability:'/api/v1/availability',ari:'/api/v1/ari',search:'/api/v1/search',quote:'/api/v1/quote',hold:'/api/v1/hold',reservations:'/api/v1/reservations',cancellations:'/api/v1/cancellations',webhook:'/api/v1/webhook',outbox:'/api/v1/outbox',ical:'/api/v1/ical',openapi:'/api/openapi.json'
    }
  },{'Access-Control-Allow-Origin':'*'});
}
