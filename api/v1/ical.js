import { cleanVillaCode, method, requireIcalToken, sendJson } from '../_lib/http.js';
import { databaseConfigured, getSql } from '../_lib/db.js';
function esc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n')}
function d(s){return String(s).replaceAll('-','')}
export default async function handler(req,res){
  if(!method(req,res,['GET']))return;if(!requireIcalToken(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const villaCode=cleanVillaCode(req.query?.villa); if(!villaCode)return sendJson(res,422,{error:'villa_required'});
  try{
    const sql=getSql(),villa=await sql`SELECT id,code,name FROM villas WHERE code=${villaCode} AND active=true LIMIT 1`;
    if(!villa.length)return sendJson(res,404,{error:'villa_not_found'});
    const rows=await sql`SELECT booking_code,check_in_date::text AS check_in,check_out_date::text AS check_out,status FROM bookings WHERE villa_id=${villa[0].id} AND status IN ('confirmed','staying') AND check_out_date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY check_in_date`;
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ANSTAY//Villa Ops//VI','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${esc('ANSTAY '+villa[0].name)}`];
    for(const b of rows){lines.push('BEGIN:VEVENT',`UID:${esc(b.booking_code)}@anstay`,`DTSTART;VALUE=DATE:${d(b.check_in)}`,`DTEND;VALUE=DATE:${d(b.check_out)}`,`SUMMARY:${esc('Reserved - ANSTAY '+villa[0].name)}`,`DESCRIPTION:${esc('ANSTAY booking block '+b.booking_code)}`,'END:VEVENT')}
    lines.push('END:VCALENDAR');
    res.statusCode=200;res.setHeader('Content-Type','text/calendar; charset=utf-8');res.setHeader('Cache-Control','private, max-age=120');res.end(lines.join('\r\n'));
  }catch(e){sendJson(res,500,{error:'integration_error',message:String(e.message||e).slice(0,200)})}
}
