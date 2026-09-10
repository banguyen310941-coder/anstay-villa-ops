import { createHash } from 'node:crypto';
import { cleanChannel, cleanVillaCode, validDate } from './http.js';
import { getSql } from './db.js';

export function externalBookingCode(channel,externalId){
  const c=cleanChannel(channel).toUpperCase()||'EXT';
  const raw=String(externalId||'').trim();
  const readable=raw.toUpperCase().replace(/[^A-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30)||'RES';
  const hash=createHash('sha256').update(`${c.toLowerCase()}:${raw}`).digest('hex').slice(0,10).toUpperCase();
  return `EXT-${c}-${readable}-${hash}`;
}

export function validateReservation(payload){
  const channel=cleanChannel(payload.channel);
  const externalId=String(payload.external_reservation_id||'').trim();
  const villaCode=cleanVillaCode(payload.villa_code);
  const checkIn=String(payload.check_in||'');
  const checkOut=String(payload.check_out||'');
  const guest=payload.guest||{};
  if(!channel) throw new Error('channel_required');
  if(!externalId) throw new Error('external_reservation_id_required');
  if(!villaCode) throw new Error('villa_code_required');
  if(!validDate(checkIn)||!validDate(checkOut)||checkOut<=checkIn) throw new Error('invalid_stay_dates');
  if(!String(guest.name||'').trim()) throw new Error('guest_name_required');
  const currency=String(payload.currency||'VND').toUpperCase();
  if(currency!=='VND') throw new Error('currency_not_supported_yet');
  return {channel,externalId,villaCode,checkIn,checkOut,guest,currency};
}

function num(v){const n=Number(v||0); return Number.isFinite(n)&&n>=0?n:0}
function int(v,d=1){const n=Math.trunc(Number(v)); return Number.isFinite(n)&&n>0?n:d}
async function linkReservation(sql,channel,externalId,bookingId,status,payload){
  const code=String(channel||'').toUpperCase();
  await sql`INSERT INTO channel_reservations(channel_code,external_reservation_id,booking_id,external_status,last_payload,last_seen_at) VALUES(${code},${externalId},${bookingId},${String(status||'').slice(0,80)||null},${JSON.stringify(payload||{})}::jsonb,now()) ON CONFLICT(channel_code,external_reservation_id) DO UPDATE SET booking_id=excluded.booking_id,external_status=excluded.external_status,last_payload=excluded.last_payload,last_seen_at=now()`;
}

export async function createReservation(payload){
  const v=validateReservation(payload),sql=getSql(),bookingCode=externalBookingCode(v.channel,v.externalId),guests=int(payload.guests,1),holdToken=String(payload.hold_token||'').trim();
  const existing=await sql`SELECT id, booking_code, status, villa_id, check_in_date, check_out_date FROM bookings WHERE booking_code=${bookingCode} LIMIT 1`;
  if(existing.length){await linkReservation(sql,v.channel,v.externalId,existing[0].id,existing[0].status,payload);return {action:'existing',booking:existing[0],booking_code:bookingCode}}
  const villa=await sql`SELECT v.id,v.code,v.name,p.max_guests FROM villas v LEFT JOIN villa_booking_policies p ON p.villa_id=v.id WHERE v.code=${v.villaCode} AND v.active=true LIMIT 1`;
  if(!villa.length) throw new Error('villa_not_found');
  if(villa[0].max_guests&&guests>Number(villa[0].max_guests))throw new Error('capacity_exceeded');
  const blocks=await sql`SELECT id FROM availability_blocks WHERE villa_id=${villa[0].id} AND active=true AND start_date < ${v.checkOut}::date AND end_date >= ${v.checkIn}::date LIMIT 1`;
  if(blocks.length)throw new Error('availability_blocked');
  let hold=null;
  if(holdToken){
    const holds=await sql`SELECT id,hold_token,villa_id,check_in_date::text AS check_in,check_out_date::text AS check_out,status,expires_at FROM booking_holds WHERE hold_token=${holdToken} LIMIT 1`;
    if(!holds.length)throw new Error('hold_not_found');hold=holds[0];
    if(hold.status!=='active'||new Date(hold.expires_at)<=new Date())throw new Error('hold_expired');
    if(Number(hold.villa_id)!==Number(villa[0].id)||hold.check_in!==v.checkIn||hold.check_out!==v.checkOut)throw new Error('hold_mismatch');
  }
  const source=String(payload.source||v.channel).slice(0,80),note=`External channel=${v.channel}; external_reservation_id=${v.externalId}${holdToken?`; hold_token=${holdToken}`:''}`;
  const rows=await sql`WITH new_customer AS (INSERT INTO customers (full_name,phone,email,nationality,marketing_consent) VALUES (${String(v.guest.name).trim().slice(0,180)},${String(v.guest.phone||'').trim()||null},${String(v.guest.email||'').trim()||null},${String(v.guest.nationality||'').trim()||null},false) RETURNING id) INSERT INTO bookings (booking_code,villa_id,customer_id,source,check_in_date,check_out_date,guests,status,room_revenue,other_revenue,discount_amount,refund_amount,ota_commission,tax_fee,amount_received,invoice_status,notes,gross_room_price,recognized_revenue) SELECT ${bookingCode},${villa[0].id},id,${source},${v.checkIn}::date,${v.checkOut}::date,${guests},'confirmed',${num(payload.room_revenue)},${num(payload.other_revenue)},${num(payload.discount_amount)},${num(payload.refund_amount)},${num(payload.ota_commission)},${num(payload.tax_fee)},${num(payload.amount_received)},'undetermined',${note},${num(payload.gross_room_price||payload.room_revenue)},${num(payload.recognized_revenue||payload.room_revenue)} FROM new_customer RETURNING id,booking_code,status,villa_id,check_in_date,check_out_date,room_revenue,other_revenue,ota_commission,amount_received`;
  await linkReservation(sql,v.channel,v.externalId,rows[0].id,rows[0].status,payload);
  if(hold)await sql`UPDATE booking_holds SET status='converted',converted_at=now() WHERE id=${hold.id} AND status='active'`;
  return {action:'created',booking:rows[0],booking_code:bookingCode,hold_converted:Boolean(hold)};
}

export async function updateReservation(payload){
  const v=validateReservation(payload),sql=getSql(),bookingCode=externalBookingCode(v.channel,v.externalId),guests=int(payload.guests,1);
  const villa=await sql`SELECT v.id,p.max_guests FROM villas v LEFT JOIN villa_booking_policies p ON p.villa_id=v.id WHERE v.code=${v.villaCode} AND v.active=true LIMIT 1`;
  if(!villa.length) throw new Error('villa_not_found');
  if(villa[0].max_guests&&guests>Number(villa[0].max_guests))throw new Error('capacity_exceeded');
  const blocks=await sql`SELECT id FROM availability_blocks WHERE villa_id=${villa[0].id} AND active=true AND start_date < ${v.checkOut}::date AND end_date >= ${v.checkIn}::date LIMIT 1`;
  if(blocks.length)throw new Error('availability_blocked');
  const rows=await sql`UPDATE bookings SET villa_id=${villa[0].id},check_in_date=${v.checkIn}::date,check_out_date=${v.checkOut}::date,guests=${guests},room_revenue=${num(payload.room_revenue)},other_revenue=${num(payload.other_revenue)},discount_amount=${num(payload.discount_amount)},refund_amount=${num(payload.refund_amount)},ota_commission=${num(payload.ota_commission)},tax_fee=${num(payload.tax_fee)},amount_received=${num(payload.amount_received)},gross_room_price=${num(payload.gross_room_price||payload.room_revenue)},recognized_revenue=${num(payload.recognized_revenue||payload.room_revenue)},source=${String(payload.source||v.channel).slice(0,80)} WHERE booking_code=${bookingCode} RETURNING id,booking_code,status,villa_id,check_in_date,check_out_date`;
  if(!rows.length) throw new Error('reservation_not_found');
  await linkReservation(sql,v.channel,v.externalId,rows[0].id,rows[0].status,payload);
  return {action:'updated',booking:rows[0],booking_code:bookingCode};
}

export async function cancelReservation(payload){
  const channel=cleanChannel(payload.channel),externalId=String(payload.external_reservation_id||'').trim();
  if(!channel) throw new Error('channel_required');if(!externalId) throw new Error('external_reservation_id_required');
  const sql=getSql(),bookingCode=externalBookingCode(channel,externalId),reason=String(payload.reason||'External cancellation').slice(0,500);
  const rows=await sql`UPDATE bookings SET status='cancelled', notes=concat_ws(E'\n',notes,${`Cancelled by ${channel}: ${reason}`}) WHERE booking_code=${bookingCode} RETURNING id,booking_code,status,villa_id,check_in_date,check_out_date`;
  if(!rows.length) throw new Error('reservation_not_found');
  await linkReservation(sql,channel,externalId,rows[0].id,'cancelled',payload);
  return {action:'cancelled',booking:rows[0],booking_code:bookingCode};
}

export function mapReservationError(error){
  const msg=String(error?.message||error||'');
  if(msg.includes('BOOKING_OVERLAP')) return {status:409,code:'booking_overlap',message:'Villa đã có booking xác nhận trong khoảng ngày này.'};
  if(msg.includes('MONTH_LOCKED')||msg.toLowerCase().includes('closed month')) return {status:409,code:'month_locked',message:'Tháng này đã khóa sổ.'};
  const bad=new Set(['channel_required','external_reservation_id_required','villa_code_required','invalid_stay_dates','guest_name_required','currency_not_supported_yet','hold_mismatch']);
  if(bad.has(msg)) return {status:422,code:msg,message:msg};
  if(msg==='villa_not_found'||msg==='reservation_not_found'||msg==='hold_not_found') return {status:404,code:msg,message:msg};
  if(['capacity_exceeded','availability_blocked','hold_expired'].includes(msg))return {status:409,code:msg,message:msg};
  if(msg==='gateway_database_not_configured') return {status:503,code:msg,message:'Gateway chưa được nạp DATABASE_URL phía server.'};
  return {status:500,code:'integration_error',message:'Không xử lý được yêu cầu tích hợp.',detail:msg.slice(0,220)};
}
