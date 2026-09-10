export function addDays(value,n){const d=new Date(String(value)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function dateSpanInclusive(from,to){return Math.floor((new Date(to+'T00:00:00Z')-new Date(from+'T00:00:00Z'))/86400000)+1}
export function normalizeChannel(value){return String(value||'WEBSITE').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g,'').slice(0,32)||'WEBSITE'}
export function normalizeRatePlan(value){return String(value||'BAR').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g,'').slice(0,32)||'BAR'}
function channelRate(base,pct,flat){if(base==null)return null;return Math.max(0,Math.round(Number(base)*(1+Number(pct||0)/100)+Number(flat||0)))}
export async function resolvePricing(sql,{villaCode,from,to,channelCode='WEBSITE',ratePlanCode='BAR'}){
  const villas=await sql`SELECT v.id,v.code,v.name,p.max_guests,p.standard_guests,p.check_in_time::text AS check_in_time,p.check_out_time::text AS check_out_time,p.same_day_booking FROM villas v LEFT JOIN villa_booking_policies p ON p.villa_id=v.id WHERE v.code=${villaCode} AND v.active=true LIMIT 1`;
  if(!villas.length)return {error:'villa_not_found'};
  const channels=await sql`SELECT id,code,name,channel_type,currency FROM sales_channels WHERE code=${channelCode} AND active=true LIMIT 1`;
  if(!channels.length)return {error:'channel_not_found'};
  const plans=await sql`SELECT id,code,name,currency,default_min_stay FROM rate_plans WHERE code=${ratePlanCode} AND active=true LIMIT 1`;
  if(!plans.length)return {error:'rate_plan_not_found'};
  const villa=villas[0],channel=channels[0],plan=plans[0];
  const maps=await sql`SELECT id,rate_adjustment_pct,rate_adjustment_flat,external_property_id,external_room_id,external_rate_plan_id FROM channel_mappings WHERE channel_id=${channel.id} AND villa_id=${villa.id} AND rate_plan_id=${plan.id} AND active=true LIMIT 1`;
  if(!maps.length)return {error:'channel_mapping_not_configured',villa,channel,plan};
  const mapping=maps[0];
  const [bookings,blocks,holds,rates]=await Promise.all([
    sql`SELECT check_in_date::text AS check_in,check_out_date::text AS check_out FROM bookings WHERE villa_id=${villa.id} AND status IN ('confirmed','staying') AND check_in_date <= ${to}::date AND check_out_date > ${from}::date`,
    sql`SELECT start_date::text AS start_date,end_date::text AS end_date,block_type,source,note FROM availability_blocks WHERE villa_id=${villa.id} AND active=true AND start_date <= ${to}::date AND end_date >= ${from}::date`,
    sql`SELECT check_in_date::text AS check_in,check_out_date::text AS check_out,expires_at FROM booking_holds WHERE villa_id=${villa.id} AND status='active' AND expires_at>now() AND check_in_date <= ${to}::date AND check_out_date > ${from}::date`,
    sql`SELECT stay_date::text AS stay_date,base_rate,min_stay,stop_sell,closed_to_arrival,closed_to_departure,published FROM rate_calendar WHERE villa_id=${villa.id} AND rate_plan_id=${plan.id} AND stay_date BETWEEN ${from}::date AND ${to}::date ORDER BY stay_date`
  ]);
  const rateMap=new Map(rates.map(r=>[r.stay_date,r]));
  const span=dateSpanInclusive(from,to),inventory=[];
  for(let i=0;i<span;i++){
    const date=addDays(from,i),r=rateMap.get(date),bookingBlocked=bookings.some(b=>date>=b.check_in&&date<b.check_out),manualBlock=blocks.find(b=>date>=b.start_date&&date<=b.end_date),holdBlocked=holds.some(h=>date>=h.check_in&&date<h.check_out),blocked=bookingBlocked||!!manualBlock||holdBlocked,published=!!r?.published,stopSell=!!r?.stop_sell,rate=published?channelRate(r?.base_rate,mapping.rate_adjustment_pct,mapping.rate_adjustment_flat):null,sellableRate=rate!=null&&rate>0;
    inventory.push({date,units_available:blocked?0:1,blocked_by_booking:bookingBlocked,blocked_by_hold:holdBlocked,blocked_by_control:!!manualBlock,block_type:manualBlock?.block_type||null,block_note:manualBlock?.note||null,stop_sell:stopSell,published,closed_to_arrival:!!r?.closed_to_arrival,closed_to_departure:!!r?.closed_to_departure,min_stay:Number(r?.min_stay||plan.default_min_stay||1),base_rate:r?.base_rate==null?null:Number(r.base_rate),rate:sellableRate?rate:null,currency:plan.currency||channel.currency||'VND',sellable:!blocked&&!stopSell&&published&&sellableRate});
  }
  const priced=inventory.filter(x=>x.rate!=null).length;
  return {villa,channel,plan,mapping,pricing_status:priced===inventory.length?'complete':priced?'partial':'missing',inventory};
}
