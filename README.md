# ANSTAY Villa Ops

MVP v0.5 cho chuỗi villa ANSTAY / Resort Hội An.

## Production stack
- Vercel: frontend Vite
- Neon Postgres: dữ liệu vận hành
- Neon Auth: đăng nhập
- Neon Data API: CRUD qua HTTPS
- PostgreSQL RLS: phân quyền tại database

## Quyền
- `admin`: toàn hệ thống
- `sales`: CRM + booking
- `ops`: booking + vận hành + nhân sự + kho
- `housekeeping`: việc buồng phòng + điểm danh
- `stock`: kho
- `accounting`: tài chính + báo cáo
- `employee`: điểm danh cá nhân

## Nghiệp vụ villa
- Nhàn: chia 50/50, căn cứ hiện tại chỉ doanh thu bán phòng.
- SOL: thuê cố định 50.000.000 VND/tháng net.
- Nắng: thuê cố định 25.000.000 VND/tháng net.
- SAM, Gió, Tim: sở hữu.

## Điểm danh
Check-in / check-out production dùng PostgreSQL RPC để timestamp được lấy từ máy chủ. GPS được ghi cùng lần chấm công. Điều chỉnh công đi qua phiếu chờ duyệt.

## Frontend source
`loader.js` nạp client Neon và ghép các phần nguồn trong `public/parts/` để Vite bundle dependency NeonJS trong khi vẫn giữ source frontend đồng bộ qua GitHub connector.

## Local
```bash
npm install
npm run dev
```
