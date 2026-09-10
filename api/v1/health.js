import { gatewayKeyConfigured, icalTokenConfigured, sendJson } from '../_lib/http.js';
import { databaseConfigured } from '../_lib/db.js';

export default function handler(req,res){
  if(req.method!=='GET') return sendJson(res,405,{error:'method_not_allowed'});
  sendJson(res,200,{
    service:'ANSTAY Integration Gateway',
    version:'0.7.0',
    status:'ready',
    api_version:'v1',
    server_time:new Date().toISOString(),
    configuration:{
      api_key:gatewayKeyConfigured()?'configured':'sealed',
      server_database:databaseConfigured()?'configured':'sealed',
      ical_token:icalTokenConfigured()?'configured':'sealed'
    },
    ports:{
      catalog:'/api/v1/catalog',
      availability:'/api/v1/availability',
      ari:'/api/v1/ari',
      reservations:'/api/v1/reservations',
      cancellations:'/api/v1/cancellations',
      webhook:'/api/v1/webhook',
      ical:'/api/v1/ical',
      openapi:'/api/openapi.json'
    }
  },{'Access-Control-Allow-Origin':'*'});
}
