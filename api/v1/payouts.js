import {databaseConfigured,getSql} from '../_lib/db.js';
import {cleanChannel,handleOptions,method,parseBody,requireGatewayKey,sendJson,setCors,validDate} from '../_lib/http.js';
function n(v){const x=Number(v||0);return Number.isFinite(x)&&x>=0?x:0}
export default async function handler(req,res){
  if(handleOptions(req,res))return;setCors(req,res);
  if(!method(req,res,['POST']))return;if(!requireGatewayKey(req,res))return;
  if(!databaseConfigured())return sendJson(res,503,{error:'gateway_database_not_configured'});
  const b=parseBody(req),channel=cleanChannel(b.channel).toUpperCase(),ref=String(b.payout_reference||'').trim().slice(0,180),currency=String(b.currency||'VND').toUpperCase();
  if(!channel||!ref)return sendJson(res,422,{error:'channel_and_payout_reference_required'});
  if(currency!=='VND')return sendJson(res,422,{error:'currency_not_supported_yet'});
  const periodStart=b.period_start&&validDate(b.period_start)?b.period_start:null,periodEnd=b.period_end&&validDate(b.period_end)?b.period_end:null,paidAt=b.paid_at?new Date(b.paid_at):null;
  if(b.paid_at&&Number.isNaN(paidAt.getTime()))return sendJson(res,422,{error:'invalid_paid_at'});
  const lines=Array.isArray(b.lines)?b.lines:[];if(lines.length>1000)return sendJson(res,422,{error:'too_many_lines'});
  const sql=getSql();
  try{
    const c=await sql`SELECT code,channel_type FROM sales_channels WHERE code=${channel} AND active=true LIMIT 1`;if(!c.length||c[0].channel_type!=='ota')return sendJson(res,422,{error:'ota_channel_not_found'});
    const payout=await sql`INSERT INTO ota_payouts(channel_code,payout_reference,currency,period_start,period_end,gross_amount,commission_amount,fee_amount,tax_amount,net_amount,paid_at,status,note,updated_at) VALUES(${channel},${ref},${currency},${periodStart}::date,${periodEnd}::date,${n(b.gross_amount)},${n(b.commission_amount)},${n(b.fee_amount)},${n(b.tax_amount)},${n(b.net_amount)},${paidAt?paidAt.toISOString():null}::timestamptz,'imported',${String(b.note||'').slice(0,800)||null},now()) ON CONFLICT(channel_code,payout_reference) DO UPDATE SET period_start=excluded.period_start,period_end=excluded.period_end,gross_amount=excluded.gross_amount,commission_amount=excluded.commission_amount,fee_amount=excluded.fee_amount,tax_amount=excluded.tax_amount,net_amount=excluded.net_amount,paid_at=excluded.paid_at,note=excluded.note,updated_at=now() WHERE ota_payouts.status<>'reconciled' RETURNING id,status`;
    if(!payout.length)return sendJson(res,409,{error:'payout_already_reconciled'});const payoutId=payout[0].id;let matched=0,unmatched=0;
    for(const x of lines){const ext=String(x.external_reservation_id||'').trim().slice(0,180);if(!ext)continue;const link=await sql`SELECT booking_id FROM channel_reservations WHERE channel_code=${channel} AND external_reservation_id=${ext} LIMIT 1`;const bookingId=link[0]?.booking_id||null;if(bookingId)matched++;else unmatched++;await sql`INSERT INTO ota_payout_lines(payout_id,external_reservation_id,booking_id,gross_amount,commission_amount,fee_amount,tax_amount,net_amount,status,note,updated_at) VALUES(${payoutId},${ext},${bookingId},${n(x.gross_amount)},${n(x.commission_amount)},${n(x.fee_amount)},${n(x.tax_amount)},${n(x.net_amount)},${bookingId?'matched':'unmatched'},${String(x.note||'').slice(0,500)||null},now()) ON CONFLICT(payout_id,external_reservation_id) DO UPDATE SET booking_id=excluded.booking_id,gross_amount=excluded.gross_amount,commission_amount=excluded.commission_amount,fee_amount=excluded.fee_amount,tax_amount=excluded.tax_amount,net_amount=excluded.net_amount,status=excluded.status,note=excluded.note,updated_at=now()`}
    await sql`UPDATE ota_payouts SET status=${unmatched>0?'needs_attention':'ready'},updated_at=now() WHERE id=${payoutId}`;
    return sendJson(res,201,{ok:true,payout_id:payoutId,channel,payout_reference:ref,lines:lines.length,matched,unmatched,status:unmatched>0?'needs_attention':'ready'});
  }catch(e){return sendJson(res,500,{error:'payout_ingest_failed',message:String(e?.message||e).slice(0,300)})}
}
