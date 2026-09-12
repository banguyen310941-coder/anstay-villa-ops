import React, { FormEvent, useMemo, useState } from 'react';
import './HoiAnVillaBooking.css';

const API_BASE = 'https://anstay-booking-engine.vercel.app/api';

type SearchResult = {
  villa_code: string;
  villa_name: string;
  sellable: boolean;
  room_amount?: number;
  total_amount?: number;
  currency?: string;
  nights?: number;
  max_guests?: number;
  reason?: string;
  message?: string;
};

type SearchPayload = {
  ok: boolean;
  check_in: string;
  check_out: string;
  guests: number;
  sellable_count: number;
  results: SearchResult[];
};

type HoldPayload = {
  ok?: boolean;
  hold_token?: string;
  expires_at?: string;
  message?: string;
  [key: string]: unknown;
};

type RequestPayload = {
  ok?: boolean;
  request_code?: string;
  message?: string;
  [key: string]: unknown;
};

const money = (value?: number, currency = 'VND') =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Không thể kết nối hệ thống đặt phòng.');
  }
  return data as T;
}

export default function HoiAnVillaBooking() {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const dayAfter = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }, []);

  const [checkIn, setCheckIn] = useState(tomorrow);
  const [checkOut, setCheckOut] = useState(dayAfter);
  const [guests, setGuests] = useState(2);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [successCode, setSuccessCode] = useState('');

  async function search(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    setSuccessCode('');
    setSelected(null);

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        check_in: checkIn,
        check_out: checkOut,
        guests: String(guests),
        channel: 'WEBSITE',
        rate_plan: 'BAR',
      });
      const data = await api<SearchPayload>(`/search?${qs.toString()}`);
      setResults(data.results || []);
      if (!data.sellable_count) {
        setError('Hiện chưa có villa phù hợp trong khoảng ngày này.');
      }
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'Không thể kiểm tra phòng trống.');
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setError('');
    setSuccessCode('');

    if (!guestName.trim() || !guestEmail.includes('@')) {
      setError('Vui lòng nhập họ tên và email hợp lệ.');
      return;
    }

    setBooking(true);
    try {
      const hold = await api<HoldPayload>('/hold', {
        method: 'POST',
        body: JSON.stringify({
          villa_code: selected.villa_code,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          channel: 'WEBSITE',
          rate_plan: 'BAR',
          hold_minutes: 10,
        }),
      });

      const holdToken = String(hold.hold_token || '');
      if (!hold.ok || !holdToken) {
        throw new Error(String(hold.message || 'Không thể giữ phòng. Vui lòng kiểm tra lại.'));
      }

      const request = await api<RequestPayload>('/request', {
        method: 'POST',
        body: JSON.stringify({
          hold_token: holdToken,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim().toLowerCase(),
          guest_phone: guestPhone.trim() || null,
          guest_note: guestNote.trim() || null,
        }),
      });

      if (!request.ok) {
        throw new Error(String(request.message || 'Không thể gửi yêu cầu đặt phòng.'));
      }

      setSuccessCode(String(request.request_code || 'ĐÃ GỬI'));
      setGuestNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể hoàn tất yêu cầu đặt phòng.');
    } finally {
      setBooking(false);
    }
  }

  const sellable = results.filter((x) => x.sellable);

  return (
    <section className="hoi-an-booking" aria-labelledby="hoi-an-booking-title">
      <div className="hoi-an-booking__header">
        <p className="hoi-an-booking__eyebrow">ANSTAY HỘI AN</p>
        <h2 id="hoi-an-booking-title">Đặt Villa Hội An</h2>
        <p>Kiểm tra giá và phòng trống trực tiếp từ hệ thống vận hành ANSTAY.</p>
      </div>

      <form className="hoi-an-booking__search" onSubmit={search}>
        <label>
          Nhận phòng
          <input type="date" min={tomorrow} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label>
          Trả phòng
          <input type="date" min={checkIn || tomorrow} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <label>
          Số khách
          <input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))} />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Đang kiểm tra…' : 'Kiểm tra phòng'}</button>
      </form>

      {error && <div className="hoi-an-booking__alert" role="alert">{error}</div>}

      {!!sellable.length && (
        <div className="hoi-an-booking__results">
          {sellable.map((villa) => (
            <article className="hoi-an-booking__card" key={villa.villa_code}>
              <div>
                <h3>{villa.villa_name}</h3>
                <p>{villa.nights || 0} đêm · tối đa {villa.max_guests || guests} khách</p>
              </div>
              <div className="hoi-an-booking__price">
                <strong>{money(villa.total_amount ?? villa.room_amount, villa.currency || 'VND')}</strong>
                <span>Tổng tiền phòng</span>
              </div>
              <button type="button" onClick={() => { setSelected(villa); setSuccessCode(''); setError(''); }}>
                Chọn villa
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && !successCode && (
        <form className="hoi-an-booking__guest" onSubmit={submitBooking}>
          <div className="hoi-an-booking__selected">
            <strong>{selected.villa_name}</strong>
            <span>{checkIn} → {checkOut} · {guests} khách · {money(selected.total_amount ?? selected.room_amount, selected.currency || 'VND')}</span>
          </div>

          <div className="hoi-an-booking__guest-grid">
            <label>
              Họ và tên *
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} autoComplete="name" required />
            </label>
            <label>
              Email *
              <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} autoComplete="email" required />
            </label>
            <label>
              Điện thoại
              <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} autoComplete="tel" />
            </label>
            <label className="hoi-an-booking__note">
              Ghi chú
              <textarea rows={3} value={guestNote} onChange={(e) => setGuestNote(e.target.value)} />
            </label>
          </div>

          <button type="submit" disabled={booking}>{booking ? 'Đang giữ phòng…' : 'Gửi yêu cầu đặt villa'}</button>
          <p className="hoi-an-booking__fineprint">Hệ thống giữ phòng tạm thời trước khi gửi yêu cầu cho bộ phận vận hành xác nhận.</p>
        </form>
      )}

      {successCode && (
        <div className="hoi-an-booking__success" role="status">
          <strong>Đã gửi yêu cầu đặt phòng.</strong>
          <span>Mã yêu cầu: {successCode}</span>
          <p>ANSTAY sẽ tiếp nhận và xác nhận theo quy trình đặt phòng hiện tại.</p>
        </div>
      )}
    </section>
  );
}
