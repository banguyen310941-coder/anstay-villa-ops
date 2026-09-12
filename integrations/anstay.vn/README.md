# Tích hợp Villa Hội An vào anstay.vn

Component này **không tạo website mới**. Nó được thiết kế để nhúng trực tiếp vào source React hiện tại của `anstay.vn`.

## API đang dùng
- `GET https://anstay-booking-engine.vercel.app/api/search`
- `POST https://anstay-booking-engine.vercel.app/api/hold`
- `POST https://anstay-booking-engine.vercel.app/api/request`

Booking engine đã whitelist CORS cho:
- `https://anstay.vn`
- `https://www.anstay.vn`

## Cách ghép vào repo Marina
1. Copy `HoiAnVillaBooking.tsx` và `HoiAnVillaBooking.css` vào `frontend/src/components/BeForms/`.
2. Trong `frontend/src/components/bookroom/bookroom.tsx`, giữ nguyên `BeBookingForm` (Hạ Long) và import thêm `HoiAnVillaBooking`.
3. Render `<HoiAnVillaBooking />` trong trang `/booking`, ngay trước hoặc sau form Exely.
4. Build `frontend` để kiểm tra TypeScript/Vite.

Mục tiêu là giữ booking Hạ Long hiện tại và bổ sung villa Hội An vào cùng website chính.
