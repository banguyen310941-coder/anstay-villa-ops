import adapters from '../../server/v1/adapters.js';
import ari from '../../server/v1/ari.js';
import availability from '../../server/v1/availability.js';
import cancellations from '../../server/v1/cancellations.js';
import catalog from '../../server/v1/catalog.js';
import dispatch from '../../server/v1/dispatch.js';
import health from '../../server/v1/health.js';
import hold from '../../server/v1/hold.js';
import ical from '../../server/v1/ical.js';
import outbox from '../../server/v1/outbox.js';
import payouts from '../../server/v1/payouts.js';
import quote from '../../server/v1/quote.js';
import reservations from '../../server/v1/reservations.js';
import search from '../../server/v1/search.js';
import webhook from '../../server/v1/webhook.js';

const ROUTES={adapters,ari,availability,cancellations,catalog,dispatch,health,hold,ical,outbox,payouts,quote,reservations,search,webhook};

function send404(res,path){
  res.statusCode=404;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify({error:'route_not_found',path,available:Object.keys(ROUTES)}));
}

export default async function gatewayRouter(req,res){
  const raw=req.query?.path;
  const path=(Array.isArray(raw)?raw.join('/'):String(raw||''))
    .replace(/^\/+|\/+$/g,'');
  const [route]=path.split('/');
  const fn=ROUTES[route];
  if(!fn)return send404(res,path);
  return fn(req,res);
}
