# ANSTAY Villa Ops

MVP v0.6 cho chuỗi villa ANSTAY / Resort Hội An.

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

## Local
```bash
npm install
npm run dev
```

## v0.6
- Lịch booking theo tháng + công suất villa.
- Dashboard tách doanh thu booking, tiền thu và phải thu để tránh cộng trùng.
- Xếp ca nhân viên; check-in kiểm tra lịch phân công.
- GPS geofence theo từng villa, cấu hình tọa độ/bán kính từ app.
- Nhân viên tự đăng ký Auth; admin liên kết email với employee + app role.
- Đóng tháng: snapshot P&L theo villa và khóa booking/thu chi của tháng; admin có thể mở khóa.
