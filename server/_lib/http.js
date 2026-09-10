import { timingSafeEqual } from 'node:crypto';

export function sendJson(res,status,body,extraHeaders={}){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  for(const [k,v] of Object.entries(extraHeaders)) res.setHeader(k,v);
  res.end(JSON.stringify(body));
}

export function method(req,res,allowed){
  if(allowed.includes(req.method)) return true;
  res.setHeader('Allow',allowed.join(', '));
  sendJson(res,405,{error:'method_not_allowed',allowed});
  return false;
}

export function parseBody(req){
  if(req.body==null) return {};
  if(typeof req.body==='object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw=Buffer.isBuffer(req.body)?req.body.toString('utf8'):String(req.body||'');
  if(!raw) return {};
  return JSON.parse(raw);
}

function constantEqual(a,b){
  const aa=Buffer.from(String(a||''));
  const bb=Buffer.from(String(b||''));
  if(aa.length!==bb.length) return false;
  return timingSafeEqual(aa,bb);
}

export function gatewayKeyConfigured(){return Boolean(process.env.ANSTAY_INTEGRATION_API_KEY)}
export function icalTokenConfigured(){return Boolean(process.env.ANSTAY_ICAL_TOKEN)}

export function requireGatewayKey(req,res){
  const expected=process.env.ANSTAY_INTEGRATION_API_KEY;
  if(!expected){
    sendJson(res,503,{error:'gateway_sealed',message:'ANSTAY Integration Gateway đã được triển khai nhưng chưa nạp API key phía server.'});
    return false;
  }
  const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const supplied=req.headers['x-anstay-key']||bearer;
  if(!constantEqual(supplied,expected)){
    sendJson(res,401,{error:'unauthorized'});
    return false;
  }
  return true;
}

export function requireIcalToken(req,res){
  const expected=process.env.ANSTAY_ICAL_TOKEN;
  if(!expected){
    sendJson(res,503,{error:'ical_sealed',message:'Cổng iCal đã có nhưng chưa nạp token phía server.'});
    return false;
  }
  const supplied=req.query?.token||req.headers['x-anstay-ical-token'];
  if(!constantEqual(supplied,expected)){
    sendJson(res,401,{error:'unauthorized'});
    return false;
  }
  return true;
}

export function setCors(req,res){
  const configured=String(process.env.ANSTAY_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  const origin=String(req.headers.origin||'');
  if(origin && configured.includes(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
  }
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-ANSTAY-Key, X-ANSTAY-Channel');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS');
}

export function handleOptions(req,res){
  if(req.method!=='OPTIONS') return false;
  setCors(req,res);
  res.statusCode=204;
  res.end();
  return true;
}

export function cleanChannel(value){
  return String(value||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'').slice(0,32);
}

export function cleanVillaCode(value){
  return String(value||'').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g,'').slice(0,24);
}

export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))}
