# ANSTAY Villa Ops

MVP quản trị vận hành chuỗi villa ANSTAY / Resort Hội An.

## Production
- Vercel: https://anstay-villa-ops.vercel.app
- GitHub: banguyen310941-coder/anstay-villa-ops
- Database: Neon Postgres project `anstay-villa-ops`
- Authentication: Neon Auth (Better Auth), trusted origin `anstay-villa-ops.vercel.app`

## Phiên bản v0.4
- Dashboard theo villa và mô hình hợp đồng.
- CRM pipeline.
- Booking + chống trùng lịch.
- Housekeeping / maintenance tasks.
- Nhân viên, GPS check-in/out, phát hiện đi trễ.
- Bảng công tháng theo nhân viên.
- Phiếu điều chỉnh chấm công và luồng duyệt/từ chối.
- Kho, nhập/xuất tồn.
- Thu/chi, công nợ, hóa đơn.
- P&L từng villa và dự chi tháng tới.
- Lớp đăng nhập Neon Auth đã provision; bản demo cục bộ vẫn giữ để thử UI khi chưa bật đồng bộ dữ liệu từ trình duyệt.

## Quy tắc tài chính hiện tại
- Nhàn: chia 50/50 trên doanh thu bán phòng; doanh thu khác không thuộc căn cứ chia.
- SOL: thuê cố định net 50.000.000 VND/tháng.
- Nắng: thuê cố định net 25.000.000 VND/tháng.
- SAM, Gió, Tim: sở hữu.

## An toàn dữ liệu
Không lưu database connection string, mật khẩu hoặc token trong repository. Đồng bộ CRUD thật từ UI chỉ bật sau khi hoàn tất Data API/RLS/role policy.
