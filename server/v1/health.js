import {adapterCatalog} from '../_lib/adapters.js';
import {gatewayKeyConfigured,icalTokenConfigured,sendJson} from '../_lib/http.js';
import {databaseConfigured} from '../_lib/db.js';

export default function handler(req,res){
  if(req.method!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  const adapters=adapterCatalog(),configuredAdapters=adapters.filter(x=>x.configured).length;
  sendJson(res,200,{
    service:'ANSTAY Integration Gateway',version:'1.6.1',status:'ready',api_version:'v1',server_time:new Date().toISOString(),
    configuration:{api_key:gatewayKeyConfigured()?'configured':'sealed',server_database:databaseConfigured()?'configured':'sealed',ical_token:icalTokenConfigured()?'configured':'sealed',ota_adapters:`${configuredAdapters}/${adapters.length} configured`},
    pricing:{engine:'rate_calendar',published_only:true,zero_rate_sellable:false},
    availability:{owner_blocks:true,maintenance_blocks:true,temporary_holds:true,capacity_policy:true},
    website_booking:{public_request_flow:true,deposit_policy:true,automatic_payment_provider:false},
    inbound_sync:{idempotent_webhook:true,event_inbox:true,reservation_identity_mapping:true},
    outbound_sync:{outbox:true,dispatcher:true,adapter_delivery:configuredAdapters?'partially_configured':'sealed_until_credentials'},
    ota_finance:{payout_ingestion:true,booking_line_matching:true,reconciliation_to_booking_payments:true},
    ports:{catalog:'/api/v1/catalog',availability:'/api/v1/availability',ari:'/api/v1/ari',search:'/api/v1/search',quote:'/api/v1/quote',hold:'/api/v1/hold',reservations:'/api/v1/reservations',cancellations:'/api/v1/cancellations',webhook:'/api/v1/webhook',outbox:'/api/v1/outbox',adapters:'/api/v1/adapters',dispatch:'/api/v1/dispatch',payouts:'/api/v1/payouts',ical:'/api/v1/ical',openapi:'/api/openapi.json'}
  },{'Access-Control-Allow-Origin':'*'});
}
